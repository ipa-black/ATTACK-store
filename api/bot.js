module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('OK');

  const message = req.body.message;
  const callbackQuery = req.body.callback_query; 

  let chatId, text;
  if (message && message.text) {
      chatId = String(message.chat.id);
      text = message.text.trim();
  } else if (callbackQuery) {
      chatId = String(callbackQuery.message.chat.id);
      text = callbackQuery.data;
  } else {
      return res.status(200).send('OK');
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const vercelDomain = process.env.VERCEL_DOMAIN; 
  const mainAdminId = String(process.env.ADMIN_ID); 

  // --- نظام تخزين المشرفين والحالة ---
  if (!global.moderators) global.moderators = {}; 
  if (!global.adminState) global.adminState = {};

  const isMainAdmin = chatId === mainAdminId;
  const isMod = global.moderators[chatId] !== undefined;

  // دالة مساعدة لإرسال الرسائل
  const sendMessage = async (id, msg, markup = null) => {
    const payload = { chat_id: id, text: msg };
    if (markup) payload.reply_markup = markup;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  };

  // 1. حماية البوت
  if (!isMainAdmin && !isMod) {
      await sendMessage(chatId, "⛔️ غير مصرح لك باستخدام هذا البوت.");
      return res.status(200).send('OK');
  }

  // 2. إدارة المشرفين (للمدير الأساسي فقط)
  if (isMainAdmin) {
      if (text === 'admin_manage_btn') {
          await sendMessage(chatId, "👑 **قائمة أوامر الإدارة:**\n\n- لإضافة مشرف أرسل: `/addmod`\n- لعزل مشرف أرسل: `/delmod`\n- لعرض المشرفين أرسل: `/mods`");
          return res.status(200).send('OK');
      }

      if (text === '/addmod') {
          global.adminState[chatId] = { step: 'WAITING_MOD_ID' };
          await sendMessage(chatId, "👤 أرسل الآن آي دي (ID) المشرف الجديد:");
          return res.status(200).send('OK');
      }

      if (global.adminState[chatId]?.step === 'WAITING_MOD_ID') {
          global.adminState[chatId].tempId = text;
          global.adminState[chatId].step = 'WAITING_MOD_NAME';
          await sendMessage(chatId, "✅ تم استلام الآي دي. أرسل الآن اسم المشرف:");
          return res.status(200).send('OK');
      }

      if (global.adminState[chatId]?.step === 'WAITING_MOD_NAME') {
          const modId = global.adminState[chatId].tempId;
          global.moderators[modId] = text;
          delete global.adminState[chatId];
          await sendMessage(chatId, `✅ تم إضافة المشرف بنجاح!\nالاسم: ${text}\nالآي دي: ${modId}`);
          return res.status(200).send('OK');
      }

      if (text === '/delmod') {
          global.adminState[chatId] = { step: 'WAITING_DEL_ID' };
          await sendMessage(chatId, "🗑 أرسل آي دي (ID) المشرف الذي تريد عزله:");
          return res.status(200).send('OK');
      }

      if (global.adminState[chatId]?.step === 'WAITING_DEL_ID') {
          if (global.moderators[text]) {
              const modName = global.moderators[text];
              delete global.moderators[text];
              await sendMessage(chatId, `✅ تم عزل المشرف (${modName}) بنجاح.`);
          } else {
              await sendMessage(chatId, "⚠️ الآي دي غير موجود في قائمة المشرفين.");
          }
          delete global.adminState[chatId];
          return res.status(200).send('OK');
      }

      if (text === '/mods') {
          let list = "📋 قائمة المشرفين الحاليين:\n\n";
          const keys = Object.keys(global.moderators);
          if (keys.length === 0) list = "لا يوجد مشرفين حالياً.";
          else keys.forEach(id => { list += `- ${global.moderators[id]} (ID: ${id})\n`; });
          
          await sendMessage(chatId, list);
          return res.status(200).send('OK');
      }
  }

  // 3. لوحة التحكم الأساسية
  if (text.startsWith('/start') || text === '/panel') {
    const panelUrl = `https://${vercelDomain}/panel.html`;
    const udidUrl = `https://${vercelDomain}/`; 
    
    // إعداد نص ورابط التحويل المباشر
    const shareText = "أهلاً بك في لوحة تحكم ATTACK STORE 🚀\nلاستخراج UDID والتوقيع الفوري:";
    const directShareUrl = `https://t.me/share/url?url=${encodeURIComponent(udidUrl)}&text=${encodeURIComponent(shareText)}`;

    // الأزرار الافتراضية
    let inline_keyboard = [
      [{ text: "🧭 فتح لوحة التحكم في سفاري", url: panelUrl }],
      [{ text: "🌐 استخراج UDID", url: udidUrl }],
      // زر يفتح واجهة تيليجرام لتحويل الرسالة لأي شخص أو قناة فوراً
      [{ text: "↗️ تحويل الرسالة بشكل مباشر", url: directShareUrl }],
      // زر الإنلاين الذي كان موجوداً مسبقاً
      [{ text: "🔄 مشاركة عبر الإنلاين", switch_inline_query: "تفضل رابط المتجر للاستخراج" }]
    ];

    // إضافة زر الإدارة للمدير الرئيسي فقط
    if (isMainAdmin) {
      inline_keyboard.push([{ text: "👑 أوامر إدارة المشرفين", callback_data: "admin_manage_btn" }]);
    }

    const markup = { inline_keyboard };

    await sendMessage(chatId, "أهلاً بك في الرئيسية 🚀\nاختر من الأزرار بالأسفل لبدء العمل:", markup);
  }

  res.status(200).send('OK');
};
