globalThis.PracticeLogic = (() => {
  function resolveSize(set, size) {
    if (size === "all") return set.items.length;
    return Math.min(set.items.length, Number(size) === 5 ? 5 : 3);
  }

  function selectItems(set, size, state = {}) {
    if (size === "all") return set.items.map((item) => item.id);
    const maximum = resolveSize(set, size);
    const setItems = state.tingxieHistory?.[set.id]?.items || {};
    const ranked = set.items.map((item, index) => {
      const canonical = state.canonicalStats?.[globalThis.ContentModel.canonicalId(item.target)] || {};
      const setHistory = setItems[item.id] || {};
      const lastPractised = setHistory.lastPractised || canonical.lastPractised || "";
      return { item, index, weak: globalThis.RevisionLogic?.isWeak?.(canonical) === true, lastPractised };
    });
    const byLastPractised = (left, right) => {
      if (!left.lastPractised !== !right.lastPractised) return !left.lastPractised ? -1 : 1;
      return left.lastPractised.localeCompare(right.lastPractised) || left.index - right.index;
    };
    const weak = ranked.filter((entry) => entry.weak).sort(byLastPractised);
    const other = ranked.filter((entry) => !entry.weak).sort(byLastPractised);
    const unseenOther = other.filter((entry) => !entry.lastPractised);
    const ordered = unseenOther.length
      ? [...weak.slice(0, Math.max(0, maximum - 1)), ...unseenOther, ...weak.slice(Math.max(0, maximum - 1)), ...other.filter((entry) => entry.lastPractised)]
      : [...weak, ...other];
    return [...new Map(ordered.map((entry) => [entry.item.id, entry])).values()].slice(0, maximum).map((entry) => entry.item.id);
  }

  function createSession(set, mode, size, today, state = {}) {
    return {
      id: `${today}:${set.id}:${mode}:${Date.now()}`,
      date: today,
      setId: set.id,
      mode,
      size,
      itemIds: selectItems(set, size, state),
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
