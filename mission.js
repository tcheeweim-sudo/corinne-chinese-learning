globalThis.MissionPlanner = (() => {
  const unique = (values) => [...new Set(values)];
  const isWeakItem = (stats = {}) => {
    const recognition = stats.recognition || stats;
    const writing = stats.writing || stats;
    const enoughQuestions = (recognition.questionsAttempted || 0) >= 2;
    const accuracy = enoughQuestions ? (recognition.firstCorrect || 0) / recognition.questionsAttempted : 1;
    return (enoughQuestions && accuracy < 0.7) || (writing.hints || 0) >= 2;
  };

  function selectFocus(set, progress, maximum = 4) {
    const itemStats = progress.itemStats || {};
    const coverage = progress.selectionCoverage?.[set.id]?.coveredItemIds || [];
    const allIds = set.items.map((item) => item.id);
    const covered = coverage.length >= allIds.length ? [] : coverage.filter((id) => allIds.includes(id));
    const unseen = allIds.filter((id) => !covered.includes(id));
    const weak = allIds.filter((id) => isWeakItem(itemStats[id]));
    const ordered = [
      ...weak.filter((id) => unseen.includes(id)),
      ...unseen.filter((id) => !weak.includes(id)),
      ...weak.filter((id) => covered.includes(id)),
      ...(unseen.length <= maximum ? covered.filter((id) => !weak.includes(id)) : [])
    ];
    return unique(ordered).slice(0, maximum);
  }

  function selectWriting(set, focusIds, lesson, progress, maximum = 4) {
    const focusCharacters = unique(set.items.filter((item) => focusIds.includes(item.id)).flatMap((item) => [...item.target]));
    const required = lesson?.writing || [];
    const characterStats = progress.characterStats || {};
    const weak = required.filter((character) => (characterStats[character]?.hints || 0) >= 2);
    return unique([
      ...weak.filter((character) => focusCharacters.includes(character)),
      ...focusCharacters.filter((character) => required.includes(character)),
      ...weak,
      ...required
    ]).slice(0, maximum);
  }

  function createMission(set, lesson, progress, today) {
    const focusIds = selectFocus(set, progress, 4);
    return {
      id: `${today}:${set.id}`,
      date: today,
      setId: set.id,
      lessonId: lesson?.id || null,
      focusIds,
      writingCharacters: selectWriting(set, focusIds, lesson, progress, 4),
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

  return { isWeakItem, selectFocus, selectWriting, createMission };
})();
