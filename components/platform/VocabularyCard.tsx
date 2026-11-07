"use client";
import {useEffect,useRef,useState} from "react";
import {entryForAsset,concepts,checkVocabulary,choosePronunciation,restoreVocab,summarise,type VocabEvent} from "@/lib/platform/vocabulary";
import {rpc} from "@/lib/platform/client";
import {supabase} from "@/lib/supabase";

export default function VocabularyCard({asset,language,e,uid,sessionOnly,onClose,initialMode="word",onProgress,allowAI=true}:{asset:string;language:string;e:string|null;uid:string|null;sessionOnly:boolean;onClose:()=>void;initialMode?:"word"|"practice"|"review";onProgress?:()=>void;allowAI?:boolean}){
 const entry=entryForAsset(asset,language),[events,setEvents]=useState<VocabEvent[]>([]),[phase,setPhase]=useState<"word"|"practice"|"review">(initialMode),[answer,setAnswer]=useState<string|null>(null),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[audioNotice,setAudioNotice]=useState("");
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]),audio=useRef<HTMLAudioElement|null>(null),pending=useRef<VocabEvent|null>(null);
 const storageKey="moliverse:room-vocabulary:v1:"+(uid||"guest");
 const [moliExample,setMoliExample]=useState("");
 useEffect(()=>{
   const update=()=>setVoices(window.speechSynthesis?.getVoices()||[]);update();window.speechSynthesis?.addEventListener("voiceschanged",update);
   return ()=>{window.speechSynthesis?.removeEventListener("voiceschanged",update);window.speechSynthesis?.cancel();audio.current?.pause()};
 },[]);
 useEffect(()=>{let live=true;setReady(false);void(async()=>{try{
   const rows=e?await rpc<VocabEvent[]>("lb_vocab_history",{e}):sessionOnly?[]:restoreVocab(localStorage.getItem(storageKey));
   if(live){setEvents(rows);setReady(true)}
 }catch{if(live){setNotice(e?"Could not open your vocabulary notes. Close and reopen to retry.":"Storage is unavailable. You can still practise in this tab.");setReady(!e)}}})();return()=>{live=false}},[e,sessionOnly,storageKey]);
 if(!entry)return <section className="pv-panel pv-vocab"><h2>Word not available yet</h2><p>This object has no checked translation in this language. Your room is unchanged.</p><button onClick={onClose}>Close word card</button></section>;
 const summary=summarise(events,entry.id),sound=choosePronunciation(entry,voices);
 async function record(kind:VocabEvent["kind"],choice:string|null){
   if(!entry||!ready)return;
   const event={entry:entry.id,kind,choice,correct:kind==="discovery"?null:checkVocabulary(entry,choice||""),nonce:crypto.randomUUID()};
   pending.current=event;await persist();
 }
 async function persist(){
   const event=pending.current;if(!event)return;setBusy(true);
   try{
     let saved=event;
     if(e)saved=await rpc<VocabEvent>("lb_vocab_record",{e,entry_id:event.entry,event_kind:event.kind,choice:event.choice,nonce:event.nonce});
     const next=[...events.filter(x=>x.nonce!==saved.nonce),saved].slice(-500);
     if(!e&&!sessionOnly){try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{setEvents(next);pending.current=null;setNotice("Device storage is unavailable. Your practice is kept in this card for this visit only.");return}}
     setEvents(next);pending.current=null;onProgress?.();setNotice(e?"Vocabulary note saved privately.":sessionOnly?"Practice kept for this visit only.":"Vocabulary note saved on this device.");
   }catch{setNotice("Your answer is shown, but your vocabulary note was not saved. Please retry.")}
   finally{setBusy(false)}
 }
 function listen(text?:string){
   if(!entry)return;setAudioNotice("");
   if(sound.kind==="audio"){
     audio.current?.pause();audio.current=new Audio(sound.url);void audio.current.play().catch(()=>setAudioNotice("Audio could not play. The word and practice are still available."));return;
   }
   if(sound.kind==="device"){
     const voice=voices.find(v=>v.localService&&v.lang===sound.locale);if(!voice)return;
     window.speechSynthesis.cancel();const line=new SpeechSynthesisUtterance(text||entry.pronunciation.text);line.voice=voice;line.lang=voice.lang;line.rate=.8;
     line.onerror=()=>setAudioNotice("Device speech could not play. Try again or read the word together.");window.speechSynthesis.speak(line);
   }
 }
 return <section className="pv-panel pv-vocab" aria-label="Tap to Learn">
   <div className="pv-vocab-head"><small>Tap to Learn · {language==="fr"?"French":"English"}</small><button onClick={onClose}>Close word card</button></div>
   <h2 lang={language}>{entry.article} {entry.word}</h2><p>{entry.meaning}</p>
   <button disabled={sound.kind==="unavailable"} onClick={()=>listen()}>Listen · {sound.kind==="audio"?"recording":"device voice"}</button>
   {sound.kind==="unavailable"&&<p>No local {language==="fr"?"French":"English"} voice is installed. Reading and practice still work; no voice recording is sent.</p>}
   <p role="status">{audioNotice}</p>
   <p><strong>Example</strong><br/><span lang={language}>{entry.example}</span></p>
   {sound.kind==="device"&&<button onClick={()=>listen(entry.example)}>Listen to example · device voice</button>}
   {allowAI&&<details><summary>Optional Moli example</summary><p>With your guardian’s AI permission, Moli can choose another checked example for this object. This sends the object and language to DeepSeek, not a typed message. No reward or grade changes.</p><button disabled={!e||busy} onClick={async()=>{setBusy(true);try{const {data,error}=await supabase.functions.invoke("world-moli",{body:{explorer:e,action:"vocabulary-example",selected:asset,language,question:"Choose a short example for this object."}});if(error||!entry.examples.includes(data?.reply))throw Error();setMoliExample(data.reply)}catch{setMoliExample("Live Moli is unavailable or not permitted. The checked example above still works.")}finally{setBusy(false)}}}>Ask Moli for an example</button><p role="status">{moliExample}</p></details>}
   <small>{entry.article} · {entry.gender==="none"?"noun":entry.gender+" noun"} · {entry.level}</small>
   <div className="pv-toolbar">
     <button disabled={!ready||busy||summary.discoveries>0} onClick={()=>record("discovery",null)}>{summary.discoveries?"Added to my words":"Add to my words"}</button>
     <button disabled={!ready||busy} onClick={()=>{setPhase("practice");setAnswer(null)}}>Practise</button>
     <button disabled={!ready||busy} onClick={()=>{setPhase("review");setAnswer(null)}}>Review this word</button>
   </div>
   {phase!=="word"&&<fieldset><legend>{phase==="review"?"Try to remember: ":"What does this mean? "}<span lang={language}>{entry.article} {entry.word}</span></legend>
     {[...entry.options].sort().map(id=><button disabled={busy||answer!==null} key={id} onClick={()=>{setAnswer(id);void record(phase,id)}}>{concepts.find(c=>c.id===id)?.label}</button>)
   }</fieldset>}
   {answer&&<div role="status"><p>{checkVocabulary(entry,answer)?`Yes — ${entry.article} ${entry.word} means ${concepts.find(c=>c.id===entry.conceptId)?.label}. You practised recognising it.`:`Not this time. ${entry.meaning} Look at the object and try again.`}</p><button disabled={busy} onClick={()=>setAnswer(null)}>Try again</button></div>}
   <p role="status">{notice}</p>{pending.current&&!busy&&<button onClick={persist}>Retry saving vocabulary note</button>}
   <p className="pv-vocab-summary">{summary.discoveries} discovery · {summary.practices} practice · {summary.reviews} review · {summary.correct} correct · {summary.again} to try again. Not a mastery rating.</p>
   <details><summary>Word source and pronunciation</summary><p>Reference-checked starter entry, {entry.source.checkedAt}. Examples are written for MoliVerse, not generated translations.</p><a href={entry.source.url} target="_blank" rel="noopener noreferrer">{entry.source.title}</a><p>{entry.source.changes}</p><a href={entry.source.licenseUrl} target="_blank" rel="noopener noreferrer">{entry.source.license}</a><p>Pronunciation uses an installed local device voice. No microphone, third-party request or voice cloning.</p></details>
 </section>;
}
