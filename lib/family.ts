import { supabase } from "./supabase";

export type Explorer = {
  id: string;
  nickname: string;
  age_band: string;
  target_language: string;
  status: "pending" | "active" | "revoked";
  guardian_id?: string | null;
  created_at: string;
};

export type GuardianPreferences = {
  explorer_id: string;
  ai_mentor_enabled: boolean;
  save_memories: boolean;
  voice_input_enabled: boolean;
  educator_response_enabled: boolean;
  weekly_digest_enabled: boolean;
};

export type ExplorerAccess = {
  status: Explorer["status"];
  preferences: Pick<GuardianPreferences, "ai_mentor_enabled" | "save_memories" | "voice_input_enabled" | "educator_response_enabled"> | null;
};

const EXPLORER_KEY = "moliverse-active-explorer";
const JOURNEY_KEY = "moliverse-pending-journey";

export function rememberExplorer(id: string, journey?: string | null) {
  localStorage.setItem(EXPLORER_KEY, id);
  if (journey) localStorage.setItem(JOURNEY_KEY, journey);
}

export function activeExplorerId() {
  return typeof window === "undefined" ? null : localStorage.getItem(EXPLORER_KEY);
}

export function pendingJourneyId() {
  return typeof window === "undefined" ? null : localStorage.getItem(JOURNEY_KEY);
}

export function clearPendingJourney() {
  if (typeof window !== "undefined") localStorage.removeItem(JOURNEY_KEY);
}

export async function startGuardianActivation(input: {
  nickname: string;
  ageBand: string;
  targetLanguage: string;
  guardianEmail: string;
  origin: string;
}) {
  return supabase.functions.invoke("guardian-activation", {
    body: { action: "start", ...input },
  });
}

export async function checkExplorerAccess(explorerId: string) {
  const { data, error } = await supabase.functions.invoke("guardian-activation", {
    body: { action: "status", explorerId },
  });
  return { data: data as ExplorerAccess | null, error };
}
