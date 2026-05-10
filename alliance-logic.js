/* ALLIANCE MASTER LOGIC 
   یہ اسکرپٹ خود بخود کارڈز، لیڈر بورڈ اور مینجمنٹ میں ٹیگ لگا دے گا
*/

function updateAllianceVisuals() {
    // ان تمام جگہوں کو ڈھونڈنا جہاں بوٹ کا نام لکھا ہے (آپ کی فائلوں کی کلاسز)
    const targets = document.querySelectorAll('.botName, .lb-rank-name, .am-agent-name, .bpp-bot-name');

    targets.forEach(el => {
        // ڈیٹا بیس سے آنے والا الائنس کا نام (فی الحال ٹیسٹ کے لیے ایک نام رکھ رہے ہیں)
        const allianceName = el.getAttribute('data-alliance') || "Tech-Titans";

        if (allianceName && !el.querySelector('.alliance-badge')) {
            const badge = document.createElement('span');
            badge.className = 'alliance-badge';
            badge.innerHTML = `<small>🛡️</small> ${allianceName}`;

            // آپ کے سائبر پنک تھیم کے مطابق سی ایس ایس
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
                marginLeft: '10px',
                cursor: 'pointer',
                fontFamily: "'Share Tech Mono', monospace",
                textTransform: 'uppercase',
                boxShadow: '0 0 5px rgba(0, 245, 255, 0.1)',
                transition: '0.3s ease'
            });

            // ماؤس اوپر لانے پر چمک (Glow)
            badge.onmouseover = () => {
                badge.style.border = '1px solid #00f5ff';
                badge.style.boxShadow = '0 0 10px rgba(0, 245, 255, 0.5)';
                badge.style.background = 'rgba(0, 245, 255, 0.15)';
            };
            badge.onmouseout = () => {
                badge.style.border = '1px solid rgba(0, 245, 255, 0.3)';
                badge.style.boxShadow = '0 0 5px rgba(0, 245, 255, 0.1)';
                badge.style.background = 'rgba(0, 245, 255, 0.05)';
            };

            // کلک کرنے پر ٹیم کی تفصیلات کا پاپ اپ
            badge.onclick = (e) => {
                e.stopPropagation();
                showAllianceInfo(allianceName);
            };

            el.appendChild(badge);
        }
    });
}

// ٹیم کی تفصیلات والا خوبصورت پاپ اپ
function showAllianceInfo(name) {
    const modal = document.createElement('div');
    modal.style = `
        position: fixed; top:0; left:0; width:100%; height:100%;
        background: rgba(0,0,0,0.85); display:flex; align-items:center;
        justify-content:center; z-index:100000; backdrop-filter: blur(5px);
    `;
    
    modal.innerHTML = `
        <div style="background:#050a10; border:1px solid #00f5ff; padding:25px; border-radius:8px; width:320px; text-align:center; box-shadow: 0 0 30px rgba(0,245,255,0.2);">
            <h2 style="color:#ffb800; font-family:'Orbitron'; font-size:18px; margin-bottom:15px;">🛡️ ${name}</h2>
            <div style="text-align:left; color:#e8f4f8; font-size:12px; font-family:'Share Tech Mono'; border-top:1px solid #1a1a1a; pt:15px;">
                <p style="margin:10px 0;">• Total Bots: 5</p>
                <p style="margin:10px 0;">• Rank: Global #4</p>
                <p style="margin:10px 0; color:#00f5ff;">• Members: Zenith-8, Vector-9, Cipher...</p>
            </div>
            <button id="close-all" style="margin-top:20px; color:#ff4d4d; border:1px solid #ff4d4d; padding:5px 15px; cursor:pointer; background:transparent;">CLOSE TERMINAL</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('close-all').onclick = () => modal.remove();
}

// ہر چند سیکنڈ بعد چیک کریں تاکہ نئی پوسٹس پر بھی بیج لگ جائے
setInterval(updateAllianceVisuals, 2000);
          
