// MoliVerse — generate-avatar edge function.
//
// Turns a teacher's portrait into a real talking-head video via HeyGen.
// The HeyGen key stays here as a Supabase secret and never reaches the
// browser. The caller is identified from their JWT, so a teacher can only
// write into their own storage folder.
//
//   POST { action: "create", text, voiceId? }  -> { videoId }
//   POST { action: "status", videoId }         -> { status, videoUrl? }
//
// On completion the finished MP4 is copied into the teacher's own folder
// in the public `media` bucket (HeyGen's own URLs expire).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const DEFAULT_VOICE = "42d00d4aac5441279d8536cd6b52c53c"; // Hope · English female

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const heygenKey = Deno.env.get("HEYGEN_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!heygenKey) return json({ error: "server not configured" }, 500);

  // Identify the caller from their JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await asUser.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }

  const hg = (path: string, init?: RequestInit) =>
    fetch(`https://api.heygen.com${path}`, {
      ...init,
      headers: { "X-Api-Key": heygenKey, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });

  try {
    /* ---------------- create ---------------- */
    if (body.action === "create") {
      const text = (body.text ?? "").trim();
      if (!text) return json({ error: "missing text" }, 400);
      if (text.length > 600) return json({ error: "text too long" }, 400);

      // The teacher's portrait, saved by the studio
      const admin = createClient(supabaseUrl, serviceKey);
      const portraitPath = `${user.id}/persona/portrait.jpg`;
      const { data: file, error: dlErr } = await admin.storage
        .from("media")
        .download(portraitPath);
      if (dlErr || !file) {
        return json({ error: "no_portrait", message: "请先在工作室上传一张照片" }, 400);
      }

      // Register the photo with HeyGen (talking photo)
      const upRes = await fetch("https://upload.heygen.com/v1/talking_photo", {
        method: "POST",
        headers: { "X-Api-Key": heygenKey, "Content-Type": "image/jpeg" },
        body: new Uint8Array(await file.arrayBuffer()),
      });
      const upJson = await upRes.json();
      const talkingPhotoId = upJson?.data?.talking_photo_id;
      if (!talkingPhotoId) return json({ error: "upload_failed", detail: upJson }, 502);

      const genRes = await hg("/v2/video/generate", {
        method: "POST",
        body: JSON.stringify({
          video_inputs: [{
            character: {
              type: "talking_photo",
              talking_photo_id: talkingPhotoId,
              talking_photo_style: "square",
              scale: 1.0,
            },
            voice: {
              type: "text",
              input_text: text,
              voice_id: body.voiceId || DEFAULT_VOICE,
              speed: 0.95,
            },
          }],
          dimension: { width: 720, height: 720 },
        }),
      });
      const genJson = await genRes.json();
      const videoId = genJson?.data?.video_id;
      if (!videoId) return json({ error: "generate_failed", detail: genJson }, 502);
      return json({ videoId });
    }

    /* ---------------- status ---------------- */
    if (body.action === "status") {
      const videoId = body.videoId;
      if (!videoId) return json({ error: "missing videoId" }, 400);

      const stRes = await hg(`/v1/video_status.get?video_id=${videoId}`);
      const stJson = await stRes.json();
      const data = stJson?.data ?? {};
      const status = data.status;

      if (status !== "completed") {
        return json({ status: status ?? "unknown", error: data.error ?? null });
      }

      // Copy the finished video into the teacher's own folder
      const admin = createClient(supabaseUrl, serviceKey);
      const mp4 = await fetch(data.video_url);
      const bytes = new Uint8Array(await mp4.arrayBuffer());
      const path = `${user.id}/persona/talking.mp4`;
      const { error: upErr } = await admin.storage
        .from("media")
        .upload(path, bytes, { upsert: true, contentType: "video/mp4" });
      if (upErr) return json({ status: "completed", videoUrl: data.video_url, stored: false });

      const publicUrl = admin.storage.from("media").getPublicUrl(path).data.publicUrl;
      return json({ status: "completed", videoUrl: publicUrl, stored: true, duration: data.duration });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
