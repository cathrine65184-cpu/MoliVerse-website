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
  title: "MoliVerse — Imagine. Create. Play.",
  description:
    "MoliVerse is an AI story-game maker where children and educators create immersive language worlds with Moli, then learn by playing what they imagined.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "MoliVerse — Imagine. Create. Play.",
    description:
      "Create immersive language story games with Moli, play inside them, and improve the world as you learn.",
    url: "https://moliverse.tech",
    siteName: "MoliVerse",
    type: "website",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "MoliVerse — Imagine. Create. Play.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MoliVerse — Imagine. Create. Play.",
    description:
      "Create immersive language story games with Moli, then learn by playing what you imagined.",
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
