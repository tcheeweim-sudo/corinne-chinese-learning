window.CURRICULUM = [
  { id: "mama", target: "妈妈", pinyin: "mā ma", meaning: "mother" },
  { id: "baba", target: "爸爸", pinyin: "bà ba", meaning: "father" },
  { id: "kg", target: "一公斤", pinyin: "yī gōng jīn", meaning: "one kilogram" },
  { id: "nimen", target: "你们", pinyin: "nǐ men", meaning: "you (plural)" },
  { id: "taqu", target: "她不会去", pinyin: "tā bù huì qù", meaning: "She will not go." },
  { id: "daqiu", target: "我会打球", pinyin: "wǒ huì dǎ qiú", meaning: "I can play ball." },
  { id: "fumu", target: "他们是我的父母", pinyin: "tā men shì wǒ de fù mǔ", meaning: "They are my parents." }
];

window.REQUIRED_CHARACTERS = [...new Set(window.CURRICULUM.flatMap((item) => [...item.target]))];
