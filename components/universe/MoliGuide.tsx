"use client";

import Link from "next/link";
import { useRef } from "react";
import { withBasePath } from "@/lib/paths";

export default function MoliGuide() {
  const disclosure = useRef<HTMLDetailsElement>(null);
  return <details className="living-guide" ref={disclosure} onKeyDown={event => {
    if (event.key === "Escape" && disclosure.current?.open) {
      disclosure.current.open = false;
      disclosure.current.querySelector("summary")?.focus();
    }
  }}>
    <summary aria-label="Discover with Moli"><img src={withBasePath("/moli-cutout.png")} alt="" /><span aria-hidden="true">Hi!</span></summary>
    <nav aria-label="Moli’s suggestions" className="moli-greeting">
      <strong>Hi! I'm Moli! What would you like to discover today?</strong>
      <Link href="/explore/">Explore Courses</Link>
      <Link href="/create/">Create a Story</Link>
      <Link href="/teach/studio/?mode=young-creator&panel=moli">Talk to Moli</Link>
    </nav>
  </details>;
}
