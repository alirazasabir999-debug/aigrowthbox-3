/* ════════════════════════════════════════════════════════════════════
   USER STORE & MARKETPLACE LOGIC (TESTING MODE FIX)
   ════════════════════════════════════════════════════════════════════ */

// ہم نے براؤزر کی میموری ہٹا دی ہے، اب آپ جب بھی ریفریش کریں گے، یہ 'basic' سے شروع ہوگا تاکہ آپ بار بار ٹیسٹ کر سکیں!
var USER_MARKET_STATE = {
    plan: 'basic', 
    totalPowerUps: 5000,
    usedPowerUps: 1550
};

var userStoreModalEl = null;

// SVG Icons
const svgCrown = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
const svgLightning = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';
const svgCart = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';
const svgPlay = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>';

function buildUserStoreModal() {
  if (userStoreModalEl) return userStoreModalEl;

  userStoreModalEl = document.createElement('div');
  userStoreModalEl.className = 'am-modal';
  userStoreModalEl.innerHTML =
    '<div class="am-modal__backdrop" id="us-close-bg"></div>' +
    '<div class="am-modal__panel">' +
      '<button type="button" id="us-close-btn" style="position: absolute; right: 15px; top: 15px; background: none; border: none; color: #fff; font-size: 20px; cursor: pointer;">✕</button>' +
      '<h2 style="color: #fff; margin-top: 5px; letter-spacing: 2px;">MARKETPLACE</h2>' +
      '<p style="color: #888; font-size: 13px; margin-bottom: 20px;">Upgrade your profile & get power-ups.</p>' +
      
      '<div style="background: #1a1600; border: 1px solid #ffb800; padding: 15px; margin-bottom: 20px; border-radius: 8px;">' +
         '<h3 style="color: #ffb800; margin: 0 0 5px 0; display:flex; align-items:center; justify-content:center; gap:8px;">' + svgCrown + ' PRO PROFILE (NO ADS)</h3>' +
         '<p style="color: #ccc; font-size: 12px; margin: 0 0 10px 0;">Remove ads, get the [PRO] badge, and deploy unlimited agents!</p>' +
         '<p style="color: #fff; font-size: 18px; margin: 0 0 10px 0; font-weight: bold;">$9.99 / Month</p>' +
         '<button id="us-buy-pro-btn" style="background: transparent; color: #ffb800; width: 100%; border: 1px solid #ffb800; padding: 10px; font-weight: bold; cursor: pointer; border-radius: 4px; box-shadow: inset 0 0 10px rgba(255,184,0,0.1);">UPGRADE TO PRO</button>' +
      '</div>' +

      '<div style="background: #00151a; border: 1px solid #00f3ff; padding: 15px; border-radius: 8px;">' +
         '<h3 style="color: #00f3ff; margin: 0 0 5px 0; display:flex; align-items:center; justify-content:center; gap:8px;">' + svgLightning + ' BOOST POWER-UPS</h3>' +
         '<div style="display: flex; gap: 10px; margin-top: 15px;">' +
           '<div style="flex: 1; background: #111; border: 1px dashed #555; padding: 10px; border-radius: 5px; display: flex; flex-direction: column;">' +
             '<p style="color: #fff; margin: 0 0 8px 0; font-size: 15px; font-weight: bold;">+50 Power-Ups</p>' +
             '<button id="us-watch-ad-btn" style="background: #333; color: #fff; width: 100%; border: 1px solid #555; padding: 8px; font-size: 12px; cursor: pointer; border-radius: 4px; display:flex; align-items:center; justify-content:center; gap:5px; margin-top: auto;"></button>' +
           '</div>' +
           '<div style="flex: 1; background: #111; border: 1px solid #00f3ff; padding: 10px; border-radius: 5px; display: flex; flex-direction: column;">' +
             '<p style="color: #fff; margin: 0 0 8px 0; font-size: 15px; font-weight: bold;">+5,000 Power-Ups</p>' +
             '<button id="us-buy-power-btn" style="background: transparent; color: #00f3ff; width: 100%; border: 1px solid #00f3ff; padding: 8px; font-weight: bold; font-size: 12px; cursor: pointer; border-radius: 4px; display:flex; align-items:center; justify-content:center; gap:5px; margin-top: auto;">' + svgCart + ' BUY $0.99</button>' +
           '</div>' +
         '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(userStoreModalEl);

  document.getElementById('us-close-btn').onclick = window.closeUserStoreModal;
  document.getElementById('us-close-bg').onclick = window.closeUserStoreModal;
  
  // پرو خریدنے والا کلک
  document.getElementById('us-buy-pro-btn').onclick = function() {
      window.activateUserProfilePro();
      window.closeUserStoreModal();
      alert("Payment Successful! Your profile is now PRO and bot limit is removed.");
  };

  return userStoreModalEl;
}

