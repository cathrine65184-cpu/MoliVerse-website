import type { Metadata } from "next";
import "./globals.css";
import LanguageProvider from "@/components/LanguageProvider";
const title = "MoliVerse — A Little Universe of Learning";
const description = "Learn languages, explore cultures and create stories with real teachers, young creators and Moli, your AI learning companion.";
export const metadata: Metadata = {metadataBase:new URL("https://moliverse.tech"),title,description,alternates:{canonical:"/"},openGraph:{title,description,siteName:"MoliVerse",type:"website",images:[{url:"/universe-valley.jpg",alt:"An illustrated hillside learning village"}]},twitter:{card:"summary_large_image",title,description,images:["/universe-valley.jpg"]}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="stylesheet" href="/page-seam.css"/></head><body style={{"--font-inter":"system-ui","--font-space-grotesk":"system-ui"} as React.CSSProperties} className="font-sans"><LanguageProvider>{children}</LanguageProvider></body></html>}
