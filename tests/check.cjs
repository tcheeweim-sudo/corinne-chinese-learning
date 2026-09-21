// Dependency-free V0.3.1 checks used locally and by the Pages workflow.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
process.chdir(path.join(__dirname, '..'));
const source = name => fs.readFileSync(name, 'utf8');
const pngSize = name => {
  const data = fs.readFileSync(name);
  assert.equal(data.toString('ascii', 1, 4), 'PNG', `${name} is not a PNG`);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
};

(async () => {
  const modules = [
    'curriculum/moe-p1-standard.js', 'curriculum/tingxie.js', 'curriculum/content.js',
    'mission.js', 'practice.js', 'revision.js', 'rewards.js', 'shop/tiger-house.js',
    'tiger/assets.js', 'progress.js', 'audio.js'
  ];
  for (const name of [...modules, 'freewrite.js', 'app.js', 'sw.js']) new vm.Script(source(name), { filename: name });
  const context = vm.createContext({ console, setTimeout, clearTimeout });
  for (const name of modules) vm.runInContext(source(name), context);
  const { ProgressLogic: p, ProgressStore, MissionPlanner, PracticeLogic, RevisionLogic, RewardLogic, TigerHouse, CurriculumAudio, ContentModel } = context;
  const set = context.getActiveTingxie();
  const lesson = context.getMoeLesson(set.lessonId);

  assert.equal(set.items.length, 7);
  assert.equal(lesson.lesson, 16);
  assert.equal(context.MOE_P1_STANDARD.source, 'MOE');
  assert.equal(ContentModel.canonicalId('妈妈'), 'zh:妈妈');
  const fresh = ProgressStore.freshState(set.items, '2026-09-20');
  const mission = MissionPlanner.createMission(set, lesson, fresh, '2026-09-20');
  assert.equal(mission.focusIds.length, 3);
  assert(mission.writingCharacters.length <= 2);
  fresh.selectionCoverage[set.id] = { coveredItemIds: mission.focusIds };
  const second = MissionPlanner.createMission(set, lesson, fresh, '2026-09-21');
  const unseen = set.items.map(item => item.id).filter(id => !mission.focusIds.includes(id));
  assert(second.focusIds.every(id => unseen.includes(id)), 'Unseen active items must precede ordinary repeats');
  fresh.itemStats.mama.recognition = { questionsAttempted: 2, responses: 2, firstCorrect: 0, completed: 2 };
  assert(MissionPlanner.selectFocus(set, fresh).includes('mama'), 'Genuinely weak items may recur');

  const recovery = ProgressStore.freshState(set.items, '2026-09-20');
  ProgressStore.completeWriting(recovery, '爸', ['baba'], 4);
  assert(MissionPlanner.isWeakWriting(recovery.characterStats['爸']));
  ProgressStore.completeWriting(recovery, '爸', ['baba'], 0);
  ProgressStore.completeWriting(recovery, '爸', ['baba'], 0);
  assert(!MissionPlanner.isWeakWriting(recovery.characterStats['爸']));

  const day = ProgressStore.freshState(set.items, '2026-09-20');
  day.coins = 42; day.streak = 3; day.lastSessionDate = '2026-09-20';
  day.mission = MissionPlanner.createMission(set, lesson, day, '2026-09-20');
  day.practiceSession = { date: '2026-09-20' }; day.revisionSession = { date: '2026-09-20' };
  day.extraRewards = { date: '2026-09-20', claims: ['practice:study:zh:妈妈'], coinsAwarded: 1 };
  assert(ProgressStore.rolloverDay(day, '2026-09-21'));
  assert.equal(day.mission, null); assert.equal(day.practiceSession, null); assert.equal(day.revisionSession, null);
  assert.equal(day.extraRewards.coinsAwarded, 0); assert.equal(day.coins, 42); assert.equal(day.streak, 3);
  assert.equal(p.nextStreak(day.lastSessionDate, '2026-09-21', day.streak), 4);

  assert.equal(PracticeLogic.createSession(set, 'study', '3', '2026-09-20', fresh).itemIds.length, 3);
  assert.equal(PracticeLogic.createSession(set, 'test', '5', '2026-09-20', fresh).itemIds.length, 5);
  assert.equal(PracticeLogic.createSession(set, 'test', 'all', '2026-09-20').itemIds.length, 7);
  const rotate3 = ProgressStore.freshState(set.items, '2026-09-20');
  const first3 = PracticeLogic.selectItems(set, '3', rotate3);
  rotate3.tingxieHistory[set.id] = { sessions: 1, items: Object.fromEntries(first3.map(id => [id, { lastPractised: '2026-09-20' }])) };
  const second3 = PracticeLogic.selectItems(set, '3', rotate3);
  assert(second3.some(id => !first3.includes(id)), 'Repeated Practice 3 must rotate beyond the first three');
  const rotate5 = ProgressStore.freshState(set.items, '2026-09-20');
  const first5 = PracticeLogic.selectItems(set, '5', rotate5);
  rotate5.tingxieHistory[set.id] = { sessions: 1, items: Object.fromEntries(first5.map(id => [id, { lastPractised: '2026-09-20' }])) };
  const second5 = PracticeLogic.selectItems(set, '5', rotate5);
  assert(second5.some(id => !first5.includes(id)), 'Repeated Practice 5 must rotate beyond the first five');
  const weakPractice = ProgressStore.freshState(set.items, '2026-09-20');
  weakPractice.tingxieHistory[set.id] = { sessions: 1, items: {} };
  for (const item of set.items.slice(0, 3)) {
    weakPractice.canonicalStats[ContentModel.canonicalId(item.target)] = { recognition: { questionsAttempted: 2, firstCorrect: 0 }, selfCheck: {}, writing: {}, lastPractised: '2026-09-20' };
    weakPractice.tingxieHistory[set.id].items[item.id] = { lastPractised: '2026-09-20' };
  }
  const weakPractice3 = PracticeLogic.selectItems(set, '3', weakPractice);
  assert(weakPractice3.filter(id => set.items.slice(0, 3).some(item => item.id === id)).length === 2, 'Practice 3 must prioritise weak items');
  assert(weakPractice3.some(id => set.items.slice(3).some(item => item.id === id)), 'Weak priority must still rotate unseen set items');
  const archived = { ...set, id: 'past-set', label: 'Past list', status: 'archived', items: set.items.slice(0, 2) };
  assert.equal(PracticeLogic.createSession(archived, 'study', 'all', '2026-09-20').setId, 'past-set');
  const testSession = PracticeLogic.createSession(set, 'test', '3', '2026-09-20', fresh);
  PracticeLogic.recordSelfCheck(testSession, 'mama', false);
  PracticeLogic.recordSelfCheck(testSession, 'mama', true);
  assert.equal(testSession.results.mama.firstSelfCorrect, false, 'Retry must not overwrite first self-check');
  assert.equal(testSession.results.mama.completed, true);

  const identity = ProgressStore.freshState(set.items, '2026-09-20');
  const sameA = { id: 'same-a', target: '妈妈' };
  const sameB = { id: 'same-b', target: '妈妈' };
  ProgressStore.recordTingxieSelfCheck(identity, 'set-a', sameA, false, '2026-09-20');
  ProgressStore.recordTingxieSelfCheck(identity, 'set-b', sameB, true, '2026-09-21');
  assert.equal(identity.canonicalStats['zh:妈妈'].selfCheck.attempts, 2);
  assert.equal(identity.tingxieHistory['set-a'].items['same-a'].firstCorrect, 0);
  assert.equal(identity.tingxieHistory['set-b'].items['same-b'].firstCorrect, 1);
  const duplicateA = { id: 'duplicate-a', status: 'archived', items: [{ id: 'shared', target: '甲' }] };
  const duplicateB = { id: 'duplicate-b', status: 'archived', items: [{ id: 'shared', target: '乙' }] };
  context.TINGXIE_SETS.push(duplicateA, duplicateB);
  const duplicateState = ProgressStore.freshState([], '2026-09-20');
  duplicateState.itemStats.shared = { recognition: { questionsAttempted: 0, responses: 0, firstCorrect: 0, completed: 0 }, writing: { successfulRepetitions: 0, hints: 0 }, lastPractised: '', legacy: {} };
  ProgressStore.recordQuestion(duplicateState, 'duplicate-b', 'shared', true, 1, '2026-09-20');
  assert.equal(duplicateState.canonicalStats['zh:乙'].recognition.firstCorrect, 1);
  assert.equal(duplicateState.canonicalStats['zh:甲'], undefined, 'Duplicate itemId resolved against the wrong set');
  context.TINGXIE_SETS.splice(-2);

  const economy = ProgressStore.freshState(set.items, '2026-09-20');
  assert.equal(RewardLogic.claim(economy, { mode: 'practice', activity: 'study', contentId: 'zh:妈妈', today: '2026-09-20' }).awarded, 1);
  assert.equal(RewardLogic.claim(economy, { mode: 'practice', activity: 'study', contentId: 'zh:妈妈', today: '2026-09-20' }).awarded, 0);
  assert.equal(RewardLogic.claim(economy, { mode: 'practice', activity: 'test', contentId: 'zh:妈妈', today: '2026-09-20' }).awarded, 1);
  for (let index = 0; index < 20; index += 1) RewardLogic.claim(economy, { mode: 'revision', activity: 'recognition', contentId: `zh:${index}`, today: '2026-09-20' });
  assert.equal(economy.extraRewards.coinsAwarded, 10); assert.equal(economy.coins, 10);

  const revisionState = ProgressStore.freshState(set.items, '2026-09-20');
  const defaults = { ...RevisionLogic.defaults };
  const quickOne = RevisionLogic.select('quick', defaults, revisionState);
  assert.equal(quickOne.length, 5);
  quickOne.forEach((item, index) => ProgressStore.touchCanonical(revisionState, item.contentId, `2026-09-20T00:00:0${index}.000Z`));
  const quickTwo = RevisionLogic.select('quick', defaults, revisionState);
  assert(quickTwo.some(item => !quickOne.some(first => first.id === item.id)), 'Quick Revision must rotate to unseen content');
  const fullState = ProgressStore.freshState(set.items, '2026-09-20');
  const fullOne = RevisionLogic.select('full', defaults, fullState);
  assert.equal(fullOne.length, 12);
  fullOne.forEach((item, index) => ProgressStore.touchCanonical(fullState, item.contentId, `2026-09-20T00:01:${String(index).padStart(2, '0')}.000Z`));
  const fullTwo = RevisionLogic.select('full', defaults, fullState);
  assert(fullTwo.some(item => !fullOne.some(first => first.id === item.id)), 'Full Revision must rotate to unseen content');
  assert(RevisionLogic.pool({ ...defaults, contentType: 'writing' }, revisionState).every(item => item.activity === 'writing'));
  assert(RevisionLogic.pool({ ...defaults, contentType: 'recognition' }, revisionState).every(item => item.contentType === 'recognition'));
  assert(RevisionLogic.pool(defaults, revisionState).some(item => item.source === 'moe' && item.activity === 'review'), 'Metadata-poor MOE recognition must be a Review Card');
  assert.equal(RevisionLogic.select('weak', defaults, revisionState).length, 0, 'No weak items must stay empty');
  revisionState.canonicalStats['zh:妈妈'] = { recognition: {}, selfCheck: { attempts: 2, firstCorrect: 0 }, writing: {}, lastPractised: '' };
  assert(RevisionLogic.select('weak', defaults, revisionState).some(item => item.contentId === 'zh:妈妈'));
  assert.equal(RevisionLogic.select('weak', { ...defaults, lessonTo: 15 }, revisionState).length, 0, 'Weak words must respect lesson scope');
  const weakState = ProgressStore.freshState(set.items, '2026-09-20');
  const weakCandidates = RevisionLogic.pool(defaults, weakState).slice(0, 15);
  weakCandidates.forEach((item) => { weakState.canonicalStats[item.contentId] = { recognition: { questionsAttempted: 2, responses: 2, firstCorrect: 0, completed: 2 }, selfCheck: {}, writing: {}, lastPractised: '2026-09-01' }; });
  const weakOne = RevisionLogic.select('weak', defaults, weakState);
  assert.equal(weakOne.length, defaults.fullSize, 'Weak Words must be capped at Full Revision size');
  weakOne.forEach((item, index) => ProgressStore.touchCanonical(weakState, item.contentId, `2026-09-20T00:02:${String(index).padStart(2, '0')}.000Z`));
  const weakTwo = RevisionLogic.select('weak', defaults, weakState);
  assert(weakTwo.some(item => !weakOne.some(first => first.id === item.id)), 'Weak Words must rotate remaining weak items');
  const archivedUnique = { ...archived, items: [{ id: 'school', target: '学校', pinyin: 'xué xiào', meaning: 'school', audio: './audio/past/school.mp3' }] };
  context.TINGXIE_SETS.push(archivedUnique);
  assert(RevisionLogic.pool({ ...defaults, includeArchived: true }, revisionState).some(item => item.setId === 'past-set'));
  assert(!RevisionLogic.pool({ ...defaults, includeArchived: false }, revisionState).some(item => item.setId === 'past-set'));
  context.TINGXIE_SETS.pop();

  const v1 = { coins: 87, stars: 9, badges: ['first'], streak: 4, lastSessionDate: '2026-09-19', sessionsCompleted: 3, writingRepetitions: 5, itemStats: { mama: { attempts: 4, correct: 3, writes: 2, written: [0] } } };
  const migratedV1 = ProgressStore.migrateState(v1, { items: set.items, set, today: '2026-09-20' });
  assert.equal(migratedV1.stateVersion, 3); assert.equal(migratedV1.coins, 87); assert.equal(migratedV1.itemStats.mama.legacy.answerResponses, 4);
  const focus4 = set.items.slice(0, 4).map(item => item.id);
  const v2 = {
    stateVersion: 2, coins: 55, streak: 2, lastSessionDate: '2026-09-19', itemStats: {},
    characterStats: { 父: { successfulRepetitions: 2, hints: 1, lastPractised: '2026-09-20' } },
    daily: { date: '2026-09-20', itemIds: focus4, rewardedMissionItems: [focus4[0]], completed: false },
    mission: { date: '2026-09-20', setId: set.id, focusIds: focus4, writingCharacters: ['父','母','她','他'], stage: 'write', stageIndex: 3, rewardedItemIds: [focus4[0]], recognisedIds: focus4, recalledIds: [], coinsEarned: 3 },
    tigerHouse: { owned: ['cloud-pillow'], slots: { pillow: 'cloud-pillow' }, purchases: [{ itemId: 'cloud-pillow', price: 20 }] }
  };
  const migratedV2 = ProgressStore.migrateState(v2, { items: set.items, set, today: '2026-09-20' });
  assert.equal(migratedV2.stateVersion, 3); assert.equal(migratedV2.mission.focusIds.length, 4); assert.equal(migratedV2.mission.writingCharacters.length, 4); assert.equal(migratedV2.mission.stageIndex, 3);
  assert.equal(migratedV2.canonicalStats['zh:父'].writing.successfulRepetitions, 2);
  assert.equal(migratedV2.tigerHouse.slots.pillow, 'cloud-pillow');
  const again = ProgressStore.migrateState(migratedV2, { items: set.items, set, today: '2026-09-20' });
  assert.equal(again.coins, 55); assert.equal(again.mission.stageIndex, 3); assert.equal(again.canonicalStats['zh:父'].writing.successfulRepetitions, 2);
  const savedSettings = ProgressStore.migrateState({ ...migratedV2, revisionSettings: { ...defaults, lessonFrom: 10, fullSize: 15 } }, { items: set.items, set, today: '2026-09-20' });
  assert.equal(savedSettings.revisionSettings.lessonFrom, 10); assert.equal(savedSettings.revisionSettings.fullSize, 15);

  ProgressStore.recordQuestion(fresh, set.id, 'mama', false, 1, '2026-09-20');
  ProgressStore.recordQuestion(fresh, set.id, 'mama', true, 2, '2026-09-20');
  assert.equal(fresh.questionMetrics.attempted, 1); assert.equal(fresh.questionMetrics.responses, 2); assert.equal(fresh.questionMetrics.firstCorrect, 0); assert.equal(fresh.questionMetrics.completed, 1);
  const house = ProgressStore.freshState(set.items, '2026-09-20'); house.coins = 50;
  assert(TigerHouse.purchase(house, 'cloud-pillow').ok); const after = house.coins;
  assert.equal(TigerHouse.purchase(house, 'cloud-pillow').reason, 'already-owned'); assert.equal(house.coins, after);
  assert(TigerHouse.catalogue.every(item => item.image?.startsWith('./assets/tiger/items/')), 'Every shop item must use approved artwork');
  assert.equal(JSON.stringify(TigerHouse.catalogue.filter(item => item.slot === 'accessory').map(item => item.id)), JSON.stringify(['peach-ribbon', 'sunny-hat']));

  let speechCalls = 0;
  const synthesis = { getVoices: () => [{ lang: 'zh-CN' }], cancel() {}, speak(utterance) { speechCalls += 1; utterance.onstart(); } };
  class Utterance { constructor(text) { this.text = text; } }
  const local = new CurriculumAudio({ audioFactory: () => ({ play: () => Promise.resolve(), pause() {} }), synthesis, Utterance });
  assert.equal((await local.play(set.items[0])).source, 'local');
  const fallback = new CurriculumAudio({ audioFactory: () => ({ play: () => Promise.reject(new Error('missing')), pause() {} }), synthesis, Utterance });
  assert.equal((await fallback.play(set.items[0])).source, 'tts'); assert.equal(speechCalls, 1);
  const unavailableState = ProgressStore.freshState(set.items, '2026-09-20');
  const unavailableSession = PracticeLogic.createSession(set, 'test', '3', '2026-09-20', unavailableState);
  const unavailable = new CurriculumAudio({ audioFactory: () => ({ play: () => Promise.reject(new Error('missing')), pause() {} }), synthesis: null, Utterance: null });
  assert.equal((await unavailable.play(set.items[0])).source, 'unavailable');
  assert.deepEqual(Object.keys(unavailableSession.results), []); assert.equal(unavailableState.coins, 0);

  const appSource = source('app.js');
  const hiddenBranch = appSource.slice(appSource.indexOf('// This DOM intentionally'), appSource.indexOf('if (result?.firstSelfCorrect'));
  for (const leak of ['item.target', 'item.pinyin', 'item.meaning', 'HanziWriter']) assert(!hiddenBranch.includes(leak), `Pre-check test surface leaks ${leak}`);
  assert(hiddenBranch.includes('Blank free-writing surface'));
  assert(source('freewrite.js').includes('pointerdown') && source('freewrite.js').includes('event.pressure') && source('freewrite.js').includes('hasInk'));
  vm.runInContext(source('freewrite.js'), context);
  const surface = Object.create(context.FreeWriteSurface.prototype);
  let segments = 0;
  surface.canvas = { width: 100, height: 100, getBoundingClientRect: () => ({ left: 0, top: 0 }) };
  surface.context = { beginPath() {}, moveTo() {}, lineTo() {}, stroke() { segments += 1; }, clearRect() {} };
  surface.pointer = null; surface.hasInk = false; surface.onInkChange = () => {};
  const pen = { pointerId: 1, clientX: 10, clientY: 10, pressure: .5, preventDefault() {} };
  assert.equal(surface.hasInk, false, 'Blank canvas has no ink');
  surface.onDown(pen);
  assert.equal(surface.hasInk, false, 'Pointerdown alone has no ink');
  surface.onMove(pen);
  assert.equal(surface.hasInk, false, 'Stationary movement has no ink');
  surface.onMove({ ...pen, clientX: 30 });
  assert.equal(surface.hasInk, true, 'Drawing movement creates ink');
  assert.equal(segments, 1, 'Ink requires a drawn line segment');
  surface.clear();
  assert.equal(surface.hasInk, false, 'Clear resets ink');
  const reviewBranch = appSource.slice(appSource.indexOf('function renderRevisionReview'), appSource.indexOf('function renderRevisionListening'));
  assert(!reviewBranch.includes('recordCanonicalRecognition'), 'Review-card self-report must not change objective recognition metrics');

  const chars = context.REQUIRED_CHARACTERS;
  for (const char of chars) {
    const data = JSON.parse(source(`character-data/${char}.json`));
    assert(data.strokes.length && data.strokes.length === data.medians.length, `Invalid character data: ${char}`);
  }
  const worker = vm.createContext({ self: { addEventListener() {} }, URL }); worker.globalThis = worker;
  worker.importScripts = (...files) => files.forEach(file => vm.runInContext(source(file.replace('./', '')), worker));
  vm.runInContext(source('sw.js'), worker);
  const shell = vm.runInContext('APP_SHELL', worker);
  for (const file of shell) assert(fs.existsSync(decodeURIComponent(file)), `Missing offline asset: ${file}`);
  for (const file of ['practice.js','revision.js','rewards.js','freewrite.js','curriculum/content.js','tiger/assets.js']) assert(shell.includes(`./${file}`));
  for (const file of [...Object.values(context.TigerAssets.paths), ...Object.values(context.TigerAssets.ui), ...TigerHouse.catalogue.map(item => item.image)]) assert(shell.includes(file), `Offline shell missing visual asset: ${file}`);
  for (const reference of ['assets/reference/', 'house-room-reference.png', 'tiger-accessory-alignment-reference.png', 'app-icon-master.png', 'favicon-master.png']) assert(!shell.some(file => file.includes(reference)), `Reference-only file cached: ${reference}`);
  assert.equal(shell.filter(file => file.includes('character-data/')).length, chars.length);
  assert.equal(vm.runInContext('OPTIONAL_AUDIO.length', worker), set.items.length);
  assert.match(source('sw.js'), /corinne-v0\.3\.2/);
  const html = source('index.html');
  const homeMarkup = html.slice(html.indexOf('<section id="home"'), html.indexOf('<section id="mission"'));
  assert.equal((homeMarkup.match(/class="[^"]*home-choice/g) || []).length, 4, 'Home must expose exactly four choices');
  assert(html.includes('./assets/tiger/house/house-room-empty.png') && !html.includes('house-room-reference.png'));
  assert(html.includes('./assets/tiger/icons/coin-icon.png') && !source('app.js').includes('🪙'));
  assert(!source('tiger/assets.js').includes('tiger-placeholder.svg'));
  assert(html.indexOf('curriculum/content.js') < html.indexOf('progress.js'));
  assert.match(appSource, /updateDimensions/); assert.match(appSource, /orientationchange/);
  const workflow = source('.github/workflows/pages.yml');
  for (const asset of ['practice.js','revision.js','rewards.js','freewrite.js','curriculum','shop','tiger','audio','character-data','vendor','assets/tiger/poses','house-room-empty.png','assets/tiger/items','coin-icon.png','badge-star.png']) assert(workflow.includes(asset), `Pages staging missing ${asset}`);
  for (const reference of ['assets/reference', 'house-room-reference.png', 'tiger-accessory-alignment-reference.png', 'app-icon-master.png', 'favicon-master.png']) assert(!workflow.includes(reference), `Pages stages reference-only file: ${reference}`);
  const manifest = JSON.parse(source('manifest.webmanifest'));
  assert.equal(manifest.start_url, './'); assert.equal(manifest.scope, './'); assert.equal(manifest.display, 'standalone');
  assert.deepEqual(pngSize('icons/icon-192.png'), [192, 192]);
  assert.deepEqual(pngSize('icons/icon-512.png'), [512, 512]);
  assert.deepEqual(pngSize('icons/icon-maskable-512.png'), [512, 512]);
  assert.deepEqual(pngSize('icons/favicon-32.png'), [32, 32]);

  console.log(`PASS: V0.3.1 covers unchanged Practice/Revision/Mission/migration/rewards, approved Tiger and house assets, generated icons, ${chars.length} character files, offline shell, manifest, resizing and Pages readiness.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
