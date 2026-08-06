import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "https://moliverse.tech", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const ids = () => crypto.randomUUID();

type DraftLesson = { title: string; description: string; storyBeat: string; objectives: string[]; vocabulary: string[]; mentorContext: string; humanMomentRules: string[]; steps: unknown[] };
type Draft = { collection: { title: string; description: string; language: string; ageRange: string; world: string; storyQuestion: string; humanMomentPolicy: string }; lessons: DraftLesson[] };

function fallback(world: string, language: string, ageRange: string): Draft {
  const nodes = [
    ["A Quiet Farewell", "A gentle story entry about feelings we cannot name yet.", ["farewell", "confused", "sad", "care"]],
    ["A New Beginning", "Enter the Letter House and learn how a letter begins.", ["Dear", "letter", "pen", "gentle"]],
    ["Other People’s Hearts", "Notice care hidden in small everyday actions.", ["I remember", "thank you", "warm", "miss"]],
    ["A Letter for Everyone", "Think about kindness, gratitude, and different forms of care.", ["With love", "kind", "grateful", "I hope"]],
    ["Your Letter", "Use a simple scaffold to write one true, kind letter.", ["Dear", "I remember", "I felt", "I hope"]],
  ];
  return {
    collection: { title: `${world}: Letters, Love & Little Poems`, description: "A five-part story-led English collection where children learn to notice feelings and write kind letters.", language, ageRange, world, storyQuestion: "What can a letter say that feels hard to say aloud?", humanMomentPolicy: "If a child shares a heavy feeling, pause gently, encourage a trusted grown-up, and use parent-approved support only." },
    lessons: nodes.map(([title, description, vocabulary], i) => ({
      title: String(title), description: String(description), storyBeat: `Part ${i + 1} of ${world}.`, objectives: ["Learn warm English for real feelings", "Use one phrase in a meaningful sentence"], vocabulary: vocabulary as string[],
      mentorContext: `Teach this part slowly through story, questions, and imagination. Keep English primary and offer short support in the child's home language only when asked.`,
      humanMomentRules: ["Thank a child who shares a heavy feeling.", "Encourage a trusted grown-up nearby; never request private details."],
      steps: [
        { t: "intro", title, sub: description, say: `Welcome to ${world}. Let’s listen carefully and explore this story together.`, scene: "night city stars", costume: "storyteller" },
        { t: "card", word: (vocabulary as string[])[0], emoji: "💌", action: "Say it softly with Catherine.", move: false, say: `Our first gentle word is ${(vocabulary as string[])[0]}. Can you say it with me?`, scene: "sunny city", costume: "storyteller" },
        { t: "move", emoji: "✨", prompt: "Make a tiny letter in the air.", say: "Let’s move our hands like we are writing a kind message.", scene: "night sky moon", costume: "wizard" },
        { t: "quiz", question: `Which word belongs in today’s Letter World story?`, say: "Choose the word you remember.", options: [{ label: (vocabulary as string[])[0], correct: true }, { label: "volcano", correct: false }, { label: "rocket", correct: false }], scene: "night sky moon", costume: "wizard" },
        { t: "finale", say: "You listened with care today. Keep this new word in your heart until our next letter.", scene: "night sky stars", costume: "storyteller" },
      ],
    })),
  };
}

async function createDraft(dna: Record<string, string>, input: Record<string, unknown>): Promise<Draft> {
  const world = String(input.world || dna.course_world || "Letter World").slice(0, 80);
  const language = String(input.language || "English").slice(0, 40);
  const ageRange = String(input.ageRange || "6–12").slice(0, 20);
  const fallbackDraft = fallback(world, language, ageRange);
  const key = Deno.env.get("DEEPSEEK_KEY");
  if (!key) return fallbackDraft;
  const prompt = `You design child-safe language course collections. Return JSON only: {collection:{title,description,language,ageRange,world,storyQuestion,humanMomentPolicy},lessons:[{title,description,storyBeat,objectives,vocabulary,mentorContext,humanMomentRules,steps}]}. Exactly five lessons. Each steps array has 5-8 LessonStep objects using t: intro/card/quiz/move/finale. English-first; allow short Chinese, Spanish, Portuguese explanation only when asked. Avoid external copyrighted characters and plots. Teacher DNA: personality=${dna.personality}; teaching style=${dna.teaching_style}; stories=${dna.stories}; values=${dna.values}; course world=${world}; ages=${ageRange}.`;
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "deepseek-chat", response_format: { type: "json_object" }, temperature: 0.55, max_tokens: 6000, messages: [{ role: "user", content: prompt }] }) });
    const body = await response.json();
    const draft = JSON.parse(body?.choices?.[0]?.message?.content ?? "null") as Draft;
    if (draft?.lessons?.length === 5 && draft.collection?.title) return draft;
  } catch { /* deterministic draft remains available */ }
  return fallbackDraft;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Sign in as an educator first." }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "teacher") return json({ error: "Only educators can build collections." }, 403);
  const body = await req.json().catch(() => ({}));
  const { data: dna } = await admin.from("teacher_dna").select("*").eq("teacher_id", user.id).maybeSingle();
  const teacherDNA = (dna ?? {}) as Record<string, string>;
  if (body.action === "generate") return json(await createDraft(teacherDNA, body));
  if (body.action !== "publish") return json({ error: "Unknown action" }, 400);

  const draft = body.draft as Draft;
  if (!draft?.collection?.title || !Array.isArray(draft.lessons) || draft.lessons.length !== 5) return json({ error: "A collection needs exactly five lessons." }, 400);
  const collectionId = ids();
  const { error: collectionError } = await admin.from("course_collections").insert({
    id: collectionId, teacher_id: user.id, title: draft.collection.title, description: draft.collection.description, language: draft.collection.language, age_range: draft.collection.ageRange, world: draft.collection.world, story_question: draft.collection.storyQuestion, human_moment_policy: draft.collection.humanMomentPolicy, status: "published", teacher_dna_snapshot: teacherDNA,
  });
  if (collectionError) return json({ error: "Could not publish the collection." }, 500);
  try {
    for (const [index, lesson] of draft.lessons.entries()) {
      const courseId = ids();
      const { error: courseError } = await admin.from("courses").insert({ id: courseId, teacher_id: user.id, title: lesson.title, description: lesson.description, language: draft.collection.language });
      if (courseError) throw courseError;
      await admin.from("collection_lessons").insert({ collection_id: collectionId, course_id: courseId, position: index + 1 });
      await admin.from("course_lesson_content").insert({ course_id: courseId, story_beat: lesson.storyBeat, learning_objectives: lesson.objectives, vocabulary: lesson.vocabulary, mentor_context: lesson.mentorContext, human_moment_rules: lesson.humanMomentRules, lesson_steps: lesson.steps });
    }
  } catch (error) {
    await admin.from("course_collections").delete().eq("id", collectionId);
    return json({ error: "The collection could not be published. Please try again." }, 500);
  }
  return json({ collectionId });
});
