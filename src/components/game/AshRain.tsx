import { useEffect, useRef } from "react";

interface AshRainProps {
  active: boolean;
}

/**
 * 🌋 Pioggia di cenere per il bioma vulcano. Sistema di particelle su Canvas
 * con velocità e opacità variabili, leggero drift orizzontale per simulare
 * il vento caldo. Alta densità ma molto leggero (no React per ogni particella).
 */
export function AshRain({ active }: AshRainProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = canvas.clientWidth;
    let h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx.scale(dpr, dpr);

    const isLow =
      window.matchMedia?.("(max-width: 768px)").matches ||
      ((navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 8) <= 4;
    const COUNT = isLow ? 80 : 160;

    type P = { x: number; y: number; vy: number; vx: number; r: number; o: number; sway: number; phase: number };
    const particles: P[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vy: 30 + Math.random() * 110, // px/s — wide spread for parallax depth
      vx: (Math.random() - 0.5) * 12,
      r: 0.8 + Math.random() * 2.4,
      o: 0.25 + Math.random() * 0.55,
      sway: 8 + Math.random() * 22,
      phase: Math.random() * Math.PI * 2,
    }));

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Resize check
      if (canvas.clientWidth !== w || canvas.clientHeight !== h) {
        w = canvas.clientWidth;
        h = canvas.clientHeight;
        canvas.width = Math.max(1, Math.floor(w * dpr));
        canvas.height = Math.max(1, Math.floor(h * dpr));
        ctx.scale(dpr, dpr);
      }
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.phase += dt * 1.5;
        p.x += (p.vx + Math.sin(p.phase) * p.sway * 0.05) * dt * 60;
        p.y += p.vy * dt;
        if (p.y > h + 4) {
          p.y = -4;
          p.x = Math.random() * w;
        }
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        // dark grey with slight warm tint
        const shade = 30 + Math.floor((p.r / 3.2) * 40);
        ctx.fillStyle = `rgba(${shade},${shade - 4},${shade - 8},${p.o})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[6]"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
