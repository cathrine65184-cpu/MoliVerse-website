import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
import {changeBoard,clean,initial,obj,Problem,recordTurn,saveDraft,submit,writable,type State} from "../../../lib/creator/workflow.ts";
import {context,outline,reply,review,suggest} from "./agent.ts";

const origins=new Set(["https://moliverse.tech","https://www.moliverse.tech"]);
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
type Row={id:string;title:string;revision:number;state:State};
function check(error:unknown){if(error)throw new Problem("Private storage unavailable. Check the Creator Moli migration and try again.",503)}
function publicError(e:unknown){return e instanceof Problem?e:new Problem("The request did not finish. Reopen the project before retrying.",502)}
Deno.serve(async req=>{
  const origin=req.headers.get("origin")||"";
  if(origin&&!origins.has(origin)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))return new Response(null,{status:403});
  const headers={"Access-Control-Allow-Origin":origin||"https://moliverse.tech","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store","Vary":"Origin"};
  const json=(body:unknown,status=200)=>Response.json(body,{status,headers});
  if(req.method==="OPTIONS")return new Response(null,{headers});
  if(req.method!=="POST")return json({error:"POST required."},405);
  try{
    const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token=req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if(!token)throw new Problem("Sign in to Creator Space.",401);
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:authError}=await db.auth.getUser(token);
    if(authError||!user)throw new Problem("Please sign in again.",401);
    // Adult brainstorming and creator/publication approval are deliberately separate.
    // Service RPC rechecks the current profile + verified adult record, not client metadata.
    const {data:eligibility,error:eligibilityError}=await db.rpc("cm_access_for",{actor:user.id});
    check(eligibilityError);
    if(eligibility!=="eligible")throw new Problem(eligibility==="restricted"?"This account cannot use adult creator tools. Visit Creator Moli access for support.":"Complete adult verification in Creator Moli before starting a private notebook.",403);
    const raw=await req.text();if(raw.length>35000)throw new Problem("Use a shorter excerpt or draft.",413);
    let body;try{body=obj(JSON.parse(raw))}catch{throw new Problem("Invalid request.")}
    const action=body.action, uid=user.id;
    if(action==="list"){
      const {data,error}=await db.from("creator_moli_projects").select("id,title,revision,updated_at").eq("owner_id",uid).order("updated_at",{ascending:false});check(error);return json({projects:data});
    }
    if(action!=="get_project_state"&&action!=="get_creator_context"){
      const {data,error}=await db.rpc("creator_moli_quota",{actor:uid,ceiling:60});check(error);if(!data)throw new Problem("Hourly limit reached. Try again next hour.",429);
    }
    if(action==="create"){
      const {data,error}=await db.from("creator_moli_projects").insert({owner_id:uid,title:clean(body.title,140),state:initial()}).select("id,title,revision,state").single();check(error);return json({project:data});
    }
    async function creatorContext(){
      const {data,error}=await db.from("teacher_dna").select("personality,teaching_style,values,course_world").eq("teacher_id",uid).maybeSingle();check(error);
      return data?Object.fromEntries(Object.entries(data).map(([k,v])=>[k,clean(typeof v==="string"?v.slice(0,700):"",700,true)])):null;
    }
    if(action==="get_creator_context")return json({dna:await creatorContext()});
    if(!uuid.test(String(body.projectId)))throw new Problem("Select a valid project.");
    const {data,error}=await db.from("creator_moli_projects").select("id,title,revision,state").eq("id",body.projectId).eq("owner_id",uid).maybeSingle();check(error);
    if(!data)throw new Problem("Project not found.",404);
    const row=data as Row,s=row.state;
    if(action==="get_project_state")return json({project:row});
    if(body.revision!==row.revision)throw new Problem("Project changed in another tab. Reload before saving.",409);
    async function commit(){
      const {data:rev,error}=await db.rpc("creator_moli_commit",{actor:uid,target:row.id,expected:row.revision,next_state:s,verb:action});check(error);
      if(!rev)throw new Problem("Project changed in another tab. Reload before saving.",409);
      return {...row,revision:rev};
    }
    writable(s);
    if(action==="chat"){
      const message=clean(body.message,4000);
      if(s.messages.length>=200)throw new Problem("Start a new notebook to continue.",409);
      const ctx=context(s,message,await creatorContext());
      const stream=new ReadableStream({async start(controller){
        const send=(v:unknown)=>controller.enqueue(new TextEncoder().encode("data: "+JSON.stringify(v)+"\n\n"));
        try{
          const output=await reply(ctx,part=>send({delta:part}));
          const suggestions=await suggest({...ctx,recentDialogue:[...ctx.recentDialogue,{role:"user",text:message},{role:"assistant",text:output}]});
          recordTurn(s,message,output,suggestions);
          send({project:await commit()});
        }catch(e){send({error:publicError(e).message})}finally{controller.close()}
      }});
      return new Response(stream,{headers:{...headers,"Content-Type":"text/event-stream; charset=utf-8"}});
    }
    if(action==="save_brainstorm_state")changeBoard(s,body.edit);
    else if(action==="generate_course_outline"){
      s.proposal=await outline(context(s,clean(body.request??"Generate a course concept",1500),await creatorContext()));
    }else if(action==="save_course_draft")saveDraft(s,body.draft);
    else if(action==="review_course_draft"){
      if(!s.versions.length)throw new Problem("Save a draft before requesting a review.",409);
      s.review=await review(context(s,"Review my latest saved version",await creatorContext()));s.reviewedVersion=s.versions.length;s.stage="REVIEW";
    }else if(action==="submit"){
      const {data:creator,error:creatorError}=await db.from("lb_creators").select("status").eq("id",uid).maybeSingle();check(creatorError);
      if(creator?.status!=="approved")throw new Problem("Private brainstorming is available. Before submitting, complete the separate creator identity and profile review in Share a Learning Experience.",403);
      submit(s);
    }
    else throw new Problem("Unsupported tool.");
    return json({project:await commit()});
  }catch(e){const issue=publicError(e);return json({error:issue.message},issue.status)}
});
