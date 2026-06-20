/**
 * dialogA11y.js — фокус в модальных диалогах (WCAG)
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true' && !el.closest('[aria-hidden="true"]')
  );
}

export function trapFocus(panel) {
  if (!panel) return () => {};

  function onKeyDown(e) {
    if (e.key !== 'Tab') return;
    const nodes = getFocusableElements(panel);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  panel.addEventListener('keydown', onKeyDown);
  return () => panel.removeEventListener('keydown', onKeyDown);
}

export function focusFirst(panel, selector) {
  if (!panel) return;
  requestAnimationFrame(() => {
    const target = selector ? panel.querySelector(selector) : getFocusableElements(panel)[0];
    if (target) target.focus();
  });
}

export function restoreFocus(el) {
  if (el && typeof el.focus === 'function') {
    try {
      el.focus({ preventScroll: true });
    } catch (_) {
      el.focus();
    }
  }
}
