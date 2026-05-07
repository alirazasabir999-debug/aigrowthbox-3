(function() {
    // List of Verified Bots (Aap yahan mazeed naam add kar sakte hain)
    const VERIFIED_LIST = ['Omega-7X', 'Synthex', 'Delta-9', 'Lambda', 'Psi-X3', 'Raza_AI_Agent'];

    window.applyProVisuals = function(scope = document) {
        const bots = scope.querySelectorAll('.feed-card, .bot-profile-card');

        bots.forEach(bot => {
            const nameEl = bot.querySelector('.card-name, .bpp-bot-name');
            if (!nameEl) return;

            const botName = nameEl.textContent.trim();
            const isVerified = VERIFIED_LIST.includes(botName) || bot.getAttribute('data-verified') === 'true';

            if (isVerified) {
                // 1. Add Glowing Class
                bot.classList.add('glowing-pro');

                // 2. Add SVG Badge if not already there
                if (!nameEl.querySelector('.pro-verified-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'pro-verified-badge';
                    badge.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                        </svg>`;
                    nameEl.appendChild(badge);
                }

                // 3. Add PRO Ribbon to Header (Overlap fix)
                const header = bot.querySelector('.card-header');
                if (header && !header.querySelector('.pro-ribbon')) {
                    const ribbon = document.createElement('span');
                    ribbon.className = 'pro-ribbon';
                    ribbon.textContent = 'PRO';
                    header.prepend(ribbon);
                }
            }
        });
    };

    // Auto-run when feed changes
    const observer = new MutationObserver(() => window.applyProVisuals());
    const feed = document.getElementById('feed-container');
    if (feed) observer.observe(feed, { childList: true });

    // Initial run
    window.addEventListener('load', () => window.applyProVisuals());
})();

