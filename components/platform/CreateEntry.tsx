"use client";
import {useEffect,useState} from "react";
import World from "./World";
import LearnerCreate from "@/components/learner/LearnerCreate";
// Preserve old saved lesson bookmarks; the normal Create entry is the growing room.
export default function CreateEntry(){
 const [legacy,setLegacy]=useState<boolean|null>(null);
 useEffect(()=>setLegacy(new URLSearchParams(location.search).get("adventure")==="morning-bakery"),[]);
 return legacy===null?<main className="pv">Opening your world…</main>:legacy?<LearnerCreate/>:<World/>;
}
