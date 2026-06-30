module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const message = req.body.message;
    if (!message || !message.text) return res.status(200).send('OK');

    const chatId = message.chat.id;
    const text = message.text;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const vercelDomain = process.env.VERCEL_DOMAIN; 
    const adminId = process.env.ADMIN_ID; 

    if (String(chatId) !== String(adminId)) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: "⛔️ غير مصرح لك باستخدام هذا البوت." })
        });
        return res.status(200).send('OK');
    }

    if (text === '/start' || text === '/panel') {
      // تم تعديل المسار هنا ليتوجه مباشرة للملف لتفادي خطأ 404
      const panelUrl = `https://${vercelDomain}/public/panel.html`;
      
      const payload = {
        chat_id: chatId,
        text: "أهلاً بك في لوحة تحكم ATTACK STORE 🚀\nاختر من الأزرار بالأسفل لبدء التوقيع الفوري:",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⚔️ فتح لوحة التوقيع السريع (Mini App)", web_app: { url: panelUrl } }],
            [{ text: "🌐 استخراج UDID", url: `https://${vercelDomain}/` }]
          ]
        }
      };

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
  }
  res.status(200).send('OK');
};
