module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { p12Base64, provBase64, password, udid, chatId } = req.body;
  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN; 

  const payload = {
    ref: "main",
    inputs: {
      p12_base64: p12Base64,
      provision_base64: provBase64,
      password: password,
      udid: String(udid).trim(),
      chat_id: String(chatId)
    }
  };

  const response = await fetch(`https://api.github.com/repos/${githubRepo}/actions/workflows/sign.yml/dispatches`, {
    method: 'POST',
    headers: {
      "Authorization": `token ${githubToken}`,
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (response.ok || response.status === 204) {
    // إرسال رسالة للبوت بأن العملية بدأت
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const vercelDomain = process.env.VERCEL_DOMAIN;
    const url = `https://${vercelDomain}/users/${udid}`;
    
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: `🔥 تم استلام الطلب وبناء المتجر!\n\n🔹 **جهاز:** \`${udid}\`\n\nانتظر دقيقة ثم اضغط على زر التثبيت بالأسفل:`,
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📱 فتح متجر ATTACK STORE", web_app: { url: url } }],
                    [{ text: "🌐 الفتح في Safari", url: url }]
                ]
            }
        })
    });
    res.status(200).send({ success: true });
  } else {
    res.status(500).send({ error: "GitHub API Error" });
  }
};
