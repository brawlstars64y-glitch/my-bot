const { Telegraf, Markup } = require('telegraf');
const bedrock = require('bedrock-protocol');
const { Authflow } = require('prismarine-auth');
const http = require('http');
const fs = require('fs');

// حماية من الكرش
process.on('uncaughtException', err => console.log(err));
process.on('unhandledRejection', err => console.log(err));

const TOKEN = "8682386496:AAFPfrgs8DrLUfjBYyihpojPB21WsvgcU8Y";
const bot = new Telegraf(TOKEN);

let servers = {};
let active = {};
let waitingInput = {};

// تحميل السيرفرات
if (fs.existsSync('servers.json')) {
    servers = JSON.parse(fs.readFileSync('servers.json'));
}

function save() {
    fs.writeFileSync('servers.json', JSON.stringify(servers, null, 2));
}

function mainMenu(ctx) {
    ctx.reply(
        "🔥 لوحة تحكم Minecraft Anti-AFK 🔥\n\nاختر من الأسفل:",
        Markup.inlineKeyboard([
            [Markup.button.callback("➕ إضافة سيرفر", "add")],
            [Markup.button.callback("🖥️ سيرفراتي", "list")]
        ])
    );
}

bot.start((ctx) => {
    if (!servers[ctx.from.id]) servers[ctx.from.id] = [];
    mainMenu(ctx);
});

// إضافة سيرفر
bot.action("add", (ctx) => {
    waitingInput[ctx.from.id] = true;
    ctx.answerCbQuery();
    ctx.reply("📌 أرسل IP:PORT\nمثال:\nplay.server.com:19132");
});

// استقبال IP
bot.on("text", (ctx) => {
    if (!waitingInput[ctx.from.id]) return;

    const text = ctx.message.text;
    if (!text.includes(":")) return ctx.reply("❌ الصيغة خطأ");

    servers[ctx.from.id].push(text);
    save();

    waitingInput[ctx.from.id] = false;
    ctx.reply("✅ تم الحفظ");
    mainMenu(ctx);
});

// عرض السيرفرات
bot.action("list", (ctx) => {
    const userServers = servers[ctx.from.id] || [];

    if (!userServers.length)
        return ctx.answerCbQuery("لا يوجد سيرفرات", { show_alert: true });

    const buttons = userServers.map(s =>
        [Markup.button.callback(`🌐 ${s}`, `manage_${s}`)]
    );

    ctx.editMessageText("🖥️ سيرفراتك:", {
        ...Markup.inlineKeyboard(buttons)
    });
});

// إدارة سيرفر
bot.action(/manage_(.+)/, (ctx) => {
    const server = ctx.match[1];

    ctx.editMessageText(
        `⚙️ إدارة السيرفر:\n${server}\n\nالحالة: ${active[server] ? "🟢 متصل" : "🔴 متوقف"}`,
        Markup.inlineKeyboard([
            [Markup.button.callback("🚀 تشغيل", `start_${server}`)],
            [Markup.button.callback("🛑 إيقاف", `stop_${server}`)],
            [Markup.button.callback("🗑 حذف", `delete_${server}`)],
            [Markup.button.callback("⬅️ رجوع", "list")]
        ])
    );
});

// تشغيل
bot.action(/start_(.+)/, async (ctx) => {
    const server = ctx.match[1];
    const [host, port] = server.split(":");

    if (active[server])
        return ctx.answerCbQuery("يعمل بالفعل");

    ctx.answerCbQuery("جاري الاتصال...");

    try {
        const client = bedrock.createClient({
            host,
            port: parseInt(port),
            version: "auto",
            authflow: new Authflow(
                "/tmp/auth",
                undefined,
                { flow: "live", authTitle: "MinecraftNintendoSwitch" }
            )
        });

        active[server] = client;

        client.on("spawn", () => {
            ctx.reply(`✅ دخل السيرفر ${server}`);

            setInterval(() => {
                try {
                    client.write("player_auth_input", {
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

        client.on("disconnect", () => {
            active[server] = null;
        });

        client.on("error", () => {
            active[server] = null;
        });

    } catch {
        ctx.reply("❌ فشل الاتصال");
        active[server] = null;
    }
});

// إيقاف
bot.action(/stop_(.+)/, (ctx) => {
    const server = ctx.match[1];

    if (active[server]) {
        active[server].disconnect();
        active[server] = null;
        ctx.editMessageText("🛑 تم الإيقاف");
    } else {
        ctx.answerCbQuery("غير متصل");
    }
});

// حذف
bot.action(/delete_(.+)/, (ctx) => {
    const server = ctx.match[1];

    servers[ctx.from.id] =
        servers[ctx.from.id].filter(s => s !== server);

    save();
    ctx.editMessageText("✅ تم الحذف");
});

bot.launch().then(() => console.log("BOT ONLINE"));

// مهم لـ Railway
http.createServer((req, res) => {
    res.write("Running");
    res.end();
}).listen(process.env.PORT || 3000);
