# Meet Moli — language companion V1

Entry: `/meet-moli/`. Campus, homepage Meet Moli and `/ask/` lead here. Creator Moli, educator studio, adult messaging and room editing remain separate.

## Real capabilities

- Offline, explicitly labelled word guide: 14 concepts / 28 French and English entries, checked dictionary attribution, original example bank, local-device pronunciation, deterministic practice and review. No API request for offline questions.
- Live, opt-in DeepSeek conversation through the existing `world-moli` Edge Function, `action: companion`. Guardian-linked active Explorer and `ai_mentor_enabled` are checked server-side on every request. Existing per-user quota, 500-character question cap, 25-second timeout, short replies, restricted JSON tools and input/output safety checks apply.
- Model tools select checked cards, examples, practice or review; they cannot write arbitrary data, mark mastery, publish, edit the room or grant rewards. UI handles explicit save-word and deterministic checks through existing vocabulary RPCs.
- Multi-turn context contains up to 12 recent turns, language/level/support language, age band and checked vocabulary. It contains no account IDs, Explorer nickname or email. Obvious personal/contact details and distress signals are intercepted before the provider and not persisted.
- Private conversations retain at most 40 turns when both AI and memory consent are on. With memory off, live conversation stays in the tab. Consent revocation deletes stored companion conversation immediately. Clear conversation deletes the cloud conversation without deleting vocabulary or room.
- Anonymous offline state uses `moliverse:meet-moli:guest:v1`; vocabulary uses existing `moliverse:room-vocabulary:v1:guest`. Storage exceptions do not block learning. Signed-in users never fall back to saving sensitive conversations in browser storage.
- Review uses separate discovery/practice/review records, never a mastery flag. The approved Apple Basket challenge remains server-scored. Eight fruit/animal decorations are free, independent of rewards.

## Limits, intentionally visible

- French and English checked cards only. General AI help is labelled AI and may be wrong. Spanish/Portuguese/Chinese can be selected as AI explanation languages, not as fully checked target-language dictionaries.
- Examples are selected from a checked short bank, not unrestricted model-generated sentences. This version offers recognition practice; matching, fill-in-the-blank and sentence assembly can follow.
- Listen uses installed local device TTS (including the example). No microphone, voice cloning, recorded-human claim or pronunciation score. If a local matching voice is unavailable, audio is disabled with an explanation.
- Account language settings are included in the next saved AI turn; unsent settings changes are not independently synced. Guest settings save locally.
- Conversation retrieval excludes turns older than 30 days; the context RPC removes expired snapshots when opened. No scheduled retention job is implied unless explicitly installed. Existing vocabulary retention/deletion controls are unchanged.
- Rule-based filtering plus a restricted child prompt is not a comprehensive moderation service. Wider dictionary coverage, external moderation evaluation and family usability testing remain follow-ups. No user-identifying fields are deliberately sent; users should not type private details.

## Data / deployment

Apply in order (additive, idempotent; no rights or consent overrides):

```sh
npx supabase db query --remote=fiycuwnimmhnxnaiwvud --file supabase/meet-moli-assets.sql --yes
npx supabase db query --remote=fiycuwnimmhnxnaiwvud --file supabase/growing-world-vocabulary-seed.sql --yes
npx supabase db query --remote=fiycuwnimmhnxnaiwvud --file supabase/meet-moli.sql --yes
npx supabase functions deploy world-moli --remote=fiycuwnimmhnxnaiwvud --use-api --no-verify-jwt --yes
```

Existing `DEEPSEEK_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` remain server-only. Optional `WORLD_MOLI_MODEL` overrides `deepseek-chat`. `--no-verify-jwt` disables only the gateway's legacy JWT check; the function calls `auth.getUser()` and the RPCs enforce ownership/guardian consent. No secret changes required.

`lb_moli_sessions` is inaccessible directly to anon/authenticated roles. Only guardian-scoped RPC reads/deletes and service-only optimistic-revision commits are allowed. Do not grant client write access.

## Verification

```sh
npm run test:companion
npm run test:growing
npm run test:platform
npx tsc --noEmit
npx tsc --noEmit -p scripts/edge-test/v2-check.json
npm run build
python3 -m http.server 3022 --bind 127.0.0.1 --directory out
node scripts/test-meet-moli-browser.cjs
```

SQL tests require PGlite; browser tests require Playwright/Chrome (use the existing development tool directories via NODE_PATH). Tests use synthetic accounts/local PostgreSQL and mocked DeepSeek; no production child messages or paid model calls.

Try: choose Apple → Add to my words → Practise → answer → My words to revisit → reload. For live mode, sign into a guardian account with an active Explorer, enable the existing guardian AI preference, then explicitly turn on Use live Moli. Ask “How do I say apple in French?” then “Can we practise it?”

## Art provenance

`public/room-art/fruit-friends.png` is a self-hosted transparent 4×2 sprite atlas, 1774×887, generated with the imagegen tool from the user's fruit/animal reference. Official Moli was not regenerated. Sprite clipping is declarative SVG; the source PNG is not destructively cropped.

Prompt summary: extract/recreate eight standalone watercolor stickers from the supplied sheet; top row apple, strawberry, banana, orange; bottom row orange kitten, brown puppy, white rabbit, blue bird; four equal columns/two rows; generous padding; transparent alpha; remove backdrop, text and scenery; preserve watercolor appearance; no Moli character.

Dictionary references and CC BY-SA attribution are stored with each vocabulary entry and shown in word cards. Child-friendly English definitions are adapted; examples are original MoliVerse wording.
