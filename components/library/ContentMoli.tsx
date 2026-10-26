"use client";

import { useEffect, useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import type { LibraryContent } from '@/lib/contentLibrary';
import { getMyProfile, supabase } from '@/lib/supabase';

function localReply(content: LibraryContent, segmentLabel: string, request: string, segment: string) {
  const lower = request.toLowerCase();
  if (/simple|easier|简单|解释/.test(lower)) return `In simpler words: ${segment.split(/[.!?。！？]/)[0]}. I am using only ${segmentLabel}.`;
  if (/hint|clue|提示/.test(lower)) return content.contentType === 'read' ? `Look for one action or change in ${segmentLabel}. What happened first?` : `Listen for the action word in ${segmentLabel}, then show it with your body.`;
  if (/ending|character|结局|角色|改/.test(lower)) return `Keep one detail from ${segmentLabel}, then change one character, place or action. What would you like to change?`;
  return `Let’s stay with ${segmentLabel}. I can explain one word, give one small clue, or help you imagine a new detail.`;
}

export default function ContentMoli({ content, segment, segmentLabel, activity }: { content: LibraryContent; segment: string; segmentLabel: string; activity: string }) {
  const [signedIn, setSignedIn] = useState(false); const [input, setInput] = useState(''); const [reply, setReply] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { void getMyProfile().then(profile => setSignedIn(!!profile)).catch(() => setSignedIn(false)); }, []);
  async function ask(request: string) {
    if (!request.trim() || busy) return; setBusy(true); setReply('');
    if (!signedIn) { setReply(localReply(content, segmentLabel, request, segment)); setBusy(false); return; }
    try {
      const { data, error } = await supabase.functions.invoke('immersive-author', { body: { mode: 'content-companion', request, contentContext: { id: content.id, version: content.version, title: content.title, contentType: content.contentType, segment: segment.slice(0, 2400), segmentLabel, language: content.language, supportLanguage: content.supportLanguage, ageRange: content.suggestedAgeRange, level: content.proficiencyLevel || '', activity, rightsStatus: content.source.rightsStatus, demo: content.demo } } });
      if (error) throw error; setReply(data?.message || localReply(content, segmentLabel, request, segment));
    } catch { setReply(`${localReply(content, segmentLabel, request, segment)} The connected assistant is unavailable, so this is the on-device guide.`); }
    finally { setBusy(false); }
  }
  return <section className="content-moli"><div className="content-moli-title"><Sparkles/><div><strong>Ask Moli</strong><small>Short help from the current {content.contentType === 'read' ? 'page' : 'song line'} only.</small></div></div><div className="moli-chips"><button onClick={() => void ask('Explain this more simply.')}>Explain simply</button><button onClick={() => void ask('Give me one small clue.')}>One clue</button><button onClick={() => void ask(content.contentType === 'read' ? 'Help me imagine a new ending.' : 'Help me change one action.')}>{content.contentType === 'read' ? 'Imagine an ending' : 'Change an action'}</button></div><form onSubmit={event => { event.preventDefault(); const value = input; setInput(''); void ask(value); }}><input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask about this moment…"/><button disabled={busy || !input.trim()} aria-label="Ask Moli">{busy ? <Loader2 className="spin"/> : <Send/>}</button></form>{reply && <div className="moli-reply"><strong>Moli</strong><p>{reply}</p><small>Source: {segmentLabel}. Moli has not read beyond the context shown here.</small></div>}</section>;
}
