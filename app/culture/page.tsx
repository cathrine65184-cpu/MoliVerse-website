import Link from "next/link";
import {Shell} from "@/components/universe/Shell";
import {WEEKLY_ISSUES, WEEKLY_HTML_ISSUES} from "@/lib/cultureWeekly";
import {withBasePath} from "@/lib/paths";
import "./weekly.css";

export const metadata = {title: "Culture Weekly | MoliVerse", description: "A little journal for reading, wondering and talking about our world.", robots: {index: false, follow: false}};

export default function CultureWeekly() {
  return <Shell><section className="weekly-index">
    <Link className="weekly-back" href="/#discover">← Discover MoliVerse</Link>
    <header className="weekly-heading"><small>Culture / A little journal</small><h1>Culture Weekly</h1><p>Read the world with curiosity.<br/>A question to explore. A few words to keep. A conversation to share.</p></header>
    <p className="weekly-editor-note">Editorial previews · These are reading samples for families and educators, not live news. Please check the source notes and dates in each issue.</p>
    <div className="weekly-issues">{WEEKLY_ISSUES.map(issue => <article key={issue.slug} className="weekly-issue-card">
      <div className="weekly-number" aria-hidden="true">{issue.number}</div>
      <div><small>Issue {issue.number} · {issue.language} · Read together</small><h2><Link href={`/culture/${issue.slug}/`}>{issue.title}</Link></h2><p>{issue.subtitle}</p><Link className="weekly-read" href={`/culture/${issue.slug}/`}>Open this issue →</Link></div>
    </article>)}{WEEKLY_HTML_ISSUES.map(issue => <article key={issue.slug} className="weekly-issue-card">
      <div className="weekly-number" aria-hidden="true">{issue.number}</div>
      <div><small>Issue {issue.number} · English · Read together · Editorial preview</small><h2><a href={withBasePath(`/culture-weekly/${issue.file}`)}>{issue.title}</a></h2><p>{issue.subtitle}</p><a className="weekly-read" href={withBasePath(`/culture-weekly/${issue.file}`)}>Open this issue →</a></div>
    </article>)}</div>
    <footer className="weekly-index-footer"><h2>Small questions. A wider world.</h2><p>Culture, everyday life and thoughtful world questions — with room to say “I don’t know yet.” No subscription or personal information needed.</p><Link href="/explore/">Looking for a game? Visit Course Plaza →</Link></footer>
  </section></Shell>;
}
