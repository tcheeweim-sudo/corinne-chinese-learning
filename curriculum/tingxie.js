globalThis.TINGXIE_SETS = [
  {
    id: "tingxie-16-2026-09-23",
    label: "听写（十六）",
    testDate: "2026-09-23",
    lessonId: "p1b-l16",
    source: "school",
    status: "active",
    items: [
      { id: "mama", target: "妈妈", pinyin: "mā ma", meaning: "mother", audio: "./audio/tingxie-16/mama.mp3" },
      { id: "baba", target: "爸爸", pinyin: "bà ba", meaning: "father", audio: "./audio/tingxie-16/baba.mp3" },
      { id: "kg", target: "一公斤", pinyin: "yī gōng jīn", meaning: "one kilogram", audio: "./audio/tingxie-16/kg.mp3" },
      { id: "nimen", target: "你们", pinyin: "nǐ men", meaning: "you (plural)", audio: "./audio/tingxie-16/nimen.mp3" },
      { id: "taqu", target: "她不会去", pinyin: "tā bù huì qù", meaning: "She will not go.", audio: "./audio/tingxie-16/taqu.mp3" },
      { id: "daqiu", target: "我会打球", pinyin: "wǒ huì dǎ qiú", meaning: "I can play ball.", audio: "./audio/tingxie-16/daqiu.mp3" },
      { id: "fumu", target: "他们是我的父母", pinyin: "tā men shì wǒ de fù mǔ", meaning: "They are my parents.", audio: "./audio/tingxie-16/fumu.mp3" }
    ]
  }
];

globalThis.getActiveTingxie = () => globalThis.TINGXIE_SETS.find((set) => set.status === "active") || globalThis.TINGXIE_SETS[0];
// Compatibility is derived from the canonical school set; no content is duplicated.
globalThis.CURRICULUM = globalThis.getActiveTingxie().items;
const associatedLesson = globalThis.getMoeLesson(globalThis.getActiveTingxie().lessonId);
globalThis.REQUIRED_CHARACTERS = [...new Set([
  ...globalThis.CURRICULUM.flatMap((item) => [...item.target]),
  ...(associatedLesson?.writing || [])
])];
