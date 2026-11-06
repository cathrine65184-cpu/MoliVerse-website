"use client";

import {useEffect,useRef} from "react";
import MoliGuide from "./MoliGuide";
import {withBasePath} from "@/lib/paths";
import "./living-cover.css";

export default function LivingCover({children}:{children:React.ReactNode}) {
  const cover = useRef<HTMLElement>(null);
  const petals = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const el=cover.current!;
    const motion=matchMedia("(prefers-reduced-motion: no-preference)");
    const desktop=matchMedia("(min-width:721px) and (hover:hover) and (pointer:fine)");
    const next=el.nextElementSibling;
    let active=false, disposed=false, attempted=false, idle=0;
    let scene:ReturnType<typeof import("./petalScene").createPetals>=null;
    const eligible=()=>active&&desktop.matches;
    async function prepare(){
      idle=0;
      if(disposed||attempted||!eligible())return;
      attempted=true;
      try {
        const {createPetals}=await import("./petalScene");
        if(disposed)return;
        if(!eligible()){attempted=false;return}
        scene=createPetals(petals.current!);
        scene?.run(true);
      } catch { /* Keep the unchanged illustration if shaders cannot start. */ }
    }
    function reset(){el.style.removeProperty("--pan-x");el.style.removeProperty("--pan-y")}
    function update(){
      const box=el.getBoundingClientRect();
      active=motion.matches&&!document.hidden&&box.bottom>0&&box.top<innerHeight&&(!next||next.getBoundingClientRect().top>0);
      el.dataset.moving=String(active);
      if(!eligible())reset();
      scene?.run(eligible());
      if(eligible()&&!attempted&&!idle)idle=window.setTimeout(prepare,400);

    }
    function move(e:PointerEvent){
      if(!active||!desktop.matches||e.pointerType!=="mouse")return;
      const b=el.getBoundingClientRect();
      el.style.setProperty("--pan-x",((e.clientX-b.left)/b.width-.5)*8+"px");
      el.style.setProperty("--pan-y",((e.clientY-b.top)/b.height-.5)*5+"px");
    }
    update();window.addEventListener("scroll",update,{passive:true});window.addEventListener("resize",update);
    document.addEventListener("visibilitychange",update);motion.addEventListener("change",update);desktop.addEventListener("change",update);
    el.addEventListener("pointermove",move);el.addEventListener("pointerleave",reset);
    return ()=>{window.removeEventListener("scroll",update);window.removeEventListener("resize",update);
      document.removeEventListener("visibilitychange",update);motion.removeEventListener("change",update);desktop.removeEventListener("change",update);
      el.removeEventListener("pointermove",move);el.removeEventListener("pointerleave",reset);disposed=true;clearTimeout(idle);scene?.dispose();reset()};
  },[]);
  return <section ref={cover} className="un-banner living-cover">
    <div aria-hidden="true" className="living-art" style={{backgroundImage:`linear-gradient(90deg,#fffaf1 2%,#fffaf1ed 33%,#fffaf105 70%),url(${withBasePath("/universe-valley.jpg")})`}}/>
    <div aria-hidden="true" className="living-daylight"/>
    <canvas ref={petals} aria-hidden="true" className="living-petals"/>
    {children}
    <MoliGuide/>
  </section>;
}
