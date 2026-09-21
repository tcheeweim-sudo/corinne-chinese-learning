globalThis.PracticeLogic = (() => {
  function resolveSize(set, size) {
    if (size === "all") return set.items.length;
    return Math.min(set.items.length, Number(size) === 5 ? 5 : 3);
  }

  function selectItems(set, size) {
    return set.items.slice(0, resolveSize(set, size)).map((item) => item.id);
  }

  function createSession(set, mode, size, today) {
    return {
      id: `${today}:${set.id}:${mode}:${Date.now()}`,
      date: today,
      setId: set.id,
      mode,
      size,
      itemIds: selectItems(set, size),
      itemIndex: 0,
      characterIndex: 0,
      phase: mode === "test" ? "listen" : "study",
      audioReady: false,
      results: {},
      completed: false
    };
  }

  function recordSelfCheck(session, itemId, correct) {
    const result = session.results[itemId] ||= { firstSelfCorrect: null, selfChecks: 0, completed: false };
    result.selfChecks += 1;
    if (result.firstSelfCorrect === null) result.firstSelfCorrect = correct === true;
    if (correct) result.completed = true;
    return result;
  }

  return { resolveSize, selectItems, createSession, recordSelfCheck };
})();
