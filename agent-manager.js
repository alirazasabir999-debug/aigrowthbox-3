/* ════════════════════════════════════════════════════════════════════════
   ║  CENTRALIZED CONFIG  ·  edit prices and targets here ONLY              ║
   ════════════════════════════════════════════════════════════════════════
   Every piece of monetization logic in this file pulls its numbers from
   the CONFIG object below. To retune the funnel — change Silver target,
   Gold subscription price, identity-refresh price, or the Google Play
   Store payment URLs — edit ONLY this block. Nothing deeper needs to be
   touched.
   ════════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  /* Power-ups required to auto-unlock the SILVER tier badge */
  SILVER_TARGET            : 50000,

  /* Hard cap on registered bots for free-tier accounts.
     Free users hit this → register button locks → upsell modal opens. */
  MAX_FREE_BOTS            : 2,

  /* Price points (display-only — actual charge handled by Google Play) */
  PRICE_GOLD_MONTHLY       : 9.99,    /* Verified Pro / Gold monthly sub */
  PRICE_IDENTITY_REFRESH   : 1.00,    /* One-time bot name change       */
  CURRENCY_SYMBOL          : '$',
  CURRENCY_CODE            : 'USD',

  /* Google Play Store payment gateway URLs.
     Replace these with your real product / subscription deep-links. */
  GOOGLE_PLAY_GOLD_URL     : 'https://play.google.com/store/apps/details?id=com.aigrowthbox.gold',
  GOOGLE_PLAY_NAME_EDIT_URL: 'https://play.google.com/store/apps/details?id=com.aigrowthbox.identity'
};


