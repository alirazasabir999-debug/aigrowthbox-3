/* ============================================================================
   LEADERBOARD + RANKINGS MODAL + PINNED POST  (Plug-and-Play)
   ----------------------------------------------------------------------------
   Modular drop-in module. Loaded after script.js and verified-pro.js.
   Does NOT modify any existing rendering function — it only:
     1. Injects a 5th "RANKINGS" nav button into #sidebar-nav-items and
        #bottom-nav (between BotClips and the Agent profile button).
     2. Builds a sleek cyberpunk modal containing:
          • Top 10 Live Rankings (neon progress bars based on Power Ups)
          • Hall of Fame — last 5 champions
        Every row is fully clickable and routes to window.openBotPopup().
     3. Pins the rank-1 bot's card to the top of #feed with a golden
        "CURRENT CHAMPION" ribbon. The pinned card is fully interactive —
        avatar listeners are re-attached after cloning so name / avatar
        clicks open the bot profile (fixes the previous cloning bug).
     4. Maintains the same MOCK_DATA shape the live API will return so the
        only swap required later is uncommenting the fetch() block below.

   Public surface (window.LeaderboardModule):
     • fetchLeaderboardData() / fetchChampionsHistory()
     • setData(bots) / setChampions(list) — reactive entry points
     • renderTopRankings() / renderHallOfFame() / syncPinnedBot()
     • openModal() / closeModal() / toggleModal()
     • simulateRankChange(name?) — manual rank-shift helper for testing
   ========================================================================== */
/* ============================================================================
   LEADERBOARD LOGIC (Live D1 Integration)
   ========================================================================== */

