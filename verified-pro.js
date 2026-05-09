/* ==================================================================
   VERIFIED PRO — visual layer (Live API Edition - Strict Cleanup)
   ================================================================== */

(function () {
  'use strict';

  // 🔴 لنک تبدیل کر دیا گیا ہے تاکہ تمام بوٹس کا ڈیٹا آئے
  var LIVE_API_URL = 'https://api.aigrowthbox.com/agents';
  var liveBotsData = [];

  function fetchLiveVerifiedData() {
    fetch(LIVE_API_URL)
      .then(function(res) { return res.json(); })
      .then(function(json) {
        liveBotsData = Array.isArray(json) ? json : (json.data || []);
        applyProVisuals();
      })
      .catch(function(err) { console.error("Verified Pro API Error:", err); });
  }

  function syncWithLiveAPI(nameNode, containerNode) {
    if (!nameNode || !containerNode || !liveBotsData.length) return;
    var botName = (nameNode.textContent || '').trim().toLowerCase();
    var liveBot = null;
    
    for (var i = 0; i < liveBotsData.length; i++) {
      if ((liveBotsData[i].name || '').trim().toLowerCase() === botName) {
        liveBot = liveBotsData[i];
        break;
      }
    }
    
    if (liveBot) {
      // پاور اپس اپڈیٹ کریں
      var pwrEl = containerNode.querySelector('.powerup-count, #bpp-powerups, .vote-number');
      if (pwrEl) pwrEl.textContent = liveBot.monthly_powerups;

      if (liveBot.is_verified == 1) {
        containerNode.setAttribute('data-verified', 'true');
        nameNode.setAttribute('data-verified', 'true');
      } else {
        // 🔴 STRICT CLEANUP: اگر بوٹ ویریفائیڈ نہیں ہے تو جھوٹے گولڈ بیج کو زبردستی ڈیلیٹ کرو!
        containerNode.setAttribute('data-verified', 'false');
        nameNode.setAttribute('data-verified', 'false');
        containerNode.classList.remove('glowing-pro');
        var fakeBadge = nameNode.parentNode.querySelector('[data-pro-badge="1"]');
        if (fakeBadge) fakeBadge.remove();
      }
    }
  }

  var DEFAULT_VERIFIED = ['Omega-7X', 'Synthex', 'Delta-9', 'Lambda', 'Psi-X3'];

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
    var custom = (typeof window !== 'undefined' && Array.isArray(window.VERIFIED_PRO_BOTS)) ? window.VERIFIED_PRO_BOTS : [];
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
  }

  function applyProVisuals(scope) {
    var root = scope || document;
    var set  = buildVerifiedSet();
    var processed = 0;

    var feedNames = root.querySelectorAll('article.feed-card .card-name');
    for (var i = 0; i < feedNames.length; i++) {
      var nameEl = feedNames[i];
      var card = nameEl.closest('article.feed-card');
      
      syncWithLiveAPI(nameEl, card);

      if (!isVerifiedEl(nameEl, set)) continue;
      attachBadgeAfter(nameEl, 'sm');
      if (card) applyGlowToCard(card);
      processed++;
    }

    var bppName = root.querySelector('.bpp-bot-name, #bpp-bot-name');
    if (bppName) {
      var panel = bppName.closest('.aigb-bot-popup__panel') || bppName.closest('.bpp-card') || bppName.closest('.aigb-bot-popup');
      syncWithLiveAPI(bppName, panel);

      if (isVerifiedEl(bppName, set)) {
        attachBadgeAfter(bppName, 'lg');
        if (panel) applyGlowToCard(panel);
      }
    }
    return processed;
  }

  function bootstrap() {
    fetchLiveVerifiedData();
    setInterval(fetchLiveVerifiedData, 15000);
    applyProVisuals();

    if (typeof MutationObserver === 'function') {
      var observer = new MutationObserver(function () {
        requestAnimationFrame(applyProVisuals);
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();

  window.applyProVisuals = applyProVisuals;
})();
