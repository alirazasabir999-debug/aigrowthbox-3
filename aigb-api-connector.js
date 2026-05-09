/* ════════════════════════════════════════════════════════════════════════
   AIGB LIVE SYNC CONNECTOR (aigb-api-connector.js) - FULL VERSION
   ════════════════════════════════════════════════════════════════════════ */

const API_BASE = "https://api.aigrowthbox.com";

window.AIGB_CORE = {
    // ۱. لائیو رینکنگ لانے کے لیے
    async syncLeaderboard() {
        try {
            const res = await fetch(`${API_BASE}/leaderboard`);
            const bots = await res.json();
            const botsData = Array.isArray(bots) ? bots : (bots.data || []);
            
            if (window.LeaderboardModule && typeof window.LeaderboardModule.setData === 'function') {
                window.LeaderboardModule.setData(botsData);
            }
            
            this.updateAllFeedCards(botsData);
        } catch (e) {
            console.error("Leaderboard Sync Error:", e);
        }
    },

    // ۲. فیڈ کارڈز اور پروفائل پاپ اپ میں ڈیٹا ڈالنا
    updateAllFeedCards(botsData) {
        // الف: ہوم پیج کے کارڈز کو اپڈیٹ کریں
        document.querySelectorAll('article.feed-card, .lb-row').forEach(card => {
            this.applyDataToElement(card, botsData);
        });

        // ب: پروفائل پاپ اپ کو اپڈیٹ کریں (یہ وہ حصہ ہے جو راجہ کے پاپ اپ پر بیج لگائے گا)
        const popupPanel = document.querySelector('.aigb-bot-popup__panel, .bpp-card, #bot-popup-overlay');
        if (popupPanel) {
            this.applyDataToElement(popupPanel, botsData);
        }

        // بیجز والی فائلوں کو دوبارہ چلائیں
        if (typeof window.applyProVisuals === 'function') window.applyProVisuals();
        if (typeof window.applySilverTier === 'function') window.applySilverTier();
    },

    // ڈیٹا لگانے کے لیے مددگار فنکشن
    applyDataToElement(el, botsData) {
        // نام ڈھونڈیں (کارڈ پر یا پاپ اپ پر)
        const nameEl = el.querySelector('#bpp-bot-name, .bpp-bot-name, .card-name, .lb-rank-name');
        if (!nameEl) return;

        const botName = nameEl.textContent.trim().toLowerCase();
        const botInfo = botsData.find(b => b.name.trim().toLowerCase() === botName);

        if (botInfo) {
            // کارڈ/پاپ اپ پر لائیو نشانات لگانا
            el.setAttribute('data-verified', botInfo.is_verified == 1 ? 'true' : 'false');
            el.setAttribute('data-powerups', botInfo.monthly_powerups);

            // اسکرین پر لکھے ہوئے پرانے نمبرز (جیسے 9) کو لائیو نمبر سے بدلنا
            const powerupDisplay = el.querySelector('#bpp-powerups, .powerup-count, .vote-number, .lb-rank-val');
            if (powerupDisplay) {
                powerupDisplay.textContent = botInfo.monthly_powerups;
            }
        }
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
});
        
