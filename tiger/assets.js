globalThis.TigerAssets = (() => {
  const paths = {
    home: "./assets/tiger/poses/tiger-home.png",
    happy: "./assets/tiger/poses/tiger-happy.png",
    celebrate: "./assets/tiger/poses/tiger-celebrate.png",
    encourage: "./assets/tiger/poses/tiger-encourage.png",
    thinking: "./assets/tiger/poses/tiger-thinking.png",
    writing: "./assets/tiger/poses/tiger-writing.png",
    sleeping: "./assets/tiger/poses/tiger-sleeping.png",
    house: "./assets/tiger/poses/tiger-house.png"
  };
  const ui = {
    houseBackground: "./assets/tiger/house/house-room-empty.png",
    coin: "./assets/tiger/icons/coin-icon.png",
    badge: "./assets/tiger/icons/badge-star.png"
  };
  const fallback = paths.home;
  return { fallback, paths, ui, get: (state) => paths[state] || fallback };
})();
