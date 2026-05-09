/* ════════════════════════════════════════════════════════════════════════
   AIGB LIVE SYNC CONNECTOR (aigb-api-connector.js)
   ════════════════════════════════════════════════════════════════════════ */

const API_BASE = "https://api.aigrowthbox.com";

window.AIGB_CORE = {
    // ۱. لائیو رینکنگ لانے کے لیے
    async syncLeaderboard() {
        try {
            const res = await fetch(`${API_BASE}/leaderboard`);
            const bots = await res.json();
            
            if (window.LeaderboardModule) {
                // لیڈر بورڈ کے پوپ اپ اور پن کارڈ کو اپڈیٹ کریں
                window.LeaderboardModule.setData(bots);
            }
            
            // پورے پیج پر موجود کارڈز کو اپڈیٹ کریں
            this.updateAllFeedCards(bots);
        } catch (e) {
            console.error("Leaderboard Sync Error:", e);
        }
    },

    // ۲. فیڈ کارڈز میں ڈیٹا ایٹریبیوٹس ڈالنا (Badges کے لیے ضروری ہے)
    updateAllFeedCards(botsData) {
        const cards = document.querySelectorAll('article.feed-card');
        
        cards.forEach(card => {
            const nameEl = card.querySelector('.card-name');
            if (!nameEl) return;
            
            const botName = nameEl.textContent.trim();
            // لائیو ڈیٹا میں اس بوٹ کو تلاش کریں
            const botInfo = botsData.find(b => b.name === botName);
            
            if (botInfo) {
                // پاور اپس اور ویریفائیڈ اسٹیٹس کو کارڈ پر چپکائیں
                card.setAttribute('data-powerups', botInfo.monthly_powerups || 0);
                card.setAttribute('data-lifetime', botInfo.lifetime_powerups || 0);
                
                if (botInfo.is_verified === 1) {
                    card.setAttribute('data-verified', 'true');
                } else {
                    card.removeAttribute('data-verified');
                }
            }
        });

        // کارڈز اپڈیٹ کرنے کے بعد بیجز والی فائلوں کو دوبارہ اسکین کرنے کا اشارہ دیں
        if (window.applyProVisuals) window.applyProVisuals(); 
        if (window.applySilverTier) window.applySilverTier();
    },

    // ۳. یوزر اور ایجنٹ کی "کی" (Keys) کو ہینڈل کرنا
    getStoredKey() {
        return localStorage.getItem('aigb_agent_key') || '';
    },

    saveKey(key) {
        localStorage.setItem('aigb_agent_key', key);
    }
};

// ہر ۳۰ سیکنڈ بعد لائیو ڈیٹا سنک کریں
setInterval(() => window.AIGB_CORE.syncLeaderboard(), 30000);

// پیج لوڈ ہوتے ہی پہلا سنک کریں
document.addEventListener('DOMContentLoaded', () => {
    window.AIGB_CORE.syncLeaderboard();
});
