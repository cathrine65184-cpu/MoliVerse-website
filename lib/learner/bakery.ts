/** Authored practice, not an assessment or a generated teacher course. */
export const lesson = {
 id:"morning-bakery",version:1, title:"Morning at the little bakery",
 goal:"Greet a daytime visitor and recognise two French bakery words.",
 foods:{
  baguette:{word:"une baguette",meaning:"a long, thin loaf of bread",hint:"Look for the long loaf with little cuts in the crust."},
  croissant:{word:"un croissant",meaning:"a buttery, layered pastry",hint:"Look for the curved pastry with flaky layers."}
 }
} as const;
export type Food=keyof typeof lesson.foods;
export const foods:Food[]=["baguette","croissant"];
export const greetings=["Bonjour !","Merci !","Au revoir !"] as const;
export const names=["Le Petit Four","La Lune Dorée","Le Jardin"] as const;
export const signs=["Bonjour !","Bonjour et bienvenue !"] as const;
export const awnings=["Honey","Rose","Sage"] as const;
export const reflections=["I can greet a visitor.","I can spot a pastry.","I’d like another try."] as const;
type Layout={name:typeof names[number];awning:typeof awnings[number];left:Food;sign:typeof signs[number]};
export const startingLayout:Layout={name:names[0],awning:"Honey",left:"baguette",sign:signs[0]};
export type Check="hello"|Food;
export type Attempt={check:Check;choice:string;correct:boolean;hinted:boolean;feedback:string};
export type Progress={seen:Food[];greeted:boolean;design:Layout;shop:Layout|null;reflection:string|null;reviewStep:number;rounds:number;attempts:Attempt[];practised:Check[]};
export function empty():Progress{return {seen:[],greeted:false,design:{...startingLayout},shop:null,reflection:null,reviewStep:0,rounds:0,attempts:[],practised:[]}}
export function stage(p:Progress){return !p.greeted?"Learn & practise":!p.shop?"Create":!p.reflection?"Reflect":"Revisit"}
export function reviewOrder(rounds:number):Check[]{return rounds%2?["baguette","hello","croissant"]:["croissant","hello","baguette"]}
export function response(check:Check,choice:string,hinted=false):Attempt{
 const correct=check==="hello"?choice===greetings[0]:choice===check;
 const feedback=check==="hello"?(correct?"Bonjour! You welcomed the visitor with a daytime hello.":choice==="Merci !"?"Merci means thank you. Nobody has handed you anything yet. Try a daytime hello.":"Au revoir is goodbye. This visitor is arriving, not leaving. Try again."):
 correct?"Yes! "+lesson.foods[check].word+" is "+lesson.foods[check].meaning+".":"That is "+lesson.foods[choice as Food].word+". The order asks for "+lesson.foods[check].word+". Try the other shelf.";
 return {check,choice,correct,hinted,feedback};
}
export type Action={type:"explore";food:Food}|{type:"answer";choice:string;hinted:boolean}|{type:"design";design:Layout}|{type:"save"}|{type:"reflect";value:string};
function layout(v:unknown):v is Layout{
 if(!v||typeof v!=="object")return false;const d=v as Layout;
 return names.includes(d.name)&&awnings.includes(d.awning)&&foods.includes(d.left)&&signs.includes(d.sign);
}
export function apply(p:Progress,a:Action):Progress{
 if(a.type==="explore")return foods.includes(a.food)&&!p.seen.includes(a.food)?{...p,seen:[...p.seen,a.food]}:p;
 if(a.type==="design")return p.greeted&&layout(a.design)?{...p,design:{...a.design}}:p;
 if(a.type==="save")return p.greeted?{...p,shop:{...p.design}}:p;
 if(a.type==="reflect")return p.shop&&reflections.includes(a.value as typeof reflections[number])?{...p,reflection:a.value}:p;
 if(a.type!=="answer"||p.seen.length!==2)return p;
 const check=p.reflection?reviewOrder(p.rounds)[p.reviewStep]:!p.greeted?"hello":null;
 if(!check||!(check==="hello"?greetings as readonly string[]:foods as string[]).includes(a.choice))return p;
 const attempt=response(check,a.choice,a.hinted);
 const next={...p,attempts:[...p.attempts,attempt].slice(-40),practised:Array.from(new Set([...p.practised,check]))};
 if(attempt.correct){if(!p.greeted)next.greeted=true;
 else if(++next.reviewStep===3){next.reviewStep=0;next.rounds++}}
 return next;
}
export const keyFor=(scope:string)=>"moliverse:learner-create:"+lesson.id+":v1:"+scope;
export function restore(raw:string|null):Progress{
 if(!raw)return empty();try{
 const p=JSON.parse(raw) as Progress;
 if(!Array.isArray(p.seen)||p.seen.length>2||new Set(p.seen).size!==p.seen.length||!p.seen.every(x=>foods.includes(x))||
 typeof p.greeted!=="boolean"||(p.greeted&&p.seen.length!==2)||!layout(p.design)||(p.shop!==null&&(!p.greeted||!layout(p.shop)))||
 (p.reflection!==null&&(!p.shop||!reflections.includes(p.reflection as typeof reflections[number])))||
 !Number.isInteger(p.reviewStep)||p.reviewStep<0||p.reviewStep>2||!Number.isSafeInteger(p.rounds)||p.rounds<0||
 !Array.isArray(p.practised)||!p.practised.every(x=>x==="hello"||foods.includes(x))||!Array.isArray(p.attempts))return empty();
 // Reconstruct feedback from the fixed lesson, never render arbitrary persisted feedback.
 return {...p,attempts:p.attempts.slice(-40).map(a=>{
 if(!(a.check==="hello"?greetings as readonly string[]:foods as string[]).includes(a.choice)||!(a.check==="hello"||foods.includes(a.check)))throw Error();
 return response(a.check,a.choice,a.hinted===true)})};
 }catch{return empty()}
}
