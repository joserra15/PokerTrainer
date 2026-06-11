/*
 * cache.js — Memoización ligera para análisis de board, rangos y spots.
 */
(function (global) {
  'use strict';

  const stores = {
    board: new Map(),
    range: new Map(),
    spot: new Map(),
    equity: new Map()
  };

  function get(store, key) {
    return stores[store].get(key);
  }

  function set(store, key, value, maxSize) {
    const m = stores[store];
    if (m.size >= (maxSize || 2000)) {
      const first = m.keys().next().value;
      m.delete(first);
    }
    m.set(key, value);
    return value;
  }

  function memo(store, key, fn, maxSize) {
    const hit = get(store, key);
    if (hit !== undefined) return hit;
    return set(store, key, fn(), maxSize);
  }

  function clear(store) {
    if (store) stores[store].clear();
    else Object.keys(stores).forEach((k) => stores[k].clear());
  }

  global.GTOCache = { get, set, memo, clear, stores };
})(window);
