# Creator Moli access and onboarding

## Root cause
The old browser and `creator-moli` function both required exactly `app_metadata.creator_moli_adult === true`. The browser collapsed signed-out, unverified and restricted states into the same invitation message. Choosing teacher at sign-up was not and must not be proof of adulthood. Production inspection found Catherine's profile was `teacher`, with no adult invitation or staff flag. It also found the Creator Moli function and notebook tables were not yet deployed.

## Separate capabilities
- **Private brainstorming:** authenticated teacher/creator profile + an independently verified adult record, or an existing trusted admin-issued adult invitation. No public profile approval required.
- **Adult review:** server-managed `creator_age_reviewer` permits only adult eligibility review. `moli_admin` can also review, but neither can verify their own account. App metadata is read from the current Auth user record in SQL, not editable user metadata or a stale session claim.
- **Submission/publication:** existing `lb_creators` identity approval and independent per-content review remain separate. Adult verification never writes these records. Creator Moli's private submission action now checks approved creator status too.
- **Restricted:** student profiles, explicit restrictions and revoked adult checks cannot call Creator Moli even with a legacy invitation flag. No anonymous AI demo or checkbox-based instant access.

`supabase/creator-access.sql` is additive and rerunnable. It stores a request, status, reviewer, method and non-identifying case reference, with an audit trail. No identity document, date of birth or child message is stored. Staff must complete an appropriate live or trusted-provider adult check externally before recording verification; this UI is not an automated identity service. Requests alone never enable AI. Access is rechecked at the Edge Function on each request.

## Routes and UI
- `/teach/` has the three reference cards: Share a Learning Experience, Brainstorm with Moli, Set up your profile. No teacher “Make a story world” CTA. Reading import and real workshops remain secondary links.
- `/teach/studio/?mode=young-creator` and `/teach/creator/` open the same adult Creator Moli experience. Explicit source handoffs/story-game links and `?workspace=learner` retain the learner editor, not an adult-permission shortcut. Learner navigation points to `/create/`.
- `/teach/verification/` is the narrow reviewer desk. Self-review is prohibited in SQL.
- Account links use allowlisted `next=creator`, not arbitrary redirect URLs. Email confirmation and missing profile setup are handled without issuing adult privileges.
- Unsigned, unverified, pending, eligible, restricted, missing-profile and service-failure states have distinct actions. Eligible adults explicitly open their notebooks. Model processing is disclosed.

Existing real DeepSeek streaming, 12-turn context, saved project revisions, user-confirmed Idea Board and course draft versions remain. Errors do not replace a saved notebook with fake content. The live provider is configured with the existing server `DEEPSEEK_KEY`; no key is added to the frontend or changed by this feature.

## Deployment sequence
Confirm the target and check whether prerequisite tables already exist. Do not re-run non-idempotent V2 platform migrations:
1. `creator-moli.sql` if absent.
2. If absent, `learn-build-platform.sql`, `open-publishing.sql`, `platform-admin.sql` in that order, requiring the existing families/Auth/Storage foundations.
3. `creator-access.sql`.
4. Deploy `creator-moli`. Its signed-in user is verified with `auth.getUser()` and a service-only eligibility RPC. Gateway JWT verification can be disabled for modern Supabase keys without bypassing these server checks. Deploy the existing V2 `platform-media` and `world-moli` only with their per-action auth/consent checks retained.
5. Assign only specifically authorised reviewer roles through trusted admin tooling; never automatically approve an adult or grant full publication admin.
6. Build and deploy the static export through the existing GitHub Pages workflow. No force push.

Secure file uploads remain disabled when the private scanning worker is not configured; the Share form offers an authorised HTTPS resource instead. Image generation and inactive native rewards are not silently enabled.

## Verification
- `npm run test:creator`: actual endpoint and provider adapter with synthetic auth/storage/model; 11 contextual multi-turn cases, saves, review, permission denial, retry.
- `NODE_PATH=<pglite-node-modules> node scripts/test-creator-access-sql.cjs`: actual PostgreSQL, migration twice, role isolation, restricted/child/metadata spoofing/self-review denial, manual verification, audit, no publication side effects.
- `NODE_PATH=<playwright-node-modules> node scripts/test-creator-access-browser.cjs`: seven access states, non-granting application, creator sign-up intent and responsive three-card entry.
- `NODE_PATH=<playwright-node-modules> node scripts/test-creator-moli-browser.cjs`: desktop/mobile multi-turn notebook, Idea Board edits, saved version reload, separate reviewed submission with test doubles.
- Standard library/vocab/games/ingest/bakery/immersive/platform regression suites, TS and static build.

Live acceptance needs a legitimately verified adult account. Catherine's reviewer role alone is deliberately not adult verification of herself. Do not label mocked model tests as a live DeepSeek conversation, and do not create synthetic “verified adults” in production just to pass a test. Another independent appointed reviewer must verify her, or an already legitimately verified adult must perform the live test. Human review staffing and turnaround remain operational responsibilities.
