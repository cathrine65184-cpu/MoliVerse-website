import type {ReactNode} from "react";
import {layoutStops} from "@/lib/storyBoardLayout";

/** Shared DOM renderer: large native controls positioned on the 2D scene. */
export default function BoardStops({ids,label,children}:{ids:string[];label:string;children:(id:string,index:number)=>ReactNode}){
 const spots=layoutStops(ids.length);
 return <ol className="sb-stops" aria-label={label}>{ids.map((id,i)=><li key={id} style={{left:spots[i].left+"%",top:spots[i].top+"%"}}>{children(id,i)}</li>)}</ol>;
}
