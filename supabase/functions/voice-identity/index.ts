// MoliVerse — educator voice identity.
//
// This function is the only place a MiniMax secret is used. It creates an
// educator-owned clone and synthesises previews; browsers only ever receive a
// short-lived audio URL / a provider voice ID, never a key.
//
// POST { action: "clone", audioUrl, language, consent, previewText }
// POST { action: "speak", voiceId, language, text } (legacy studio preview)

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

const allowedLanguages = new Set([
  "Chinese", "English", "Spanish", "French", "Portuguese", "German", "Japanese", "Malay", "auto",
]);

function cleanLanguage(value: unknown) {
  const language = String(value ?? "auto");
  return allowedLanguages.has(language) ? language : "auto";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const apiKey = Deno.env.get("MINIMAX_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!apiKey) return json({ error: "voice_not_configured", message: "Voice identity is not configured yet. Add MINIMAX_API_KEY in Supabase secrets." }, 503);

  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await asUser.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  try {
    const body = await req.json();
    const action = String(body.action ?? "clone");
    const language = cleanLanguage(body.language);

    if (action === "clone") {
      if (body.consent !== true) return json({ error: "consent_required", message: "The adult voice owner must confirm permission before cloning." }, 400);
      const audioUrl = String(body.audioUrl ?? "");
      const expectedPrefix = `${supabaseUrl}/storage/v1/object/public/media/${user.id}/persona/`;
      if (!audioUrl.startsWith(expectedPrefix)) return json({ error: "invalid_audio", message: "Use a voice sample from your own Mentor Studio." }, 403);

      const source = await fetch(audioUrl);
      if (!source.ok) return json({ error: "audio_unavailable", message: "We could not retrieve your voice sample." }, 400);
      const bytes = await source.arrayBuffer();
      if (bytes.byteLength > 20 * 1024 * 1024) return json({ error: "audio_too_large", message: "Voice samples must be 20 MB or smaller." }, 400);
      const filename = new URL(audioUrl).pathname.split("/").pop() || "voice.wav";
      if (!/\.(mp3|m4a|wav)$/i.test(filename)) {
        return json({ error: "unsupported_audio", message: "For cloning, upload an MP3, M4A, or WAV recording." }, 400);
      }

      const form = new FormData();
      form.append("purpose", "voice_clone");
      form.append("file", new File([bytes], filename, { type: source.headers.get("content-type") || "audio/wav" }));
      const uploaded = await fetch("https://api.minimax.io/v1/files/upload", {
        method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form,
      });
      const uploadData = await uploaded.json();
      const fileId = uploadData?.file?.file_id;
      if (!uploaded.ok || !fileId) return json({ error: "upload_failed", message: "MiniMax could not accept that audio sample.", detail: uploadData }, 502);

      const voiceId = `Moli${user.id.replaceAll("-", "").slice(0, 18)}${Date.now()}`;
      const cloned = await fetch("https://api.minimax.io/v1/voice_clone", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: fileId,
          voice_id: voiceId,
          text: String(body.previewText ?? "Hello! I am your MoliVerse mentor. Let us learn together.").slice(0, 1000),
          model: "speech-2.8-hd",
          language_boost: language,
          need_noise_reduction: true,
          need_volume_normalization: true,
        }),
      });
      const cloneData = await cloned.json();
      if (!cloned.ok || cloneData?.base_resp?.status_code !== 0) {
        return json({ error: "clone_failed", message: cloneData?.base_resp?.status_msg || "MiniMax could not create the voice identity.", detail: cloneData }, 502);
      }
      // A clone preview alone does not activate a MiniMax voice slot. Make one
      // real synthesis now so the identity remains available after seven days.
      const activationText = String(body.previewText ?? "Hello! I am your MoliVerse mentor. Let us learn together.").slice(0, 1000);
      const activated = await fetch("https://api-uw.minimax.io/v1/t2a_v2", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "speech-2.8-turbo", text: activationText, stream: false, language_boost: language, output_format: "url",
          voice_setting: { voice_id: voiceId, speed: 0.94, vol: 1, pitch: 0 },
          audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 },
        }),
      });
      const activatedData = await activated.json();
      const previewUrl = activatedData?.data?.audio || cloneData?.demo_audio || null;
      if (!activated.ok || !previewUrl) {
        return json({ error: "activation_failed", message: activatedData?.base_resp?.status_msg || "Voice was cloned but could not be activated." }, 502);
      }
      const admin = createClient(supabaseUrl, serviceKey);
      // One ready identity is active per educator. Older identities stay as an
      // audit trail but are revoked, so a new recording cannot be confused
      // with the one children hear.
      await admin
        .from("voice_identities")
        .update({ status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("teacher_id", user.id)
        .eq("status", "ready");
      const { data: identity, error: identityError } = await admin
        .from("voice_identities")
        .insert({
          teacher_id: user.id,
          provider: "minimax",
          provider_voice_id: voiceId,
          language,
          status: "ready",
          consented_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (identityError || !identity?.id) {
        return json({ error: "identity_save_failed", message: "Voice was created, but its secure MoliVerse identity could not be saved." }, 502);
      }
      return json({ mentorVoiceId: identity.id, previewUrl, language });
    }

    if (action === "speak") {
      const voiceId = String(body.voiceId ?? "");
      const text = String(body.text ?? "").trim().slice(0, 2000);
      if (!/^Moli[A-Za-z0-9_-]{8,}$/.test(voiceId) || !text) return json({ error: "invalid_request" }, 400);
      const spoken = await fetch("https://api-uw.minimax.io/v1/t2a_v2", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "speech-2.8-turbo", text, stream: false, language_boost: language, output_format: "url",
          voice_setting: { voice_id: voiceId, speed: 0.94, vol: 1, pitch: 0 },
          audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 },
        }),
      });
      const speechData = await spoken.json();
      const audioUrl = speechData?.data?.audio;
      if (!spoken.ok || !audioUrl) return json({ error: "synthesis_failed", message: speechData?.base_resp?.status_msg || "Voice preview could not be generated." }, 502);
      return json({ audioUrl });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (err) {
    return json({ error: "server_error", message: String(err) }, 500);
  }
});
