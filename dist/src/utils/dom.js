/**
 * DOM Utility Module
 */

const domCache = new Map();

/**
 * Get element by ID with caching
 */
export function getEl(id) {
  if (domCache.has(id)) return domCache.get(id);
  const el = document.getElementById(id);
  if (el) domCache.set(id, el);
  return el;
}

/**
 * Optimized list rendering using DocumentFragment
 */
export function renderList(container, items, renderer) {
  if (!container) return;
  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const el = renderer(item, index);
    if (el) fragment.appendChild(el);
  });
  container.innerHTML = '';
  container.appendChild(fragment);
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
