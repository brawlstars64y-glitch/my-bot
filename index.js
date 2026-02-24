const { Telegraf, Markup } = require('telegraf');
const bedrock = require('bedrock-protocol');
const http = require('http');

// 1. إعدادات البوت - ضع التوكن الخاص بك هنا
const TOKEN = "8682386496:AAFPfrgs8DrLUfjBYyihpojPB21WsvgcU8Y";
const bot = new Telegraf(TOKEN);

// ذاكرة حفظ البيانات
const userServers = {};
const activeConnections = {};

// --- الواجهة الرئيسية الفخمة ---
bot.start((ctx) => {
    const userId = ctx.from.id;
    if (!userServers[userId]) userServers[userId] = [];

    ctx.replyWithMarkdown(
        `*┓━━ـ⚙️ لـوحـة تـحـكـم مـاكس بـلاك 🔥ـ━━┏*\n\n` +
        `أهلاً بك يا بطل في نظام الإدارة المتقدم.\n` +
        `• حالة النظام: *نشط وجاهز* ✅\n` +
        `• الإصدار: *Auto-Detection* 🚀\n\n` +
        `*استخدم الأزرار أدناه للتحكم:*`,
        Markup.inlineKeyboard([
            [Markup.button.callback('➕ إضـافـة سـيـرفـر جـديـد', 'add_server')],
            [Markup.button.callback('🖥️ سـيـرفـراتـي', 'my_servers')],
            [Markup.button.url('📢 قناة المطور', 'https://t.me/aternosbot24')]
        ])
    );
});

// --- إضافة سيرفر جديد ---
bot.action('add_server', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(`*📍 أرسل بيانات السيرفر الآن بصيغة:* \`IP:Port\``);
});

bot.on('text', async (ctx) => {
    const input = ctx.message.text;
    const userId = ctx.from.id;

    if (input.includes(':')) {
        if (!userServers[userId]) userServers[userId] = [];
        if (!userServers[userId].includes(input)) {
            userServers[userId].push(input);
            ctx.replyWithMarkdown(
                `✅ *تم حفظ السيرفر بنجاح!*\n📍 العنوان: \`${input}\`\n\n` +
                `اذهب الآن إلى "سيرفراتي" للتشغيل والتحكم.`,
                Markup.inlineKeyboard([[Markup.button.callback('🖥️ عرض السيرفرات', 'my_servers')]])
            );
        } else {
            ctx.reply("⚠️ هذا السيرفر موجود بالفعل في قائمتك.");
        }
    }
});

// --- عرض قائمة سيرفراتي ---
bot.action('my_servers', (ctx) => {
    const userId = ctx.from.id;
    const servers = userServers[userId] || [];

    if (servers.length === 0) {
        return ctx.answerCbQuery("❌ ليس لديك سيرفرات مضافة حالياً!", { show_alert: true });
    }

    const buttons = servers.map(srv => [Markup.button.callback(`🌐 سيرفر: ${srv}`, `manage_${srv}`)]);
    buttons.push([Markup.button.callback('⬅️ العودة للرئيسية', 'main_menu')]);

    ctx.editMessageText(`*🖥️ قائمة سيرفراتك الخاصة:*\nاختر السيرفر لفتح لوحة التحكم الخاصة به:`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
    });
});

// --- لوحة تحكم السيرفر (بدء / إيقاف / حذف) ---
bot.action(/manage_(.+)/, (ctx) => {
    const serverIP = ctx.match[1];
    ctx.answerCbQuery();
    const isRunning = activeConnections[serverIP] ? "نشط وشغال ✅" : "متوقف حالياً 🛑";
    
    ctx.editMessageText(
        `*⚙️ إعدادات السيرفر:* \`${serverIP}\`\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 *الحالة:* ${isRunning}\n` +
        `🛡️ *النظام:* Anti-AFK (Auto Version)\n` +
        `━━━━━━━━━━━━━━━━━━━━`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🚀 تشغيل البوت', `start_bot_${serverIP}`)],
                [Markup.button.callback('🛑 إيقاف البوت', `stop_bot_${serverIP}`)],
                [Markup.button.callback('🗑️ حذف السيرفر', `delete_${serverIP}`)],
                [Markup.button.callback('⬅️ عودة', 'my_servers')]
            ])
        }
    );
});

