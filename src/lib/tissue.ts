// shared synthetic tissue (public/tissue.json, made by scripts/make_tissue.py) and its renderers.
// The H&E look and the segmentation-style cell shapes are modelled on reference images (H&E of primary CNS
// lymphoma from Wikimedia Commons; segmentation panels of Roemer et al., iScience 2023, Fig 1).
import { Delaunay } from 'd3-delaunay';

export type Tissue = {
  W: number; H: number;
  boundary: [number, number][];
  vessels: { r: number; pts: [number, number][] }[];
  cells: [number, number, number, number, number, number][]; // x, y, r, type, angle, squash
  edges: [number, number][];
  modes: number[][];
  eigenvalues: number[];
};

// soft phenotype colours (A's palette)
export const TYPES = [
  { name: 'Lymphoma B cell', colour: '#d98aa6' },
  { name: 'T cell', colour: '#7faf97' },
  { name: 'Macrophage', colour: '#d9b36c' },
  { name: 'Glial cell', colour: '#a9a4c8' },
];
export const PAPER = '#eceeea';

let cache: Promise<Tissue> | null = null;
export function loadTissue() {
  return (cache ??= fetch('/tissue.json').then((r) => r.json()));
}

export function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** scale + offset so the tissue covers a w×h box (like background-size: cover) */
export function cover(t: Tissue, w: number, h: number, anchorX = 0.45, anchorY = 0.5) {
  const s = Math.max(w / t.W, h / t.H);
  return { s, ox: (w - t.W * s) * anchorX, oy: (h - t.H * s) * anchorY };
}

/** 2D context. In development, ?cpu=1 in the URL makes it software-rendered, so drawings can be checked in a hidden browser pane */
const CPU = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('cpu');
export function ctx2d(canvas: HTMLCanvasElement) {
  return canvas.getContext('2d', CPU ? { willReadFrequently: true } : undefined)!;
}

/** run cb the first time el is actually on screen (its variant may be hidden at load) */
export function whenShown(el: HTMLElement, cb: () => void, threshold = 0) {
  if (CPU) { // no frames in a hidden pane, so IntersectionObserver never fires there: poll for layout instead
    const tick = () => (el.offsetWidth ? cb() : setTimeout(tick, 250));
    tick(); return;
  }
  const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); cb(); } }, { threshold });
  io.observe(el);
}

export function hiDPI(canvas: HTMLCanvasElement) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(r.width * dpr));
  canvas.height = Math.max(1, Math.round(r.height * dpr));
  return { w: r.width, h: r.height, dpr };
}

export function boundaryPath(ctx: CanvasRenderingContext2D, t: Tissue) {
  ctx.beginPath();
  t.boundary.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

export function smoothPath(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  }
  const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]);
}

function softBlob(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, rgb: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
}

/**
 * H&E brightfield, in tissue coordinates (caller sets the transform).
 * Dense dark-purple nuclei, angular and moulded, on mottled eosin pink; vessels mostly as
 * cross-sections with a thick pale hyaline wall and an open lumen; foamy pale patches, tiny
 * clear vacuoles and a couple of tears, as in real PCNSL sections.
 */
