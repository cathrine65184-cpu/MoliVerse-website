import Image from "next/image";
import { withBasePath } from "@/lib/paths";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

const workshops = [
  {
    image: "/workshops/spanish-football.jpg",
    flag: "🇪🇸",
    language: "Spanish",
    title: "Starry Football Kingdom",
    description:
      "¡Bienvenido! Kids kick off their Spanish adventure on a magical football pitch under the stars.",
  },
  {
    image: "/workshops/french-lechat.jpg",
    flag: "🇫🇷",
    language: "French",
    title: "Little Animal Atelier",
    description:
      "Le chat, le lapin — young artists draw their own animal friends and give them French names.",
  },
  {
    image: "/workshops/german-greetings.jpg",
    flag: "🇩🇪",
    language: "German",
    title: "Hou Yi's Sun Quest",
    description:
      "Ich heiße… — first introductions beneath the nine suns of a Chinese legend retold over Cologne.",
  },
  {
    image: "/workshops/german-numbers.jpg",
    flag: "🇩🇪",
    language: "German",
    title: "Counting the Nine Suns",
    description:
      "vier, fünf, sechs — counting blazing suns above Munich's old town before Hou Yi shoots them down.",
  },
];

export default function Workshops() {
  return (
    <section id="workshops" className="relative scroll-mt-24 overflow-hidden px-6 py-28 sm:py-36">
      <div className="pointer-events-none absolute left-[15%] top-0 h-[30rem] w-[30rem] rounded-full bg-cyan-500/[0.07] blur-[120px]" />

      <div className="relative mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="Live Workshops"
          title="The universe is already open for young explorers."
        />

        <Reveal delay={0.1} className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-base leading-relaxed text-slate-400 sm:text-lg">
            While we build MoliVerse, our team already runs live story-driven
            workshops where children learn Spanish, French, and German inside
            imaginary worlds — football kingdoms, animal ateliers, and ancient
            legends reimagined across European cities. Every scene below is a
            real class.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {workshops.map((workshop, i) => (
            <Reveal key={workshop.title} delay={0.1 + i * 0.08}>
              <div className="glass-card group h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
                <div className="relative overflow-hidden">
                  <Image
                    src={withBasePath(workshop.image)}
                    alt={`${workshop.language} workshop — ${workshop.title}`}
                    width={1400}
                    height={645}
                    className="w-full transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-void/70 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-md">
                    {workshop.flag} {workshop.language}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-lg font-semibold text-white">
                    {workshop.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {workshop.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
