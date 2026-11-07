import Link from "next/link";
import InkSeam from "@/components/universe/InkSeam";
import { Shell, Banner } from "@/components/universe/Shell";
import "./creator-home.css";

const paths = [
  { label: "OPEN PLATFORM", title: "Share a Learning Experience", text: "Upload slides, storybooks, videos or existing learning materials for review and publishing.", href: "/teach/share/" },
  { label: "CREATOR MOLI", title: "Brainstorm with Moli", text: "Talk with Moli to shape an idea, refine a lesson concept or prepare a submission.", href: "/teach/studio/?mode=young-creator" },
  { label: "CREATOR PROFILE", title: "Set up your profile", text: "Introduce your story, languages, interests and the kinds of learning experiences you want to share.", href: "/teach/share/?view=profile#creator-profile" },
];
export default function Teach() {
  return <Shell><Banner label="EDUCATOR & CREATOR STUDIO" title="Teach what you love."><p>Bring your knowledge, culture and creativity. You do not need to build a game or a story board to share something meaningful.</p></Banner>
    <section className="un-section creator-start"><InkSeam/><h2>Choose how you’d like to start.</h2>
      <div className="creator-start-grid">{paths.map((p, i) => <Link className={`creator-start-card creator-start-${i}`} href={p.href} key={p.label}><small>{p.label}</small><h3>{p.title}</h3><p>{p.text}</p><span aria-hidden="true">→</span></Link>)}</div>
      <p className="creator-start-note">Private brainstorming is for verified adults. Sharing with children requires separate creator verification and human content review.</p>
      <nav className="creator-resources" aria-label="More creator resources"><Link href="/teach/library/">Import a reading</Link><Link href="/#workshops">Live workshops</Link></nav>
    </section></Shell>;
}
