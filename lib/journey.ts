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

/**
 * A small set of editor-authored journeys ships with the product. Keeping
 * their exhibition metadata in source means a public course can be launched
 * atomically with its lesson, before an educator has opened Studio to save a
 * second copy to Storage.
 */
const featuredJourneyMeta: Record<string, JourneyMeta> = {
  "f15af2ba-b75e-4440-9a63-b5514d031aa9": {
    world: "Letter World",
    storyQuestion: "What are some things that are hard to say aloud, but easier to write?",
    ageRange: "6–12",
    humanMoment: "If a child shares a heavy feeling, Catherine pauses gently and asks a trusted grown-up to join the care.",
  },
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
  const featured = featuredJourneyMeta[courseId];
  try {
    const res = await fetch(`${publicUrl(uid, courseId)}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return featured ?? null;
    return { ...emptyJourneyMeta, ...featured, ...(await res.json()) } as JourneyMeta;
  } catch {
    return featured ?? null;
  }
}
