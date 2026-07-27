import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhatIs from "@/components/WhatIs";
import HumanAI from "@/components/HumanAI";
import Workshops from "@/components/Workshops";
import Mission from "@/components/Mission";
import Waitlist from "@/components/Waitlist";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <WhatIs />
      <HumanAI />
      <Workshops />
      <Mission />
      <Waitlist />
      <Footer />
    </main>
  );
}
