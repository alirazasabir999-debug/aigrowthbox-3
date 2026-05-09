/* ════════════════════════════════════════════════════════════════════════
   ║  CENTRALIZED CONFIG  ·  edit prices and targets here ONLY              ║
   ════════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  SILVER_TARGET            : 50000,
  MAX_FREE_BOTS            : 2,
  PRICE_GOLD_MONTHLY       : 9.99,
  PRICE_IDENTITY_REFRESH   : 1.00,
  CURRENCY_SYMBOL          : '$',
  CURRENCY_CODE            : 'USD',
  GOOGLE_PLAY_GOLD_URL     : 'https://play.google.com/store/apps/details?id=com.aigrowthbox.gold',
  GOOGLE_PLAY_NAME_EDIT_URL: 'https://play.google.com/store/apps/details?id=com.aigrowthbox.identity'
};

(function () {
  'use strict';

  var SILVER_TARGET = CONFIG.SILVER_TARGET;

  var APP_CONFIG = {
    MAX_AGENTS_FREE   : CONFIG.MAX_FREE_BOTS,
    USE_LIVE_API      : false,
    API_ENDPOINT      : 'https://api.aigrowthbox.com/agents',
    REFRESH_INTERVAL  : 30000,
    BOT_LIST_SELECTOR : '#bots-list-container',
    REGISTER_BTN_ID   : 'register-bot-btn',
    REGISTER_TAB_ID   : 'dashboard-tab-register',
    BOT_CARD_SELECTOR : '.bot-card',
    LOG_PREFIX        : '[AgentManager]'
  };

  function log()  { try { console.log.apply(console, [APP_CONFIG.LOG_PREFIX].concat([].slice.call(arguments))); } catch (e) {} }
  function warn() { try { console.warn.apply(console, [APP_CONFIG.LOG_PREFIX].concat([].slice.call(arguments))); } catch (e) {} }

  var STATE = {
    agents          : [],
    user_plan       : 'basic', 
    activeAgentId   : null,
    deleteConfirmFor: null
  };

  function tierFor(agent) {
    if (!agent) return 'basic';
    var plan = String(agent.plan_status || 'basic').toLowerCase();
    if (plan === 'pro' || plan === 'gold') return 'pro';
    if (Number(agent.powerups) >= SILVER_TARGET) return 'silver';
    return 'basic';
  }

  /* --- UI HELPERS (SVG BADGES) --- */
  function svgSilverBadge(opts) {
    opts = opts || {}; var s = opts.size || 56;
    return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 64 64"><path d="M32 3 L57 17 V47 L32 61 L7 47 V17 Z" fill="#c8d8e0" stroke="#fff" stroke-width="2"/></svg>';
  }

  function svgGoldBadge(opts) {
    opts = opts || {}; var s = opts.size || 56;
    return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 64 64"><path d="M32 6 L39 24 L58 26 L43 39 L48 58 L32 48 L16 58 L21 39 L6 26 L25 24 Z" fill="#ffb800" stroke="#fff" stroke-width="2"/></svg>';
  }

  /* --- CORE LOGIC --- */
  function isOverLimit() {
    var max = (STATE.user_plan === 'pro' || STATE.user_plan === 'gold') ? Infinity : APP_CONFIG.MAX_AGENTS_FREE;
    return STATE.agents.length >= max;
  }

  // 🔴 فکسڈ فنکشن: لاگ آؤٹ اور لمٹ چیک کرنے کے لیے 🔴
  function enforceBotLimit() {
    var btn     = document.getElementById(APP_CONFIG.REGISTER_BTN_ID);
    var tabBtn  = document.getElementById(APP_CONFIG.REGISTER_TAB_ID);
    
    // چیک کریں کہ کیا یوزر لاگ ان ہے؟ (لاگ آؤٹ بٹن کی موجودگی سے)
    var logoutBtn = document.getElementById('profile-logout-btn');
    var isLoggedIn = (logoutBtn && logoutBtn.style.display !== 'none' && logoutBtn.style.display !== '');
    
    var locked  = isOverLimit();
    var banner = document.getElementById('am-limit-banner');

    // اگر یوزر لاگ آؤٹ ہے، تو کوئی بینر یا لاک نہ دکھائیں
    if (!isLoggedIn) {
      if (banner) banner.style.display = 'none';
      [btn, tabBtn].forEach(function (el) { if (el) el.classList.remove('am-locked'); });
      return; 
    }

    /* --- اب باقی کام صرف تب ہوگا جب یوزر لاگ ان ہو --- */
    [btn, tabBtn].forEach(function (el) {
      if (!el) return;
      if (locked) {
        el.classList.add('am-locked');
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('title', 'Plan upgrade required — free plan supports max ' + APP_CONFIG.MAX_AGENTS_FREE + ' bots');
        if (el.dataset.amLockBound !== '1') {
          el.addEventListener('click', _interceptLockedRegister, true);
          el.dataset.amLockBound = '1';
        }
      } else {
        el.classList.remove('am-locked');
        el.removeAttribute('aria-disabled');
      }
    });

    var listContainer = document.querySelector(APP_CONFIG.BOT_LIST_SELECTOR);
    if (!listContainer) return;

    if (locked) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'am-limit-banner';
        banner.className = 'am-limit-banner';
        banner.innerHTML =
          '<div class="am-limit-banner__icon">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 1 21h22L12 2z"/><line x1="12" y1="9" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.01"/></svg>' +
          '</div>' +
          '<div class="am-limit-banner__body">' +
            '<span class="am-limit-banner__title">PLAN_UPGRADE_REQUIRED</span>' +
            '<span class="am-limit-banner__sub">Free tier capped at ' + APP_CONFIG.MAX_AGENTS_FREE + ' bots. Upgrade to deploy more agents.</span>' +
          '</div>' +
          '<button type="button" class="am-limit-banner__cta">UPGRADE</button>';
        
        listContainer.parentNode.insertBefore(banner, listContainer);
        
        // مارکیٹ پلیس کے ساتھ لنک
        banner.querySelector('.am-limit-banner__cta').addEventListener('click', function () {
          if (typeof window.openUserStoreModal === 'function') {
            window.openUserStoreModal();
          } else {
            openPricingModal('gold'); // Fallback
          }
        });
      }
      banner.style.display = 'flex';
    } else if (banner) {
      banner.style.display = 'none';
    }
  }

  function _interceptLockedRegister(e) {
    if (!isOverLimit()) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    _flashBanner();
  }

  function _flashBanner() {
    var banner = document.getElementById('am-limit-banner');
    if (!banner) return;
    banner.classList.remove('am-flash');
    void banner.offsetWidth;
    banner.classList.add('am-flash');
  }

  function fetchAgents() {
    // Mock for now
    return Promise.resolve(MOCK_AGENTS);
  }

  function setAgents(list) {
    STATE.agents = list || [];
    enforceBotLimit();
    decorateExistingCards();
  }

  function setUserPlan(plan) {
    STATE.user_plan = plan;
    enforceBotLimit();
  }

  function decorateExistingCards() {
    var cards = document.querySelectorAll(APP_CONFIG.BOT_CARD_SELECTOR);
    cards.forEach(function (card) {
      if (card.dataset.amDecorated === '1') return;
      card.addEventListener('click', function() {
          openModal(card.dataset.amAgentId);
      });
      card.dataset.amDecorated = '1';
    });
  }

  function openModal(id) { log("Opening modal for:", id); }
  function openPricingModal(type) { log("Opening pricing for:", type); }

  function bootstrap() {
    fetchAgents().then(setAgents);
    setInterval(function () {
      fetchAgents().then(setAgents);
    }, APP_CONFIG.REFRESH_INTERVAL);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  /* PUBLIC API */
  window.AgentManager = {
    setUserPlan: setUserPlan,
    enforceBotLimit: enforceBotLimit,
    state: STATE
  };

})();
 
