import {
  type VocabEvent,
  vocabulary,
  type VocabularyEntry,
} from "./vocabulary.ts";
import { defaultFilter } from "../sensitiveFilter.ts";

export type LearningSettings = {
  language: "fr" | "en";
  level: "Beginner" | "A1" | "A2";
  supportLanguage: "en" | "zh" | "pt" | "es";
};
export const defaultLearning: LearningSettings = {
  language: "fr",
  level: "Beginner",
  supportLanguage: "en",
};
export type LearningTurn = {
  role: "user" | "assistant";
  content: string;
  at: string;
  entryId?: string;
  mode?: "ai" | "offline";
};
export type CompanionState = {
  settings: LearningSettings;
  messages: LearningTurn[];
  activeEntry: string | null;
};
export const emptyCompanion = (): CompanionState => ({
  settings: { ...defaultLearning },
  messages: [],
  activeEntry: null,
});
export function settingsOf(value: unknown): LearningSettings {
  const s = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  return {
    language: s.language === "en" ? "en" : "fr",
    level: s.level === "A1" || s.level === "A2" ? s.level : "Beginner",
    supportLanguage: ["zh", "pt", "es"].includes(String(s.supportLanguage))
      ? s.supportLanguage as LearningSettings["supportLanguage"]
      : "en",
  };
}
export function safetyReply(text: string): string | null {
  if (
    /nobody loves me|no one loves me|hurt myself|kill myself|want to die|自杀|不想活|没人爱我|伤害自己/i
      .test(text)
  ) {
    return "I’m sorry this feels so hard. You matter. Please tell a trusted grown-up nearby how you feel. If you are in danger, ask them for urgent help now. You do not need to share private details here.";
  }
  if (
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\d[ ()-]*){9,}|my (address|phone number|full name) is|我的(住址|电话|真名)|https?:\/\/|www\./i
      .test(text)
  ) {
    return "Let’s keep names, contact details and private information out of our chat. You can ask about a word or a sentence without those details.";
  }
  const hits = defaultFilter.findAll(text).some((m) =>
    !/[a-z]/i.test(m.word) ||
    !(/[a-z]/i.test(text[m.start - 1] || "") ||
      /[a-z]/i.test(text[m.end] || ""))
  );
  if (
    hits || /porn|sexual|nude|裸照|色情|秘密见面|secret meeting/i.test(text)
  ) {
    return "I can help with kind words and language practice. For something upsetting or unsafe, please talk with a trusted grown-up.";
  }
  return null;
}
export function safeTurns(value: unknown, now = Date.now()): LearningTurn[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-40).filter((t) =>
    t && ["user", "assistant"].includes(t.role) &&
    typeof t.content === "string" && t.content.length <= 700 &&
    !safetyReply(t.content) && Number.isFinite(Date.parse(t.at)) &&
    Date.parse(t.at) > now - 30 * 86400000 && Date.parse(t.at) < now + 60000
  ).map((t) => ({
    role: t.role,
    content: t.content,
    at: t.at,
    ...(typeof t.entryId === "string" &&
        vocabulary.some((v) => v.id === t.entryId)
      ? { entryId: t.entryId }
      : {}),
    mode: t.mode === "ai" ? "ai" : "offline",
  }));
}
export function restoreCompanion(raw: string | null): CompanionState {
  try {
    const s = JSON.parse(raw || "null");
    if (!s || typeof s !== "object") return emptyCompanion();
    return {
      settings: settingsOf(s.settings),
      messages: safeTurns(s.messages),
      activeEntry: vocabulary.some((v) => v.id === s.activeEntry)
        ? s.activeEntry
        : null,
    };
  } catch {
    return emptyCompanion();
  }
}
const aliases: Record<string, string[]> = {
  apple: ["苹果"],
  banana: ["香蕉"],
  strawberry: ["草莓"],
  orange: ["橙子"],
  cat: ["猫", "kitten", "cats"],
  dog: ["狗", "puppy", "dogs"],
  rabbit: ["兔子", "bunny"],
  bird: ["鸟"],
  chair: ["椅子"],
  table: ["桌子"],
  lamp: ["灯"],
  book: ["书"],
  bed: ["床"],
  rug: ["地毯"],
};
export function lookupVocabulary(
  text: string,
  language: string,
  activeId?: string | null,
): VocabularyEntry | undefined {
  const lower = text.toLowerCase();
  const match = vocabulary.find((v) =>
    [v.word, v.conceptId, ...(aliases[v.conceptId] || [])].some((w) =>
      /[\u3400-\u9fff]/.test(w)
        ? lower.includes(w)
        : new RegExp("(^|[^a-zà-ÿ])" + w + "([^a-zà-ÿ]|$)", "i").test(lower)
    )
  );
  const followUp =
    /\b(it|that|this|example|sentence|pronunciation|listen|again|practice|practise|quiz)\b|这个|它|例句|发音|练习|再说/i
      .test(text);
  const concept = match?.conceptId ||
    (followUp
      ? vocabulary.find((v) => v.id === activeId)?.conceptId
      : undefined);
  return vocabulary.find((v) =>
    v.conceptId === concept && v.language === language &&
    v.reviewStatus === "reference-checked"
  );
}
export type CompanionTool =
  | "lookup_vocabulary"
  | "get_pronunciation"
  | "generate_example"
  | "create_practice"
  | "get_review_words"
  | "chat";
export const companionTools: CompanionTool[] = [
  "lookup_vocabulary",
  "get_pronunciation",
  "generate_example",
  "create_practice",
  "get_review_words",
  "chat",
];
export function localTool(text: string): CompanionTool {
  if (/review|remember|复习/i.test(text)) return "get_review_words";
  if (/quiz|practi[cs]e|test|练习/i.test(text)) return "create_practice";
  if (/pronoun|listen|hear|发音|怎么读/i.test(text)) return "get_pronunciation";
  if (/example|sentence|例句|造句/i.test(text)) return "generate_example";
  return "lookup_vocabulary";
}
export function reviewWords(events: VocabEvent[], language: string) {
  const ids = Array.from(new Set(events.map((e) => e.entry))).filter((id) =>
    vocabulary.some((v) => v.id === id && v.language === language)
  );
  return ids.sort((a, b) => {
    const score = (id: string) =>
      events.filter((e) => e.entry === id && e.correct === false).length;
    return score(b) - score(a);
  }).slice(0, 12);
}
export function assetForEntry(entry: VocabularyEntry) {
  return entry.conceptId;
}
export function offlineAnswer(
  text: string,
  settings: LearningSettings,
  active: string | null,
) {
  const safety = safetyReply(text);
  if (safety) {
    return {
      reply: safety,
      entryId: null,
      tool: "chat" as CompanionTool,
      safety: true,
    };
  }
  const entry = lookupVocabulary(text, settings.language, active),
    tool = localTool(text);
  return {
    reply: entry
      ? (tool === "generate_example"
        ? `Try this checked example: ${entry.example}`
        : tool === "create_practice"
        ? `Let’s try a little practice with ${entry.pronunciation.text}.`
        : tool === "get_pronunciation"
        ? `Tap Listen to hear ${entry.pronunciation.text}, then try saying it yourself.`
        : `In ${
          settings.language === "fr" ? "French" : "English"
        }, ${entry.conceptId} is ${entry.pronunciation.text}. Would you like to listen or try it?`)
      : "Offline word guide: try apple, cat, chair or another word in the checked collection. A guardian can enable live Moli for wider language questions.",
    entryId: entry?.id || null,
    tool,
    safety: false,
  };
}
