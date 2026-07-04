"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  driftX: number;
  driftY: number;
};

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let stars: Star[] = [];
    let animationFrame = 0;
    let width = 0;
    let height = 0;

    const seed = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(180, Math.floor((width * height) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.4 + 0.3,
        baseAlpha: Math.random() * 0.5 + 0.2,
        twinkleSpeed: Math.random() * 0.0015 + 0.0004,
        twinklePhase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.02,
        driftY: (Math.random() - 0.5) * 0.012,
      }));
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        if (!reduceMotion) {
          star.x = (star.x + star.driftX + width) % width;
          star.y = (star.y + star.driftY + height) % height;
        }

        const twinkle = reduceMotion
          ? 1
          : 0.65 + 0.35 * Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const alpha = star.baseAlpha * twinkle;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(199, 210, 254, ${alpha})`;
        ctx.fill();
      }

      if (!reduceMotion) {
        animationFrame = requestAnimationFrame(draw);
      }
    };

    seed();
    animationFrame = requestAnimationFrame(draw);

    const onResize = () => {
      seed();
      if (reduceMotion) draw(0);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
