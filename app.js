(() => {
  "use strict";

  const items = window.CURRICULUM;
  const STORAGE_KEY = "corinne-zh-v0";
  const BADGES = ["🐼", "🏮", "🌟", "🎋", "🏆"];
  const $ = (id) => document.getElementById(id);
  const wholeNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.floor(Number(value)) : 0;
  const shuffle = (values) => [...values].sort(() => Math.random() - 0.5);

  function dateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function emptyItemStats() {
    return Object.fromEntries(items.map((item) => [item.id, { attempts: 0, correct: 0, writes: 0, written: [] }]));
  }

  function freshState() {
    return {
      coins: 0,
      stars: 0,
      streak: 0,
      lastSessionDate: "",
      sessionsCompleted: 0,
      quizAttempts: 0,
      correctAnswers: 0,
      writingRepetitions: 0,
      badges: [],
      daily: { date: dateKey(), itemIds: [], rewardedMissionItems: [], completed: false },
      itemStats: emptyItemStats()
    };
  }

  function loadState() {
    const defaults = freshState();
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (_error) {
      return defaults;
    }
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return defaults;

    const state = {
      ...defaults,
      coins: wholeNumber(saved.coins),
      stars: wholeNumber(saved.stars),
      streak: wholeNumber(saved.streak),
      sessionsCompleted: wholeNumber(saved.sessionsCompleted),
      quizAttempts: wholeNumber(saved.quizAttempts),
      correctAnswers: wholeNumber(saved.correctAnswers),
      writingRepetitions: wholeNumber(saved.writingRepetitions),
      lastSessionDate: typeof saved.lastSessionDate === "string" ? saved.lastSessionDate : "",
      badges: Array.isArray(saved.badges) ? saved.badges.filter((badge) => typeof badge === "string").slice(-20) : []
    };

    if (saved.itemStats && typeof saved.itemStats === "object") {
      items.forEach((item) => {
        const old = saved.itemStats[item.id] || {};
        state.itemStats[item.id] = {
          attempts: wholeNumber(old.attempts),
          correct: wholeNumber(old.correct),
          writes: wholeNumber(old.writes),
          written: Array.isArray(old.written) ? [...new Set(old.written.filter((index) => Number.isInteger(index) && index >= 0 && index < [...item.target].length))] : []
        };
      });
    }

    if (saved.daily && saved.daily.date === dateKey()) {
      const validIds = new Set(items.map((item) => item.id));
      state.daily = {
        date: dateKey(),
        itemIds: Array.isArray(saved.daily.itemIds) ? [...new Set(saved.daily.itemIds.filter((id) => validIds.has(id)))] : [],
        rewardedMissionItems: Array.isArray(saved.daily.rewardedMissionItems) ? [...new Set(saved.daily.rewardedMissionItems.filter((id) => validIds.has(id)))] : [],
        completed: saved.daily.completed === true
      };
    }
    state.streak = window.ProgressLogic.currentStreak(state.lastSessionDate, dateKey(), state.streak);
    return state;
  }

  let state = loadState();
  let mission = null;
  let recall = null;
  const writing = { itemIndex: 0, charIndex: 0, writer: null, completed: new Set(), advanceReady: false };

  function ensureToday() {
    if (state.daily.date !== dateKey()) {
      state.daily = { date: dateKey(), itemIds: [], rewardedMissionItems: [], completed: false };
    }
  }

  function save() {
    ensureToday();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_error) {
      // The app remains usable when storage is unavailable.
    }
    renderStats();
  }

  function speak(text, feedbackElement) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      if (feedbackElement) feedbackElement.textContent = "Speech is not available in this browser.";
      return false;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.72;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function show(name) {
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === name));
    document.querySelectorAll("[data-nav]").forEach((button) => button.classList.toggle("active", button.dataset.nav === name));
    if (name === "write") renderWriting();
    if (name === "recall") startRecall();
    if (name === "parent") renderParent();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderStats() {
    $("coins").textContent = state.coins;
    $("stars").textContent = state.stars;
    $("streak").textContent = state.streak;
    $("rewardCoins").textContent = state.coins;
    $("rewardStars").textContent = state.stars;
    $("badges").textContent = state.badges.length ? state.badges.join(" ") : "Complete today's mission to earn a badge!";
    const progress = state.daily.itemIds.length;
    $("fill").style.width = `${progress / items.length * 100}%`;
    $("progressText").textContent = `${progress} / ${items.length} complete`;
    $("rewardStatus").textContent = state.daily.completed ? "🎁 Reward collected today!" : "🎁 +10 coins, +5 stars";
    $("rewardStatus").classList.toggle("reward-ready", state.daily.completed);
    $("startMission").textContent = state.daily.completed ? "🎯 Practise mission again" : "🎯 Start today's mission";
  }

  function renderLists() {
    $("homeList").replaceChildren();
    $("learnList").replaceChildren();
    $("writeSelect").replaceChildren();
    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "word";
      row.innerHTML = `<b>${index + 1}</b><div><div class="zh">${item.target}</div><div class="sub">${item.pinyin} · ${item.meaning}</div></div><button class="speaker" aria-label="Hear ${item.target}">🔊</button>`;
      row.querySelector("button").addEventListener("click", () => speak(item.target));
      $("homeList").append(row);
      const learnRow = row.cloneNode(true);
      learnRow.querySelector("button").addEventListener("click", () => speak(item.target));
      $("learnList").append(learnRow);

      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${index + 1}. ${item.target}`;
      $("writeSelect").append(option);
    });
  }

  function choicesFor(answer) {
    return shuffle([answer, ...shuffle(items.filter((item) => item.id !== answer.id)).slice(0, 3)]);
  }

  function recordAttempt(item, correct) {
    state.quizAttempts += 1;
    state.itemStats[item.id].attempts += 1;
    if (correct) {
      state.correctAnswers += 1;
      state.itemStats[item.id].correct += 1;
    }
  }

  function startMission() {
    ensureToday();
    mission = { order: shuffle(items.map((_, index) => index)), step: 0, tries: 0, answered: false };
    show("mission");
    renderMissionQuestion();
  }

  function renderMissionQuestion() {
    const item = items[mission.order[mission.step]];
    mission.tries = 0;
    mission.answered = false;
    $("missionStep").textContent = `${mission.step + 1} / ${items.length}`;
    $("missionHint").textContent = item.pinyin;
    $("missionFeedback").textContent = "";
    $("missionFeedback").className = "feedback";
    $("missionNext").classList.add("hidden");
    $("missionChoices").replaceChildren();

    choicesFor(item).forEach((option) => {
      const button = document.createElement("button");
      button.className = "btn choice";
      button.textContent = option.target;
      button.addEventListener("click", () => answerMission(button, option.id === item.id, item));
      $("missionChoices").append(button);
    });
    window.setTimeout(() => {
      if (mission && items[mission.order[mission.step]].id === item.id) speak(item.target, $("missionFeedback"));
    }, 180);
  }

  function answerMission(button, isCorrect, item) {
    if (!mission || mission.answered || button.disabled) return;
    mission.tries += 1;
    recordAttempt(item, isCorrect);

    if (!isCorrect) {
      button.disabled = true;
      button.classList.add("wrong");
      $("missionFeedback").textContent = "Try again — listen carefully!";
      $("missionFeedback").className = "feedback bad";
      save();
      speak(item.target, $("missionFeedback"));
      return;
    }

    mission.answered = true;
    button.classList.add("correct");
    $("missionChoices").querySelectorAll("button").forEach((choice) => { choice.disabled = true; });
    if (!state.daily.itemIds.includes(item.id)) state.daily.itemIds.push(item.id);

    let rewardText = "Correct!";
    if (!state.daily.rewardedMissionItems.includes(item.id)) {
      state.daily.rewardedMissionItems.push(item.id);
      const firstTry = mission.tries === 1;
      state.coins += firstTry ? 3 : 1;
      if (firstTry) state.stars += 1;
      rewardText = firstTry ? "Correct! +3 coins and +1 star" : "Correct! +1 coin";
    } else {
      rewardText = "Correct! You already earned today's reward for this item.";
    }
    $("missionFeedback").textContent = rewardText;
    $("missionFeedback").className = "feedback good";
    $("missionNext").textContent = mission.step === items.length - 1 ? "Finish mission" : "Next";
    $("missionNext").classList.remove("hidden");
    save();
  }

  function updateDailyStreak() {
    const today = dateKey();
    state.streak = window.ProgressLogic.nextStreak(state.lastSessionDate, today, state.streak);
    state.lastSessionDate = today;
  }

  function finishMission() {
    state.sessionsCompleted += 1;
    if (!state.daily.completed) {
      state.daily.completed = true;
      state.coins += 10;
      state.stars += 5;
      updateDailyStreak();
      state.badges.push(BADGES[state.sessionsCompleted % BADGES.length]);
    }
    mission = null;
    save();
    show("rewards");
  }

  function startRecall() {
    recall = { order: shuffle(items.map((_, index) => index)).slice(0, 5), step: 0, tries: 0, answered: false };
    $("recallNext").onclick = nextRecall;
    renderRecallQuestion();
  }

  function renderRecallQuestion() {
    const item = items[recall.order[recall.step]];
    recall.tries = 0;
    recall.answered = false;
    $("recallPrompt").innerHTML = `<div class="pill">${recall.step + 1} / ${recall.order.length}</div><div class="prompt-main">${item.pinyin}</div><div>${item.meaning}</div><button class="speaker" aria-label="Hear the answer">🔊</button>`;
    $("recallPrompt").querySelector("button").addEventListener("click", () => speak(item.target, $("recallFeedback")));
    $("recallFeedback").textContent = "Choose the matching Chinese.";
    $("recallFeedback").className = "feedback";
    $("recallNext").classList.add("hidden");
    $("recallChoices").replaceChildren();
    choicesFor(item).forEach((option) => {
      const button = document.createElement("button");
      button.className = "btn choice";
      button.textContent = option.target;
      button.addEventListener("click", () => answerRecall(button, option.id === item.id, item));
      $("recallChoices").append(button);
    });
  }

  function answerRecall(button, isCorrect, item) {
    if (!recall || recall.answered || button.disabled) return;
    recall.tries += 1;
    recordAttempt(item, isCorrect);
    if (!isCorrect) {
      button.disabled = true;
      button.classList.add("wrong");
      $("recallFeedback").textContent = "Not this one — try again.";
      $("recallFeedback").className = "feedback bad";
      save();
      return;
    }
    recall.answered = true;
    button.classList.add("correct");
    $("recallChoices").querySelectorAll("button").forEach((choice) => { choice.disabled = true; });
    $("recallFeedback").textContent = recall.tries === 1 ? "Great recall!" : "Correct!";
    $("recallFeedback").className = "feedback good";
    $("recallNext").textContent = recall.step === recall.order.length - 1 ? "Finish" : "Next";
    $("recallNext").classList.remove("hidden");
    save();
  }

  function nextRecall() {
    if (recall.step < recall.order.length - 1) {
      recall.step += 1;
      renderRecallQuestion();
    } else {
      $("recallPrompt").innerHTML = `<div class="reward">🐼 ⭐</div><div class="prompt-main">Challenge complete!</div>`;
      $("recallChoices").replaceChildren();
      $("recallFeedback").textContent = "Nice remembering!";
      $("recallNext").textContent = "Try again";
      $("recallNext").classList.remove("hidden");
      $("recallNext").onclick = () => { $("recallNext").onclick = nextRecall; startRecall(); };
    }
  }

  function renderCharacterTabs() {
    const item = items[writing.itemIndex];
    $("characterTabs").replaceChildren();
    [...item.target].forEach((character, index) => {
      const button = document.createElement("button");
      const key = `${item.id}:${index}`;
      button.className = `char-tab${index === writing.charIndex ? " active" : ""}${writing.completed.has(key) ? " done" : ""}`;
      button.textContent = character;
      button.setAttribute("aria-label", `Practise ${character}`);
      button.addEventListener("click", () => { writing.charIndex = index; renderWriting(); });
      $("characterTabs").append(button);
    });
  }

  function localCharacterLoader(character, onComplete, onError) {
    fetch(`./character-data/${encodeURIComponent(character)}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Character data returned ${response.status}`);
        return response.json();
      })
      .then(onComplete)
      .catch(onError);
  }

  function renderWriting() {
    const item = items[writing.itemIndex];
    const character = [...item.target][writing.charIndex];
    $("writeSelect").value = String(writing.itemIndex);
    $("writeItem").textContent = item.target;
    $("writeDetail").textContent = `${item.pinyin} · ${item.meaning} · character ${writing.charIndex + 1} of ${[...item.target].length}`;
    renderCharacterTabs();
    writing.advanceReady = false;
    $("startWriting").textContent = "✍️ Start writing";
    $("writingFeedback").textContent = `Write ${character} in the 米字格.`;
    $("writingFeedback").className = "feedback";

    if (writing.writer && typeof writing.writer.destroy === "function") writing.writer.destroy();
    $("characterTarget").replaceChildren();
    const stage = document.querySelector(".writing-stage");
    const size = Math.max(240, Math.min(354, stage.clientWidth - 6));
    writing.writer = HanziWriter.create("characterTarget", character, {
      width: size,
      height: size,
      padding: 18,
      showCharacter: false,
      showOutline: true,
      strokeColor: "#332f46",
      outlineColor: "#ddd7e8",
      drawingColor: "#6956df",
      drawingWidth: 18,
      highlightColor: "#f0a51a",
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 280,
      charDataLoader: localCharacterLoader,
      onLoadCharDataError: () => { $("writingFeedback").textContent = "This character could not load. Check the app files and try again."; $("writingFeedback").className = "feedback bad"; }
    });
  }

  function startWritingQuiz() {
    if (writing.advanceReady) {
      writing.charIndex += 1;
      renderWriting();
      return;
    }
    if (!writing.writer) return;
    $("writingFeedback").textContent = "Start with the first stroke. You can use a finger or S Pen.";
    $("writingFeedback").className = "feedback";
    writing.writer.quiz({
      showHintAfterMisses: 3,
      highlightOnComplete: true,
      onMistake: (data) => {
        $("writingFeedback").textContent = data.totalMistakes >= 3 ? "Here's a hint — follow the highlighted stroke." : "Almost! Try that stroke again.";
        $("writingFeedback").className = "feedback bad";
      },
      onComplete: completeWritingCharacter
    });
  }

  function completeWritingCharacter() {
    const item = items[writing.itemIndex];
    const key = `${item.id}:${writing.charIndex}`;
    const firstThisSession = !writing.completed.has(key);
    writing.completed.add(key);
    state.writingRepetitions += 1;
    state.itemStats[item.id].writes += 1;
    if (!state.itemStats[item.id].written.includes(writing.charIndex)) state.itemStats[item.id].written.push(writing.charIndex);
    if (firstThisSession) state.coins += 1;
    save();
    renderCharacterTabs();

    const hasNext = writing.charIndex < [...item.target].length - 1;
    $("writingFeedback").textContent = firstThisSession ? `Beautiful! +1 coin${hasNext ? " — ready for the next character." : " — item complete!"}` : "Great repetition! This character's session coin was already collected.";
    $("writingFeedback").className = "feedback good";
    writing.advanceReady = hasNext;
    $("startWriting").textContent = hasNext ? "Next character →" : "✍️ Practise again";
  }

  function masteryFor(item) {
    const stats = state.itemStats[item.id];
    if (!stats.attempts && !stats.writes) return 0;
    const accuracy = stats.attempts ? stats.correct / stats.attempts : 0;
    const writingCoverage = stats.written.length / [...item.target].length;
    return Math.round(accuracy * 60 + writingCoverage * 40);
  }

  function renderParent() {
    const accuracy = state.quizAttempts ? Math.round(state.correctAnswers / state.quizAttempts * 100) : 0;
    const metrics = [
      ["Quiz attempts", state.quizAttempts],
      ["Correct answers", state.correctAnswers],
      ["Accuracy", `${accuracy}%`],
      ["Writing successes", state.writingRepetitions],
      ["Sessions finished", state.sessionsCompleted],
      ["Current streak", `${state.streak} day${state.streak === 1 ? "" : "s"}`]
    ];
    $("parentMetrics").innerHTML = metrics.map(([label, value]) => `<div class="metric"><b>${value}</b><span class="sub">${label}</span></div>`).join("");

    const weak = items.filter((item) => {
      const stats = state.itemStats[item.id];
      return stats.attempts >= 2 && stats.correct / stats.attempts < 0.75;
    });
    $("weakItems").textContent = weak.length ? weak.map((item) => `${item.target} (${item.pinyin})`).join(", ") : "No weak items identified yet.";
    $("masteryList").innerHTML = items.map((item) => {
      const mastery = masteryFor(item);
      return `<div class="mastery-row"><b>${item.target}</b><div class="mastery-track"><div class="mastery-fill" style="width:${mastery}%"></div></div><span>${mastery}%</span></div>`;
    }).join("");
  }

  $("startMission").addEventListener("click", startMission);
  $("speakMission").addEventListener("click", () => {
    if (mission) speak(items[mission.order[mission.step]].target, $("missionFeedback"));
  });
  $("missionNext").addEventListener("click", () => {
    if (!mission) return;
    if (mission.step < items.length - 1) { mission.step += 1; renderMissionQuestion(); } else finishMission();
  });
  $("recallNext").onclick = nextRecall;
  $("writeSelect").addEventListener("change", (event) => { writing.itemIndex = Number(event.target.value); writing.charIndex = 0; renderWriting(); });
  $("animateCharacter").addEventListener("click", () => { if (writing.writer) { writing.writer.animateCharacter(); $("writingFeedback").textContent = "Watch the stroke order, then try it yourself."; } });
  $("startWriting").addEventListener("click", startWritingQuiz);
  $("openParent").addEventListener("click", () => show("parent"));
  document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => show(button.dataset.go)));
  document.querySelectorAll("[data-nav]").forEach((button) => button.addEventListener("click", () => show(button.dataset.nav)));

  renderLists();
  renderStats();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").then((registration) => registration.update()).catch(() => {}));
  }
})();
