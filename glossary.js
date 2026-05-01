/* glossary.js */

(function () {
  'use strict';

  // longer phrases first so 'Council of First Knowledge' matches before 'Council'
  const TERMS = [
    { pattern: 'Council of First Knowledge', def: "The wider Jedi Council on which the Chief Librarian holds a seat. Concerns of the Assembly are relayed to it; matters affecting the wider Order's record return from it." },
    { pattern: 'Curator of the Archives', def: "Second-in-Command of the Assembly. Major supporter of the Chief Librarian; qualified to step up if the Chief Librarian is indisposed." },
    { pattern: 'Chief Librarian', def: "Overseer and First-in-Command of the Assembly. Holds a seat on the Council of First Knowledge." },
    { pattern: 'Lore Keeper', def: "High-rank position. The first true scholars of the Order. Requires a Consular pathway and the Assembly Jedi Knight rank." },
    { pattern: 'the Archive', def: "The collected records of the Order, texts, recordings, oral histories, gathered and held in the Great Jedi Archives on Coruscant. The heart of the Assembly's work." },
    { pattern: 'Pursuits', def: "The four disciplines of the Assembly: the Archive, Instruction, Discourse, and Vigil. Together they describe what the Order does and why." },
    { pattern: 'Discourse', def: "One of the four Pursuits. The practice of structured argument and disagreement. The Assembly believes truth is found in argument, not silence." },
    { pattern: 'Charter', def: "The Assembly's nine articles of conduct, read once at admission and held to thereafter. A code of trust, applied upward through the hierarchy as well as downward." },
    { pattern: 'Assembly', def: "The Librarians' Assembly. The collective of keepers tasked with the preservation, organisation, and dissemination of knowledge within the wider Jedi Order." },
    { pattern: 'Historian', def: "Junior member of High Command. Oversees daily functions and mentors the High Rank team." },
    { pattern: 'Archivist', def: "High-rank position. Tasked with cataloguing, preservation, and the practical maintenance of the Archive itself." },
    { pattern: 'Librarian', def: "Low-tier rank. The first proper standing in the Assembly after passing the Pledge and Student stages." },
    { pattern: 'Student', def: "Low-tier rank, second step. Reached by passing the orientation quiz; required of all Pledges within their first week." },
    { pattern: 'Pledge', def: "Entry rank. A new member on probation. Has one week to achieve Student standing or their place lapses." },
    { pattern: 'Tutor', def: "Middle-tier rank. Members responsible for the formal instruction of Pledges and Students." },
    { pattern: 'Vigil', def: "One of the four Pursuits. The watchful guarding of knowledge against loss, distortion, and forgetting. Knowledge unguarded is knowledge lost." },
    { pattern: 'Order', def: "The wider Jedi Order, of which the Assembly is one specialised collective." },
    { pattern: 'Oath', def: "The pledge taken by every keeper at admission. Its origin is not recorded; it has always been taken." },
  ];

  // compile term regexes
  TERMS.forEach(t => {
    const escaped = t.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t.regex = new RegExp('\\b' + escaped + '\\b', 'i');
  });

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'A', 'BUTTON', 'INPUT', 'TEXTAREA',
    'CODE', 'PRE', 'KBD',
    'H1', 'H2',  // skip top-level headings (titles, eyebrows, hero)
    'NAV', 'HEADER', 'FOOTER',
  ]);
  // skip these element classes
  const SKIP_CLASSES = new Set([
    'topbar-mark', 'pillar-card-name', 'pillar-card-num',
    'hero-eyebrow', 'hero-title', 'hero-tagline',
    'pillars-eyebrow', 'pillars-heading',
    'todays-reading-eyebrow', 'todays-reading-quote', 'todays-reading-attribution',
    'from-charter-eyebrow', 'from-charter-name',
    'other-rooms-eyebrow', 'other-room-name', 'other-room-desc',
    'footer-mark', 'footer-mark-text', 'footer-links',
    'reading-time', 'topbar-back', 'topnav',
    'article-num', 'article-name', 'article-permalink',
    'article-marginalia',  // already in scholarly voice; over-wrapping clutters
    'pursuit-tenet', 'pursuit-name',
    'rank-card-num', 'rank-card-name',
    'apply-section-num', 'apply-section-title',
    'oath-section-num', 'oath-section-title',
    'voice-quote', 'voice-attribution',
    'role-group-name',
    'member-name', 'member-rank', 'member-handle',
    'search-result', 'search-result-title', 'search-result-meta',
    'sound-toggle', 'scribe-toggle', 'search-trigger',
    'fn-marker', 'fn-num', 'fn-text',
    'glossary-term',  // never re-wrap
    'streak-badge',
  ]);

  function shouldSkipElement(el) {
    if (!el || el.nodeType !== 1) return false;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.classList) {
      for (const cls of el.classList) {
        if (SKIP_CLASSES.has(cls)) return true;
      }
    }
    return false;
  }

  // each term tooltipped only once per page
  const wrappedTerms = new Set();

  function walkAndWrap(root) {
    if (!root) return;
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          // Skip empty/whitespace-only text
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          // Skip if any ancestor is a skip-element
          let p = node.parentNode;
          while (p && p !== root) {
            if (shouldSkipElement(p)) return NodeFilter.FILTER_REJECT;
            p = p.parentNode;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    // collect text nodes first
    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);

    for (const textNode of textNodes) {
      processTextNode(textNode);
    }
  }

  function processTextNode(textNode) {
    let text = textNode.nodeValue;
    // Find first un-wrapped term that matches in this text
    for (const term of TERMS) {
      if (wrappedTerms.has(term.pattern)) continue;
      const match = term.regex.exec(text);
      if (!match) continue;
      // Wrap this match
      wrappedTerms.add(term.pattern);
      const before = text.substring(0, match.index);
      const matched = match[0];
      const after = text.substring(match.index + matched.length);
      const parent = textNode.parentNode;
      if (!parent) return;
      const span = document.createElement('span');
      span.className = 'glossary-term';
      span.textContent = matched;
      span.setAttribute('data-term', term.pattern);
      span.setAttribute('tabindex', '0');
      span.setAttribute('role', 'button');
      span.setAttribute('aria-label', matched + ', definition available');
      const beforeNode = document.createTextNode(before);
      const afterNode = document.createTextNode(after);
      parent.replaceChild(afterNode, textNode);
      parent.insertBefore(span, afterNode);
      parent.insertBefore(beforeNode, span);
      processTextNode(afterNode);
      return;
    }
  }

  let popup = null;
  let activeTerm = null;
  let touchMode = false;

  function getDefinition(termKey) {
    for (const t of TERMS) {
      if (t.pattern === termKey) return t.def;
    }
    return '';
  }

  function buildPopup() {
    popup = document.createElement('div');
    popup.className = 'glossary-popup';
    popup.setAttribute('role', 'tooltip');
    popup.innerHTML =
      '<div class="glossary-popup-name" id="glossary-popup-name"></div>' +
      '<div class="glossary-popup-rule"></div>' +
      '<div class="glossary-popup-def" id="glossary-popup-def"></div>';
    document.body.appendChild(popup);
  }

  function showPopup(spanEl) {
    if (!popup) buildPopup();
    const term = spanEl.getAttribute('data-term');
    if (!term) return;
    activeTerm = spanEl;
    document.getElementById('glossary-popup-name').textContent = term;
    document.getElementById('glossary-popup-def').textContent = getDefinition(term);
    popup.classList.add('visible');
    positionPopup(spanEl);
  }

  function hidePopup() {
    if (!popup) return;
    popup.classList.remove('visible');
    activeTerm = null;
  }

  function positionPopup(spanEl) {
    if (!popup) return;
    const rect = spanEl.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const gap = 10;
    // position above the span, centered
    let top = rect.top - popupRect.height - gap;
    let left = rect.left + (rect.width / 2) - (popupRect.width / 2);
    // flip below if too high
    if (top < 10) {
      top = rect.bottom + gap;
    }
    // Clamp horizontally
    const maxLeft = window.innerWidth - popupRect.width - 10;
    if (left < 10) left = 10;
    if (left > maxLeft) left = maxLeft;
    popup.style.top = (top + window.scrollY) + 'px';
    popup.style.left = (left + window.scrollX) + 'px';
  }

  function attachHandlers() {
    // Detect touch capability
    touchMode = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    document.addEventListener('mouseover', (e) => {
      if (touchMode) return;
      const span = e.target.closest && e.target.closest('.glossary-term');
      if (span) showPopup(span);
    });
    document.addEventListener('mouseout', (e) => {
      if (touchMode) return;
      const span = e.target.closest && e.target.closest('.glossary-term');
      if (span) {
        // Don't hide if moving onto the popup itself
        const to = e.relatedTarget;
        if (to && popup && popup.contains(to)) return;
        hidePopup();
      }
    });

    // mobile tap toggles popup
    document.addEventListener('click', (e) => {
      const span = e.target.closest && e.target.closest('.glossary-term');
      if (span) {
        e.preventDefault();
        if (activeTerm === span) {
          hidePopup();
        } else {
          showPopup(span);
        }
      } else if (popup && popup.classList.contains('visible')) {
        // tap outside dismisses
        if (!popup.contains(e.target)) hidePopup();
      }
    });

    // keyboard: focus + Enter/Space opens, Escape closes
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popup && popup.classList.contains('visible')) {
        hidePopup();
      }
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement &&
          document.activeElement.classList.contains('glossary-term')) {
        e.preventDefault();
        if (activeTerm === document.activeElement) hidePopup();
        else showPopup(document.activeElement);
      }
    });

    // reposition popup on scroll/resize
    window.addEventListener('scroll', () => {
      if (popup && popup.classList.contains('visible') && activeTerm) {
        positionPopup(activeTerm);
      }
    }, { passive: true });
    window.addEventListener('resize', () => {
      if (popup && popup.classList.contains('visible') && activeTerm) {
        positionPopup(activeTerm);
      }
    });
  }

  function init() {
    // wrap in main, fall back to body
    const root = document.querySelector('main') || document.body;
    walkAndWrap(root);
    attachHandlers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
