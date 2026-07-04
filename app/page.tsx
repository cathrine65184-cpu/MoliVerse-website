import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhatIs from "@/components/WhatIs";
import HowItWorks from "@/components/HowItWorks";
import Workshops from "@/components/Workshops";
import Vision from "@/components/Vision";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <WhatIs />
      <HowItWorks />
      <Workshops />
      <Vision />
      <Footer />
    </main>
  );
}
