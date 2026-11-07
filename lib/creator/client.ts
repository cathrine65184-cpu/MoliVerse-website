import {supabase} from "../supabase";
import type {State} from "./workflow";
export type Project = {id:string;title:string;revision:number;state:State};
export type Summary = Pick<Project,"id"|"title"|"revision">;
export async function invoke(body:Record<string,unknown>,delta?:(s:string)=>void):Promise<{project?:Project;projects?:Summary[]}>{
 const {data,error}=await supabase.functions.invoke("creator-moli",{body});
 if(error){
   let reason="Creator Moli is unavailable. Check your connection, reload your access status and retry. Your saved notebook has not been replaced.";
   try{const j=await error.context.json();if(typeof j.error==="string")reason=j.error}catch{/* gateway errors have no project details */}
   throw Error(reason);
 }
 if(!(data instanceof Response))return data;
 if(!data.body)throw Error("The chat stream is missing.");
 const reader=data.body.getReader(),dec=new TextDecoder();let tail="",project:Project|undefined;
 try{while(true){
   const {done,value}=await reader.read();if(done)break;tail+=dec.decode(value,{stream:true});
   let end:number;while((end=tail.indexOf("\n\n"))>=0){const event=tail.slice(0,end);tail=tail.slice(end+2);if(!event.startsWith("data: "))continue;
     const item=JSON.parse(event.slice(6));if(item.error)throw Error(item.error);if(item.delta)delta?.(item.delta);if(item.project)project=item.project;
   }
 }}finally{await reader.cancel().catch(()=>{});}
 if(!project)throw Error("Connection lost before save was confirmed. Reload the project before retrying.");
 return {project};
}
