/* ========================================================================
   achievements.js — Site-wide achievement tracking
   ------------------------------------------------------------------------
   Tracks visitor accomplishments via localStorage. No accounts, no server.
   Each achievement has an id, name, description. Pages call window.LA.unlock(id)
   when criteria are met. First-time unlocks fire a small gold toast.

   Public API:
     window.LA.unlock(id)
     window.LA.markVisit(page)
     window.LA.getAll()
     window.LA.markQuizBest(score, total, rank)
     window.LA.getQuizBest()
     window.LA.ACHIEVEMENTS  (list)
   ======================================================================== */

(function () {
  'use strict';

  const STORAGE_KEY = 'la-achievements';
  const VISITS_KEY = 'la-pages-visited';

  const ACHIEVEMENTS = [
    { id: 'cartographer', name: 'Cartographer', desc: 'You have visited every page of the Assembly.' },
    { id: 'archivist', name: 'Archivist', desc: 'You have found all three easter eggs.' },
    { id: 'faithful-reader', name: 'Faithful Reader', desc: 'You have read the Daily Reading seven days in a row.' },
    { id: 'keeper-of-the-vigil', name: 'Keeper of the Vigil', desc: 'You have read the Daily Reading thirty days in a row.' },
    { id: 'night-watch', name: 'Night Watch', desc: 'You have opened the Charter between dusk and dawn.' },
    { id: 'trial-passed', name: 'Trial Passed', desc: 'You have completed the Trial of Knowledge.' },
    { id: 'flawless', name: 'Flawless', desc: 'You have answered every Trial of Knowledge question correctly.' },
    { id: 'attentive', name: 'Attentive', desc: 'You have hovered a glossary term to read its definition.' },
    { id: 'in-scribe-mode', name: 'Scribe', desc: 'You have toggled scribe mode on.' },
    { id: 'sentinel-consulted', name: 'Consulted', desc: 'You have consulted the Holocron.' },
    { id: 'heretic-found', name: 'Heretic', desc: 'You have read a passage from the lost holocron.' },
    { id: 'marginalia-revealed', name: 'In the Margins', desc: 'You have read the marginalia of the Charter.' },
    { id: 'failures-revealed', name: 'Honoured Failures', desc: 'You have read the honoured failures of the Path.' },
    { id: 'tools-explored', name: 'Tools of the Order', desc: 'You have used one of the keepers tools.' },
  ];

  const CARTOGRAPHER_PAGES = [
    'index.html', 'order.html', 'path.html', 'command.html', 'charter.html',
    'apply.html', 'oath.html', 'voices.html', 'reading.html',
  ];

  function getState() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : {}; }
    catch (_) { return {}; }
  }
  function setState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }
  function getVisits() {
    try { const raw = localStorage.getItem(VISITS_KEY); return raw ? JSON.parse(raw) : []; }
    catch (_) { return []; }
  }
  function setVisits(arr) {
    try { localStorage.setItem(VISITS_KEY, JSON.stringify(arr)); } catch (_) {}
  }

  let toastQueue = [];
  let toastShowing = false;

  function showToast(achievement) {
    toastQueue.push(achievement);
    if (!toastShowing) processToastQueue();
  }
  function processToastQueue() {
    if (toastQueue.length === 0) { toastShowing = false; return; }
    toastShowing = true;
    const a = toastQueue.shift();
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML =
      '<div class="achievement-toast-eyebrow">\u00b7 Achievement Unlocked \u00b7</div>' +
      '<div class="achievement-toast-name">' + a.name + '</div>' +
      '<div class="achievement-toast-desc">' + a.desc + '</div>';
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => { toast.remove(); processToastQueue(); }, 600);
    }, 4500);
  }

  function unlock(id) {
    const state = getState();
    if (state[id]) return false;
    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    if (!achievement) return false;
    state[id] = Date.now();
    setState(state);
    showToast(achievement);
    // Archivist: heretic + marginalia + failures all found
    const eggs = ['heretic-found', 'marginalia-revealed', 'failures-revealed'];
    if (id !== 'archivist' && eggs.every(e => state[e])) {
      setTimeout(() => unlock('archivist'), 800);
    }
    return true;
  }

  function markVisit(page) {
    const visits = getVisits();
    if (!visits.includes(page)) {
      visits.push(page);
      setVisits(visits);
    }
    if (CARTOGRAPHER_PAGES.every(p => visits.includes(p))) {
      unlock('cartographer');
    }
  }

  function getAll() {
    const state = getState();
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: !!state[a.id], unlockedAt: state[a.id] || null }));
  }

  function markQuizBest(score, total, rank) {
    try {
      const raw = localStorage.getItem('la-quiz-best');
      const prev = raw ? JSON.parse(raw) : null;
      if (!prev || score > prev.score) {
        localStorage.setItem('la-quiz-best', JSON.stringify({ score: score, total: total, rank: rank }));
      }
    } catch (_) {}
    if (score > 0) unlock('trial-passed');
    if (score === total) unlock('flawless');
  }

  function getQuizBest() {
    try { const raw = localStorage.getItem('la-quiz-best'); return raw ? JSON.parse(raw) : null; }
    catch (_) { return null; }
  }

  function autoTrack() {
    let path = window.location.pathname;
    let page = path.substring(path.lastIndexOf('/') + 1);
    if (!page || page === '') page = 'index.html';
    markVisit(page);

    if (page === 'charter.html') {
      const hour = new Date().getHours();
      if (hour >= 22 || hour < 4) unlock('night-watch');
    }

    document.addEventListener('mouseover', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('glossary-term')) {
        unlock('attentive');
      }
    }, { passive: true });
  }

  window.LA = window.LA || {};
  window.LA.unlock = unlock;
  window.LA.markVisit = markVisit;
  window.LA.getAll = getAll;
  window.LA.markQuizBest = markQuizBest;
  window.LA.getQuizBest = getQuizBest;
  window.LA.ACHIEVEMENTS = ACHIEVEMENTS;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoTrack);
  } else {
    autoTrack();
  }
})();
