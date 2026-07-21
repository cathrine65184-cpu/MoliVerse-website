import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

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
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
