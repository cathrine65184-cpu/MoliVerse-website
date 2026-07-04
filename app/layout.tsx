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
  title: "MoliVerse — Learn Languages. Live Stories.",
  description:
    "MoliVerse is an AI-powered RPG where language learning becomes an immersive adventure through intelligent characters, interactive storytelling, and limitless worlds.",
  openGraph: {
    title: "MoliVerse — Learn Languages. Live Stories.",
    description:
      "An AI-powered RPG language learning universe. Explore worlds, talk to intelligent characters, and acquire languages by living stories.",
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
