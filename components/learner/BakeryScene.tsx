import BoardStops from "@/components/immersive/BoardStops";
import {foods,lesson,type Food,type Progress} from "@/lib/learner/bakery";
import {withBasePath} from "@/lib/paths";

export function Pastry({food}:{food:Food}){
 return <svg className="bakery-pastry" viewBox="0 0 92 60" aria-hidden="true">{food==="baguette"?<g transform="rotate(-18 46 30)">
 <rect x="5" y="18" width="82" height="25" rx="13" fill="#e9ae55" stroke="#935624" strokeWidth="2"/>
 {[24,41,58].map(x=><path key={x} d={`M${x} 24q4 0 9 11`} stroke="#fff0bd" strokeWidth="4" fill="none"/>)}</g>:<g stroke="#905326" strokeWidth="1.8">
 <path d="M7 45Q4 18 29 11Q46 3 66 14Q86 23 85 45Q78 54 70 40Q57 25 45 27Q28 25 20 41Q13 54 7 45Z" fill="#e8ab55"/>
 <path d="M19 19q10 3 10 12m4-20q9 5 7 16m10-18q7 6 3 18m12-13q5 9 0 18m9-11q3 6-1 14" fill="none"/></g>}</svg>
}
export default function BakeryScene({p,selected,onTap,hideLabels,visitor}:{p:Progress;selected:string;onTap:(id:string)=>void;hideLabels:boolean;visitor:boolean}){
 const shop=p.design;const other=foods.find(f=>f!==shop.left)!;
 return <div className="bakery-scene" data-awning={shop.awning}>
 <div className="bakery-awning" aria-hidden="true"/><div className="bakery-shop-sign"><small>BOULANGERIE</small><strong>{p.greeted?shop.name:"La petite boulangerie"}</strong></div>
 <div className="bakery-window" aria-hidden="true"/><div className="bakery-counter" aria-hidden="true"/>
 <BoardStops ids={[shop.left,"moli",other]} label="Bakery counter">{(id)=>{
 const food=id==="moli"?null:id as Food;
 return <button type="button" className="bakery-stop" onClick={()=>onTap(id)} aria-pressed={selected===id} aria-label={!food?"Talk to Moli":hideLabels?(food==="baguette"?"Choose the long loaf":"Choose the curved pastry"):lesson.foods[food].word}>
 {food?<Pastry food={food}/>:<img src={withBasePath("/moli-cutout.png")} alt=""/>}
 <span lang={food&&!hideLabels?"fr":"en"}>{food?hideLabels?"Pick this":lesson.foods[food].word:"Moli"}</span>
 </button>}}</BoardStops>
 {visitor&&<button className="bakery-visitor" type="button" onClick={()=>onTap("visitor")}><span aria-hidden>🧑🏽‍🦱</span> Visitor</button>}
 <span className="bakery-door-sign" lang="fr">{p.greeted&&!visitor?shop.sign:"Ouvert"}</span>
 </div>;
}
