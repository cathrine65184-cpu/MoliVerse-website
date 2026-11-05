'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStorySource } from '@/lib/storyPilot';
import StoryGameStudio from './StoryGameStudio';
import { usePilotStrings } from './usePilot';

// The legacy authoring/auth/AI component is never mounted in story-game mode.
const ImmersiveStudio = dynamic(() => import('@/components/immersive/ImmersiveStudio'), { ssr: false });
export default function StudioEntry() {
  const [storyId, setStoryId] = useState<string | null | undefined>(undefined);
  const t = usePilotStrings();
  useEffect(() => { setStoryId(new URLSearchParams(window.location.search).get('story')); }, []);
  if (storyId === undefined) return <main className="story-pilot"><p role="status">{t.building}</p></main>;
  if (storyId !== null) {
    const source = getStorySource(storyId);
    return source ? <StoryGameStudio source={source}/> : <main className="story-pilot" data-no-translate><h1>{t.invalid}</h1><Link href="/read/">{t.read}</Link></main>;
  }
  return <ImmersiveStudio/>;
}
