/**
 * Full-screen diagram viewer: wheel/pinch/button zoom, drag to pan, a
 * "select text" mode, and keyboard control. Loaded only on pages with diagrams.
 */
const MIN = 0.1;
const MAX = 8;

let dialog: HTMLDialogElement | undefined;
let stage: HTMLElement;
let content: HTMLElement;
let zoomOut: HTMLOutputElement;
let modeBtn: HTMLButtonElement;
let state = { scale: 1, x: 0, y: 0, w: 0, h: 0 };

function apply() {
  content.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  zoomOut.value = `${Math.round(state.scale * 100)}%`;
}

function zoomAt(
  factor: number,
  cx = stage.clientWidth / 2,
  cy = stage.clientHeight / 2
) {
  const next = Math.min(MAX, Math.max(MIN, state.scale * factor));
  const k = next / state.scale;
  state.x = cx - (cx - state.x) * k;
  state.y = cy - (cy - state.y) * k;
  state.scale = next;
  apply();
}

function fit() {
  const sw = stage.clientWidth;
  const sh = stage.clientHeight;
  state.scale = Math.min((sw * 0.92) / state.w, (sh * 0.82) / state.h, MAX);
  state.x = (sw - state.w * state.scale) / 2;
  state.y = (sh - state.h * state.scale) / 2 + 16;
  apply();
}

function actual() {
  zoomAt(1 / state.scale);
}

function setMode(mode: "pan" | "select") {
  stage.dataset.mode = mode;
  modeBtn.setAttribute("aria-pressed", String(mode === "select"));
  modeBtn.textContent = mode === "select" ? "Selecting text" : "Select text";
}

function build() {
  dialog = document.createElement("dialog");
  dialog.className = "diagram-viewer";
  dialog.setAttribute("aria-label", "Diagram viewer");
  dialog.innerHTML = `
    <div class="dv-bar" role="toolbar" aria-label="Diagram controls">
      <button type="button" data-act="out" aria-label="Zoom out">−</button>
      <output aria-live="polite">100%</output>
      <button type="button" data-act="in" aria-label="Zoom in">+</button>
      <button type="button" data-act="fit">Fit</button>
      <button type="button" data-act="actual">1:1</button>
      <button type="button" data-act="mode" aria-pressed="false">Select text</button>
      <button type="button" data-act="close" aria-label="Close viewer">✕</button>
    </div>
    <div class="dv-stage" data-mode="pan"><div class="dv-content"></div></div>
    <p class="dv-hint">Scroll or pinch to zoom · drag to pan · 0 fit · 1 actual size · Esc close</p>`;
  document.body.append(dialog);
  stage = dialog.querySelector(".dv-stage")!;
  content = dialog.querySelector(".dv-content")!;
  zoomOut = dialog.querySelector("output")!;
  modeBtn = dialog.querySelector('[data-act="mode"]')!;

  dialog.querySelector(".dv-bar")!.addEventListener("click", e => {
    const act = (e.target as HTMLElement).closest<HTMLElement>("[data-act]")
      ?.dataset.act;
    if (act === "in") zoomAt(1.25);
    else if (act === "out") zoomAt(0.8);
    else if (act === "fit") fit();
    else if (act === "actual") actual();
    else if (act === "mode")
      setMode(stage.dataset.mode === "pan" ? "select" : "pan");
    else if (act === "close") dialog!.close();
  });

  stage.addEventListener(
    "wheel",
    e => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(
        Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)),
        e.clientX - r.left,
        e.clientY - r.top
      );
    },
    { passive: false }
  );

  // Pan (one pointer) and pinch (two pointers).
  const pts = new Map<number, { x: number; y: number }>();
  let pinch: { d: number; cx: number; cy: number } | undefined;
  stage.addEventListener("pointerdown", e => {
    if (stage.dataset.mode === "select") return;
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stage.toggleAttribute("data-dragging", true);
  });
  stage.addEventListener("pointermove", e => {
    const prev = pts.get(e.pointerId);
    if (!prev) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = stage.getBoundingClientRect();
      const cx = (a.x + b.x) / 2 - r.left;
      const cy = (a.y + b.y) / 2 - r.top;
      if (pinch) zoomAt(d / pinch.d, cx, cy);
      pinch = { d, cx, cy };
      return;
    }
    state.x += e.clientX - prev.x;
    state.y += e.clientY - prev.y;
    apply();
  });
  const end = (e: PointerEvent) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = undefined;
    if (pts.size === 0) stage.removeAttribute("data-dragging");
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);

  dialog.addEventListener("keydown", e => {
    if (
      e.target instanceof HTMLButtonElement &&
      (e.key === "Enter" || e.key === " ")
    )
      return;
    const step = 60;
    const map: Record<string, () => void> = {
      "+": () => zoomAt(1.25),
      "=": () => zoomAt(1.25),
      "-": () => zoomAt(0.8),
      "0": fit,
      "1": actual,
      ArrowLeft: () => ((state.x += step), apply()),
      ArrowRight: () => ((state.x -= step), apply()),
      ArrowUp: () => ((state.y += step), apply()),
      ArrowDown: () => ((state.y -= step), apply()),
    };
    if (map[e.key]) {
      e.preventDefault();
      map[e.key]();
    }
  });
  window.addEventListener("resize", () => dialog?.open && fit());
}

export function open(figure: HTMLElement) {
  if (!dialog) build();
  const dark = document.documentElement.dataset.theme === "dark";
  const invert = figure.classList.contains("diagram-invert");
  const source = figure.querySelector<SVGSVGElement>(
    dark && !invert ? ".diagram-dark svg" : ".diagram-light svg"
  );
  if (!source) return;
  const svg = source.cloneNode(true) as SVGSVGElement;
  const vb = svg.viewBox.baseVal;
  const box = source.getBoundingClientRect();
  state.w = vb?.width || box.width;
  state.h = vb?.height || box.height;
  svg.setAttribute("width", String(state.w));
  svg.setAttribute("height", String(state.h));
  svg.style.filter = dark && invert ? "invert(0.88) hue-rotate(180deg)" : "";
  content.replaceChildren(svg);
  setMode("pan");
  dialog!.showModal();
  requestAnimationFrame(fit);
}

export function init() {
  document.addEventListener("click", e => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(
      ".diagram-expand"
    );
    if (btn) open(btn.closest(".diagram")!);
  });
  document.addEventListener("dblclick", e => {
    const fig = (e.target as HTMLElement).closest<HTMLElement>(".diagram");
    if (fig && !fig.classList.contains("diagram-error")) open(fig);
  });
}
