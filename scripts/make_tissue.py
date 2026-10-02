"""generate one reproducible synthetic PCNSL tissue field for the hero concepts.

Writes public/tissue.json with:
  boundary  closed polygon of the tissue section (the rest is glass)
  vessels   centre-line polylines with lumen radius
  cells     [x, y, r, type, angle, squash]   type: 0 lymphoma B cell, 1 T cell, 2 macrophage, 3 glial cell
  edges     Delaunay cell graph (long and out-of-tissue edges removed)
  modes     first 20 non-constant Laplacian eigenvectors of that graph, scaled to -100..100

Run: python3 scripts/make_tissue.py
"""
import json
import math

import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.linalg import eigsh
from scipy.spatial import Delaunay

rng = np.random.default_rng(20260929)
W, H = 1200, 900


def poisson(w, h, min_d, k=24):
    cell = min_d / math.sqrt(2)
    gw, gh = int(math.ceil(w / cell)), int(math.ceil(h / cell))
    grid = -np.ones((gh, gw), int)
    pts, active = [], []

    def add(p):
        pts.append(p)
        active.append(len(pts) - 1)
        grid[int(p[1] / cell), int(p[0] / cell)] = len(pts) - 1

    add((rng.random() * w, rng.random() * h))
    while active:
        ai = int(rng.integers(len(active)))
        px, py = pts[active[ai]]
        for _ in range(k):
            a, rad = rng.random() * 2 * math.pi, min_d * (1 + rng.random())
            x, y = px + math.cos(a) * rad, py + math.sin(a) * rad
            if not (0 <= x < w and 0 <= y < h):
                continue
            gx, gy = int(x / cell), int(y / cell)
            ok = True
            for yy in range(max(0, gy - 2), min(gh, gy + 3)):
                for xx in range(max(0, gx - 2), min(gw, gx + 3)):
                    j = grid[yy, xx]
                    if j >= 0 and (pts[j][0] - x) ** 2 + (pts[j][1] - y) ** 2 < min_d ** 2:
                        ok = False
                        break
                if not ok:
                    break
            if ok:
                add((x, y))
                break
        else:
            active.pop(ai)
    return np.array(pts)


# tissue section outline: a soft irregular blob whose edge shows on the right and bottom
cx, cy, R = 520, 420, 610
ph = rng.random(3) * 6
ang = np.linspace(0, 2 * np.pi, 180, endpoint=False)
rr = R * (1 + 0.06 * np.sin(3 * ang + ph[0]) + 0.045 * np.sin(5 * ang + ph[1]) + 0.025 * np.sin(9 * ang + ph[2]))
boundary = np.stack([cx + np.cos(ang) * rr * 0.95, cy + np.sin(ang) * rr * 0.9], 1)


def inside(x, y):
    a = math.atan2((y - cy) / 0.9, (x - cx) / 0.95)
    r = R * (1 + 0.06 * math.sin(3 * a + ph[0]) + 0.045 * math.sin(5 * a + ph[1]) + 0.025 * math.sin(9 * a + ph[2]))
    return math.hypot((x - cx) / 0.95, (y - cy) / 0.9) < r


# vessels: gently curving, occasionally branching centre lines
vessels = []


def grow(x, y, a, length, r):
    pts, turn, s = [(x, y)], 0.0, 0.0
    while s < length:
        turn = 0.9 * (turn + (rng.random() - 0.5) * 0.16)
        a += turn
        x, y = x + math.cos(a) * 12, y + math.sin(a) * 12
        pts.append((x, y))
        s += 12
        if r > 7 and length > 200 and rng.random() < 0.02:
            grow(x, y, a + (1 if rng.random() < 0.5 else -1) * (0.6 + rng.random() * 0.5), length * 0.45, r * 0.65)
    vessels.append({"r": r, "pts": pts})


# Vessels as a section really cuts them: one runs lengthwise, most are round or oval cross-sections
# (thick pale wall, open lumen), plus capillaries about one nucleus wide.
grow(190, 250, 0.35, 190 + rng.random() * 60, 7.5)
placed = 0
while placed < 9:
    x0, y0 = 90 + rng.random() * 980, 80 + rng.random() * 740
    if inside(x0, y0) and all(math.hypot(x0 - v["pts"][0][0], y0 - v["pts"][0][1]) > 140 for v in vessels):
        grow(x0, y0, rng.random() * 6.28, 3 + rng.random() * 12, 9 + rng.random() * 6)
        placed += 1
for _ in range(14):
    x0, y0 = 60 + rng.random() * 1000, 60 + rng.random() * 780
    if inside(x0, y0):
        grow(x0, y0, rng.random() * 6.28, 3 + rng.random() * 10, 3.0 + rng.random() * 1.2)


