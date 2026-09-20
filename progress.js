(() => {
  "use strict";

  const STORAGE_KEY = "corinne-zh-v0";
  const STATE_VERSION = 2;
  const wholeNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.floor(Number(value)) : 0;
  const validStringArray = (value) => Array.isArray(value) ? [...new Set(value.filter((entry) => typeof entry === "string"))] : [];

  function dateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const ProgressLogic = {
    nextStreak(lastDate, today, currentStreak) {
      if (lastDate === today) return wholeNumber(currentStreak);
      if (!lastDate) return 1;
      const [oldYear, oldMonth, oldDay] = lastDate.split("-").map(Number);
      const [year, month, day] = today.split("-").map(Number);
      const gap = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(oldYear, oldMonth - 1, oldDay)) / 86400000);
      return gap === 1 ? wholeNumber(currentStreak) + 1 : 1;
    },
    currentStreak(lastDate, today, savedStreak) {
      if (!lastDate) return 0;
      if (lastDate === today) return wholeNumber(savedStreak);
      const [oldYear, oldMonth, oldDay] = lastDate.split("-").map(Number);
      const [year, month, day] = today.split("-").map(Number);
      const gap = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(oldYear, oldMonth - 1, oldDay)) / 86400000);
      return Number.isFinite(gap) && gap === 1 ? wholeNumber(savedStreak) : 0;
    }
  };

  const emptyRecognition = (source = {}) => ({
    questionsAttempted: wholeNumber(source.questionsAttempted), responses: wholeNumber(source.responses),
    firstCorrect: wholeNumber(source.firstCorrect), completed: wholeNumber(source.completed)
  });
  const emptyWriting = (source = {}) => ({
    successfulRepetitions: wholeNumber(source.successfulRepetitions), hints: wholeNumber(source.hints)
  });
  const freshItemStats = (items) => Object.fromEntries(items.map((item) => [item.id, {
    recognition: emptyRecognition(), writing: emptyWriting(), lastPractised: "",
    legacy: { answerResponses: 0, correctResponses: 0, writingCompletions: 0, writtenCharacters: [] }
  }]));

  function freshState(items, today = dateKey()) {
    return {
      stateVersion: STATE_VERSION,
      coins: 0, stars: 0, badges: [], streak: 0, lastSessionDate: "", sessionsCompleted: 0,
      quizAttempts: 0, correctAnswers: 0,
      questionMetrics: { attempted: 0, responses: 0, firstCorrect: 0, completed: 0 },
      writingRepetitions: 0, itemStats: freshItemStats(items), characterStats: {},
      daily: { date: today, itemIds: [], rewardedMissionItems: [], completed: false },
      legacyDaily: null, selectionCoverage: {}, mission: null,
      tigerHouse: globalThis.TigerHouse?.freshHouse?.() || { owned: [], slots: {}, purchases: [] }
    };
  }

  function normaliseMission(mission, set, today) {
    if (!mission || typeof mission !== "object" || mission.date !== today || mission.setId !== set.id) return null;
    const validIds = new Set(set.items.map((item) => item.id));
    const stages = new Set(["intro", "see", "recognise", "write", "recall", "reward"]);
    const focusIds = validStringArray(mission.focusIds).filter((id) => validIds.has(id)).slice(0, 4);
    if (!focusIds.length) return null;
    const writingCharacters = validStringArray(mission.writingCharacters).slice(0, 4);
    const stage = stages.has(mission.stage) ? mission.stage : "intro";
    const stageLength = stage === "write" ? writingCharacters.length : (["see", "recognise", "recall"].includes(stage) ? focusIds.length : 1);
    return {
      ...mission,
      id: typeof mission.id === "string" ? mission.id : `${today}:${set.id}`,
      date: today, setId: set.id,
      lessonId: typeof mission.lessonId === "string" ? mission.lessonId : null,
      focusIds,
      writingCharacters,
      stage,
      stageIndex: Math.min(wholeNumber(mission.stageIndex), Math.max(0, stageLength - 1)), questionTries: wholeNumber(mission.questionTries),
      currentHints: wholeNumber(mission.currentHints),
      stageAnswered: mission.stageAnswered === true,
      recognisedIds: validStringArray(mission.recognisedIds).filter((id) => validIds.has(id)),
      recalledIds: validStringArray(mission.recalledIds).filter((id) => validIds.has(id)),
      rewardedItemIds: validStringArray(mission.rewardedItemIds).filter((id) => validIds.has(id)),
      rewardedWritingCharacters: validStringArray(mission.rewardedWritingCharacters),
      coinsEarned: wholeNumber(mission.coinsEarned), completed: mission.completed === true,
      rewardClaimed: mission.rewardClaimed === true
    };
  }

  function migrateState(raw, { items, set, today = dateKey() }) {
    const state = freshState(items, today);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return state;
    for (const field of ["coins", "stars", "streak", "sessionsCompleted", "quizAttempts", "correctAnswers", "writingRepetitions"]) state[field] = wholeNumber(raw[field]);
    state.lastSessionDate = typeof raw.lastSessionDate === "string" ? raw.lastSessionDate : "";
    state.badges = validStringArray(raw.badges).slice(-100);
    for (const field of Object.keys(state.questionMetrics)) state.questionMetrics[field] = wholeNumber(raw.questionMetrics?.[field]);

    for (const item of items) {
      const saved = raw.itemStats?.[item.id];
      if (!saved || typeof saved !== "object") continue;
      if (raw.stateVersion === STATE_VERSION) {
        state.itemStats[item.id] = {
          recognition: emptyRecognition(saved.recognition), writing: emptyWriting(saved.writing),
          lastPractised: typeof saved.lastPractised === "string" ? saved.lastPractised : "",
          legacy: {
            answerResponses: wholeNumber(saved.legacy?.answerResponses), correctResponses: wholeNumber(saved.legacy?.correctResponses),
            writingCompletions: wholeNumber(saved.legacy?.writingCompletions), writtenCharacters: validStringArray(saved.legacy?.writtenCharacters)
          }
        };
      } else {
        const indexes = Array.isArray(saved.written) ? saved.written.filter((index) => Number.isInteger(index) && index >= 0 && index < [...item.target].length) : [];
        state.itemStats[item.id].legacy = {
          answerResponses: wholeNumber(saved.attempts), correctResponses: wholeNumber(saved.correct), writingCompletions: wholeNumber(saved.writes),
          writtenCharacters: [...new Set(indexes.map((index) => [...item.target][index]))]
        };
      }
    }

    if (raw.stateVersion === STATE_VERSION && raw.characterStats && typeof raw.characterStats === "object") {
      for (const [character, saved] of Object.entries(raw.characterStats)) {
        if (typeof character !== "string" || !saved || typeof saved !== "object") continue;
        state.characterStats[character] = {
          successfulRepetitions: wholeNumber(saved.successfulRepetitions), hints: wholeNumber(saved.hints),
          lastPractised: typeof saved.lastPractised === "string" ? saved.lastPractised : "", legacyCompleted: saved.legacyCompleted === true
        };
      }
    } else {
      for (const stats of Object.values(state.itemStats)) for (const character of stats.legacy.writtenCharacters) {
        state.characterStats[character] ||= { successfulRepetitions: 0, hints: 0, lastPractised: "", legacyCompleted: true };
        state.characterStats[character].legacyCompleted = true;
      }
    }

    const validIds = new Set(items.map((item) => item.id));
    if (raw.daily && typeof raw.daily === "object") {
      const migratedDaily = {
        date: typeof raw.daily.date === "string" ? raw.daily.date : today,
        itemIds: validStringArray(raw.daily.itemIds).filter((id) => validIds.has(id)),
        rewardedMissionItems: validStringArray(raw.daily.rewardedMissionItems).filter((id) => validIds.has(id)),
        completed: raw.daily.completed === true
      };
      if (migratedDaily.date === today) state.daily = migratedDaily; else state.legacyDaily = migratedDaily;
    }
    if (raw.stateVersion === STATE_VERSION) {
      if (raw.selectionCoverage && typeof raw.selectionCoverage === "object") {
        for (const [setId, coverage] of Object.entries(raw.selectionCoverage)) state.selectionCoverage[setId] = { coveredItemIds: validStringArray(coverage?.coveredItemIds) };
      }
      state.mission = normaliseMission(raw.mission, set, today);
      state.tigerHouse = globalThis.TigerHouse?.normalise?.(raw.tigerHouse) || state.tigerHouse;
    }
    state.streak = ProgressLogic.currentStreak(state.lastSessionDate, today, state.streak);
    return state;
  }

  function recordQuestion(state, itemId, correct, responseNumber, today = dateKey()) {
    const item = state.itemStats[itemId];
    if (!item) return;
    state.questionMetrics.responses += 1; item.recognition.responses += 1; state.quizAttempts += 1;
    if (responseNumber === 1) {
      state.questionMetrics.attempted += 1; item.recognition.questionsAttempted += 1;
      if (correct) { state.questionMetrics.firstCorrect += 1; item.recognition.firstCorrect += 1; }
    }
    if (correct) {
      state.questionMetrics.completed += 1; item.recognition.completed += 1; state.correctAnswers += 1;
    }
    item.lastPractised = today;
  }

  function rolloverDay(state, today = dateKey()) {
    if (state.daily.date === today && (!state.mission || state.mission.date === today)) return false;
    state.legacyDaily = state.daily;
    state.daily = { date: today, itemIds: [], rewardedMissionItems: [], completed: false };
    state.mission = null;
    // Keep the last completed streak and its date; display/next completion derives its current value.
    return true;
  }

  function completeWriting(state, character, itemIds, hints, today = dateKey()) {
    state.characterStats[character] ||= { successfulRepetitions: 0, hints: 0, lastPractised: "", legacyCompleted: false };
    const charStats = state.characterStats[character];
    charStats.successfulRepetitions += 1; charStats.hints += wholeNumber(hints); charStats.lastPractised = today;
    state.writingRepetitions += 1;
    for (const id of itemIds) {
      const stats = state.itemStats[id];
      if (!stats) continue;
      stats.writing.successfulRepetitions += 1; stats.writing.hints += wholeNumber(hints); stats.lastPractised = today;
    }
  }

  function createStore({ storage = globalThis.localStorage, items, set, today = dateKey() }) {
    let parsed = null;
    try { parsed = JSON.parse(storage?.getItem?.(STORAGE_KEY) || "null"); } catch (_error) { parsed = null; }
    let state = migrateState(parsed, { items, set, today });
    return {
      get state() { return state; },
      save() { try { storage?.setItem?.(STORAGE_KEY, JSON.stringify(state)); } catch (_error) {} return state; },
      replace(nextState) { state = nextState; return state; }
    };
  }

  globalThis.ProgressLogic = ProgressLogic;
  globalThis.ProgressStore = { STORAGE_KEY, STATE_VERSION, dateKey, freshState, migrateState, recordQuestion, completeWriting, createStore, rolloverDay };
})();
