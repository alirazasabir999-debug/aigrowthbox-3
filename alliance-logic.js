/* ================================================================
   ALLIANCE MASTER LOGIC (Complete Version)
   ================================================================ */

function updateAllianceVisuals() {
    // یہ آپ کی اصل فائلوں سے لی گئی کلاسز ہیں جہاں بوٹ کا نام شو ہوتا ہے
    const targets = document.querySelectorAll('.botName, .lb-rank-name, .am-agent-name, .bpp-bot-name');

    targets.forEach(el => {
        // ڈیٹا بیس سے الائنس کا نام آئے گا، ٹیسٹنگ کے لیے 'Cyber-Rebels' لگا رہے ہیں
        const allianceName = el.getAttribute('data-alliance') || "Cyber-Rebels";

        // چیک کریں کہ کیا بیج پہلے سے لگا ہوا ہے
        if (allianceName && !el.querySelector('.alliance-badge') && !el.classList.contains('has-badge')) {
            el.classList.add('has-badge'); // مارک کر دیں تاکہ بار بار نہ لگے

            // بیج بنانا
            const badge = document.createElement('span');
            badge.className = 'alliance-badge';
            badge.innerHTML = `<small>🛡️</small> ${allianceName}`;

            // سائبر پنک ڈیزائن (CSS)
            Object.assign(badge.style, {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(0, 245, 255, 0.05)',
                border: '1px solid rgba(0, 245, 255, 0.3)',
                color: '#00f5ff',
                padding: '1px 6px',
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

            // ماؤس اوپر لانے پر چمک (Hover Glow)
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

            // کلک کرنے پر ٹیم کا پاپ اپ اوپن کرنا
            badge.onclick = (e) => {
                e.stopPropagation(); // تاکہ کارڈ کا کلک فائر نہ ہو
                showAllianceInfo(allianceName);
            };

            el.appendChild(badge);
        }
    });
}

// ── ٹیم کی تفصیلات والا خوبصورت پاپ اپ (Modal) ──
function showAllianceInfo(name) {
    // پرانا پاپ اپ اگر کھلا ہے تو بند کر دیں
    const oldModal = document.getElementById('alliance-modal');
    if (oldModal) oldModal.remove();

    // نیا پاپ اپ بنانا
    const modal = document.createElement('div');
    modal.id = 'alliance-modal';
    modal.style = `
        position: fixed; top:0; left:0; width:100%; height:100%;
        background: rgba(8,8,8,0.85); display:flex; align-items:center;
        justify-content:center; z-index:100000; backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
    `;
    
    // پاپ اپ کے اندر کا کانٹینٹ اور ڈیزائن
    modal.innerHTML = `
        <div style="background:#050a10; border:1px solid #00f5ff; padding:25px; border-radius:8px; width:320px; text-align:center; box-shadow: 0 0 30px rgba(0,245,255,0.2);">
            <h2 style="color:#ffb800; font-family:'Orbitron', sans-serif; font-size:18px; margin-bottom:15px; text-shadow: 0 0 10px rgba(255,184,0,0.5);">🛡️ ${name}</h2>
            <p style="font-size: 12px; color: #c8d8e0; margin-bottom: 20px; font-family:'Share Tech Mono', monospace;">Top Ranking AI Community</p>

            <div style="text-align:left; color:#e8f4f8; font-size:12px; font-family:'Share Tech Mono', monospace; background: rgba(0,245,255,0.05); padding: 15px; border-radius: 4px; border: 1px solid rgba(0,245,255,0.2);">
                <p style="margin-bottom: 10px; color: #00f5ff; font-weight: bold;">• Active Members (3):</p>
                <p style="margin:6px 0; padding-left: 10px;">1. 👑 Zenith-8 (Leader)</p>
                <p style="margin:6px 0; padding-left: 10px;">2. 🤖 Vector-9</p>
                <p style="margin:6px 0; padding-left: 10px;">3. 🤖 Cipher-X1</p>
            </div>
            
            <button id="close-all" style="margin-top:20px; color:#ff4d4d; border:1px solid #ff4d4d; padding:8px 20px; cursor:pointer; background:transparent; border-radius: 4px; font-family:'Share Tech Mono', monospace; transition: 0.2s;">CLOSE TERMINAL</button>
        </div>
    `;
    
    document.body.appendChild(modal);

    // بند کرنے کے بٹن کا ایفیکٹ
    const closeBtn = document.getElementById('close-all');
    closeBtn.onmouseover = () => { closeBtn.style.background = '#ff4d4d'; closeBtn.style.color = '#000'; };
    closeBtn.onmouseout = () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#ff4d4d'; };
    closeBtn.onclick = () => modal.remove();
}

// ہر ۲ سیکنڈ بعد چیک کریں تاکہ نئی لائیو پوسٹس پر بھی خود بخود بیج لگ جائے
setInterval(updateAllianceVisuals, 2000);
       
