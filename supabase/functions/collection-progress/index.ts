import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://moliverse.tech",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await req.json().catch(() => ({}));
  const explorerId = String(body.explorerId ?? "");
  const collectionId = String(body.collectionId ?? "");
  if (!explorerId || !collectionId) return json({ error: "Missing learning context" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: explorer } = await admin.from("explorers").select("status").eq("id", explorerId).maybeSingle();
  if (explorer?.status !== "active") return json({ error: "A guardian must activate this Explorer first." }, 403);

  const { data: lessons } = await admin.from("collection_lessons").select("course_id,position").eq("collection_id", collectionId).order("position");
  if (!lessons?.length) return json({ error: "Collection not found" }, 404);
  const { data: row } = await admin.from("explorer_collection_progress").select("completed_course_ids,next_position").eq("explorer_id", explorerId).eq("collection_id", collectionId).maybeSingle();
  const completed = Array.isArray(row?.completed_course_ids) ? row.completed_course_ids.map(String) : [];
  const current = { completedCourseIds: completed, nextPosition: row?.next_position ?? 1 };
  if (body.action === "get") return json(current);
  if (body.action !== "complete") return json({ error: "Unknown action" }, 400);

  const courseId = String(body.courseId ?? "");
  const lesson = lessons.find((item) => item.course_id === courseId);
  if (!lesson) return json({ error: "Lesson does not belong to this collection" }, 403);
  if (lesson.position > current.nextPosition && !completed.includes(courseId)) return json({ error: "Finish the current lesson before unlocking the next one." }, 403);

  const nextCompleted = completed.includes(courseId) ? completed : [...completed, courseId];
  const nextPosition = Math.min(lessons.length + 1, Math.max(current.nextPosition, lesson.position + 1));
  const { error } = await admin.from("explorer_collection_progress").upsert({
    explorer_id: explorerId, collection_id: collectionId, completed_course_ids: nextCompleted, next_position: nextPosition, updated_at: new Date().toISOString(),
  }, { onConflict: "explorer_id,collection_id" });
  if (error) return json({ error: "Could not save progress" }, 500);
  return json({ completedCourseIds: nextCompleted, nextPosition });
});
