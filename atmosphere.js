/* atmosphere.js */

(function () {
  'use strict';

  const SCRIBE_KEY = 'la-scribe-mode';

  function isScribeOn() {
    try { return localStorage.getItem(SCRIBE_KEY) === '1'; } catch (_) { return false; }
  }
  function setScribe(on) {
    try { localStorage.setItem(SCRIBE_KEY, on ? '1' : '0'); } catch (_) {}
    document.documentElement.classList.toggle('scribe-mode', on);
    updateScribeIcon();
  }
  if (isScribeOn()) {
    document.documentElement.classList.add('scribe-mode');
  }

  function buildScribeToggle() {
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'scribe-toggle';
    trigger.setAttribute('aria-label', 'Toggle scribe mode (parchment palette)');
    trigger.title = 'Toggle scribe mode';
    trigger.innerHTML = scribeIcon(isScribeOn());
    const topnav = document.querySelector('.topbar .topnav');
    const topbarRight = document.querySelector('.topbar .topbar-right');
    if (topnav) {
      topnav.appendChild(trigger);
    } else if (topbarRight) {
      const sound = topbarRight.querySelector('.sound-toggle');
      const search = topbarRight.querySelector('.search-trigger');
      const after = sound || search;
      if (after && after.nextSibling) {
        topbarRight.insertBefore(trigger, after.nextSibling);
      } else if (after) {
        topbarRight.appendChild(trigger);
      } else {
        topbarRight.insertBefore(trigger, topbarRight.firstChild);
      }
    } else {
      const topbar = document.querySelector('.topbar');
      if (topbar) topbar.appendChild(trigger);
    }
    trigger.addEventListener('click', () => {
      const newState = !isScribeOn();
      setScribe(newState);
      if (newState && window.LA) window.LA.unlock('in-scribe-mode');
    });
  }

  function scribeIcon(on) {
    if (on) {
      return (
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M20 4 C 14 6, 8 10, 4 20 L 8 20 C 12 14, 16 10, 20 4 Z" fill="currentColor" stroke="none" opacity="0.85"/>' +
          '<path d="M4 20 L 8 16" stroke-width="1.5"/>' +
        '</svg>'
      );
    }
    return (
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M20 4 C 14 6, 8 10, 4 20 L 8 20 C 12 14, 16 10, 20 4 Z"/>' +
        '<path d="M4 20 L 8 16" stroke-width="1.5"/>' +
      '</svg>'
    );
  }

  function updateScribeIcon() {
    const btn = document.querySelector('.scribe-toggle');
    if (btn) btn.innerHTML = scribeIcon(isScribeOn());
  }
  const SECTION_LABELS = {
    'article-i': 'I · Of Truth',
    'article-ii': 'II · Of Discourse',
    'article-iii': 'III · Of Instruction',
    'article-iv': 'IV · Of Patience',
    'article-v': 'V · Of Conduct',
    'article-vi': 'VI · Of Confidence',
    'article-vii': 'VII · Of Service',
    'article-viii': 'VIII · Of Accountability',
    'article-ix': 'IX · Of Departure',
    'pursuit-archive': 'I · The Archive',
    'pursuit-instruction': 'II · Instruction',
    'pursuit-discourse': 'III · Discourse',
    'pursuit-vigil': 'IV · Vigil',
    'tier-low': 'Low Ranks',
    'tier-middle': 'Middle Ranks',
    'tier-high': 'High Ranks',
    'tier-command': 'High Command',
    'section-i': 'I · What is asked',
    'section-ii': 'II · The application',
    'section-iii': 'III · What follows',
    'section-iv': 'IV · What you may ask',
  };

  function buildCurrentSectionEl() {
    const candidates = Object.keys(SECTION_LABELS);
    const present = candidates.some(id => document.getElementById(id));
    if (!present) return null;

    const el = document.createElement('span');
    el.className = 'current-section';
    el.id = 'current-section';
    const topbarRight = document.querySelector('.topbar .topbar-right');
    const topnav = document.querySelector('.topbar .topnav');
    if (topbarRight) {
      topbarRight.insertBefore(el, topbarRight.firstChild);
    } else if (topnav) {
      topnav.insertBefore(el, topnav.firstChild);
    } else {
      const topbar = document.querySelector('.topbar');
      if (topbar) topbar.appendChild(el);
    }
    return el;
  }

  function initCurrentSection() {
    const el = buildCurrentSectionEl();
    if (!el) return;
    const candidates = Object.keys(SECTION_LABELS)
      .map(id => ({ id, el: document.getElementById(id) }))
      .filter(x => x.el);
    if (candidates.length === 0) return;

    let lastLabel = '';
    function update() {
      const cutoff = window.scrollY + 120;
      let active = null;
      for (const c of candidates) {
        const top = c.el.getBoundingClientRect().top + window.scrollY;
        if (top <= cutoff) active = c;
        else break; // assumes order in DOM = order on page
      }
      const label = active ? SECTION_LABELS[active.id] : '';
      if (window.scrollY < 200) {
        el.classList.remove('visible');
        lastLabel = '';
        return;
      }
      if (label && label !== lastLabel) {
        el.textContent = label;
        lastLabel = label;
      }
      if (label) el.classList.add('visible');
      else el.classList.remove('visible');
    }
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => { update(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  function init() {
    buildScribeToggle();
    initCurrentSection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
