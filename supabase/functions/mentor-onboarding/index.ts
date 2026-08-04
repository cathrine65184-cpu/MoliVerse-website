// Private, resumable educator Mentor creation.
// begin-upload returns a short-lived signed upload URL; complete verifies both
// assets, clones the adult educator's voice, and records a ready Mentor.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const minimax = Deno.env.get("MINIMAX_API_KEY");
  const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ message: "Sign in first." }, 401);
  const admin = createClient(url, service);
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "teacher") return json({ message: "Only educators can create a Mentor." }, 403);
  const body = await req.json();
  const action = String(body.action ?? "");

  if (action === "begin-upload") {
    const kind = body.kind === "photo" ? "photo" : "voice";
    const ext = String(body.extension ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const allowed = kind === "photo" ? ["jpg","jpeg","png","webp"] : ["mp3","m4a","wav"];
    if (!allowed.includes(ext)) return json({ message: `Unsupported ${kind} format.` }, 400);
    const path = `${user.id}/${kind}.${ext}`;
    const { data, error } = await admin.storage.from("mentor-assets").createSignedUploadUrl(path);
    if (error || !data) return json({ message: error?.message ?? "Could not prepare upload." }, 502);
    await admin.from("mentor_onboardings").upsert({ teacher_id: user.id, status: "uploading", updated_at: new Date().toISOString() }, { onConflict: "teacher_id" });
    return json({ path, token: data.token });
  }

  if (action !== "complete") return json({ message: "Unknown action." }, 400);
  if (!minimax) return json({ message: "Voice service is not configured." }, 503);
  if (body.consent !== true) return json({ message: "Adult voice-owner consent is required." }, 400);
  const photoPath = String(body.photoPath ?? "");
  const voicePath = String(body.voicePath ?? "");
  if (!photoPath.startsWith(`${user.id}/photo.`) || !voicePath.startsWith(`${user.id}/voice.`)) return json({ message: "Upload the Mentor photo and voice first." }, 400);
  await admin.from("mentor_onboardings").upsert({ teacher_id: user.id, status: "processing", photo_path: photoPath, voice_path: voicePath, error_message: null, updated_at: new Date().toISOString() }, { onConflict: "teacher_id" });
  try {
    const { data: voiceFile, error: voiceError } = await admin.storage.from("mentor-assets").download(voicePath);
    if (voiceError || !voiceFile) throw new Error("Voice sample was not found.");
    const upload = new FormData(); upload.append("purpose", "voice_clone"); upload.append("file", new File([await voiceFile.arrayBuffer()], voicePath.split("/").pop()!, { type: voiceFile.type }));
    const uploadResponse = await fetch("https://api.minimax.io/v1/files/upload", { method: "POST", headers: { Authorization: `Bearer ${minimax}` }, body: upload });
    const uploadJson = await uploadResponse.json(); const fileId = uploadJson?.file?.file_id;
    if (!fileId) throw new Error(uploadJson?.base_resp?.status_msg ?? "Voice upload was rejected.");
    const providerVoiceId = `Moli${user.id.replaceAll("-", "").slice(0, 18)}${Date.now()}`;
    const greeting = String(body.greeting ?? "Hello! I am your MoliVerse mentor. Let us learn together.").slice(0, 1000);
    const cloneResponse = await fetch("https://api.minimax.io/v1/voice_clone", { method: "POST", headers: { Authorization: `Bearer ${minimax}`, "Content-Type": "application/json" }, body: JSON.stringify({ file_id: fileId, voice_id: providerVoiceId, text: greeting, model: "speech-2.8-turbo", language_boost: body.language ?? "auto", need_noise_reduction: true, need_volume_normalization: true }) });
    const clone = await cloneResponse.json();
    if (!cloneResponse.ok || clone?.base_resp?.status_code !== 0) throw new Error(clone?.base_resp?.status_msg ?? "Voice cloning failed.");
    await admin.from("voice_identities").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("teacher_id", user.id).eq("status", "ready");
    const { data: identity, error: identityError } = await admin.from("voice_identities").insert({ teacher_id: user.id, provider: "minimax", provider_voice_id: providerVoiceId, language: body.language ?? "auto", status: "ready", consented_at: new Date().toISOString() }).select("id").single();
    if (identityError || !identity) throw new Error("Voice identity could not be saved.");
    const { data: photoFile, error: photoError } = await admin.storage.from("mentor-assets").download(photoPath);
    if (photoError || !photoFile) throw new Error("Mentor photo was not found.");
    const publicPhotoPath = `${user.id}/persona/portrait.${photoPath.split(".").pop()}`;
    const { error: copyError } = await admin.storage.from("media").upload(publicPhotoPath, photoFile, { upsert: true, contentType: photoFile.type });
    if (copyError) throw new Error("Mentor photo could not be published.");
    const publicPhotoUrl = admin.storage.from("media").getPublicUrl(publicPhotoPath).data.publicUrl;
    await admin.from("mentor_onboardings").upsert({ teacher_id: user.id, status: "ready", mentor_voice_id: identity.id, updated_at: new Date().toISOString() }, { onConflict: "teacher_id" });
    return json({ status: "ready", mentorVoiceId: identity.id, photoUrl: publicPhotoUrl, previewUrl: clone.demo_audio ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mentor creation failed.";
    await admin.from("mentor_onboardings").upsert({ teacher_id: user.id, status: "failed", error_message: message, updated_at: new Date().toISOString() }, { onConflict: "teacher_id" });
    return json({ message }, 502);
  }
});