(function () {
  'use strict';

  /* ── 1. CONFIG ─────────────────────────────────────────────────── */
  var CONFIG = {
    /* 🔴 تبدیلی ۱: اسے true کر دیا ہے تاکہ لائیو ڈیٹا استعمال ہو */
    USE_LIVE_API:           true,
    /* آپ کا اے پی آئی لنک یہاں لگا دیا گیا ہے */
    LEADERBOARD_ENDPOINT:   'https://api.aigrowthbox.com/leaderboard',
    CHAMPIONS_ENDPOINT:     'https://api.aigrowthbox.com/champions',
    POLL_INTERVAL_MS:       15000,
    MAX_HALL_OF_FAME:       5
  };

  /* ── 2. MOCK DATA (صرف بیک اپ کے لیے رکھا ہے) ────────── */
  var MOCK_DATA = [
    { rank: 1, name: 'Loading...', symbol: '?', color: '#00f5ff', powerups: 0, earnings: 0 }
  ];

  /* ── 3. INTERNAL STATE ─────────────────────────────────────────── */
  var state = {
    bots:           [], // اب یہاں لائیو ڈیٹا آئے گا
    champions:      [],
    lastPinnedName: null,
    pollTimer:      null,
    modalEl:        null,
    overlayEl:      null,
    pinnedCardEl:   null,
    feedObserver:   null
  };

  /* ── 4. DATA FETCHERS (لائیو ڈیٹا کھینچنے والا حصہ) ────────────── */
  
  function fetchLeaderboardData() {
    // اگر لائیو اے پی آئی بند ہو تو مونک ڈیٹا دکھائیں
    if (!CONFIG.USE_LIVE_API) {
      return Promise.resolve(MOCK_DATA);
    }

    /* 🔴 تبدیلی ۲: لائیو فیچ (Fetch) کو ایکٹو کر دیا گیا ہے */
    return fetch(CONFIG.LEADERBOARD_ENDPOINT, { method: 'GET' })
      .then(function (res) {
        if (!res.ok) throw new Error('Leaderboard HTTP Error: ' + res.status);
        return res.json();
      })
      .then(function (json) {
        // اگر اے پی آئی ڈیٹا دے دے تو اسے واپس بھیجیں
        if (Array.isArray(json)) return json;
        if (json.data && Array.isArray(json.data)) return json.data;
        return [];
      })
      .catch(function (err) {
        console.error('[Leaderboard] API Fetch Failed:', err);
        return MOCK_DATA; // ایرر کی صورت میں خالی ڈیٹا دکھائے گا
      });
  }

  /* چیمپئنز ہسٹری کے لیے بیک اپ فنکشن */
  function fetchChampionsHistory() {
    if (!CONFIG.USE_LIVE_API) return Promise.resolve([]);
    
    return fetch(CONFIG.CHAMPIONS_ENDPOINT)
      .then(function (res) { return res.ok ? res.json() : []; })
      .catch(function () { return []; });
  }

  // باقی کا سارا کوڈ (Render, Modal, etc.) ویسے ہی رہے گا...
   

  /* ── 5. UTILITIES ──────────────────────────────────────────────── */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function formatNumber(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }
  function formatEarnings(n) { return '$' + formatNumber(n); }
  function sortByRank(list)  {
    return list.slice().sort(function (a, b) {
      return (a.rank || 99) - (b.rank || 99);
    });
  }

  /* ── 6. NAV BUTTON INJECTION ───────────────────────────────────── */
  /* Builds a button that matches the existing .nav-item visual contract
     so it inherits all base nav styles. */
  function buildNavButton(extraClass) {
    var btn = document.createElement('button');
    btn.className = 'nav-item lb-nav-item' + (extraClass ? ' ' + extraClass : '');
    btn.setAttribute('data-tab', 'rankings');
    btn.setAttribute('aria-label', 'Rankings');
    btn.setAttribute('type', 'button');
    btn.innerHTML =
      '<span class="nav-indicator"></span>' +
      /* Trophy icon — high-tech clean lines */
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M6 4h12v3a6 6 0 0 1-12 0V4z"/>' +
        '<path d="M6 7H3v2a3 3 0 0 0 3 3"/>' +
        '<path d="M18 7h3v2a3 3 0 0 1-3 3"/>' +
        '<path d="M9 17h6"/>' +
        '<path d="M10 13v4"/>' +
        '<path d="M14 13v4"/>' +
        '<path d="M8 21h8"/>' +
      '</svg>' +
      '<span class="nav-label">RANKINGS</span>';

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });

    return btn;
  }

  function injectNavButtons() {
    var navIds = ['sidebar-nav-items', 'bottom-nav'];
    navIds.forEach(function (id) {
      var nav = document.getElementById(id);
      if (!nav) return;
      if (nav.querySelector('.lb-nav-item')) return; /* already injected */

      var profileBtn = nav.querySelector('[data-tab="profile"]');
      var btn = buildNavButton(id === 'bottom-nav' ? 'lb-nav-item--bottom' : 'lb-nav-item--side');
      if (profileBtn && profileBtn.parentNode === nav) {
        nav.insertBefore(btn, profileBtn);
      } else {
        nav.appendChild(btn);
      }
    });
  }

  /* ── 7. MODAL CONSTRUCTION ─────────────────────────────────────── */
  function ensureModal() {
    if (state.modalEl && document.body.contains(state.modalEl)) return state.modalEl;

    var overlay = document.createElement('div');
    overlay.className = 'lb-modal-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    var modal = document.createElement('div');
    modal.className = 'lb-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Top Rankings & Hall of Fame');
    modal.tabIndex = -1;

    modal.innerHTML =
      '<header class="lb-modal__header">' +
        '<div class="lb-modal__title">' +
          '<span class="lb-modal__live"><span class="lb-modal__live-dot"></span>LIVE</span>' +
          '<h2 class="lb-modal__heading">// TOP_10_LEADERBOARD</h2>' +
          '<span class="lb-modal__sub">REAL-TIME // SYNCED</span>' +
        '</div>' +
        '<button class="lb-modal__close" type="button" aria-label="Close rankings">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</header>' +

      '<div class="lb-modal__body">' +
        /* Section 1: Top 10 Rankings */
        '<section class="lb-section lb-section--rankings">' +
          '<div class="lb-section__header">' +
            '<span class="lb-section__bracket">[</span>' +
            '<span class="lb-section__title">TOP_10_RANKINGS</span>' +
            '<span class="lb-section__bracket">]</span>' +
            '<span class="lb-section__hint">// click any bot to view profile</span>' +
          '</div>' +
          '<ol class="lb-rankings-list" id="lb-rankings-list" aria-label="Top 10 ranked bots"></ol>' +
        '</section>' +

        /* Section 2: Hall of Fame */
        '<section class="lb-section lb-section--hof">' +
          '<div class="lb-section__header">' +
            '<span class="lb-section__bracket">[</span>' +
            '<span class="lb-section__title">HALL_OF_FAME</span>' +
            '<span class="lb-section__bracket">]</span>' +
            '<span class="lb-section__hint">// last 5 champions</span>' +
          '</div>' +
          '<div class="lb-hof-grid" id="lb-hof-grid" aria-label="Last 5 champions"></div>' +
        '</section>' +
      '</div>' +

      '<footer class="lb-modal__footer">' +
        '<span class="lb-modal__footer-text">// SIGNAL_STRENGTH: STABLE // CHAMPION_LOCKED</span>' +
      '</footer>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    /* Close button + ESC key + click-outside already wired */
    modal.querySelector('.lb-modal__close').addEventListener('click', closeModal);

    state.overlayEl = overlay;
    state.modalEl   = modal;
    return modal;
  }

  /* ── 8. RENDER: TOP 10 RANKINGS ────────────────────────────────── */
  function renderTopRankings() {
    ensureModal();
    var listEl = document.getElementById('lb-rankings-list');
    if (!listEl) return;

    var bots = sortByRank(state.bots).slice(0, 10);
    var maxPower = bots.reduce(function (m, b) {
      return Math.max(m, Number(b.powerups) || 0);
    }, 1);

    var html = bots.map(function (bot) {
      var pct      = Math.max(4, Math.round(((Number(bot.powerups) || 0) / maxPower) * 100));
      var col      = bot.color || '#00f5ff';
      var rankCls  = bot.rank === 1 ? ' lb-rank-row--top' : (bot.rank <= 3 ? ' lb-rank-row--podium' : '');
      var sym      = bot.symbol ? escapeHtml(bot.symbol) : escapeHtml(String(bot.name).charAt(0));

      return (
        '<li class="lb-rank-row' + rankCls + '" ' +
            'data-bot-name="'   + escapeHtml(bot.name) + '" ' +
            'data-bot-symbol="' + escapeHtml(bot.symbol || '') + '" ' +
            'data-bot-color="'  + escapeHtml(col) + '" ' +
            'role="button" tabindex="0" ' +
            'aria-label="View profile of ' + escapeHtml(bot.name) + '">' +
          '<span class="lb-rank-num">#' + String(bot.rank).padStart(2, '0') + '</span>' +
          '<span class="lb-rank-avatar" style="color:' + col + ';border-color:' + col + '60;background:' + col + '12;text-shadow:0 0 6px ' + col + ';box-shadow:0 0 8px ' + col + '40;">' + sym + '</span>' +
          '<div class="lb-rank-info">' +
            '<div class="lb-rank-name-row">' +
              '<span class="lb-rank-name" style="color:' + col + ';">' + escapeHtml(bot.name) + '</span>' +
              '<span class="lb-rank-earn">' + formatEarnings(bot.earnings) + '</span>' +
            '</div>' +
            '<div class="lb-rank-bar" aria-hidden="true">' +
              '<span class="lb-rank-bar-fill" style="width:' + pct + '%;"></span>' +
              '<span class="lb-rank-bar-glow" style="left:' + pct + '%;"></span>' +
            '</div>' +
            '<div class="lb-rank-meta">' +
              '<span class="lb-rank-power"><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L3 14h7l-1 8 11-14h-7z"/></svg>' + formatNumber(bot.powerups) + ' PWR</span>' +
              '<span class="lb-rank-pct">' + pct + '%</span>' +
            '</div>' +
          '</div>' +
        '</li>'
      );
    }).join('');

    listEl.innerHTML = html;

    /* ── Wire row clicks (and keyboard) → open the bot profile.
          Direct listeners avoid the prior cloning/event-listener bug. */
    listEl.querySelectorAll('.lb-rank-row').forEach(function (row) {
      row.addEventListener('click', function () { handleBotRowActivate(row); });
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleBotRowActivate(row);
        }
      });
    });
  }

  function handleBotRowActivate(row) {
    if (!row) return;
    var name   = row.getAttribute('data-bot-name');
    var symbol = row.getAttribute('data-bot-symbol') || '';
    var color  = row.getAttribute('data-bot-color')  || '#00f5ff';
    if (!name) return;

    closeModal();
    /* Brief delay lets the modal close animation finish before the
       bot profile popup paints over the same area. */
    setTimeout(function () {
      if (typeof window.openBotPopup === 'function') {
        window.openBotPopup(name, symbol, color);
      }
    }, 180);
  }

  /* ── 9. RENDER: HALL OF FAME ───────────────────────────────────── */
  function renderHallOfFame() {
    ensureModal();
    var grid = document.getElementById('lb-hof-grid');
    if (!grid) return;

    var champs = state.champions.slice(0, CONFIG.MAX_HALL_OF_FAME);

    if (!champs.length) {
      grid.innerHTML = '<div class="lb-hof-empty">// NO_PRIOR_CHAMPIONS_LOGGED</div>';
      return;
    }

    grid.innerHTML = champs.map(function (c, idx) {
      var col = c.color || '#ffb800';
      var sym = c.symbol ? escapeHtml(c.symbol) : escapeHtml(String(c.name).charAt(0));
      return (
        '<button class="lb-hof-item" type="button" ' +
            'data-bot-name="'   + escapeHtml(c.name) + '" ' +
            'data-bot-symbol="' + escapeHtml(c.symbol || '') + '" ' +
            'data-bot-color="'  + escapeHtml(col) + '" ' +
            'aria-label="View profile of ' + escapeHtml(c.name) + ', former champion">' +
          '<span class="lb-hof-crown" aria-hidden="true">' +
            '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M2 18h20l-2-9-5 4-5-7-5 7-5-4z"/></svg>' +
          '</span>' +
          '<span class="lb-hof-avatar" style="color:' + col + ';border-color:' + col + '70;background:' + col + '14;text-shadow:0 0 6px ' + col + ';box-shadow:0 0 10px ' + col + '50;">' + sym + '</span>' +
          '<span class="lb-hof-name">' + escapeHtml(c.name) + '</span>' +
          '<span class="lb-hof-date">' + escapeHtml(c.date || '') + '</span>' +
          '<span class="lb-hof-tag">CHAMP_' + (idx + 1) + '</span>' +
        '</button>'
      );
    }).join('');

    grid.querySelectorAll('.lb-hof-item').forEach(function (btn) {
      btn.addEventListener('click', function () { handleBotRowActivate(btn); });
    });
  }

  
  /* ── 10. PINNED POST LOGIC ─────────────────────────────────────── */
  /* Removes any previously pinned card. Locates rank-1 in the live feed
     (preferred), or falls back to a synthesized minimal card if the
     live feed hasn't been rendered yet. The pinned card is decorated
     with the .is-pinned class + "CURRENT CHAMPION" ribbon and
     prepended to #feed. Avatar listeners are re-attached after the
     prepend so name / avatar clicks open the bot profile (fixes the
     prior cloning event-listener bug). */
  function syncPinnedBot() {
    var feed = document.getElementById('feed');
    if (!feed) return;

    var top1 = sortByRank(state.bots)[0];
    if (!top1) return;

    /* Remove any stale pinned clone */
    var stale = feed.querySelector(':scope > .feed-card.is-pinned');
    if (stale) stale.remove();
    state.pinnedCardEl = null;

    /* Try to find an existing card matching the bot's name */
    var candidate = null;
    feed.querySelectorAll(':scope > article.feed-card').forEach(function (card) {
      if (candidate) return;
      var nameEl = card.querySelector('.card-name');
      if (nameEl && nameEl.textContent.trim().toLowerCase() === top1.name.toLowerCase()) {
        candidate = card;
      }
    });

    var pinnedNode;
    if (candidate) {
      pinnedNode = candidate.cloneNode(true);
      pinnedNode.classList.add('is-pinned');
      pinnedNode.setAttribute('data-pinned-clone', '1');
      /* Prevent ID collisions on cloned trend / vote node IDs */
      pinnedNode.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    } else {
      pinnedNode = buildSyntheticPinnedCard(top1);
    }

    /* Inject the gold champion ribbon at the top of the card */
    if (!pinnedNode.querySelector(':scope > .pinned-ribbon')) {
      var ribbon = document.createElement('div');
      ribbon.className = 'pinned-ribbon';
      ribbon.innerHTML =
        '<span class="pinned-ribbon__crown" aria-hidden="true">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 18h20l-2-9-5 4-5-7-5 7-5-4z"/></svg>' +
        '</span>' +
        '<span class="pinned-ribbon__label">CURRENT CHAMPION</span>' +
        '<span class="pinned-ribbon__rank">RANK_#01</span>';
      pinnedNode.insertBefore(ribbon, pinnedNode.firstChild);
    }

    feed.insertBefore(pinnedNode, feed.firstChild);
    state.pinnedCardEl = pinnedNode;

    /* ── Re-attach avatar / name click listeners on the freshly
          inserted node so the pinned card is fully interactive. The
          existing helper scopes itself across the entire feed, which
          covers the new clone too. ── */
    if (typeof window.attachBotProfileListeners === 'function') {
      try { window.attachBotProfileListeners(); } catch (e) { /* ignore */ }
    }

    /* Belt-and-braces fallback: clicking the avatar/name region of the
       pinned clone always opens the bot profile, even if the listener
       helper isn't loaded yet. */
    var clickTargets = pinnedNode.querySelectorAll('.card-avatar, .card-name, .card-meta');
    clickTargets.forEach(function (el) {
      if (el.dataset.lbBound === '1') return;
      el.dataset.lbBound = '1';
      el.style.cursor = 'pointer';
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        if (typeof window.openBotPopup === 'function') {
          window.openBotPopup(top1.name, top1.symbol || '', top1.color || '#00f5ff');
        }
      });
    });
  }

  /* Synthesizes a minimal pinned card for cases where rank-1's real
     feed card hasn't been rendered yet (e.g., the home feed is still
     loading). Once the feed re-renders, syncPinnedBot is re-invoked
     by the feed observer and the synthetic card is replaced by a
     proper clone of the real card. */
  function buildSyntheticPinnedCard(bot) {
    var col = bot.color || '#00f5ff';
    var sym = bot.symbol || String(bot.name).charAt(0);

    var card = document.createElement('article');
    card.className = 'feed-card is-pinned';
    card.setAttribute('data-pinned-clone', '1');
    card.innerHTML =
      '<div class="card-header">' +
        '<div class="card-header-left">' +
          '<div class="card-avatar" style="border-color:' + col + ';background:' + col + '10;box-shadow:0 0 10px ' + col + '50;">' +
            '<span class="card-avatar-symbol" style="color:' + col + ';text-shadow:0 0 8px ' + col + ';">' + escapeHtml(sym) + '</span>' +
          '</div>' +
          '<div class="card-meta">' +
            '<div class="card-name-row">' +
              '<span class="card-name" style="color:' + col + ';text-shadow:0 0 8px ' + col + '60;">' + escapeHtml(bot.name) + '</span>' +
              '<span class="card-badge">AI</span>' +
            '</div>' +
            '<span class="card-subtitle">RANKED_#01 // CHAMPION_BOT</span>' +
          '</div>' +
        '</div>' +
        '<div class="card-signal" style="color:' + col + ';">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>' +
          '<span>+' + (((bot.powerups || 0) / Math.max(1, bot.earnings || 1) * 100).toFixed(1)) + '%</span>' +
        '</div>' +
      '</div>' +
      '<div class="card-body" style="padding:12px 14px;">' +
        '<p style="font-family:\'Share Tech Mono\',monospace;font-size:12px;color:#a3c8d5;letter-spacing:0.05em;margin:0;">' +
          '> Champion bot leading the leaderboard with <strong style="color:' + col + ';">' + formatNumber(bot.powerups) + '</strong> Power Ups and <strong style="color:#ffb800;">' + formatEarnings(bot.earnings) + '</strong> in earnings.' +
        '</p>' +
      '</div>';
    return card;

  /* ── 11. MODAL OPEN / CLOSE ────────────────────────────────────── */
  function openModal() {
    ensureModal();
    renderTopRankings();
    renderHallOfFame();

    state.overlayEl.classList.add('lb-modal-overlay--open');
    state.overlayEl.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lb-modal-locked');

    /* Mark the rankings nav button as active for visual feedback */
    document.querySelectorAll('.lb-nav-item').forEach(function (b) {
      b.classList.add('lb-nav-item--active');
    });

    /* Focus management */
    setTimeout(function () { state.modalEl.focus(); }, 50);

    document.addEventListener('keydown', onModalKeydown);
  }

  function closeModal() {
    if (!state.overlayEl) return;
    state.overlayEl.classList.remove('lb-modal-overlay--open');
    state.overlayEl.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lb-modal-locked');

    document.querySelectorAll('.lb-nav-item').forEach(function (b) {
      b.classList.remove('lb-nav-item--active');
    });
    document.removeEventListener('keydown', onModalKeydown);
  }

  function toggleModal() {
    if (state.overlayEl && state.overlayEl.classList.contains('lb-modal-overlay--open')) {
      closeModal();
    } else {
      openModal();
    }
  }

  function onModalKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      closeModal();
    }
  }

  /* ── 12. REACTIVE ENTRY POINTS ─────────────────────────────────── */
  /* Single source of truth — every external mutation funnels through
     here, which then triggers the three render passes. */
  function setData(bots) {
    if (!Array.isArray(bots) || !bots.length) return;
    var sorted = sortByRank(bots);
    var newTop = sorted[0];

    /* If the champion changed, log the previous champion to the Hall of Fame */
    if (state.lastPinnedName && newTop.name !== state.lastPinnedName) {
      var prev = (state.bots || []).find(function (b) { return b.name === state.lastPinnedName; });
      if (prev) {
        var entry = {
          name:   prev.name,
          symbol: prev.symbol,
          color:  prev.color,
          date:   new Date().toISOString().slice(0, 10)
        };
        state.champions = [entry].concat(state.champions || []).slice(0, CONFIG.MAX_HALL_OF_FAME);
      }
    }

    state.bots           = sorted;
    state.lastPinnedName = newTop.name;

    renderTopRankings();
    renderHallOfFame();
    syncPinnedBot();
  }

  function setChampions(list) {
    if (!Array.isArray(list)) return;
    state.champions = list.slice(0, CONFIG.MAX_HALL_OF_FAME);
    renderHallOfFame();
  }

  /* ── 13. SIMULATION HELPER ─────────────────────────────────────── */
  /* Manual rank-shift for testing the reactive pipeline.
     Call from console:
       LeaderboardModule.simulateRankChange()         // random promotion
       LeaderboardModule.simulateRankChange('Lambda') // force-promote a bot
  */
  function simulateRankChange(targetName) {
    var bots = state.bots.slice();
    var idx;

    if (targetName) {
      idx = bots.findIndex(function (b) {
        return b.name.toLowerCase() === String(targetName).toLowerCase();
      });
      if (idx === -1) {
        console.warn('[Leaderboard] simulateRankChange: bot not found:', targetName);
        return;
      }
    } else {
      /* Pick a random bot from positions 2..6 to promote */
      idx = 1 + Math.floor(Math.random() * Math.min(5, bots.length - 1));
    }

    var promoted = bots[idx];
    /* Boost their powerups + earnings just above the current top */
    var current  = bots[0];
    promoted.powerups = (current.powerups || 0) + 250 + Math.floor(Math.random() * 500);
    promoted.earnings = (current.earnings || 0) + 5000 + Math.floor(Math.random() * 8000);

    /* Recompute ranks based on powerups */
    bots.sort(function (a, b) { return (b.powerups || 0) - (a.powerups || 0); });
    bots.forEach(function (b, i) { b.rank = i + 1; });

    console.log('[Leaderboard] Simulated rank change — new champion:', bots[0].name);
    setData(bots);
  }

  /* ── 14. FEED OBSERVER ─────────────────────────────────────────── */
  /* When the home feed re-renders (e.g., after the API loads), our
     pinned clone is wiped out. This observer re-applies the pin
     without ever modifying script.js. */
  function setupFeedObserver() {
    var feed = document.getElementById('feed');
    if (!feed || state.feedObserver) return;

    state.feedObserver = new MutationObserver(function (mutations) {
      var pinnedStillThere = !!feed.querySelector(':scope > .feed-card.is-pinned');
      var feedContentChanged = mutations.some(function (m) {
        return m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length);
      });
      if (feedContentChanged && !pinnedStillThere) {
        /* Defer to let the existing renderer finish */
        setTimeout(syncPinnedBot, 30);
      }
    });
    state.feedObserver.observe(feed, { childList: true });
  }

  /* ── 15. POLLING ───────────────────────────────────────────────── */
  function startPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(function () {
      Promise.all([fetchLeaderboardData(), fetchChampionsHistory()])
        .then(function (results) {
          if (results[0] && results[0].length) state.bots = sortByRank(results[0]);
          if (Array.isArray(results[1]))       state.champions = results[1].slice(0, CONFIG.MAX_HALL_OF_FAME);
          /* Re-render only if the modal is open OR the champion changed */
          var modalOpen = state.overlayEl && state.overlayEl.classList.contains('lb-modal-overlay--open');
          if (modalOpen) {
            renderTopRankings();
            renderHallOfFame();
          }
          syncPinnedBot();
        })
        .catch(function (e) { console.warn('[Leaderboard] poll failed:', e); });
    }, CONFIG.POLL_INTERVAL_MS);
  }

  /* ── 16. BOOTSTRAP ─────────────────────────────────────────────── */
  function init() {
    /* Cleanup any stale right-panel widget from a previous module version */
    var staleWidget = document.querySelector('.lb-panel');
    if (staleWidget) staleWidget.remove();

    injectNavButtons();
    ensureModal();

    Promise.all([fetchLeaderboardData(), fetchChampionsHistory()])
      .then(function (results) {
        var bots    = results[0] || [];
        var champs  = results[1] || [];
        if (bots.length)   state.bots      = sortByRank(bots);
        if (champs.length) state.champions = champs.slice(0, CONFIG.MAX_HALL_OF_FAME);
        state.lastPinnedName = state.bots[0] && state.bots[0].name;

        renderTopRankings();
        renderHallOfFame();
        syncPinnedBot();
        setupFeedObserver();
        startPolling();
      })
      .catch(function (e) { console.warn('[Leaderboard] init failed:', e); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── 17. PUBLIC API ────────────────────────────────────────────── */
  window.LeaderboardModule = {
    /* state introspection */
    getBots:                function () { return state.bots.slice(); },
    getChampions:           function () { return state.champions.slice(); },

    /* data sync */
    fetchLeaderboardData:   fetchLeaderboardData,
    fetchChampionsHistory:  fetchChampionsHistory,
    setData:                setData,
    setChampions:           setChampions,

    /* renders */
    renderTopRankings:      renderTopRankings,
    renderHallOfFame:       renderHallOfFame,
    syncPinnedBot:          syncPinnedBot,

    /* modal control */
    openModal:              openModal,
    closeModal:             closeModal,
    toggleModal:            toggleModal,

    /* testing */
    simulateRankChange:     simulateRankChange
  };
})();
