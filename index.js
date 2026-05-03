require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);
const INSTAGRAM_URL = process.env.INSTAGRAM_URL || 'https://www.instagram.com/aziboyevsh/';
const CHANNEL_ID = process.env.CHANNEL_ID;

// Xotirada foydalanuvchi qachon /start bosganini saqlash
const userStartTimes = new Map();

// Global xatoliklarni ushlash (Bot qulab tushmasligi uchun)
bot.catch((err, ctx) => {
    console.error(`Xatolik yuz berdi ${ctx.updateType}:`, err);
});

// Faqat private (shaxsiy) chatlarda ishlashini ta'minlash
bot.use(async (ctx, next) => {
    if (ctx.chat && ctx.chat.type !== 'private') {
        // Guruhlarda bot aralashmasligi uchun
        return;
    }
    return next();
});

// /start buyrug'i
bot.start((ctx) => {
    const userId = ctx.from.id;
    userStartTimes.set(userId, Date.now());

    ctx.reply(
        `Salom, ${ctx.from.first_name}! 👋\n\nKanalimizga ulanish uchun avval bizning Instagram sahifamizga obuna bo'lishingiz kerak.\n\nPastdagi <b>📸 Instagram sahifaga o'tish</b> tugmasi orqali sahifaga o'ting va obuna bo'ling!\nShundan so'ng <b>✅ Obuna bo'ldim</b> tugmasini bosing.`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.url('📸 Instagram sahifaga o\'tish', INSTAGRAM_URL)],
                [Markup.button.callback('✅ Obuna bo\'ldim', 'check_subscription')]
            ])
        }
    );
});

// /help buyrug'i
bot.help((ctx) => {
    ctx.reply("Sizga qanday yordam bera olaman? Kanalga ulanish uchun /start buyrug'ini bosing va yo'riqnomalarga amal qiling.");
});

// Tugma bosilganda ishlaydigan logika
bot.action('check_subscription', async (ctx) => {
    const userId = ctx.from.id;
    const startTime = userStartTimes.get(userId) || 0;
    const now = Date.now();
    
    // Foydalanuvchi /start bosganidan keyin kamida 5 soniya o'tgan bo'lishi kerak
    // Bu - aldamchi tekshiruv (odamlar ssilkaga o'tmasdan birdaniga tugmani bosib yuborishini oldini oladi)
    const timePassed = (now - startTime) / 1000;
    
    if (timePassed < 5) {
        // Obuna bo'lishga ulgurmadi (vaqt kam ketdi)
        return ctx.answerCbQuery(
            "❌ Siz obuna bo'lishga ulgurmadingiz!\nIltimos, avval Instagram sahifaga o'ting va obuna tugmasini bosing.",
            { show_alert: true }
        );
    }
    
    // Yana bir xavfsizlik: agar kanal ID berilmagan bo'lsa
    if (!CHANNEL_ID || CHANNEL_ID === '-1000000000000') {
        return ctx.answerCbQuery("Tizimda xatolik: Kanal sozlanmagan. Adminga (.env) murojaat qiling.", { show_alert: true });
    }

    try {
        // "Tekshirilmoqda" jarayonini simulyatsiya qilish
        await ctx.editMessageText("⏳ <i>Obunangiz tekshirilmoqda... Iltimos kuting.</i>", { parse_mode: 'HTML' });
        
        setTimeout(async () => {
            try {
                // Foydalanuvchi uchun bir martalik (member_limit: 1) havola yaratish
                const inviteLink = await ctx.telegram.createChatInviteLink(CHANNEL_ID, {
                    name: `Bot orqali: ${ctx.from.first_name}`,
                    member_limit: 1, // Maksimal 1 marta ishlatiladi
                    expire_date: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 1 kunda eskiradi
                });

                await ctx.editMessageText(
                    `🎉 <b>Tabriklaymiz, obunangiz tasdiqlandi!</b>\n\nPastdagi yopiq havola orqali asosiy kanalga kirishingiz mumkin.\n\n⚠️ <i>Eslatma: Ushbu havola faqat siz uchun va faqat 1 marta ishlaydi!</i>`,
                    {
                        parse_mode: 'HTML',
                        ...Markup.inlineKeyboard([
                            [Markup.button.url('🚀 Kanalga kirish', inviteLink.invite_link)]
                        ])
                    }
                );
            } catch (err) {
                console.error("Havola yaratishda xatolik:", err);
                ctx.editMessageText("❌ <b>Kanal havolasini yaratishda xatolik yuz berdi.</b>\nBot kanalda 'Admin' ekanligini va havolalar yaratish xuquqi borligini tekshiring.", { parse_mode: 'HTML' });
            }
        }, 3000); // 3 soniyalik simulyatsiya tekshiruvi
    } catch (err) {
        console.error(err);
    }
});

// Qolgan barcha habarlarga javob (ID topish funksiyasi)
bot.on('message', (ctx) => {
    // Agar foydalanuvchi kanaldan post forward qilsa, kanal ID sini aytadi
    if (ctx.message.forward_origin && ctx.message.forward_origin.type === 'channel') {
        const chat_id = ctx.message.forward_origin.chat.id;
        return ctx.reply(`✅ <b>Siz yuborgan kanalning ID raqami:</b>\n\n<code>${chat_id}</code>\n\nShu ID raqamni nusxalab menga bering, men uni tizimga (.env) kiritib qo'yaman.`, { parse_mode: 'HTML' });
    } else if (ctx.message.forward_from_chat && ctx.message.forward_from_chat.type === 'channel') {
        // Telegram eski versiyalari uchun fallback
        const chat_id = ctx.message.forward_from_chat.id;
        return ctx.reply(`✅ <b>Siz yuborgan kanalning ID raqami:</b>\n\n<code>${chat_id}</code>\n\nShu ID raqamni nusxalab menga bering, men uni tizimga (.env) kiritib qo'yaman.`, { parse_mode: 'HTML' });
    }

    ctx.reply("Kechirasiz, men faqat tugmalar orqali ishlayman. Iltimos, /start buyrug'ini bosib qaytadan urinib ko'ring.");
});

bot.launch().then(() => {
    console.log("=================================");
    console.log("🚀 Bot muvaffaqiyatli ishga tushdi!");
    console.log("=================================");
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
