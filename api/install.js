module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('OK');

  const message = req.body.message;
  if (!message || !message.text) return res.status(200).send('OK');

  const chatId = String(message.chat.id);
  const text = message.text.trim();
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const vercelDomain = process.env.VERCEL_DOMAIN; 
  const mainAdminId = String(process.env.ADMIN_ID); 

  // --- نظام تخزين المشرفين والحالة ---
  // ملاحظة: المتغيرات العامة (global) قد يتم تصفيرها في Vercel عند الـ Cold Start.
  // للإنتاج المستقر، يُفضل ربطها بقاعدة بيانات بسيطة مثل Vercel KV.
  if (!global.moderators) global.moderators = {}; 
  if (!global.adminState) global.adminState = {};

  const isMainAdmin = chatId === mainAdminId;
  const isMod = global.moderators[chatId] !== undefined;

  // دالة مساعدة لإرسال الرسائل لتقليل تكرار الكود
  const sendMessage = async (id, msg, markup = null) => {
    const payload = { chat_id: id, text: msg };
    if (markup) payload.reply_markup = markup;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  };

  // 1. حماية البوت (التحقق من الصلاحيات)
  if (!isMainAdmin && !isMod) {
      await sendMessage(chatId, "⛔️ غير مصرح لك باستخدام هذا البوت.");
      return res.status(200).send('OK');
  }

  // 2. إدارة المشرفين (للمشرف الأساسي فقط)
  if (isMainAdmin) {
      // بدء إضافة مشرف
      if (text === '/addmod') {
          global.adminState[chatId] = { step: 'WAITING_MOD_ID' };
          await sendMessage(chatId, "👤 أرسل الآن آي دي (ID) المشرف الجديد:");
          return res.status(200).send('OK');
      }

      // استلام الـ ID وطلب الاسم
      if (global.adminState[chatId]?.step === 'WAITING_MOD_ID') {
          global.adminState[chatId].tempId = text;
          global.adminState[chatId].step = 'WAITING_MOD_NAME';
          await sendMessage(chatId, "✅ تم استلام الآي دي. أرسل الآن اسم المشرف:");
          return res.status(200).send('OK');
      }

      // استلام الاسم وحفظ المشرف
      if (global.adminState[chatId]?.step === 'WAITING_MOD_NAME') {
          const modId = global.adminState[chatId].tempId;
          global.moderators[modId] = text;
          delete global.adminState[chatId]; // إنهاء حالة الانتظار
          await sendMessage(chatId, `✅ تم إضافة المشرف بنجاح!\nالاسم: ${text}\nالآي دي: ${modId}`);
          return res.status(200).send('OK');
      }

      // بدء عزل مشرف
      if (text === '/delmod') {
          global.adminState[chatId] = { step: 'WAITING_DEL_ID' };
          await sendMessage(chatId, "🗑 أرسل آي دي (ID) المشرف الذي تريد عزله:");
          return res.status(200).send('OK');
      }

      // تنفيذ العزل
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

      // عرض قائمة المشرفين
      if (text === '/mods') {
          let list = "📋 قائمة المشرفين الحاليين:\n\n";
          const keys = Object.keys(global.moderators);
          if (keys.length === 0) list = "لا يوجد مشرفين حالياً.";
          else keys.forEach(id => { list += `- ${global.moderators[id]} (ID: ${id})\n`; });
          
          await sendMessage(chatId, list);
          return res.status(200).send('OK');
      }
  }

  // 3. لوحة التحكم الأساسية (للمدير والمشرفين)
  if (text === '/start' || text === '/panel') {
    const panelUrl = `https://${vercelDomain}/panel.html`;
    const udidUrl = `https://${vercelDomain}/`; // مسار الاستخراج
    
    const markup = {
      inline_keyboard: [
        // أزرار URL عادية تفتح في سفاري وتكون قابلة للتحويل (Forward)
        [{ text: "🧭 فتح لوحة التحكم في سفاري", url: panelUrl }],
        [{ text: "🌐 استخراج UDID", url: udidUrl }],
        // زر يتيح للمشرف مشاركة البوت والرسالة برمجياً
        [{ text: "↗️ تحويل / مشاركة البوت", switch_inline_query: "تفضل رابط البوت" }]
      ]
    };

    await sendMessage(chatId, "أهلاً بك في الرئيسية 🚀\nاختر من الأزرار بالأسفل لبدء العمل:", markup);
  }

  res.status(200).send('OK');
};
