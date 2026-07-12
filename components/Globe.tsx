"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number; z: number };

/** Slowly rotating dotted globe rendered on canvas. */
export default function Globe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let width = 0;
    let height = 0;
    let radius = 0;

    // Even sphere coverage via fibonacci lattice
    const COUNT = 620;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const points: Point[] = Array.from({ length: COUNT }, (_, i) => {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
    });

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = Math.min(width, height) / 2 - 10;
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      const rot = reduceMotion ? 0.6 : time * 0.00008;
      const cx = width / 2;
      const cy = height / 2;

      for (const p of points) {
        const x = p.x * Math.cos(rot) + p.z * Math.sin(rot);
        const z = -p.x * Math.sin(rot) + p.z * Math.cos(rot);
        const depth = (z + 1) / 2; // 0 back → 1 front
        ctx.beginPath();
        ctx.arc(cx + x * radius, cy + p.y * radius, 0.7 + depth, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 158, 255, ${0.06 + depth * 0.38})`;
        ctx.fill();
      }

      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };

    size();
    frame = requestAnimationFrame(draw);

    const onResize = () => {
      size();
      if (reduceMotion) draw(0);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
