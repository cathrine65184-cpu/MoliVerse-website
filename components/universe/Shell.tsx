import Link from "next/link";
import { withBasePath } from "@/lib/paths";
import "./universe.css";
import LivingCover from "./LivingCover";

export function Shell({ children }: {children: React.ReactNode}) {
  return <main className="universe"><header className="un-head"><Link className="un-brand" href="/"><img alt="" src={withBasePath("/moli-cutout.png")}/> MoliVerse</Link><nav aria-label="Explore MoliVerse"><Link href="/learn/">Campus</Link><Link href="/explore/">Course Plaza</Link><Link href="/teach/">For Creators</Link><Link href="/#educators">Meet us</Link></nav><Link className="un-login" href="/account/">Sign in</Link></header>{children}<footer className="un-footer"><strong>MoliVerse</strong><Link href="/families/">For families</Link><a href="mailto:moliversecn@gmail.com">Contact</a></footer></main>
}
export function Banner({label,title,children,living=false}:{label:string;title:string;children:React.ReactNode;living?:boolean}){
  if(living) return <LivingCover><div className="un-copy"><small>{label}</small><h1>{title}</h1>{children}</div></LivingCover>;
  return <section className="un-banner" style={{backgroundImage:`linear-gradient(90deg,#fffaf1 2%,#fffaf1ed 33%,#fffaf105 70%),url(${withBasePath("/universe-valley.jpg")})`}}><div className="un-copy"><small>{label}</small><h1>{title}</h1>{children}</div><img className="un-moli" alt="Moli, your little deer guide" src={withBasePath("/moli-cutout.png")}/></section>
}
export function PathCard({mark,title,body,href}:{mark:string;title:string;body:string;href:string}){
  return <Link className="un-card" href={href}><small>{mark}</small><h3>{title}</h3><p>{body}</p><span aria-hidden>↗</span></Link>
}
