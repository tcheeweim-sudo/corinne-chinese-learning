globalThis.TigerHouse = (() => {
  const catalogue = [
    { id: "cloud-pillow", name: "Cloud Pillow", price: 20, slot: "pillow", image: "./assets/tiger/items/house-pillow.png", placeholder: "☁️" },
    { id: "peach-rug", name: "Peach Rug", price: 30, slot: "rug", image: "./assets/tiger/items/house-rug.png", placeholder: "🟠" },
    { id: "warm-lamp", name: "Warm Lamp", price: 40, slot: "lamp", image: "./assets/tiger/items/house-lamp.png", placeholder: "💡" },
    { id: "little-plant", name: "Little Plant", price: 50, slot: "plant", image: "./assets/tiger/items/house-plant.png", placeholder: "🪴" },
    { id: "tiger-picture", name: "Tiger Picture", price: 60, slot: "picture", image: "./assets/tiger/items/house-picture.png", placeholder: "🖼️" },
    { id: "toy-basket", name: "Toy Basket", price: 75, slot: "basket", image: "./assets/tiger/items/house-basket.png", placeholder: "🧺" },
    { id: "cosy-bed", name: "Cosy Bed", price: 90, slot: "bed", image: "./assets/tiger/items/house-bed.png", placeholder: "🛏️" },
    { id: "peach-ribbon", name: "Peach Ribbon", price: 120, slot: "accessory", image: "./assets/tiger/items/tiger-ribbon.png", placeholder: "🎀" },
    { id: "sunny-hat", name: "Sunny Hat", price: 120, slot: "accessory", image: "./assets/tiger/items/tiger-hat.png", placeholder: "👒" }
  ];

  function freshHouse() { return { owned: [], slots: {}, purchases: [] }; }
  function normalise(house) {
    const validIds = new Set(catalogue.map((item) => item.id));
    const owned = Array.isArray(house?.owned) ? [...new Set(house.owned.filter((id) => validIds.has(id)))] : [];
    const slots = {};
    for (const [slot, id] of Object.entries(house?.slots || {})) {
      const item = catalogue.find((entry) => entry.id === id);
      if (item && item.slot === slot && owned.includes(id)) slots[slot] = id;
    }
    return { owned, slots, purchases: Array.isArray(house?.purchases) ? house.purchases.filter((entry) => validIds.has(entry?.itemId)) : [] };
  }
  function purchase(state, itemId, purchasedAt = new Date().toISOString()) {
    const item = catalogue.find((entry) => entry.id === itemId);
    if (!item) return { ok: false, reason: "unknown-item" };
    if (state.tigerHouse.owned.includes(itemId)) return { ok: false, reason: "already-owned" };
    if (state.coins < item.price) return { ok: false, reason: "insufficient-coins" };
    state.coins -= item.price;
    state.tigerHouse.owned.push(itemId);
    state.tigerHouse.purchases.push({ itemId, price: item.price, purchasedAt });
    return { ok: true, item };
  }
  function equip(state, itemId) {
    const item = catalogue.find((entry) => entry.id === itemId);
    if (!item || !state.tigerHouse.owned.includes(itemId)) return { ok: false, reason: "not-owned" };
    state.tigerHouse.slots[item.slot] = itemId;
    return { ok: true, item };
  }
  return { catalogue, freshHouse, normalise, purchase, equip };
})();
