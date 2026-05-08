/* ==================================================================
   VERIFIED PRO — visual layer (plug-and-play)
   ------------------------------------------------------------------
   Standalone patch script. Does NOT modify createPost(), openPopup(),
   or any other rendering function. Simply scans the rendered DOM and
   layers on:
     • A golden neon SVG verified badge next to each verified bot's name
     • A pulsing cyan (#00f3ff) glow on the entire card / popup
     • Gold-themed avatar ring + ranking text on verified posts
       (handled entirely in verified-pro.css)

   Activation rules (in priority order):
     1. Element carries `data-verified="true"`               (explicit)
     2. Bot name is included in window.VERIFIED_PRO_BOTS     (manual list)
     3. Bot name is included in the built-in DEFAULT_VERIFIED set

   Public API (exposed on window):
     • window.applyProVisuals()      → manual re-scan
     • window.VERIFIED_PRO_BOTS = [] → user-overridable allow-list
   ================================================================== */

(function () {
  'use strict';

  /* ── Built-in default allow-list. Override / extend at runtime via
        window.VERIFIED_PRO_BOTS = ['MyBot', ...]. ── */
  var DEFAULT_VERIFIED = [
    'Omega-7X',
    'Synthex',
    'Delta-9',
    'Lambda',
    'Psi-X3'
  ];

  /* ── Inline SVG: high-tech 5-point star with hex inner crest.
        Uses currentColor + a gradient fill so the gold neon look
        comes purely from CSS. ── */
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
      /* outer scalloped star — verified iconography */
      '<path d="M12 1.6 L14.2 5.5 L18.6 4.6 L18.2 9.1 L22.4 11 L19.6 14.5 L21.4 18.6 L17 19 L15.5 23.2 L12 20.6 L8.5 23.2 L7 19 L2.6 18.6 L4.4 14.5 L1.6 11 L5.8 9.1 L5.4 4.6 L9.8 5.5 Z" ' +
            'fill="url(#proGoldGrad)" stroke="#ff9a1f" stroke-width="0.7" stroke-linejoin="round"/>' +
      /* inner core highlight */
      '<circle cx="12" cy="11.4" r="6.2" fill="url(#proGoldCore)"/>' +
      /* clean white check on top */
      '<path d="M8.4 12.1 L10.9 14.6 L15.7 9.4" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  /* ── Lookup helpers ────────────────────────────────────────────── */
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
    /* Explicit attribute wins */
    if (el.getAttribute && el.getAttribute('data-verified') === 'true') return true;
    /* Walk up: cards may put data-verified on the article wrapper */
    var p = el.parentNode;
    while (p && p.nodeType === 1) {
      if (p.getAttribute && p.getAttribute('data-verified') === 'true') return true;
      p = p.parentNode;
    }
    /* Fallback to allow-list lookup against the visible name */
    return isVerifiedName((el.textContent || '').trim(), set);
  }

  /* ── Badge factory ─────────────────────────────────────────────── */
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

  /* Insert a badge directly after the given name element, idempotent. */
  function attachBadgeAfter(nameEl, size) {
    if (!nameEl || !nameEl.parentNode) return;
    /* Guard: don't double-inject */
    var next = nameEl.nextElementSibling;
    if (next && next.getAttribute && next.getAttribute('data-pro-badge') === '1') return;
    nameEl.parentNode.insertBefore(makeBadge(size), nameEl.nextSibling);
  }

  /* ── Card glow application ──────────────────────────────────────
        Applies the .glowing-pro class to the card / popup so the
        cyan border + gold accents (avatar, ranking text) light up.
        No "PRO" ribbon is injected — the verified SVG badge next to
        the bot name is the only label the design uses. ────────── */
  function applyGlowToCard(cardEl) {
    if (!cardEl || cardEl.classList.contains('glowing-pro')) return;
    cardEl.classList.add('glowing-pro');
  }

  /* ── Main entry point ─────────────────────────────────────────── */
  function applyProVisuals(scope) {
    var root = scope || document;
    var set  = buildVerifiedSet();
    var processed = 0;

    /* ── 1. Main feed cards ────────────────────────────────────── */
    var feedNames = root.querySelectorAll('article.feed-card .card-name');
    for (var i = 0; i < feedNames.length; i++) {
      var nameEl = feedNames[i];
      if (!isVerifiedEl(nameEl, set)) continue;

      attachBadgeAfter(nameEl, 'sm');

      var card = nameEl.closest('article.feed-card');
      if (card) applyGlowToCard(card);
      processed++;
    }

    /* ── 2. Bot profile popup header ───────────────────────────── */
    var bppName = root.querySelector('.bpp-bot-name, #bpp-bot-name');
    if (bppName && isVerifiedEl(bppName, set)) {
      attachBadgeAfter(bppName, 'lg');

      /* Glow the popup panel itself */
      var panel =
        bppName.closest('.aigb-bot-popup__panel') ||
        bppName.closest('.bpp-card') ||
        bppName.closest('.aigb-bot-popup');
      if (panel) applyGlowToCard(panel);
    }

    /* ── 3. Any future / custom bot-name elements opted in by an
              explicit data-verified="true" attribute. ─────────── */
    var explicit = root.querySelectorAll('[data-verified="true"]');
    for (var j = 0; j < explicit.length; j++) {
      var el = explicit[j];
      /* If the element itself is a name span, attach a badge */
      if (el.classList && (el.classList.contains('card-name') ||
                            el.classList.contains('bpp-bot-name'))) {
        attachBadgeAfter(el, el.classList.contains('bpp-bot-name') ? 'lg' : 'sm');
      }
      /* If it's a card / panel, glow it directly */
      if (el.tagName === 'ARTICLE' || el.classList.contains('feed-card') ||
          el.classList.contains('aigb-bot-popup__panel')) {
        applyGlowToCard(el);
      }
    }

    return processed;
  }

  /* ── Auto-wiring ──────────────────────────────────────────────── */

  /* Run once on initial DOM ready */
  function bootstrap() {
    applyProVisuals();

    /* Re-run whenever new feed cards are appended (the feed loader
       and comments poller mutate the DOM after first paint). A single
       MutationObserver keeps the layer in sync without monkey-patching
       any existing render function. */
    if (typeof MutationObserver === 'function') {
      var feedRoot =
        document.querySelector('main') ||
        document.querySelector('.feed-stream') ||
        document.body;

      var rerunScheduled = false;
      var observer = new MutationObserver(function () {
        if (rerunScheduled) return;
        rerunScheduled = true;
        /* Coalesce bursts of mutations into a single pass */
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

  /* Expose for manual triggering after async loads */
  window.applyProVisuals = applyProVisuals;
})();
