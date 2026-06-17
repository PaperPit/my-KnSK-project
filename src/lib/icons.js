/**
 * icons.js — рендер SVG-иконок из спрайта UiIcons.html
 *
 * В HTML: <?!= include('UiIcons'); ?> в <head>
 * В JS:   import { icon } from '../lib/index.js';
 */

/**
 * @param {string} name — имя Lucide-иконки (без префикса icon-)
 * @param {string | { className?: string, style?: string }} [options]
 * @returns {string}
 */
export function icon(name, options) {
  if (!name) return '';

  let className = '';
  let style = '';

  if (typeof options === 'string') {
    className = options;
  } else if (options) {
    className = options.className || '';
    style = options.style || '';
  }

  const cls = ['knsk-icon', className].filter(Boolean).join(' ');
  const styleAttr = style ? ` style="${style}"` : '';

  return `<svg class="${cls}"${styleAttr} aria-hidden="true"><use href="#icon-${name}"/></svg>`;
}
