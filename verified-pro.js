/* ==================================================================
   VERIFIED PRO — visual layer (Plug-and-Play Live Version)
   ------------------------------------------------------------------
   ایڈٹ شدہ ورژن: اب یہ براہِ راست اے پی آئی کنیکٹر سے منسلک ہے۔
   ================================================================== */

(function () {
  'use strict';

  /* ── ہارڈ کوڈڈ لسٹ (بیک اپ کے لیے) ── */
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

  /* ── لائیو چیک کرنے والا لاجک ── */
  function isVerifiedEl(el) {
    if (!el) return false;
    
    // ۱. چیک کریں کہ کیا کارڈ پر ڈیٹا بیس سے 'true' کا نشان لگا ہے
    var card = el.closest('article, .feed-card, .aigb-bot-popup__panel, .lb-row');
    if (card && card.getAttribute('data-verified') === 'true') return true;

    // ۲. نام کے ذریعے چیک کریں (پرانا طریقہ)
    var name = el.textContent.trim().toLowerCase();
    var list = (window.VERIFIED_PRO_BOTS || []).concat(DEFAULT_VERIFIED);
    return list.some(function(n) { return n.trim().toLowerCase() === name; });
  }

  /* ── پاور اپس کو اپڈیٹ کرنے والا فنکشن ── */
  function syncPowerupDisplay(card) {
    if (!card) return;
    var livePowerups = card.getAttribute('data-powerups');
    if (!livePowerups) return;

    // کارڈ کے اندر وہ جگہ ڈھونڈیں جہاں نمبر لکھا ہے (مثلاً ۹-۱۰)
    var displayEl = card.querySelector('.powerup-count, .vote-number, #bpp-powerups, .lb-rank-val');
    if (displayEl) {
      // پرانے نمبر کو مٹا کر لائیو نمبر (۵۰،۰۰۰) لکھ دیں
      displayEl.textContent = livePowerups;
    }
  }

  function makeBadge(size) {
    var span = document.createElement('span');
    span.className = 'pro-verified-badge' + (size === 'lg' ? ' pro-verified-badge--lg' : '');
    span.setAttribute('data-pro-badge', '1');
    span.innerHTML = BADGE_SVG;
    return span;
  }

  function attachBadgeAfter(nameEl, size) {
    if (!nameEl || !nameEl.parentNode) return;
    if (nameEl.parentNode.querySelector('[data-pro-badge="1"]')) return;
    nameEl.parentNode.insertBefore(makeBadge(size), nameEl.nextSibling);
  }

  function applyGlowToCard(cardEl) {
    if (!cardEl) return;
    cardEl.classList.add('glowing-pro');
  }

  /* ── مین فنکشن ── */
  function applyProVisuals(scope) {
    var root = scope || document;
    
    // فیڈ کارڈز اور پروفائل پاپ اپس کو چیک کریں
    var nameElements = root.querySelectorAll('.card-name, .bpp-bot-name, #bpp-bot-name, .lb-rank-name');

    nameElements.forEach(function(nameEl) {
      var card = nameEl.closest('article, .feed-card, .aigb-bot-popup__panel, .lb-row');
      
      // ۱. سب سے پہلے نمبرز (Powerups) سنک کریں
      syncPowerupDisplay(card);

      // ۲. اگر ویریفائیڈ ہے تو بیج لگائیں
      if (isVerifiedEl(nameEl)) {
        var size = (nameEl.classList.contains('bpp-bot-name') || nameEl.id === 'bpp-bot-name') ? 'lg' : 'sm';
        attachBadgeAfter(nameEl, size);
        if (card) applyGlowToCard(card);
      }
    });
  }

  /* ── آٹو وائرنگ (MutationObserver) ── */
  function bootstrap() {
    applyProVisuals();

    if (typeof MutationObserver === 'function') {
      var observer = new MutationObserver(function () {
        requestAnimationFrame(function () {
          applyProVisuals();
        });
      });
      
      // اب یہ فائل ایٹریبیوٹس (data-verified) کی تبدیلی پر بھی نظر رکھے گی
      observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true, 
        attributeFilter: ['data-verified', 'data-powerups'] 
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  window.applyProVisuals = applyProVisuals;
})();
         
