/* ========================================================================
   sound.js — Optional page-turn sound on navigation
   ------------------------------------------------------------------------
   - Off by default. Visitors opt in via a small icon toggle in the topbar.
   - Preference persists via localStorage.
   - The sound fires the moment a same-site link is clicked — not after
     the next page loads. Browsers allow audio during a click event because
     the click is itself a "user gesture", but they block audio on a fresh
     page load if there hasn't been a gesture on that new page. So we play
     here, just before the navigation, while we still have permission.
   ======================================================================== */

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

  // -----------------------------------------------------------------
  // Build the toggle icon in the topbar
  // -----------------------------------------------------------------
  function buildToggle() {
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'sound-toggle';
    trigger.setAttribute('aria-label', 'Toggle page-turn sound');
    trigger.title = 'Toggle page-turn sound';
    trigger.innerHTML = iconSvg(isEnabled());

    // Slot into the topbar — same pattern as search-trigger
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
      // Play on enable as confirmation. This also primes the audio
      // element so subsequent plays happen without delay.
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

  // -----------------------------------------------------------------
  // Play page-turn on internal link clicks (the click itself is the
  // user gesture browsers require — playing during the click event
  // sidesteps autoplay policy)
  // -----------------------------------------------------------------
  function attachLinkHandlers() {
    document.addEventListener('click', (e) => {
      if (!isEnabled()) return;
      // Look up the chain for the nearest <a>
      let el = e.target;
      while (el && el !== document) {
        if (el.tagName === 'A') break;
        el = el.parentNode;
      }
      if (!el || el.tagName !== 'A') return;
      const href = el.getAttribute('href');
      if (!href) return;
      // Skip: anchors-on-this-page, mailto/tel, javascript:, opening in new tab
      if (/^(mailto:|tel:|javascript:|#)/i.test(href)) return;
      if (el.target === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // user opened in new tab
      // Same-origin same-site check
      try {
        const url = new URL(el.href);
        if (url.origin !== window.location.origin) return;
        // Same page (only the hash changed)? skip
        if (url.pathname === window.location.pathname && url.hash) return;
      } catch (_) { return; }
      // It's a real navigation — play now (the click gesture authorises it)
      playPageTurn();
    }, true);
  }

  // -----------------------------------------------------------------
  // Init
  // -----------------------------------------------------------------
  function init() {
    buildToggle();
    attachLinkHandlers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

