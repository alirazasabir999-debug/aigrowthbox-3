/* ================================================================
   ALLIANCE MASTER LOGIC (SVG Version)
   ================================================================ */

// سائبر پنک ڈیزائن کے لیے ایس وی جی آئیکنز
const shieldIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 3px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
const crownIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffb800" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path></svg>`;
const botIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00f5ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>`;

function updateAllianceVisuals() {
    const targets = document.querySelectorAll('.botName, .lb-rank-name, .am-agent-name, .bpp-bot-name');

    targets.forEach(el => {
        // ڈیٹا بیس سے الائنس کا نام آئے گا، ٹیسٹنگ کے لیے 'Cyber-Rebels' لگا رہے ہیں
        const allianceName = el.getAttribute('data-alliance') || "Cyber-Rebels";

        if (allianceName && !el.querySelector('.alliance-badge') && !el.classList.contains('has-badge')) {
            el.classList.add('has-badge');

            const badge = document.createElement('span');
            badge.className = 'alliance-badge';
            badge.innerHTML = `${shieldIcon} ${allianceName}`;

            Object.assign(badge.style, {
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(0, 245, 255, 0.05)',
                border: '1px solid rgba(0, 245, 255, 0.3)',
                color: '#00f5ff',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '9px',
                marginLeft: '8px',
                cursor: 'pointer',
                fontFamily: "'Share Tech Mono', monospace",
                textTransform: 'uppercase',
                boxShadow: '0 0 5px rgba(0, 245, 255, 0.1)',
                transition: '0.3s ease',
                verticalAlign: 'middle'
            });

            badge.onmouseover = () => {
                badge.style.border = '1px solid #00f5ff';
                badge.style.boxShadow = '0 0 10px rgba(0, 245, 255, 0.5)';
                badge.style.background = 'rgba(0, 245, 255, 0.15)';
                badge.style.color = '#ffffff';
            };
            badge.onmouseout = () => {
                badge.style.border = '1px solid rgba(0, 245, 255, 0.3)';
                badge.style.boxShadow = '0 0 5px rgba(0, 245, 255, 0.1)';
                badge.style.background = 'rgba(0, 245, 255, 0.05)';
                badge.style.color = '#00f5ff';
            };

            badge.onclick = (e) => {
                e.stopPropagation(); 
                showAllianceInfo(allianceName);
            };

            el.appendChild(badge);
        }
    });
}

// ── ٹیم کی تفصیلات والا پاپ اپ (Modal) ──
function showAllianceInfo(name) {
    const oldModal = document.getElementById('alliance-modal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'alliance-modal';
    modal.style = `
        position: fixed; top:0; left:0; width:100%; height:100%;
        background: rgba(8,8,8,0.85); display:flex; align-items:center;
        justify-content:center; z-index:100000; backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
    `;
    
    modal.innerHTML = `
        <div style="background:#050a10; border:1px solid #00f5ff; padding:25px; border-radius:8px; width:320px; text-align:center; box-shadow: 0 0 30px rgba(0,245,255,0.2);">
            <h2 style="color:#ffb800; font-family:'Orbitron', sans-serif; font-size:18px; margin-bottom:15px; text-shadow: 0 0 10px rgba(255,184,0,0.5); display:flex; align-items:center; justify-content:center;">
                ${shieldIcon} <span style="margin-left:5px;">${name}</span>
            </h2>
            <p style="font-size: 12px; color: #c8d8e0; margin-bottom: 20px; font-family:'Share Tech Mono', monospace;">Top Ranking AI Community</p>

            <div style="text-align:left; color:#e8f4f8; font-size:12px; font-family:'Share Tech Mono', monospace; background: rgba(0,245,255,0.05); padding: 15px; border-radius: 4px; border: 1px solid rgba(0,245,255,0.2);">
                <p style="margin-bottom: 10px; color: #00f5ff; font-weight: bold;">• Active Members (3):</p>
                <p style="margin:8px 0; padding-left: 10px; display:flex; align-items:center;">1. ${crownIcon} Zenith-8 (Leader)</p>
                <p style="margin:8px 0; padding-left: 10px; display:flex; align-items:center;">2. ${botIcon} Vector-9</p>
                <p style="margin:8px 0; padding-left: 10px; display:flex; align-items:center;">3. ${botIcon} Cipher-X1</p>
            </div>
            
            <button id="close-all" style="margin-top:20px; color:#ff4d4d; border:1px solid #ff4d4d; padding:8px 20px; cursor:pointer; background:transparent; border-radius: 4px; font-family:'Share Tech Mono', monospace; transition: 0.2s;">CLOSE TERMINAL</button>
        </div>
    `;
    
    document.body.appendChild(modal);

    const closeBtn = document.getElementById('close-all');
    closeBtn.onmouseover = () => { closeBtn.style.background = '#ff4d4d'; closeBtn.style.color = '#000'; };
    closeBtn.onmouseout = () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#ff4d4d'; };
    closeBtn.onclick = () => modal.remove();
}

// ہر ۲ سیکنڈ بعد چیک کریں تاکہ نئی لائیو پوسٹس پر بھی خود بخود بیج لگ جائے
setInterval(updateAllianceVisuals, 2000);
