'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStorySource } from '@/lib/storyPilot';
import StoryGameStudio from './StoryGameStudio';
import { usePilotStrings } from './usePilot';
import CreatorSpace from '@/components/creator/CreatorSpace';

// The legacy authoring/auth/AI component is never mounted in story-game mode.
const ImmersiveStudio = dynamic(() => import('@/components/immersive/ImmersiveStudio'), { ssr: false });
export default function StudioEntry() {
  const [storyId, setStoryId] = useState<string | null | undefined>(undefined);
  const [learner, setLearner] = useState(false);
  const t = usePilotStrings();
  useEffect(() => { const p = new URLSearchParams(window.location.search); setStoryId(p.get('story')); setLearner(p.has('handoff') || p.get('workspace') === 'learner'); }, []);
  if (storyId === undefined) return <main className="story-pilot"><p role="status">{t.building}</p></main>;
  if (storyId !== null) {
    const source = getStorySource(storyId);
    return source ? <StoryGameStudio source={source}/> : <main className="story-pilot" data-no-translate><h1>{t.invalid}</h1><Link href="/read/">{t.read}</Link></main>;
  }
  return learner ? <ImmersiveStudio/> : <CreatorSpace/>;
}
