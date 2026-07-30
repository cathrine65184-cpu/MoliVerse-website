// MoliVerse — generate-lesson edge function.
// Reads a course's title + description and asks DeepSeek to author a full
// immersive lesson (LessonStep[]). The DeepSeek key lives only here as a
// Supabase secret and never reaches the browser.

const COSTUMES = [
  "explorer", "ranger", "wizard", "diver", "snowhero", "astronaut", "storyteller", "captain",
];
const TYPES = new Set(["intro", "card", "quiz", "move", "finale"]);
const FALLBACK_EMOJI = ["⭐", "🌈", "🎈", "🎨", "🚀", "🌙", "🦊", "🌟", "💫", "🎪"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function buildPrompt(title: string, desc: string, teacher: string, materials: string): string {
  // The teacher's own courseware, when they have uploaded any. Anchoring the
  // lesson to their real material is the whole point of the upload step, so
  // it goes in ahead of the format rules and is called out as authoritative.
  const knowledge = materials.trim()
    ? `

老师上传的课件内容（请优先使用这里出现的词汇、句型和故事情节，不要另起炉灶）：
"""
${materials.trim()}
"""`
    : "";

  return `你是儿童英语启蒙课程设计师。为下面这门课设计一堂沉浸式 live 课堂，输出严格的 JSON（只输出 JSON，不要解释、不要 markdown）。顶层格式：{"steps": [ ... ]}。

课程标题：${title}
课程简介：${desc}
授课老师：${teacher}${knowledge}

要求：
- 9 到 12 个步骤，带孩子穿越与课程主题相关的不同场景，逐步学 3-6 个核心英文词/短语。
- 每个步骤 type 必须是：intro / card / quiz / move / finale 之一。
- 每步都要有 scene（中文场景关键词，从这些选并可组合：晴天 夜晚 夕阳 星空 月亮 森林 城堡 城市 沙漠 山 海底 雪 萤火虫 泡泡 太阳 足球场）和 costume（从这些选一个：explorer ranger wizard diver snowhero astronaut storyteller captain）。
- say 是老师要朗读的英文台词（温柔、适合儿童、可夹少量中文解释）。
- card 必须有 emoji 字段（一个 emoji，和要学的词相关）。
- intro:{type,title,sub,say,scene,costume}
- card:{type,emoji,word,action,say,move(bool),scene,costume}
- quiz:{type,question,say,options:[{label,correct}]（正好3个，1个correct为true）,scene,costume}
- move:{type,emoji,prompt,say,scene,costume}
- finale:{type,say,scene,costume}
- 第一个必须是 intro，最后一个必须是 finale，中间至少 1 个 quiz 和 1 个 move。至少 2 个 card 的 move 为 true。`;
}

// deno-lint-ignore no-explicit-any
function normalize(steps: any[]): any[] {
  const out: any[] = [];
  let ei = 0;
  for (const s of steps ?? []) {
    const t = s?.type;
    if (!TYPES.has(t)) continue;
    const say = String(s.say ?? "").trim();
    if (!say) continue;
    const scene = String(s.scene ?? "夜晚 星空").trim();
    const costume = COSTUMES.includes(s.costume) ? s.costume : "storyteller";
    const step: Record<string, unknown> = { t, scene, costume, say };
    if (t === "intro") {
      step.title = String(s.title ?? "");
      step.sub = String(s.sub ?? "");
    } else if (t === "card") {
      step.emoji = s.emoji || FALLBACK_EMOJI[ei++ % FALLBACK_EMOJI.length];
      step.word = String(s.word ?? "");
      if (s.action) step.action = String(s.action);
      step.move = !!s.move;
    } else if (t === "quiz") {
      step.question = String(s.question ?? "");
      let opts = (s.options ?? [])
        .filter((o: any) => o?.label)
        .map((o: any) => ({ label: String(o.label), correct: !!o.correct }));
      if (opts.length && !opts.some((o: any) => o.correct)) opts[0].correct = true;
      step.options = opts.slice(0, 4);
    } else if (t === "move") {
      step.emoji = s.emoji || "🤸";
      step.prompt = String(s.prompt ?? "");
    }
    out.push(step);
  }
  if (out.length && out[0].t !== "intro") {
    out.unshift({ t: "intro", scene: out[0].scene, costume: out[0].costume, title: "", sub: "", say: "Hello! Let's begin our adventure!" });
  }
  if (out.length && out[out.length - 1].t !== "finale") {
    out.push({ t: "finale", scene: "夜晚 星空", costume: "wizard", say: "Great job today! See you next time!" });
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { title, description, teacherName, materials } = await req.json();
    if (!title) {
      return new Response(JSON.stringify({ error: "missing title" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const key = Deno.env.get("DEEPSEEK_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "server not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: buildPrompt(
              title,
              description ?? "",
              teacherName ?? "Teacher",
              String(materials ?? "").slice(0, 20000)
            ),
          },
        ],
        temperature: 0.8,
        response_format: { type: "json_object" },
        max_tokens: 3500,
      }),
    });
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "generation failed", detail: data }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const obj = JSON.parse(content);
    const rawSteps = Array.isArray(obj) ? obj : (obj.steps ?? Object.values(obj).find(Array.isArray) ?? []);
    const steps = normalize(rawSteps as any[]);
    return new Response(JSON.stringify({ steps }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
