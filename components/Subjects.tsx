import {
  Languages,
  FlaskConical,
  Palette,
  Landmark,
  Code2,
  Newspaper,
  PenTool,
  Brain,
  Sprout,
  Rocket,
} from "lucide-react";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

const subjects = [
  { icon: Languages, label: "Languages" },
  { icon: FlaskConical, label: "Science" },
  { icon: Palette, label: "Arts" },
  { icon: Landmark, label: "History" },
  { icon: Code2, label: "Coding" },
  { icon: Newspaper, label: "Media Literacy" },
  { icon: PenTool, label: "Creative Writing" },
  { icon: Brain, label: "Critical Thinking" },
  { icon: Sprout, label: "Life Skills" },
  { icon: Rocket, label: "Future-Ready Skills" },
];

export default function Subjects() {
  return (
    <section id="subjects" className="relative scroll-mt-24 px-6 py-28 sm:py-32">
      <div className="mx-auto max-w-4xl">
        <SectionHeading eyebrow="Subjects" title="It started with languages. It won't stop there." />

        <Reveal delay={0.15} className="mt-12 flex flex-wrap justify-center gap-3">
          <>
            {subjects.map((subject) => (
              <span
                key={subject.label}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition-all duration-300 hover:border-violet-400/40 hover:text-white"
              >
                <subject.icon className="h-4 w-4 text-violet-300" strokeWidth={1.8} />
                {subject.label}
              </span>
            ))}
          </>
        </Reveal>
      </div>
    </section>
  );
}
