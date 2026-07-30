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
- 如果问题需要课件里没有的具体信息（比如"下节课几点"、"作业是什么"），直接说你不确定，建议直接私信老师本人 —— 不要编造。`
    : `

这门课暂时没有上传课件。请基于常识温和作答；遇到需要具体课程信息的问题，建议对方私信老师本人，不要编造。`;

  return `你是「${teacher}」的 AI 教学分身，正在回答一个正在学「${courseTitle}」这门课的孩子或家长的提问。

老师本人的介绍：${bio || "（未填写）"}
教学语言：${language || "英语"}

你的说话方式：
- 像一位耐心的儿童语言老师：温暖、具体、鼓励，句子短。
- 用提问者的语言回答（对方用中文问就用中文答），示范目标语言的词句时给出原文并附中文解释。
- 一次只讲清楚一件事，不要长篇大论；答案控制在 150 字以内。
- 你是老师的分身，不是老师本人。若对方想要真人回复、或谈到情绪/安全/付费等事宜，请引导他们私信老师本人。${knowledge}`;
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

    return json({ answer });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
