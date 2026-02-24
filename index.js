const { Telegraf, Markup } = require('telegraf');
const bedrock = require('bedrock-protocol');
const fs = require('fs');
const http = require('http');

// --- إعدادات البوت ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);
const DEV_CHANNEL = '@aternosbot24'; 
const DB_FILE = 'database.json';

/* ===== نظام حفظ البيانات ===== */
let db = { users: {} };
if (fs.existsSync(DB_FILE)) {
    try { db = JSON.parse(fs.readFileSync(DB_FILE)); } catch (e) { db = { users: {} }; }
}
const saveData = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

const activeSessions = new Map();

/* ===== التحقق من الاشتراك ===== */
const checkSubscription = async (ctx) => {
    try {
        const member = await ctx.telegram.getChatMember(DEV_CHANNEL, ctx.from.id);
        return ['member', 'administrator', 'creator'].includes(member.status);
    } catch (e) { return false; }
};

/* ===== واجهة العرض ===== */
const layouts = {
    main: () => Markup.inlineKeyboard([
        [Markup.button.callback('➕ إضافة خادم', 'ADD_SERVER')],
        [Markup.button.callback('📂 خوادمي', 'MY_SERVERS')]
    ]),
    sub: () => Markup.inlineKeyboard([
        [Markup.button.url('🚀 اشترك في القناة أولاً', `https://t.me/${DEV_CHANNEL.replace('@','')}`)],
        [Markup.button.callback('✅ تم الاشتراك', 'VERIFY_SUB')]
    ])
};

bot.start(async (ctx) => {
    if (!(await checkSubscription(ctx))) {
        return ctx.replyWithMarkdown(`*🛡️ بوت ماكس بلاك الاحترافي*\n\nعذراً، يجب الاشتراك في القناة أولاً لاستخدام البوت.`, layouts.sub());
    }
    ctx.replyWithMarkdown(`*🎮 لوحة التحكم (دعم 1.21 - 1.26)*\n\nأهلاً بك! البوت مهيأ الآن لدعم أحدث الإصدارات.`, layouts.main());
});

bot.action('VERIFY_SUB', async (ctx) => {
    if (await checkSubscription(ctx)) {
        await ctx.answerCbQuery('✅ تم التحقق');
        return ctx.editMessageText('*🔓 تم التفعيل!*\nاختر من القائمة:', { parse_mode: 'Markdown', ...layouts.main() });
    }
    await ctx.answerCbQuery('❌ لم تشترك بعد!', { show_alert: true });
});

bot.action('ADD_SERVER', async (ctx) => {
    db.users[ctx.from.id] = db.users[ctx.from.id] || { servers: [], state: 'IDLE' };
    db.users[ctx.from.id].state = 'WAITING_IP';
    await ctx.answerCbQuery();
    ctx.replyWithMarkdown('📡 *أرسل IP:Port الخاص بالسيرفر:*');
});

bot.on('text', async (ctx) => {
    const user = db.users[ctx.from.id];
    if (!user || user.state !== 'WAITING_IP') return;
    const input = ctx.message.text.trim();
    if (!input.includes(':')) return ctx.reply('⚠️ صيغة خاطئة! استخدم `ip:port`');
    
    const [ip, port] = input.split(':');
    user.servers.push({ host: ip.trim(), port: port.trim() });
    user.state = 'IDLE';
    saveData();
    ctx.replyWithMarkdown('✅ *تم الحفظ بنجاح!*', layouts.main());
});

bot.action('MY_SERVERS', async (ctx) => {
    const user = db.users[ctx.from.id];
    if (!user || !user.servers.length) return ctx.answerCbQuery('📭 لا يوجد خوادم', { show_alert: true });
    const buttons = user.servers.map((s, i) => [Markup.button.callback(`📍 ${s.host}:${s.port}`, `MANAGE_${i}`)]);
    buttons.push([Markup.button.callback('⬅️ رجوع', 'START_OVER')]);
    ctx.editMessageText('📂 *خوادمك:*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
});

bot.action(/^MANAGE_(\d+)$/, async (ctx) => {
    const id = ctx.match[1];
    const server = db.users[ctx.from.id].servers[id];
    const isOnline = activeSessions.has(`${ctx.from.id}_${id}`);
    const controlKb = Markup.inlineKeyboard([
        [Markup.button.callback(isOnline ? '⏹ إيقاف' : '▶️ تشغيل', `TOGGLE_${id}`)],
        [Markup.button.callback('🗑 حذف', `DELETE_${id}`)],
        [Markup.button.callback('⬅️ رجوع', 'MY_SERVERS')]
    ]);
    ctx.editMessageText(`🖥 *الخادم:* \`${server.host}:${server.port}\`\n*الحالة:* ${isOnline ? '🟢 يعمل' : '🔴 متوقف'}`, { parse_mode: 'Markdown', ...controlKb });
});

/* ===== محرك الدعم المطور 1.21 - 1.26 ===== */
bot.action(/^TOGGLE_(\d+)$/, async (ctx) => {
    const id = ctx.match[1];
    const uid = ctx.from.id;
    const key = `${uid}_${id}`;
    const server = db.users[uid].servers[id];

    if (activeSessions.has(key)) {
        activeSessions.get(key).disconnect();
        activeSessions.delete(key);
        await ctx.answerCbQuery('⏹ تم الإيقاف');
        return ctx.editMessageText('🔴 *تم إيقاف البوت.*', { parse_mode: 'Markdown', ...layouts.main() });
    }

    await ctx.answerCbQuery('⏳ جاري الاتصال بنظام 1.21-1.26...');
    try {
        const client = bedrock.createClient({
            host: server.host,
            port: parseInt(server.port),
            username: `MaxB_${Math.floor(1000 + Math.random() * 9000)}`,
            offline: true,
            version: '1.21.0', // قاعدة الانطلاق لدعم 1.21 وصولاً لـ 1.26
            connectTimeout: 20000
        });

        activeSessions.set(key, client);

        client.on('spawn', () => {
            ctx.replyWithMarkdown(`✅ *تم الدخول بنجاح!*\nالبوت يدعم الآن سيرفرك (1.21 - 1.26).`);
            
            // نظام Anti-AFK مخصص للإصدارات الجديدة
            const interval = setInterval(() => {
                if (activeSessions.has(key)) {
                    client.setControlState('jump', true);
                    setTimeout(() => { if (activeSessions.has(key)) client.setControlState('jump', false); }, 500);
                } else { clearInterval(interval); }
            }, 10000); // حركة كل 10 ثواني لضمان عدم الطرد في 1.26
        });

        client.on('error', (err) => {
            activeSessions.delete(key);
            console.log(err);
        });

    } catch (e) { ctx.reply('❌ فشل النظام.'); }
});

bot.action(/^DELETE_(\d+)$/, async (ctx) => {
    const id = ctx.match[1];
    db.users[ctx.from.id].servers.splice(id, 1);
    saveData();
    await ctx.answerCbQuery('🗑 تم الحذف');
    ctx.editMessageText('✅ *تم الحذف.*', { parse_mode: 'Markdown', ...layouts.main() });
});

bot.action('START_OVER', (ctx) => ctx.editMessageText('*🎮 لوحة التحكم:*', { parse_mode: 'Markdown', ...layouts.main() }));

http.createServer((req, res) => res.end('ACTIVE')).listen(process.env.PORT || 8080);
bot.launch({ dropPendingUpdates: true });
console.log('🚀 BOT 1.21-1.26 READY');
