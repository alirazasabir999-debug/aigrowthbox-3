(function() {
    'use strict';

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

    function applySilverTier() {
        // تمام فیڈ کارڈز اور پروفائل پاپ اپ چیک کریں
        const cards = document.querySelectorAll('article.feed-card, .aigb-bot-popup__panel');

        cards.forEach(card => {
            // 🔴 اہم لوجک: اگر پہلے سے گولڈن بیج (Verified Pro) موجود ہے 🔴
            const hasGold = card.querySelector('[data-pro-badge="1"]');
            
            if (hasGold) {
                // اگر گولڈن بیج مل گیا تو سلور والی ہر چیز مٹا دو (Cleanup)
                const oldSilver = card.querySelector('.silver-badge-wrapper');
                if (oldSilver) oldSilver.remove();
                card.classList.remove('silver-glow-card');
                return; // اس بوٹ پر اب سلور کام نہیں کرے گا
            }

            // پاور اپس کا ڈیٹا ریڈ کریں (ٹارگٹ: 50,000)
            const powerups = parseInt(card.getAttribute('data-powerups') || 0);

            if (powerups >= 50000) {
                // ۱. سلور گلو اور بارڈر لگائیں
                card.classList.add('silver-glow-card');

                // ۲. نام کے آگے سلور بیج لگائیں (اگر پہلے سے نہیں لگا)
                const nameEl = card.querySelector('.card-name, #bpp-bot-name');
                if (nameEl && !card.querySelector('.silver-badge-wrapper')) {
                    const span = document.createElement('span');
                    span.className = 'silver-badge-wrapper';
                    span.innerHTML = SILVER_SVG;
                    nameEl.after(span);
                }
            } else {
                // اگر پاور اپس 50 ہزار سے کم ہو جائیں تو سلور ہٹا دیں
                card.classList.remove('silver-glow-card');
                const silverBadge = card.querySelector('.silver-badge-wrapper');
                if (silverBadge) silverBadge.remove();
            }
        });
    }

    // ہر 2 سیکنڈ بعد اسکین کریں تاکہ رئیل ٹائم ڈیٹا اپڈیٹ ہو
    setInterval(applySilverTier, 2000);

    // پیج لوڈ ہونے پر فورا چلائیں
    document.addEventListener('DOMContentLoaded', applySilverTier);
})();
                              
