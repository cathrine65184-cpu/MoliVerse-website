// MoliVerse Mentor creation — HeyGen photo avatar with a temporary HeyGen voice.
//
// A real educator can become visible to children from one authorised photo.
// Their own voice is deliberately an optional later layer: this first version
// uses the default voice assigned by HeyGen to the photo avatar, and labels it
// as such in the product. Source photos stay in the private mentor-assets bucket.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

function errorMessage(payload: unknown, fallback: string) {
  const data = payload as { error?: { message?: string; code?: string } | string; message?: string; data?: { error?: { message?: string; code?: string } } } | null;
  const nested = data?.data?.error;
  const error = typeof data?.error === "object" ? data.error : nested;
  const message = error?.message ?? data?.message ?? (typeof data?.error === "string" ? data.error : null);
  const code = error?.code ? ` (${error.code})` : "";
  return message ? `${message}${code}` : fallback;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ message: "Method not allowed." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const heygen = Deno.env.get("HEYGEN_KEY");
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ message: "Sign in first." }, 401);

  const admin = createClient(url, service);
  const { data: profile } = await admin.from("profiles").select("role,name").eq("id", user.id).single();
  if (profile?.role !== "teacher") return json({ message: "Only educators can create a Mentor." }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ message: "Invalid request." }, 400); }
  const action = String(body.action ?? "");

  if (action === "begin-upload") {
    if (body.kind !== "photo") return json({ message: "Only a Mentor photo is needed for this HeyGen setup." }, 400);
    const ext = String(body.extension ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!["jpg", "jpeg", "png"].includes(ext)) return json({ message: "Use a JPG or PNG Mentor photo." }, 400);
    // A creator can safely retry with the same filename. New objects avoid
    // Storage's 409 ResourceAlreadyExists response and prevent CDN staleness.
    const path = `${user.id}/photo-${crypto.randomUUID()}.${ext}`;
    const { data, error } = await admin.storage.from("mentor-assets").createSignedUploadUrl(path);
    if (error || !data) return json({ message: error?.message ?? "Could not prepare a private upload." }, 502);
    await admin.from("mentor_onboardings").upsert(
      { teacher_id: user.id, status: "uploading", updated_at: new Date().toISOString() },
      { onConflict: "teacher_id" },
    );
    return json({ path, token: data.token });
  }

  if (!heygen) return json({ message: "HeyGen is not configured yet." }, 503);

  if (action === "complete") {
    if (body.consent !== true) return json({ message: "Please confirm that you own this photo or have the adult's permission to use it." }, 400);
    const photoPath = String(body.photoPath ?? "");
    if (!photoPath.startsWith(`${user.id}/photo-`)) return json({ message: "Upload your Mentor photo first." }, 400);
    const greeting = String(body.greeting ?? "Hello! I am your MoliVerse mentor. Let us learn together.").trim().slice(0, 1000);
    if (!greeting) return json({ message: "Add a short welcome message." }, 400);

    await admin.from("mentor_onboardings").upsert({
      teacher_id: user.id, status: "processing", photo_path: photoPath, error_message: null, updated_at: new Date().toISOString(),
    }, { onConflict: "teacher_id" });

    try {
      // Transfer the private source file directly to HeyGen as an asset. This
      // avoids depending on an external service fetching a short-lived URL.
      const { data: photoFile, error: photoError } = await admin.storage.from("mentor-assets").download(photoPath);
      if (photoError || !photoFile) throw new Error("Mentor photo was not found after upload.");
      const filename = photoPath.split("/").pop() ?? "mentor.jpg";
      const assetForm = new FormData();
      assetForm.append("file", new File([await photoFile.arrayBuffer()], filename, { type: photoFile.type || "image/jpeg" }));
      const assetResponse = await fetch("https://api.heygen.com/v3/assets", {
        method: "POST",
        headers: { "x-api-key": heygen },
        body: assetForm,
      });
      const assetJson = await assetResponse.json();
      const assetId = assetJson?.data?.id ?? assetJson?.data?.asset_id;
      if (!assetResponse.ok || !assetId) throw new Error(`HeyGen could not receive the photo: ${errorMessage(assetJson, `HTTP ${assetResponse.status}`)}`);

      const avatarResponse = await fetch("https://api.heygen.com/v3/avatars", {
        method: "POST",
        headers: { "x-api-key": heygen, "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "photo",
          name: `${profile.name || "MoliVerse"} — MoliVerse Mentor`,
          file: { type: "asset_id", asset_id: assetId },
        }),
      });
      const avatarJson = await avatarResponse.json();
      const avatar = avatarJson?.data?.avatar_item;
      const avatarId = avatar?.id;
      if (!avatarResponse.ok || !avatarId) throw new Error(`HeyGen could not create this photo Mentor: ${errorMessage(avatarJson, `HTTP ${avatarResponse.status}`)}`);

      // The Avatar is the Mentor. Persist it before asking HeyGen for the
      // optional welcome video: a render failure must never lock an educator
      // out of Story Stage after their photo avatar has been created.
      const publicPhotoPath = `${user.id}/persona/portrait.${photoPath.split(".").pop()}`;
      const { error: copyError } = await admin.storage.from("media").upload(publicPhotoPath, photoFile, {
        upsert: true,
        contentType: photoFile.type || "image/jpeg",
      });
      if (copyError) throw new Error("Mentor photo could not be published.");
      const photoUrl = admin.storage.from("media").getPublicUrl(publicPhotoPath).data.publicUrl;

      await admin.from("mentor_onboardings").upsert({
        teacher_id: user.id,
        status: "ready",
        heygen_avatar_id: avatarId,
        heygen_voice_id: null,
        heygen_video_id: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "teacher_id" });

      // Never attach a platform-default voice to a real educator's face.
      // Visual identity is ready now; voice and live rendering are connected
      // only after the educator approves a matched voice identity.
      return json({
        status: "ready",
        photoUrl,
        avatarId,
        videoId: null,
        voice: null,
        warning: "Visual identity ready. Continue to Studio to verify your own voice before opening a live classroom.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mentor creation failed.";
      await admin.from("mentor_onboardings").upsert({ teacher_id: user.id, status: "failed", error_message: message, updated_at: new Date().toISOString() }, { onConflict: "teacher_id" });
      return json({ message }, 502);
    }
  }

  if (action === "status") {
    const videoId = String(body.videoId ?? "");
    const { data: onboarding } = await admin.from("mentor_onboardings")
      .select("heygen_video_id,status")
      .eq("teacher_id", user.id)
      .single();
    if (!videoId || onboarding?.heygen_video_id !== videoId) return json({ message: "That video does not belong to your Mentor." }, 403);

    const response = await fetch(`https://api.heygen.com/v3/videos/${encodeURIComponent(videoId)}`, {
      headers: { "x-api-key": heygen },
    });
    const result = await response.json();
    const video = result?.data;
    if (!response.ok) return json({ message: errorMessage(result, "Could not check HeyGen video status.") }, 502);
    if (video?.status === "failed") {
      const message = video.failure_message ?? "HeyGen could not render the welcome video.";
      // A video is optional; the photo Avatar remains a ready Mentor.
      await admin.from("mentor_onboardings").update({ status: "ready", error_message: message, updated_at: new Date().toISOString() }).eq("teacher_id", user.id);
      return json({ status: "failed", message }, 502);
    }
    if (video?.status !== "completed" || !video.video_url) return json({ status: video?.status ?? "processing" });

    const mp4 = await fetch(video.video_url);
    if (!mp4.ok) return json({ message: "HeyGen completed the video but it could not be saved yet." }, 502);
    const { error: saveError } = await admin.storage.from("media").upload(
      `${user.id}/persona/talking.mp4`,
      new Uint8Array(await mp4.arrayBuffer()),
      { upsert: true, contentType: "video/mp4" },
    );
    const videoUrl = saveError
      ? video.video_url
      : admin.storage.from("media").getPublicUrl(`${user.id}/persona/talking.mp4`).data.publicUrl;
    await admin.from("mentor_onboardings").update({ status: "ready", error_message: null, updated_at: new Date().toISOString() }).eq("teacher_id", user.id);
    return json({ status: "completed", videoUrl, voice: "heygen-default" });
  }

  return json({ message: "Unknown action." }, 400);
});
