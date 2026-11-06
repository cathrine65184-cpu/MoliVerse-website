import { InkBreak } from '@/components/universe/InkSeam';
import Link from "next/link";
import HumanAI from "@/components/HumanAI";
import Workshops from "@/components/Workshops";
import {Shell,Banner} from "@/components/universe/Shell";

import Discover from "@/components/universe/Discover";

export default function Home(){
  return <Shell><Banner living label="THE MOLIVERSE FIELD GUIDE" title="A Little Universe of Learning"><p>Learn languages, explore cultures, create stories, and grow with real teachers, young creators and AI companions.</p><div className="un-actions"><Link href="/explore/">Explore courses →</Link><Link href="/teach/">Join as a creator</Link></div></Banner>
  <Discover/>
  <HumanAI/><InkBreak/><Workshops/></Shell>;

}
