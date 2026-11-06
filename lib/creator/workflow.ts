import {defaultFilter} from "../sensitiveFilter.ts";

export const fields = ["intent","topic","inspiration","learners","goals","format","activities","constraints","decisions","questions"] as const;
export type Field = typeof fields[number];
export const stages = ["DISCOVER","EXPLORE","SHAPE","DRAFT","REVIEW"] as const;
export type Stage = typeof stages[number];
export const draftFields = ["title","description","ageRange","goals","materials","activities","duration","assessments","references","questions"] as const;
export type Draft = Record<typeof draftFields[number],string>;
export type Board = Partial<Record<Field,string>>;
export type Review = {strengths:string; concerns:string; nextStep:string};
export type State = {
  stage:Stage; confirmed:Board; suggestions:Board; messages:{role:"user"|"assistant";text:string}[];
  proposal:Draft|null; versions:{draft:Draft;at:string}[]; review:Review|null; reviewedVersion:number|null;
  status:"private"|"submitted";
};
export function initial():State {return {stage:"DISCOVER",confirmed:{},suggestions:{},messages:[],proposal:null,versions:[],review:null,reviewedVersion:null,status:"private"}}
export class Problem extends Error {constructor(message:string,public status=400){super(message)}}
export function obj(v:unknown):Record<string,unknown>{if(!v||typeof v!=="object"||Array.isArray(v))throw new Problem("Expected an object.");return v as Record<string,unknown>}
export function clean(v:unknown,max=2400,optional=false) {
  if(typeof v!=="string"||(!optional&&!v.trim())||v.length>max)throw new Problem("A text field is missing or too long.");
  // Avoid a short English match across innocent words (e.g. "maps but").
  const unsafe=defaultFilter.findAll(v).some(m=>!/[a-z]/i.test(m.word) ||
    !(/[a-z]/i.test(v[m.start-1]||"") || /[a-z]/i.test(v[m.end]||"")));
  if(unsafe||/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(v)||/(?:\+\d[ ()-]*)?(?:\d[ ()-]*){9,15}/.test(v))throw new Problem("Remove private contact details or unsafe language before continuing.");
  return v.trim();
}
export function checkedBoard(v:unknown):Board {
  const data=obj(v), out:Board={};
  for(const [key,value] of Object.entries(data)){
    if(!fields.includes(key as Field))throw new Problem("Unknown idea board field.");
    out[key as Field]=clean(value,900,true);
  }
  return out;
}
export function checkedDraft(v:unknown):Draft {
  const data=obj(v);
  return Object.fromEntries(draftFields.map(k=>[k,clean(data[k],k==="title"?140:2200, k==="references"||k==="questions")])) as Draft;
}
export function checkedReview(v:unknown):Review {
  const d=obj(v);return {strengths:clean(d.strengths),concerns:clean(d.concerns),nextStep:clean(d.nextStep)};
}
export function writable(s:State){if(s.status==="submitted")throw new Problem("This submitted version is read-only. Start a new project to explore another direction.",409)}
export function changeBoard(s:State,input:unknown){
  writable(s);const data=obj(input);
  if("confirm" in data){const b=checkedBoard(data.confirm);Object.assign(s.confirmed,b);for(const k of Object.keys(b))delete s.suggestions[k as Field]}
  if("dismiss" in data){if(!fields.includes(data.dismiss as Field))throw new Problem("Invalid field.");delete s.suggestions[data.dismiss as Field]}
  if("stage" in data){if(!stages.includes(data.stage as Stage))throw new Problem("Unknown stage.");s.stage=data.stage as Stage}
}
export function recordTurn(s:State,text:string,reply:string,suggestions:Board){
  writable(s);
  if(s.messages.length>=200)throw new Problem("This notebook is full. Start another project.",409);
  s.messages.push({role:"user",text:clean(text,4000)},{role:"assistant",text:clean(reply,4500)});
  for(const [k,v] of Object.entries(checkedBoard(suggestions)))if(v&&v!==s.confirmed[k as Field])s.suggestions[k as Field]=v;
}
export function saveDraft(s:State,value:unknown,now=new Date().toISOString()){
  writable(s);if(s.versions.length>=40)throw new Problem("This notebook already has 40 versions.",409);
  s.versions.push({draft:checkedDraft(value),at:now});s.review=null;s.reviewedVersion=null;s.proposal=null;s.stage="DRAFT";
}
export function submit(s:State){
  writable(s);if(!s.versions.length||!s.review||s.reviewedVersion!==s.versions.length)throw new Problem("Save and review the current draft before submitting.",409);
  s.status="submitted";s.stage="REVIEW";
}
