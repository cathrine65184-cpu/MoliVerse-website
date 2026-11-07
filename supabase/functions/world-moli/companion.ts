import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { vocabulary } from "../../../lib/platform/vocabulary.ts";
import {
  type CompanionState,
  type CompanionTool,
  companionTools,
  lookupVocabulary,
  safeTurns,
  safetyReply,
  settingsOf,
} from "../../../lib/platform/companion.ts";
import { learningProvider } from "./provider.ts";

export async function companionReply(
  db: SupabaseClient,
  owner: string,
  b: Record<string, unknown>,
) {
  const { data: context, error } = await db.rpc("lb_moli_context", {
    e: b.explorer,
  });
  if (error || !context?.ai) {
    return {
      status: 403,
      body: {
        error:
          "Ask your guardian to enable AI conversations for this Explorer. The offline word guide still works.",
      },
    };
  }
  const question = typeof b.question === "string" ? b.question.trim() : "";
  if (!question || question.length > 500) {
    return {
      status: 400,
      body: { error: "Please ask a question under 500 characters." },
    };
  }
  const safety = safetyReply(question);
  if (safety) {
    return {
      status: 200,
      body: {
        reply: safety,
        tool: "chat",
        entryId: null,
        safety: true,
        saved: false,
        mode: "safety",
      },
    };
  }
  if ((await db.rpc("lb_quota")).error) {
    return {
      status: 429,
      body: {
        error:
          "Moli needs a little rest. Try the word cards and come back later.",
      },
    };
  }
  const key = Deno.env.get("DEEPSEEK_KEY");
  if (!key) {
    return {
      status: 503,
      body: {
        error:
          "Live Moli is unavailable. You can switch to the offline word guide.",
      },
    };
  }
  const settings = settingsOf(b.settings),
    state = context.save ? context.state : null;
  const history = safeTurns(state?.messages || b.history).slice(-12);
  const candidate = typeof b.activeEntry === "string"
    ? b.activeEntry
    : state?.activeEntry;
  const active = vocabulary.some((v) => v.id === candidate) ? candidate : null;
  const selected = lookupVocabulary(question, settings.language, active);
  const entries = vocabulary.filter((v) =>
    v.language === settings.language && v.reviewStatus === "reference-checked"
  );
  const result = await learningProvider(key).respond({
    settings,
    ageBand: context.ageBand,
    activeEntry: selected?.id || active || null,
    vocabulary: entries.map((v) => ({
      id: v.id,
      concept: v.conceptId,
      word: v.pronunciation.text,
      meaning: v.meaning,
      examples: v.examples,
    })),
    tools: companionTools,
  }, [...history.map((t) => ({ role: t.role, content: t.content })), {
    role: "user",
    content: question,
  }]);
  if (!result || typeof result !== "object") {
    throw Error("Invalid learning response");
  }
  const r = result as Record<string, unknown>;
  if (
    typeof r.reply !== "string" || !r.reply.trim() || r.reply.length > 700 ||
    safetyReply(r.reply) || /<[^>]+>/.test(r.reply) ||
    !companionTools.includes(r.tool as CompanionTool)
  ) throw Error("Learning response could not be checked");
  const tool = r.tool as CompanionTool;
  const entry = entries.find((v) => v.id === r.entryId) || selected;
  if (
    [
      "lookup_vocabulary",
      "get_pronunciation",
      "generate_example",
      "create_practice",
    ].includes(tool) && !entry
  ) throw Error("No checked word was found");
  let reply = r.reply.trim();
  // The model may choose a checked example, never overwrite dictionary facts or answers.
  if (tool === "generate_example" && entry) {
    reply = entry.examples.includes(String(r.example))
      ? String(r.example)
      : entry.example;
  }
  const entryId = entry?.id || null;
  const now = new Date().toISOString();
  const next: CompanionState = {
    settings,
    activeEntry: entryId,
    messages: [...safeTurns(state?.messages || b.history), {
      role: "user",
      content: question,
      at: now,
      mode: "ai",
    }, {
      role: "assistant",
      content: reply,
      at: now,
      mode: "ai",
      ...(entryId ? { entryId } : {}),
    }].slice(-40) as CompanionState["messages"],
  };
  let saved = false, revision = context.revision;
  if (context.save) {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const committed = await service.rpc("lb_moli_commit", {
      e: b.explorer,
      owner_id: owner,
      expected: context.revision,
      payload: next,
    });
    if (committed.error) {
      return {
        status: 409,
        body: {
          error:
            "Your conversation or permission changed. Reopen Meet Moli before sending again.",
        },
      };
    }
    saved = true;
    revision = committed.data;
  }
  return {
    status: 200,
    body: { reply, entryId, tool, state: next, saved, revision, mode: "ai" },
  };
}
