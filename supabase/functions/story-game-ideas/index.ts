import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkEducatorAccess, checkMaterialRights } from '../_shared/gate.ts';
import { buildIdeaMessages, normalizeGames, parseIdeaResponse, type StoryInput } from '../../../lib/storyGames.ts';

// Educator-side helper: asks DeepSeek for extra tap-only games built from ONE story, then keeps only the games
// that pass validateGameSpec (verbatim sentences, story words only, no HTML). Nothing is stored or published here:
// the educator reviews the returned games before adding them to the story. Children never call this function.
//
// Deploy:  supabase functions deploy story-game-ideas
// Secret:  supabase secrets set DEEPSEEK_KEY=...   (the same key immersive-author uses)

const DEMO_STORIES: string[] = [];
const MAX_BODY = 250_000;

async function callDeepSeek(key: string, messages: Array<{ role: string; content: string }>) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(45000),
    body: JSON.stringify({ model: 'deepseek-chat', response_format: { type: 'json_object' }, temperature: 0.5, max_tokens: 2400, messages }),
  });
  if (!response.ok) return null;
  const result = await response.json();
  return result.choices?.[0]?.message?.content ?? null;
}

function cleanStory(raw: unknown): StoryInput | null {
  const value = raw as Partial<StoryInput> | null;
  if (!value || typeof value.title !== 'string' || !Array.isArray(value.pages) || !Array.isArray(value.vocab)) return null;
  if (value.pages.length < 1 || value.pages.length > 60 || value.vocab.length > 30) return null;
  const pages = value.pages.map(page => ({ page: Number(page?.page), text: typeof page?.text === 'string' ? page.text : '' }));
  if (pages.some(page => !Number.isInteger(page.page) || !page.text || page.text.length > 4000)) return null;
  const vocab = value.vocab
    .filter(item => item && typeof item.word === 'string' && typeof item.meaning === 'string')
    .map(item => ({ word: item.word.slice(0, 24), meaning: item.meaning.slice(0, 120), page: Number(item.page) || 1 }));
  return { title: value.title.slice(0, 180), pages, vocab };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const allowed = ['https://moliverse.tech', 'https://www.moliverse.tech', 'http://localhost:3015'];
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : 'https://moliverse.tech', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, { message: 'Use POST.' });
  try {
    const auth = req.headers.get('authorization') || '';
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const who = await checkEducatorAccess(client, DEMO_STORIES, {});
    if (who.status !== 200) return reply(who.status, { message: who.message });

    const raw = await req.text();
    if (raw.length > MAX_BODY) return reply(413, { message: 'This story is too large.' });
    const body = JSON.parse(raw);
    const story = cleanStory(body.story);
    if (!story) return reply(400, { message: 'Invalid story.' });

    const denied = await checkMaterialRights(client, (who as { userId: string }).userId, DEMO_STORIES, body);
    if (denied) return reply(denied.status, { message: denied.message });

    const key = Deno.env.get('DEEPSEEK_KEY');
    if (!key) return reply(503, { message: 'DeepSeek is not configured on the server. Nothing was changed.' });

    const focusWords = Array.isArray(body.focusWords) ? body.focusWords.filter((word: unknown) => typeof word === 'string').slice(0, 8) : [];
    const content = await callDeepSeek(key, buildIdeaMessages(story, {
      focusWords, language: String(body.language || '').slice(0, 40), ageRange: String(body.ageRange || '').slice(0, 20), level: String(body.level || '').slice(0, 40),
    }));
    if (content === null) return reply(502, { message: 'The game assistant could not be reached. Nothing was changed.' });
    const proposed = parseIdeaResponse(content);
    if (!proposed) return reply(502, { message: 'The assistant answered in an unexpected format. Nothing was changed; please try again.' });
    const { games, rejected } = normalizeGames(proposed, story);
    if (!games.length) return reply(502, { message: 'None of the proposed games passed the safety checks. Nothing was changed; please try again.', rejected });
    return reply(200, { games, rejected, message: 'Review these games before adding them to the story.' });
  } catch (error) {
    console.error('story-game-ideas', error instanceof Error ? error.message : String(error));
    return reply(500, { message: 'A temporary problem occurred. Nothing was changed.' });
  }
});
