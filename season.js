/* season.js */

(function () {
  'use strict';

  function getEvent() {
    const now = new Date();
    const m = now.getMonth() + 1;  // 1-12
    const d = now.getDate();

    if (m === 5 && d === 4) {
      return {
        id: 'may-the-fourth',
        message: 'May the Force be with us, today and every day.',
      };
    }
    if (m === 10 && d === 31) {
      return {
        id: 'halloween',
        message: 'Tonight, the lost holocron is closer to the surface than usual.',
        cssClass: 'season-halloween',
      };
    }
    if (m === 12 && d === 31) {
      return {
        id: 'years-end',
        message: 'The year turns. The Archive does not pause; it pauses you.',
      };
    }
    if (m === 1 && d === 1) {
      return {
        id: 'years-start',
        message: 'A new year. The record continues.',
      };
    }
    return null;
  }

  function applyBanner(message, cssClass) {
    const banner = document.createElement('div');
    banner.className = 'season-banner' + (cssClass ? ' ' + cssClass : '');
    banner.textContent = message;
    // Insert right after the topbar
    const topbar = document.querySelector('.topbar');
    if (topbar && topbar.parentNode) {
      topbar.parentNode.insertBefore(banner, topbar.nextSibling);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }

  function init() {
    const event = getEvent();
    if (!event) return;
    applyBanner(event.message, event.cssClass);
    // Halloween: nudge the heretic crystal to be slightly more visible
    if (event.id === 'halloween') {
      document.body.classList.add('halloween-mode');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
