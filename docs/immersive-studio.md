# Immersive course studio — local test release

Run `npm run dev -- --port 3015`, then open `/teach/studio/`.
The previous identity workbench is retained at `/teach/identity/`.

## Implemented

- Structured `CourseWorld` data drives the raw Three.js scene, inspector, task player and constrained edit commands.
- Seven sequential activities in an original Penang night-market sample: introduction, four picture/word matches, two spatial clues, polite dialogue, recipe discovery, ingredient selection and sentence creation.
- Orbit controls and raycast selection; procedural assets (no third-party model licensing dependency), reduced-motion marker handling, mobile tabs, keyboard-accessible scene shortcuts and equivalent 2D mode.
- Teacher course snapshots reuse saved Teacher DNA where signed in. Course editing never writes teacher defaults.
- Image references and PDF text-layer/DOCX/TXT/MD extraction use existing utilities. No OCR, vision inference or original-document cloud upload. Maximum 5 MB per file / 8 MB course JSON.
- IndexedDB drafts keyed by teacher ID or local guest, 20 undo snapshots, JSON export/import, separate local release snapshot. Local data is not a substitute for a secure cloud record; do not use shared-device guest drafts for private learner data.
- Task-aware Moli guide with configurable opening and hints, animated mascot UI, a moving procedural 3D deer, and an explicitly labelled browser voice preview. Moli is not presented as a teacher or digital human. No automatic audio, microphone, camera, cloning, teacher email, or fabricated human reply.

## Connected creation backend

`supabase/functions/immersive-author/index.ts` is an authenticated DeepSeek game-edit endpoint for educators and adult-guided young creators. It uses `DEEPSEEK_KEY`, returns reviewed patches, rejects unsafe or invalid changes, and treats uploaded text and conversation history as untrusted reference. It does not publish content or create arbitrary executable HTML or scripts. Images are omitted from model input.

This is not yet an unrestricted new-world generation service. The editor calls DeepSeek through the server proxy and never silently falls back to fake generation. Cloud draft storage, marketplace publication, learner progress persistence and automatic Human Moment notifications are not enabled in this local release.

## Verification

- `node scripts/test-immersive.cjs`: schema, seven tasks, shared edits, original immutability, six invalid patches, command handling, release isolation.
- `npm run build`: Next compilation, type/lint checks and static export.
- Browser: real 3D rendering; seven-step player completed using 2D/accessible shortcuts; wrong dialogue response gives hint; two ingredients create the final sentence; object/task/Moli edits save; reload restores draft; undo survives reload; local release created. Desktop and mobile layouts reviewed.
- `immersive-author` version 1 is deployed and ACTIVE in project `fiycuwnimmhnxnaiwvud`. The deployed runtime was verified to load and enforce authenticated creator access. A complete model edit still requires a signed-in teacher or learner session in the browser. Actual WebGL context loss and PDF/DOCX uploads were not exercised in this test session.

The Edge Function was deployed. No database migration or production frontend deployment was performed.
