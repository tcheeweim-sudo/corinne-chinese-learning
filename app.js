(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const coinReward = (amount) => `<span class="coin-reward"><span>+${amount}</span><img src="${globalThis.TigerAssets.ui.coin}" alt="coin"></span>`;
  const set = globalThis.getActiveTingxie();
  const lesson = globalThis.getMoeLesson(set.lessonId);
  const items = set.items;
  const itemById = (id) => items.find((item) => item.id === id);
  let today = globalThis.ProgressStore.dateKey();
  const store = globalThis.ProgressStore.createStore({ items, set, today });
  const audio = new globalThis.CurriculumAudio();
  const stages = ["intro", "see", "recognise", "write", "recall", "reward"];
  const writing = { writer: null, observer: null, resizeListener: null };
  const modeWriting = { writer: null, observer: null, resizeListener: null, target: null };
  let freeWrite = null;
  const practiceChoice = { setId: set.id, mode: "study", size: "3" };
  const purchaseLocks = new Set();

  const shuffle = (values) => {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  };
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

  function save() {
    store.save();
    renderHeader();
  }

  function refreshDay() {
    today = globalThis.ProgressStore.dateKey();
    const changed = globalThis.ProgressStore.rolloverDay(store.state, today);
    if (changed) {
      audio.stop();
      disposeWriter();
      store.save();
    }
    return changed;
  }

  function rejectExpiredAction() {
    if (!refreshDay()) return false;
    show("home");
    return true;
  }

  function ensureMission() {
    refreshDay();
    if (!store.state.mission) {
      store.state.mission = globalThis.MissionPlanner.createMission(set, lesson, store.state, today);
      save();
    }
    return store.state.mission;
  }

  function show(screenId) {
    refreshDay();
    disposeWriter();
    disposeModeTools();
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === screenId));
    if (screenId === "home") renderHome();
    if (screenId === "mission") renderMission();
    if (screenId === "practice") renderPracticeMenu();
    if (screenId === "practiceRun") renderPracticeSession();
    if (screenId === "revision") renderRevisionMenu();
    if (screenId === "revisionRun") renderRevisionSession();
    if (screenId === "house") renderHouse();
    if (screenId === "parent") renderParent();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderHeader() {
    $("coinCount").textContent = store.state.coins;
  }

  function missionPercent(mission) {
    if (!mission) return 0;
    if (mission.rewardClaimed) return 100;
    return Math.round((stages.indexOf(mission.stage) / (stages.length - 1)) * 100);
  }

  function renderHome() {
    const mission = store.state.mission;
    const percent = missionPercent(mission);
    $("homeProgress").style.width = `${percent}%`;
    $("homeProgressText").textContent = mission?.rewardClaimed ? "Mission complete!" : `${percent}% of today's mission`;
    $("missionSummary").textContent = `Up to ${MissionPlanner.limits.focus} focus items · up to ${MissionPlanner.limits.writing} writing characters · about 5 minutes`;
    $("startMission").textContent = mission ? (mission.rewardClaimed ? "See today's reward" : "Continue mission") : "Start today's mission";
    applyTigerAssets($("home"));
    renderHeader();
  }

  function setStage(stage) {
    if (rejectExpiredAction()) return;
    const mission = ensureMission();
    mission.stage = stage;
    mission.stageIndex = 0;
    mission.questionTries = 0;
    mission.currentHints = 0;
    mission.stageAnswered = false;
    save();
    renderMission();
  }

  function advanceWithinStage(nextStage) {
    if (rejectExpiredAction()) return;
    const mission = ensureMission();
    mission.stageIndex += 1;
    mission.questionTries = 0;
    mission.currentHints = 0;
    mission.stageAnswered = false;
    if (mission.stage === "see" && mission.stageIndex >= mission.focusIds.length) return setStage("recognise");
    if (mission.stage === "recognise" && mission.stageIndex >= mission.focusIds.length) return setStage("write");
    if (mission.stage === "write" && mission.stageIndex >= mission.writingCharacters.length) return setStage("recall");
    if (mission.stage === "recall" && mission.stageIndex >= mission.focusIds.length) return setStage("reward");
    save();
    renderMission();
  }

  function stageHeader(label, step, count) {
    return `<div class="mission-top"><span class="stage-pill">${escapeHtml(label)}</span>${count ? `<span class="step-count">${step + 1} / ${count}</span>` : ""}</div>`;
  }

  function audioButton(item, statusId = "audioStatus") {
    const button = document.createElement("button");
    button.className = "listen-button";
    button.type = "button";
    button.setAttribute("aria-label", `Hear ${item.target}`);
    button.innerHTML = "<span aria-hidden=\"true\">🔊</span><span>Listen</span>";
    button.addEventListener("click", () => audio.play(item, (message, source) => {
      const status = $(statusId);
      if (!status) return;
      status.textContent = message;
      status.dataset.audioSource = source;
      if (source === "unavailable") status.textContent += ` ${item.pinyin}`;
    }));
    return button;
  }

  function renderMission() {
    disposeWriter();
    const mission = ensureMission();
    renderHeader();
    const host = $("missionCard");
    host.replaceChildren();
    if (mission.stage === "intro") return renderIntro(host, mission);
    if (mission.stage === "see") return renderSee(host, mission);
    if (mission.stage === "recognise") return renderQuestion(host, mission, "recognise");
    if (mission.stage === "write") return renderWriting(host, mission);
    if (mission.stage === "recall") return renderQuestion(host, mission, "recall");
    return renderReward(host, mission);
  }

  function renderIntro(host, mission) {
    const focus = mission.focusIds.map((id) => itemById(id));
    host.innerHTML = `${stageHeader("Tiger intro", 0, 0)}
      <div class="intro-layout"><img data-tiger-state="home" class="tiger mission-tiger" alt="A friendly orange tiger">
      <div><p class="tiger-says">Hi Corinne! Let's practise together.</p><h2>Your mission is ready</h2>
      <p>${focus.length} spelling items and ${mission.writingCharacters.length} writing characters. Take your time.</p></div></div>
      <button id="introNext" class="btn primary wide">Let's go</button>`;
    applyTigerAssets(host);
    $("introNext").addEventListener("click", () => setStage("see"));
  }

  function renderSee(host, mission) {
    const item = itemById(mission.focusIds[mission.stageIndex]);
    host.innerHTML = `${stageHeader("See & hear", mission.stageIndex, mission.focusIds.length)}
      <div class="learning-word"><div class="large-hanzi">${escapeHtml(item.target)}</div><div class="pinyin">${escapeHtml(item.pinyin)}</div><div class="meaning">${escapeHtml(item.meaning)}</div></div>
      <div id="listenMount" class="center"></div><p id="audioStatus" class="audio-status" aria-live="polite">Tap Listen to hear the word.</p>
      <button id="stageNext" class="btn primary wide">${mission.stageIndex + 1 === mission.focusIds.length ? "Start listening game" : "Next word"}</button>`;
    $("listenMount").append(audioButton(item));
    $("stageNext").addEventListener("click", () => advanceWithinStage("recognise"));
  }

  function choicesFor(answer) {
    return shuffle([answer, ...shuffle(items.filter((item) => item.id !== answer.id)).slice(0, 3)]);
  }

  function renderQuestion(host, mission, mode) {
    const item = itemById(mission.focusIds[mission.stageIndex]);
    const isRecall = mode === "recall";
    host.innerHTML = `${stageHeader(isRecall ? "Recall" : "Listen & recognise", mission.stageIndex, mission.focusIds.length)}
      <div class="question-prompt">${isRecall ? `<div class="pinyin big">${escapeHtml(item.pinyin)}</div><div class="meaning">${escapeHtml(item.meaning)}</div>` : `<h2>What did you hear?</h2><div id="listenMount" class="center"></div>`}</div>
      <p id="audioStatus" class="audio-status" aria-live="polite">${isRecall ? "Choose the matching Chinese." : "Tap Listen, then choose."}</p>
      <div id="choiceGrid" class="choices"></div><div id="questionFeedback" class="feedback" aria-live="polite"></div>
      <button id="questionNext" class="btn primary wide hidden">Next</button>`;
    if (!isRecall) $("listenMount").append(audioButton(item));
    if (mission.stageAnswered) {
      $("questionFeedback").textContent = "Great work!";
      $("questionFeedback").className = "feedback good";
      $("questionNext").classList.remove("hidden");
    } else {
      for (const option of choicesFor(item)) {
        const button = document.createElement("button");
        button.className = "choice";
        button.textContent = option.target;
        button.addEventListener("click", () => answerQuestion(button, option.id === item.id, item, mode));
        $("choiceGrid").append(button);
      }
    }
    $("questionNext").addEventListener("click", () => advanceWithinStage(isRecall ? "reward" : "write"));
  }

  function answerQuestion(button, correct, item, mode) {
    if (rejectExpiredAction()) return;
    const mission = ensureMission();
    if (mission.stageAnswered || button.disabled) return;
    mission.questionTries += 1;
    globalThis.ProgressStore.recordQuestion(store.state, set.id, item.id, correct, mission.questionTries, today);
    if (!correct) {
      button.disabled = true;
      button.classList.add("wrong");
      $("questionFeedback").textContent = "Try again. You can do it!";
      $("questionFeedback").className = "feedback bad";
      save();
      return;
    }
    mission.stageAnswered = true;
    button.classList.add("correct");
    $("choiceGrid").querySelectorAll("button").forEach((choice) => { choice.disabled = true; });
    const resultList = mode === "recall" ? mission.recalledIds : mission.recognisedIds;
    if (!resultList.includes(item.id)) resultList.push(item.id);
    let message = "Correct!";
    if (mode === "recognise" && !store.state.daily.rewardedMissionItems.includes(item.id)) {
      const reward = mission.questionTries === 1 ? 3 : 1;
      store.state.daily.rewardedMissionItems.push(item.id);
      if (!store.state.daily.itemIds.includes(item.id)) store.state.daily.itemIds.push(item.id);
      if (!mission.rewardedItemIds.includes(item.id)) mission.rewardedItemIds.push(item.id);
      store.state.coins += reward;
      mission.coinsEarned += reward;
      message = `Correct! +${reward} coin${reward === 1 ? "" : "s"}`;
    }
    $("questionFeedback").textContent = message;
    $("questionFeedback").className = "feedback good";
    $("questionNext").classList.remove("hidden");
    save();
  }

  function disposeWriter() {
    writing.writer?.cancelQuiz();
    writing.observer?.disconnect();
    writing.observer = null;
    if (writing.resizeListener) window.removeEventListener("resize", writing.resizeListener);
    writing.resizeListener = null;
    writing.writer = null;
  }

  function disposeModeTools() {
    modeWriting.writer?.cancelQuiz?.();
    modeWriting.observer?.disconnect();
    if (modeWriting.resizeListener) window.removeEventListener("resize", modeWriting.resizeListener);
    modeWriting.writer = null;
    modeWriting.observer = null;
    modeWriting.resizeListener = null;
    modeWriting.target = null;
    freeWrite?.destroy();
    freeWrite = null;
  }

  function writerSize() {
    const stage = $("writingStage");
    return Math.max(220, Math.floor(stage?.getBoundingClientRect().width || 320));
  }

  function resizeWriter() {
    if (!writing.writer) return;
    const size = writerSize();
    writing.writer.updateDimensions({ width: size, height: size });
  }

  function renderWriting(host, mission) {
    if (!mission.writingCharacters.length) return setStage("recall");
    const character = mission.writingCharacters[mission.stageIndex];
    host.innerHTML = `${stageHeader("Write", mission.stageIndex, mission.writingCharacters.length)}
      <div class="write-heading"><div><h2>Write <span class="hanzi-inline">${escapeHtml(character)}</span></h2><p>Follow the stroke order.</p></div>
      <button id="showStrokes" class="btn compact">Show strokes</button></div>
      <div id="writingStage" class="writing-stage"><div id="characterTarget"></div></div>
      <p id="writingFeedback" class="feedback" aria-live="polite">${mission.stageAnswered ? "Beautiful writing!" : "Tap Start writing when you're ready."}</p>
      <button id="startWriting" class="btn primary wide ${mission.stageAnswered ? "hidden" : ""}">Start writing</button>
      <button id="writingNext" class="btn primary wide ${mission.stageAnswered ? "" : "hidden"}">Next</button>`;
    const size = writerSize();
    writing.writer = globalThis.HanziWriter.create("characterTarget", character, {
      width: size, height: size, padding: 14, showOutline: true, showCharacter: false,
      strokeAnimationSpeed: 0.9, delayBetweenStrokes: 140,
      charDataLoader: (char) => fetch(`./character-data/${encodeURIComponent(char)}.json`).then((response) => {
        if (!response.ok) throw new Error(`Missing character data for ${char}`);
        return response.json();
      })
    });
    if ("ResizeObserver" in globalThis) {
      writing.observer = new ResizeObserver(() => window.requestAnimationFrame(resizeWriter));
      writing.observer.observe($("writingStage"));
    } else {
      writing.resizeListener = resizeWriter;
      window.addEventListener("resize", writing.resizeListener);
    }
    $("showStrokes").addEventListener("click", () => writing.writer?.animateCharacter());
    $("startWriting").addEventListener("click", startWritingQuiz);
    $("writingNext").addEventListener("click", () => advanceWithinStage("recall"));
  }

  function startWritingQuiz() {
    if (rejectExpiredAction()) return;
    const mission = ensureMission();
    if (!writing.writer || mission.stageAnswered) return;
    $("startWriting").disabled = true;
    $("writingFeedback").textContent = "Write the character in the square.";
    writing.writer.quiz({
      showHintAfterMisses: 3,
      onMistake: () => {
        if (rejectExpiredAction() || store.state.mission !== mission) return;
        mission.currentHints += 1;
        $("writingFeedback").textContent = mission.currentHints >= 3 ? "Here's the next stroke. Follow it, then keep going." : "Try that stroke again.";
        save();
      },
      onComplete: () => {
        if (rejectExpiredAction() || store.state.mission !== mission) return;
        const character = mission.writingCharacters[mission.stageIndex];
        if (!mission.rewardedWritingCharacters.includes(character)) {
          mission.rewardedWritingCharacters.push(character);
          const related = mission.focusIds.filter((id) => [...itemById(id).target].includes(character));
          globalThis.ProgressStore.completeWriting(store.state, character, related, mission.currentHints, today);
          store.state.coins += 1;
          mission.coinsEarned += 1;
        }
        mission.stageAnswered = true;
        $("writingFeedback").textContent = "Beautiful writing! +1 coin";
        $("writingFeedback").className = "feedback good";
        $("startWriting").classList.add("hidden");
        $("writingNext").classList.remove("hidden");
        save();
      }
    });
  }

  function claimMissionReward(mission) {
    if (rejectExpiredAction() || store.state.mission !== mission) return;
    if (mission.rewardClaimed) return;
    mission.rewardClaimed = true;
    mission.completed = true;
    if (!store.state.daily.completed) {
      store.state.daily.completed = true;
      store.state.coins += 10;
      mission.coinsEarned += 10;
      store.state.sessionsCompleted += 1;
      store.state.streak = globalThis.ProgressLogic.nextStreak(store.state.lastSessionDate, today, store.state.streak);
      store.state.lastSessionDate = today;
    }
    const coverage = store.state.selectionCoverage[set.id] ||= { coveredItemIds: [] };
    const previous = coverage.coveredItemIds.length >= items.length ? [] : coverage.coveredItemIds;
    coverage.coveredItemIds = [...new Set([...previous, ...mission.focusIds])];
    save();
  }

  function renderReward(host, mission) {
    claimMissionReward(mission);
    host.innerHTML = `${stageHeader("Reward", 0, 0)}
      <div class="reward-scene"><img class="reward-star" src="${globalThis.TigerAssets.ui.badge}" alt=""><img data-tiger-state="celebrate" class="tiger reward-tiger" alt="Happy tiger"><div class="coin-burst">${coinReward(mission.coinsEarned)}</div></div>
      <h2 class="center">Mission complete!</h2><p class="center">You practised ${mission.focusIds.length} spelling items and ${mission.writingCharacters.length} writing characters.</p>
      <div class="reward-actions"><button id="rewardHouse" class="btn primary">Visit Tiger House</button><button id="rewardHome" class="btn">Back home</button></div>`;
    $("rewardHouse").addEventListener("click", () => show("house"));
    applyTigerAssets(host);
    $("rewardHome").addEventListener("click", () => show("home"));
  }

  function activePracticeSet() {
    return globalThis.TINGXIE_SETS.find((entry) => entry.id === practiceChoice.setId) || set;
  }

  function renderPracticeMenu() {
    const list = $("practiceSetList");
    list.replaceChildren();
    for (const entry of globalThis.TINGXIE_SETS) {
      const button = document.createElement("button");
      button.className = `set-option${entry.id === practiceChoice.setId ? " active" : ""}`;
      button.innerHTML = `<span>${escapeHtml(entry.label)}</span><small>${entry.status === "active" ? "Current" : "Past list"}</small>`;
      button.addEventListener("click", () => { practiceChoice.setId = entry.id; renderPracticeMenu(); });
      list.append(button);
    }
    $("practiceStudy").classList.toggle("active", practiceChoice.mode === "study");
    $("practiceTest").classList.toggle("active", practiceChoice.mode === "test");
    document.querySelectorAll("[data-practice-size]").forEach((button) => button.classList.toggle("active", button.dataset.practiceSize === practiceChoice.size));
    $("startPractice").textContent = `Start ${practiceChoice.mode === "study" ? "Study" : "Test"}`;
  }

  function startPractice() {
    refreshDay();
    store.state.practiceSession = globalThis.PracticeLogic.createSession(activePracticeSet(), practiceChoice.mode, practiceChoice.size, today, store.state);
    save();
    show("practiceRun");
  }

  function practiceItem(session) {
    const practiceSet = globalThis.TINGXIE_SETS.find((entry) => entry.id === session.setId);
    return practiceSet?.items.find((item) => item.id === session.itemIds[session.itemIndex]);
  }

  function renderPracticeSession() {
    disposeModeTools();
    const session = store.state.practiceSession;
    if (!session || session.date !== today) return show("practice");
    const host = $("practiceCard");
    host.replaceChildren();
    if (session.completed) {
      const checks = Object.values(session.results).filter((result) => result.firstSelfCorrect !== null);
      const first = checks.filter((result) => result.firstSelfCorrect === true).length;
      host.innerHTML = `${stageHeader("Practice complete", 0, 0)}<div class="reward-scene"><img data-tiger-state="celebrate" class="tiger reward-tiger" alt="Celebrating tiger"><div class="coin-burst">${coinReward(session.coinsEarned || 0)}</div></div><h2 class="center">Great practice!</h2>${session.mode === "test" ? `<p class="center">First self-check: ${first} of ${checks.length} marked “Got it”.</p>` : ""}<button id="practiceDone" class="btn primary wide">Back to Practice 听写</button>`;
      applyTigerAssets(host);
      $("practiceDone").addEventListener("click", () => { store.state.practiceSession = null; save(); show("practice"); });
      return;
    }
    const item = practiceItem(session);
    if (!item) return finishPracticeSession(session);
    if (session.mode === "study") renderPracticeStudy(host, session, item);
    else renderPracticeTest(host, session, item);
  }

  function createGuidedWriter(targetId, character, onComplete, onMistake = () => {}) {
    const target = $(targetId);
    modeWriting.target = target;
    const size = Math.max(220, Math.floor(target.parentElement.getBoundingClientRect().width || 320));
    modeWriting.writer = globalThis.HanziWriter.create(targetId, character, {
      width: size, height: size, padding: 14, showOutline: true, showCharacter: false,
      charDataLoader: (char) => fetch(`./character-data/${encodeURIComponent(char)}.json`).then((response) => {
        if (!response.ok) throw new Error(`Missing character data for ${char}`);
        return response.json();
      })
    });
    const resize = () => {
      const next = Math.max(220, Math.floor(target.parentElement.getBoundingClientRect().width || 320));
      modeWriting.writer?.updateDimensions({ width: next, height: next });
    };
    if ("ResizeObserver" in globalThis) {
      modeWriting.observer = new ResizeObserver(resize);
      modeWriting.observer.observe(target.parentElement);
    } else {
      modeWriting.resizeListener = resize;
      window.addEventListener("resize", resize);
    }
    $("modeShowStrokes")?.addEventListener("click", () => modeWriting.writer?.animateCharacter());
    $("modeStartWriting")?.addEventListener("click", () => {
      $("modeStartWriting").disabled = true;
      modeWriting.writer.quiz({ showHintAfterMisses: 3, onMistake, onComplete });
    });
  }

  function renderPracticeStudy(host, session, item) {
    const characters = [...item.target];
    const character = characters[session.characterIndex] || characters[0];
    host.innerHTML = `${stageHeader("Study", session.itemIndex, session.itemIds.length)}<div class="learning-word"><div class="large-hanzi">${escapeHtml(item.target)}</div><div class="pinyin">${escapeHtml(item.pinyin || "")}</div>${item.meaning ? `<div class="meaning">${escapeHtml(item.meaning)}</div>` : ""}</div><div id="practiceListen" class="center"></div><p id="practiceAudioStatus" class="audio-status">Listen, then practise each character.</p><div class="write-heading"><h2>Write <span class="hanzi-inline">${escapeHtml(character)}</span></h2><button id="modeShowStrokes" class="btn compact">Show strokes</button></div><div class="writing-stage"><div id="modeCharacterTarget"></div></div><button id="modeStartWriting" class="btn primary wide">Start writing</button>`;
    $("practiceListen").append(audioButton(item, "practiceAudioStatus"));
    let hints = 0;
    createGuidedWriter("modeCharacterTarget", character, () => {
      globalThis.ProgressStore.completeWriting(store.state, character, [], hints, today);
      session.characterIndex += 1;
      if (session.characterIndex >= characters.length) completePracticeItem(session, item, "study");
      else { save(); renderPracticeSession(); }
    }, () => { hints += 1; });
  }

  function renderPracticeTest(host, session, item) {
    const result = session.results[item.id];
    if (session.phase === "reveal") {
      host.innerHTML = `${stageHeader("Test: check", session.itemIndex, session.itemIds.length)}<p class="center">The answer is:</p><div class="revealed-answer"><div class="large-hanzi">${escapeHtml(item.target)}</div></div><p class="center">Did you get it?</p><div class="option-grid"><button id="selfTry" class="btn">Try again</button><button id="selfGot" class="btn primary">Got it</button></div>`;
      $("selfTry").addEventListener("click", () => selfCheckPractice(session, item, false));
      $("selfGot").addEventListener("click", () => selfCheckPractice(session, item, true));
      return;
    }
    // This DOM intentionally contains no target, pinyin, meaning, outline, hint, or answer-bearing label.
    host.innerHTML = `${stageHeader("Test", session.itemIndex, session.itemIds.length)}<h2 class="center">Listen and write what you hear</h2><div class="audio-actions"><button id="testPlayAudio" class="listen-button"><span aria-hidden="true">🔊</span><span>Play word</span></button></div><p id="testAudioStatus" class="audio-status" aria-live="polite">Play the word before writing.</p><div id="audioFailureActions" class="audio-actions hidden"><button id="testRetryAudio" class="btn">Retry audio</button><button id="testSkip" class="btn">Skip</button><button id="testStudy" class="btn">Study this item</button></div><div class="freewrite-wrap"><canvas id="freeWriteCanvas" class="freewrite-canvas" aria-label="Blank free-writing surface"></canvas><div class="freewrite-tools"><button id="clearFreeWrite" class="btn compact">Clear</button><button id="checkFreeWrite" class="btn primary" disabled>Check answer</button></div></div>`;
    const syncCheck = () => { $("checkFreeWrite").disabled = !(session.audioReady && freeWrite?.hasInk); };
    freeWrite = new globalThis.FreeWriteSurface($("freeWriteCanvas"), syncCheck);
    $("clearFreeWrite").addEventListener("click", () => freeWrite.clear());
    const play = async () => {
      $("testAudioStatus").textContent = "Trying pronunciation…";
      const outcome = await audio.play(item, (message, source) => { $("testAudioStatus").textContent = source === "unavailable" ? "Sound is unavailable. Try again, skip, or study this item." : message; });
      session.audioReady = outcome.ok;
      syncCheck();
      $("audioFailureActions").classList.toggle("hidden", outcome.ok);
      save();
    };
    $("testPlayAudio").addEventListener("click", play);
    $("testRetryAudio").addEventListener("click", play);
    $("testSkip").addEventListener("click", () => advancePractice(session));
    $("testStudy").addEventListener("click", () => { session.mode = "study"; session.itemIds = [item.id]; session.itemIndex = 0; session.characterIndex = 0; session.phase = "study"; session.studyOnly = true; save(); renderPracticeSession(); });
    $("checkFreeWrite").addEventListener("click", () => { if (!session.audioReady || !freeWrite?.hasInk) return; session.phase = "reveal"; save(); renderPracticeSession(); });
    if (result?.firstSelfCorrect === false) $("testAudioStatus").textContent = "Try once more, then check again.";
  }

  function selfCheckPractice(session, item, correct) {
    const prior = session.results[item.id]?.firstSelfCorrect;
    const result = globalThis.PracticeLogic.recordSelfCheck(session, item.id, correct);
    if (prior == null) globalThis.ProgressStore.recordTingxieSelfCheck(store.state, session.setId, item, correct, today);
    if (!correct) {
      session.phase = "listen"; session.audioReady = false; save(); renderPracticeSession(); return;
    }
    completePracticeItem(session, item, "test");
  }

  function completePracticeItem(session, item, mode) {
    globalThis.ProgressStore.completeTingxieItem(store.state, session.setId, item, mode, today);
    const reward = globalThis.RewardLogic.claim(store.state, { mode: "practice", activity: mode, contentId: globalThis.ContentModel.canonicalId(item.target), today });
    session.coinsEarned = (session.coinsEarned || 0) + reward.awarded;
    advancePractice(session);
  }

  function advancePractice(session) {
    session.itemIndex += 1; session.characterIndex = 0; session.phase = session.mode === "test" ? "listen" : "study"; session.audioReady = false;
    if (session.itemIndex >= session.itemIds.length || session.studyOnly) finishPracticeSession(session);
    else { save(); renderPracticeSession(); }
  }

  function finishPracticeSession(session) {
    if (!session.completed) {
      session.completed = true;
      const history = store.state.tingxieHistory[session.setId] ||= { sessions: 0, items: {} };
      history.sessions += 1;
      store.state.modeMetrics.tingxieSessions += 1;
      save();
    }
    renderPracticeSession();
  }

  function renderRevisionMenu() {
    $("revisionEmpty").classList.add("hidden");
  }

  function startRevision(kind) {
    refreshDay();
    const selected = globalThis.RevisionLogic.select(kind, store.state.revisionSettings, store.state);
    if (!selected.length) {
      const empty = $("revisionEmpty");
      empty.classList.remove("hidden");
      empty.innerHTML = kind === "weak" ? `<h2>No weak items in this revision scope</h2><p>That is good news. You can do a Quick Revision instead.</p><button id="emptyQuick" class="btn primary">Quick Revision</button>` : `<h2>No revision content in this scope</h2><p>A grown-up can adjust Revision Settings.</p>`;
      $("emptyQuick")?.addEventListener("click", () => startRevision("quick"));
      return;
    }
    store.state.revisionSession = { id: `${today}:${kind}:${Date.now()}`, date: today, kind, items: selected, itemIndex: 0, phase: "question", tries: 0, reviewRequeued: {}, completed: false, coinsEarned: 0 };
    save(); show("revisionRun");
  }

  function renderRevisionSession() {
    disposeModeTools();
    const session = store.state.revisionSession;
    if (!session || session.date !== today) return show("revision");
    const host = $("revisionCard"); host.replaceChildren();
    if (session.completed) {
      host.innerHTML = `${stageHeader("Revision complete", 0, 0)}<div class="reward-scene"><img data-tiger-state="happy" class="tiger reward-tiger" alt="Happy tiger"><div class="coin-burst">${coinReward(session.coinsEarned)}</div></div><h2 class="center">Revision complete!</h2><button id="revisionDone" class="btn primary wide">Back to Revision</button>`;
      applyTigerAssets(host); $("revisionDone").addEventListener("click", () => { store.state.revisionSession = null; save(); show("revision"); }); return;
    }
    const activity = session.items[session.itemIndex];
    if (!activity) return finishRevision(session);
    if (activity.activity === "writing") renderRevisionWriting(host, session, activity);
    else if (activity.source === "tingxie" && activity.audio) renderRevisionListening(host, session, activity);
    else renderRevisionReview(host, session, activity);
  }

  function renderRevisionReview(host, session, activity) {
    host.innerHTML = `${stageHeader("Review card", session.itemIndex, session.items.length)}<p class="center muted">Review this character. This card is not scored.</p><div class="learning-word"><div class="large-hanzi">${escapeHtml(activity.target)}</div></div><div class="option-grid"><button id="revNeed" class="btn">Need more practice</button><button id="revNext" class="btn primary">Next</button></div>`;
    $("revNeed").addEventListener("click", () => deferRevisionReview(session, activity));
    $("revNext").addEventListener("click", () => completeRevisionActivity(session, activity));
  }

  function deferRevisionReview(session, activity) {
    session.reviewRequeued ||= {};
    if (!session.reviewRequeued[activity.id]) {
      session.reviewRequeued[activity.id] = true;
      session.items.splice(session.itemIndex, 1);
      session.items.push({ ...activity, reviewRetry: true });
      save(); renderRevisionSession(); return;
    }
    session.itemIndex += 1;
    if (session.itemIndex >= session.items.length) finishRevision(session); else { save(); renderRevisionSession(); }
  }

  function renderRevisionListening(host, session, activity) {
    const options = shuffle(globalThis.TINGXIE_SETS.flatMap((entry) => entry.items).filter((entry) => entry.target !== activity.target)).slice(0, 3);
    options.push({ target: activity.target });
    host.innerHTML = `${stageHeader("Listen & recognise", session.itemIndex, session.items.length)}<h2 class="center">What did you hear?</h2><div id="revisionListen" class="center"></div><p id="revisionAudioStatus" class="audio-status">Tap Listen, then choose.</p><div id="revisionChoices" class="choices"></div><p id="revisionFeedback" class="feedback"></p>`;
    $("revisionListen").append(audioButton(activity, "revisionAudioStatus"));
    for (const option of shuffle(options)) {
      const button = document.createElement("button"); button.className = "choice"; button.textContent = option.target;
      button.addEventListener("click", () => {
        const correct = option.target === activity.target; session.tries += 1;
        globalThis.ProgressStore.recordCanonicalRecognition(store.state, activity.contentId, correct, session.tries, today);
        if (!correct) { button.disabled = true; button.classList.add("wrong"); $("revisionFeedback").textContent = "Try again."; save(); return; }
        completeRevisionActivity(session, activity);
      });
      $("revisionChoices").append(button);
    }
  }

  function renderRevisionWriting(host, session, activity) {
    host.innerHTML = `${stageHeader("Writing", session.itemIndex, session.items.length)}<div class="write-heading"><h2>Write <span class="hanzi-inline">${escapeHtml(activity.target)}</span></h2><button id="modeShowStrokes" class="btn compact">Show strokes</button></div><div class="writing-stage"><div id="modeCharacterTarget"></div></div><button id="modeStartWriting" class="btn primary wide">Start writing</button>`;
    let hints = 0;
    createGuidedWriter("modeCharacterTarget", activity.target, () => {
      globalThis.ProgressStore.completeWriting(store.state, activity.target, [], hints, today);
      completeRevisionActivity(session, activity);
    }, () => { hints += 1; });
  }

  function completeRevisionActivity(session, activity) {
    const reward = globalThis.RewardLogic.claim(store.state, { mode: "revision", activity: activity.activity, contentId: activity.contentId, today });
    globalThis.ProgressStore.touchCanonical(store.state, activity.contentId, new Date().toISOString());
    session.coinsEarned += reward.awarded; session.itemIndex += 1; session.tries = 0;
    if (session.itemIndex >= session.items.length) finishRevision(session); else { save(); renderRevisionSession(); }
  }

  function finishRevision(session) {
    if (!session.completed) { session.completed = true; store.state.modeMetrics.revisionSessions += 1; save(); }
    renderRevisionSession();
  }

  function applyTigerAssets(root = document) {
    root.querySelectorAll("[data-tiger-state]").forEach((image) => { image.src = globalThis.TigerAssets.get(image.dataset.tigerState); });
  }

  function renderFurniture(host, item) {
    host.replaceChildren();
    if (!item) return;
    if (!item.image) { host.textContent = item.placeholder; return; }
    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.name;
    image.addEventListener("error", () => { host.textContent = item.placeholder; }, { once: true });
    host.append(image);
  }

  function renderHouse() {
    renderHeader();
    const room = $("roomSlots");
    room.replaceChildren();
    for (const slot of ["picture", "lamp", "plant", "bed", "pillow", "rug", "basket", "accessory"]) {
      const itemId = store.state.tigerHouse.slots[slot];
      const item = globalThis.TigerHouse.catalogue.find((entry) => entry.id === itemId);
      const marker = document.createElement("div");
      marker.className = `room-slot slot-${slot}`;
      marker.dataset.slot = slot;
      renderFurniture(marker, item);
      marker.setAttribute("aria-label", item ? `${item.name} equipped` : `${slot} slot empty`);
      room.append(marker);
    }
    const catalogue = $("shopCatalogue");
    catalogue.replaceChildren();
    for (const item of globalThis.TigerHouse.catalogue) {
      const owned = store.state.tigerHouse.owned.includes(item.id);
      const equipped = store.state.tigerHouse.slots[item.slot] === item.id;
      const card = document.createElement("article");
      card.className = "shop-item";
      card.innerHTML = `<div class="shop-icon"></div><div><b>${escapeHtml(item.name)}</b><span>${item.price} coins</span></div><button class="btn compact">${equipped ? "Placed" : owned ? "Place" : "Buy"}</button>`;
      renderFurniture(card.querySelector(".shop-icon"), item);
      const button = card.querySelector("button");
      button.disabled = equipped;
      button.addEventListener("click", () => owned ? equipItem(item.id) : buyItem(item.id));
      catalogue.append(card);
    }
    $("houseMessage").textContent = "Choose cosy things for Tiger's room.";
    applyTigerAssets($("house"));
  }

  function buyItem(itemId) {
    if (purchaseLocks.has(itemId)) return;
    purchaseLocks.add(itemId);
    const result = globalThis.TigerHouse.purchase(store.state, itemId);
    purchaseLocks.delete(itemId);
    if (!result.ok) {
      $("houseMessage").textContent = result.reason === "insufficient-coins" ? "Save a few more coins for that item." : "You already own that item.";
      return;
    }
    globalThis.TigerHouse.equip(store.state, itemId);
    save();
    renderHouse();
    $("houseMessage").textContent = `${result.item.name} is now in Tiger's room!`;
  }

  function equipItem(itemId) {
    const result = globalThis.TigerHouse.equip(store.state, itemId);
    if (result.ok) save();
    renderHouse();
    $("houseMessage").textContent = result.ok ? `${result.item.name} is placed.` : "That item is not available.";
  }

  function masteryFor(item) {
    const stats = store.state.itemStats[item.id];
    const r = stats.recognition;
    if (!r.questionsAttempted) return 0;
    const accuracy = r.firstCorrect / r.questionsAttempted;
    return Math.round(Math.min(100, accuracy * 75 + Math.min(25, stats.writing.successfulRepetitions * 8)));
  }

  function renderParent() {
    const metrics = store.state.questionMetrics;
    const accuracy = metrics.attempted ? Math.round(metrics.firstCorrect / metrics.attempted * 100) : 0;
    const completion = metrics.attempted ? Math.round(metrics.completed / metrics.attempted * 100) : 0;
    const selfCheckAccuracy = store.state.modeMetrics.tingxieSelfChecks ? Math.round(store.state.modeMetrics.tingxieFirstCorrect / store.state.modeMetrics.tingxieSelfChecks * 100) : 0;
    $("parentSummary").innerHTML = `
      <div class="metric"><span>Active set</span><b>${escapeHtml(set.label)}</b></div><div class="metric"><span>MOE mapping</span><b>P1${lesson.volume} · Lesson ${lesson.lesson}</b></div>
      <div class="metric"><span>Sessions</span><b>${store.state.sessionsCompleted}</b></div><div class="metric"><span>Current streak</span><b>${ProgressLogic.currentStreak(store.state.lastSessionDate, today, store.state.streak)} days</b></div>
      <div class="metric"><span>Questions attempted</span><b>${metrics.attempted}</b></div><div class="metric"><span>Answer responses</span><b>${metrics.responses}</b></div>
      <div class="metric"><span>Correct first try</span><b>${accuracy}%</b></div><div class="metric"><span>Question completion</span><b>${completion}%</b></div>
      <div class="metric"><span>Writing repetitions</span><b>${store.state.writingRepetitions}</b></div><div class="metric"><span>听写 sessions</span><b>${store.state.modeMetrics.tingxieSessions}</b></div>
      <div class="metric"><span>First-attempt self-check</span><b>${selfCheckAccuracy}%</b></div><div class="metric"><span>Revision sessions</span><b>${store.state.modeMetrics.revisionSessions}</b></div>
      <div class="metric"><span>Revision scope</span><b>Lessons ${store.state.revisionSettings.lessonFrom}–${store.state.revisionSettings.lessonTo}</b></div>`;
    const weak = globalThis.RevisionLogic.select("weak", store.state.revisionSettings, store.state);
    $("weakItems").textContent = weak.length ? [...new Set(weak.map((item) => item.target))].join("、") : "No weak items in the current revision scope.";
    $("itemMastery").innerHTML = items.map((item) => `<div class="mastery-row"><b>${escapeHtml(item.target)}</b><div class="mastery-track"><i style="width:${masteryFor(item)}%"></i></div><span>${masteryFor(item)}%</span></div>`).join("");
    $("characterMastery").innerHTML = lesson.writing.map((character) => {
      const stats = store.state.characterStats[character] || {};
      const level = Math.min(100, (stats.successfulRepetitions || 0) * 40 + (stats.legacyCompleted ? 20 : 0));
      return `<div class="character-chip"><b>${character}</b><span>${stats.successfulRepetitions || 0} writes · ${level}%</span></div>`;
    }).join("");
    const settings = store.state.revisionSettings;
    $("revisionFrom").value = settings.lessonFrom;
    $("revisionTo").value = settings.lessonTo;
    $("revisionType").value = settings.contentType;
    $("revisionFullSize").value = settings.fullSize;
    $("revisionCurrent").checked = settings.includeCurrent;
    $("revisionArchived").checked = settings.includeArchived;
    $("revisionWeak").checked = settings.emphasizeWeak;
  }

  function saveRevisionSettings() {
    const from = Math.max(1, Math.min(16, Number($("revisionFrom").value) || 1));
    const to = Math.max(from, Math.min(16, Number($("revisionTo").value) || 16));
    store.state.revisionSettings = {
      lessonFrom: from, lessonTo: to,
      contentType: ["mixed", "recognition", "writing"].includes($("revisionType").value) ? $("revisionType").value : "mixed",
      includeCurrent: $("revisionCurrent").checked,
      includeArchived: $("revisionArchived").checked,
      fullSize: Math.max(10, Math.min(15, Number($("revisionFullSize").value) || 12)),
      emphasizeWeak: $("revisionWeak").checked
    };
    save();
    $("settingsStatus").textContent = "Revision settings saved on this device.";
    renderParent();
  }

  $("startMission").addEventListener("click", () => show("mission"));
  $("openPractice").addEventListener("click", () => show("practice"));
  $("openRevision").addEventListener("click", () => show("revision"));
  $("openHouse").addEventListener("click", () => show("house"));
  $("openParent").addEventListener("click", () => show("parent"));
  $("practiceStudy").addEventListener("click", () => { practiceChoice.mode = "study"; renderPracticeMenu(); });
  $("practiceTest").addEventListener("click", () => { practiceChoice.mode = "test"; renderPracticeMenu(); });
  document.querySelectorAll("[data-practice-size]").forEach((button) => button.addEventListener("click", () => { practiceChoice.size = button.dataset.practiceSize; renderPracticeMenu(); }));
  $("startPractice").addEventListener("click", startPractice);
  document.querySelectorAll("[data-practice-menu]").forEach((button) => button.addEventListener("click", () => show("practice")));
  document.querySelectorAll("[data-revision-menu]").forEach((button) => button.addEventListener("click", () => show("revision")));
  document.querySelectorAll("[data-revision-kind]").forEach((button) => button.addEventListener("click", () => startRevision(button.dataset.revisionKind)));
  for (const id of ["revisionFrom", "revisionTo", "revisionType", "revisionFullSize", "revisionCurrent", "revisionArchived", "revisionWeak"]) $(id).addEventListener("change", saveRevisionSettings);
  document.querySelectorAll("[data-home]").forEach((button) => button.addEventListener("click", () => show("home")));
  window.addEventListener("orientationchange", () => window.setTimeout(() => {
    resizeWriter();
    if (modeWriting.writer && modeWriting.target) {
      const size = Math.max(220, Math.floor(modeWriting.target.parentElement.getBoundingClientRect().width || 320));
      modeWriting.writer.updateDimensions({ width: size, height: size });
    }
  }, 120));
  const resume = () => { if (refreshDay()) show("home"); };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) resume(); });
  window.addEventListener("pageshow", resume);
  window.addEventListener("focus", resume);
  audio.preload(items);
  renderHome();

  globalThis.AppDebug = { store, set, lesson, ensureMission, show, resizeWriter, audio, startPractice, startRevision };
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => {}));
  }
})();
