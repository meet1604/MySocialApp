const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert social media content creator embedded in a Telegram bot. Your job is to help users craft compelling posts for Instagram and LinkedIn through natural conversation.

Platform guidelines you follow:
- INSTAGRAM: Visual-first, energetic, emoji-friendly, conversational tone. Hashtags are important (aim for 8–15 relevant ones). Always needs an image or video.
- LINKEDIN: Professional, insightful, thought-leadership tone. Tell a story or share a lesson. 3–5 focused hashtags. Media is optional.

Your conversation style:
- Be concise — this is a chat interface, keep replies short.
- Ask one clarifying question at a time when you need more context.
- Once you have enough info, generate the post draft immediately — don't over-ask.
- When the user wants to refine, update the draft and show it again.

When you have a COMPLETE draft ready for the user to review, include this exact block at the very END of your message:

<POST_DRAFT>
{
  "caption": "the full post text without hashtags",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "ready": true
}
</POST_DRAFT>

Rules for the JSON block:
- "caption" must NOT include hashtags — they go in "hashtags" array only.
- Hashtag strings must NOT have the # prefix — just the word.
- Only output <POST_DRAFT> when the draft is genuinely complete and ready to show.
- While still in discussion / refining, do NOT include <POST_DRAFT>.

Keep captions natural and platform-appropriate. Do not pad responses unnecessarily.`;

// History format: [{ role: 'user'|'assistant', content: string }]

async function chat(history, userMessage) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    messages,
  });

  const raw = response.choices[0].message.content;

  // Extract draft JSON if present
  let draft = null;
  const match = raw.match(/<POST_DRAFT>([\s\S]*?)<\/POST_DRAFT>/);
  if (match) {
    try {
      draft = JSON.parse(match[1].trim());
    } catch {
      // malformed JSON — treat as no draft
    }
  }

  const display = raw.replace(/<POST_DRAFT>[\s\S]*?<\/POST_DRAFT>/g, '').trim();

  const newHistory = [
    ...history,
    { role: 'user', content: userMessage },
    { role: 'assistant', content: raw },
  ];

  return { message: display, draft, newHistory };
}

async function parseScheduleTime(userInput) {
  const now = new Date().toISOString();

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 150,
    messages: [
      {
        role: 'system',
        content: `You are a date/time parser. Current UTC time: ${now}.
Parse the user input into an ISO 8601 UTC timestamp.
Respond ONLY with valid JSON, no prose, no markdown:
{"iso":"2026-04-24T09:00:00.000Z","display":"April 24, 2026 at 9:00 AM UTC"}
If unparseable: {"error":"Could not parse date/time"}`,
      },
      { role: 'user', content: userInput },
    ],
  });

  const text = response.choices[0].message.content.trim();
  const clean = text.replace(/^```json?\s*/i, '').replace(/```$/, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    return { error: 'Could not parse date/time' };
  }
}

module.exports = { chat, parseScheduleTime };
