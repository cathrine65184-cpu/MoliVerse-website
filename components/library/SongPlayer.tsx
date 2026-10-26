"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import type { LibraryContent } from "@/lib/contentLibrary";
import type { SavedContentProgress } from "./LibraryShell";
import ContentMoli from './ContentMoli';

function writeAscii(view: DataView, offset: number, value: string) { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); }
function melodyUrl() {
  const rate = 22050, duration = 9.6, frames = Math.floor(rate * duration), buffer = new ArrayBuffer(44 + frames * 2), view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF'); view.setUint32(4, 36 + frames * 2, true); writeAscii(view, 8, 'WAVEfmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeAscii(view, 36, 'data'); view.setUint32(40, frames * 2, true);
  const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23, 392, 523.25, 493.88, 392, 261.63, 293.66, 329.63, 261.63];
  for (let i = 0; i < frames; i++) { const t = i / rate, note = notes[Math.min(notes.length - 1, Math.floor(t / .6))], phase = (t % .6) / .6, envelope = Math.min(1, phase * 12) * Math.min(1, (1 - phase) * 8), sample = Math.sin(2 * Math.PI * note * t) * .22 * envelope; view.setInt16(44 + i * 2, sample * 32767, true); }
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

export default function SongPlayer({ content, progress, onProgress, onCreate }: { content: LibraryContent; progress: SavedContentProgress; onProgress: (value: SavedContentProgress) => void; onCreate: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null); const [url, setUrl] = useState(''); const [playing, setPlaying] = useState(false); const [time, setTime] = useState(progress.position || 0); const [translation, setTranslation] = useState(false); const [done, setDone] = useState<string[]>(progress.activity || []); const duration = content.audio?.duration || 0;
  useEffect(() => { if (!content.audio) return; const next = melodyUrl(); setUrl(next); return () => URL.revokeObjectURL(next); }, [content.id, content.audio]);
  useEffect(() => { setTime(progress.position || 0); setDone(progress.activity || []); if (audioRef.current) audioRef.current.currentTime = progress.position || 0; }, [progress.position, progress.activity]);
  useEffect(() => () => { audioRef.current?.pause(); }, []);
  const active = useMemo(() => content.lyrics?.findIndex(line => line.start !== undefined && line.end !== undefined && time >= line.start && time < line.end) ?? -1, [content.lyrics, time]);
  function toggle() { const audio = audioRef.current; if (!audio) return; if (audio.paused) void audio.play(); else audio.pause(); }
  function seek(value: number) { if (audioRef.current) audioRef.current.currentTime = value; setTime(value); onProgress({ ...progress, position: value, activity: done, updatedAt: new Date().toISOString() }); }
  function replay() { seek(0); if (audioRef.current) void audioRef.current.play(); }
  function toggleMove(id: string) { const next = done.includes(id) ? done.filter(item => item !== id) : [...done, id]; setDone(next); onProgress({ ...progress, position: time, completed: next.length === content.postActivity.items.length, activity: next, updatedAt: new Date().toISOString() }); }
  return <article className="song-shell"><header className="song-title"><div className="song-orb" style={{ background: `linear-gradient(145deg,${content.cover.from},${content.cover.to})` }}>{content.cover.emoji}</div><div><span className="demo-pill">Demo · Original sample</span><h1>{content.title}</h1><p>{content.language} · Ages {content.suggestedAgeRange} · {content.proficiencyLevel}</p><small>{content.audio?.label || 'No audio is available. Lyrics remain readable.'}</small></div></header>
    {content.audio && <section className="audio-player"><audio ref={audioRef} src={url} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={event => { const value = event.currentTarget.currentTime; setTime(value); onProgress({ ...progress, position: value, activity: done, updatedAt: new Date().toISOString() }); }} onEnded={() => setPlaying(false)}/><button onClick={toggle} aria-label={playing ? 'Pause melody' : 'Play melody'}>{playing ? <Pause/> : <Play/>}</button><input aria-label="Song position" type="range" min="0" max={duration} step=".1" value={Math.min(time, duration)} onChange={event => seek(Number(event.target.value))}/><span>{Math.floor(time)}s / {Math.ceil(duration)}s</span><button onClick={replay} aria-label="Replay melody"><RotateCcw/></button></section>}
    <section className="lyrics-card"><div className="lyrics-head"><div><span className="eyebrow">LISTEN</span><h2>Follow the action words</h2></div><button className="quiet-button" onClick={() => setTranslation(value => !value)}>{translation ? 'Hide translation' : 'Show translation'}</button></div>{content.lyrics?.map((line, index) => <div className={`lyric-line ${active === index ? 'active' : ''}`} key={line.id}><span>{index + 1}</span><div><p>{line.text}</p>{translation && <small>{line.translation}</small>}<em>{line.action}</em></div></div>)}<small className="timestamp-note">Lyric highlighting uses authored timestamps for this synthesized demo melody. It is not inferred from an external recording.</small></section>
    <ContentMoli content={content} segment={content.lyrics?.[active >= 0 ? active : 0]?.text || ''} segmentLabel={`lyric line ${active >= 0 ? active + 1 : 1}`} activity={content.postActivity.prompt}/>
    <section className="activity-card"><span className="eyebrow">MOVE</span><h2>{content.postActivity.title}</h2><p>{content.postActivity.prompt}</p><div className="move-grid">{content.postActivity.items.map(item => <button className={done.includes(item.id) ? 'done' : ''} key={item.id} onClick={() => toggleMove(item.id)}>{done.includes(item.id) ? <Check/> : <span/>}{item.label}</button>)}</div><p className={done.length === content.postActivity.items.length ? 'success' : ''}>{done.length} / {content.postActivity.items.length} movements completed</p>{done.length === content.postActivity.items.length && <button className="create-link" onClick={onCreate}><Sparkles/>Change a character and create</button>}</section>
    <footer className="source-note"><strong>Audio and rights</strong><p>The lyrics and synthesized melody are original MoliVerse demo material. There is no recorded singing voice, microphone capture or pronunciation score.</p></footer>
  </article>;
}
