// In-memory session store — keyed by Telegram user ID.
// Each session tracks auth state, the active post draft, AI conversation
// history, and any uploaded media waiting to be attached to a post.

const store = new Map();

const States = {
  IDLE: 'IDLE',                         // logged in, no active draft
  DRAFTING: 'DRAFTING',                 // AI conversation in progress
  SELECTING_PLATFORM: 'SELECTING_PLATFORM',
  REVIEWING: 'REVIEWING',               // preview shown, waiting for approve/edit
  SCHEDULING: 'SCHEDULING',             // waiting for the user to give a date/time
};

function defaults() {
  return {
    token: null,
    user: null,
    state: States.IDLE,
    draft: null,        // { caption, hashtags[], platforms[], mediaUrl, mediaType }
    history: [],        // Claude message history [ {role, content} ]
    pendingMedia: null, // { url, type } — set when user uploads a photo/video
  };
}

function get(telegramId) {
  if (!store.has(telegramId)) store.set(telegramId, defaults());
  return store.get(telegramId);
}

function set(telegramId, patch) {
  store.set(telegramId, { ...get(telegramId), ...patch });
}

function reset(telegramId) {
  const s = get(telegramId);
  // preserve auth across resets; only clear post-creation state
  store.set(telegramId, {
    ...defaults(),
    token: s.token,
    user: s.user,
  });
}

function fullReset(telegramId) {
  store.set(telegramId, defaults());
}

module.exports = { get, set, reset, fullReset, States };
