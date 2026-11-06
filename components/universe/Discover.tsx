import Link from "next/link";
import InkSeam from "./InkSeam";
import {ArrowRight, BookOpen, Globe2, Paintbrush, Sprout, Users, Heart} from "lucide-react";
import "./discover.css";

const paths = [
  {title:"Stories", body:"Read, listen and create your own stories.", href:"/read/", icon:BookOpen, image:"stories"},
  {title:"Culture", body:"Meet people and explore life around the world.", href:"#workshops", icon:Globe2, image:"culture"},
  {title:"Creation", body:"Turn what you learn into art, games and projects.", href:"/teach/studio/?mode=young-creator", icon:Paintbrush, image:"creation"}
];

export default function Discover(){
  return <section id="discover" className="discover">
    <InkSeam/>
    <h2 className="sr-only">Course discovery</h2>
    <div className="discover-inner">
      <div className="discover-paths">{paths.map(({title,body,href,image,icon:Icon})=><Link key={title} href={href}><img src={`/discover/${image}.jpg`} alt="" loading="lazy"/><div><Icon size={22}/><h3>{title}</h3><p>{body}</p><ArrowRight size={16}/></div></Link>)}</div>
      <div className="discover-duo">
        <article id="meet-moli"><img alt="" loading="lazy" src="/moli-cutout.png"/><div><small>Meet Moli</small><h3>Your learning companion.</h3><p>Ask questions, practise new words and turn a story idea into a game.</p><Link href="/teach/studio/?mode=young-creator&panel=moli">Create with Moli →</Link></div><div className="discover-dialogue" aria-label="Example conversation"><span>Can we make a story in French about a cat?</span><span>Let’s try! Where does your cat’s adventure begin?</span></div></article>
        <article id="creators"><div><small>Young creators</small><h3>Teach what you love.</h3><p>Share your knowledge, interests and ideas with curious learners around the world.</p><Link href="/teach/">Become a Creator →</Link></div></article>
      </div>
      <section className="discover-mission"><div><small>Our mission</small><h3>Great teachers shouldn’t be a privilege.</h3></div><p>A child’s access to inspiring education should not depend on where they live or what their family can afford.</p><ul>{([{Icon:Sprout,name:"Accessible learning"},{Icon:Users,name:"Real educators"},{Icon:Heart,name:"Fair for creators"}]).map(({Icon,name})=><li key={name}><Icon size={23}/>{name}</li>)}</ul></section>
    </div>
  </section>
}
