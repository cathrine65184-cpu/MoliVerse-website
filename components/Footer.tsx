import Image from "next/image";
import { Heart, Mail } from "lucide-react";
import { withBasePath } from "@/lib/paths";

const socials = [
  { icon: Heart, label: "For Families", href: "/families/" },
  { icon: Mail, label: "Contact", href: "mailto:cathrine65184@gmail.com" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-white/20">
              <Image
                src={withBasePath("/mascot.png")}
                alt="MoliVerse mascot"
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            </span>
            <span className="font-display text-base font-semibold text-white">
              MoliVerse
            </span>
          </div>
          <p className="text-sm text-slate-500">Language · Culture · Story · Human connection</p>
        </div>

        <div className="flex items-center gap-3">
          {socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target={social.href.startsWith("http") ? "_blank" : undefined}
              rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}
              aria-label={social.label}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 transition-all hover:border-white/20 hover:text-white"
            >
              <social.icon className="h-4 w-4" />
            </a>
          ))}
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} MoliVerse. Crafted for explorers of language and worlds.
      </p>
    </footer>
  );
}
