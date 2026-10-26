"use client";

import { useEffect, useState } from "react";
import { Check, Languages } from "lucide-react";
import { CourseWorld, LanguageLearningConfig, applyLearningConfig } from "@/lib/immersive/course";

const csv = (value: string) => value.split(/[,，\n]/).map(item => item.trim()).filter(Boolean);

export default function LanguageSettingsPanel({ course, onApply }: { course: CourseWorld; onApply: (course: CourseWorld) => void }) {
  const [draft, setDraft] = useState<LanguageLearningConfig>(course.learning);
  useEffect(() => setDraft(structuredClone(course.learning)), [course.id, course.learning]);
  const set = <K extends keyof LanguageLearningConfig>(key: K, value: LanguageLearningConfig[K]) => setDraft(current => ({ ...current, [key]: value }));
  return <section className="settings-stack">
    <div className="settings-intro"><Languages size={18}/><div><strong>Language learning</strong><p>The interface, your conversation with Moli and the language inside the game can be different.</p></div></div>
    <details open><summary>1 · Languages and learner</summary>
      <label>Game learning language<input value={draft.targetLanguage} onChange={e => set("targetLanguage", e.target.value)}/></label>
      <label>Support language<input value={draft.supportLanguage} onChange={e => set("supportLanguage", e.target.value)}/></label>
      <label>Language used to create with Moli<input value={draft.creationLanguage} onChange={e => set("creationLanguage", e.target.value)}/></label>
      <div className="two-fields"><label>Age range<input value={draft.ageRange} onChange={e => set("ageRange", e.target.value)}/></label><label>Language level<input value={draft.level} onChange={e => set("level", e.target.value)}/></label></div>
      <label>What can this learner already do?<textarea value={draft.abilityDescription} onChange={e => set("abilityDescription", e.target.value)}/></label>
    </details>
    <details><summary>2 · Goals and language</summary>
      <label>Learning goals, one per line<textarea value={draft.goals.join("\n")} onChange={e => set("goals", csv(e.target.value))}/></label>
      <label>Target words<input value={draft.targetVocabulary.join(", ")} onChange={e => set("targetVocabulary", csv(e.target.value))}/></label>
      <label>Target sentence patterns<input value={draft.targetPatterns.join(", ")} onChange={e => set("targetPatterns", csv(e.target.value))}/></label>
    </details>
    <details><summary>3 · Support and outcome</summary>
      <div className="check-grid">
        {([['pictures','Pictures'],['choices','Choices'],['sentenceStarters','Sentence starters'],['translation','Translation']] as const).map(([key,label]) => <label key={key}><input type="checkbox" checked={draft.scaffolds[key]} onChange={e => setDraft(current => ({ ...current, scaffolds: { ...current.scaffolds, [key]: e.target.checked } }))}/>{label}</label>)}
      </div>
      <label>Correction style<textarea value={draft.correctionStyle} onChange={e => set("correctionStyle", e.target.value)}/></label>
      <label>Experience length (minutes)<input type="number" min="5" max="60" value={draft.minutes} onChange={e => set("minutes", Number(e.target.value))}/></label>
      <label>Final creation outcome<textarea value={draft.finalOutcome} onChange={e => set("finalOutcome", e.target.value)}/></label>
    </details>
    <button className="primary full-button" onClick={() => onApply(applyLearningConfig(course, draft))}><Check size={16}/>Apply to this world</button>
    <small>Only this world changes. Teacher defaults are not overwritten.</small>
  </section>;
}
