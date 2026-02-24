const { Telegraf, Markup } = require('telegraf');
const bedrock = require('bedrock-protocol');
const { Authflow } = require('prismarine-auth');
const fs = require('fs');

const TOKEN = "PUT_YOUR_NEW_TOKEN_HERE";
const bot = new Telegraf(TOKEN);

let activeConnections = {};

// ========== START ==========
bot.start((ctx) => {
    ctx.reply("🔥 أرسل IP:PORT للسيرفر\nمثال:\nplay.server.com:19132");
});

// ========== استلام IP ==========
bot.on('text', async (ctx) => {
    const text = ctx.message.text;

    if (!text.includes(':')) return;

    const [host, port] = text.split(':');

    ctx.reply("⏳ جاري الاتصال...");

    try {

        const client = bedrock.createClient({
            host: host,
            port: parseInt(port),
            version: 'auto',
            authflow: new Authflow(
                "./auth",
                undefined,
                {
                    flow: 'live',
                    authTitle: 'MinecraftNintendoSwitch'
                }
            )
        });

        activeConnections[ctx.chat.id] = client;

        client.on('spawn', () => {
            ctx.reply("✅ دخل البوت السيرفر بنجاح!");

            // Anti AFK حركة بسيطة
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

        client.on('disconnect', (packet) => {
            ctx.reply("❌ تم فصل البوت من السيرفر");
            delete activeConnections[ctx.chat.id];
        });

        client.on('error', (err) => {
            ctx.reply("❌ خطأ:\n" + err.message);
            delete activeConnections[ctx.chat.id];
        });

    } catch (e) {
        ctx.reply("❌ فشل الاتصال");
    }
});

// ========== إيقاف ==========
bot.command('stop', (ctx) => {
    const client = activeConnections[ctx.chat.id];
    if (client) {
        client.disconnect();
        delete activeConnections[ctx.chat.id];
        ctx.reply("🛑 تم إيقاف البوت");
    } else {
        ctx.reply("البوت غير متصل");
    }
});

bot.launch();
console.log("✅ BOT ONLINE");
const http = require("http");

http.createServer((req, res) => {
  res.write("Bot Running");
  res.end();
}).listen(process.env.PORT || 3000);
