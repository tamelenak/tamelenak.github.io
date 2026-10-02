// Shared synthetic tissue (public/tissue.json, made by scripts/make_tissue.py) and the small helpers the figures share.

export type Tissue = {
  W: number; H: number;
  boundary: [number, number][];
  vessels: { r: number; pts: [number, number][] }[];
  cells: [number, number, number, number, number, number][]; // x, y, r, type, angle, squash
  edges: [number, number][];
};

// soft phenotype colours (A's palette)
export const TYPES = [
  { name: 'Lymphoma B cell', colour: '#d98aa6' },
  { name: 'T cell', colour: '#7faf97' },
  { name: 'Macrophage', colour: '#d9b36c' },
  { name: 'Glial cell', colour: '#a9a4c8' },
];

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

function softBlob(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, rgb: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
}

function hex(c: string) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const NEG = hex('#5f52a0'), MID = hex('#e7e4ea'), POS = hex('#cf6f90');
/** diverging hematoxylin-lilac → pale → eosin-rose, for values in -1..1 */
export function diverging(v: number) {
  const a = v < 0 ? NEG : POS, e = Math.pow(Math.min(1, Math.abs(v)), 0.7);
  return `rgb(${Math.round(MID[0] + (a[0] - MID[0]) * e)},${Math.round(MID[1] + (a[1] - MID[1]) * e)},${Math.round(MID[2] + (a[2] - MID[2]) * e)})`;
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
// restore the saved choice as soon as any figure loads, before the first one draws
if (typeof document !== 'undefined') restoreMotionPreference();
