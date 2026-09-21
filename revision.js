globalThis.RevisionLogic = (() => {
  const defaults = Object.freeze({ lessonFrom: 1, lessonTo: 16, contentType: "mixed", includeCurrent: true, includeArchived: true, fullSize: 12, emphasizeWeak: true });
  const uniqueActivities = (items) => [...new Map(items.map((item) => [`${item.activity}:${item.contentId}`, item])).values()];

  function normalise(settings = {}) {
    const lessonFrom = Math.max(1, Math.min(16, Number(settings.lessonFrom) || defaults.lessonFrom));
    return {
      lessonFrom,
      lessonTo: Math.max(lessonFrom, Math.min(16, Number(settings.lessonTo) || defaults.lessonTo)),
      contentType: ["recognition", "writing", "mixed"].includes(settings.contentType) ? settings.contentType : defaults.contentType,
      includeCurrent: settings.includeCurrent !== false,
      includeArchived: settings.includeArchived !== false,
      fullSize: Math.max(10, Math.min(15, Number(settings.fullSize) || defaults.fullSize)),
      emphasizeWeak: settings.emphasizeWeak !== false
    };
  }

  function isWeak(stats = {}) {
    const recognition = stats.recognition || {};
    const selfCheck = stats.selfCheck || {};
    const writing = stats.writing || {};
    const recognitionWeak = recognition.questionsAttempted >= 2 && recognition.firstCorrect / recognition.questionsAttempted < 0.7;
    const selfCheckWeak = selfCheck.attempts >= 2 && selfCheck.firstCorrect / selfCheck.attempts < 0.7;
    return recognitionWeak || selfCheckWeak || globalThis.MissionPlanner.isWeakWriting(writing);
  }

  function pool(settings, state) {
    settings = normalise(settings);
    const result = [];
    const lessons = (globalThis.MOE_P1_STANDARD?.lessons || []).filter((lesson) => lesson.lesson >= settings.lessonFrom && lesson.lesson <= settings.lessonTo);
    for (const lesson of lessons) {
      if (settings.contentType !== "writing") for (const character of lesson.recognition || []) {
        result.push({ id: `moe:recognition:${lesson.id}:${character}`, contentId: ContentModel.canonicalId(character), target: character, activity: "recognition", source: "moe", lessonId: lesson.id });
      }
      if (settings.contentType !== "recognition") for (const character of lesson.writing || []) {
        result.push({ id: `moe:writing:${lesson.id}:${character}`, contentId: ContentModel.canonicalId(character), target: character, activity: "writing", source: "moe", lessonId: lesson.id });
      }
    }
    if (settings.contentType !== "writing") for (const set of globalThis.TINGXIE_SETS || []) {
      if (set.status === "active" && !settings.includeCurrent) continue;
      if (set.status === "archived" && !settings.includeArchived) continue;
      const mappedLesson = (globalThis.MOE_P1_STANDARD?.lessons || []).find((lesson) => lesson.id === set.lessonId);
      if (mappedLesson && (mappedLesson.lesson < settings.lessonFrom || mappedLesson.lesson > settings.lessonTo)) continue;
      for (const item of set.items) result.push({ id: `tingxie:${set.id}:${item.id}`, contentId: ContentModel.canonicalId(item.target), target: item.target, pinyin: item.pinyin, meaning: item.meaning, audio: item.audio, activity: "recognition", source: "tingxie", setId: set.id, itemId: item.id, lessonId: set.lessonId });
    }
    return uniqueActivities(result).map((entry) => ({ ...entry, weak: isWeak(state.canonicalStats?.[entry.contentId]) }));
  }

  function select(kind, settings, state) {
    settings = normalise(settings);
    const available = pool(settings, state);
    if (kind === "weak") return available.filter((item) => item.weak);
    const ordered = settings.emphasizeWeak ? [...available.filter((item) => item.weak), ...available.filter((item) => !item.weak)] : available;
    return ordered.slice(0, kind === "quick" ? 5 : Math.min(15, Math.max(10, Number(settings.fullSize) || 12)));
  }

  return { defaults, normalise, isWeak, pool, select };
})();
