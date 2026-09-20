globalThis.MissionPlanner = (() => {
  const unique = (values) => [...new Set(values)];
  const limits = Object.freeze({ focus: 3, writing: 2 });
  // Historical "hints" count writing difficulties. Clean repetitions lower this ratio.
  const isWeakWriting = (stats = {}) => (stats.hints || 0) >= 2 &&
    (stats.hints || 0) / Math.max(1, stats.successfulRepetitions || 0) >= 2;
  const isWeakItem = (stats = {}) => {
    const recognition = stats.recognition || stats;
    const writing = stats.writing || stats;
    const enoughQuestions = (recognition.questionsAttempted || 0) >= 2;
    const accuracy = enoughQuestions ? (recognition.firstCorrect || 0) / recognition.questionsAttempted : 1;
    return (enoughQuestions && accuracy < 0.7) || isWeakWriting(writing);
  };

  function selectFocus(set, progress, maximum = limits.focus) {
    const itemStats = progress.itemStats || {};
    const coverage = progress.selectionCoverage?.[set.id]?.coveredItemIds || [];
    const allIds = set.items.map((item) => item.id);
    const validCoverage = unique(coverage.filter((id) => allIds.includes(id)));
    const covered = validCoverage.length >= allIds.length ? [] : validCoverage;
    const unseen = allIds.filter((id) => !covered.includes(id));
    const weak = allIds.filter((id) => isWeakItem(itemStats[id]));
    const ordered = [
      ...weak.filter((id) => covered.includes(id)).slice(0, Math.max(0, maximum - 1)),
      ...weak.filter((id) => unseen.includes(id)),
      ...unseen.filter((id) => !weak.includes(id)),
      ...weak.filter((id) => covered.includes(id)),
      ...(unseen.length <= maximum ? covered.filter((id) => !weak.includes(id)) : [])
    ];
    return unique(ordered).slice(0, maximum);
  }

  function selectWriting(set, focusIds, lesson, progress, maximum = limits.writing) {
    const focusCharacters = unique(set.items.filter((item) => focusIds.includes(item.id)).flatMap((item) => [...item.target]));
    const required = lesson?.writing || [];
    const characterStats = progress.characterStats || {};
    const weak = required.filter((character) => isWeakWriting(characterStats[character]));
    return unique([
      ...weak.filter((character) => focusCharacters.includes(character)),
      ...focusCharacters.filter((character) => required.includes(character)),
      ...weak,
      ...required
    ]).slice(0, maximum);
  }

  function createMission(set, lesson, progress, today) {
    const focusIds = selectFocus(set, progress);
    return {
      id: `${today}:${set.id}`,
      date: today,
      setId: set.id,
      lessonId: lesson?.id || null,
      focusIds,
      writingCharacters: selectWriting(set, focusIds, lesson, progress),
      stage: "intro",
      stageIndex: 0,
      questionTries: 0,
      currentHints: 0,
      stageAnswered: false,
      recognisedIds: [],
      recalledIds: [],
      rewardedItemIds: [],
      rewardedWritingCharacters: [],
      coinsEarned: 0,
      completed: false,
      rewardClaimed: false
    };
  }

  return { limits, isWeakWriting, isWeakItem, selectFocus, selectWriting, createMission };
})();