export function drawHistology(ctx: CanvasRenderingContext2D, t: Tissue, glass = PAPER) {
  const rand = mulberry32(11);
  ctx.save();
  boundaryPath(ctx, t);
  ctx.fillStyle = '#ea8cc1'; ctx.fill();
  ctx.clip();
  // mottled eosin: darker and paler clouds
  for (let i = 0; i < 300; i++) {
    const dark = rand() < 0.55;
    softBlob(ctx, rand() * t.W, rand() * t.H, 30 + rand() * 90, dark ? '206,58,152' : '250,208,232', dark ? 0.22 : 0.26);
  }
  // fibrillary neuropil
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 12000; i++) {
    ctx.strokeStyle = rand() < 0.7 ? 'rgba(196,52,146,0.2)' : 'rgba(255,224,241,0.3)';
    const x = rand() * t.W, y = rand() * t.H, a = rand() * Math.PI * 2, l = 8 + rand() * 26;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 0.8) * l * 0.5, y + Math.sin(a + 0.8) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  // pale foamy patches
  for (let i = 0; i < 16; i++) {
    const cx = rand() * t.W, cy = rand() * t.H;
    softBlob(ctx, cx, cy, 40 + rand() * 40, '252,226,241', 0.55);
    ctx.fillStyle = 'rgba(255,246,251,0.7)';
    for (let k = 0; k < 26; k++) { ctx.beginPath(); ctx.arc(cx + (rand() - 0.5) * 90, cy + (rand() - 0.5) * 70, 1.5 + rand() * 3.5, 0, Math.PI * 2); ctx.fill(); }
  }
  // vessels: a thick, pale hyaline wall with a darker rim, an open lumen with a few cells, flattened endothelium
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const wall = (v: { r: number }) => (v.r > 6 ? v.r * 1.7 + 6 : 2.6);
  for (const v of t.vessels) { smoothPath(ctx, v.pts); ctx.strokeStyle = 'rgba(206,70,156,0.55)'; ctx.lineWidth = 2 * v.r + wall(v) + 2.4; ctx.stroke(); }
  for (const v of t.vessels) { smoothPath(ctx, v.pts); ctx.strokeStyle = '#f7cfe6'; ctx.lineWidth = 2 * v.r + wall(v); ctx.stroke(); }
  for (const v of t.vessels) { smoothPath(ctx, v.pts); ctx.strokeStyle = 'rgba(224,110,178,0.6)'; ctx.lineWidth = 2 * v.r + 1.8; ctx.stroke(); }
  for (const v of t.vessels) { smoothPath(ctx, v.pts); ctx.strokeStyle = '#fffafd'; ctx.lineWidth = 2 * v.r * 0.84; ctx.stroke(); }
  for (const v of t.vessels) {
    const n = Math.max(3, Math.round((v.pts.length * 12 + 2 * Math.PI * v.r) / 11));
    for (let k = 0; k < n; k++) {
      const i = Math.min(v.pts.length - 1, Math.floor(rand() * v.pts.length)), [bx, by] = v.pts[i];
      const a = rand() * Math.PI * 2;
      ctx.beginPath(); ctx.fillStyle = '#5a2380';
      ctx.ellipse(bx + Math.cos(a) * v.r * 0.9, by + Math.sin(a) * v.r * 0.9, 3.8, 1.4, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
      if (v.r > 6 && rand() < 0.5) {
        ctx.beginPath(); ctx.fillStyle = rand() < 0.5 ? '#c4307f' : '#8b2f8f';
        ctx.ellipse(bx + (rand() - 0.5) * v.r, by + (rand() - 0.5) * v.r, 2.8, 2, rand() * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // cells
  ctx.shadowBlur = 1.2;
  for (const [x, y, r, type, a, sq] of t.cells) {
    if (type === 0) {
      ctx.shadowColor = 'transparent';
      ctx.beginPath(); ctx.fillStyle = 'rgba(214,84,164,0.34)'; ctx.ellipse(x, y, r * 1.25, r * 1.25 * sq, a, 0, Math.PI * 2); ctx.fill();
      const solid = rand() < 0.5;
      ctx.shadowColor = '#4a1766';
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.98, r * 0.98 * sq, a, 0, Math.PI * 2);
      if (rand() < 0.45) { const b = a + 1 + rand(); ctx.ellipse(x + Math.cos(b) * r * 0.45, y + Math.sin(b) * r * 0.45, r * 0.6, r * 0.5, b, 0, Math.PI * 2); } // moulded, lobed
      ctx.fillStyle = solid ? '#4f1a6c' : '#8a49a8'; ctx.fill();
      if (!solid) {
        ctx.strokeStyle = '#4f1a6c'; ctx.lineWidth = 0.9; ctx.stroke();
        ctx.beginPath(); ctx.fillStyle = '#3f1258'; ctx.arc(x + (rand() - 0.5) * r * 0.6, y + (rand() - 0.5) * r * 0.5, 0.9, 0, Math.PI * 2); ctx.fill();
      }
    } else if (type === 1) {
      ctx.shadowColor = '#3c1259';
      ctx.beginPath(); ctx.fillStyle = '#3c1259'; ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    } else if (type === 2) {
      ctx.shadowColor = 'transparent';
      ctx.beginPath(); ctx.fillStyle = 'rgba(249,212,234,0.55)'; ctx.ellipse(x, y, r * 1.6, r * 1.35, a, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,246,251,0.6)';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + (rand() - 0.5) * r * 2.4, y + (rand() - 0.5) * r * 2, 0.9 + rand() * 1.3, 0, Math.PI * 2); ctx.fill(); }
      ctx.shadowColor = '#6d2c8a';
      ctx.beginPath(); ctx.fillStyle = '#6d2c8a'; ctx.ellipse(x + r * 0.5, y, r * 0.62, r * 0.4, a + 0.6, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.shadowColor = 'transparent';
      if (rand() < 0.18) { ctx.beginPath(); ctx.fillStyle = 'rgba(253,232,244,0.6)'; ctx.arc(x, y, r * 1.7, 0, Math.PI * 2); ctx.fill(); }
      ctx.shadowColor = '#5c2380';
      ctx.beginPath(); ctx.fillStyle = '#5c2380'; ctx.ellipse(x, y, r, r * sq, a, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  // tiny clear vacuoles
  ctx.fillStyle = 'rgba(255,250,253,0.9)';
  for (let i = 0; i < 110; i++) { ctx.beginPath(); ctx.arc(rand() * t.W, rand() * t.H, 1.2 + rand() * 3, 0, Math.PI * 2); ctx.fill(); }
  // a couple of tears in the section
  ctx.strokeStyle = glass; ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    let x = 200 + rand() * 800, y = 150 + rand() * 600, a = rand() * 6.28;
    ctx.beginPath(); ctx.moveTo(x, y);
    const n = 8 + Math.floor(rand() * 8);
    for (let i = 0; i < n; i++) { a += (rand() - 0.5) * 1.1; x += Math.cos(a) * (8 + rand() * 12); y += Math.sin(a) * (8 + rand() * 12); ctx.lineTo(x, y); }
    ctx.lineWidth = 1.2 + rand() * 2.2; ctx.stroke();
  }
  ctx.restore();
}

function hex(c: string) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const NEG = hex('#5f52a0'), MID = hex('#e7e4ea'), POS = hex('#cf6f90');
/** diverging hematoxylin-lilac → pale → eosin-rose, for values in -1..1 */
export function diverging(v: number) {
  const a = v < 0 ? NEG : POS, e = Math.pow(Math.min(1, Math.abs(v)), 0.7);
  return `rgb(${Math.round(MID[0] + (a[0] - MID[0]) * e)},${Math.round(MID[1] + (a[1] - MID[1]) * e)},${Math.round(MID[2] + (a[2] - MID[2]) * e)})`;
}

/** each mode scaled to its typical range (92nd percentile), as Float32 in about -1..1 */
export function scaledModes(t: Tissue) {
  return t.modes.map((m) => {
    const a = m.map(Math.abs).sort((x, y) => x - y), sc = Math.max(1, a[Math.floor(a.length * 0.92)]);
    return Float32Array.from(m, (v) => Math.max(-1, Math.min(1, v / sc)));
  });
}

/**
 * Segmentation-style cell outlines: each cell is its Voronoi region, capped to a plausible cell
 * radius, shrunk a little and rounded. Packed cells flatten against each other; isolated ones stay round.
 */
export function cellShapes(t: Tissue) {
  const delaunay = Delaunay.from(t.cells.map((c) => [c[0], c[1]] as [number, number]));
  const vor = delaunay.voronoi([0, 0, t.W, t.H]);
  const cap = [1.6, 1.55, 1.75, 1.7];
  const shapes = t.cells.map((c, i) => {
    const poly = vor.cellPolygon(i), p = new Path2D();
    if (!poly) return p;
    const [cx, cy, r, type] = c, R = r * cap[type];
    const pts: [number, number][] = [];
    for (let k = 0; k < poly.length - 1; k++) {
      const [ax, ay] = poly[k], [bx, by] = poly[k + 1];
      for (const u of [0, 0.34, 0.67]) {
        let x = ax + (bx - ax) * u - cx, y = ay + (by - ay) * u - cy;
        const d = Math.hypot(x, y) || 1, dd = Math.min(d, R) * 0.9;
        pts.push([cx + (x / d) * dd, cy + (y / d) * dd]);
      }
    }
    const n = pts.length, mid = (k: number) => [(pts[k][0] + pts[(k + 1) % n][0]) / 2, (pts[k][1] + pts[(k + 1) % n][1]) / 2];
    let [mx, my] = mid(n - 1); p.moveTo(mx, my);
    for (let k = 0; k < n; k++) { [mx, my] = mid(k); p.quadraticCurveTo(pts[k][0], pts[k][1], mx, my); }
    p.closePath();
    return p;
  });
  return { delaunay, shapes };
}


/**
 * A page-wide "pause motion" switch (WCAG 2.2.2: anything that moves by itself for more than five seconds
 * must be pausable). The figures read it every frame and listen for changes. The choice is remembered.
 */
const MOTION_KEY = 'motion-paused';
export function motionPaused() {
  return document.documentElement.dataset.motion === 'paused';
}
export function setMotionPaused(p: boolean) {
  document.documentElement.dataset.motion = p ? 'paused' : 'playing';
  try { localStorage.setItem(MOTION_KEY, p ? '1' : '0'); } catch { /* storage may be unavailable */ }
  window.dispatchEvent(new CustomEvent('motionchange', { detail: p }));
}
export function onMotionChange(cb: (paused: boolean) => void) {
  window.addEventListener('motionchange', (e) => cb((e as CustomEvent<boolean>).detail));
}
export function restoreMotionPreference() {
  try { if (localStorage.getItem(MOTION_KEY) === '1') document.documentElement.dataset.motion = 'paused'; } catch { /* ignore */ }
}
