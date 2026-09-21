# Corinne's 中文 Tiger

A static, local-first Primary 1 Chinese PWA. V0.3 combines the existing five-minute mission with focused 听写 practice, parent-scoped revision, local progress, Hanzi Writer, and a coin-funded Tiger House.

## V0.3 experience

The home screen has four child-facing choices: **Today's Mission**, **Practice 听写**, **Revision**, and **Tiger House**. Parent settings remain behind a small grown-up link.

Today's Mission preserves the V0.2 path: Tiger intro → see and hear → listen and recognise → write → recall → reward. New missions select three active 听写 items and at most two writing characters. Valid same-day 4+4 missions saved by an older development build remain resumable.

Practice 听写 supports current and archived sets, Study or Test, and 3, 5, or all items. Short sessions prioritise reliable weak evidence, then not-yet-practised and least-recently-practised items, while reserving room for unseen set content. Study shows the curated answer data and uses guided Hanzi Writer. Test plays audio and uses a blank pointer-event canvas for finger or S Pen writing. **Check answer** remains disabled until audio succeeds and the child makes a stroke; clearing the canvas disables it again. It then records the child's immutable first self-check separately from eventual completion. It does not perform OCR or automated handwriting grading.

Revision offers Quick (5), Full (12 by default, adjustable from 10–15), and Weak Words. Selection prioritises scoped weak content when enabled, then never-practised and least-recently-practised content so sessions rotate. Weak Words is capped at the configured Full size and rotates remaining weak content. Parent settings control lesson range, recognition/writing mix, current and archived 听写 inclusion, session size, and weak-item emphasis. Weak Words never broadens the configured scope when empty. MOE recognition characters without real prompt metadata appear as unscored Review Cards; **Need more practice** requeues a card without changing objective recognition accuracy.

## Data architecture

- `curriculum/moe-p1-standard.js` contains the required MOE metadata and Lesson 16 recognition/writing character requirements.
- `curriculum/tingxie.js` contains the canonical school spelling sets and derives the compatibility item list and required Hanzi data files.
- `curriculum/content.js` maps set items and curriculum characters to stable canonical Chinese-content IDs.
- `practice.js`, `revision.js`, and `rewards.js` contain session selection and the capped extra-practice reward rules.
- `progress.js` owns the versioned local progress/mastery schema and repeat-safe V0.1/V0.2 migration.
- `freewrite.js` provides the blank Test-mode pointer canvas; `audio.js` provides bundled-audio-first playback with Mandarin TTS fallback.
- `mission.js` contains the explainable selection and weak-item rules.
- `shop/tiger-house.js` contains the fixed catalogue, prices, ownership, preset slots, and atomic purchase/equip operations.
- `tiger/assets.js` maps semantic Tiger states to replaceable image paths.

Only coins are spendable. Mission rewards are unchanged. Study, Test, and Revision each award one coin for a unique completed content/activity/mode claim, with one shared maximum of 10 extra-practice coins per local day. Claims persist across reloads.

## Run locally

No build or package installation is required. With Node.js installed, run:

```bash
node tests/server.cjs
```

Open <http://127.0.0.1:8000/corinne-chinese-learning/>. This server uses the same project subdirectory shape as GitHub Pages and supplies the correct manifest, SVG, and audio MIME types.

Run dependency-free checks with:

```bash
node tests/check.cjs
```

For the browser regression suite, open <http://127.0.0.1:8000/corinne-chinese-learning/tests/browser-smoke.html>, choose **Run functional checks**, then **Inspect offline cache**. The suite backs up and restores progress on the local test origin and exercises Mission, Test-mode privacy/audio failure, Revision, Tiger House, persistence, resizing, and rollover.

## Pronunciation audio status

The local-audio architecture is complete, but these seven files are intentionally absent until approved high-quality Mandarin recordings are supplied:

```text
audio/tingxie-16/mama.mp3
audio/tingxie-16/baba.mp3
audio/tingxie-16/kg.mp3
audio/tingxie-16/nimen.mp3
audio/tingxie-16/taqu.mp3
audio/tingxie-16/daqiu.mp3
audio/tingxie-16/fumu.mp3
```

The app tries each expected local path, falls back to a `zh-CN`, `zh`, or `cmn` browser voice after voice discovery, and reports a visible failure if neither source works. Audio starts only from a child tap. In 听写 Test, failure exposes only **Retry audio**, **Skip**, and **Study this item**; it does not reveal the answer, save a result, or award a coin. The earlier Samsung no-sound report is not considered resolved until tested on that device with either approved MP3 files or a working installed Mandarin TTS voice.

When approved files are added at the exact paths above, no curriculum or service-worker character list needs editing. The worker derives audio URLs from `curriculum/tingxie.js` and caches every file it can fetch.

## Deploy to GitHub Pages

1. Keep feature work on `codex/v0.3` and open a pull request for review. This branch does not deploy or change the live site.
2. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
3. Merge the approved pull request into `main`. The `.github/workflows/pages.yml` workflow validates the app, stages only public files, and deploys only from `main`. Pull requests run validation without deployment.
4. If the `github-pages` environment requires approval, approve the deployment in Actions.
5. Open <https://tcheeweim-sudo.github.io/corinne-chinese-learning/> after the deploy job succeeds. This is the expected project URL, not a claim that V0.3 has been deployed.

