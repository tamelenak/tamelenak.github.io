"""five serial multiplex-immunofluorescence sections of one synthetic PCNSL tumour, plus the
geometry they are reconstructed into.

The look follows a real PCNSL multiplex image at low magnification (Roemer et al., iScience 2023, Fig 1A,
kept in .cache/refs): thousands of small, soft, touching nuclei; large rounded islands of salmon-orange
PAX5-positive lymphoma cells; a streaky yellow CD3 rim; blue-violet parenchyma with cloudy magenta CD163
macrophage zones; a purple haze rather than pure black. No vessels are drawn.

Writes public/recon/slide-0..4.webp and recon.json:
  contours  per island, per section: outline of the tumour island (or null), for the lofted surface
  nodes     a subsample of cells [x, y, section, type]   type: 0 lymphoma, 1 T cell, 2 macrophage, 3 other
  edges     3D neighbour graph within and between adjacent sections
  modes     low Laplacian eigenvectors of that graph, scaled to -100..100

Run: python3 scripts/make_recon.py
"""
import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.sparse import coo_matrix, diags
from scipy.sparse.csgraph import connected_components
from scipy.sparse.linalg import eigsh
from scipy.spatial import cKDTree

rng = np.random.default_rng(20260930)
W, H, N, M, DZ = 960, 680, 5, 56, 78
OUT = "public/recon"
os.makedirs(OUT, exist_ok=True)

# three tumour islands as smooth 3D bodies: centre drifts and radius swells across the sections
islands = [
    dict(c=(335, 310), drift=(15, 8), R=170, scale=[0.74, 0.93, 1.0, 0.9, 0.66], ph=rng.random(3) * 6),
    dict(c=(705, 440), drift=(-13, -9), R=112, scale=[0.0, 0.6, 0.94, 1.0, 0.8], ph=rng.random(3) * 6),
    dict(c=(770, 165), drift=(7, 11), R=78, scale=[0.92, 1.0, 0.72, 0.0, 0.0], ph=rng.random(3) * 6),
]


def centre(isl, k):
    return isl["c"][0] + isl["drift"][0] * (k - 2), isl["c"][1] + isl["drift"][1] * (k - 2)


def radius(isl, k, th):
    p = isl["ph"]
    return isl["R"] * isl["scale"][k] * (1 + 0.13 * np.sin(2 * th + p[0] + 0.4 * k) + 0.09 * np.sin(3 * th + p[1] - 0.3 * k) + 0.06 * np.sin(5 * th + p[2]) + 0.03 * np.sin(9 * th + p[0]))


def s_value(x, y, k):
    """normalised distance to the nearest island: < 1 inside, 1 at the edge"""
    s = np.full(np.shape(x), 99.0)
    for isl in islands:
        if isl["scale"][k] <= 0:
            continue
        cx, cy = centre(isl, k)
        th = np.arctan2(y - cy, x - cx)
        s = np.minimum(s, np.hypot(x - cx, y - cy) / radius(isl, k, th))
    return s


def lowfreq(sigma):
    f = ndi.gaussian_filter(rng.random((H, W)), sigma)
    return (f - f.min()) / (f.max() - f.min())


def disc(r, size=11):
    c = size // 2
    yy, xx = np.mgrid[:size, :size]
    return np.clip(r + 0.5 - np.hypot(xx - c, yy - c), 0, 1)


def ring(r, width, size=13):
    c = size // 2
    yy, xx = np.mgrid[:size, :size]
    d = np.hypot(xx - c, yy - c)
    th = np.arctan2(yy - c, xx - c)
    irregular = 0.55 + 0.45 * np.cos(th * rng.integers(1, 3) + rng.random() * 6)  # membranes stain unevenly
    return np.clip(1 - np.abs(d - r) / width, 0, 1) * irregular


COL = {  # pseudo-colours, as in the reference
    "dapi": (0.21, 0.15, 0.90), "pax5": (1.00, 0.43, 0.20), "cd3": (1.00, 0.86, 0.18),
    "cd163": (0.95, 0.16, 0.80), "cd8": (0.20, 0.85, 1.00),
}


def stamp(arr, x, y, k, gain=1.0):
    h = k.shape[0] // 2
    xi, yi = int(round(x)), int(round(y))
    if h <= xi < W - h and h <= yi < H - h:
        arr[yi - h:yi + h + 1, xi - h:xi + h + 1] += gain * k


