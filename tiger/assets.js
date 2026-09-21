globalThis.TigerAssets = (() => {
  const fallback = "./tiger/assets/tiger-placeholder.svg";
  const paths = {
    home: fallback, happy: fallback, celebrate: fallback, encourage: fallback,
    thinking: fallback, writing: fallback, sleeping: fallback, house: fallback
  };
  return { fallback, paths, get: (state) => paths[state] || fallback };
})();
