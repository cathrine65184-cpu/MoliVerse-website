import { createClient } from "@supabase/supabase-js";

// The anon key is designed to be public — access control lives in
// Postgres Row Level Security policies on the server.
export const supabase = createClient(
  "https://fiycuwnimmhnxnaiwvud.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpeWN1d25pbW1obnhuYWl3dnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMDAzNjcsImV4cCI6MjA5OTg3NjM2N30.hstmt3LX4u_r7u0e9zs26k5wC7kEs9lJ-zfJydQh5ZY"
);

export type Profile = {
  id: string;
  role: "student" | "teacher";
  name: string;
  bio: string;
  language: string;
  avatar_url: string | null;
  verified?: boolean;
};

export type ReportTarget = "message" | "conversation" | "course" | "user";

/** Report a piece of content or a user for review. */
export async function fileReport(
  reporterId: string,
  targetType: ReportTarget,
  targetId: string | null,
  reason: string,
  detail = ""
) {
  return supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
    detail,
  });
}

/** Block another user (blocker stops seeing / messaging blocked). */
export async function blockUser(blockerId: string, blockedId: string) {
  return supabase
    .from("blocks")
    .upsert(
      { blocker_id: blockerId, blocked_id: blockedId },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true }
    );
}

export async function unblockUser(blockerId: string, blockedId: string) {
  return supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
}

/** All user ids that are blocked in either direction relative to me. */
export async function loadBlockedIds(myId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${myId},blocked_id.eq.${myId}`);
  const set = new Set<string>();
  for (const b of (data as { blocker_id: string; blocked_id: string }[]) ?? []) {
    set.add(b.blocker_id === myId ? b.blocked_id : b.blocker_id);
  }
  return set;
}

export type Course = {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  language: string;
  cover_url: string | null;
  created_at: string;
  profiles?: Profile;
  course_files?: CourseFile[];
  likes?: { student_id: string }[];
};

export type CourseFile = {
  id: string;
  course_id: string;
  kind: "image" | "audio" | "video" | "doc";
  name: string;
  url: string;
};

export type Conversation = {
  id: string;
  student_id: string;
  teacher_id: string;
  student?: Profile;
  teacher?: Profile;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export async function getMyProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single();
  return (data as Profile) ?? null;
}

export function fileKind(file: File): CourseFile["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return "doc";
}

export async function uploadToMedia(uid: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${uid}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from("media").upload(path, file);
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
