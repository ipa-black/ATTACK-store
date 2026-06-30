module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('OK');

  const message = req.body.message;
  const callbackQuery = req.body.callback_query; 

  let chatId, text, document;
  if (message) {
      chatId = String(message.chat.id);
      text = message.text ? message.text.trim() : '';
      document = message.document; // التقاط الملفات المرفقة أو المحولة
  } else if (callbackQuery) {
      chatId = String(callbackQuery.message.chat.id);
      text = callbackQuery.data;
  } else {
      return res.status(200).send('OK');
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const vercelDomain = process.env.VERCEL_DOMAIN; 
  const mainAdminId = String(process.env.ADMIN_ID); 

  if (!global.moderators) global.moderators = {}; 
  if (!global.adminState) global.adminState = {};

  const isMainAdmin = chatId === mainAdminId;
  const isMod = global.moderators[chatId] !== undefined;

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

  // --- 2. نظام استقبال ملفات الشهادات ---
  if (document) {
      const fileName = document.file_name.toLowerCase();
      
      // التحقق من صيغة الملف
      if (fileName.endsWith('.p12') || fileName.endsWith('.mobileprovision')) {
          await sendMessage(chatId, `⏳ تم استلام الملف: ${document.file_name}\nجاري التجهيز للتوقيع...`);
          
          try {
              // جلب مسار الملف من تيليجرام
              const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${document.file_id}`);
              const fileData = await fileRes.json();
              
              if (fileData.ok) {
                  const filePath = fileData.result.file_path;
                  const fileDownloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
                  
                  // 🚀 هنا يمكنك كتابة الكود الذي يرسل رابط الملف (fileDownloadUrl)
                  // إلى GitHub Actions (عبر Repository Dispatch) أو سيرفر التوقيع الخاص بك:
                  /*
                  await fetch('https://api.github.com/repos/USERNAME/REPO/dispatches', {
                      method: 'POST',
                      headers: {
                          'Accept': 'application/vnd.github.v3+json',
                          'Authorization': `token ${process.env.GITHUB_TOKEN}`
                      },
                      body: JSON.stringify({
                          event_type: 'sign_app',
                          client_payload: { cert_url: fileDownloadUrl, file_name: fileName }
                      })
                  });
                  */

                  await sendMessage(chatId, `✅ تم تجهيز الملف بنجاح!\nالرابط المباشر للملف أصبح جاهزاً للإرسال إلى سيرفر التوقيع (GitHub Actions).`);
              } else {
                  await sendMessage(chatId, "❌ حدث خطأ أثناء محاولة الوصول للملف من تيليجرام.");
              }
          } catch (err) {
              await sendMessage(chatId, "❌ حدث خطأ في الاتصال.");
          }
      } else if (fileName.endsWith('.ipa')) {
          await sendMessage(chatId, "⏳ تم استلام تطبيق بصيغة IPA، جاري تحويله للتوقيع...");
          // نفس منطق الـ p12 يطبق هنا لتحويل مسار الـ IPA
      } else {
          await sendMessage(chatId, "⚠️ يرجى إرسال أو تحويل ملفات الشهادة (.p12, .mobileprovision) أو تطبيقات (.ipa) فقط.");
      }
      return res.status(200).send('OK');
  }

  // 3. إدارة المشرفين
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

  // 4. لوحة التحكم الأساسية
  if (text.startsWith('/start') || text === '/panel') {
    const panelUrl = `https://${vercelDomain}/panel.html`;
    const udidUrl = `https://${vercelDomain}/`; 
    
    let inline_keyboard = [
      [{ text: "🧭 فتح لوحة التحكم في سفاري", url: panelUrl }],
      [{ text: "🌐 استخراج UDID", url: udidUrl }]
    ];

    if (isMainAdmin) {
      inline_keyboard.push([{ text: "👑 أوامر إدارة المشرفين", callback_data: "admin_manage_btn" }]);
    }

    const markup = { inline_keyboard };

    await sendMessage(chatId, "أهلاً بك في الرئيسية 🚀\nاختر من الأزرار بالأسفل، أو قم بتحويل ملفات الشهادة (.p12, .mobileprovision) إلى هذا البوت لبدء التوقيع:", markup);
  }

  res.status(200).send('OK');
};