def nearest_vessel(x, y):
    best, tan = 1e9, 0.0
    for v in vessels:
        p = np.array(v["pts"])
        a, b = p[:-1], p[1:]
        d = b - a
        l2 = (d ** 2).sum(1) + 1e-9
        t = np.clip(((x - a[:, 0]) * d[:, 0] + (y - a[:, 1]) * d[:, 1]) / l2, 0, 1)
        q = a + t[:, None] * d
        dist = np.hypot(x - q[:, 0], y - q[:, 1]) - v["r"]
        i = int(np.argmin(dist))
        if dist[i] < best:
            best, tan = float(dist[i]), math.atan2(d[i, 1], d[i, 0])
    return best, tan


cells = []
for x, y in poisson(W, H, 10.6):
    if not inside(x, y):
        continue
    d, tan = nearest_vessel(x, y)
    if d < 4:
        continue
    near = math.exp(-max(0.0, d) / 78)
    if rng.random() > 0.34 + 0.66 * near:
        continue
    u, edge = rng.random(), near * (1 - near) * 4
    pT, pM = 0.02 + 0.26 * edge, 0.006 + 0.16 * edge  # T cells and macrophages enriched at the cuff rim
    if u < 0.95 * near ** 0.7:
        t, r = 0, float(np.clip(5.5 * math.exp(rng.normal(0, 0.17)), 4.4, 8.0))
    elif u < 0.95 * near ** 0.7 + pT:
        t, r = 1, 3.5 + rng.random() * 0.7
    elif u < 0.95 * near ** 0.7 + pT + pM:
        t, r = 2, 5.8 + rng.random() * 1.8
    else:
        t, r = 3, float(np.clip(3.4 * math.exp(rng.normal(0, 0.15)), 2.6, 4.6))
    aligned = t == 0 and d < 30
    angle = tan + (rng.random() - 0.5) * 0.4 if aligned else rng.random() * math.pi
    sq = 0.62 + rng.random() * 0.12 if aligned else 0.74 + rng.random() * 0.26
    jx, jy = rng.normal(0, 1.7, 2)  # break the even Poisson spacing: real nuclei clump and touch
    cells.append([round(x + jx, 1), round(y + jy, 1), round(r, 2), t, round(angle, 2), round(sq, 2)])

P = np.array([[c[0], c[1]] for c in cells])
tri = Delaunay(P)
edges = set()
for s in tri.simplices:
    for i, j in ((s[0], s[1]), (s[1], s[2]), (s[0], s[2])):
        i, j = (int(i), int(j)) if i < j else (int(j), int(i))
        if np.hypot(*(P[i] - P[j])) < 10.6 * 2.8 and inside(*((P[i] + P[j]) / 2)):
            edges.add((i, j))
edges = sorted(edges)
n = len(cells)
ii = np.array([e[0] for e in edges] + [e[1] for e in edges])
jj = np.array([e[1] for e in edges] + [e[0] for e in edges])
A = coo_matrix((np.ones(len(ii)), (ii, jj)), shape=(n, n)).tocsr()
from scipy.sparse.csgraph import connected_components
ncomp, comp = connected_components(A, directed=False)
main = np.bincount(comp).argmax()
idx = np.where(comp == main)[0]
Am = A[idx][:, idx]
L = diags(np.asarray(Am.sum(1)).ravel()) - Am
vals, vecs = eigsh(L, k=22, sigma=-0.01, which="LM")
order = np.argsort(vals)
vals, vecs = vals[order], vecs[:, order]
print(f"components {ncomp}; main component {len(idx)} of {n} cells")
# sanity check: each kept mode must satisfy L v = lambda v, be orthogonal to the others, and the first must be constant
res = [float(np.linalg.norm(L @ vecs[:, k] - vals[k] * vecs[:, k])) for k in range(21)]
gram = vecs[:, :21].T @ vecs[:, :21]
print(f"max residual |Lv - lambda v| = {max(res):.2e}; max off-diagonal <vi,vj> = {np.abs(gram - np.eye(21)).max():.2e}; "
      f"mode 0 is constant: {np.ptp(vecs[:, 0]) < 1e-8}; eigenvalues non-decreasing: {bool(np.all(np.diff(vals[:21]) >= -1e-12))}")
modes = []
for k in range(1, 21):  # skip the constant mode; cells outside the main component stay neutral
    v = np.zeros(n)
    v[idx] = vecs[:, k]
    v = v / (np.abs(v).max() + 1e-12)
    modes.append([int(round(x * 100)) for x in v])

out = {
    "W": W, "H": H,
    "boundary": [[round(float(x), 1), round(float(y), 1)] for x, y in boundary],
    "vessels": [{"r": round(v["r"], 1), "pts": [[round(x, 1), round(y, 1)] for x, y in v["pts"]]} for v in vessels],
    "cells": cells,
    "edges": [list(e) for e in edges],
    # the Laplacian eigenmodes (checked above) drove the old hero figure; the site no longer reads them
}
with open("public/tissue.json", "w") as f:
    json.dump(out, f, separators=(",", ":"))
types = np.bincount([c[3] for c in cells], minlength=4)
print(f"cells {n} (B {types[0]}, T {types[1]}, mac {types[2]}, glia {types[3]}), edges {len(edges)}, vessels {len(vessels)}")
print("eigenvalues", [round(float(x), 3) for x in vals[:6]])
