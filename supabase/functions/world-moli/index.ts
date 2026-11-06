import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { clean, obj } from "../../../lib/creator/workflow.ts";
import { deepSeekProvider, type Turn } from "./provider.ts";
const assets = ["chair", "tree", "shop", "moli", "book", "bread", "stars", "valley"];
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  if (
    origin && !["https://moliverse.tech", "https://www.moliverse.tech"].includes(origin) &&
    !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) return new Response(null, { status: 403 });
  const headers = {
    "Access-Control-Allow-Origin": origin || "https://moliverse.tech",
    "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
  const send = (v: unknown, s: number) => Response.json(v, { status: s, headers });
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return send({ error: "POST required." }, 405);
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: { user } } = await db.auth.getUser();
    if (!user) return send({ error: "A guardian session is required." }, 401);
    const raw = await req.text();
    if (raw.length > 5000) return send({ error: "Use a shorter question." }, 413);
    const b = obj(JSON.parse(raw));
    const { data: access } = await db.rpc("lb_access", { e: b.explorer });
    const { data: p } = await db.from("guardian_preferences").select("ai_mentor_enabled").eq(
      "explorer_id",
      b.explorer,
    ).maybeSingle();
    if (access !== true || p?.ai_mentor_enabled !== true) {
      return send({ error: "Guardian permission is required." }, 403);
    }
    if ((await db.rpc("lb_quota")).error) return send({ error: "Please try later." }, 429);
    const key = Deno.env.get("DEEPSEEK_KEY");
    if (!key) return send({ error: "Live Moli is unavailable. The room and French orders still work." }, 503);
    const text = clean(b.question, 260);
    const turns: Turn[] = [];
    if (Array.isArray(b.history)) {
      for (const t of b.history.slice(-4)) {
        turns.push({ role: t.role === "assistant" ? "assistant" : "user", content: clean(t.content, 390) });
      }
    }
    turns.push({ role: "user", content: text });
    let courses: { id: string; title: string; description: string }[] = [];
    if (/course|learn about|discover|课程|文化|curso/i.test(text)) {
      const { data } = await db.from("lb_submissions").select("id,meta").eq("status", "published").order(
        "updated_at",
        { ascending: false },
      ).limit(24);
      const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const rank = (r: { meta: Record<string, string> }) =>
        words.filter((w) =>
          [r.meta.title, r.meta.language, r.meta.subject].join(" ").toLowerCase().includes(w)
        ).length;
      courses = (data || []).sort((a, b) => rank(b) - rank(a)).slice(0, 3).map((r) => ({
        id: r.id,
        title: String(r.meta.title).slice(0, 140),
        description: String(r.meta.description).slice(0, 180),
      }));
    }
    const response = obj(
      await deepSeekProvider(key).respond({
        available: assets,
        selected: assets.includes(String(b.selected)) ? b.selected : null,
        publishedOptions: courses,
        lesson:
          "Une pomme means an apple. Learning rewards are determined only by the approved practice activity. Only mention courses present in publishedOptions. Never invent availability.",
      }, turns),
    );
    const reply = clean(response.reply, 390);
    if (/https?:|www\.|<[^>]*>/i.test(reply)) throw Error();
    return send({
      reply,
      suggestAsset: assets.includes(String(response.suggestAsset)) ? response.suggestAsset : null,
      courses: courses.map(({ id, title }) => ({ id, title })),
    }, 200);
  } catch {
    return send(
      { error: "Moli could not safely answer. Try a short question without personal details." },
      400,
    );
  }
});
