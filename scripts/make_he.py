"""Simulated H&E microscope image of the site's synthetic lymphoma, for the QuRad figure.

Rather than drawing nuclei as shapes, this builds stain-density maps (hematoxylin and eosin) and turns them
into colour with the Beer-Lambert law, the way light passes through a stained section. The two stain colours
were measured from a real PCNSL H&E (Wikimedia Commons, Nephron, kept in .cache/refs) with the Macenko method;
concentrations are kept a little lighter than that slide so the image sits with the site's soft palette.

Nuclei are placed at the cells of public/tissue.json, with the look of each type in PCNSL: large lymphoma
cells with open, grainy chromatin, a darker rim and a nucleolus; small dense T cells; pale bean-shaped
macrophage nuclei in foamy cytoplasm; small oval glial nuclei in a fibrillary background. Optical blur and
sensor noise come last. Writes public/qurad/he.webp and public/qurad/he.json (region, scale and the outline of
every nucleus, which the figure draws as the detections).
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'public', 'qurad')
rng = np.random.default_rng(704)

t = json.load(open(os.path.join(ROOT, 'public', 'tissue.json')))
W, H = t['W'], t['H']
X0, Y0, SIDE, K = W * 0.5 - 180, H * 0.48 - 180, 360, 3   # region in tissue units, pixels per unit
N = SIDE * K

# stain colours (optical density per unit concentration), measured from the reference slide
HV = np.array([0.53, 0.78, 0.332]); EV = np.array([0.091, 0.967, 0.239])
HV /= np.linalg.norm(HV); EV /= np.linalg.norm(EV)

def noise(sigma, amp):
    n = ndi.gaussian_filter(rng.standard_normal((N, N)), sigma)
    return n / (n.std() + 1e-9) * amp

yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)

# --- eosin: cytoplasm and neuropil, mottled at several scales, with fibres ---
CE = 0.7 + noise(40, 0.09) + noise(9, 0.08) + noise(1.6, 0.08)
CH = 0.2 + noise(30, 0.04) + noise(4, 0.04) + noise(1.2, 0.03)
fib = Image.new('F', (N, N), 0.0); d = ImageDraw.Draw(fib)
for _ in range(2600):
    x, y, a, L = rng.uniform(0, N), rng.uniform(0, N), rng.uniform(0, np.pi), rng.uniform(8, 40)
    d.line([(x, y), (x + np.cos(a) * L, y + np.sin(a) * L)], fill=float(rng.uniform(0.3, 1)), width=1)
fib = ndi.gaussian_filter(np.asarray(fib), 0.8)
CE += fib * 0.22; CH += fib * 0.03

def px(x, y): return (x - X0) * K, (y - Y0) * K

# --- vessels: pale wall, clear lumen with a few red cells, flat endothelial nuclei ---
for v in t.get('vessels', []):
    pts = np.array(v['pts'], float)
    if not ((pts[:, 0] > X0 - 40) & (pts[:, 0] < X0 + SIDE + 40) & (pts[:, 1] > Y0 - 40) & (pts[:, 1] < Y0 + SIDE + 40)).any():
        continue
    P = np.array([px(*p) for p in pts]); r = v['r'] * K
    dist = np.full((N, N), 1e9, np.float32)
    for a, b in zip(P[:-1], P[1:]):
        ab = b - a; l2 = (ab ** 2).sum() or 1
        u = np.clip(((xx - a[0]) * ab[0] + (yy - a[1]) * ab[1]) / l2, 0, 1)
        dist = np.minimum(dist, np.hypot(xx - a[0] - u * ab[0], yy - a[1] - u * ab[1]))
    lumen = np.clip((r * 0.62 - dist) / 2, 0, 1); wall = np.clip((r - dist) / 2, 0, 1) - lumen
    CE = CE * (1 - lumen) + lumen * (0.22 + noise(3, 0.05)) + wall * (0.35 + fib * 0.3); CH = CH * (1 - lumen) + lumen * 0.03
    for _ in range(int(r * 1.1)):
        k = rng.integers(len(P) - 1); u = rng.uniform(); c = P[k] + (P[k + 1] - P[k]) * u + rng.normal(0, r * 0.22, 2)
        rbc = np.clip(1 - np.hypot(xx - c[0], yy - c[1]) / (1.9 * K), 0, 1) ** 0.5
        CE += rbc * lumen * 1.5

# --- nuclei: the tissue's cells, plus more in the gaps, since PCNSL is packed with large cells ---
cells = [c for c in t['cells'] if X0 - 12 < c[0] < X0 + SIDE + 12 and Y0 - 12 < c[1] < Y0 + SIDE + 12]
pts = np.array([[c[0], c[1]] for c in cells])
for _ in range(9000):
    x, y = rng.uniform(X0 - 10, X0 + SIDE + 10), rng.uniform(Y0 - 10, Y0 + SIDE + 10)
    if np.min(np.hypot(pts[:, 0] - x, pts[:, 1] - y)) < 8.6: continue
    ty = rng.choice(4, p=[0.74, 0.16, 0.04, 0.06])
    cells.append([x, y, float(np.clip(rng.normal(5.0, 0.7), 3.6, 6.6)), int(ty), rng.uniform(0, np.pi), rng.uniform(0.62, 1)])
    pts = np.vstack([pts, [x, y]])

TYPE = {  # radius factor, hematoxylin density, chromatin graininess, rim, nucleolus
    0: dict(f=0.92, h=1.3, g=0.45, rim=0.45, nuc=True),    # lymphoma B cell
    1: dict(f=0.56, h=1.9, g=0.15, rim=0.1, nuc=False),    # T cell
    2: dict(f=0.66, h=0.95, g=0.25, rim=0.25, nuc=False),  # macrophage
    3: dict(f=0.6, h=1.45, g=0.22, rim=0.15, nuc=False),   # glial cell
}
grain = noise(0.9, 1.0)
outlines = []
for (x, y, r, ty, ang, sq) in cells:
    cx, cy = px(x, y); p = TYPE[ty]
    size = rng.uniform(0.82, 1.12) if ty == 0 else 1
    a, b = r * K * p['f'] * size, r * K * p['f'] * size * min(1.0, max(0.6, sq * rng.uniform(0.85, 1.05)))
    # cytoplasm: lymphoma cells scant and pale (often a retraction rim), macrophages wide and foamy
    R0 = int(r * K * 1.8); x0, x1, y0, y1 = int(max(0, cx - R0)), int(min(N, cx + R0)), int(max(0, cy - R0)), int(min(N, cy + R0))
    if x1 <= x0 or y1 <= y0: continue
    sx, sy = xx[y0:y1, x0:x1] - cx, yy[y0:y1, x0:x1] - cy
    ca, sa = np.cos(ang), np.sin(ang)
    u, w = sx * ca + sy * sa, -sx * sa + sy * ca
    ph = rng.uniform(0, 6.283, 3)
    def harmonic(th):  # an irregular, slightly lobed boundary; macrophage nuclei get a bean-like dent
        return 1 + 0.1 * np.cos(2 * th + ph[0]) + 0.07 * np.cos(3 * th + ph[1]) + 0.04 * np.cos(5 * th + ph[2]) + (0.14 * np.cos(th - ph[2]) if ty == 2 else 0)
    th = np.arctan2(w / b, u / a)
    rho = np.hypot(u / a, w / b) / harmonic(th)
    m = np.clip((1 - rho) * a / 1.1, 0, 1)                       # soft nucleus mask
    halo = np.clip((1.45 - rho) * a / 2.5, 0, 1) - m
    if ty == 0 and rng.uniform() < 0.12: CE[y0:y1, x0:x1] -= halo * 0.22          # retraction artefact, now and then
    if ty == 2:
        foam = np.clip((2.3 - rho) * a / 3, 0, 1) - m
        CE[y0:y1, x0:x1] -= foam * 0.28 * (0.7 + 0.6 * np.clip(grain[y0:y1, x0:x1], -1, 1))
    chrom = p['h'] * (1 + p['g'] * grain[y0:y1, x0:x1]) * (1 + p['rim'] * np.clip((rho - 0.62) / 0.38, 0, 1) ** 2)
    CH[y0:y1, x0:x1] = CH[y0:y1, x0:x1] * (1 - m) + chrom * m * rng.uniform(0.85, 1.12)
    CE[y0:y1, x0:x1] += m * 0.12
    if p['nuc']:
        for _ in range(rng.integers(1, 3)):
            nx, ny = rng.normal(0, a * 0.25), rng.normal(0, b * 0.25)
            dot = np.clip(1 - np.hypot(sx - nx, sy - ny) / (K * rng.uniform(0.6, 0.9)), 0, 1)
            CH[y0:y1, x0:x1] += dot * m * 0.9; CE[y0:y1, x0:x1] += dot * m * 0.6
    # the nucleus outline, as a detection would trace it (in tissue units)
    poly = []
    for k in range(18):
        q = 2 * np.pi * k / 18
        cq, sq_ = np.cos(q), np.sin(q)
        dist = harmonic(np.arctan2(sq_ / b, cq / a)) / np.hypot(cq / a, sq_ / b)   # where rho = 1 along q
        lx, ly = dist * cq, dist * sq_
        poly.append([round(float((lx * ca - ly * sa) / K + x), 2), round(float((lx * sa + ly * ca) / K + y), 2)])
    outlines.append({'c': [round(float(x), 2), round(float(y), 2)], 'type': int(ty), 'p': poly})

CH = ndi.gaussian_filter(np.clip(CH, 0, None), 0.85); CE = ndi.gaussian_filter(np.clip(CE, 0, None), 0.85)
OD = CH[..., None] * HV + CE[..., None] * EV
img = 255 * np.exp(-OD) + rng.normal(0, 2.2, (N, N, 3))
img = np.clip(img, 0, 255).astype(np.uint8)
os.makedirs(OUT, exist_ok=True)
Image.fromarray(img).save(os.path.join(OUT, 'he.webp'), quality=80, method=6)
json.dump({'x0': X0, 'y0': Y0, 'side': SIDE, 'k': K, 'nuclei': outlines}, open(os.path.join(OUT, 'he.json'), 'w'), separators=(',', ':'))
print('cells', len(outlines), 'size', os.path.getsize(os.path.join(OUT, 'he.webp')) // 1024, 'KB', 'mean RGB', img.reshape(-1, 3).mean(0).round(1))
