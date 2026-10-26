"use client";
import { useState } from 'react';
import { CourseWorld, fruit } from '@/lib/immersive/course';
export default function LearningPanel({course,index,visited,onNext}: {course:CourseWorld;index:number;visited:string;onNext:()=>void}) {
  const t=course.tasks[index];const [matched,setMatched]=useState<string[]>([]);const [ingredients,setIngredients]=useState<string[]>([]);const [feedback,setFeedback]=useState('');const [hints,setHints]=useState(0);const [done,setDone]=useState(false);const [opened,setOpened]=useState(false);
  const correct=(text:string)=>{setDone(true);setFeedback(text);};
  if(!t)return <section className="learning-panel"><p className="eyebrow">Your learning keepsake</p><h2>You brought the recipe home.</h2><p>You practised four fruit words, polite questions, and position clues.</p><ul>{course.objectives.map(o=><li key={o}>✓ {o}</li>)}</ul><p className="human-note">Human moment · {course.mentor.humanMoment}</p><p>No message has been sent to a teacher. Your learning choices stay in this preview session.</p></section>;
  const atStop=visited===t.objectId;
  const choose=(value:string)=>{if(value===t.answer)correct(t.feedback);else{setHints(v=>v+1);setFeedback('Good try. '+t.hint);}};
  return <section className="learning-panel" aria-label="Learning task"><div className="task-heading"><span className="eyebrow">{index+1} / {course.tasks.length} · {t.kind}</span><button onClick={()=>{setHints(h=>h+1);setFeedback(t.hint);}}>Need a hint?</button></div><h2>{t.title}</h2><p>{index===0?course.mentor.opening:t.prompt}</p>
    {!atStop&&!done&&<p className="stop-note">Visit {course.objects.find(o=>o.id===t.objectId)?.label} using the scene or the buttons above.</p>}
    {atStop&&!done&&<>
      {t.kind!=='intro'&&t.kind!=='find'&&<p className="stall-dialogue">{course.objects.find(o=>o.id===visited)?.dialogue}</p>}
      {(t.kind==='intro'||t.kind==='find')&&<><p>{course.objects.find(o=>o.id===visited)?.dialogue}</p><button className="primary" onClick={()=>correct(t.feedback)}>{t.kind==='intro'?'Let’s begin':'I found it!'}</button></>}
      {t.kind==='match'&&<><div className="fruit-picture" aria-label={'Picture of '+fruit[matched.length]?.word}>{fruit[matched.length]?.icon}</div><div className="choice-grid">{fruit.map(f=><button key={f.word} onClick={()=>{if(f.word===fruit[matched.length]?.word){const m=[...matched,f.word];setMatched(m);setFeedback('Yes — '+f.word+'!');if(m.length===4)correct(t.feedback);}else{setFeedback(t.hint);setHints(h=>h+1);}}}>{f.word}</button>)}</div><p>{matched.length}/4 matched {matched.join(' · ')}</p></>}
      {t.kind==='recipe'&&!opened&&<button className="recipe-card" onClick={()=>setOpened(true)}>📘 Open the blue recipe card</button>}
      {(t.kind==='dialogue'||t.kind==='recipe'&&opened)&&<><p>{t.kind==='recipe'?'Fruit ice: choose fruit → add ice → enjoy. What do we say?':'Bookseller: Hello! Can I help you?'}</p>{t.options.map(o=><button className="choice" key={o} onClick={()=>choose(o)}>{o}</button>)}</>}
      {t.kind==='create'&&<><div className="choice-grid">{fruit.map(f=><button aria-pressed={ingredients.includes(f.word)} key={f.word} onClick={()=>setIngredients(v=>v.includes(f.word)?v.filter(x=>x!==f.word):[...v,f.word])}>{f.icon} {f.word}</button>)}</div><p className="sentence">My fruit ice has {ingredients.length?ingredients.join(' and '):'____'}.</p><button className="primary" disabled={ingredients.length<2} onClick={()=>correct('You described your creation: “My fruit ice has '+ingredients.join(' and ')+ '.” '+t.feedback)}>Serve my fruit ice 🍧</button></>}
    </>}
    {hints>0&&course.mentor.hintStrength>=2&&<div aria-label="Picture support" className="picture-hint">🥭 mango · 🍌 banana · 🍋‍🟩 lime · 🥥 coconut</div>}
    <p role="status" className="feedback">{feedback}</p>{done&&<button className="primary" onClick={onNext}>Continue →</button>}
  </section>;
}