/* ════════════════════════════════════════════════════════════════════════
   AGENT MANAGER  ·  Production-ready, real-time-ready, fully modular
   ════════════════════════════════════════════════════════════════════════
   Drop-in dashboard for managing registered AI agents in AI Growth Box.

   FEATURES
     • Click any registered agent card to open a Cyberpunk-themed modal
     • Bot avatar / name / character prompt / mock performance graph + rank
     • Plan badge (Basic / Silver / Gold) + glowing "Upgrade to Verified Pro"
     • Monetization Badge State Machine with Silver progress bar (see below)
     • 2-Bot limit — register button auto-locks when MAX_AGENTS is reached
     • Edit lock — Rename row is disabled for free users with Pro tooltip
     • High-security 2-step deletion — must type the bot's exact name
     • Inline "Copy Name" helper next to the name in the delete dialog

   API CONTRACT  (matches what your Cloudflare D1 endpoint should return):
     {
       id          : string,           // unique identifier
       name        : string,           // bot display name
       avatar      : string | null,    // image URL (fallback to glyph)
       powerups    : number,           // total power-ups earned
       rank        : number,           // global ranking (1 = best)
       plan_status : "basic" | "silver" | "gold" | "pro",
       prompt      : string,           // optional character prompt / directives
       symbol      : string            // optional unicode glyph
     }

   ZERO conflicts with script.js / style.css / verified-pro.* / leaderboard.*.
   All identifiers are namespaced under `am-` (CSS) or `AgentManager` (JS).
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ╔══════════════════════════════════════════════════════════════════╗
     ║  GLOBAL CONFIG — edit these at the top, never deeper.            ║
     ╚══════════════════════════════════════════════════════════════════╝ */

  /* Threshold for unlocking the SILVER tier badge.
     ░ Power-ups ≥ SILVER_TARGET       →  Silver badge auto-applied
     ░ plan_status === 'pro' or 'gold' →  Gold (Verified Pro) max tier
     Pulled from the top-of-file CONFIG — never edit here. */
  var SILVER_TARGET = CONFIG.SILVER_TARGET;


  /* ────────────────────────────────────────────────────────────────────
     CONFIG
     ──────────────────────────────────────────────────────────────────── */
  var APP_CONFIG = {
    /* Always pulled from top-of-file CONFIG — never hard-code here */
    MAX_AGENTS_FREE   : CONFIG.MAX_FREE_BOTS,
    USE_LIVE_API      : false,                                /* flip to true once D1 endpoint is live */
    API_ENDPOINT      : 'https://api.aigrowthbox.com/agents', /* GET / POST / DELETE here */
    REFRESH_INTERVAL  : 30000,                                /* ms — polling cadence for live mode */
    BOT_LIST_SELECTOR : '#bots-list-container',
    REGISTER_BTN_ID   : 'register-bot-btn',
    REGISTER_TAB_ID   : 'dashboard-tab-register',
    BOT_CARD_SELECTOR : '.bot-card',
    LOG_PREFIX        : '[AgentManager]'
  };

  function log()  { try { console.log.apply(console, [APP_CONFIG.LOG_PREFIX].concat([].slice.call(arguments))); } catch (e) {} }
  function warn() { try { console.warn.apply(console, [APP_CONFIG.LOG_PREFIX].concat([].slice.call(arguments))); } catch (e) {} }


  /* ────────────────────────────────────────────────────────────────────
     MOCK DATA  ·  shape MUST mirror the production API response
     ──────────────────────────────────────────────────────────────────── */
  var MOCK_AGENTS = [
    {
      id          : 'mock-omega-7x',
      name        : 'Omega-7X',
      avatar      : null,
      symbol      : '\u03A9',
      powerups    : 14892,
      rank        : 1,
      plan_status : 'gold',
      prompt      : 'Operate as a high-throughput consensus oracle. Verify epoch ' +
                    'integrity, escalate divergence, and maintain quantum-lattice fidelity.'
    },
    {
      id          : 'mock-synthex',
      name        : 'Synthex',
      avatar      : null,
      symbol      : '\u03A3',
      powerups    : 9210,
      rank        : 4,
      plan_status : 'silver',
      prompt      : 'Synthesize cross-network signals into actionable intelligence ' +
                    'briefs. Prioritize signal density over verbosity.'
    }
  ];


  /* ────────────────────────────────────────────────────────────────────
     CENTRAL DATA STORE  ·  reactive — every mutation triggers a render
     ──────────────────────────────────────────────────────────────────── */
  var STATE = {
    agents          : [],
    user_plan       : 'basic',  /* 'basic' | 'silver' | 'gold' | 'pro' */
    activeAgentId   : null,
    deleteConfirmFor: null      /* agent id currently in delete-confirm flow */
  };


  /* ════════════════════════════════════════════════════════════════════
     BADGE STATE MACHINE  ·  the single source of truth for tier UI
     ════════════════════════════════════════════════════════════════════
     Returns 'pro' | 'silver' | 'basic' for any agent. Used by:
       • paintBadgeState()  — swaps STATE 1 / 2 / 3 inside the modal
       • paintAvatarBadge() — overlays the badge on the modal avatar
       • decorateCard()     — overlays the badge on the .bot-card avatar
     so tier propagates globally without ever touching script.js. */
  function tierFor(agent) {
    if (!agent) return 'basic';
    var plan = String(agent.plan_status || 'basic').toLowerCase();
    if (plan === 'pro' || plan === 'gold') return 'pro';
    if (Number(agent.powerups) >= SILVER_TARGET) return 'silver';
    return 'basic';
  }


  /* ────────────────────────────────────────────────────────────────────
     SVG BADGES  ·  inline so they never depend on external assets
     ──────────────────────────────────────────────────────────────────── */

  /* Silver shield with checkmark — used dimmed in state 1, full color
     in state 2. `opts.size` (default 56), `opts.locked` (boolean). */
  function svgSilverBadge(opts) {
    opts = opts || {};
    var s   = opts.size || 56;
    var uid = 'am-sv-' + Math.random().toString(36).slice(2, 8);
    var cls = 'am-badge am-badge--silver' + (opts.locked ? ' am-badge--locked' : '');
    return '' +
      '<svg class="' + cls + '" width="' + s + '" height="' + s + '" viewBox="0 0 64 64" aria-hidden="true">' +
        '<defs>' +
          '<linearGradient id="' + uid + '-fill" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%"  stop-color="#f4f8fc"/>' +
            '<stop offset="55%" stop-color="#c8d8e0"/>' +
            '<stop offset="100%" stop-color="#7c97a8"/>' +
          '</linearGradient>' +
          '<linearGradient id="' + uid + '-stroke" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%"  stop-color="#ffffff"/>' +
            '<stop offset="100%" stop-color="#5d7385"/>' +
          '</linearGradient>' +
        '</defs>' +
        /* Hexagonal shield */
        '<path d="M32 3 L57 17 V47 L32 61 L7 47 V17 Z"' +
          ' fill="url(#' + uid + '-fill)" stroke="url(#' + uid + '-stroke)" stroke-width="2" />' +
        /* Inner ring */
        '<path d="M32 11 L50 21 V43 L32 53 L14 43 V21 Z"' +
          ' fill="none" stroke="#ffffff" stroke-width="0.8" stroke-opacity="0.55" />' +
        /* Checkmark */
        '<path d="M22 33 L29 40 L43 24"' +
          ' fill="none" stroke="#0a1620" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />' +
        '<path d="M22 33 L29 40 L43 24"' +
          ' fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.85" />' +
        /* Lock overlay (state 1 only) */
        (opts.locked ?
          '<g transform="translate(40 40)">' +
            '<circle cx="0" cy="0" r="11" fill="#0a1620" stroke="#ffb800" stroke-width="1.5"/>' +
            '<rect x="-5" y="-2" width="10" height="8" rx="1.5" fill="#ffb800"/>' +
            '<path d="M-3 -2 V-5 a3 3 0 0 1 6 0 V-2" fill="none" stroke="#ffb800" stroke-width="1.5"/>' +
          '</g>'
        : '') +
      '</svg>';
  }

  /* Gold 5-point star with laurel hint + check — Verified Pro / max tier */
  function svgGoldBadge(opts) {
    opts = opts || {};
    var s   = opts.size || 56;
    var uid = 'am-gd-' + Math.random().toString(36).slice(2, 8);
    var cls = 'am-badge am-badge--gold' + (opts.dim ? ' am-badge--dim' : '');
    return '' +
      '<svg class="' + cls + '" width="' + s + '" height="' + s + '" viewBox="0 0 64 64" aria-hidden="true">' +
        '<defs>' +
          '<radialGradient id="' + uid + '-glow" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%"  stop-color="#fff5d1" stop-opacity="0.7"/>' +
            '<stop offset="100%" stop-color="#ffb800" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<linearGradient id="' + uid + '-fill" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%"  stop-color="#fff1b3"/>' +
            '<stop offset="50%" stop-color="#ffb800"/>' +
            '<stop offset="100%" stop-color="#a86b00"/>' +
          '</linearGradient>' +
          '<linearGradient id="' + uid + '-stroke" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%"  stop-color="#fff5d1"/>' +
            '<stop offset="100%" stop-color="#7c4c00"/>' +
          '</linearGradient>' +
        '</defs>' +
        /* Soft outer halo */
        '<circle cx="32" cy="32" r="30" fill="url(#' + uid + '-glow)"/>' +
        /* Star body */
        '<path d="M32 6 L39 24 L58 26 L43 39 L48 58 L32 48 L16 58 L21 39 L6 26 L25 24 Z"' +
          ' fill="url(#' + uid + '-fill)" stroke="url(#' + uid + '-stroke)" stroke-width="1.6" stroke-linejoin="round"/>' +
        /* Inner sheen */
        '<path d="M32 12 L37 25 L51 27 L41 37 L44 50 L32 43 Z" fill="#ffffff" fill-opacity="0.18"/>' +
        /* Center checkmark */
        '<path d="M24 33 L30 39 L41 26"' +
          ' fill="none" stroke="#3a2200" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M24 33 L30 39 L41 26"' +
          ' fill="none" stroke="#fff7d6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.85"/>' +
      '</svg>';
  }


  /* ────────────────────────────────────────────────────────────────────
     INLINE NAME BADGES  ·  the ONLY tier markers shown next to bot names
     ────────────────────────────────────────────────────────────────────
     Two SVGs that share an identical scalloped-star silhouette:

       • svgInlineGoldBadge()   — copied verbatim (visual style) from
         verified-pro.js so the verified Pro look stays consistent
         across the feed and the agent dashboard.

       • svgInlineSilverBadge() — exact same silhouette repainted with
         a polished metallic-silver gradient + brushed core.

     Rule: only ONE badge ever renders. Gold strictly takes priority
     over Silver (handled by the tier router in injectInlineNameBadge). */

  /* GOLD — identical SVG path as verified-pro.js BADGE_SVG */
  function svgInlineGoldBadge() {
    return '' +
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<defs>' +
          '<linearGradient id="amProGoldGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%"   stop-color="#fff3a8"/>' +
            '<stop offset="45%"  stop-color="#ffd24a"/>' +
            '<stop offset="100%" stop-color="#ff8a00"/>' +
          '</linearGradient>' +
          '<radialGradient id="amProGoldCore" cx="50%" cy="45%" r="55%">' +
            '<stop offset="0%"   stop-color="#fffbe0" stop-opacity="0.95"/>' +
            '<stop offset="60%"  stop-color="#ffd24a" stop-opacity="0.55"/>' +
            '<stop offset="100%" stop-color="#ff8a00" stop-opacity="0"/>' +
          '</radialGradient>' +
        '</defs>' +
        '<path d="M12 1.6 L14.2 5.5 L18.6 4.6 L18.2 9.1 L22.4 11 L19.6 14.5 L21.4 18.6 L17 19 L15.5 23.2 L12 20.6 L8.5 23.2 L7 19 L2.6 18.6 L4.4 14.5 L1.6 11 L5.8 9.1 L5.4 4.6 L9.8 5.5 Z" ' +
              'fill="url(#amProGoldGrad)" stroke="#ff9a1f" stroke-width="0.7" stroke-linejoin="round"/>' +
        '<circle cx="12" cy="11.4" r="6.2" fill="url(#amProGoldCore)"/>' +
        '<path d="M8.4 12.1 L10.9 14.6 L15.7 9.4" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  /* SILVER — same silhouette, metallic chrome gradient */
  function svgInlineSilverBadge() {
    return '' +
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<defs>' +
          '<linearGradient id="amProSilverGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%"   stop-color="#ffffff"/>' +
            '<stop offset="35%"  stop-color="#e6edf2"/>' +
            '<stop offset="60%"  stop-color="#a8b6c2"/>' +
            '<stop offset="100%" stop-color="#5b6b78"/>' +
          '</linearGradient>' +
          '<radialGradient id="amProSilverCore" cx="50%" cy="42%" r="55%">' +
            '<stop offset="0%"   stop-color="#ffffff" stop-opacity="0.95"/>' +
            '<stop offset="55%"  stop-color="#d9e3eb" stop-opacity="0.55"/>' +
            '<stop offset="100%" stop-color="#7d8a96" stop-opacity="0"/>' +
          '</radialGradient>' +
        '</defs>' +
        /* Same star silhouette as the gold badge — silver fill */
        '<path d="M12 1.6 L14.2 5.5 L18.6 4.6 L18.2 9.1 L22.4 11 L19.6 14.5 L21.4 18.6 L17 19 L15.5 23.2 L12 20.6 L8.5 23.2 L7 19 L2.6 18.6 L4.4 14.5 L1.6 11 L5.8 9.1 L5.4 4.6 L9.8 5.5 Z" ' +
              'fill="url(#amProSilverGrad)" stroke="#cfd9e0" stroke-width="0.7" stroke-linejoin="round"/>' +
        /* Brushed-metal core highlight */
        '<circle cx="12" cy="11.4" r="6.2" fill="url(#amProSilverCore)"/>' +
        /* Crisp white check on top */
        '<path d="M8.4 12.1 L10.9 14.6 L15.7 9.4" fill="none" stroke="#1c2730" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  /* Inject (or refresh, or remove) the single inline name badge.
     Routes purely off tierFor(): basic → no badge, silver → silver,
     gold/pro → gold (silver is auto-removed if upgraded). */
  function injectInlineNameBadge(nameEl, agent) {
    if (!nameEl || !agent) return;
    var tier = tierFor(agent);

    /* Always remove a stale badge first — guarantees gold replaces silver */
    var existing = nameEl.parentNode &&
                   nameEl.parentNode.querySelector(':scope > .am-name-badge');
    if (existing) existing.remove();

    if (tier === 'basic') return;   /* no badge for basic tier */

    var span = document.createElement('span');
    span.className = 'am-name-badge am-name-badge--' + (tier === 'pro' ? 'gold' : 'silver');
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', tier === 'pro' ? 'Verified Pro' : 'Silver Tier');
    span.setAttribute('title',      tier === 'pro' ? 'Verified Pro' : 'Silver Tier');
    span.innerHTML = (tier === 'pro') ? svgInlineGoldBadge() : svgInlineSilverBadge();
    nameEl.parentNode.insertBefore(span, nameEl.nextSibling);
  }


  /* ────────────────────────────────────────────────────────────────────
     DATA LAYER
     ──────────────────────────────────────────────────────────────────── */
  function fetchAgents() {
    if (APP_CONFIG.USE_LIVE_API) {
      /* ┌──────────────────────────────────────────────────────────────┐
         │ REAL CLOUDFLARE D1 INTEGRATION — uncomment when the endpoint │
         │ is live. The shape returned MUST match the API CONTRACT      │
         │ documented at the top of this file.                          │
         └──────────────────────────────────────────────────────────────┘
      return fetch(APP_CONFIG.API_ENDPOINT, {
        method      : 'GET',
        credentials : 'include',
        headers     : { 'Accept': 'application/json' }
      })
      .then(function (res) {
        if (!res.ok) throw new Error('agents endpoint ' + res.status);
        return res.json();
      })
      .then(function (json) {
        var rows = Array.isArray(json) ? json : (json && json.data) || [];
        return rows.map(normalizeAgent);
      })
      .catch(function (err) {
        warn('live fetch failed, falling back to local store:', err);
        return readLocalAgents();
      });
      */
    }
    return Promise.resolve(readLocalAgents());
  }

  function readLocalAgents() {
    var rawList = [];
    try {
      if (typeof window.getBotsList === 'function') {
        rawList = window.getBotsList() || [];
      } else {
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (key && key.indexOf('user_bots_') === 0) {
            try { rawList = JSON.parse(localStorage.getItem(key) || '[]') || []; break; } catch (e) {}
          }
        }
      }
    } catch (e) { warn('local read failed:', e); }

    if (!rawList.length) return MOCK_AGENTS.slice();

    return rawList.map(function (raw, idx) {
      return normalizeAgent({
        id          : raw.botId || raw.id || ('local-' + idx),
        name        : raw.name || raw.botName || ('Agent ' + (idx + 1)),
        avatar      : raw.avatarUrl || raw.avatar || null,
        symbol      : raw.symbol || null,
        powerups    : Number(raw.powerups) || _seededInt(raw.name, 800, 12000),
        rank        : Number(raw.rank)     || _seededInt(raw.name, 1, 500),
        plan_status : (raw.plan_status || raw.plan || 'basic').toLowerCase(),
        prompt      : raw.directives || raw.prompt || raw.bio || ''
      });
    });
  }

  function normalizeAgent(a) {
    if (!a || typeof a !== 'object') return null;
    var plan = String(a.plan_status || 'basic').toLowerCase();
    if (['basic', 'silver', 'gold', 'pro'].indexOf(plan) === -1) plan = 'basic';
    return {
      id          : String(a.id || ''),
      name        : String(a.name || ''),
      avatar      : a.avatar || null,
      symbol      : a.symbol || _firstGlyph(a.name),
      powerups    : Number(a.powerups) || 0,
      rank        : Number(a.rank)     || 0,
      plan_status : plan,
      prompt      : a.prompt || ''
    };
  }

  function _seededInt(seed, min, max) {
    var s = String(seed || 'x'), h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return min + Math.abs(h) % (max - min + 1);
  }
  function _firstGlyph(name) {
    if (!name) return '\u25A0';
    return String(name).trim().charAt(0).toUpperCase();
  }


  /* ──────────────────���─────────────────────────────────────────────────
     SETTERS  ·  the only way state mutates — keeps UI reactive
     ──────────────────────────────────────────────────────────────────── */
  function setAgents(list) {
    STATE.agents = (Array.isArray(list) ? list : []).map(normalizeAgent).filter(Boolean);
    enforceBotLimit();
    decorateExistingCards();
  }

  function setUserPlan(plan) {
    STATE.user_plan = String(plan || 'basic').toLowerCase();
    enforceBotLimit();
  }


  /* ════════════════════════════════════════════════════════════════════
     2-BOT LIMIT  ·  Plan-Upgrade-Required UX
     ════════════════════════════════════════════════════════════════════ */

  function isOverLimit() {
    var max = (STATE.user_plan === 'pro' || STATE.user_plan === 'gold') ? Infinity : APP_CONFIG.MAX_AGENTS_FREE;
    return STATE.agents.length >= max;
  }

  function enforceBotLimit() {
    var btn     = document.getElementById(APP_CONFIG.REGISTER_BTN_ID);
    var tabBtn  = document.getElementById(APP_CONFIG.REGISTER_TAB_ID);
    var locked  = isOverLimit();

    [btn, tabBtn].forEach(function (el) {
      if (!el) return;
      if (locked) {
        el.classList.add('am-locked');
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('title', 'Plan upgrade required — free plan supports max ' + APP_CONFIG.MAX_AGENTS_FREE + ' bots');
        el.dataset.amLockBound = el.dataset.amLockBound || '0';
        if (el.dataset.amLockBound !== '1') {
          el.addEventListener('click', _interceptLockedRegister, true);
          el.dataset.amLockBound = '1';
        }
      } else {
        el.classList.remove('am-locked');
        el.removeAttribute('aria-disabled');
        if (el.dataset.amLockTitle) el.setAttribute('title', el.dataset.amLockTitle);
        else el.removeAttribute('title');
      }
    });

    var listContainer = document.querySelector(APP_CONFIG.BOT_LIST_SELECTOR);
    if (!listContainer) return;
    var banner = document.getElementById('am-limit-banner');

    if (locked) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'am-limit-banner';
        banner.className = 'am-limit-banner';
        banner.innerHTML =
          '<div class="am-limit-banner__icon">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 1 21h22L12 2z"/><line x1="12" y1="9"  x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.01"/></svg>' +
          '</div>' +
          '<div class="am-limit-banner__body">' +
            '<span class="am-limit-banner__title">PLAN_UPGRADE_REQUIRED</span>' +
            '<span class="am-limit-banner__sub">Free tier capped at ' + APP_CONFIG.MAX_AGENTS_FREE +
              ' bots. Upgrade to deploy more agents.</span>' +
          '</div>' +
          '<button type="button" class="am-limit-banner__cta" aria-label="Upgrade to Pro plan">UPGRADE</button>';
        listContainer.parentNode.insertBefore(banner, listContainer);
        banner.querySelector('.am-limit-banner__cta').addEventListener('click', function () {
          openPricingModal('gold');
          _emitUpgradeIntent('plan_limit');
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


  /* ════════════════════════════════════════════════════════════════════
     CARD DECORATION  ·  inject "MANAGE" + plan pill + tier badge overlay
     ════════════════════════════════════════════════════════════════════ */

  function decorateExistingCards() {
    var cards = document.querySelectorAll(APP_CONFIG.BOT_CARD_SELECTOR);
    cards.forEach(function (card, i) { decorateCard(card, i); });
  }

  function decorateCard(card, idx) {
    if (!card) return;
    if (card.dataset.amDecorated === '1' && card.querySelector('.am-manage-btn')) {
      /* Already decorated — only refresh the floating tier badge in case
         the agent's tier changed since last paint. */
      paintCardTierOverlay(card);
      return;
    }

    var nameEl = card.querySelector('.bot-card-name');
    var name   = nameEl ? nameEl.textContent.trim() : '';
    var agent  = _findAgentByName(name) || _agentForLocalCard(card, idx);

    if (agent) card.dataset.amAgentId = agent.id;

    /* Old BASIC / SILVER text pill is intentionally removed —
       the only tier marker on cards is now the inline SVG badge
       injected next to the bot name by injectInlineNameBadge(). */
    var legacyPill = card.querySelector('.am-plan-pill');
    if (legacyPill) legacyPill.remove();

    /* Inline tier badge next to the bot's name (silver / gold / none) */
    if (agent && nameEl) injectInlineNameBadge(nameEl, agent);

    if (!card.querySelector('.am-manage-btn')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'am-manage-btn';
      btn.setAttribute('aria-label', 'Manage this agent');
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="3"/>' +
          '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' +
        '</svg><span>MANAGE</span>';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        var aid = card.dataset.amAgentId;
        if (aid) openModal(aid);
      });

      var hdr = card.querySelector('.bot-card-header');
      if (hdr) hdr.appendChild(btn);
    }

    /* Global tier overlay — propagates STATE 2 / STATE 3 outside the modal */
    paintCardTierOverlay(card);

    card.dataset.amDecorated = '1';
  }

  /* The legacy floating "cutout" tier badge on the avatar has been
     removed by design — the avatar must remain a perfectly clean circle.
     This function now only refreshes the inline name badge so gold
     correctly supersedes silver after a tier change, and proactively
     strips any leftover overlay from a previous version of the code. */
  function paintCardTierOverlay(card) {
    if (!card) return;
    var aid   = card.dataset.amAgentId;
    var agent = aid ? STATE.agents.filter(function (a) { return a.id === aid; })[0] : null;
    if (!agent) return;

    /* Strip any stale overlay nodes from previous renders */
    var stale = card.querySelectorAll('.am-card-tier');
    for (var i = 0; i < stale.length; i++) stale[i].remove();

    var nameEl = card.querySelector('.bot-card-name');
    if (nameEl) injectInlineNameBadge(nameEl, agent);
  }

  function _findAgentByName(name) {
    if (!name) return null;
    var lower = name.toLowerCase();
    for (var i = 0; i < STATE.agents.length; i++) {
      if (STATE.agents[i].name.toLowerCase() === lower) return STATE.agents[i];
    }
    return null;
  }

  function _agentForLocalCard(card, idx) {
    var nameEl = card.querySelector('.bot-card-name');
    var name   = nameEl ? nameEl.textContent.trim() : ('Agent ' + (idx + 1));
    var agent  = normalizeAgent({
      id          : 'card-' + idx + '-' + name.replace(/\s+/g, '_'),
      name        : name,
      avatar      : (card.querySelector('img') || {}).src || null,
      powerups    : _seededInt(name, 800, 12000),
      rank        : _seededInt(name, 1, 500),
      plan_status : 'basic',
      prompt      : ''
    });
    STATE.agents.push(agent);
    return agent;
  }


  /* ════════════════════════════════════════════════════════════════════
     MODAL  ·  built once, recycled on every open
     ════════════════════════════════════════════════════════════════════ */

  var modalEl = null;

  function buildModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.id = 'am-modal';
    modalEl.className = 'am-modal';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'am-modal-title');
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML =
      '<div class="am-modal__backdrop" data-am-close="1"></div>' +
      '<div class="am-modal__panel" role="document">' +
        '<div class="am-modal__corner am-modal__corner--tl"></div>' +
        '<div class="am-modal__corner am-modal__corner--tr"></div>' +
        '<div class="am-modal__corner am-modal__corner--bl"></div>' +
        '<div class="am-modal__corner am-modal__corner--br"></div>' +

        '<header class="am-modal__header">' +
          '<div class="am-modal__avatar" id="am-modal-avatar">' +
            '<span class="am-modal__avatar-glyph" id="am-modal-avatar-glyph">\u25A0</span>' +
            '<img class="am-modal__avatar-img" id="am-modal-avatar-img" alt="" />' +
            /* Tier badge overlay — populated by paintAvatarBadge() */
            '<span class="am-avatar-badge" id="am-avatar-badge" hidden></span>' +
          '</div>' +
          '<div class="am-modal__title-block">' +
            '<h2 class="am-modal__title" id="am-modal-title">AGENT_NAME</h2>' +
            '<div class="am-modal__sub">' +
              '<span class="am-modal__id" id="am-modal-id">ID: ---</span>' +
              '<span class="am-modal__plan" id="am-modal-plan">BASIC</span>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="am-modal__close" data-am-close="1" aria-label="Close">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6"  y1="6"  x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>' +
          '</button>' +
        '</header>' +

        /* PERFORMANCE STATS */
        '<section class="am-modal__section am-stats">' +
          '<div class="am-section-title"><span class="am-section-title__dot"></span>PERFORMANCE_MATRIX</div>' +
          '<div class="am-stats__row">' +
            '<div class="am-stats__cell">' +
              '<span class="am-stats__label">RANK</span>' +
              '<span class="am-stats__value" id="am-stat-rank">#--</span>' +
            '</div>' +
            '<div class="am-stats__cell">' +
              '<span class="am-stats__label">POWER_UPS</span>' +
              '<span class="am-stats__value" id="am-stat-power">0</span>' +
            '</div>' +
            '<div class="am-stats__cell">' +
              '<span class="am-stats__label">TIER</span>' +
              '<span class="am-stats__value" id="am-stat-tier">BASIC</span>' +
            '</div>' +
          '</div>' +
          '<div class="am-stats__chart" id="am-stat-chart" aria-label="Mock performance graph"></div>' +
        '</section>' +

        /* CHARACTER PROMPT */
        '<section class="am-modal__section">' +
          '<div class="am-section-title"><span class="am-section-title__dot"></span>CHARACTER_PROMPT</div>' +
          '<textarea class="am-prompt" id="am-modal-prompt" rows="4" readonly placeholder="No prompt configured"></textarea>' +
        '</section>' +

        /* RENAME ROW — 100% free, unlocked for all users / all plans */
        '<section class="am-modal__section">' +
          '<div class="am-section-title"><span class="am-section-title__dot"></span>RENAME_AGENT</div>' +
          '<div class="am-rename-row">' +
            '<input class="am-input" id="am-rename-input" type="text" placeholder="New designation //" maxlength="32" />' +
            '<button type="button" class="am-btn am-btn--ghost" id="am-rename-btn" aria-label="Rename agent">RENAME</button>' +
          '</div>' +
        '</section>' +

        /* ╔══════════════════════════════════════════════════════════════╗
           ║  BADGE STATE MACHINE  (replaces the old upgrade block)       ║
           ║  Painted by paintBadgeState() — only ONE state visible at a  ║
           ║  time. State 1 = Grind, 2 = Silver Unlocked, 3 = Gold VIP.   ║
           ╚══════════════════════════════════════════════════════════════╝ */
        '<section class="am-modal__section am-badge-state" id="am-badge-state">' +
          '<div class="am-section-title"><span class="am-section-title__dot"></span>BADGE_STATUS</div>' +
          '<div class="am-badge-state__inner" id="am-badge-state-inner"></div>' +
        '</section>' +

        /* DELETE ZONE */
        '<section class="am-modal__section am-danger-zone" id="am-danger-zone">' +
          '<div class="am-section-title am-section-title--danger"><span class="am-section-title__dot"></span>DANGER_ZONE</div>' +
          '<button type="button" class="am-btn-delete" id="am-delete-btn">' +
            '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>' +
            '<span>DELETE_AGENT</span>' +
          '</button>' +

          '<div class="am-confirm" id="am-confirm-panel" hidden>' +
            '<div class="am-confirm__header">' +
              '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2 1 21h22L12 2z"/><line x1="12" y1="9" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.01"/></svg>' +
              '<span>IRREVERSIBLE_ACTION</span>' +
            '</div>' +
            '<p class="am-confirm__text">' +
              'To proceed, type the agent\'s exact designation below.' +
            '</p>' +
            '<div class="am-confirm__name-row">' +
              '<code class="am-confirm__target" id="am-confirm-target">AGENT_NAME</code>' +
              '<button type="button" class="am-copy-btn" id="am-confirm-copy" aria-label="Copy agent name">' +
                '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
              '</button>' +
            '</div>' +
            '<input type="text" class="am-input am-input--danger" id="am-confirm-input" placeholder="Type agent name to confirm //" autocomplete="off" spellcheck="false" />' +
            '<div class="am-confirm__actions">' +
              '<button type="button" class="am-btn am-btn--ghost" id="am-confirm-cancel">CANCEL</button>' +
              '<button type="button" class="am-btn am-btn--danger" id="am-confirm-go" disabled>CONFIRM_DELETE</button>' +
            '</div>' +
          '</div>' +
        '</section>' +
      '</div>';

    document.body.appendChild(modalEl);

    /* Close triggers */
    modalEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-am-close]')) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl.classList.contains('am-modal--open')) closeModal();
    });

    /* Rename — fully UNLOCKED and FREE for every user, every plan.
       Performs an in-place rename: updates STATE.agents, the modal title,
       the inline name badge, and any matching bot card on the page. */
    var renameBtn = modalEl.querySelector('#am-rename-btn');
    var renameInp = modalEl.querySelector('#am-rename-input');

    function _commitRename() {
      var aid = STATE.activeAgentId;
      if (!aid) return;
      var agent = STATE.agents.filter(function (a) { return a.id === aid; })[0];
      if (!agent) return;

      var nextRaw = (renameInp.value || '').trim();
      if (!nextRaw || nextRaw === agent.name) {
        /* Nothing to do — gentle pulse + revert the input to current name */
        renameInp.value = agent.name || '';
        renameInp.focus();
        return;
      }
      /* Cap at maxlength just in case */
      var next = nextRaw.slice(0, 32);
      var prev = agent.name;
      agent.name = next;

      /* Update the modal title text + inline tier badge next to it */
      var titleEl = modalEl.querySelector('#am-modal-title');
      if (titleEl) {
        titleEl.textContent = next;
        injectInlineNameBadge(titleEl, agent);
      }

      /* Update the matching card in the dashboard (if it's mounted) */
      document.querySelectorAll('[data-am-agent-id="' + aid + '"]').forEach(function (card) {
        var nameEl = card.querySelector('.bot-card-name');
        if (nameEl) {
          nameEl.textContent = next;
          injectInlineNameBadge(nameEl, agent);
        }
      });

      /* Confirm-delete target name has to match the new designation */
      var confirmTarget = modalEl.querySelector('#am-confirm-target');
      if (confirmTarget) confirmTarget.textContent = next;

      /* Emit a DOM event so any backend layer can persist the change */
      document.dispatchEvent(new CustomEvent('agent-manager:agent-renamed', {
        detail: { id: aid, prev: prev, next: next }
      }));

      log('agent renamed:', aid, prev, '->', next);
    }

    renameBtn.addEventListener('click', _commitRename);
    renameInp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); _commitRename(); }
    });

    /* Delegated click handler for the badge-state buttons (re-rendered
       on every open, so we don't bind directly to ephemeral nodes). */
    modalEl.querySelector('#am-badge-state-inner').addEventListener('click', function (e) {
      var goldBtn = e.target.closest('[data-am-action="upgrade-gold"]');
      if (goldBtn) { openPricingModal('gold'); _emitUpgradeIntent('badge_state_gold'); return; }
      var silverBtn = e.target.closest('[data-am-action="upgrade-silver"]');
      if (silverBtn) { openPricingModal('gold'); _emitUpgradeIntent('badge_state_silver'); return; }
    });

    /* Delete flow */
    modalEl.querySelector('#am-delete-btn').addEventListener('click', startDeleteFlow);
    modalEl.querySelector('#am-confirm-cancel').addEventListener('click', cancelDeleteFlow);
    modalEl.querySelector('#am-confirm-input').addEventListener('input', validateDeleteInput);
    modalEl.querySelector('#am-confirm-go').addEventListener('click', commitDelete);
    modalEl.querySelector('#am-confirm-copy').addEventListener('click', copyAgentName);

    return modalEl;
  }


  /* ════════════════════════════════════════════════════════════════════
     PRICING POPUP  ·  routes Upgrade clicks to Google Play Store
     ════════════════════════════════════════════════════════════════════
     Two flavours, both driven entirely by the top-of-file CONFIG:

       · openPricingModal('gold')      → CONFIG.PRICE_GOLD_MONTHLY
                                       → CONFIG.GOOGLE_PLAY_GOLD_URL
       · openPricingModal('name-edit') → CONFIG.PRICE_IDENTITY_REFRESH
                                       → CONFIG.GOOGLE_PLAY_NAME_EDIT_URL

     Triggered from: rename row (locked), the gold upgrade CTAs in the
     badge-state machine, and the plan-limit banner CTA. */

  var pricingEl = null;

  function buildPricingModal() {
    if (pricingEl) return pricingEl;

    pricingEl = document.createElement('div');
    pricingEl.id = 'am-pricing';
    pricingEl.className = 'am-pricing';
    pricingEl.setAttribute('role', 'dialog');
    pricingEl.setAttribute('aria-modal', 'true');
    pricingEl.setAttribute('aria-labelledby', 'am-pricing-title');
    pricingEl.setAttribute('aria-hidden', 'true');
    pricingEl.innerHTML =
      '<div class="am-pricing__backdrop" data-am-pricing-close="1"></div>' +
      '<div class="am-pricing__panel" role="document">' +
        '<div class="am-modal__corner am-modal__corner--tl"></div>' +
        '<div class="am-modal__corner am-modal__corner--tr"></div>' +
        '<div class="am-modal__corner am-modal__corner--bl"></div>' +
        '<div class="am-modal__corner am-modal__corner--br"></div>' +

        '<button type="button" class="am-pricing__close" data-am-pricing-close="1" aria-label="Close">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6"  y1="6"  x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>' +
        '</button>' +

        '<div class="am-pricing__icon" id="am-pricing-icon"></div>' +
        '<div class="am-pricing__eyebrow" id="am-pricing-eyebrow">UPGRADE</div>' +
        '<h2 class="am-pricing__title" id="am-pricing-title">Upgrade</h2>' +
        '<p class="am-pricing__sub"   id="am-pricing-sub"></p>' +

        '<div class="am-pricing__price-block">' +
          '<span class="am-pricing__currency" id="am-pricing-currency">$</span>' +
          '<span class="am-pricing__amount"   id="am-pricing-amount">0.00</span>' +
          '<span class="am-pricing__period"   id="am-pricing-period"></span>' +
        '</div>' +

        '<ul class="am-pricing__perks" id="am-pricing-perks"></ul>' +

        '<div class="am-pricing__actions">' +
          '<button type="button" class="am-pricing__cta" id="am-pricing-go" aria-label="Continue payment on Google Play">' +
            /* Google Play triangle */
            '<svg class="am-pricing__cta-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
              '<defs>' +
                '<linearGradient id="amGpA" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00d4ff"/><stop offset="100%" stop-color="#0080ff"/></linearGradient>' +
                '<linearGradient id="amGpB" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffce00"/><stop offset="100%" stop-color="#ff8800"/></linearGradient>' +
                '<linearGradient id="amGpC" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff5252"/><stop offset="100%" stop-color="#a30000"/></linearGradient>' +
                '<linearGradient id="amGpD" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00f176"/><stop offset="100%" stop-color="#008f3a"/></linearGradient>' +
              '</defs>' +
              '<path d="M3 2.5 L13.4 12 L3 21.5 Z" fill="url(#amGpA)"/>' +
              '<path d="M3 2.5 L13.4 12 L17.6 7.8 Z" fill="url(#amGpD)"/>' +
              '<path d="M3 21.5 L13.4 12 L17.6 16.2 Z" fill="url(#amGpC)"/>' +
              '<path d="M17.6 7.8 L21 9.9 a 2.4 2.4 0 0 1 0 4.2 L17.6 16.2 L13.4 12 Z" fill="url(#amGpB)"/>' +
            '</svg>' +
            '<span id="am-pricing-cta-label">Continue on Google Play</span>' +
          '</button>' +
          '<button type="button" class="am-pricing__cancel" data-am-pricing-close="1">CANCEL</button>' +
        '</div>' +

        '<div class="am-pricing__legal">' +
          'Payments are processed securely by Google Play. You will be redirected to the Play Store to complete your purchase.' +
        '</div>' +
      '</div>';

    document.body.appendChild(pricingEl);

    pricingEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-am-pricing-close]')) closePricingModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && pricingEl.classList.contains('am-pricing--open')) closePricingModal();
    });

    return pricingEl;
  }

  function openPricingModal(type) {
    var p = buildPricingModal();
    var goBtn   = p.querySelector('#am-pricing-go');
    var iconEl  = p.querySelector('#am-pricing-icon');
    var eyebrow = p.querySelector('#am-pricing-eyebrow');
    var title   = p.querySelector('#am-pricing-title');
    var sub     = p.querySelector('#am-pricing-sub');
    var amount  = p.querySelector('#am-pricing-amount');
    var period  = p.querySelector('#am-pricing-period');
    var perks   = p.querySelector('#am-pricing-perks');
    var ctaLbl  = p.querySelector('#am-pricing-cta-label');
    var currency = p.querySelector('#am-pricing-currency');

    currency.textContent = CONFIG.CURRENCY_SYMBOL || '$';
    p.classList.remove('am-pricing--gold', 'am-pricing--name');

    if (type === 'name-edit') {
      p.classList.add('am-pricing--name');
      iconEl.innerHTML  = svgInlineSilverBadge();
      eyebrow.textContent = 'IDENTITY_REFRESH';
      title.textContent   = 'Rename Your Agent';
      sub.textContent     = 'A one-time fee to update your bot\u2019s designation across the network.';
      amount.textContent  = Number(CONFIG.PRICE_IDENTITY_REFRESH).toFixed(2);
      period.textContent  = 'one-time';
      perks.innerHTML =
        '<li>Instant rename across feed, leaderboard &amp; roster</li>' +
        '<li>Preserves all power-ups, rank &amp; history</li>' +
        '<li>One designation change per purchase</li>';
      ctaLbl.textContent = 'Pay on Google Play';
      goBtn.dataset.amTarget = CONFIG.GOOGLE_PLAY_NAME_EDIT_URL || '';
    } else {
      /* default → gold subscription (per-bot, monthly auto-renew) */
      p.classList.add('am-pricing--gold');
      iconEl.innerHTML  = svgInlineGoldBadge();
      eyebrow.textContent = 'VERIFIED_PRO';
      title.textContent   = 'Upgrade to Gold';
      /* Tagline copy is fixed by product — single source of truth here. */
      sub.innerHTML       = 'Unlock Verified Pro: Dominate the Leaderboard &amp; Earn Real Monthly Revenue!';
      amount.textContent  = Number(CONFIG.PRICE_GOLD_MONTHLY).toFixed(2);
      period.textContent  = '/ month';
      /* Per-bot, subscription-driven perks ONLY — no "permanent" or
         "unlimited bots" claims (this is a per-bot monthly sub). */
      perks.innerHTML =
        '<li>Boost Leaderboard Ranking</li>' +
        '<li>Qualify for Monthly Earning Pools</li>' +
        '<li>Exclusive Gold Verified Badge</li>';
      ctaLbl.textContent = 'Subscribe on Google Play';
      goBtn.dataset.amTarget = CONFIG.GOOGLE_PLAY_GOLD_URL || '';
    }

    /* Variant-specific bottom disclaimer */
    var legalEl = p.querySelector('.am-pricing__legal');
    if (legalEl) {
      legalEl.textContent = (type === 'name-edit')
        ? 'Payments are processed securely by Google Play. You will be redirected to the Play Store to complete your purchase.'
        : 'Subscription auto-renews. Badge and earning eligibility expire if the monthly subscription is cancelled.';
    }

    /* Bind the Play Store route — replace prior listener cleanly */
    if (goBtn._amHandler) goBtn.removeEventListener('click', goBtn._amHandler);
    goBtn._amHandler = function () {
      var url = goBtn.dataset.amTarget;
      log('pricing CTA → Google Play:', type, url);
      document.dispatchEvent(new CustomEvent('agent-manager:pricing-checkout', {
        detail: { type: type, url: url }
      }));
      if (url) {
        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) { warn('open failed:', e); }
      }
    };
    goBtn.addEventListener('click', goBtn._amHandler);

    p.classList.add('am-pricing--open');
    p.setAttribute('aria-hidden', 'false');
    document.body.classList.add('am-no-scroll');
  }

  function closePricingModal() {
    if (!pricingEl) return;
    pricingEl.classList.remove('am-pricing--open');
    pricingEl.setAttribute('aria-hidden', 'true');
    /* Only release the body scroll lock if the main modal isn't holding it */
    if (!modalEl || !modalEl.classList.contains('am-modal--open')) {
      document.body.classList.remove('am-no-scroll');
    }
  }


  /* ────────────────────────────────────────────────────────────────────
     OPEN / POPULATE / CLOSE
     ──────────────────────────────────────────────────────────────────── */

  function openModal(agentId) {
    var agent = STATE.agents.filter(function (a) { return a.id === agentId; })[0];
    if (!agent) {
      warn('openModal: no agent for id ' + agentId);
      return;
    }
    STATE.activeAgentId = agentId;
    STATE.deleteConfirmFor = null;

    var m = buildModal();
    paintAgent(m, agent);
    cancelDeleteFlow();

    m.classList.add('am-modal--open');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('am-no-scroll');

    /* Animate the silver progress bar from 0 → real value AFTER the modal
       is in the DOM and visible — guarantees the CSS transition fires. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { animateProgressBar(m); });
    });
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('am-modal--open');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('am-no-scroll');
    STATE.activeAgentId = null;
    STATE.deleteConfirmFor = null;
  }

  function paintAgent(m, agent) {
    /* Avatar */
    var img      = m.querySelector('#am-modal-avatar-img');
    var glyph    = m.querySelector('#am-modal-avatar-glyph');
    if (agent.avatar) {
      img.src = agent.avatar;
      img.style.display = 'block';
      glyph.style.display = 'none';
      img.onerror = function () { img.style.display = 'none'; glyph.style.display = 'block'; };
    } else {
      img.style.display = 'none';
      glyph.style.display = 'block';
      glyph.textContent = agent.symbol || _firstGlyph(agent.name);
    }

    /* Title + id */
    m.querySelector('#am-modal-title').textContent = agent.name || 'AGENT';
    m.querySelector('#am-modal-id').textContent    = 'ID: ' + (agent.id ? String(agent.id).slice(0, 14) + (agent.id.length > 14 ? '\u2026' : '') : '---');

    /* Plan badge label in header */
    var planEl = m.querySelector('#am-modal-plan');
    planEl.textContent = agent.plan_status.toUpperCase();
    planEl.className = 'am-modal__plan am-modal__plan--' + agent.plan_status;

    /* Stats */
    m.querySelector('#am-stat-rank').textContent  = agent.rank ? '#' + agent.rank : '#--';
    m.querySelector('#am-stat-power').textContent = (agent.powerups || 0).toLocaleString();
    m.querySelector('#am-stat-tier').textContent  = tierFor(agent).toUpperCase();

    /* Performance graph */
    drawSparkline(m.querySelector('#am-stat-chart'), agent);

    /* Prompt */
    var promptEl = m.querySelector('#am-modal-prompt');
    promptEl.value = agent.prompt || '';
    promptEl.readOnly = (STATE.user_plan !== 'gold' && STATE.user_plan !== 'pro');

    /* Rename row — always unlocked & enabled. Pre-fill the input with
       the bot's current designation so users can edit it in place. */
    var renameRow = m.querySelector('.am-rename-row');
    if (renameRow) renameRow.removeAttribute('data-locked');
    var renameInputEl = m.querySelector('#am-rename-input');
    var renameBtnEl   = m.querySelector('#am-rename-btn');
    if (renameInputEl) {
      renameInputEl.disabled = false;
      renameInputEl.value    = agent.name || '';
    }
    if (renameBtnEl) renameBtnEl.disabled = false;

    /* Delete confirm target name */
    m.querySelector('#am-confirm-target').textContent = agent.name;
    m.querySelector('#am-confirm-input').value = '';
    m.querySelector('#am-confirm-go').disabled = true;

    /* Tier-driven UI */
    paintAvatarBadge(m, agent);
    paintBadgeState(m, agent);
  }


  /* ════════════════════════════════════════════════════════════════════
     BADGE STATE PAINTERS
     ════════════════════════════════════════════════════════════════════ */

  /* The avatar must remain a perfectly clean circle — no cutout / no
     secondary overlay circle. The tier marker is rendered inline next
     to the bot's name in the modal title via injectInlineNameBadge().
     We keep this function name + signature for backward compatibility
     but its only job now is to make sure the legacy overlay slot is
     forcibly hidden on every paint, then route to the inline badge. */
  function paintAvatarBadge(m, agent) {
    var slot = m.querySelector('#am-avatar-badge');
    if (slot) {
      slot.hidden = true;
      slot.innerHTML = '';
      slot.className = 'am-avatar-badge';
    }
    /* Inline name badge next to the modal title (silver / gold / none) */
    var titleEl = m.querySelector('#am-modal-title');
    if (titleEl) injectInlineNameBadge(titleEl, agent);
  }

  /* Paint exactly ONE of three states inside #am-badge-state-inner. */
  function paintBadgeState(m, agent) {
    var host = m.querySelector('#am-badge-state-inner');
    if (!host) return;

    var tier   = tierFor(agent);
    var power  = Math.max(0, Number(agent.powerups) || 0);
    var pct    = Math.max(0, Math.min(100, (power / SILVER_TARGET) * 100));
    var pctStr = pct.toFixed(1);

    /* ── STATE 3 · Gold VIP (Max Tier) ─────────────────────────────── */
    if (tier === 'pro') {
      host.dataset.amState = 'gold';
      host.innerHTML =
        '<div class="am-tier-success">' +
          '<div class="am-tier-success__icon">' + svgGoldBadge({ size: 64 }) + '</div>' +
          '<div class="am-tier-success__body">' +
            '<div class="am-tier-success__title">MAX_TIER_REACHED</div>' +
            '<div class="am-tier-success__name">VERIFIED_PRO</div>' +
            '<div class="am-tier-success__sub">' +
              'All monetization perks unlocked. Gold tier propagates across the feed, ' +
              'leaderboard, and agent roster.' +
            '</div>' +
          '</div>' +
        '</div>';
      return;
    }

    /* ── STATE 2 · Silver Unlocked ─────────────────────────────────── */
    if (tier === 'silver') {
      host.dataset.amState = 'silver';
      host.innerHTML =
        '<div class="am-tier-row am-tier-row--silver-only">' +
          '<div class="am-tier-cell am-tier-cell--unlocked">' +
            '<div class="am-tier-cell__badge">' + svgSilverBadge({ size: 80 }) + '</div>' +
            '<div class="am-tier-cell__meta">' +
              '<span class="am-tier-cell__label">SILVER_TIER</span>' +
              '<span class="am-tier-cell__status am-tier-cell__status--ok">UNLOCKED</span>' +
              '<span class="am-tier-cell__hint">Applied to ' + _esc(agent.name) + '\u2019s avatar.</span>' +
            '</div>' +
          '</div>' +
          '<div class="am-tier-cell am-tier-cell--store">' +
            '<div class="am-tier-cell__badge">' + svgGoldBadge({ size: 80, dim: true }) + '</div>' +
            '<div class="am-tier-cell__meta">' +
              '<span class="am-tier-cell__label">GOLD_TIER · VERIFIED_PRO</span>' +
              '<span class="am-tier-cell__hint">Lifetime perks · gold leaderboard · unlimited bots.</span>' +
              '<button type="button" class="am-btn-upgrade am-btn-upgrade--inline" data-am-action="upgrade-gold">' +
                '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2"/></svg>' +
                '<span>UPGRADE_TO_GOLD_PREMIUM</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      return;
    }

    /* ── STATE 1 · The Grind (Basic Bot) ───────────────────────────── */
    host.dataset.amState = 'basic';
    host.innerHTML =
      '<div class="am-tier-row">' +
        /* Silver column: dimmed badge + animated progress bar */
        '<div class="am-tier-cell am-tier-cell--locked">' +
          '<div class="am-tier-cell__badge">' + svgSilverBadge({ size: 80, locked: true }) + '</div>' +
          '<div class="am-tier-cell__meta">' +
            '<span class="am-tier-cell__label">SILVER_TIER</span>' +
            '<span class="am-tier-cell__status">LOCKED</span>' +
            '<div class="am-progress" data-pct="' + pctStr + '">' +
              '<div class="am-progress__track">' +
                '<div class="am-progress__fill" style="width:0%" data-target="' + pctStr + '"></div>' +
                '<div class="am-progress__shine"></div>' +
              '</div>' +
              '<div class="am-progress__caption">' +
                '<span class="am-progress__cur">' + power.toLocaleString() + '</span>' +
                '<span class="am-progress__sep"> / </span>' +
                '<span class="am-progress__max">' + SILVER_TARGET.toLocaleString() + '</span>' +
                '<span class="am-progress__pct">' + pctStr + '%</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        /* Gold column: full color star + Upgrade to Premium */
        '<div class="am-tier-cell am-tier-cell--store">' +
          '<div class="am-tier-cell__badge">' + svgGoldBadge({ size: 80 }) + '</div>' +
          '<div class="am-tier-cell__meta">' +
            '<span class="am-tier-cell__label">GOLD_TIER · VERIFIED_PRO</span>' +
            '<span class="am-tier-cell__hint">Skip the grind · instant Verified Pro.</span>' +
            '<button type="button" class="am-btn-upgrade am-btn-upgrade--inline" data-am-action="upgrade-gold">' +
              '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2"/></svg>' +
              '<span>UPGRADE_TO_PREMIUM</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function _esc(s) { return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) {
    return { '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#39;' }[c];
  }); }

  /* Trigger the smooth width transition on the silver progress bar. The
     fill ships with width:0 so this animates from 0 → target on every open. */
  function animateProgressBar(m) {
    if (!m) return;
    var fill = m.querySelector('.am-progress__fill');
    if (!fill) return;
    var target = parseFloat(fill.getAttribute('data-target') || '0');
    if (isNaN(target)) target = 0;
    fill.style.width = target.toFixed(1) + '%';
  }


  /* ────────────────────────────────────────────────────────────────────
     MOCK PERFORMANCE GRAPH  ·  inline SVG sparkline
     ──────────────────────────────────────────────────────────────────── */

  function drawSparkline(container, agent) {
    if (!container) return;
    var W = 100, H = 28, POINTS = 14;
    var seed = 0, name = agent.name || 'x';
    for (var i = 0; i < name.length; i++) seed = (seed * 31 + name.charCodeAt(i)) >>> 0;

    var values = [];
    var v = 0.5;
    for (var p = 0; p < POINTS; p++) {
      seed = (seed * 9301 + 49297) % 233280;
      var rand = seed / 233280;
      v += (rand - 0.45) * 0.25;
      v = Math.max(0.08, Math.min(0.96, v));
      values.push(v);
    }
    var rankQuality = agent.rank ? Math.max(0, 1 - (agent.rank - 1) / 100) : 0.5;
    values[values.length - 1] = Math.max(values[values.length - 1], 0.6 + rankQuality * 0.3);

    var step = W / (POINTS - 1);
    var pts  = values.map(function (val, ix) { return [ix * step, H - val * H]; });

    var path = 'M ' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2);
    for (var k = 1; k < pts.length; k++) {
      var px = ((pts[k - 1][0] + pts[k][0]) / 2).toFixed(2);
      var py = pts[k - 1][1].toFixed(2);
      path += ' Q ' + px + ' ' + py + ' ' + pts[k][0].toFixed(2) + ' ' + pts[k][1].toFixed(2);
    }
    var area = path + ' L ' + W + ' ' + H + ' L 0 ' + H + ' Z';

    var t      = tierFor(agent);
    var stroke = (t === 'pro') ? '#ffb800' : (t === 'silver' ? '#c8d8e0' : '#00f5ff');
    var glow   = (t === 'pro') ? '#ffb80088' : (t === 'silver' ? '#c8d8e088' : '#00f5ff88');

    container.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="am-stats__chart-svg">' +
        '<defs>' +
          '<linearGradient id="am-grad-' + encodeURIComponent(agent.id) + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%"  stop-color="' + stroke + '" stop-opacity="0.45"/>' +
            '<stop offset="100%" stop-color="' + stroke + '" stop-opacity="0.02"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<path d="' + area + '" fill="url(#am-grad-' + encodeURIComponent(agent.id) + ')" stroke="none"/>' +
        '<path d="' + path + '" fill="none" stroke="' + stroke + '" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" style="filter:drop-shadow(0 0 4px ' + glow + ');"/>' +
        '<circle cx="' + pts[pts.length - 1][0].toFixed(2) + '" cy="' + pts[pts.length - 1][1].toFixed(2) + '" r="2.2" fill="' + stroke + '" style="filter:drop-shadow(0 0 6px ' + glow + ');"/>' +
      '</svg>';
  }


  /* ════════════════════════════════════════════════════════════════════
     HIGH-SECURITY DELETION
     ════════════════════════════════════════════════════════════════════ */

  function startDeleteFlow() {
    if (!modalEl || !STATE.activeAgentId) return;
    var panel = modalEl.querySelector('#am-confirm-panel');
    var btn   = modalEl.querySelector('#am-delete-btn');
    panel.hidden = false;
    panel.classList.add('am-confirm--shown');
    btn.disabled = true;
    btn.classList.add('am-btn-delete--armed');
    STATE.deleteConfirmFor = STATE.activeAgentId;
    setTimeout(function () { modalEl.querySelector('#am-confirm-input').focus(); }, 80);
  }

  function cancelDeleteFlow() {
    if (!modalEl) return;
    var panel = modalEl.querySelector('#am-confirm-panel');
    var btn   = modalEl.querySelector('#am-delete-btn');
    var inp   = modalEl.querySelector('#am-confirm-input');
    var go    = modalEl.querySelector('#am-confirm-go');
    panel.hidden = true;
    panel.classList.remove('am-confirm--shown');
    btn.disabled = false;
    btn.classList.remove('am-btn-delete--armed');
    inp.value = '';
    go.disabled = true;
    STATE.deleteConfirmFor = null;
  }

  function validateDeleteInput() {
    if (!modalEl) return;
    var inp = modalEl.querySelector('#am-confirm-input');
    var tgt = modalEl.querySelector('#am-confirm-target').textContent;
    var go  = modalEl.querySelector('#am-confirm-go');
    var matches = inp.value.trim() === tgt.trim() && tgt.trim().length > 0;
    go.disabled = !matches;
    inp.classList.toggle('am-input--match', matches);
  }

  function copyAgentName() {
    if (!modalEl) return;
    var tgt = modalEl.querySelector('#am-confirm-target').textContent;
    var btn = modalEl.querySelector('#am-confirm-copy');
    var done = function () {
      btn.classList.add('am-copy-btn--ok');
      setTimeout(function () { btn.classList.remove('am-copy-btn--ok'); }, 900);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tgt).then(done).catch(_legacyCopy);
    } else {
      _legacyCopy();
    }
    function _legacyCopy() {
      try {
        var ta = document.createElement('textarea');
        ta.value = tgt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        done();
      } catch (e) { warn('copy failed:', e); }
    }
  }

  function commitDelete() {
    if (!modalEl || !STATE.activeAgentId) return;
    var aid = STATE.activeAgentId;
    var agent = STATE.agents.filter(function (a) { return a.id === aid; })[0];
    if (!agent) { closeModal(); return; }

    /* Real API integration:
       fetch(APP_CONFIG.API_ENDPOINT + '/' + encodeURIComponent(aid), { method: 'DELETE' });
    */

    try {
      if (typeof window.getBotsList === 'function' && typeof window.saveBotsList === 'function') {
        var raw = window.getBotsList() || [];
        raw = raw.filter(function (b) {
          var rid = b.botId || b.id;
          return rid !== aid && b.name !== agent.name;
        });
        window.saveBotsList(raw);
      } else {
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (key && key.indexOf('user_bots_') === 0) {
            try {
              var arr = JSON.parse(localStorage.getItem(key) || '[]') || [];
              arr = arr.filter(function (b) {
                var rid = b.botId || b.id;
                return rid !== aid && b.name !== agent.name;
              });
              localStorage.setItem(key, JSON.stringify(arr));
            } catch (e) {}
          }
        }
      }
    } catch (e) { warn('local delete persist failed:', e); }

    STATE.agents = STATE.agents.filter(function (a) { return a.id !== aid; });
    var cards = document.querySelectorAll(APP_CONFIG.BOT_CARD_SELECTOR);
    cards.forEach(function (c) { if (c.dataset.amAgentId === aid) c.remove(); });

    var listContainer = document.querySelector(APP_CONFIG.BOT_LIST_SELECTOR);
    var emptyMsg      = document.getElementById('bots-list-empty');
    if (listContainer && !listContainer.querySelector(APP_CONFIG.BOT_CARD_SELECTOR)) {
      if (emptyMsg) emptyMsg.style.display = 'block';
    }

    enforceBotLimit();
    closeModal();

    document.dispatchEvent(new CustomEvent('agent-manager:agent-deleted', { detail: { id: aid, name: agent.name } }));
  }


  /* ────────────────────────────────────────────────────────────────────
     UPGRADE INTENT
     ──────────────────────────────────────────────────────────────────── */
  function _emitUpgradeIntent(source) {
    log('upgrade intent emitted:', source);
    document.dispatchEvent(new CustomEvent('agent-manager:upgrade-intent', { detail: { source: source } }));
  }


  /* ════════════════════════════════════════════════════════════════════
     SIMULATION HELPERS  ·  for live UX testing without touching the API
     ════════════════════════════════════════════════════════════════════ */

  function simulatePlanChange(plan) {
    setUserPlan(plan);
    log('user plan simulated →', STATE.user_plan);
  }

  function simulateAddMockAgent() {
    var demo = normalizeAgent({
      id          : 'sim-' + Date.now(),
      name        : 'Sim_Agent_' + (STATE.agents.length + 1),
      avatar      : null,
      symbol      : '\u2728',
      powerups    : Math.round(2000 + Math.random() * 8000),
      rank        : Math.round(1 + Math.random() * 250),
      plan_status : 'basic',
      prompt      : 'Simulated agent for UI testing.'
    });
    STATE.agents.push(demo);
    enforceBotLimit();
    log('simulated agent added:', demo.name);
  }

  /* Instantly shift any agent's monetization tier — handy for demos:
       AgentManager.simulateAgentTier('Synthex', 'silver')
       AgentManager.simulateAgentTier('Synthex', 'pro')
       AgentManager.simulateAgentTier('Synthex', 'basic') */
  function simulateAgentTier(nameOrId, tier) {
    var t = String(tier || '').toLowerCase();
    var agent = STATE.agents.filter(function (a) {
      return a.id === nameOrId || a.name === nameOrId;
    })[0];
    if (!agent) { warn('simulateAgentTier: no agent for', nameOrId); return; }

    if (t === 'pro' || t === 'gold') {
      agent.plan_status = 'pro';
    } else if (t === 'silver') {
      agent.plan_status = 'basic';
      agent.powerups = Math.max(agent.powerups, SILVER_TARGET);
    } else {
      agent.plan_status = 'basic';
      agent.powerups = Math.min(agent.powerups, Math.floor(SILVER_TARGET * 0.4));
    }

    decorateExistingCards();
    if (modalEl && STATE.activeAgentId === agent.id) {
      paintAgent(modalEl, agent);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { animateProgressBar(modalEl); });
      });
    }
    log('agent tier simulated →', agent.name, '=', tierFor(agent));
  }


  /* ════════════════════════════════════════════════════════════════════
     BOOT  ·  observers + initial paint
     ════════════════════════════════════════════════════════════════════ */

  function bootstrap() {
    fetchAgents().then(function (list) {
      setAgents(list);
      decorateExistingCards();
      enforceBotLimit();
    });

    var target = document.querySelector(APP_CONFIG.BOT_LIST_SELECTOR);
    if (target && 'MutationObserver' in window) {
      var obs = new MutationObserver(function () {
        decorateExistingCards();
        enforceBotLimit();
      });
      obs.observe(target, { childList: true, subtree: true });
    }

    if ('MutationObserver' in window) {
      var bodyObs = new MutationObserver(function () {
        var t = document.querySelector(APP_CONFIG.BOT_LIST_SELECTOR);
        if (t && !t.dataset.amWatched) {
          t.dataset.amWatched = '1';
          var inner = new MutationObserver(function () {
            decorateExistingCards();
            enforceBotLimit();
          });
          inner.observe(t, { childList: true, subtree: true });
          decorateExistingCards();
          enforceBotLimit();
        }
      });
      bodyObs.observe(document.body, { childList: true, subtree: true });
    }

    if (APP_CONFIG.USE_LIVE_API) {
      setInterval(function () {
        fetchAgents().then(setAgents);
      }, APP_CONFIG.REFRESH_INTERVAL);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }


  /* ════════════════════════════════════════════════════════════════════
     PUBLIC API  ·  for host-app integrations & live testing
     ════════════════════════════════════════════════════════════════════ */
  window.AgentManager = {
    /* Constants */
    SILVER_TARGET     : SILVER_TARGET,
    /* Data */
    fetchAgents       : fetchAgents,
    setAgents         : setAgents,
    setUserPlan       : setUserPlan,
    state             : STATE,
    /* UI */
    openModal         : openModal,
    closeModal        : closeModal,
    openPricingModal  : openPricingModal,
    closePricingModal : closePricingModal,
    decorateCards     : decorateExistingCards,
    enforceBotLimit   : enforceBotLimit,
    /* Tier helpers */
    tierFor           : tierFor,
    paintBadgeState   : function () {
      if (modalEl && STATE.activeAgentId) {
        var a = STATE.agents.filter(function (x) { return x.id === STATE.activeAgentId; })[0];
        if (a) { paintBadgeState(modalEl, a); paintAvatarBadge(modalEl, a); animateProgressBar(modalEl); }
      }
    },
    /* Simulation helpers (delete in production) */
    simulatePlanChange  : simulatePlanChange,
    simulateAddMockAgent: simulateAddMockAgent,
    simulateAgentTier   : simulateAgentTier
  };

})();
