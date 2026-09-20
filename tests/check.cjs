// Dependency-free V0.2 checks used locally and by the Pages workflow.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
process.chdir(path.join(__dirname, '..'));
const source = name => fs.readFileSync(name, 'utf8');

(async () => {
  const scripts = [
    'curriculum/moe-p1-standard.js', 'curriculum/tingxie.js', 'mission.js', 'shop/tiger-house.js',
    'progress.js', 'audio.js', 'app.js', 'sw.js'
  ];
  for (const name of scripts) new vm.Script(source(name), { filename: name });

  const context = vm.createContext({ console, setTimeout, clearTimeout });
  for (const name of scripts.slice(0, 6)) vm.runInContext(source(name), context);
  const { ProgressLogic: p, ProgressStore, MissionPlanner, TigerHouse, CurriculumAudio } = context;
  const set = context.getActiveTingxie();
  const lesson = context.getMoeLesson(set.lessonId);

  // Curriculum references and caps.
  assert.equal(set.id, 'tingxie-16-2026-09-23');
  assert.equal(set.testDate, '2026-09-23');
  assert.equal(set.items.length, 7);
  assert.equal(lesson.lesson, 16);
  assert.equal(lesson.volume, '1B');
  assert.equal(lesson.source, 'MOE');
  assert.equal(context.MOE_P1_STANDARD.course, 'Standard Chinese');
  assert(context.MOE_P1_STANDARD.sourceUrl.startsWith('https://www.moe.gov.sg/'));
  const fresh = ProgressStore.freshState(set.items, '2026-09-20');
  const mission = MissionPlanner.createMission(set, lesson, fresh, '2026-09-20');
  assert.equal(mission.focusIds.length, 4, 'Daily focus must be capped at four');
  assert(mission.writingCharacters.length <= 4, 'Writing must be capped at four');
  assert(mission.focusIds.every(id => set.items.some(item => item.id === id)), 'Focus must come from the active tingxie');
  fresh.selectionCoverage[set.id] = { coveredItemIds: mission.focusIds };
  const second = MissionPlanner.createMission(set, lesson, fresh, '2026-09-21');
  const remaining = set.items.map(item => item.id).filter(id => !mission.focusIds.includes(id));
  assert(remaining.every(id => second.focusIds.includes(id)), 'Unseen active tingxie items must be covered before ordinary repeats');
  assert.equal(MissionPlanner.isWeakItem({ recognition: { questionsAttempted: 2, firstCorrect: 1 }, writing: { hints: 0 } }), true);
  assert.equal(MissionPlanner.isWeakItem({ recognition: { questionsAttempted: 1, firstCorrect: 0 }, writing: { hints: 0 } }), false);

  // Streak logic.
  assert.equal(p.nextStreak('', '2026-09-20', 0), 1);
  assert.equal(p.nextStreak('2026-09-20', '2026-09-20', 4), 4);
  assert.equal(p.nextStreak('2026-09-19', '2026-09-20', 4), 5);
  assert.equal(p.nextStreak('2026-09-18', '2026-09-20', 4), 1);
  assert.equal(p.nextStreak('2025-12-31', '2026-01-01', 4), 5);
  assert.equal(p.currentStreak('2026-09-18', '2026-09-20', 4), 0);
  assert.equal(p.currentStreak('2026-09-19', '2026-09-20', 4), 4);

  // V0.1 migration and malformed storage.
  const old = {
    coins: 87, stars: 9, badges: ['first'], streak: 4, lastSessionDate: '2026-09-19', sessionsCompleted: 3,
    quizAttempts: 12, correctAnswers: 8, writingRepetitions: 5,
    questionMetrics: { attempted: 7, responses: 12, firstCorrect: 4, completed: 7 },
    itemStats: { mama: { attempts: 4, correct: 3, writes: 2, written: [0, 1] } },
    daily: { date: '2026-09-20', itemIds: ['mama'], rewardedMissionItems: ['mama'], completed: true }
  };
  const migrated = ProgressStore.migrateState(old, { items: set.items, set, today: '2026-09-20' });
  assert.equal(migrated.stateVersion, 2);
  assert.equal(migrated.coins, 87); assert.equal(migrated.stars, 9); assert.deepEqual([...migrated.badges], ['first']);
  assert.equal(migrated.streak, 4); assert.equal(migrated.sessionsCompleted, 3); assert.equal(migrated.writingRepetitions, 5);
  assert.equal(migrated.questionMetrics.firstCorrect, 4);
  assert.equal(migrated.itemStats.mama.legacy.answerResponses, 4);
  assert.deepEqual([...migrated.itemStats.mama.legacy.writtenCharacters], ['妈']);
  assert.deepEqual([...migrated.daily.rewardedMissionItems], ['mama']);
  const malformed = ProgressStore.migrateState('broken', { items: set.items, set, today: '2026-09-20' });
  assert.equal(malformed.coins, 0); assert.equal(malformed.mission, null);
  const malformedV2 = ProgressStore.migrateState({stateVersion:2, mission:{date:'2026-09-20',setId:set.id,focusIds:['unknown'],stage:'write'}}, { items: set.items, set, today: '2026-09-20' });
  assert.equal(malformedV2.mission, null);

  // Guided mission persistence through the real store serializer.
  const memory = { value: null, getItem() { return this.value; }, setItem(_key, value) { this.value = value; } };
  const firstStore = ProgressStore.createStore({ storage: memory, items: set.items, set, today: '2026-09-20' });
  firstStore.state.mission = MissionPlanner.createMission(set, lesson, firstStore.state, '2026-09-20');
  firstStore.state.mission.stage = 'write'; firstStore.state.mission.stageIndex = 2; firstStore.save();
  const reloadedStore = ProgressStore.createStore({ storage: memory, items: set.items, set, today: '2026-09-20' });
  assert.equal(reloadedStore.state.mission.stage, 'write'); assert.equal(reloadedStore.state.mission.stageIndex, 2);

  // Question counts distinguish a question from response clicks.
  ProgressStore.recordQuestion(reloadedStore.state, 'mama', false, 1, '2026-09-20');
  ProgressStore.recordQuestion(reloadedStore.state, 'mama', true, 2, '2026-09-20');
  assert.equal(reloadedStore.state.questionMetrics.attempted, 1);
  assert.equal(reloadedStore.state.questionMetrics.responses, 2);
  assert.equal(reloadedStore.state.questionMetrics.firstCorrect, 0);
  assert.equal(reloadedStore.state.questionMetrics.completed, 1);

  // Tiger House success, rejection, duplicate protection and persistence.
  const economy = ProgressStore.freshState(set.items, '2026-09-20');
  economy.coins = 50;
  assert.equal(TigerHouse.purchase(economy, 'cloud-pillow', 'now').ok, true);
  assert.equal(economy.coins, 30);
  assert.equal(TigerHouse.purchase(economy, 'cloud-pillow', 'later').reason, 'already-owned');
  assert.equal(economy.coins, 30, 'Duplicate purchase must not charge twice');
  assert.equal(TigerHouse.purchase(economy, 'warm-lamp').reason, 'insufficient-coins');
  assert.equal(TigerHouse.equip(economy, 'cloud-pillow').ok, true);
  const economyReload = ProgressStore.migrateState(economy, { items: set.items, set, today: '2026-09-20' });
  assert(economyReload.tigerHouse.owned.includes('cloud-pillow'));
  assert.equal(economyReload.tigerHouse.slots.pillow, 'cloud-pillow');

  // Audio local preference, TTS fallback, and graceful failure.
  let speechCalls = 0;
  const synthesis = { getVoices: () => [{ lang: 'zh-CN' }], cancel() {}, speak(utterance) { speechCalls += 1; utterance.onstart(); } };
  class Utterance { constructor(text) { this.text = text; } }
  const local = new CurriculumAudio({ audioFactory: () => ({ play: () => Promise.resolve(), pause() {} }), synthesis, Utterance });
  assert.equal((await local.play(set.items[0])).source, 'local'); assert.equal(speechCalls, 0);
  const fallback = new CurriculumAudio({ audioFactory: () => ({ play: () => Promise.reject(new Error('missing')), pause() {} }), synthesis, Utterance });
  assert.equal((await fallback.play(set.items[0])).source, 'tts'); assert.equal(speechCalls, 1);
  let failureMessage = '';
  const unavailable = new CurriculumAudio({ audioFactory: () => ({ play: () => Promise.reject(new Error('missing')), pause() {} }), synthesis: null, Utterance: null });
  assert.equal((await unavailable.play(set.items[0], message => { failureMessage = message; })).source, 'unavailable');
  assert.match(failureMessage, /unavailable/i);

  // Bundled character data and app shell.
  const chars = context.REQUIRED_CHARACTERS;
  assert.equal(new Set(chars).size, chars.length);
  for (const char of chars) {
    const data = JSON.parse(source(`character-data/${char}.json`));
    assert(data.strokes.length > 0 && data.strokes.length === data.medians.length, `Invalid stroke data: ${char}`);
  }
  const worker = vm.createContext({ self: { addEventListener() {} }, URL, globalThis: null });
  worker.globalThis = worker;
  worker.importScripts = (...files) => files.forEach(file => vm.runInContext(source(file.replace('./', '')), worker));
  vm.runInContext(source('sw.js'), worker);
  const shell = vm.runInContext('APP_SHELL', worker);
  for (const file of shell) assert(fs.existsSync(decodeURIComponent(file)), `Missing offline asset: ${file}`);
  assert.equal(shell.filter(file => file.includes('character-data/')).length, chars.length);
  assert.equal(vm.runInContext('OPTIONAL_AUDIO.length', worker), set.items.length);
  assert(!shell.some(file => file.endsWith('.mp3')), 'Missing optional audio must not block worker installation');

  // Manifest, responsive writer, service-worker update and Pages readiness.
  const manifest = JSON.parse(source('manifest.webmanifest'));
  assert.equal(manifest.start_url, './'); assert.equal(manifest.scope, './'); assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const png = fs.readFileSync(icon.src);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
  assert.match(source('app.js'), /updateDimensions/);
  assert.match(source('app.js'), /ResizeObserver/);
  assert.match(source('app.js'), /orientationchange/);
  assert.match(source('sw.js'), /corinne-v0\.2\.1/);
  const workflow = source('.github/workflows/pages.yml');
  for (const asset of ['curriculum', 'shop', 'tiger', 'audio', 'character-data', 'vendor']) assert(workflow.includes(asset), `Pages staging missing ${asset}`);
  const html = source('index.html');
  assert(html.indexOf('moe-p1-standard.js') < html.indexOf('tingxie.js'));
  assert(!html.includes('data-nav='), 'V0.1 four-mode navigation must be removed');

  console.log(`PASS: V0.2 curriculum, mission caps/resume, migration, metrics, economy, audio fallback, streaks, ${chars.length} character files, offline shell, responsive writing, manifest and Pages assets.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
