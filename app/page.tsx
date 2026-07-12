import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhatIs from "@/components/WhatIs";
import HowItWorks from "@/components/HowItWorks";
import HumanAI from "@/components/HumanAI";
import Workshops from "@/components/Workshops";
import Mission from "@/components/Mission";
import Vision from "@/components/Vision";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <WhatIs />
      <HowItWorks />
      <HumanAI />
      <Workshops />
      <Mission />
      <Vision />
      <Footer />
    </main>
  );
}
