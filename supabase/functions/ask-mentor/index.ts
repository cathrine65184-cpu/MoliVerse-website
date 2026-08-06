// MoliVerse — ask-mentor edge function.
//
// Answers a learner's question in the voice of a specific teacher, grounded in
// the courseware they uploaded. The DeepSeek key lives only here as a Supabase
// secret and never reaches the browser.
//
// Knowledge is passed in as plain text rather than retrieved: at a few courses
// per teacher the whole thing fits the context window, and the honest simple
// version beats a vector store nobody has enough documents to need yet. When
// that stops being true, only the selection of `materials` has to change.

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

type Turn = { role: "user" | "assistant"; content: string };
const HEAVY_FEELING = /(nobody loves me|no one loves me|i.?m scared|i want to die|hurt myself|hurt someone|没人爱我|没有人爱我|我害怕|不想活|自杀|伤害自己|伤害别人)/i;

async function createHumanMoment(explorerId: string, courseId: string, signalType: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey || !explorerId || !courseId) return false;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: explorer } = await admin.from("explorers").select("guardian_email,status").eq("id", explorerId).maybeSingle();
  const { data: preferences } = await admin.from("guardian_preferences").select("educator_response_enabled").eq("explorer_id", explorerId).maybeSingle();
  const { data: link } = await admin.from("collection_lessons").select("collection_id, course_collections(teacher_id,title)").eq("course_id", courseId).maybeSingle();
  const collection = link?.course_collections as { teacher_id?: string; title?: string } | null;
  if (explorer?.status !== "active" || !preferences?.educator_response_enabled || !collection?.teacher_id) return false;
  const since = new Date(Date.now() - 86400000).toISOString();
  const { data: existing } = await admin.from("human_moment_events").select("id").eq("explorer_id", explorerId).eq("course_id", courseId).eq("signal_type", signalType).gte("created_at", since).maybeSingle();
  if (existing) return true;
  const { data: event, error } = await admin.from("human_moment_events").insert({ explorer_id: explorerId, collection_id: link?.collection_id, course_id: courseId, teacher_id: collection.teacher_id, signal_type: signalType }).select("id").single();
  if (error || !event) return false;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendKey || !from) {
    await admin.from("human_moment_events").update({ notification_status: "failed", updated_at: new Date().toISOString() }).eq("id", event.id);
    return true;
  }
  const { data: teacherAuth } = await admin.auth.admin.getUserById(collection.teacher_id);
  const recipients = [explorer.guardian_email, teacherAuth.user?.email].filter(Boolean) as string[];
  const text = `A Human Moment was detected in ${collection.title ?? "a MoliVerse collection"}. No child message is included. Please check in through the MoliVerse family or educator dashboard and offer support according to your safeguarding practice.`;
  try {
    const sent = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: recipients, subject: "MoliVerse: a gentle wellbeing check may be helpful", text }) });
    await admin.from("human_moment_events").update({ notification_status: sent.ok ? "sent" : "failed", guardian_notified_at: sent.ok ? new Date().toISOString() : null, teacher_notified_at: sent.ok ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", event.id);
  } catch {
    await admin.from("human_moment_events").update({ notification_status: "failed", updated_at: new Date().toISOString() }).eq("id", event.id);
  }
  return true;
}

function systemPrompt(
  teacher: string,
  bio: string,
  language: string,
  courseTitle: string,
  materials: string
): string {
  const knowledge = materials.trim()
    ? `

以下是这门课的课件原文，是你回答的唯一事实依据：
"""
${materials.trim()}
"""

回答规则：
- 课件里有的内容，就依据课件回答，可以引用其中的词句。
- 课件里没写、但属于这门语言的常识（比如某个词怎么发音），可以正常回答。
- 如果问题需要课件里没有的具体信息（比如"下节课几点"、"作业是什么"），直接说你不确定。MoliVerse 不提供儿童与教育者的公开私信；如需真人支持，请邀请家长或监护人从 Family area 发起请求 —— 不要编造。`
    : `

这门课暂时没有上传课件。请基于常识温和作答；遇到需要具体课程信息的问题，建议对方私信老师本人，不要编造。`;

  return `你是「${teacher}」的 AI 教学分身，正在回答一个正在学「${courseTitle}」这门课的孩子或家长的提问。

老师本人的介绍：${bio || "（未填写）"}
教学语言：${language || "英语"}

你的说话方式：
- 像一位耐心的儿童语言老师：温暖、具体、鼓励，句子短。
- 用提问者的语言回答（对方用中文问就用中文答），示范目标语言的词句时给出原文并附中文解释。
- 一次只讲清楚一件事，不要长篇大论；答案控制在 150 字以内。
- 你是老师的分身，不是老师本人。MoliVerse 不提供儿童与教育者的公开私信。若对方想要真人回复、或谈到情绪/安全/付费等事宜，请他们和身边可信任的大人说一说，并由家长或监护人从 Family area 发起请求。
- 如果孩子说“没人爱我”、害怕、想伤害自己或别人，或出现其他沉重情绪：先用一句话感谢他/她告诉你；明确说他/她值得被关心、不必独自解决；邀请他/她现在就去找身边可信任的大人。不要让孩子保守秘密，不要追问细节，不要承诺真人老师一定会联系。${knowledge}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const {
      question,
      history,
      teacherName,
      teacherBio,
      language,
      courseTitle,
      materials,
      explorerId,
      courseId,
    } = await req.json();

    const q = String(question ?? "").trim();
    if (!q) return json({ error: "missing question" }, 400);

    const key = Deno.env.get("DEEPSEEK_KEY");
    if (!key) return json({ error: "server not configured" }, 500);

    // Keep only the last few turns so a long chat cannot crowd out the
    // courseware or run the token bill up.
    const prior: Turn[] = Array.isArray(history)
      ? history
          .filter((m: Turn) => m?.content && (m.role === "user" || m.role === "assistant"))
          .slice(-6)
          .map((m: Turn) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
      : [];

    const humanMoment = HEAVY_FEELING.test(q);
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: systemPrompt(
              String(teacherName ?? "老师"),
              String(teacherBio ?? ""),
              String(language ?? ""),
              String(courseTitle ?? ""),
              String(materials ?? "").slice(0, 20000)
            ),
          },
          ...prior,
          { role: "user", content: q.slice(0, 2000) },
        ],
        temperature: 0.6,
        max_tokens: 600,
      }),
    });

    const data = await resp.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) return json({ error: "generation failed", detail: data }, 502);

    const notified = humanMoment ? await createHumanMoment(String(explorerId ?? ""), String(courseId ?? ""), "heavy_feeling") : false;
    return json({ answer, humanMoment, notified });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
