# Children's Create: morning bakery

Start at /learn/ → Make & play → /create/. The home Creation card, hero's Create a Story link and library Create link use the same chooser. Free Creation links to the existing young-creator 2D board, retaining its scene generation, local drafts and adult AI controls. Teacher authoring, Read handoffs and creator project data remain separate.

## Activity
Original, fixed-content French prototype, not a fictional teacher endorsement or a published course. No LLM calls, microphone, scoring or external assets in the guided activity. Content and deterministic transition rules live in lib/learner/bakery.ts; there is no client action to award mastery. Language checks: daytime greeting [bonjour](https://dictionnaire.lerobert.com/definition/bonjour); feminine [baguette](https://dictionnaire.lerobert.com/definition/baguette) in the bread sense, masculine [croissant](https://dictionnaire.lerobert.com/definition/croissant) in the pastry sense. Illustrations and scenarios are app-authored. A teacher pilot before broader rollout is still recommended.

Both modes use the same DOM stop renderer and layoutStops geometry. The bakery adds a layered shopfront, visitor, SVG pastries and Moli; native controls work with touch or keyboard, without WebGL or optional movement. Follow the goal, explore both items, greet a customer, choose a shop name/sign/awning and left-hand basket, save, reflect, revisit for three retrieval prompts. The next round varies the order. Retries are allowed; hints, wrong choices and prompted successes are practice evidence, not proof of independent mastery.

## Persistence & privacy
Local browser storage only: versioned activity key per guest, account or account + active Explorer. Saves include the two explored objects, completed steps, current arrangement, last explicitly saved shop, fixed reflection choice, latest 40 fixed-choice attempts with hint flags/feedback, practised objectives, review position and completed rounds. No user-entered text, identity details, transcript or shared creation. Household members using guest mode share that browser's guest slot; Start over clears it explicitly. Local storage is not an account vault or a cross-device backup.

For a selected Explorer, check the signed-in guardian's RLS-scoped Explorer record and save_memories setting before reading/writing that slot. Pending/revoked/inaccessible/no permission → session only, not a fallback to guest storage. Storage failure does not prevent playing. No database migrations or new credentials.

## Test
npm run test:bakery checks state progression, actual answer/feedback logic, drafts vs saved shop, repeat review, corruption and scoped keys. npm run build exports the route. With out/ served locally and Playwright supplied through NODE_PATH, run node scripts/test-learner-bakery-browser.cjs (default port 3022). It exercises the campus link, both screen sizes, wrong answers, hints, creation, reload/review/reset, storage failure and mocked family preferences; it does not modify any real family account.
