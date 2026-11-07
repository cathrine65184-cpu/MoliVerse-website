"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ORIGINAL_LIBRARY, progressKey} from "@/lib/contentLibrary";
import {withBasePath} from "@/lib/paths";
import {journey as lesson} from "@/lib/platform/journey";

const publicItems=ORIGINAL_LIBRARY.filter(x=>x.visibility==="public" && x.processingStatus==="ready");
export default function Catalog({history=false}:{history?:boolean}){
 const [query,setQuery]=useState(""); const [lang,setLang]=useState(""); const [progress,setProgress]=useState<Record<string,boolean>>({});
 useEffect(()=>{const next:Record<string,boolean>={};for(const x of publicItems){try{const raw=localStorage.getItem(progressKey("local",x.id,x.version));if(raw)next[x.id]=!!JSON.parse(raw).completed}catch{/* Local progress is optional. */}}setProgress(next)},[]);
 const items=publicItems.filter(x=>(!history||x.id in progress)&&(!lang||lang===x.language)&&[x.title,...x.themes,x.proficiencyLevel,x.suggestedAgeRange].join(" ").toLowerCase().includes(query.toLowerCase().trim()));
 const journeyVisible=!history&&(!lang||lang===lesson.language)&&[lesson.title,lesson.language,lesson.level,lesson.description].join(" ").toLowerCase().includes(query.toLowerCase().trim());
 return <>{!history&&<div className="un-filters"><label>Find an adventure<input type="search" placeholder="Title, theme, age or level" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Learning language<select value={lang} onChange={e=>setLang(e.target.value)}><option value="">All languages</option>{Array.from(new Set([...publicItems.map(x=>x.language),lesson.language])).map(l=><option key={l}>{l}</option>)}</select></label></div>}
 <div className="un-grid">{journeyVisible&&<a className="un-card un-item" href={withBasePath(lesson.href)}><div className="un-cover" style={{background:"#e9eddb"}} aria-hidden="true"><img src={withBasePath("/moli-cutout.png")} alt=""/></div><small>Role-play · French · Chinese guidance</small><h3>{lesson.title}</h3><p>{lesson.level} · Explore China</p><p>{lesson.description}</p><span>Begin the journey →</span></a>}{items.map(x=><Link className="un-card un-item" key={x.id} href={`/${x.contentType}/?story=${encodeURIComponent(x.id)}`}><div className="un-cover" style={{background:`linear-gradient(125deg,${x.cover.from},${x.cover.to})`}}>{x.cover.image?<img src={withBasePath(x.cover.image)} alt=""/>:x.cover.emoji}</div><small>{x.contentType} · {x.language} · {x.minutes} min</small><h3>{x.title}</h3><p>{x.suggestedAgeRange} years · {x.proficiencyLevel}</p><p>{x.id in progress?(progress[x.id]?"Revisit activity":"Continue activity"):x.themes.join(" · ")}</p></Link>)}</div>{!items.length&&!journeyVisible&&<p>{history?"Your first reading or song will appear here when you save progress on this device.":"No adventures match yet. Try another language or a shorter search."}</p>}</>
}
