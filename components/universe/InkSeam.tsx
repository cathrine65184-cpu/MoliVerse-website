"use client";

import { useEffect, useId, useRef } from "react";

// A strip of wet pigment, not a viewport overlay. All layers meet the paper
// at its lower edge. Only the depth changes as the next section scrolls up.
const bleed = "M-20 54 C39 55 43 33 81 35 S154 75 204 61 S273 21 315 32 S365 51 400 42 S458 9 505 17 S560 67 609 53 S675 35 718 47 S784 79 839 53 S911 14 957 31 S1014 61 1066 47 S1146 25 1220 41 V125 H-20Z";

export default function InkSeam() {
  const strip = useRef<SVGSVGElement>(null);
  const grain = useId().replace(/:/g, "");
  useEffect(() => {
    const svg = strip.current;
    const paper = svg?.parentElement;
    if (!svg || !paper) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    function draw() {
      frame = 0;
      const top = paper!.getBoundingClientRect().top;
      if (top < -1 || top > innerHeight + 120) return;
      const travel = Math.max(1, Math.min(innerHeight, top + scrollY));
      const t = Math.max(0, Math.min(1, 1 - top / travel));
      const depth = reduced.matches ? 0.28 : 0.23 + 0.77 * t * t * (3 - 2 * t);
      svg!.style.setProperty("--wash-depth", String(depth));
    }
    function queue() { if (!frame) frame = requestAnimationFrame(draw); }
    let visible = false;
    function configure() {
      window.removeEventListener("scroll", queue);
      if (visible && !reduced.matches) window.addEventListener("scroll", queue, { passive: true });
      queue();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      configure();
    }, {rootMargin:"128px"});
    observer.observe(svg);
    configure();
    reduced.addEventListener("change", configure);
    window.addEventListener("resize", queue);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      reduced.removeEventListener("change", configure);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, []);
  return <svg ref={strip} className="ink-seam" viewBox="0 0 1200 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <filter id={grain} x="-3%" y="-20%" width="106%" height="150%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".018 .074" numOctaves="3" seed="14" result="fiber"/>
        <feDisplacementMap in="SourceGraphic" in2="fiber" scale="25" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>
    <g filter={`url(#${grain})`}>
      <path d={bleed} transform="translate(0 -10)" fill="#819884" opacity=".25"/>
      <path d={bleed} transform="translate(-6 -5)" fill="#a4b39a" opacity=".52"/>
      <path d={bleed} fill="var(--ink-paper, var(--paper, #fffcf5))"/>
    </g>
  </svg>;
}

// Inset boundaries reserve their own space, including inside clipped sections.
export function InkBreak() {
  return <div aria-hidden="true" className="ink-break"><InkSeam/></div>;
}