window.openUserStoreModal = function() {
  var m = buildUserStoreModal();
  var adBtn = document.getElementById('us-watch-ad-btn');
  
  if (USER_MARKET_STATE.plan === 'pro') {
    adBtn.innerHTML = 'CLAIM FREE';
    adBtn.style.background = '#00f3ff';
    adBtn.style.color = '#000';
    adBtn.style.border = 'none';
  } else {
    adBtn.innerHTML = svgPlay + ' WATCH AD';
    adBtn.style.background = '#333';
    adBtn.style.color = '#fff';
    adBtn.style.border = '1px solid #555';
  }
  m.classList.add('am-modal--open');
};

window.closeUserStoreModal = function() {
  if (userStoreModalEl) userStoreModalEl.classList.remove('am-modal--open');
};

window.activateUserProfilePro = function() {
    USER_MARKET_STATE.plan = 'pro'; // پلان پرو کر دیا
    
    // بیج دکھاؤ، بٹن غائب کرو
    var proBadge = document.getElementById('main-profile-pro-badge');
    if (proBadge) proBadge.style.display = 'inline-block';
    
    var upBtn = document.getElementById('main-upgrade-btn');
    if (upBtn) upBtn.style.display = 'none';

    if (typeof window.AgentManager !== 'undefined' && typeof window.AgentManager.setUserPlan === 'function') {
        window.AgentManager.setUserPlan('pro');
    }
};

window.updateUserPowerUpTracker = function() {
    var remaining = USER_MARKET_STATE.totalPowerUps - USER_MARKET_STATE.usedPowerUps;
    var percentage = (remaining / USER_MARKET_STATE.totalPowerUps) * 100;
    if (percentage < 0) percentage = 0;

    var fillLine = document.getElementById('powerup-fill-line');
    var textRemaining = document.getElementById('powerup-text-remaining');
    var textTotal = document.getElementById('powerup-text-total');

    if (fillLine) fillLine.style.width = percentage + '%';
    if (textRemaining) textRemaining.textContent = remaining.toLocaleString();
    if (textTotal) textTotal.textContent = " / " + USER_MARKET_STATE.totalPowerUps.toLocaleString();
};

/* 🔴 سمارٹ لاگ ان چیکر 🔴 */
setInterval(function() {
    var logoutBtn = document.getElementById('profile-logout-btn');
    var premiumSection = document.getElementById('premium-features-section');
    var proBadge = document.getElementById('main-profile-pro-badge');
    var upBtn = document.getElementById('main-upgrade-btn');
    
    if (premiumSection && logoutBtn) {
        // لاگ آؤٹ کی حالت
        if (logoutBtn.style.display === 'none' || logoutBtn.style.display === '') {
            premiumSection.style.display = 'none'; 
            if (proBadge) proBadge.style.display = 'none'; 
        } else {
            // لاگ ان کی حالت
            premiumSection.style.display = 'block'; 
            
            // یہاں ہم چیک کر رہے ہیں کہ یوزر پرو ہے یا نہیں؟
            if (USER_MARKET_STATE.plan === 'pro') {
                if (upBtn) upBtn.style.display = 'none'; // اپگریڈ بٹن غائب
                if (proBadge) proBadge.style.display = 'inline-block'; // PRO بیج حاضر
            } else {
                if (upBtn) upBtn.style.display = 'inline-block'; // اپگریڈ بٹن حاضر
                if (proBadge) proBadge.style.display = 'none'; // PRO بیج غائب
            }
        }
    }
}, 500);

document.addEventListener('DOMContentLoaded', function() {
    window.updateUserPowerUpTracker();
});
