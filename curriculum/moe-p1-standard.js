globalThis.MOE_P1_STANDARD = {
  id: "moe-p1-standard-2024",
  level: "Primary 1",
  course: "Standard Chinese",
  source: "MOE",
  sourceUrl: "https://www.moe.gov.sg/-/media/files/primary/syllabus/2024-character-list-primary-one-chinese.pdf",
  lessons: [
    {
      id: "p1b-l16",
      lesson: 16,
      volume: "1B",
      recognition: ["扫", "户", "桌", "椅", "兄", "房", "阿", "叔", "会", "写", "啊", "完", "业", "躲", "进", "净", "谁", "打", "听", "声"],
      writing: ["父", "母", "她", "他", "会", "你", "们", "爸", "妈", "打"],
      source: "MOE"
    }
  ]
};

globalThis.getMoeLesson = (lessonId) => globalThis.MOE_P1_STANDARD.lessons.find((lesson) => lesson.id === lessonId);
