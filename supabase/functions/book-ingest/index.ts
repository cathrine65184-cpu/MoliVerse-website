import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkEducatorAccess, checkMaterialRights } from '../_shared/gate.ts';
import { buildIngestMessages, normalizeIngest, parseIngestResponse, WINDOW_PAGES } from '../../../lib/bookIngest.ts';

// Educator-side helper: reads ONE window (up to 8 pages) of a book that the browser has already split into pages,
// and asks DeepSeek for focus words, a one-line summary and up to 2 tap-only games. Everything returned is checked
// against those pages (words must appear, games must pass the shared validator). Nothing is stored or published here;
// the educator reviews the result. Children never call this function.
//
// Deploy:  supabase functions deploy book-ingest
// Secret:  supabase secrets set DEEPSEEK_KEY=...   (the same key as story-game-ideas)

const DEMO_STORIES = ['moli-lantern-seed'];
const MAX_BODY = 60_000;

async function callDeepSeek(key: string, messages: Array<{ role: string; content: string }>) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(45000),
    body: JSON.stringify({ model: 'deepseek-chat', response_format: { type: 'json_object' }, temperature: 0.3, max_tokens: 2800, messages }),
  });
  if (!response.ok) return null;
  const result = await response.json();
  return result.choices?.[0]?.message?.content ?? null;
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
    if (raw.length > MAX_BODY) return reply(413, { message: 'This part of the book is too large.' });
    const body = JSON.parse(raw);
    const pages = Array.isArray(body.pages) ? body.pages.map((page: { page?: unknown; text?: unknown }) => ({ page: Number(page?.page), text: typeof page?.text === 'string' ? page.text : '' })) : [];
    if (pages.length < 1 || pages.length > WINDOW_PAGES || pages.some((page: { page: number; text: string }) => !Number.isInteger(page.page) || !page.text.trim() || page.text.length > 4000)) return reply(400, { message: 'Invalid book pages.' });
    const index = Number.isInteger(body.windowIndex) && body.windowIndex >= 0 && body.windowIndex < 1000 ? body.windowIndex : 0;
    const title = typeof body.title === 'string' ? body.title.slice(0, 180) : '';

    const denied = await checkMaterialRights(client, (who as { userId: string }).userId, DEMO_STORIES, body);
    if (denied) return reply(denied.status, { message: denied.message });

    const key = Deno.env.get('DEEPSEEK_KEY');
    if (!key) return reply(503, { message: 'DeepSeek is not configured on the server. Nothing was changed.' });

    const window = { index, pages };
    const content = await callDeepSeek(key, buildIngestMessages(title, window, { language: String(body.language || ''), ageRange: String(body.ageRange || ''), level: String(body.level || '') }));
    if (content === null) return reply(502, { message: 'The book assistant could not be reached. Nothing was changed.' });
    const parsed = parseIngestResponse(content);
    if (!parsed) return reply(502, { message: 'The assistant answered in an unexpected format. Nothing was changed; please try again.' });
    const result = normalizeIngest(parsed, window, title);
    if (!result.vocab.length && !result.games.length) return reply(502, { message: 'Nothing from this part passed the checks. Nothing was changed; please try again.', rejected: result.rejected });
    return reply(200, { ...result, message: 'Review this before using it.' });
  } catch (error) {
    console.error('book-ingest', error instanceof Error ? error.message : String(error));
    return reply(500, { message: 'A temporary problem occurred. Nothing was changed.' });
  }
});
