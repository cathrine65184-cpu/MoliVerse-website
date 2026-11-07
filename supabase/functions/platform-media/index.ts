import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { defaultFilter } from "../../../lib/sensitiveFilter.ts";
const allowed = ["https://moliverse.tech", "https://www.moliverse.tech"];
const supported = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const str = (x: unknown, max: number) => typeof x === "string" && x.length <= max ? x.trim() : "";
const id = (x: unknown) => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x) ? x : "";
class Fault extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
function fail(m: string, s = 400): never {
  throw new Fault(m, s);
}
async function bounded(req: Request) {
  if (!req.body) fail("Missing body");
  const reader = req.body!.getReader(), dec = new TextDecoder();
  let bytes = 0, raw = "";
  try {
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      bytes += r.value.length;
      if (bytes > 20 * 1024 * 1024) fail("Use a file under 14 MB.", 413);
      raw += dec.decode(r.value, { stream: true });
    }
    return JSON.parse(raw + dec.decode());
  } finally {
    await reader.cancel().catch(() => {});
  }
}
function binary(b64: string) {
  if (!b64 || b64.length > 19600000) fail("Invalid file size");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
async function ticket(owner: string, explorer: string, data: string, expires: number) {
  const enc = new TextEncoder(),
    key = await crypto.subtle.importKey(
      "raw",
      enc.encode(Deno.env.get("MEDIA_WORKER_TOKEN")),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, enc.encode([owner, explorer, expires, data].join(":"))),
    ),
  ).map((b) => b.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  if (origin && !allowed.includes(origin) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return new Response(null, { status: 403 });
  }
  const headers = {
    "Access-Control-Allow-Origin": origin || allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  const json = (v: unknown, s = 200) => Response.json(v, { status: s, headers });
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!,
      svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { persistSession: false },
      });
    const auth = req.headers.get("authorization") || "", token = auth.replace(/^Bearer /i, "");
    const user = token ? (await svc.auth.getUser(token)).data.user : null;
    const b = await bounded(req), bucket = svc.storage.from("lb-private");
    async function sign(path: string) {
      const { data, error } = await bucket.createSignedUrl(path, 180);
      if (error || !data) fail("File not available", 404);
      return data!.signedUrl;
    }
    if (b.action === "open") {
      const { data: s } = await svc.from("lb_submissions").select("status,owner_id,file_id,meta").eq(
        "id",
        id(b.submission),
      ).maybeSingle();
      if (
        !s ||
        !(s.status === "published" || user?.id === s.owner_id || user?.app_metadata?.moli_admin === true)
      ) fail("Resource unavailable", 404);
      if (!s!.file_id) return json({ url: s!.meta.link, external: true });
      const { data: f } = await svc.from("lb_files").select("path,mime").eq("id", s!.file_id).eq(
        "owner_id",
        s!.owner_id,
      ).single();
      if (!f) fail("File unavailable", 404);
      return json({ url: await sign(f!.path), mime: f!.mime });
    }
    if (!user) fail("Sign in first", 401);
    const own = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    if (b.action === "creator_capabilities") {
      const { data: creator } = await own.from("lb_creators").select("status").eq("id",user!.id).maybeSingle();
      return json({files:creator?.status==="approved" && Boolean(Deno.env.get("MEDIA_WORKER_URL") && Deno.env.get("MEDIA_WORKER_TOKEN"))});
    }
    if (b.action === "capabilities") {
      const { data: art } = await own.rpc("lb_art_access", { e: id(b.explorer) });
      const { data: pref } = await own.from("guardian_preferences").select("ai_mentor_enabled").eq(
        "explorer_id",
        id(b.explorer),
      ).maybeSingle();
      const worker = Boolean(Deno.env.get("MEDIA_WORKER_URL") && Deno.env.get("MEDIA_WORKER_TOKEN"));
      return json({
        art: art === true && worker,
        images: art === true && pref?.ai_mentor_enabled === true && worker &&
          Boolean(Deno.env.get("MOLI_IMAGE_PROVIDER_URL")),
      });
    }
    const quota = await own.rpc("lb_quota");
    if (quota.error) fail("Media limit or configuration unavailable", 429);
    if (b.action === "clean_files") {
      const { data: files, error } = await svc.from("lb_files").select("id,path").eq("owner_id", user!.id);
      if (error) fail("Private files unavailable", 503);
      for (const f of files || []) {
        const refs = await svc.from("lb_submissions").select("id").eq("file_id", f.id).limit(1);
        if (refs.error) fail("Could not check references", 503);
        if (refs.data?.length) continue;
        // Delete the DB row first: its FK prevents deleting a concurrently attached file.
        const del = await svc.from("lb_files").delete().eq("id", f.id).eq("owner_id", user!.id);
        if (del.error) continue;
        if ((await bucket.remove([f.path])).error) {
          fail("Private object cleanup needs staff assistance.", 503);
        }
      }
      return json({ ok: true });
    }
    const learner = ["art", "asset_urls", "delete_art", "generate", "erase"].includes(b.action);
    if (learner) {
      const { data: explorer } = await svc.from("explorers").select("id,status").eq("id", id(b.explorer)).eq(
        "guardian_id",
        user!.id,
      ).maybeSingle();
      if (!explorer || b.action !== "erase" && explorer.status !== "active") {
        fail("An active Explorer with their guardian is required", 403);
      }
      const { data: p } = await svc.from("guardian_preferences").select(
        "artwork_uploads,save_memories,ai_mentor_enabled",
      ).eq("explorer_id", explorer.id).maybeSingle();
      if (b.action === "erase") {
        const purge = await own.rpc("lb_erase_world", { e: explorer.id });
        if (purge.error) fail("Could not erase learning records");
        const visits = await svc.from("lb_visits").delete().eq("explorer", explorer.id);
        if (visits.error) fail("Could not erase visit history. Retry.", 503);
        const { data: assets, error } = await svc.from("lb_assets").select("file_path,thumb_path").eq(
          "explorer",
          explorer.id,
        );
        if (error) fail("Storage unavailable");
        for (const a of assets || []) {
          const r = await bucket.remove([a.file_path, a.thumb_path].filter(Boolean));
          if (r.error) fail("Could not erase all assets. Retry.", 503);
        }
        const del = await svc.from("lb_assets").delete().eq("explorer", explorer.id);
        if (del.error) fail("Could not erase all assets");
        return json({ ok: true });
      }
      if (!p?.save_memories || !p.artwork_uploads) {
        fail("Guardian artwork and saving permission required", 403);
      }
      if (b.ticket && p.ai_mentor_enabled !== true) fail("Guardian AI permission required", 403);
      if (b.action === "asset_urls") {
        const { data, error } = await svc.from("lb_assets").select("id,thumb_path").eq(
          "explorer",
          explorer.id,
        );
        if (error) fail("Could not open private library", 503);
        return json({
          items: await Promise.all(
            (data || []).map(async (a) => ({ id: a.id, url: await sign(a.thumb_path) })),
          ),
        });
      }
      if (b.action === "delete_art") fail("Erase private artwork with the guardian’s erase control.", 400);
      if (b.action === "generate") {
        if (!p.ai_mentor_enabled) fail("Guardian AI permission required", 403);
        const provider = Deno.env.get("MOLI_IMAGE_PROVIDER_URL");
        if (!provider) fail("Image generation is not configured.", 503);
        const idea = str(b.idea, 300);
        if (!idea || /[@\d<>]/.test(idea) || defaultFilter.contains(idea)) {
          fail("Describe the drawing without personal details.");
        }
        if ((await own.rpc("lb_image_request", { e: explorer.id })).error) {
          fail("Image permission unavailable or daily limit reached", 429);
        }
        const response = await fetch(provider, {
          method: "POST",
          signal: AbortSignal.timeout(30000),
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + (Deno.env.get("MOLI_IMAGE_PROVIDER_TOKEN") || ""),
          },
          body: JSON.stringify({
            prompt: idea,
            policy: "child-safe original illustration only; no personal information",
          }),
        });
        if (!response.ok) fail("Image provider unavailable", 503);
        const rendered = await response.json();
        if (rendered.safeForChildren !== true) {
          fail("The provider did not clear this preview for children.", 422);
        }
        b.data = rendered.data;
        b.mime = rendered.mime;
      }
    } else if (b.action === "file") {
      const { data: c } = await svc.from("lb_creators").select("status").eq("id", user!.id).maybeSingle();
      if (c?.status !== "approved") fail("Approved creator required", 403);
    } else fail("Unsupported action");
    const worker = Deno.env.get("MEDIA_WORKER_URL");
    if (!worker || !Deno.env.get("MEDIA_WORKER_TOKEN")) {
      fail("Secure file processing is not configured. Try again later.", 503);
    }
    if (!supported.includes(b.mime) || learner && !b.mime.startsWith("image/")) {
      fail("Unsupported media type", 415);
    }
    const checked = await fetch(worker + "/process", {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: "Bearer " + Deno.env.get("MEDIA_WORKER_TOKEN"),
        "Content-Type": b.mime,
        "X-Art": learner ? "1" : "0",
      },
      body: binary(b.data),
    });
    if (!checked.ok) fail("File could not pass validation and scanning. Try another file.", 422);
    const media = await checked.json();
    if (b.action === "generate") {
      const expires = Date.now() + 600000;
      return json({
        preview: media.data,
        mime: media.mime,
        expires,
        ticket: await ticket(user!.id, b.explorer, media.data, expires),
      });
    }
    const generated = b.action === "art" && !!b.ticket;
    if (
      generated &&
      (!Number.isSafeInteger(b.expires) || b.expires < Date.now() ||
        b.ticket !== await ticket(user!.id, b.explorer, b.data, b.expires))
    ) fail("Preview expired or changed. Generate again.", 403);
    const uid = crypto.randomUUID(), path = user!.id + "/" + uid + "/item", thumb = path + "-thumb";
    const bin = binary(media.data), put = await bucket.upload(path, bin, { contentType: media.mime });
    if (put.error) fail("Private storage failed", 503);
    try {
      if (learner) {
        const t = await bucket.upload(thumb, binary(media.thumb), { contentType: "image/webp" });
        if (t.error) throw Error();
        const { error } = await svc.from("lb_assets").insert({
          id: uid,
          explorer: b.explorer,
          name: str(b.name, 70) || "My artwork",
          category: str(b.category, 50) || "Decorations",
          source: generated ? "generated" : "upload",
          file_path: path,
          thumb_path: thumb,
        });
        if (error) throw Error();
      } else {
        const { error } = await svc.from("lb_files").insert({
          id: uid,
          owner_id: user!.id,
          path,
          mime: media.mime,
          bytes: bin.length,
          scanned_at: new Date().toISOString(),
        });
        if (error) throw Error();
      }
    } catch {
      await bucket.remove([path, thumb]);
      fail("File was not registered. Retry.", 503);
    }
    return json({ id: uid, mime: media.mime, preview: await sign(learner ? thumb : path) });
  } catch (err) {
    return json({
      error: err instanceof Fault ? err.message : "Request failed. Check service configuration or retry.",
    }, err instanceof Fault ? err.status : 503);
  }
});
