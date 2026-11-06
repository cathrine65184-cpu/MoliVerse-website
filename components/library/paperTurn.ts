// Keep only the previous sheet and the incoming PDF raster, both on-device.
export function paintSheet(canvas: HTMLCanvasElement, incoming: HTMLCanvasElement, direction: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const animate = direction !== 0 && !motion.matches && canvas.width > 0;
  const previous = document.createElement('canvas');
  if (animate) {
    previous.width = canvas.width; previous.height = canvas.height;
    previous.getContext('2d')?.drawImage(canvas, 0, 0);
  }
  const w = incoming.width, h = incoming.height;
  canvas.width = w; canvas.height = h; canvas.style.aspectRatio = w + '/' + h;
  const finish = () => ctx.drawImage(incoming, 0, 0);
  if (!animate) { finish(); return () => {}; }
  let id = 0;
  const started = performance.now();
  function frame(now: number) {
    const t = Math.min(1, (now - started) / 620);
    if (t >= 1 || motion.matches) { finish(); return; }
    const p = (1 - Math.cos(Math.PI*t))/2;
    // Forward turns peel the old sheet away. Back turns lay the new sheet down.
    const lift = direction > 0 ? p : 1-p;
    const sheet = direction > 0 ? previous : incoming;
    ctx!.drawImage(direction > 0 ? incoming : previous, 0, 0, w, h);
    const bands = 48;
    let x = 0;
    for (let i=0;i<bands;i++){
      const u = (i+.5)/bands;
      const angle = Math.PI * Math.min(1,lift*(.7+.65*u));
      const dx = Math.cos(angle)*w/bands;
      const bend = Math.sin(angle)*u*h*.035;
      const left = Math.min(x,x+dx);
      if (dx > 0) ctx!.drawImage(sheet, sheet.width*i/bands,0,sheet.width/bands,sheet.height,left,-bend,dx+1,h+2*bend);
      else { ctx!.fillStyle='#efe8d6'; ctx!.fillRect(left,-bend,-dx+1,h+2*bend); }
      ctx!.fillStyle='rgba(49,35,23,' + (.16*Math.sin(angle)) + ')';
      ctx!.fillRect(left,-bend,Math.abs(dx)+1,h+2*bend);
      x += dx;
    }
    id = requestAnimationFrame(frame);
  }
  frame(started);
  return () => {cancelAnimationFrame(id); finish();};
}
