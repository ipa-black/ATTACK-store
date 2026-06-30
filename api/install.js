module.exports = (req, res) => {
  const { udid } = req.query;
  if (!udid) return res.status(400).send("UDID is required");

  const host = req.headers.host;
  const manifestUrl = `https://${host}/users/${udid}/manifest.plist?t=${Date.now()}`;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ATTACK STORE</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; text-align: center; background: radial-gradient(circle at 50% 0%, #15382e 0%, #08120e 100%); margin: 0; padding: 40px 20px; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .card { background: rgba(10, 25, 20, 0.5); padding: 40px 25px; border-radius: 35px; box-shadow: 0 15px 50px rgba(0,0,0,0.8); max-width: 360px; width: 100%; border: 1px solid rgba(0, 255, 136, 0.2); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); }
        .avatar-container { width: 140px; height: 140px; margin: 0 auto 20px auto; position: relative; }
        .avatar-svg { width: 100%; height: 100%; filter: drop-shadow(0 0 20px rgba(0,255,136,0.4)); }
        .success-text { color: #00ff88; font-size: 26px; font-weight: 900; margin: 0 0 5px 0; text-shadow: 0 2px 10px rgba(0, 255, 136, 0.4); }
        .store-name { color: #fff; font-size: 16px; font-weight: bold; letter-spacing: 3px; margin-bottom: 20px; opacity: 0.9; }
        p { color: #92bbae; font-size: 14px; margin-bottom: 30px; line-height: 1.6; }
        .udid-badge { display: inline-block; background: rgba(0, 255, 136, 0.1); padding: 8px 16px; border-radius: 12px; font-family: monospace; font-size: 11px; color: #00ff88; margin-top: 15px; border: 1px solid rgba(0, 255, 136, 0.3); }
        .btn { display: flex; align-items: center; justify-content: center; gap: 12px; background: linear-gradient(135deg, #00ff88, #00b35f); color: #03140d; padding: 16px; border-radius: 20px; text-decoration: none; font-weight: 900; font-size: 17px; box-shadow: 0 8px 25px rgba(0, 255, 136, 0.3); transition: all 0.2s; }
        .btn:active { transform: scale(0.96); box-shadow: 0 4px 15px rgba(0, 255, 136, 0.5); }
        .btn svg { width: 22px; height: 22px; fill: currentColor; }
    </style>
</head>
<body>
    <div class="card">
        <div class="avatar-container">
            <svg class="avatar-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <clipPath id="circleView"><circle cx="60" cy="60" r="54" /></clipPath>
                    <linearGradient id="glowBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#00ff88" /><stop offset="100%" stop-color="#004422" />
                    </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="57" fill="none" stroke="url(#glowBorder)" stroke-width="3" stroke-dasharray="25 10">
                    <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="8s" repeatCount="indefinite" />
                </circle>
                <image href="https://up6.cc/2026/06/178282519043891.png" x="6" y="6" width="108" height="108" clip-path="url(#circleView)" preserveAspectRatio="xMidYMid slice" />
            </svg>
        </div>
        <h2 class="success-text">تم تفعيل اشتراكك</h2>
        <div class="store-name">ATTACK STORE</div>
        <p>اضغط على زر التثبيت أدناه لتثبيت المتجر على جهازك مباشرة.<br><span class="udid-badge">UDID: ${udid}</span></p>
        <a href="itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}" class="btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            تثبيت المتجر
        </a>
    </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};
