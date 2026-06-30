module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('OK');

  const message = req.body.message;
  const callbackQuery = req.body.callback_query; 

  let chatId, text, document, webAppData;
  if (message) {
      chatId = String(message.chat.id);
      text = message.text ? message.text.trim() : '';
      document = message.document;
      webAppData = message.web_app_data; 
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
  if (!global.signState) global.signState = {};

  const isMainAdmin = chatId === mainAdminId;
  const isMod = global.moderators[chatId] !== undefined;

  const sendMessage = async (id, msg, markup = null) => {
    const payload = { chat_id: id, text: msg, parse_mode: 'Markdown' };
    if (markup) payload.reply_markup = markup;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  };

  if (!isMainAdmin && !isMod) {
      await sendMessage(chatId, "⛔️ غير مصرح لك باستخدام هذا البوت.");
      return res.status(200).send('OK');
  }

  // --- 1. الرد عند رفع الشهادة من الـ Web App ---
  if (webAppData) {
      const udid = webAppData.data || "UNKNOWN_UDID"; 
      const installUrl = `https://${vercelDomain}/api/install?udid=${udid}`; 
      
      const markup = {
          inline_keyboard: [
              [{ text: "📲 تثبيت التطبيق", url: installUrl, style: "primary" }]
          ]
      };
      
      await sendMessage(chatId, "✅ تم تفعيل اشتراكك", markup);
      return res.status(200).send('OK');
  }

  // --- 2. استلام ملفات الشهادة واستخراج الـ UDID من الاسم ---
  if (document) {
      const fileName = document.file_name.toLowerCase();
      
      if (fileName.endsWith('.p12')) {
          try {
              const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${document.file_id}`);
              const fileData = await fileRes.json();
              
              if (fileData.ok) {
                  const filePath = fileData.result.file_path;
                  const fileDownloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
                  
                  // استخراج الـ UDID بحذف صيغة .p12 من اسم الملف
                  const extractedUdid = fileName.replace('.p12', '').trim();
                  
                  global.signState[chatId] = { 
                      step: 'WAITING_CERT_PASSWORD', 
                      fileUrl: fileDownloadUrl, 
                      udid: extractedUdid 
                  };
                  
                  await sendMessage(chatId, `🔐 تم استلام الشهادة.\nيرجى إرسال **الرمز السري (Password)** الخاص بالشهادة الآن:`);
              } else {
                  await sendMessage(chatId, "❌ حدث خطأ أثناء الوصول للملف.");
              }
          } catch (err) {
              await sendMessage(chatId, "❌ حدث خطأ في الاتصال.");
          }
      } else if (fileName.endsWith('.mobileprovision')) {
          await sendMessage(chatId, `✅ تم استلام ملف Provision.`);
      } else if (fileName.endsWith('.ipa')) {
          await sendMessage(chatId, "⏳ تم استلام تطبيق بصيغة IPA، جاري التجهيز...");
      } else {
          await sendMessage(chatId, "⚠️ يرجى إرسال ملفات الشهادة (.p12, .mobileprovision) أو تطبيقات (.ipa) فقط.");
      }
      return res.status(200).send('OK');
  }

  // --- 3. الرد بعد إدخال الرمز السري للشهادة ---
  if (global.signState[chatId]?.step === 'WAITING_CERT_PASSWORD' && text && !text.startsWith('/')) {
      // جلب الـ UDID الذي تم استخراجه مسبقاً من اسم الملف
      const udid = global.signState[chatId].udid;
      
      delete global.signState[chatId]; // إنهاء العملية ومسح الحالة
      
      const installUrl = `https://${vercelDomain}/api/install?udid=${udid}`; 
      const markup = {
          inline_keyboard: [
              [{ text: "📲 تثبيت التطبيق", url: installUrl, style: "primary" }]
          ]
      };
      
      await sendMessage(chatId, "✅ تم تفعيل اشتراكك", markup);
      return res.status(200).send('OK');
  }

  // --- 4. إدارة المشرفين ---
  if (isMainAdmin) {
      if (text === 'admin_manage_btn') {
          await sendMessage(chatId, "👑 **قائمة أوامر الإدارة:**\n- لإضافة مشرف: `/addmod`\n- لعزل مشرف: `/delmod`\n- لعرض المشرفين: `/mods`");
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
              await sendMessage(chatId, "⚠️ الآي دي غير موجود.");
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

  // --- 5. واجهة "الرئيسية" ---
  if (text.startsWith('/start') || text === '/panel') {
    const udidUrl = `https://${vercelDomain}/`; 
    
    let inline_keyboard = [
      [{ text: "🌐 استخراج UDID", url: udidUrl, style: "success" }]      
    ];

    if (isMainAdmin) {
      inline_keyboard.push([{ text: "👑 أوامر إدارة المشرفين", callback_data: "admin_manage_btn", style: "danger" }]); 
    }

    const markup = { inline_keyboard };

    await sendMessage(chatId, "أهلاً بك في **الرئيسية** 🚀\nقم باستخراج UDID، أو حوّل ملف الشهادة (.p12) ليبدأ البوت بالعمل:", markup);
  }

  res.status(200).send('OK');
};
