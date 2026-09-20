globalThis.CurriculumAudio = class CurriculumAudio {
  constructor(options = {}) {
    this.audioFactory = options.audioFactory || ((source) => new Audio(source));
    this.synthesis = options.synthesis ?? globalThis.speechSynthesis;
    this.Utterance = options.Utterance ?? globalThis.SpeechSynthesisUtterance;
    this.voiceWaitMs = options.voiceWaitMs || 800;
    this.currentAudio = null;
  }

  preload(items) {
    items.slice(0, 2).forEach((item) => {
      if (!item.audio) return;
      try {
        const audio = this.audioFactory(item.audio);
        audio.preload = "metadata";
        if (typeof audio.load === "function") audio.load();
      } catch (_error) { /* Playback will use the fallback path. */ }
    });
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause?.();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.synthesis?.cancel?.();
  }

  async play(item, report = () => {}) {
    this.stop();
    if (item.audio) {
      try {
        const audio = this.audioFactory(item.audio);
        audio.preload = "auto";
        this.currentAudio = audio;
        await audio.play();
        report("Playing saved pronunciation.", "local");
        return { ok: true, source: "local" };
      } catch (_error) {
        this.currentAudio = null;
      }
    }
    try {
      await this.playSpeech(item.target);
      report("Using this device's Mandarin voice.", "tts");
      return { ok: true, source: "tts" };
    } catch (_error) {
      report("Sound is unavailable. Use the pinyin shown, or ask a grown-up for help.", "unavailable");
      return { ok: false, source: "unavailable" };
    }
  }

  async voices() {
    if (!this.synthesis?.getVoices) return [];
    let voices = this.synthesis.getVoices();
    if (voices.length) return voices;
    voices = await new Promise((resolve) => {
      const finish = () => resolve(this.synthesis.getVoices());
      const timer = setTimeout(finish, this.voiceWaitMs);
      this.synthesis.addEventListener?.("voiceschanged", () => { clearTimeout(timer); finish(); }, { once: true });
    });
    return voices;
  }

  async playSpeech(text) {
    if (!this.synthesis || !this.Utterance) throw new Error("Speech synthesis unavailable");
    const voices = await this.voices();
    const voice = voices.find((entry) => /^zh[-_]CN$/i.test(entry.lang)) || voices.find((entry) => /^(zh|cmn)/i.test(entry.lang));
    if (!voice && voices.length) throw new Error("Mandarin voice unavailable");
    const utterance = new this.Utterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.72;
    if (voice) utterance.voice = voice;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Speech did not start")), 1800);
      utterance.onstart = () => { clearTimeout(timer); resolve(); };
      utterance.onerror = (event) => { clearTimeout(timer); reject(new Error(event.error || "Speech failed")); };
      this.synthesis.speak(utterance);
    });
  }
};
