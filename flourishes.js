/* ========================================================================
   flourishes.js — Pass D-3 small touches
   ------------------------------------------------------------------------
   - Konami code: ↑↑↓↓←→←→BA fires a fourth easter egg
   - Rotating footer mottos: site motto cycles through six alternatives
   - Sigil quotes on hover: small floating tooltip with a random Order line
   - Sigil rotation: every 10th hover, the sigil completes a 360° turn
   - Ink trails: opt-in cursor effect, persists via localStorage
   - Scribe-mode cursor: subtle quill cursor when scribe-mode is on (CSS-only,
     so this file just wires the toggle integration with the cursor)

   Wired on every page after achievements.js.
   ======================================================================== */

(function () {
  'use strict';

  // -----------------------------------------------------------------
  // KONAMI CODE — fires a hidden message
  // -----------------------------------------------------------------
  (function konami() {
    const SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let pos = 0;
    document.addEventListener('keydown', (e) => {
      const expected = SEQ[pos];
      const got = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (got === expected) {
        pos++;
        if (pos === SEQ.length) {
          pos = 0;
          fireKonami();
        }
      } else {
        // Allow restart if the wrong key happened to be the first key of the sequence
        pos = (got === SEQ[0]) ? 1 : 0;
      }
    });

    function fireKonami() {
      // If there's an achievement system, mark it; either way show a small toast
      if (window.LA && window.LA.unlock) {
        // Use a tools-explored-style ad-hoc toast via the achievements API if registered
        // Otherwise fall through to the manual toast below
      }
      const toast = document.createElement('div');
      toast.className = 'konami-toast';
      toast.innerHTML =
        '<div class="konami-toast-eyebrow">\u00b7 An older protocol \u00b7</div>' +
        '<div class="konami-toast-body">"Up, up, down, down. The keepers of older codes salute the keepers of newer ones."</div>';
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('visible'));
      setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 600);
      }, 4500);
    }
  })();

  // -----------------------------------------------------------------
  // ROTATING FOOTER MOTTO — replaces "By patience, by record, by light"
  // text inside the homepage footer-motto element with a rotating selection.
  // Mottos rotate each visit (random pick), not within a session.
  // -----------------------------------------------------------------
  (function rotatingMotto() {
    const MOTTOS = [
      'By patience, by record, by light',
      'What is preserved, endures',
      'Knowledge unguarded is knowledge lost',
      'Time forgets; the record remembers',
      'Slowness is the discipline of those who intend to remember',
      'We are the candles set in the long hall',
    ];
    const el = document.querySelector('.footer-motto');
    if (!el) return;
    const idx = Math.floor(Math.random() * MOTTOS.length);
    el.textContent = MOTTOS[idx];
  })();

  // -----------------------------------------------------------------
  // SIGIL HOVER — random Order quote in a small floating tooltip,
  // plus a 360 rotation every 10th hover.
  // -----------------------------------------------------------------
  (function sigilHover() {
    const SIGIL_QUOTES = [
      'By patience, by record, by light.',
      'What is preserved, endures.',
      'Time forgets; the record remembers.',
      'A page unread is a page not yet written.',
      'The Order does not write history. The Order keeps it.',
      'Knowledge unguarded is knowledge lost.',
      'Wisdom unspoken is wisdom unproven.',
      'The first duty of the Librarian is to listen.',
      'We do not seek to be right. We seek to be less wrong.',
      'A debate well held is a record well kept.',
      'The Galaxy is loud. The Archive is quiet. Both are necessary.',
      'Every answer is the doorway to a better question.',
    ];

    const HOVER_COUNT_KEY = 'la-sigil-hovers';
    const ROTATION_TRIGGER = 10;

    function getCount() {
      try { return parseInt(localStorage.getItem(HOVER_COUNT_KEY) || '0', 10) || 0; }
      catch (_) { return 0; }
    }
    function setCount(n) {
      try { localStorage.setItem(HOVER_COUNT_KEY, String(n)); } catch (_) {}
    }

    function init() {
      const sigilLink = document.querySelector('.topbar-mark');
      if (!sigilLink) return;
      const sigilImg = sigilLink.querySelector('img');
      if (!sigilImg) return;

      // Build the floating tooltip element
      const tip = document.createElement('div');
      tip.className = 'sigil-tip';
      document.body.appendChild(tip);

      let pickedThisHover = '';
      let hideTimer = null;

      function showTip(quote) {
        tip.textContent = quote;
        // Position relative to the sigil
        const rect = sigilLink.getBoundingClientRect();
        tip.style.left = (rect.left + rect.width / 2) + 'px';
        tip.style.top = (rect.bottom + 8) + 'px';
        tip.classList.add('visible');
      }

      function hideTip() {
        tip.classList.remove('visible');
      }

      sigilLink.addEventListener('mouseenter', () => {
        clearTimeout(hideTimer);
        pickedThisHover = SIGIL_QUOTES[Math.floor(Math.random() * SIGIL_QUOTES.length)];
        showTip(pickedThisHover);

        // Increment hover count, trigger rotation on every Nth
        const newCount = getCount() + 1;
        setCount(newCount);
        if (newCount % ROTATION_TRIGGER === 0) {
          sigilImg.classList.add('rotating');
          setTimeout(() => sigilImg.classList.remove('rotating'), 1400);
        }
      });

      sigilLink.addEventListener('mouseleave', () => {
        hideTimer = setTimeout(hideTip, 80);
      });

      // Hide on scroll/click anywhere else, since position is fixed-ish
      window.addEventListener('scroll', hideTip, { passive: true });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();

  // -----------------------------------------------------------------
  // INK TRAILS — opt-in cursor effect. Toggleable from the topbar.
  // Soft gold particles fade behind the cursor.
  // Defaults to OFF. State persists in localStorage.
  // -----------------------------------------------------------------
  (function inkTrails() {
    const KEY = 'la-ink-trails';
    function isOn() {
      try { return localStorage.getItem(KEY) === '1'; }
      catch (_) { return false; }
    }
    function setOn(v) {
      try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (_) {}
    }

    let active = false;
    let particles = [];
    let layer = null;
    let rafId = null;
    let lastSpawn = 0;

    function ensureLayer() {
      if (layer) return;
      layer = document.createElement('canvas');
      layer.className = 'ink-trail-canvas';
      layer.width = window.innerWidth;
      layer.height = window.innerHeight;
      document.body.appendChild(layer);
      window.addEventListener('resize', () => {
        layer.width = window.innerWidth;
        layer.height = window.innerHeight;
      });
    }

    function tearDownLayer() {
      if (!layer) return;
      layer.remove();
      layer = null;
      particles = [];
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function onMouseMove(e) {
      if (!active) return;
      const now = Date.now();
      // Throttle spawn rate so we don't make 200 particles per second
      if (now - lastSpawn < 22) return;
      lastSpawn = now;
      particles.push({
        x: e.clientX + (Math.random() - 0.5) * 4,
        y: e.clientY + (Math.random() - 0.5) * 4,
        r: 1.5 + Math.random() * 1.6,
        a: 0.6 + Math.random() * 0.25,
        decay: 0.018 + Math.random() * 0.012,
      });
      if (!rafId) startTick();
    }

    function startTick() {
      const ctx = layer.getContext('2d');
      function tick() {
        if (!active || !layer) return;
        ctx.clearRect(0, 0, layer.width, layer.height);
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.a -= p.decay;
          if (p.a <= 0) {
            particles.splice(i, 1);
            continue;
          }
          ctx.beginPath();
          ctx.fillStyle = 'rgba(199, 154, 58, ' + p.a.toFixed(3) + ')';
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        if (particles.length > 0) {
          rafId = requestAnimationFrame(tick);
        } else {
          rafId = null;
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    function activate() {
      active = true;
      ensureLayer();
      document.addEventListener('mousemove', onMouseMove, { passive: true });
    }
    function deactivate() {
      active = false;
      document.removeEventListener('mousemove', onMouseMove);
      tearDownLayer();
    }

    function init() {
      // Don't run on touch-only devices (no real cursor to trail)
      if (matchMedia && matchMedia('(hover: none)').matches) return;

      // Build a topbar toggle next to the existing scribe-toggle / sound-toggle
      const topbarRight = document.querySelector('.topbar-right');
      if (!topbarRight) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ink-toggle';
      btn.setAttribute('aria-label', 'Toggle ink trails');
      btn.setAttribute('title', 'Ink trails');
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 L15 9 L17 11 L6 22 Z" /><path d="M15 9 L18 6 L21 9 L18 12 Z" /></svg>';
      // Insert right before the search trigger / sound toggle
      const reference = topbarRight.querySelector('.scribe-toggle') || topbarRight.querySelector('.sound-toggle') || topbarRight.firstChild;
      if (reference) {
        topbarRight.insertBefore(btn, reference);
      } else {
        topbarRight.appendChild(btn);
      }

      function refreshState() {
        const on = isOn();
        btn.classList.toggle('active', on);
        if (on) activate();
        else deactivate();
      }

      btn.addEventListener('click', () => {
        const on = !isOn();
        setOn(on);
        refreshState();
      });

      refreshState();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();

  // -----------------------------------------------------------------
  // SCRIBE MODE CURSOR — handled in CSS via body.scribe-mode selector.
  // This module just ensures the body class is present (atmosphere.js
  // already does this; we don't duplicate the toggle logic).
  // -----------------------------------------------------------------
})();
