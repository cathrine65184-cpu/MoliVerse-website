/**
 * Teacher digital-human persona.
 *
 * Stored in the teacher's own folder in the public `media` bucket at a
 * predictable path, so no database migration is needed: storage RLS already
 * lets a user write only into `{uid}/…`, and public read lets the lesson
 * player fetch it.
 */

import { supabase } from "./supabase";

/** One captured pose frame: flattened [x,y] pairs for the tracked joints. */
export type MotionFrame = number[];

/**
 * The audio identity is deliberately separate from a portrait or a character.
 * A teacher may change their visual world without losing the voice children
 * recognise. `voiceId` is a provider identifier, never an API key.
 */
export type VoiceIdentity = {
  provider: "minimax";
  /** Internal `voice_identities.id`; safe for the browser to reference. */
  mentorVoiceId: string | null;
  status: "empty" | "processing" | "ready" | "error";
  language: string;
  consentedAt: string | null;
  previewUrl: string | null;
};

export type Persona = {
  photoUrl: string | null;
  voiceUrl: string | null;
  voiceIdentity: VoiceIdentity;
  greeting: string;
  style: string;
  subject: string;
  /** The cultural place or theme the mentor invites children into. */
  world: string;
  /** The educator's distinctive way of creating learning experiences. */
  teachingApproach: string;
  /** The meaningful moment at which the human educator steps in. */
  humanMoment: string;
  /** Character the teacher becomes inside stories (prompt for parseTheme). */
  character: string;
  /** Short loop of the teacher's own captured movement, driving the character. */
  motion: MotionFrame[] | null;
  /** Real talking-head video generated from the portrait. */
  talkingUrl: string | null;
  updatedAt: string;
};

export const emptyPersona: Persona = {
  photoUrl: null,
  voiceUrl: null,
  voiceIdentity: {
    provider: "minimax",
    mentorVoiceId: null,
    status: "empty",
    language: "English",
    consentedAt: null,
    previewUrl: null,
  },
  greeting: "",
  style: "",
  subject: "",
  world: "",
  teachingApproach: "",
  humanMoment: "",
  character: "",
  motion: null,
  talkingUrl: null,
  updatedAt: "",
};

function publicUrl(path: string): string {
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

export function personaConfigUrl(uid: string): string {
  return publicUrl(`${uid}/persona/config.json`);
}

/** Load a teacher's saved persona (null when they haven't built one). */
export async function loadPersona(uid: string): Promise<Persona | null> {
  try {
    const res = await fetch(`${personaConfigUrl(uid)}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<Persona>;
    return { ...emptyPersona, ...data };
  } catch {
    return null;
  }
}

/** Save the persona config (overwrites). */
export async function savePersona(uid: string, persona: Persona): Promise<void> {
  const body = new Blob([JSON.stringify({ ...persona, updatedAt: new Date().toISOString() })], {
    type: "application/json",
  });
  const { error } = await supabase.storage
    .from("media")
    .upload(`${uid}/persona/config.json`, body, {
      upsert: true,
      contentType: "application/json",
    });
  if (error) throw error;
}

/** Upload a voice sample and return its public URL. */
export async function saveVoiceSample(uid: string, blob: Blob): Promise<string> {
  // MiniMax accepts MP3, M4A, or WAV for cloning. Preserve a user-uploaded
  // extension instead of incorrectly naming every file `.webm`.
  const sourceName = blob instanceof File ? blob.name : "voice.webm";
  const ext = (sourceName.split(".").pop() || "webm").toLowerCase();
  const path = `${uid}/persona/voice.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, blob, {
    upsert: true,
    contentType: blob.type || "audio/webm",
  });
  if (error) throw error;
  return publicUrl(path);
}

/** Upload a persona portrait and return its public URL. */
export async function savePersonaPhoto(uid: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${uid}/persona/portrait.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return publicUrl(path);
}
