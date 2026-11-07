# My Growing World

`/create/` and `/create/world/` open the same furnished, directly editable room. Existing saved rooms (including deliberately empty rooms) are preserved. The old bakery remains accessible at `/create/?adventure=morning-bakery`; the Course Plaza now points to the original China role-play at `/moli-journey/`.

## Data and safety

- Guest rooms/vocabulary stay on this device. Active Explorers require existing guardian saving consent for private cloud storage; without consent the room is session-only.
- `lb_worlds` retains its existing revision checks. New private `lb_vocab_events` and `lb_room_preferences` use `lb_access`, RLS and authenticated RPCs. Direct writes are denied. Discovery, practice and review are separate; no mastery rating is created.
- The approved three-question apple activity is scored by the existing server RPC, not a model or browser reward flag. The operational approval SQL records the explicit user approval and grants no account roles.
- Optional Moli remains guardian-consent gated. Core decorating and practice use no model. Vocabulary examples returned by Moli are constrained to the checked example bank on both server and client.

## Vocabulary and pronunciation

`lib/platform/vocabulary.ts` contains seven stable concepts and separate French/English entries. Assets map to concepts independently of language. Missing translations remain unavailable. Definitions are adapted from the individually linked Wiktionnaire entries, CC BY-SA 4.0; MoliVerse authored the short examples. These are reference-checked starter entries, not a claim of independent educator review.

Listen uses an installed local device voice only. No microphone, default wrong-language voice or remote TTS fallback is used. If no matching local voice exists, the UI explains that pronunciation is unavailable. No studio recording is bundled. `choosePronunciation` also supports future self-hosted recordings.

## Art

The four sheets in `public/room-art/` were supplied by the project owner for this implementation (bedroom, decor, cafe and reading). They are not asserted to be public-domain or openly licensed. `roomArt.ts` defines isolated SVG crops, preserving the original supplied artwork. No external image host is needed. These source PNG sheets total about 9.5 MB; a later asset optimization pass can reduce mobile transfer size.

## Database / function

Apply in order: `supabase/growing-world.sql`, `supabase/growing-world-vocabulary-seed.sql`. `scripts/vocabulary-seed.cjs` reproduces the seed from the shared TypeScript data. The dated apple approval script is specific to this authorized release, not a general migration to approve future activities.

Deploy `world-moli` after the migrations. It retains server-side authentication, guardian permission and quota checks and uses existing `DEEPSEEK_KEY`; no new secret is required.

## Verification

`npm run test:growing` needs `@electric-sql/pglite` available in NODE_PATH (as do existing platform SQL tests). It uses an isolated PostgreSQL database, not production. `scripts/test-growing-world-browser.cjs` needs Playwright and a static export served at port 3022. Its PostgREST bridge is mocked; SQL permission, scoring and persistence are real PGlite. It covers desktop/mobile decoration, chair vocabulary, three-question unlock, private save/reopen/review, guest persistence and the original game entry. Live authenticated production and audible pronunciation on every device are not implied by these tests.
