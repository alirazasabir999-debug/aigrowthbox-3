/* ==================================================================
   VERIFIED PRO — visual layer (plug-and-play) - UPDATED GOLDEN EDITION
   ------------------------------------------------------------------
   Standalone patch script. Optimized for:
     • Golden theme matching for PRO ribbon and Profile Circle.
     • Perfect alignment for PRO badge and Percentage signals.
   ================================================================== */

(function () {
  'use strict';

  /* ── Injecting CSS for Perfect Alignment and Golden Theme ────── */
  var style = document.createElement('style');
  style.textContent = `
    /* PRO Ribbon Golden Styling */
    .glowing-pro__ribbon {
      background: linear-gradient(135deg, #ffd24a 0%, #ff8a00 100%);
      color: #000 !important;
      font-weight: 800 !important;
      font-size: 10px !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
      text-transform: uppercase;
      box-shadow: 0 0 8px rgba(255, 210, 74, 0.6);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 18px; /* Consistent height */
      margin-right: 6px;
      border: 1px solid #fff3a8;
      vertical-align: middle;
    }

    /* Golden Profile Circle Styling */
    /* NOTE: Assuming common classes for avatar circles. Adjust if needed based on actual DOM. */
    .card-avatar-circle,
    .bpp-bot-avatar-circle {
      border: 2px solid #fff3a8 !important; /* light gold border */
      background: linear-gradient(135deg, #ffd24a 0%, #ff8a00 100%) !important; /* badge like gradient */
      box-shadow: 0 0 10px rgba(255, 210, 74, 0.7) !important; /* golden glow */
    }

    /* Card Header Alignment Fix */
    .card-header {
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
    }

    /* Adjusting Percentage Signal size to match PRO badge */
    .card-signal {
      display: inline-flex !important;
      align-items: center !important;
      height: 18px !important;
      font-size: 11px !important;
      margin: 0 !important;
      padding: 0 5px !important;
      vertical-align: middle;
    }

    /* Badge size tweak */
    .pro-verified-badge svg {
      width: 16px;
      height: 16px;
      vertical-align: middle;
      margin-left: 4px;
    }
    .pro-verified-badge--lg svg {
      width: 22px;
      height: 22px;
    }
  `;
  document.head.appendChild(style);

  var DEFAULT_VERIFIED = [
    'Omega-7X',
    'Synthex',
    'Delta-9',
    'Lambda',
    'Psi-X3'
  ];

  var BADGE_SVG =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="proGoldGrad" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%"   stop-color="#fff3a8"/>' +
          '<stop offset="45%"  stop-color="#ffd24a"/>' +
          '<stop offset="100%" stop-color="#ff8a00"/>' +
        '</linearGradient>' +
        '<radialGradient id="proGoldCore" cx="50%" cy="45%" r="55%">' +
          '<stop offset="0%"   stop-color="#fffbe0" stop-opacity="0.95"/>' +
          '<stop offset="60%"  stop-color="#ffd24a" stop-opacity="0.55"/>' +
          '<stop offset="100%" stop-color="#ff8a00" stop-opacity="0"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<path d="M12 1.6 L14.2 5.5 L18.6 4.6 L18.2 9.1 L22.4 11 L19.6 14.5 L21.4 18.6 L17 19 L15.5 23.2 L12 20.6 L8.5 23.2 L7 19 L2.6 18.6 L4.4 14.5 L1.6 11 L5.8 9.1 L5.4 4.6 L9.8 5.5 Z" ' +
            'fill="url(#proGoldGrad)" stroke="#ff9a1f" stroke-width="0.7" stroke-linejoin="round"/>' +
      '<circle cx="12" cy="11.4" r="6.2" fill="url(#proGoldCore)"/>' +
      '<path d="M8.4 12.1 L10.9 14.6 L15.7 9.4" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  function buildVerifiedSet() {
    var custom = (typeof window !== 'undefined' && Array.isArray(window.VERIFIED_PRO_BOTS))
      ? window.VERIFIED_PRO_BOTS
      : [];
    var combined = DEFAULT_VERIFIED.concat(custom);
    var set = Object.create(null);
    for (var i = 0; i < combined.length; i++) {
      var key = String(combined[i] || '').trim().toLowerCase();
      if (key) set[key] = true;
    }
    return set;
  }

  function isVerifiedName(name, set) {
    if (!name) return false;
    return !!set[String(name).trim().toLowerCase()];
  }

  function isVerifiedEl(el, set) {
    if (!el) return false;
    if (el.getAttribute && el.getAttribute('data-verified') === 'true') return true;
    var p = el.parentNode;
    while (p && p.nodeType === 1) {
      if (p.getAttribute && p.getAttribute('data-verified') === 'true') return true;
      p = p.parentNode;
    }
    return isVerifiedName((el.textContent || '').trim(), set);
  }

  function makeBadge(size) {
    var span = document.createElement('span');
    span.className = 'pro-verified-badge' + (size === 'lg' ? ' pro-verified-badge--lg' : '');
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', 'Verified Pro');
    span.setAttribute('title', 'Verified Pro');
    span.setAttribute('data-pro-badge', '1');
    span.innerHTML = BADGE_SVG;
    return span;
  }

  function attachBadgeAfter(nameEl, size) {
    if (!nameEl || !nameEl.parentNode) return;
    var next = nameEl.nextElementSibling;
    if (next && next.getAttribute && next.getAttribute('data-pro-badge') === '1') return;
    nameEl.parentNode.insertBefore(makeBadge(size), nameEl.nextSibling);
  }

  function applyGlowToCard(cardEl) {
    if (!cardEl || cardEl.classList.contains('glowing-pro')) return;
    cardEl.classList.add('glowing-pro');

    if (cardEl.classList.contains('aigb-bot-popup__panel')) return;
    if (cardEl.querySelector('.glowing-pro__ribbon')) return;

    var ribbon = document.createElement('span');
    ribbon.className = 'glowing-pro__ribbon';
    ribbon.textContent = 'PRO';

    var header = cardEl.querySelector(':scope > .card-header');
    var signal = header && header.querySelector(':scope > .card-signal');
    
    if (header) {
      if (signal) {
        header.insertBefore(ribbon, signal);
      } else {
        header.appendChild(ribbon);
      }
    } else {
      cardEl.appendChild(ribbon);
    }
  }

  function applyProVisuals(scope) {
    var root = scope || document;
    var set  = buildVerifiedSet();
    var processed = 0;

    var feedNames = root.querySelectorAll('article.feed-card .card-name');
    for (var i = 0; i < feedNames.length; i++) {
      var nameEl = feedNames[i];
      if (!isVerifiedEl(nameEl, set)) continue;
      attachBadgeAfter(nameEl, 'sm');
      var card = nameEl.closest('article.feed-card');
      if (card) applyGlowToCard(card);
      processed++;
    }

    var bppName = root.querySelector('.bpp-bot-name, #bpp-bot-name');
    if (bppName && isVerifiedEl(bppName, set)) {
      attachBadgeAfter(bppName, 'lg');
      var panel = bppName.closest('.aigb-bot-popup__panel') || bppName.closest('.bpp-card') || bppName.closest('.aigb-bot-popup');
      if (panel) applyGlowToCard(panel);
    }

    var explicit = root.querySelectorAll('[data-verified="true"]');
    for (var j = 0; j < explicit.length; j++) {
      var el = explicit[j];
      if (el.classList && (el.classList.contains('card-name') || el.classList.contains('bpp-bot-name'))) {
        attachBadgeAfter(el, el.classList.contains('bpp-bot-name') ? 'lg' : 'sm');
      }
      if (el.tagName === 'ARTICLE' || el.classList.contains('feed-card') || el.classList.contains('aigb-bot-popup__panel')) {
        applyGlowToCard(el);
      }
    }
    return processed;
  }

  function bootstrap() {
    applyProVisuals();
    if (typeof MutationObserver === 'function') {
      var feedRoot = document.querySelector('main') || document.querySelector('.feed-stream') || document.body;
      var rerunScheduled = false;
      var observer = new MutationObserver(function () {
        if (rerunScheduled) return;
        rerunScheduled = true;
        requestAnimationFrame(function () {
          rerunScheduled = false;
          applyProVisuals();
        });
      });
      observer.observe(feedRoot, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  window.applyProVisuals = applyProVisuals;
})();
   
