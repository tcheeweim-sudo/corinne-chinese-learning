window.ProgressLogic = {
  nextStreak(lastDate, today, currentStreak) {
    if (lastDate === today) return currentStreak;
    if (!lastDate) return 1;
    const [oldYear, oldMonth, oldDay] = lastDate.split("-").map(Number);
    const [year, month, day] = today.split("-").map(Number);
    const gap = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(oldYear, oldMonth - 1, oldDay)) / 86400000);
    return gap === 1 ? currentStreak + 1 : 1;
  },

  currentStreak(lastDate, today, savedStreak) {
    if (!lastDate) return 0;
    if (lastDate === today) return savedStreak;
    const [oldYear, oldMonth, oldDay] = lastDate.split("-").map(Number);
    const [year, month, day] = today.split("-").map(Number);
    const gap = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(oldYear, oldMonth - 1, oldDay)) / 86400000);
    return Number.isFinite(gap) && gap <= 1 ? savedStreak : 0;
  }
};
