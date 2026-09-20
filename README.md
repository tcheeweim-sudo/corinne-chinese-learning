# Corinne's 中文 Quest

P1 Chinese spelling practice PWA for Corinne. V0.1 is a static app with a bundled Hanzi Writer library, local progress, and offline character-by-character writing. No build or package installation is needed.

## V0.1 scope
- Android-first, works on Samsung phone/tablet
- 23 Sept 听写（十六） spelling list
- listen and choose quiz
- Chinese text-to-speech
- coins, stars, streaks and badges
- learn mode
- Hanzi Writer stroke-order animation and validation
- character-by-character writing practice with local character data
- recognition and recall quizzes
- a small local parent progress view
- local-only progress storage
- installable PWA

## Current spelling list
1. 妈妈
2. 爸爸
3. 一公斤
4. 你们
5. 她不会去
6. 我会打球
7. 他们是我的父母

## Run locally
Serve the repo over HTTP, for example:

```bash
python -m http.server 8000
```

Then open http://localhost:8000

Alternatively, with Node.js installed, run `node tests/server.cjs` and open http://127.0.0.1:8000/corinne-chinese-learning/ . This tests the same project subdirectory used by GitHub Pages. Run `node tests/check.cjs` for dependency-free validation.

For browser regression checks, open http://127.0.0.1:8000/corinne-chinese-learning/tests/browser-smoke.html and choose **Run functional checks**. It tests real app controls and restores the local test origin's saved progress afterward. **Inspect offline cache** verifies the active worker and cached shell/character JSON. Run this locally only, with other app tabs idle. Tests are excluded from deployment.

There is no build step. The app shell, Hanzi Writer, and the 19 required character-data files are bundled for offline use after the service worker installs.

## Deploy to GitHub Pages

1. In this GitHub repository, open **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
2. Review `codex/v0.1` before merging. This branch does not deploy or change the live site automatically. The workflow validates pull requests to `main`; deployment is restricted to `main`.
3. When the owner approves and merges to `main`, the **Deploy static PWA to GitHub Pages** workflow runs automatically. Alternatively, once the workflow exists on `main`, choose **Actions → Deploy static PWA to GitHub Pages → Run workflow → main**.
4. If the `github-pages` environment requires approval, approve its deployment in Actions. The environment must permit deployments from `main`.
5. Wait for the deploy job to succeed, then open https://tcheeweim-sudo.github.io/corinne-chinese-learning/ . This is the expected address, not a claim that a deployment has already run.

The workflow uploads only public app files, icons, vendor files, notices, and character data. Tests and repository files are excluded. Relative URLs, manifest scope, and service-worker scope support the repository subdirectory. HTTPS is provided by Pages. See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Install on Android (Samsung phone or tablet)

1. Open the deployed HTTPS address above in Chrome, while online. Wait for the page to load, then reload once so the installed service worker controls the page.
2. Open **⋮ → Add to home screen → Install** (some Chrome versions show **Install app** directly), then confirm. Open **中文 Quest** from the home screen.
3. Open **Write**, select an item, and check **Show strokes**. Turn on airplane mode, reopen the app, and verify both the home screen and writing load. Turn airplane mode off afterward.
4. Mandarin speech depends on the Android voice installed. If audio is missing, install/download a Mandarin voice in the device's text-to-speech settings while online; browser speech may not work offline even though writing does.

Progress belongs to this device and browser origin. Clearing site data or changing the site's address loses access to that saved progress. To receive updates, connect to the internet and reopen/reload the app; if migrating from the original V0 cache, reload once more after its worker updates.

## Future curriculum updates

`curriculum.js` is the single source of items and the derived unique character set. Both `app.js` and `sw.js` load it. Do not add a character list to `sw.js`.

1. Edit the items in `curriculum.js`. Preserve IDs only for unchanged items; use new IDs for new spellings.
2. For each new character missing from `character-data/`, download its JSON from the pinned Hanzi Writer data release. For example, for 好 (an example only, not part of the current list):

   ```powershell
   curl.exe -L --fail "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/%E5%A5%BD.json" -o "character-data/好.json"
   ```

   Use the actual character as the filename and its URL-encoded form in the download URL. Retain the third-party attribution. Commit each new JSON alongside the curriculum change; there are no runtime CDN requests.
3. Run `node tests/check.cjs`. Missing or malformed character data fails the check and blocks Pages deployment. The worker also fails installation if a required file cannot be cached, keeping the previous working worker available.
4. Increment `CACHE_NAME` in `sw.js` for each deployment changing app assets. This is a version identifier, not a second curriculum list. The worker imports the curriculum without the HTTP cache, precaches every required character, and removes only older Corinne caches.
5. Test online reload, then offline writing before publishing. The home mission heading currently describes the seven-item list; update that wording if a future approved list changes its size.

## Parent metrics

Mission and recall both contribute. **Questions attempted** counts a question once on its first answer; **answer responses (clicks)** counts each accepted answer, including wrong retries; **correct on first attempt** excludes retries; **questions completed** counts questions eventually answered correctly. Overall question completion is completed / attempted; opening a question without answering it does not count as an attempt. Disabled/repeated clicks after success do not count. Replay questions count as new practice but do not earn another daily mission reward.

These question metrics start at this update because earlier versions saved only answer-tap totals, from which first-attempt results cannot be reconstructed. Existing coins, stars, writing totals, session counts, and item history are retained. Mastery remains the existing heuristic based on historical response accuracy and writing coverage, not a formal assessment. Sessions finished counts completed missions; the streak counts consecutive local calendar days with a completed mission.

## Product principle
Keep V0 deliberately small. Test whether Corinne voluntarily uses it before adding OCR, cloud accounts, AI generation, broader curriculum coverage or complex reward systems.
