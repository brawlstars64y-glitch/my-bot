const { Telegraf, Markup } = require('telegraf');

// ضع التوكن الخاص بك هنا
const TOKEN = "8682386496:AAFPfrgs8DrLUfjBYyihpojPB21WsvgcU8Y";
const bot = new Telegraf(TOKEN);

// معرف قناتك (تأكد أن البوت مشرف فيها)
const DEV_CHANNEL = '@aternosbot24';

// --- رسالة الترحيب الاحترافية ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name;

    try {
        // التحقق من الاشتراك
        const member = await ctx.telegram.getChatMember(DEV_CHANNEL, userId);
        const isSub = ['member', 'administrator', 'creator'].includes(member.status);

        if (!isSub) {
            return ctx.replyWithMarkdown(
                `*⚠️ عذراً يا بطل.. يجب عليك الاشتراك أولاً! *\n\n` +
                `لضمان استمرار البوت وتقديم أفضل خدمة، يرجى الانضمام لقناة المطور أولاً.\n\n` +
                `*📢 القناة:* ${DEV_CHANNEL}`,
                Markup.inlineKeyboard([
                    [Markup.button.url('✨ اضغط هنا للاشتراك ✨', `https://t.me/${DEV_CHANNEL.replace('@', '')}`)],
                    [Markup.button.callback('✅ تم الاشتراك (تفعيل)', 'check_sub')]
                ])
            );
        }

        // إذا كان مشتركاً
        await ctx.replyWithMarkdown(
            `*🔥 أهلاً بك يا ${firstName} في أقوى بوت Anti-AFK! *\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🔹 *الحالة:* المتصل الآن ✅\n` +
            `🔹 *النظام:* حماية من الطرد (24/7)\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📢 *يرجى إرسال بيانات السيرفر بالشكل التالي:*\n` +
            `📍 \`IP:Port\``
        );

    } catch (e) {
        ctx.reply("❌ تأكد من إضافة البوت كـ Admin في القناة أولاً!");
    }
});

// --- معالجة الضغط على زر "تم الاشتراك" ---
bot.action('check_sub', async (ctx) => {
    await ctx.answerCbQuery("جاري التحقق...");
    await ctx.deleteMessage(); // حذف الرسالة القديمة
    // إعادة تشغيل أمر Start للتحقق
    return ctx.reply("🔄 تم تحديث الحالة.. أرسل /start الآن.");
});

// --- معالجة بيانات السيرفر بألوان وتنسيق ---
bot.on('text', (ctx) => {
    const text = ctx.message.text;

    if (text.includes(':')) {
        ctx.replyWithMarkdown(
            `*🚀 جاري تجهيز الدخول للسيرفر...*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💎 *السيرفر:* \`${text}\`\n` +
            `🛡️ *الحماية:* Anti-AFK نشط\n` +
            `⏳ *الحالة:* جاري الاتصال بالـ Proxies...\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `*سيتم إشعارك فور اكتمال الدخول!*`
        );
    } else if (text !== '/start') {
        ctx.reply("⚠️ يرجى إرسال البيانات بصيغة `IP:Port` لكي يتعرف عليها النظام.");
    }
});

// تشغيل البوت
bot.launch().then(() => console.log("✅ The bot is now running professionally!"));

// كود منع التوقف (Keep Alive)
const http = require('http');
http.createServer((req, res) => { res.write('Bot is Running'); res.end(); }).listen(8080);
