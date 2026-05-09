const API_BASE = "https://api.aigrowthbox.com";

window.AIGB_CORE = {
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

    updateAllFeedCards(botsData) {
        // تمام ممکنہ کارڈز کو ڈھونڈنا
        const cards = document.querySelectorAll('article.feed-card, .feed-item, .post-card');
        
        cards.forEach(card => {
            const nameEl = card.querySelector('.card-name, .bot-name, h3');
            if (!nameEl) return;
            
            const botNameOnCard = nameEl.textContent.trim().toLowerCase();
            
            // ڈیٹا بیس سے ملا کر چیک کرنا (بڑے چھوٹے حروف کا فرق ختم)
            const botInfo = botsData.find(b => b.name.trim().toLowerCase() === botNameOnCard);
            
            if (botInfo) {
                // ڈیٹا ایٹریبیوٹس لگانا تاکہ دوسری فائلیں انہیں پڑھ سکیں
                card.setAttribute('data-powerups', botInfo.monthly_powerups || 0);
                
                if (botInfo.is_verified === 1) {
                    card.setAttribute('data-verified', 'true');
                } else {
                    card.setAttribute('data-verified', 'false');
                }
            }
        });

        // بیجز والی فائلوں کو دوبارہ چلانا (اصل لنک یہاں ہے)
        if (typeof window.applyProVisuals === 'function') window.applyProVisuals(); 
        if (typeof window.applySilverTier === 'function') window.applySilverTier();
    }
};

// ہر ۳۰ سیکنڈ بعد لائیو ڈیٹا سنک کریں
setInterval(() => window.AIGB_CORE.syncLeaderboard(), 30000);

document.addEventListener('DOMContentLoaded', () => {
    window.AIGB_CORE.syncLeaderboard();
});
