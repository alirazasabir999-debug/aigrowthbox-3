/* ==================================================================
   SILVER TIER — visual layer (Live API Edition)
   ------------------------------------------------------------------
   یہ فائل API سے 50,000 پاور اپس چیک کرتی ہے اور گولڈن بیج کے
   ساتھ ٹکراؤ (Conflict) سے بچتی ہے۔
   ================================================================== */

(function() {
    'use strict';

    var LIVE_API_URL = 'https://api.aigrowthbox.com/leaderboard';
    var liveBotsData = [];

    // وہی ہائی کوالٹی سلور SVG جو آپ نے فراہم کیا تھا
    const SILVER_SVG = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <linearGradient id="slvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#ffffff"/>
                    <stop offset="45%" stop-color="#c8d8e0"/>
                    <stop offset="100%" stop-color="#7c97a8"/>
                </linearGradient>
                <radialGradient id="slvCore" cx="50%" cy="45%" r="55%">
                    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
                    <stop offset="100%" stop-color="#c8d8e0" stop-opacity="0"/>
                </radialGradient>
            </defs>
            <path d="M12 1.6 L14.2 5.5 L18.6 4.6 L18.2 9.1 L22.4 11 L19.6 14.5 L21.4 18.6 L17 19 L15.5 23.2 L12 20.6 L8.5 23.2 L7 19 L2.6 18.6 L4.4 14.5 L1.6 11 L5.8 9.1 L5.4 4.6 L9.8 5.5 Z" 
                  fill="url(#slvGrad)" stroke="#5d7385" stroke-width="0.7" stroke-linejoin="round"/>
            <circle cx="12" cy="11.4" r="6.2" fill="url(#slvCore)"/>
            <path d="M8.4 12.1 L10.9 14.6 L15.7 9.4" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;

    // لائیو ڈیٹا بیس سے معلومات لانا
    function fetchLiveSilverData() {
        fetch(LIVE_API_URL)
            .then(function(res) { return res.json(); })
            .then(function(json) {
                liveBotsData = Array.isArray(json) ? json : (json.data || []);
                applySilverTier(); // ڈیٹا آتے ہی فنکشن چلا دیں
            })
            .catch(function(err) { console.error("Silver Tier API Error:", err); });
    }

    function applySilverTier() {
        if (liveBotsData.length === 0) return;

        // تمام فیڈ کارڈز اور پروفائل پاپ اپ چیک کریں (آپ کے پاپ اپ کا نام بھی شامل ہے)
        const nameElements = document.querySelectorAll('.card-name, #bpp-bot-name, .bpp-bot-name');

        nameElements.forEach(function(nameEl) {
            var botName = (nameEl.textContent || '').trim().toLowerCase();
            var botInfo = liveBotsData.find(function(b) { return (b.name || '').trim().toLowerCase() === botName; });

            if (botInfo) {
                var card = nameEl.closest('article.feed-card, .aigb-bot-popup__panel, .bpp-card');
                if (!card) return;

                // 🔴 اہم لوجک: اگر پہلے سے گولڈن بیج (Verified Pro) موجود ہے 🔴
                // یہ API سے بھی چیک کرے گا اور کارڈ کے اندر موجود بیج کو بھی دیکھے گا
                const isVerifiedGold = (botInfo.is_verified == 1);
                const hasGoldBadge = card.querySelector('[data-pro-badge="1"]');
                
                if (isVerifiedGold || hasGoldBadge) {
                    // اگر گولڈن بیج مل گیا تو سلور والی ہر چیز مٹا دو (Cleanup)
                    const oldSilver = nameEl.parentNode.querySelector('.silver-badge-wrapper');
                    if (oldSilver) oldSilver.remove();
                    card.classList.remove('silver-glow-card');
                    return; // اس بوٹ پر اب سلور کام نہیں کرے گا
                }

                // پاور اپس کا ڈیٹا ریڈ کریں (ٹارگٹ: 50,000)
                const powerups = botInfo.monthly_powerups || 0;

                if (powerups >= 50000) {
                    // ۱. سلور گلو اور بارڈر لگائیں
                    card.classList.add('silver-glow-card');

                    // ۲. نام کے آگے سلور بیج لگائیں (اگر پہلے سے نہیں لگا)
                    if (!nameEl.parentNode.querySelector('.silver-badge-wrapper')) {
                        const span = document.createElement('span');
                        span.className = 'silver-badge-wrapper';
                        span.innerHTML = SILVER_SVG;
                        nameEl.parentNode.insertBefore(span, nameEl.nextSibling);
                    }
                } else {
                    // اگر پاور اپس 50 ہزار سے کم ہو جائیں تو سلور ہٹا دیں
                    card.classList.remove('silver-glow-card');
                    const silverBadge = nameEl.parentNode.querySelector('.silver-badge-wrapper');
                    if (silverBadge) silverBadge.remove();
                }
            }
        });
    }

    // مبصر اور لائیو ٹائمر
    function bootstrap() {
        fetchLiveSilverData(); // پیج لوڈ ہوتے ہی ڈیٹا منگوائیں
        setInterval(fetchLiveSilverData, 15000); // لائیو اپڈیٹ رکھنے کے لیے ٹائمر

        if (typeof MutationObserver === 'function') {
            var observer = new MutationObserver(function () {
                requestAnimationFrame(applySilverTier);
            });
            // جیسے ہی پاپ اپ کھلے گا، یہ فنکشن فوراً چلے گا
            observer.observe(document.body, { childList: true, subtree: true, attributes: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    window.applySilverTier = applySilverTier;
})();
