require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const session = require('./src/session');
const ai = require('./src/ai');
const api = require('./src/api');

const { States } = session;

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function requireLogin(ctx) {
  const s = session.get(ctx.from.id);
  if (!s.token) {
    ctx.reply(
      '🔒 You need to login first.\n\nUse:\n<code>/login your@email.com yourpassword</code>',
      { parse_mode: 'HTML' }
    );
    return false;
  }
  return true;
}

// Keep "typing..." indicator alive while awaiting async work
function startTyping(ctx) {
  ctx.sendChatAction('typing').catch(() => {});
  const interval = setInterval(() => ctx.sendChatAction('typing').catch(() => {}), 4500);
  return () => clearInterval(interval);
}

function platformLabel(p) {
  return p === 'INSTAGRAM' ? '📸 Instagram' : '💼 LinkedIn';
}

function buildPreviewText(draft) {
  const platforms = draft.platforms.map(platformLabel).join(' + ');
  const tags = draft.hashtags.map(h => (h.startsWith('#') ? h : `#${h}`)).join(' ');

  let text = `📋 *Post Preview*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🌐 *Platforms:* ${platforms}\n\n`;
  text += `📝 *Caption:*\n${escMd(draft.caption)}\n\n`;
  if (tags) text += `🏷️ *Hashtags:*\n${escMd(tags)}\n\n`;
  if (draft.mediaUrl) text += `🖼️ *Media:* Attached ✓\n\n`;
  text += `━━━━━━━━━━━━━━━━━━━━`;
  return text;
}

