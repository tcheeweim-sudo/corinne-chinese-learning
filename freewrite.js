globalThis.FreeWriteSurface = class FreeWriteSurface {
  constructor(canvas, onInkChange = () => {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.pointer = null;
    this.hasInk = false;
    this.onInkChange = onInkChange;
    this.resize = this.resize.bind(this);
    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(canvas);
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = globalThis.devicePixelRatio || 1;
    if (!rect.width || !rect.height || (this.canvas.width === Math.round(rect.width * ratio) && this.canvas.height === Math.round(rect.height * ratio))) return;
    const copy = document.createElement("canvas");
    copy.width = this.canvas.width; copy.height = this.canvas.height;
    copy.getContext("2d").drawImage(this.canvas, 0, 0);
    this.canvas.width = Math.round(rect.width * ratio); this.canvas.height = Math.round(rect.height * ratio);
    this.context = this.canvas.getContext("2d");
    this.context.scale(ratio, ratio);
    this.context.lineCap = "round"; this.context.lineJoin = "round"; this.context.strokeStyle = "#49372f";
    if (copy.width) this.context.drawImage(copy, 0, 0, copy.width, copy.height, 0, 0, rect.width, rect.height);
  }
  point(event) { const rect = this.canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
  setInk(value) { if (this.hasInk !== value) { this.hasInk = value; this.onInkChange(value); } }
  onDown(event) { event.preventDefault(); try { this.canvas.setPointerCapture?.(event.pointerId); } catch (_error) {} this.pointer = event.pointerId; const p = this.point(event); this.lastPoint = p; this.context.beginPath(); this.context.moveTo(p.x, p.y); }
  onMove(event) { if (event.pointerId !== this.pointer) return; event.preventDefault(); const p = this.point(event); if (p.x === this.lastPoint.x && p.y === this.lastPoint.y) return; this.context.lineWidth = 4 + (event.pressure || .5) * 5; this.context.lineTo(p.x, p.y); this.context.stroke(); this.lastPoint = p; this.setInk(true); }
  onUp(event) { if (event.pointerId === this.pointer) this.pointer = null; }
  clear() { this.context.clearRect(0, 0, this.canvas.width, this.canvas.height); this.setInk(false); }
  destroy() { this.observer.disconnect(); for (const [name, handler] of [["pointerdown", this.onDown], ["pointermove", this.onMove], ["pointerup", this.onUp], ["pointercancel", this.onUp]]) this.canvas.removeEventListener(name, handler); }
};
