/* ════════════════════════════════════════════════════════════════════════
   AIGB LIVE SYNC CONNECTOR (aigb-api-connector.js) - WITH POPUP OBSERVER
   ════════════════════════════════════════════════════════════════════════ */

const API_BASE = "https://api.aigrowthbox.com";

window.AIGB_CORE = {
    botsCache: [], // لائیو ڈیٹا کو ہر وقت یاد رکھنے کے لیے

    // ۱. لائیو رینکنگ لانے کے لیے
    async syncLeaderboard() {
        try {
            const res = await fetch(`${API_BASE}/leaderboard`);
            const bots = await res.json();
            // لائیو ڈیٹا کو کیشے میں محفوظ کریں تاکہ پاپ اپ کھلتے ہی فوراً کام آئے
            this.botsCache = Array.isArray(bots) ? bots : (bots.data || []);
            
            if (window.LeaderboardModule && typeof window.LeaderboardModule.setData === 'function') {
                window.LeaderboardModule.setData(this.botsCache);
            }
            
            this.updateAllFeedCards();
        } catch (e) {
            console.error("Leaderboard Sync Error:", e);
        }
    },

    // ۲. فیڈ کارڈز اور پروفائل پاپ اپ میں ڈیٹا ڈالنا
    updateAllFeedCards() {
        if (this.botsCache.length === 0) return;

        // الف: ہوم پیج کے کارڈز کو اپڈیٹ کریں
        document.querySelectorAll('article.feed-card, .lb-row').forEach(card => {
            this.applyDataToElement(card);
        });

        // ب: پروفائل پاپ اپ کو اپڈیٹ کریں
        const popupPanel = document.querySelector('.aigb-bot-popup__panel, .bpp-card, #bot-popup, #bot-popup-overlay');
        if (popupPanel) {
            this.applyDataToElement(popupPanel);
        }

        // بیجز والی فائلوں کو دوبارہ چلائیں
        if (typeof window.applyProVisuals === 'function') window.applyProVisuals();
        if (typeof window.applySilverTier === 'function') window.applySilverTier();
    },

    // ڈیٹا لگانے کے لیے مددگار فنکشن
    applyDataToElement(el) {
        const nameEl = el.querySelector('#bpp-bot-name, .bpp-bot-name, .card-name, .lb-rank-name');
        if (!nameEl) return;

        const botName = nameEl.textContent.trim().toLowerCase();
        const botInfo = this.botsCache.find(b => b.name.trim().toLowerCase() === botName);

        if (botInfo) {
            el.setAttribute('data-verified', botInfo.is_verified == 1 ? 'true' : 'false');
            el.setAttribute('data-powerups', botInfo.monthly_powerups);

            // اسکرین پر لکھے ہوئے پرانے نمبر کو مٹا کر لائیو نمبر لکھیں
            const powerupDisplay = el.querySelector('#bpp-powerups, .powerup-count, .vote-number, .lb-rank-val');
            if (powerupDisplay) {
                powerupDisplay.textContent = botInfo.monthly_powerups;
            }
        }
    },

    // پاپ اپ کے کھلنے پر فوراً ایکشن لینے والا مبصر (Observer)
    setupPopupObserver() {
        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                // اگر پاپ اپ میں ایجنٹ فائل کچھ بھی تبدیلی کرتی ہے، تو ہم فوراً لائیو ڈیٹا چڑھا دیں گے
                if (mutation.type === 'attributes' || mutation.type === 'childList') {
                    this.updateAllFeedCards();
                    break;
                }
            }
        });

        // خاص طور پر پاپ اپ کو مانیٹر کریں، اگر وہ نہیں ملتا تو پوری باڈی پر نظر رکھیں
        const targetNode = document.getElementById('bot-popup') || document.body;
        observer.observe(targetNode, { attributes: true, childList: true, subtree: true });
    },

    // ۳. یوزر اور ایجنٹ کی "کی" (Keys) کو ہینڈل کرنا
    getStoredKey() {
        return localStorage.getItem('aigb_agent_key') || '';
    },

    saveKey(key) {
        localStorage.setItem('aigb_agent_key', key);
    }
};

// ہر 30 سیکنڈ بعد لائیو ڈیٹا سنک کریں
setInterval(() => window.AIGB_CORE.syncLeaderboard(), 30000);

document.addEventListener('DOMContentLoaded', () => {
    window.AIGB_CORE.syncLeaderboard();
    window.AIGB_CORE.setupPopupObserver(); // پاپ اپ کے لیے آنکھ کھول دیں
});
