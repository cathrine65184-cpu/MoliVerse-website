# Culture Weekly and French bakery discovery

## Routes
- `/culture/`: editorial issue list.
- `/culture/peace-in-ukraine/`: first co-reading preview, with expandable vocabulary and direct source references.
- `/explore/`: French bakery card participates in language and text filters.
- `/create/?adventure=morning-bakery`: opens the existing deterministic lesson directly. Saved browser progress and guardian saving preferences are unchanged.

## Editorial boundary
The submitted geopolitical essay is a topic reference, not a verified current-news source. The new text is an original short educational explainer, with UN terminology and UNICEF co-reading guidance. It distinguishes explanation, proposal and prediction. It does not reproduce the submitted graphic wording, unverified quotation, predicted borders/dimensions, or supplied images. Images/stickers are not imported. No claim of permission or independent editorial approval is made.

The issue is explicitly an editorial preview; Culture routes have noindex metadata. No production deployment or email newsletter delivery is part of this change. Before deployment, review wording, audience suitability, factual sources and any future image rights. Noindex is not access control: do not put private source material in these static pages.

Add future issues in `lib/cultureWeekly.ts`; the archive and static detail routes use the same data. This first implementation supports previews only, not an editorial CMS, scheduled distribution or automatic news generation. Source links are external; nothing remote is embedded. Discussion prompts collect no answers.

## Checks
`node scripts/test-culture-weekly.cjs`

`npm run test:bakery`

`npx tsc --noEmit`

`npm run build`

Serve `out/` on port 3022, then run `scripts/test-culture-weekly-browser.cjs` and `scripts/test-learner-bakery-browser.cjs` with Playwright available in NODE_PATH. Tests use isolated browser profiles and block Supabase; they do not use production accounts or paid model calls.
