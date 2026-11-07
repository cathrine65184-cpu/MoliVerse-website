import Link from 'next/link';
import { withBasePath } from '@/lib/paths';

export default function FruitFriendsCourse() {
  return <main className="min-h-screen bg-[#fffaf0] text-[#284936]">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e0d3] px-4 py-3 sm:px-8">
      <Link href="/explore/" className="rounded-xl px-3 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#427856]">← Course Plaza</Link>
      <div className="text-right"><h1 className="font-serif text-xl font-semibold">Fruit Friends English</h1><p className="text-xs">Interactive English · ages 9–12</p></div>
    </header>
    <p className="mx-auto max-w-5xl px-4 py-2 text-center text-xs text-[#58715f]">Educator-provided course · Opens in a protected frame. Progress inside this course is not connected to your MoliVerse account.</p>
    <iframe title="Fruit Friends English interactive course" src={withBasePath('/courses/fruit-friends-english.html')} sandbox="allow-scripts" referrerPolicy="no-referrer" className="block h-[calc(100dvh-8rem)] min-h-[620px] w-full border-0" />
  </main>;
}
