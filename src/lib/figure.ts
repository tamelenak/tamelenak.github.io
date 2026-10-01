// Shared driver for the per-paper figures (prototype): one canvas, one clock, the page's motion rules.
// A scene is a pure function of time: draw(T) paints the moment T seconds after the figure first came
// into view and returns the line shown under it. That keeps every frame reproducible, and lets the
// development hooks jump to any moment.
import { ctx2d, hiDPI, whenShown, motionPaused, onMotionChange } from './tissue';

export type Pointer = { x: number; y: number } | null;
export type Scene = {
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, T: number, pointer: Pointer): string;
  /** the moment shown, without motion, when the visitor asks for reduced motion */
  still: number;
  /** what a click does: return the new time (default: start again) */
  click?(x: number, y: number, T: number): number;
  /** called when the canvas changes size, before the next draw */
  resize?(w: number, h: number, dpr: number): void;
};

export function runFigure(fig: HTMLElement, scene: Scene) {
  const canvas = fig.querySelector<HTMLCanvasElement>('canvas')!;
  const out = fig.querySelector<HTMLOutputElement>('output');
  const ctx = ctx2d(canvas);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // with reduced motion, or motion paused on the page, the figure opens on a finished frame rather than an empty first one
  let w = 0, h = 0, dpr = 1, T = reduce || motionPaused() ? scene.still : 0, last = 0, raf = 0, visible = true, said = '';
  let pointer: Pointer = null;

  const running = () => visible && !reduce && !motionPaused();
  function render() {
    if (!w || !h) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    const line = scene.draw(ctx, w, h, T, pointer);
    if (out && line !== said) out.textContent = said = line;
  }
  function frame(now: number) {
    raf = 0;
    T += running() ? Math.min(0.05, (now - last) / 1000 || 0) : 0;
    last = now;
    render();
    if (running()) request();
  }
  const request = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const resize = () => {
    ({ w, h, dpr } = hiDPI(canvas));
    if (w && h) { scene.resize?.(w, h, dpr); render(); }
  };

  const local = (e: PointerEvent | MouseEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; pointer = local(e); if (!running()) render(); });
  canvas.addEventListener('pointerleave', () => { pointer = null; if (!running()) render(); });
  canvas.addEventListener('click', (e) => {
    const p = local(e);
    T = scene.click ? scene.click(p.x, p.y, T) : reduce ? scene.still : 0;
    last = performance.now(); render(); request();
  });

  onMotionChange(() => { last = performance.now(); request(); });
  let rt = 0;
  new ResizeObserver(() => { clearTimeout(rt); rt = window.setTimeout(resize, 120); }).observe(canvas);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { last = performance.now(); request(); } }).observe(canvas);
  document.fonts?.ready.then(render);
  resize(); last = performance.now(); request();

  if (import.meta.env.DEV) { // test hooks for development only; stripped from the published build
    (fig as any).__at = (t: number) => { T = t; render(); return said; };
    (fig as any).__sim = (s: number) => { for (let i = 0; i < s * 25; i++) { T += 0.04; } render(); return said; };
    (fig as any).__state = () => ({ T: +T.toFixed(2), line: said });
    (fig as any).__point = (x: number, y: number) => { pointer = { x, y }; render(); return said; };
  }
}

export function start(selector: string, make: (fig: HTMLElement) => Promise<Scene> | Scene) {
  document.querySelectorAll<HTMLElement>(selector).forEach((fig) => whenShown(fig, async () => runFigure(fig, await make(fig)), 0.15));
}

// ---- small helpers shared by the scenes ----
export const FONT = "14px 'Newsreader Variable', Georgia, serif";
export const ITALIC = "italic 14px 'Newsreader Variable', Georgia, serif";
export const INK = '#1d2521', MUTED = '#5f6964', RULE = '#c9cfc8', HEMA = '#3b3a82';
export const ROSE = '#cf6f90', LILAC = '#5f52a0';

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** smooth in and out */
export const ease = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
/** 0 → 1 over [a, b] */
export const ramp = (x: number, a: number, b: number) => ease((x - a) / (b - a));

export type RGB = [number, number, number];
export const rgb = (hex: string): RGB => { const v = parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const css = (c: RGB, alpha = 1) => alpha >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha.toFixed(3)})`;

const NEG = rgb(LILAC), MID = rgb('#e7e4ea'), POS = rgb(ROSE);
/** the site's diverging scale (lilac → pale → rose) as numbers, for values in -1..1 */
export function divergingRGB(v: number): RGB {
  const e = Math.pow(Math.min(1, Math.abs(v)), 0.7);
  return mixRGB(MID, v < 0 ? NEG : POS, e);
}

export function gaussian(rnd: () => number) {
  let u = 0; while (!u) u = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}
export function shuffle<T>(a: T[], rnd: () => number) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
