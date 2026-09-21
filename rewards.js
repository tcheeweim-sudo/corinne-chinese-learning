globalThis.RewardLogic = (() => {
  const DAILY_EXTRA_CAP = 10;
  function ensureDay(state, today) {
    if (state.extraRewards?.date !== today) state.extraRewards = { date: today, claims: [], coinsAwarded: 0 };
    return state.extraRewards;
  }
  function claim(state, { mode, activity, contentId, today }) {
    const daily = ensureDay(state, today);
    const key = `${mode}:${activity}:${contentId}`;
    if (daily.claims.includes(key)) return { awarded: 0, reason: "already-claimed", key };
    if (daily.coinsAwarded >= DAILY_EXTRA_CAP) return { awarded: 0, reason: "daily-cap", key };
    daily.claims.push(key);
    daily.coinsAwarded += 1;
    state.coins += 1;
    return { awarded: 1, reason: "awarded", key };
  }
  return { DAILY_EXTRA_CAP, ensureDay, claim };
})();
