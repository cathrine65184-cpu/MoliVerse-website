import { supabase } from "./supabase";

/**
 * The human-authored layer of a learning journey. It deliberately lives beside
 * the existing course record so early creators can publish without waiting for
 * a database migration. The course remains the learning engine; this is the
 * meaning, context, and human boundary around it.
 */
export type JourneyMeta = {
  world: string;
  storyQuestion: string;
  ageRange: string;
  humanMoment: string;
};

export const emptyJourneyMeta: JourneyMeta = {
  world: "",
  storyQuestion: "",
  ageRange: "",
  humanMoment: "",
};

function path(uid: string, courseId: string) {
  return `${uid}/journeys/${courseId}.json`;
}

function publicUrl(uid: string, courseId: string) {
  return supabase.storage.from("media").getPublicUrl(path(uid, courseId)).data.publicUrl;
}

export async function saveJourneyMeta(uid: string, courseId: string, meta: JourneyMeta) {
  const body = new Blob([JSON.stringify(meta)], { type: "application/json" });
  const { error } = await supabase.storage.from("media").upload(path(uid, courseId), body, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw error;
}

export async function loadJourneyMeta(uid: string, courseId: string): Promise<JourneyMeta | null> {
  try {
    const res = await fetch(`${publicUrl(uid, courseId)}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return { ...emptyJourneyMeta, ...(await res.json()) } as JourneyMeta;
  } catch {
    return null;
  }
}
