/**
 * DOM utility module - safe element creation and manipulation
 */

/** Create a DOM element with attributes and children (XSS-safe) */
export function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') node.className = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
  }
  if (typeof children === 'string') node.textContent = children;
  else if (Array.isArray(children)) children.forEach(c => { if (c) node.appendChild(c); });
  else if (children instanceof Node) node.appendChild(children);
  return node;
}

/** Set a status message */
export function setStatus(id, type, msg) {
  const statusEl = document.getElementById(id);
  statusEl.className = 'status ' + type;
  statusEl.textContent = msg;
}

/** Build a labeled info box */
export function buildInfoItem(label, value) {
  return el('div', { className: 'info-item' }, [
    el('div', { className: 'info-label' }, label),
    el('div', { className: 'info-value' }, value)
  ]);
}

/** Show/hide element */
export function show(id) { document.getElementById(id).classList.remove('hidden'); }
export function hide(id) { document.getElementById(id).classList.add('hidden'); }
