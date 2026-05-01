/* sound.js */

(function () {
  'use strict';

  const STORAGE_KEY = 'la-sound-enabled';
  const AUDIO_SRC = 'page-turn.mp3';

  let audio = null;

  function isEnabled() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  }
  function setEnabled(v) {
    try {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    } catch (_) {}
    updateToggleIcon();
  }

  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio(AUDIO_SRC);
    audio.preload = 'auto';
    audio.volume = 0.5;
    return audio;
  }

  function playPageTurn() {
    if (!isEnabled()) return;
    const a = ensureAudio();
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {}
  }

  function buildToggle() {
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'sound-toggle';
    trigger.setAttribute('aria-label', 'Toggle page-turn sound');
    trigger.title = 'Toggle page-turn sound';
    trigger.innerHTML = iconSvg(isEnabled());

    const topnav = document.querySelector('.topbar .topnav');
    const topbarRight = document.querySelector('.topbar .topbar-right');
    if (topnav) {
      topnav.appendChild(trigger);
    } else if (topbarRight) {
      const searchTrigger = topbarRight.querySelector('.search-trigger');
      if (searchTrigger && searchTrigger.nextSibling) {
        topbarRight.insertBefore(trigger, searchTrigger.nextSibling);
      } else if (searchTrigger) {
        topbarRight.appendChild(trigger);
      } else {
        topbarRight.insertBefore(trigger, topbarRight.firstChild);
      }
    } else {
      const topbar = document.querySelector('.topbar');
      if (topbar) topbar.appendChild(trigger);
    }

    trigger.addEventListener('click', () => {
      const willEnable = !isEnabled();
      setEnabled(willEnable);
      if (willEnable) playPageTurn();
    });
  }

  function iconSvg(on) {
    if (on) {
      return (
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">' +
          '<polygon points="3,9 7,9 12,5 12,19 7,15 3,15" fill="currentColor" stroke="none"/>' +
          '<path d="M16 8 Q19 12 16 16" fill="none"/>' +
          '<path d="M19 6 Q23 12 19 18" fill="none"/>' +
        '</svg>'
      );
    }
    return (
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">' +
        '<polygon points="3,9 7,9 12,5 12,19 7,15 3,15" fill="currentColor" stroke="none"/>' +
        '<line x1="16" y1="9" x2="22" y2="15"/>' +
        '<line x1="22" y1="9" x2="16" y2="15"/>' +
      '</svg>'
    );
  }

  function updateToggleIcon() {
    const btn = document.querySelector('.sound-toggle');
    if (btn) btn.innerHTML = iconSvg(isEnabled());
  }

  function attachLinkHandlers() {
    document.addEventListener('click', (e) => {
      if (!isEnabled()) return;
      let el = e.target;
      while (el && el !== document) {
        if (el.tagName === 'A') break;
        el = el.parentNode;
      }
      if (!el || el.tagName !== 'A') return;
      const href = el.getAttribute('href');
      if (!href) return;
      if (/^(mailto:|tel:|javascript:|#)/i.test(href)) return;
      if (el.target === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      try {
        const url = new URL(el.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.hash) return;
      } catch (_) { return; }
      playPageTurn();
    }, true);
  }

  function init() {
    buildToggle();
    attachLinkHandlers();
    if (isEnabled()) ensureAudio();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

