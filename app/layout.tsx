import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import LanguageProvider from "@/components/LanguageProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://moliverse.tech"),
  title: "MoliVerse — Learn Languages. Live Stories.",
  description:
    "MoliVerse is an AI-powered RPG language universe where teachers worldwide create digital twins and story-quest courses, making human-guided language learning affordable for every child.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "MoliVerse — Learn Languages. Live Stories.",
    description:
      "A creator platform where real teachers build AI digital twins and immersive story-quests — human-guided language learning that every family can afford.",
    url: "https://moliverse.tech",
    siteName: "MoliVerse",
    type: "website",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "MoliVerse — Learn Languages. Live Stories.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MoliVerse — Learn Languages. Live Stories.",
    description:
      "A global AI education platform where educators create AI mentors — making quality education accessible and affordable for every child.",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans"><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  );
}
