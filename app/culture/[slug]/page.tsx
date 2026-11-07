import Link from "next/link";
import {notFound} from "next/navigation";
import {Shell} from "@/components/universe/Shell";
import {WEEKLY_ISSUES,weeklyIssue} from "@/lib/cultureWeekly";
import "../weekly.css";

export function generateStaticParams(){return WEEKLY_ISSUES.map(({slug})=>({slug}));}
export function generateMetadata({params}:{params:{slug:string}}){return {title:`${weeklyIssue(params.slug)?.title??"Culture Weekly"} | MoliVerse`,robots:{index:false,follow:false}};}

export default function WeeklyArticle({params}:{params:{slug:string}}){
  const issue=weeklyIssue(params.slug);if(!issue)notFound();
  return <Shell><article className="weekly-article" lang="en">
    <Link className="weekly-back" href="/culture/">← All issues</Link>
    <header className="weekly-heading"><small>Culture Weekly / Issue {issue.number} / Editorial preview</small><h1>{issue.title}</h1><p>{issue.subtitle}</p><div className="weekly-meta">{issue.language} · {issue.reading}</div></header>
    <aside className="weekly-editor-note"><strong>Before we begin</strong><p>This issue discusses war without graphic descriptions or images. Read with a trusted adult. You can stop at any time; you do not need to answer every question.</p><Link href="/explore/">Choose a different activity →</Link></aside>
    <div className="weekly-reading">{issue.sections.map(section=><section key={section.title}><small>{section.label}</small><h2>{section.title}</h2>{section.paragraphs.map(p=><p key={p}>{p}</p>)}{section.source&&<a className="weekly-source-link" href={`#${section.source}`}>Read the background source ↓</a>}</section>)}</div>
    <section className="weekly-words"><small>Words to keep</small><h2>A small word notebook</h2><p>Open a word when you need it.</p><div>{issue.words.map(({word,meaning})=><details key={word}><summary>{word}</summary><p>{meaning}</p></details>)}</div></section>
    <section className="weekly-talk"><small>Talk / Wonder / Make</small><h2>What do you think?</h2><ol>{issue.questions.map(q=><li key={q}>{q}</li>)}</ol><p>Talk together or draw on paper. Nothing you say or draw is collected here.</p></section>
    <aside className="weekly-care"><h2>It’s okay to take a break.</h2><p>If this topic makes you worried, tell a trusted adult how you feel. You can choose a calmer story or activity together.</p><Link href="/read/">Find a reading →</Link></aside>
    <section className="weekly-sources"><h2>For families and educators</h2><p>This is a newly written MoliVerse explainer inspired by a submitted article topic, not a translation or a reprint. The submitted article’s forecasts, disputed quotations and current-event claims have not been reproduced as facts. Its original text and images are not included.</p><p>This preview needs editorial approval before publication. It does not report a new peace agreement or endorse a proposed border.</p>
      <ul>{issue.sources.map(source=><li id={source.id} key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a><p>{source.note}</p></li>)}</ul>
      <p>Source pages checked 7 November 2026. Links open external websites; no external media or tracking scripts are embedded.</p>
    </section>
    <footer className="weekly-ending"><Link href="/culture/">← Back to Culture Weekly</Link><Link href="/explore/">Explore a learning activity →</Link></footer>
  </article></Shell>;
}
