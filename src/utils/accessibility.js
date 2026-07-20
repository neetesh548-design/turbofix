export function announceToScreenReader(message, priority = 'polite') {
  const el = document.createElement('div');
  el.setAttribute('aria-live', priority);
  el.setAttribute('aria-atomic', 'true');
  el.className = 'sr-only';
  el.textContent = message;
  document.body.appendChild(el);

  setTimeout(() => el.remove(), 1000);
}

export function enableKeyboardNavigation() {
  document.documentElement.setAttribute('data-keyboard-nav', 'true');

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modals = document.querySelectorAll('[role="dialog"]');
      if (modals.length) {
        modals[modals.length - 1].focus();
      }
    }

    if (e.key === '?') {
      const event = new CustomEvent('show-keyboard-shortcuts');
      document.dispatchEvent(event);
    }
  });
}

export function focusElement(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.focus();
  }
}

export function manageFocus(container, initialSelector) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) return;

  const initial = container.querySelector(initialSelector);
  if (initial) {
    initial.focus();
  } else {
    focusableElements[0].focus();
  }

  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    const focused = document.activeElement;
    const index = Array.from(focusableElements).indexOf(focused);

    if (e.shiftKey) {
      if (index === 0) {
        focusableElements[focusableElements.length - 1].focus();
        e.preventDefault();
      }
    } else {
      if (index === focusableElements.length - 1) {
        focusableElements[0].focus();
        e.preventDefault();
      }
    }
  });
}

export function makeAccessible(element, options = {}) {
  const {
    role,
    label,
    description,
    ariaLive,
    ariaLabel,
  } = options;

  if (role) element.setAttribute('role', role);
  if (label) element.setAttribute('aria-label', label);
  if (description) element.setAttribute('aria-description', description);
  if (ariaLive) element.setAttribute('aria-live', ariaLive);
  if (ariaLabel) element.setAttribute('aria-label', ariaLabel);
}

export const KEYBOARD_SHORTCUTS = {
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ENTER: 'Enter',
  SPACE: ' ',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
};

export function handleKeyboardShortcuts(shortcuts) {
  document.addEventListener('keydown', (e) => {
    const handler = shortcuts[e.key];
    if (handler) {
      handler(e);
    }
  });
}
