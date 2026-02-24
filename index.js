const { Telegraf } = require('telegraf');
const bedrock = require('bedrock-protocol');
const { Authflow } = require('prismarine-auth');
const http = require('http');

// حماية من الكرش
process.on('uncaughtException', err => console.log("UNCAUGHT:", err));
process.on('unhandledRejection', err => console.log("UNHANDLED:", err));

const TOKEN = "YOUR_NEW_TOKEN";
const bot = new Telegraf(TOKEN);

let activeClient = null;

// أمر البدء
bot.start((ctx) => {
    ctx.reply("🔥 أرسل IP:PORT\nمثال:\nplay.server.com:19132");
});

// استقبال IP
bot.on('text', async (ctx) => {

    if (!ctx.message.text.includes(':')) return;

    const [host, port] = ctx.message.text.split(':');

    if (activeClient) {
        ctx.reply("⚠️ البوت متصل بالفعل. اكتب /stop أولاً.");
        return;
    }

    ctx.reply("⏳ جاري الاتصال... أول مرة سيطلب تسجيل Xbox في Logs");

    try {

        const client = bedrock.createClient({
            host: host,
            port: parseInt(port),
            version: 'auto',
            authflow: new Authflow(
                "/tmp/auth",   // مهم لـ Railway
                undefined,
                {
                    flow: 'live',
                    authTitle: 'MinecraftNintendoSwitch'
                }
            )
        });

        activeClient = client;

        client.on('spawn', () => {
            ctx.reply("✅ دخل البوت السيرفر بنجاح!");

            // Anti AFK حركة خفيفة
            setInterval(() => {
                try {
                    client.write('player_auth_input', {
                        pitch: 0,
                        yaw: 0,
                        position: client.entity.position,
                        move_vector: { x: 0.1, z: 0 },
                        head_yaw: 0,
                        input_data: { jump: true }
                    });
                } catch {}
            }, 20000);
        });

        client.on('disconnect', () => {
            ctx.reply("❌ تم فصل البوت");
            activeClient = null;
        });

        client.on('error', (err) => {
            ctx.reply("❌ خطأ: " + err.message);
            activeClient = null;
        });

    } catch (e) {
        ctx.reply("❌ فشل الاتصال");
        activeClient = null;
    }
});

// أمر الإيقاف
bot.command('stop', (ctx) => {
    if (activeClient) {
        activeClient.disconnect();
        activeClient = null;
        ctx.reply("🛑 تم إيقاف البوت");
    } else {
        ctx.reply("البوت غير متصل");
    }
});

// تشغيل البوت
bot.launch().then(() => console.log("✅ BOT ONLINE"));

// مهم جداً لـ Railway حتى لا يطفئ المشروع
http.createServer((req, res) => {
    res.write("Bot Running");
    res.end();
}).listen(process.env.PORT || 3000);
