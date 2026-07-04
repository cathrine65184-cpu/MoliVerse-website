# MoliVerse — Landing Page

Marketing site for **MoliVerse**, an AI-powered RPG language learning universe.

**Learn Languages. Live Stories.**

## Stack

- [Next.js 14](https://nextjs.org) (App Router) + React 18 + TypeScript
- [Tailwind CSS 3](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/) — entrance & scroll-reveal animations
- [Lucide React](https://lucide.dev) — icons
- Custom canvas starfield background (respects `prefers-reduced-motion`)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```bash
npm run build
npm start
```

The page is fully static — deploy to [Vercel](https://vercel.com) by importing the repo; no configuration needed.

## Structure

```
app/
  layout.tsx      # Fonts (Inter + Space Grotesk), metadata, global shell
  page.tsx        # Section composition
  globals.css     # Tailwind layers, glass-card / glow utilities
components/
  Navbar.tsx      # Fixed glass navbar
  Hero.tsx        # Headline, CTAs, cosmic background
  Starfield.tsx   # Animated canvas particles
  WhatIs.tsx      # Lessons→Stories / Exercises→Quests / Textbooks→Worlds
  HowItWorks.tsx  # Four feature cards
  Vision.tsx      # Vision statement
  Footer.tsx      # Brand + social links
  ui/
    Reveal.tsx          # Scroll-reveal motion wrapper
    SectionHeading.tsx  # Eyebrow + title block
```
