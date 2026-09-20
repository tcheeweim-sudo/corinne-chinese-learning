# Corinne's 中文 Tiger

A static, local-first PWA for a roughly five-minute guided Primary 1 Chinese practice mission. V0.2 uses the 23 September 2026 school 听写（十六）, the official MOE Primary 1 standard Chinese Lesson 16 character requirements, local progress, Hanzi Writer, and a coin-funded Tiger House.

## V0.2 experience

The child follows one path: Tiger intro → see and hear → listen and recognise → write → recall → reward. A mission selects up to four active 听写 items and four writing characters. It covers unseen active items before ordinary repeats while allowing weak items to recur earlier.

The home screen shows only the tiger, today's mission, one progress indicator, coin balance, one Start/Continue button, and Tiger House. Parent metrics remain behind a small grown-up link.

## Data architecture

- `curriculum/moe-p1-standard.js` contains the required MOE metadata and Lesson 16 recognition/writing character requirements.
- `curriculum/tingxie.js` contains the canonical school spelling sets and derives the compatibility item list and required Hanzi data files.
- `progress.js` owns the versioned local progress/mastery schema and V0.1 migration.
- `mission.js` contains the explainable selection and weak-item rules.
- `shop/tiger-house.js` contains the fixed catalogue, prices, ownership, preset slots, and atomic purchase/equip operations.
- `audio.js` tries a bundled MP3 first, then an asynchronously discovered Mandarin browser voice, then reports a visible failure.

Only coins are spendable. Historical V0.1 stars and badges are retained during migration but are not used by the V0.2 shop.

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

For the browser regression suite, open <http://127.0.0.1:8000/corinne-chinese-learning/tests/browser-smoke.html>, choose **Run functional checks**, then **Inspect offline cache**. The suite backs up and restores progress on the local test origin.

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

The app currently tries each expected local path, falls back to a `zh-CN`, `zh`, or `cmn` browser voice after voice discovery, and shows the pinyin plus a visible help message if neither source works. Audio starts only from a child tap. The earlier Samsung no-sound report is not considered resolved until tested on that device with either the approved MP3 files or a working installed Mandarin TTS voice.

When approved files are added at the exact paths above, no curriculum or service-worker character list needs editing. The worker derives audio URLs from `curriculum/tingxie.js` and caches every file it can fetch.

## Deploy to GitHub Pages

1. Keep feature work on `codex/v0.2` and open a pull request for review. This branch does not deploy or change the live V0.1 site.
2. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
3. Merge the approved pull request into `main`. The `.github/workflows/pages.yml` workflow validates the app, stages only public files, and deploys only from `main`. Pull requests run validation without deployment.
4. If the `github-pages` environment requires approval, approve the deployment in Actions.
5. Open <https://tcheeweim-sudo.github.io/corinne-chinese-learning/> after the deploy job succeeds. This is the expected project URL, not a claim that V0.2 has been deployed.

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

The storage key remains `corinne-zh-v0`, and the stored schema is now version 2. Migration is repeat-safe and preserves valid coins, stars, badges, streak dates, completed sessions, overall question metrics, writing totals, same-day reward claims, and V0.1 item history. Malformed storage starts from safe defaults.

V0.1 item-level answer taps are retained as legacy responses and correct responses. They are not relabelled as first-attempt item data. Historical written character indexes are retained without inventing repetition counts.

Parent metrics distinguish questions attempted, answer responses/clicks, correct first responses, eventual question completion, writing repetitions, spelling item mastery, character mastery, weak items, sessions, and streak.

## Privacy and scope

There is no account, backend, analytics service, advertising, cloud sync, social feature, OCR, AI question generation, premium currency, or real-money purchase. All progress stays in local browser storage.
