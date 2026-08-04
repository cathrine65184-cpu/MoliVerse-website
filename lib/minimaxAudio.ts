import { supabase } from "./supabase";

type TalkOptions = {
  text: string;
  mentorVoiceId: string;
  language?: string;
  speed?: number;
  courseId?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
};

function bytesFromBase64(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Consumes MoliVerse's NDJSON audio relay. The browser receives only MP3
 * chunks; the MiniMax secret and provider voice ID remain server-side.
 */
export async function playMiniMaxStream(options: TalkOptions): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Please sign in to use a Mentor voice.");

  const response = await fetch("https://fiycuwnimmhnxnaiwvud.supabase.co/functions/v1/minimax-audio-stream/talk", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpeWN1d25pbW1obnhuYWl3dnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMDAzNjcsImV4cCI6MjA5OTg3NjM2N30.hstmt3LX4u_r7u0e9zs26k5wC7kEs9lJ-zfJydQh5ZY",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: options.text.slice(0, 2000),
      mentorVoiceId: options.mentorVoiceId,
      courseId: options.courseId,
      language: options.language ?? "auto",
      speed: options.speed ?? 0.94,
    }),
  });
  if (!response.ok || !response.body) throw new Error("Mentor audio could not start.");

  const audio = new Audio();
  const supportsMse = "MediaSource" in window && MediaSource.isTypeSupported("audio/mpeg");
  const chunks: Uint8Array[] = [];
  let mediaSource: MediaSource | null = null;
  let sourceBuffer: SourceBuffer | null = null;
  let started = false;
  let streamEnded = false;

  const appendNext = () => {
    if (!sourceBuffer || sourceBuffer.updating || chunks.length === 0) {
      if (streamEnded && sourceBuffer && !sourceBuffer.updating && mediaSource?.readyState === "open") mediaSource.endOfStream();
      return;
    }
    const next = chunks.shift()!;
    // Copy into a regular ArrayBuffer: TypeScript otherwise permits a
    // SharedArrayBuffer-backed view, which MediaSource does not accept.
    sourceBuffer.appendBuffer(new Uint8Array(next).buffer as ArrayBuffer);
  };

  if (supportsMse) {
    mediaSource = new MediaSource();
    audio.src = URL.createObjectURL(mediaSource);
    await new Promise<void>((resolve) => mediaSource!.addEventListener("sourceopen", () => resolve(), { once: true }));
    sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
    sourceBuffer.addEventListener("updateend", appendNext);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const message = JSON.parse(line) as { event?: string; audio?: string; message?: string };
        if (message.event === "audio" && message.audio) {
          const chunk = bytesFromBase64(message.audio);
          if (supportsMse) {
            chunks.push(chunk);
            appendNext();
            if (!started) {
              started = true;
              await audio.play();
              options.onStart?.();
            }
          } else {
            chunks.push(chunk);
          }
        }
        if (message.event === "error") throw new Error(message.message || "Mentor audio failed.");
      }
    }
    if (!supportsMse && chunks.length) {
      const blob = new Blob(chunks.map((chunk) => new Uint8Array(chunk).buffer as ArrayBuffer), { type: "audio/mpeg" });
      audio.src = URL.createObjectURL(blob);
      started = true;
      await audio.play();
      options.onStart?.();
    }
    streamEnded = true;
    appendNext();
    audio.onended = () => options.onEnd?.();
  } catch (error) {
    audio.pause();
    options.onError?.();
    throw error;
  }
}
