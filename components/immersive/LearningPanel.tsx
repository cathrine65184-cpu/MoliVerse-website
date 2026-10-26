"use client";

import { useEffect, useState } from "react";
import { CourseWorld } from "@/lib/immersive/course";

const picture: Record<string, string> = {
  bonjour: "👋", ami: "🤝", merci: "💛", ensemble: "✨",
  mango: "🥭", banana: "🍌", lime: "🍋‍🟩", coconut: "🥥",
  listen: "👂", help: "🫶", share: "🎁", explore: "🗺️",
};

export default function LearningPanel({ course, index, visited, onNext }: { course: CourseWorld; index: number; visited: string; onNext: () => void }) {
  const task = course.tasks[index];
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [hints, setHints] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setStep(0); setChosen([]); setFeedback(""); setHints(0); setDone(false);
  }, [task?.id]);

  if (!task) return (
    <section className="learning-panel">
      <p className="eyebrow">WORLD COMPLETE</p>
      <h2>You changed this story.</h2>
      <p>You explored, made choices and used new language inside a world of your own.</p>
      <ul>{course.objectives.map((objective) => <li key={objective}>✓ {objective}</li>)}</ul>
      <p className="human-note">Share this moment · {course.mentor.humanMoment}</p>
      <p>Nothing has been posted or sent from this playtest.</p>
    </section>
  );

  const object = course.objects.find((item) => item.id === task.objectId);
  const atStop = visited === task.objectId;
  const finish = (message: string) => { setDone(true); setFeedback(message); };
  const chooseOne = (value: string) => {
    if (value === task.answer) finish(task.feedback);
    else { setHints((count) => count + 1); setFeedback(`Good try. ${task.hint}`); }
  };
  const match = (value: string) => {
    const expected = task.options[step];
    if (value !== expected) { setHints((count) => count + 1); setFeedback(task.hint); return; }
    const next = step + 1;
    setChosen((items) => [...items, value]);
    setFeedback(`Yes — ${value}!`);
    setStep(next);
    if (next === task.options.length) finish(task.feedback);
  };

  return (
    <section className="learning-panel" aria-label="Story challenge">
      <div className="task-heading">
        <span className="eyebrow">CHALLENGE {index + 1} OF {course.tasks.length}</span>
        <button onClick={() => { setHints((count) => count + 1); setFeedback(task.hint); }}>Moli, a hint?</button>
      </div>
      <h2>{task.title}</h2>
      <p>{index === 0 ? course.mentor.opening : task.prompt}</p>

      {!atStop && !done && <p className="stop-note">Explore <strong>{object?.label}</strong> in the world above.</p>}
      {atStop && !done && <>
        <p className="stall-dialogue">{object?.dialogue}</p>
        {(task.kind === "intro" || task.kind === "find") && <button className="primary" onClick={() => finish(task.feedback)}>{task.kind === "intro" ? "Enter the story" : "I found it!"}</button>}
        {task.kind === "match" && <>
          <div className="fruit-picture" aria-label={`Picture clue for ${task.options[step] ?? "complete"}`}>{picture[task.options[step]] ?? "🔎"}</div>
          <div className="choice-grid">{task.options.map((option) => <button key={option} disabled={chosen.includes(option)} onClick={() => match(option)}>{option}</button>)}</div>
          <p>{chosen.length}/{task.options.length} discovered {chosen.join(" · ")}</p>
        </>}
        {(task.kind === "dialogue" || task.kind === "recipe") && <div className="choice-stack">{task.options.map((option) => <button className="choice" key={option} onClick={() => chooseOne(option)}>{option}</button>)}</div>}
        {task.kind === "create" && <>
          <div className="choice-grid">{task.options.map((option) => <button aria-pressed={chosen.includes(option)} key={option} onClick={() => setChosen((items) => items.includes(option) ? items.filter((item) => item !== option) : [...items, option])}>{picture[option] ?? "✦"} {option}</button>)}</div>
          <p className="sentence">My story promise: {chosen.length ? chosen.join(" + ") : "choose two ideas"}.</p>
          <button className="primary" disabled={chosen.length < 2} onClick={() => finish(task.feedback)}>Add it to my story ✨</button>
        </>}
      </>}

      {hints > 0 && course.mentor.hintStrength >= 2 && <div aria-label="Picture support" className="picture-hint">{task.options.map((option) => `${picture[option] ?? "✦"} ${option}`).join(" · ")}</div>}
      <p role="status" className="feedback">{feedback}</p>
      {done && <button className="primary" onClick={onNext}>{index + 1 === course.tasks.length ? "See what I made →" : "Continue the story →"}</button>}
    </section>
  );
}
