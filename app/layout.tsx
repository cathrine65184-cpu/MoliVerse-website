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
  title: "MoliVerse — Every Child Deserves a Great Teacher",
  description:
    "MoliVerse is a global AI education platform where educators create AI versions of themselves — making quality education accessible, affordable and available everywhere.",
  openGraph: {
    title: "MoliVerse — Every Child Deserves a Great Teacher",
    description:
      "A global AI education platform: educators create AI mentors with their personality and expertise, and learners anywhere can afford to learn from them.",
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
