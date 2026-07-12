import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Problem from "@/components/Problem";
import HumanAI from "@/components/HumanAI";
import CreatorEconomy from "@/components/CreatorEconomy";
import Subjects from "@/components/Subjects";
import Workshops from "@/components/Workshops";
import Vision from "@/components/Vision";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <Problem />
      <HumanAI />
      <CreatorEconomy />
      <Subjects />
      <Workshops />
      <Vision />
      <CTA />
      <Footer />
    </main>
  );
}
