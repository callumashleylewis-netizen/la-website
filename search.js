/* search.js */

(function () {
  'use strict';

  let INDEX = null;        // populated on first open
  let INDEX_LOADING = null; // in-flight promise to dedupe parallel loads
  let activeIndex = -1;    // for keyboard nav of result list
  let lastQuery = '';

  const KIND_LABELS = {
    'page': 'Page',
    'article': 'Charter',
    'marginalia': 'Marginalia',
    'pursuit': 'Pursuit',
    'rank': 'Rank',
    'command-role': 'Role',
    'member': 'Member',
    'apply-section': 'Petition',
    'oath-section': 'Oath',
    'voice': 'Voice',
    'failure': 'Honoured Failure',
  };

  function buildUI() {
    const topnav = document.querySelector('.topbar .topnav');
    const topbarRight = document.querySelector('.topbar .topbar-right');
    const trigger = document.createElement('button');
    trigger.className = 'search-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Search the Archives');
    trigger.title = 'Search (press / or Ctrl+K)';
    trigger.innerHTML =
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="11" cy="11" r="7"/>' +
      '<line x1="16.5" y1="16.5" x2="21" y2="21"/>' +
      '</svg>';

    if (topnav) {
      topnav.appendChild(trigger);
    } else if (topbarRight) {
      topbarRight.insertBefore(trigger, topbarRight.firstChild);
    } else {
      const topbar = document.querySelector('.topbar');
      if (topbar) topbar.appendChild(trigger);
    }

    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.id = 'search-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Search');
    overlay.innerHTML =
      '<div class="search-panel">' +
        '<div class="search-input-wrap">' +
          '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="11" cy="11" r="7"/>' +
            '<line x1="16.5" y1="16.5" x2="21" y2="21"/>' +
          '</svg>' +
          '<input class="search-input" id="search-input" type="text" autocomplete="off" spellcheck="false" placeholder="Search the Archives...">' +
          '<button class="search-close" id="search-close" type="button" aria-label="Close">Esc</button>' +
        '</div>' +
        '<div class="search-results" id="search-results"></div>' +
        '<div class="search-hint"><kbd>↑</kbd><kbd>↓</kbd> Navigate · <kbd>Enter</kbd> Open · <kbd>Esc</kbd> Close</div>' +
      '</div>';
    document.body.appendChild(overlay);

    trigger.addEventListener('click', open);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.getElementById('search-close').addEventListener('click', close);
    const input = document.getElementById('search-input');
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onInputKey);
  }

  function loadIndex() {
    if (INDEX) return Promise.resolve(INDEX);
    if (INDEX_LOADING) return INDEX_LOADING;
    INDEX_LOADING = fetch('search-index.json')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { INDEX = data; return INDEX; })
      .catch(() => { INDEX_LOADING = null; return []; });
    return INDEX_LOADING;
  }

  function open() {
    const overlay = document.getElementById('search-overlay');
    const input = document.getElementById('search-input');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 50);
    loadIndex().then(() => {
      if (input.value) onInput();
      else renderHint();
    });
  }
  function close() {
    const overlay = document.getElementById('search-overlay');
    const input = document.getElementById('search-input');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    input.blur();
  }

  function tokenize(s) {
    return (s || '').toLowerCase().split(/\s+/).filter(t => t.length > 0);
  }

  function scoreEntry(entry, queryTokens) {
    const haystack = ((entry.title || '') + ' ' + (entry.section || '') + ' ' + (entry.text || '')).toLowerCase();
    const sectionLower = (entry.section || '').toLowerCase();
    const titleLower = (entry.title || '').toLowerCase();

    let score = 0;
    let matched = 0;
    for (const tok of queryTokens) {
      if (!haystack.includes(tok)) {
        return null;
      }
      matched++;
      if (sectionLower.includes(tok)) score -= 30;
      else if (titleLower.includes(tok)) score -= 20;
      const re = new RegExp('\\b' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(haystack)) score -= 10;
    }
    score += Math.min(20, (entry.text || '').length / 50);
    if (entry.kind === 'page') score -= 5;
    return score;
  }

  function search(query) {
    if (!INDEX || INDEX.length === 0) return [];
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];
    const scored = [];
    for (const entry of INDEX) {
      const s = scoreEntry(entry, tokens);
      if (s !== null) scored.push({ entry, score: s });
    }
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 10).map(s => s.entry);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function highlightSnippet(text, queryTokens) {
    if (!text) return '';
    let out = escapeHtml(text);
    for (const tok of queryTokens) {
      if (tok.length < 2) continue;
      const safe = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp('(' + safe + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    }
    return out;
  }

  function buildResultUrl(entry) {
    let url = entry.page || '';
    if (entry.anchor) url += '#' + entry.anchor;
    return url;
  }

  function renderResults(results, query) {
    const container = document.getElementById('search-results');
    activeIndex = -1;
    if (!query) {
      renderHint();
      return;
    }
    if (results.length === 0) {
      container.innerHTML =
        '<div class="search-empty">' +
          '<div class="search-empty-eyebrow">· Nothing found in the Archives ·</div>' +
          'Try fewer or different words.' +
        '</div>';
      return;
    }
    const tokens = tokenize(query);
    const html = results.map((entry, i) => {
      const url = buildResultUrl(entry);
      const kind = KIND_LABELS[entry.kind] || entry.kind;
      const meta = '<span class="search-result-meta-kind">' + escapeHtml(kind) + '</span>' +
                   '<span>·</span><span>' + escapeHtml(entry.title) + '</span>';
      const titleText = entry.section || entry.title;
      const titleHTML = highlightSnippet(titleText, tokens);
      const snippetHTML = entry.text ? highlightSnippet(entry.text, tokens) : '';
      return (
        '<a class="search-result" data-idx="' + i + '" href="' + escapeHtml(url) + '">' +
          '<div class="search-result-meta">' + meta + '</div>' +
          '<div class="search-result-title">' + titleHTML + '</div>' +
          (snippetHTML ? '<div class="search-result-snippet">' + snippetHTML + '</div>' : '') +
        '</a>'
      );
    }).join('');
    container.innerHTML = html;
    const first = container.querySelector('.search-result');
    if (first) { first.classList.add('active'); activeIndex = 0; }
  }

  function renderHint() {
    const container = document.getElementById('search-results');
    container.innerHTML =
      '<div class="search-empty">' +
        '<div class="search-empty-eyebrow">· The Archives await your query ·</div>' +
        'Search articles, ranks, voices, and the holocron.' +
      '</div>';
  }

  function onInput() {
    const input = document.getElementById('search-input');
    const q = input.value.trim();
    lastQuery = q;
    if (!INDEX) {
      loadIndex().then(() => {
        if (lastQuery === q) renderResults(search(q), q);
      });
      return;
    }
    renderResults(search(q), q);
  }

  function onInputKey(e) {
    const container = document.getElementById('search-results');
    const items = Array.from(container.querySelectorAll('.search-result'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length === 0) return;
      activeIndex = Math.min(items.length - 1, activeIndex + 1);
      updateActive(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length === 0) return;
      activeIndex = Math.max(0, activeIndex - 1);
      updateActive(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        items[activeIndex].click();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function updateActive(items) {
    items.forEach((it, i) => {
      it.classList.toggle('active', i === activeIndex);
      if (i === activeIndex) {
        it.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    const isOpen = overlay.classList.contains('open');
    if (!isOpen) {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' ||
                       (document.activeElement && document.activeElement.isContentEditable);
      if (e.key === '/' && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        open();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
      }
    } else {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
})();