The staged site includes `curriculum/`, `shop/`, `tiger/`, `audio/`, `icons/`, `vendor/`, and `character-data/`. Relative URLs, manifest scope, and service-worker scope support the repository subdirectory.

## Install or update on Android

1. Open the deployed HTTPS address in Chrome on the Samsung phone or tablet while online.
2. Wait for the home screen, then reload once so the newest service worker controls the page. If an older installed version remains visible, close the app completely, reopen it online, and reload once more.
3. Open **⋮ → Add to home screen → Install**. Some Chrome versions show **Install app** directly. Confirm and open **中文 Tiger** from the home screen.
4. Start a mission, reach writing, rotate the device in portrait and landscape, and verify the writing square remains fully visible and accepts finger or S Pen strokes.
5. Turn on airplane mode, close and reopen the installed app, and verify the home screen, mission, tiger art, and character writing load. Turn airplane mode off afterward.

Progress belongs to this browser and site address. Clearing site data or using a different origin loses access to that local state.

## Add future curriculum and character data

1. Add or update the school set only in `curriculum/tingxie.js`. Add the matching MOE lesson metadata in `curriculum/moe-p1-standard.js` only if that lesson is not already present. Do not add character lists to `sw.js`.
2. Run `node tests/check.cjs`. It derives every required Chinese character from the canonical school set plus the mapped lesson writing requirements.
3. For each reported character missing from `character-data/`, download the matching JSON from the pinned `hanzi-writer-data@2.0.1` release. For example, for 好:

   ```powershell
   curl.exe -L --fail "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/%E5%A5%BD.json" -o "character-data/好.json"
   ```

   Use the actual character as the filename and its URL-encoded value in the URL. Commit the JSON with the curriculum change; the app never requests character data from a CDN at runtime.
4. Add approved audio under the path named in the item data, if available. Missing audio remains optional and uses the fallback path.
5. Increment `CACHE_NAME` in `sw.js`, rerun both test suites, and verify online update followed by offline writing.

## Progress migration and metrics

The storage key remains `corinne-zh-v0`, and the stored schema is version 3. Explicit repeat-safe migration from V0.1 and V0.2 preserves valid coins, stars, badges, streak dates, completed sessions, overall question metrics, writing totals, Tiger House purchases/equipment, daily Mission claims, and valid same-day Mission progress. V0.2 recognition and writing mastery is copied into stable canonical content records without deleting the original compatible fields. Malformed storage starts from safe defaults.

Canonical mastery and set history are separate. If the same Chinese content appears in another 听写 set, mastery carries across while first self-checks, completions, and sessions remain attached to their original set.

V0.1 item-level answer taps are retained as legacy responses and correct responses. They are not relabelled as first-attempt item data. Historical written character indexes are retained without inventing repetition counts.

Parent metrics distinguish Mission questions attempted, answer responses/clicks, correct first responses, eventual completion, writing repetitions, 听写 sessions, first-attempt self-check accuracy, Revision sessions, weak items, and the configured revision scope.

## Privacy and scope

There is no account, backend, analytics service, advertising, cloud sync, social feature, OCR, AI question generation, premium currency, or real-money purchase. All progress stays in local browser storage.

## Mission limits, recovery and midnight

MissionPlanner.limits in mission.js sets new missions to 3 focus items and at most 2 writing characters. In-progress missions from the earlier 4+4 build retain saved steps and rewards until the next day. Covered weak items may recur early, with at least one slot reserved for unseen items. Ordinary repeats wait until unseen items have been included. Coverage starts a fresh cycle after all seven items.

Writing weakness means at least two recorded difficulties and an average of at least two difficulties per successful repetition. For example, 4 difficulties across 1 repetition is weak; two subsequent clean repetitions reduce the average to 4/3 and remove writing weakness. The existing hints field records stroke mistakes, including those leading to hints; its historical meaning is preserved. Recognition weakness still requires at least two questions with first-attempt accuracy below 70%. An item can remain weak for recognition after writing recovers.

On visibility/resume and before mission actions, the app recalculates the local day. A new day expires the old mission and daily claims, retaining totals, mastery, coverage, purchases and the last completed streak/date. A stale answer or writing callback cannot earn a new-day reward.

## Replaceable visual assets

- Tiger: place approved files under `tiger/assets/` and update only the semantic paths in `tiger/assets.js` (`home`, `happy`, `celebrate`, `encourage`, `thinking`, `writing`, `sleeping`, `house`). All states currently use `tiger-placeholder.svg`.
- Furniture: add approved images under tiger/assets/furniture/ and set each catalogue entry's image in shop/tiger-house.js to a relative URL such as ./tiger/assets/furniture/cloud-pillow.png. A null value uses the emoji placeholder; failed image loads also show that placeholder. The same image renders in the shop and preset room slot. The worker derives image paths from the catalogue and requires configured files for offline installation.
- PWA icons: replace icons/icon-192.png, icons/icon-512.png and icons/icon-maskable-512.png with matching dimensions. Keep important maskable artwork inside the central safe area. Existing manifest and HTML references need no structural changes.
- Increment the worker cache version whenever replacing assets. Run validation before deployment; GitHub Pages already stages tiger/ and icons/.
