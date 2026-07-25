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

export type Persona = {
  photoUrl: string | null;
  voiceUrl: string | null;
  greeting: string;
  style: string;
  subject: string;
  /** Character the teacher becomes inside stories (prompt for parseTheme). */
  character: string;
  /** Short loop of the teacher's own captured movement, driving the character. */
  motion: MotionFrame[] | null;
  updatedAt: string;
};

export const emptyPersona: Persona = {
  photoUrl: null,
  voiceUrl: null,
  greeting: "",
  style: "",
  subject: "",
  character: "",
  motion: null,
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
  const path = `${uid}/persona/voice.webm`;
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
