globalThis.ContentModel = (() => {
  const canonicalId = (target) => `zh:${target}`;
  const canonicalIdForSetItem = (setId, itemId) => {
    const set = (globalThis.TINGXIE_SETS || []).find((entry) => entry.id === setId);
    const item = set?.items.find((entry) => entry.id === itemId);
    return item ? canonicalId(item.target) : null;
  };

  function buildCanonicalContent() {
    const records = new Map();
    for (const set of globalThis.TINGXIE_SETS || []) {
      for (const item of set.items) {
        const id = canonicalId(item.target);
        const record = records.get(id) || { id, target: item.target, type: [...item.target].length === 1 ? "character" : "phrase", setRefs: [], lessonRefs: [] };
        record.pinyin ||= item.pinyin;
        record.meaning ||= item.meaning;
        record.audio ||= item.audio;
        record.setRefs.push({ setId: set.id, itemId: item.id });
        records.set(id, record);
      }
    }
    for (const lesson of globalThis.MOE_P1_STANDARD?.lessons || []) {
      for (const character of lesson.recognition || []) {
        const id = canonicalId(character);
        const record = records.get(id) || { id, target: character, type: "character", setRefs: [], lessonRefs: [] };
        record.lessonRefs.push({ lessonId: lesson.id, role: "recognition" });
        records.set(id, record);
      }
      for (const character of lesson.writing || []) {
        const id = canonicalId(character);
        const record = records.get(id) || { id, target: character, type: "character", setRefs: [], lessonRefs: [] };
        record.lessonRefs.push({ lessonId: lesson.id, role: "writing" });
        records.set(id, record);
      }
    }
    return [...records.values()];
  }

  const get = (id) => buildCanonicalContent().find((record) => record.id === id);
  return { canonicalId, canonicalIdForSetItem, buildCanonicalContent, get };
})();