// --- نظام تشغيل البوت (AUTO VERSION) ---
bot.action(/start_bot_(.+)/, async (ctx) => {
    const serverData = ctx.match[1];
    const [host, port] = serverData.split(':');

    if (activeConnections[serverData]) {
        return ctx.answerCbQuery("⚠️ البوت شغال بالفعل!");
    }

    ctx.answerCbQuery("⚡ جاري الاتصال التلقائي...");
    
    try {
        const client = bedrock.createClient({
            host: host,
            port: parseInt(port),
            offline: true, // مهم لأتيرنوس (Cracked)
            username: `MaxBlack_${Math.floor(Math.random() * 9999)}`,
            skipPing: false // يسمح للمكتبة بمعرفة الإصدار تلقائياً
        });

        activeConnections[serverData] = client;

        client.on('spawn', () => {
            console.log(`[CONNECTED] -> ${serverData}`);
            // منع الـ AFK عن طريق إرسال حزم حركة بسيطة
            setInterval(() => {
                if (activeConnections[serverData]) {
                    client.queue('move_player', { runtime_id: client.entityId, position: { x: 0, y: 0, z: 0 }, on_ground: true });
                }
            }, 30000);
        });

        client.on('error', (err) => {
            console.log(`[MC ERROR] -> ${err.message}`);
            delete activeConnections[serverData];
        });

        ctx.editMessageText(
            `*🚀 تـم تـشـغـيـل الـبـوت بـنـجـاح! *\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📍 *السيرفر:* \`${serverData}\`\n` +
            `✅ *الحالة:* متصل ومحمي\n` +
            `⚙️ *الإصدار:* تلقائي (Auto)\n` +
            `━━━━━━━━━━━━━━━━━━━━`,
            Markup.inlineKeyboard([[Markup.button.callback('🛑 إيقاف التشغيل الآن', `stop_bot_${serverData}`)]])
        );

    } catch (e) {
        ctx.reply("❌ حدث خطأ أثناء محاولة الاتصال التلقائي.");
    }
});

// --- إيقاف البوت وحذف الجلسة ---
bot.action(/stop_bot_(.+)/, (ctx) => {
    const serverData = ctx.match[1];
    if (activeConnections[serverData]) {
        activeConnections[serverData].disconnect();
        delete activeConnections[serverData];
        ctx.answerCbQuery("تم الإيقاف 🛑");
        ctx.editMessageText(`*⚠️ تم إيقاف النظام وفصل الاتصال بـ:* \`${serverData}\``, 
            Markup.inlineKeyboard([[Markup.button.callback('⬅️ العودة للوحة التحكم', `manage_${serverData}`)]])
        );
    } else {
        ctx.answerCbQuery("الاتصال متوقف بالفعل.");
    }
});

// --- حذف السيرفر نهائياً من الذاكرة ---
bot.action(/delete_(.+)/, (ctx) => {
    const serverIP = ctx.match[1];
    const userId = ctx.from.id;
    userServers[userId] = userServers[userId].filter(s => s !== serverIP);
    ctx.answerCbQuery("تم الحذف");
    ctx.editMessageText("*✅ تم حذف السيرفر من قائمتك بنجاح.*", Markup.inlineKeyboard([[Markup.button.callback('⬅️ عودة لسيرفراتي', 'my_servers')]]));
});

// --- العودة للقائمة الرئيسية ---
bot.action('main_menu', (ctx) => {
    ctx.deleteMessage();
    ctx.replyWithMarkdown(`*🔄 تم الرجوع للقائمة الرئيسية.. أرسل /start*`);
});

// تشغيل البوت في Replit
bot.launch().then(() => console.log("🚀 [SYSTEM] MAX BLACK BOT IS ONLINE!"));

// منع توقف السيرفر (Keep-Alive)
http.createServer((req, res) => { res.write('Bot Active'); res.end(); }).listen(8080);