mac_zone = [lowfreq(55) for _ in range(2)]
edge_noise = lowfreq(16)
all_cells = []
for k in range(N):
    ch = {c: np.zeros((H, W), np.float32) for c in COL}
    # cells on a jittered grid: dense and touching, like real tissue
    g = 6.1
    gx, gy = np.meshgrid(np.arange(4, W - 4, g), np.arange(4, H - 4, g))
    x = (gx + (rng.random(gx.shape) - 0.5) * g * 0.95).ravel()
    y = (gy + (rng.random(gy.shape) - 0.5) * g * 0.95).ravel()
    s = s_value(x, y, k)
    s = s + 0.22 * (edge_noise[np.clip(y.astype(int), 0, H - 1), np.clip(x.astype(int), 0, W - 1)] - 0.5)  # ragged, infiltrating edge
    zone = mac_zone[0][np.clip(y.astype(int), 0, H - 1), np.clip(x.astype(int), 0, W - 1)] * (1 - k / 8) + \
        mac_zone[1][np.clip(y.astype(int), 0, H - 1), np.clip(x.astype(int), 0, W - 1)] * (k / 8)
    cells = []
    for xi, yi, si, zi in zip(x, y, s, zone):
        u = rng.random()
        if si < 0.9:
            if rng.random() > 0.97:
                continue
            t = 0 if u < 0.94 else 1 if u < 0.98 else 2
        elif si < 1.5:
            if rng.random() > 0.88:
                continue
            e = (si - 0.9) / 0.6                     # 0 at the island, 1 well outside
            pb = 0.62 * (1 - e) ** 1.6               # lymphoma cells thin out gradually: single infiltrating cells
            pt = 0.34 * (1 - abs(e - 0.35) * 1.6)    # T cells peak in a rim just outside
            t = 0 if u < pb else 1 if u < pb + max(pt, 0.05) else 2 if u < pb + max(pt, 0.05) + 0.1 else 3
        else:
            if rng.random() > 0.8:
                continue
            pm = 0.012 + 0.8 * min(1.0, max(0.0, zi - 0.58) / 0.26)   # macrophages gather in cloudy patches
            t = 2 if u < pm else 1 if u < pm + 0.03 else 3
        cells.append((xi, yi, t))
        if t == 0:
            kr = disc(3.0 + rng.random() * 1.1)
            stamp(ch["pax5"], xi, yi, kr, 0.55 + rng.random() * 0.45)
            stamp(ch["dapi"], xi, yi, kr, 0.05)
        elif t == 1:
            stamp(ch["dapi"], xi, yi, disc(2.0), 0.7)
            stamp(ch["cd8" if rng.random() < 0.18 else "cd3"], xi, yi, ring(3.4 + rng.random(), 1.5), 1.4 + rng.random() * 0.7)
        elif t == 2:
            stamp(ch["dapi"], xi, yi, disc(1.9), 0.55)
            for _ in range(int(rng.integers(3, 7))):  # a cloudy, ramified cell
                a, d = rng.random() * 6.28, rng.random() * 6.5
                stamp(ch["cd163"], xi + math.cos(a) * d, yi + math.sin(a) * d, disc(1.2 + rng.random() * 1.4), 0.5 + rng.random() * 0.5)
        else:
            stamp(ch["dapi"], xi, yi, disc(2.3 + rng.random() * 0.8), 0.5 + rng.random() * 0.4)
    all_cells.append(cells)

    # uneven staining, a purple haze, a few fine tears
    for c in ch:
        ch[c] *= 0.72 + 0.56 * lowfreq(14)
    rgb = sum(ch[c][..., None] * np.array(COL[c], np.float32) for c in COL)
    haze = lowfreq(38)[..., None] * np.array((0.06, 0.02, 0.13), np.float32) + 0.012
    rgb = 1 - np.exp(-1.35 * (rgb + haze))
    tears = Image.new("L", (W, H), 255)
    d = ImageDraw.Draw(tears)
    for _ in range(3):
        px, py, a = rng.random() * W, rng.random() * H, rng.random() * 6.28
        pts = [(px, py)]
        for _ in range(int(rng.integers(6, 14))):
            a += (rng.random() - 0.5) * 1.2
            px, py = px + math.cos(a) * 14, py + math.sin(a) * 14
            pts.append((px, py))
        d.line(pts, fill=20, width=int(rng.integers(2, 5)))
    rgb *= (ndi.gaussian_filter(np.asarray(tears, np.float32) / 255, 1.2))[..., None]
    rgb = ndi.gaussian_filter(rgb, (1.05, 1.05, 0))        # the microscope's blur
    rgb += rng.normal(0, 0.018, rgb.shape)                  # sensor noise
    img = Image.fromarray((np.clip(rgb, 0, 1) ** 0.92 * 255).astype(np.uint8))
    img.save(f"{OUT}/slide-{k}.webp", "WEBP", quality=88, method=6)
    print(f"section {k}: {len(cells)} cells, types {np.bincount([c[2] for c in cells], minlength=4).tolist()}")