// Escape special Markdown v1 characters that Telegram chokes on
function escMd(text) {
  return String(text).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

// ─────────────────────────────────────────────────────────────────────────────
// /start
// ─────────────────────────────────────────────────────────────────────────────
bot.start((ctx) => {
  const s = session.get(ctx.from.id);
  if (s.user) {
    return ctx.reply(
      `👋 Welcome back, *${s.user.name || s.user.email}*!\n\n` +
      `What would you like to do?\n\n` +
      `💬 Just tell me what to post\n` +
      `📸 Send a photo/video to include media\n` +
      `📊 Use /status to check connected accounts`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📖 How to use', 'show:guide')],
          [Markup.button.callback('📊 Account Status', 'show:status')],
        ]),
      }
    );
  }
  ctx.reply(
    `👋 *Welcome to Meet Social Bot!*\n\n` +
    `I'm your AI-powered social media assistant. I'll help you create and schedule posts for *Instagram* and *LinkedIn* through simple conversation.\n\n` +
    `🔐 *First, login to your account:*\n` +
    `<code>/login your@email.com yourpassword</code>\n\n` +
    `📖 Use /guide to see how everything works.`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📖 How to use this bot', 'show:guide')],
      ]),
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// /login
// ─────────────────────────────────────────────────────────────────────────────
bot.command('login', async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  if (parts.length !== 3) {
    return ctx.reply('Usage: /login your@email.com yourpassword');
  }
  const [, email, password] = parts;
  const stopTyping = startTyping(ctx);
  try {
    const data = await api.login(email, password);
    stopTyping();
    session.set(ctx.from.id, { token: data.token, user: data.user, state: States.IDLE });
    await ctx.reply(
      `✅ *Logged in as ${data.user.name || data.user.email}!*\n\n` +
      `I'm ready to help you create posts. Just tell me:\n` +
      `• What topic you want to post about\n` +
      `• Send a photo or video to include media\n\n` +
      `Type /help to see all commands.`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    stopTyping();
    const msg = err.response?.data?.error || 'Login failed. Please check your credentials.';
    ctx.reply(`❌ ${msg}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// /logout
// ─────────────────────────────────────────────────────────────────────────────
bot.command('logout', (ctx) => {
  session.fullReset(ctx.from.id);
  ctx.reply('✅ Logged out. Use /login to log back in.');
});

// ─────────────────────────────────────────────────────────────────────────────
// /cancel
// ─────────────────────────────────────────────────────────────────────────────
bot.command('cancel', (ctx) => {
  session.reset(ctx.from.id);
  ctx.reply('❌ Post creation cancelled.\n\nStart a new one by telling me what you want to post about!');
});

// ─────────────────────────────────────────────────────────────────────────────
// /status — show connected social accounts
// ─────────────────────────────────────────────────────────────────────────────
bot.command('status', async (ctx) => {
  if (!requireLogin(ctx)) return;
  const s = session.get(ctx.from.id);
  const stopTyping = startTyping(ctx);
  try {
    const data = await api.getConnectedAccounts(s.token);
    stopTyping();
    const ig = data.status?.INSTAGRAM;
    const li = data.status?.LINKEDIN;
    let msg = `📊 *Connected Accounts*\n\n`;
    msg += ig?.connected
      ? `✅ Instagram (@${ig.accountName})\n`
      : `❌ Instagram _(not connected)_\n`;
    msg += li?.connected
      ? `✅ LinkedIn (${li.accountName})\n`
      : `❌ LinkedIn _(not connected)_\n`;
    msg += `\n_Connect accounts from the web app._`;
    ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch {
    stopTyping();
    ctx.reply('❌ Could not fetch account status.');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// /help
// ─────────────────────────────────────────────────────────────────────────────
bot.command('help', (ctx) => {
  ctx.reply(
    `🤖 *Meet Social Bot — Commands*\n\n` +
    `/start — Welcome screen\n` +
    `/login email password — Login\n` +
    `/logout — Logout\n` +
    `/status — Check connected accounts\n` +
    `/guide — Step-by-step usage guide\n` +
    `/cancel — Cancel current post\n` +
    `/help — This message`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📖 Full Guide', 'show:guide')],
      ]),
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// /guide — step-by-step how to use
// ─────────────────────────────────────────────────────────────────────────────
bot.command('guide', (ctx) => sendGuide(ctx));

async function sendGuide(ctx) {
  await ctx.reply(
    `📖 *How to Use Meet Social Bot*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `*Step 1 — Login* 🔐\n` +
    `Send: /login your@email.com yourpassword\n\n` +
    `*Step 2 — Connect your accounts* 🔗\n` +
    `Go to the web app and connect Instagram & LinkedIn before posting.\n` +
    `👉 https://my-social-app-gilt.vercel.app/connect-accounts\n\n` +
    `*Step 3 — Create a post* ✍️\n` +
    `Just type what you want to post about:\n` +
    `_"Write a post about my new product launch"_\n` +
    `_"Create a motivational Monday post"_\n` +
    `Or send a 📸 photo / 🎬 video directly!\n\n` +
    `*Step 4 — Pick platforms* 📱\n` +
    `Choose Instagram, LinkedIn, or Both.\n` +
    `⚠️ Instagram requires a photo or video.\n\n` +
    `*Step 5 — Review & Edit* 👀\n` +
    `See a preview of your post. Ask me to edit anything:\n` +
    `_"Make it shorter"_ • _"More professional tone"_ • _"Add emojis"_\n\n` +
    `*Step 6 — Schedule* ⏰\n` +
    `Tell me when to post in plain English:\n` +
    `• _"tomorrow at 3pm IST"_\n` +
    `• _"Friday at 10am"_\n` +
    `• _"in 2 hours"_\n` +
    `• _"now"_ — posts within ~1 minute\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `That's it! 🎉 Your post will publish automatically at the scheduled time.`,
    { parse_mode: 'Markdown', disable_web_page_preview: true }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Photo handler
// ─────────────────────────────────────────────────────────────────────────────
bot.on('photo', async (ctx) => {
  if (!requireLogin(ctx)) return;
  const s = session.get(ctx.from.id);

  await ctx.reply('📸 Got your photo! Uploading…');
  const stopTyping = startTyping(ctx);

  try {
    // Pick the highest-resolution version
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    const resp = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(resp.data);

    const uploadResult = await api.uploadMedia(s.token, buffer, 'image/jpeg', 'photo.jpg');
    stopTyping();

    session.set(ctx.from.id, {
      pendingMedia: { url: uploadResult.mediaUrl, type: uploadResult.mediaType || 'IMAGE' },
    });

    const caption = ctx.message.caption || '';
    const userMsg = caption
      ? `I want to create a post with this image. Context: "${caption}"`
      : 'I want to create a post using this image I just uploaded.';

    await runAITurn(ctx, userMsg);
  } catch (err) {
    stopTyping();
    console.error('Photo upload error:', err.message);
    ctx.reply('❌ Failed to upload photo. Please try again.');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Video handler
// ─────────────────────────────────────────────────────────────────────────────
bot.on('video', async (ctx) => {
  if (!requireLogin(ctx)) return;
  const s = session.get(ctx.from.id);

  await ctx.reply('🎬 Got your video! Uploading…');
  const stopTyping = startTyping(ctx);

  try {
    const video = ctx.message.video;
    const fileLink = await ctx.telegram.getFileLink(video.file_id);
    const resp = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(resp.data);

    const uploadResult = await api.uploadMedia(s.token, buffer, 'video/mp4', 'video.mp4');
    stopTyping();

    session.set(ctx.from.id, {
      pendingMedia: { url: uploadResult.mediaUrl, type: uploadResult.mediaType || 'VIDEO' },
    });

    const caption = ctx.message.caption || '';
    const userMsg = caption
      ? `I want to create a post with this video. Context: "${caption}"`
      : 'I want to create a post using this video I just uploaded.';

    await runAITurn(ctx, userMsg);
  } catch (err) {
    stopTyping();
    console.error('Video upload error:', err.message);
    ctx.reply('❌ Failed to upload video. Please try again.');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Text message handler
// ─────────────────────────────────────────────────────────────────────────────
bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;
  if (!requireLogin(ctx)) return;

  const s = session.get(ctx.from.id);

  if (s.state === States.SCHEDULING) {
    return handleSchedulingInput(ctx, ctx.message.text);
  }

  // All other states (IDLE, DRAFTING, REVIEWING) go through AI
  await runAITurn(ctx, ctx.message.text);
});

// ─────────────────────────────────────────────────────────────────────────────
// Inline keyboard button handler
// ─────────────────────────────────────────────────────────────────────────────
bot.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery();
  const data = ctx.callbackQuery.data;

  if (data.startsWith('platform:')) {
    await handlePlatformChoice(ctx, data.replace('platform:', ''));
  } else if (data === 'post:approve') {
    await handleApprove(ctx);
  } else if (data === 'post:edit') {
    await handleEditRequest(ctx);
  } else if (data === 'post:cancel') {
    session.reset(ctx.from.id);
    await ctx.reply('❌ Post cancelled. Tell me what you\'d like to post about to start a new one!');
  } else if (data === 'show:guide') {
    await sendGuide(ctx);
  } else if (data === 'show:status') {
    const s = session.get(ctx.from.id);
    if (!s.token) return ctx.reply('🔒 Please login first with /login');
    try {
      const data2 = await api.getConnectedAccounts(s.token);
      const ig = data2.status?.INSTAGRAM;
      const li = data2.status?.LINKEDIN;
      let msg = `📊 *Connected Accounts*\n\n`;
      msg += ig?.connected ? `✅ Instagram (@${ig.accountName})\n` : `❌ Instagram _(not connected)_\n`;
      msg += li?.connected ? `✅ LinkedIn (${li.accountName})\n` : `❌ LinkedIn _(not connected)_\n`;
      msg += `\n_Connect accounts at the web app._`;
      ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch {
      ctx.reply('❌ Could not fetch account status.');
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Core AI turn — send user message to Claude, process response
// ─────────────────────────────────────────────────────────────────────────────
async function runAITurn(ctx, userMessage) {
  const s = session.get(ctx.from.id);
  const stopTyping = startTyping(ctx);

  try {
    const result = await ai.chat(s.history, userMessage);
    stopTyping();

    // Save updated conversation history
    session.set(ctx.from.id, { history: result.newHistory, state: States.DRAFTING });

    if (result.draft?.ready) {
      // Claude produced a finished draft — save it and ask for platform
      const fresh = session.get(ctx.from.id);
      session.set(ctx.from.id, {
        draft: {
          caption: result.draft.caption,
          hashtags: result.draft.hashtags || [],
          platforms: [],
          mediaUrl: fresh.pendingMedia?.url || null,
          mediaType: fresh.pendingMedia?.type || null,
        },
        state: States.SELECTING_PLATFORM,
      });

      if (result.message) await ctx.reply(result.message);
      await showPlatformKeyboard(ctx);
    } else {
      await ctx.reply(result.message);
    }
  } catch (err) {
    stopTyping();
    console.error('AI error:', err.message);
    ctx.reply('❌ Something went wrong with the AI. Please try again.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform selection keyboard
// ─────────────────────────────────────────────────────────────────────────────
async function showPlatformKeyboard(ctx) {
  await ctx.reply(
    '📱 *Which platforms do you want to post on?*',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('📸 Instagram', 'platform:INSTAGRAM'),
          Markup.button.callback('💼 LinkedIn', 'platform:LINKEDIN'),
        ],
        [Markup.button.callback('🌐 Both Platforms', 'platform:BOTH')],
      ]),
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Handle platform selection
// ─────────────────────────────────────────────────────────────────────────────
async function handlePlatformChoice(ctx, choice) {
  const s = session.get(ctx.from.id);

  const platforms = choice === 'BOTH'
    ? ['INSTAGRAM', 'LINKEDIN']
    : [choice];

  // Instagram requires media
  if (platforms.includes('INSTAGRAM') && !s.draft?.mediaUrl) {
    return ctx.reply(
      '⚠️ *Instagram requires an image or video.*\n\n' +
      'Please send a photo or video first, then I\'ll add it to the post.\n\n' +
      'Or choose LinkedIn only:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('💼 LinkedIn Only', 'platform:LINKEDIN')],
          [Markup.button.callback('❌ Cancel', 'post:cancel')],
        ]),
      }
    );
  }

  session.set(ctx.from.id, {
    draft: { ...s.draft, platforms },
    state: States.REVIEWING,
  });

  await showPostPreview(ctx);
}

// ─────────────────────────────────────────────────────────────────────────────
// Show post preview with approve / edit / cancel buttons
// ─────────────────────────────────────────────────────────────────────────────
async function showPostPreview(ctx) {
  const s = session.get(ctx.from.id);

  await ctx.reply(buildPreviewText(s.draft), {
    parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Approve & Schedule', 'post:approve'),
        Markup.button.callback('✏️ Edit', 'post:edit'),
      ],
      [Markup.button.callback('❌ Cancel', 'post:cancel')],
    ]),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Approve — ask for schedule time
// ─────────────────────────────────────────────────────────────────────────────
async function handleApprove(ctx) {
  session.set(ctx.from.id, { state: States.SCHEDULING });
  await ctx.reply(
    `✅ *Post approved!*\n\n⏰ *When should it go live?*\n\nJust tell me in plain English:\n• _"tomorrow at 3pm IST"_\n• _"Friday at 10am"_\n• _"in 2 hours"_\n• _"now"_ — schedules in ~1 minute`,
    { parse_mode: 'Markdown' }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit request — go back to AI conversation
// ─────────────────────────────────────────────────────────────────────────────
async function handleEditRequest(ctx) {
  session.set(ctx.from.id, { state: States.DRAFTING });
  await ctx.reply(
    '✏️ Sure! What would you like to change?\n\n' +
    'Tell me anything:\n• Rewrite the caption\n• Different tone or style\n• Add / remove hashtags\n• Change the content entirely'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheduling input — parse time and create the post
// ─────────────────────────────────────────────────────────────────────────────
async function handleSchedulingInput(ctx, timeInput) {
  const s = session.get(ctx.from.id);
  const stopTyping = startTyping(ctx);

  let scheduledTime;
  let displayTime;

  try {
    if (timeInput.trim().toLowerCase() === 'now') {
      // Schedule 60 seconds from now so the cron job picks it up immediately
      const soon = new Date(Date.now() + 60_000);
      scheduledTime = soon.toISOString();
      displayTime = 'right now (within ~1 minute)';
    } else {
      const parsed = await ai.parseScheduleTime(timeInput);
      if (parsed.error) {
        stopTyping();
        return ctx.reply(
          `❌ I couldn't understand that time. Try something like:\n• "tomorrow at 3pm"\n• "Friday 10am"\n• "in 2 hours"\n• "now"`
        );
      }
      scheduledTime = parsed.iso;
      displayTime = parsed.display;
    }

    await ctx.reply(`🕐 Scheduling for: *${displayTime}*…`, { parse_mode: 'Markdown' });

    const postData = {
      caption: s.draft.caption,
      hashtags: s.draft.hashtags,
      platforms: s.draft.platforms,
      scheduledTime,
      status: 'SCHEDULED',
    };

    if (s.draft.mediaUrl) {
      postData.mediaUrl = s.draft.mediaUrl;
      postData.mediaType = s.draft.mediaType || 'IMAGE';
    }

    const result = await api.createPost(s.token, postData);
    stopTyping();

    const post = result.post;
    const postTime = new Date(post.scheduledTime).toUTCString();
    const platformStr = post.platforms.map(platformLabel).join(' + ');

    await ctx.reply(
      `🎉 *Post Scheduled Successfully!*\n\n` +
      `📅 *Time:* ${postTime}\n` +
      `🌐 *Platforms:* ${platformStr}\n` +
      `🆔 *Post ID:* \`${post.id}\`\n\n` +
      `Your post will be published automatically at the scheduled time! 🚀\n\n` +
      `_Tell me what you'd like to post about next, or use /help to see all commands._`,
      { parse_mode: 'Markdown' }
    );

    // Clear the draft but keep auth
    session.reset(ctx.from.id);
  } catch (err) {
    stopTyping();
    console.error('Schedule error:', err.response?.data || err.message);
    const msg = err.response?.data?.error || 'Failed to schedule the post. Please try again.';
    ctx.reply(`❌ ${msg}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────────────────────────────────────
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ An unexpected error occurred. Please try again or use /cancel to reset.').catch(() => {});
});

// ─────────────────────────────────────────────────────────────────────────────
// Launch
// ─────────────────────────────────────────────────────────────────────────────
bot.launch({ dropPendingUpdates: true });
console.log('🤖 @Meet_social_bot is running!');

// Dummy HTTP server so Render free tier doesn't kill the process
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('OK')).listen(PORT, () => {
  console.log(`Health check server on port ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