# outlines of the islands in every section, for the lofted surface
th = np.linspace(0, 2 * np.pi, M, endpoint=False)
contours = []
for isl in islands:
    per = []
    for k in range(N):
        if isl["scale"][k] <= 0:
            per.append(None)
            continue
        cx, cy = centre(isl, k)
        r = radius(isl, k, th)
        per.append([[round(float(cx + np.cos(a) * rr), 1), round(float(cy + np.sin(a) * rr), 1)] for a, rr in zip(th, r)])
    contours.append(per)

# a lighter graph: a subsample of the cells, joined to their nearest neighbours in 3D
nodes = []
for k, cells in enumerate(all_cells):
    arr = np.array(cells)
    # favour the lymphoma and immune cells, so the tumour's shape carries through the graph
    w = np.where(arr[:, 2] == 0, 1.0, np.where(arr[:, 2] == 1, 2.2, np.where(arr[:, 2] == 2, 0.9, 0.07)))
    pick = rng.choice(len(arr), size=330, replace=False, p=w / w.sum())
    # keep them apart so the graph is not cluttered
    kept = []
    for i in pick:
        if all(math.hypot(arr[i, 0] - arr[j, 0], arr[i, 1] - arr[j, 1]) > 15 for j in kept):
            kept.append(i)
    nodes += [[round(float(arr[i, 0]), 1), round(float(arr[i, 1]), 1), k, int(arr[i, 2])] for i in kept]
P3 = np.array([[n[0], n[1], n[2] * DZ] for n in nodes])
tree = cKDTree(P3)
dist, idx = tree.query(P3, k=7)
edges = set()
for i in range(len(nodes)):
    for d_, j in zip(dist[i][1:], idx[i][1:]):
        if d_ < 112 and abs(nodes[i][2] - nodes[j][2]) <= 1:
            edges.add((min(i, int(j)), max(i, int(j))))
edges = sorted(edges)
n = len(nodes)
ii = np.array([e[0] for e in edges] + [e[1] for e in edges])
jj = np.array([e[1] for e in edges] + [e[0] for e in edges])
A = coo_matrix((np.ones(len(ii)), (ii, jj)), shape=(n, n)).tocsr()
ncomp, comp = connected_components(A, directed=False)
main = np.where(comp == np.bincount(comp).argmax())[0]
Am = A[main][:, main]
L = diags(np.asarray(Am.sum(1)).ravel()) - Am
vals, vecs = eigsh(L, k=9, sigma=-0.01, which="LM")
order = np.argsort(vals)
vals, vecs = vals[order], vecs[:, order]
res = max(float(np.linalg.norm(L @ vecs[:, q] - vals[q] * vecs[:, q])) for q in range(9))
modes = []
for q in range(1, 9):
    v = np.zeros(n)
    v[main] = vecs[:, q]
    modes.append([int(round(x * 100)) for x in v / np.abs(v).max()])

json.dump({
    "W": W, "H": H, "N": N, "DZ": DZ,
    "slides": [f"/recon/slide-{k}.webp" for k in range(N)],
    "contours": contours, "nodes": nodes, "edges": [list(e) for e in edges],
    "modes": modes, "eigenvalues": [round(float(x), 4) for x in vals[1:9]],
}, open(f"{OUT}/recon.json", "w"), separators=(",", ":"))
print(f"graph: {n} nodes, {len(edges)} edges, {ncomp} components (main {len(main)}); max |Lv - lambda v| = {res:.1e}")
