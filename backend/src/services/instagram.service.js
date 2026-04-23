const axios = require('axios');
const prisma = require('../config/prisma');

const BASE_IG    = 'https://api.instagram.com';
const BASE_GRAPH = 'https://graph.instagram.com/v21.0';

// ─── OAuth ────────────────────────────────────────────────────────────────────

/**
 * Build the Instagram OAuth authorisation URL (new Business Login flow).
 */
const getAuthUrl = (token) => {
  const params = new URLSearchParams({
    force_reauth:  'true',
    client_id:     process.env.INSTAGRAM_CLIENT_ID || process.env.META_APP_ID,
    redirect_uri:  process.env.META_REDIRECT_URI,
    scope:         'instagram_business_basic,instagram_business_content_publish',
    response_type: 'code',
    state:         token, // pass JWT token through OAuth state param
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
};

/**
 * Exchange the OAuth `code` for a short-lived token, then upgrade to long-lived.
 * @param {string} code
 * @returns {Promise<{ accessToken: string, expiresIn: number, igUserId: string }>}
 */
const exchangeCodeForToken = async (code) => {
  // Step 1 — short-lived token
  const params = new URLSearchParams({
    client_id:     process.env.INSTAGRAM_CLIENT_ID || process.env.META_APP_ID,
    client_secret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET,
    grant_type:    'authorization_code',
    redirect_uri:  process.env.META_REDIRECT_URI,
    code,
  });

  const { data: shortLived } = await axios.post(
    `${BASE_IG}/oauth/access_token`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  // Step 2 — exchange for long-lived token (60 days)
  const { data: longLived } = await axios.get(`${BASE_GRAPH}/access_token`, {
    params: {
      grant_type:        'ig_exchange_token',
      client_secret:     process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET,
      access_token:      shortLived.access_token,
    },
  });

  return {
    accessToken: longLived.access_token,
    expiresIn:   longLived.expires_in,
    igUserId:    shortLived.user_id.toString(),
  };
};

/**
 * Fetch the Instagram user's profile (username) using the new API.
 * @param {string} igUserId
 * @param {string} accessToken
 * @returns {Promise<{ igUsername: string }>}
 */
const getInstagramProfile = async (igUserId, accessToken) => {
  try {
    const { data } = await axios.get(`https://graph.instagram.com/me`, {
      params: {
        fields:       'username,name,id',
        access_token: accessToken,
      },
    });
    return { igUsername: data.username || data.name || igUserId };
  } catch (err) {
    console.error('[getInstagramProfile] failed:', err.response?.data || err.message);
    // Fall back to using the user ID as the display name
    return { igUsername: igUserId };
  }
};

/**
 * Upsert the Instagram SocialAccount record for a user.
 */
const saveAccount = async (userId, { accessToken, expiresIn, igUserId, igUsername }) => {
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000)
    : null;

  return prisma.socialAccount.upsert({
    where:  { userId_platform: { userId, platform: 'INSTAGRAM' } },
    update: { accessToken, expiresAt, accountId: igUserId, accountName: igUsername },
    create: {
      userId,
      platform:    'INSTAGRAM',
      accessToken,
      expiresAt,
      accountId:   igUserId,
      accountName: igUsername,
    },
  });
};

// ─── Publishing ───────────────────────────────────────────────────────────────

/**
 * Publish a single image post to Instagram feed.
 *
 * Flow:
 *   1. Create a media container  →  get containerId
 *   2. Publish the container     →  get mediaId
 *
 * @param {string} userId
 * @param {{ caption: string, mediaUrl: string }} postData
 * @returns {Promise<{ mediaId: string }>}
 */
const publishPost = async (userId, { caption, mediaUrl }) => {
  const account = await prisma.socialAccount.findUnique({
    where: { userId_platform: { userId, platform: 'INSTAGRAM' } },
  });

  if (!account) {
    const err = new Error('Instagram account not connected.');
    err.status = 400;
    throw err;
  }

  const igUserId    = account.accountId;
  const accessToken = account.accessToken;

  // Step 1 — create media container
  let containerData;
  try {
    const res = await axios.post(
      `${BASE_GRAPH}/${igUserId}/media`,
      null,
      {
        params: {
          image_url:    mediaUrl,
          caption:      caption,
          access_token: accessToken,
        },
      }
    );
    containerData = res.data;
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[Instagram publishPost] media container error:', JSON.stringify(detail));
    throw new Error(`Instagram media container failed: ${JSON.stringify(detail)}`);
  }

  const containerId = containerData.id;

  // Step 2 — publish the container (brief delay recommended by Meta)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const { data: publishData } = await axios.post(
    `${BASE_GRAPH}/${igUserId}/media_publish`,
    null,
    {
      params: {
        creation_id:  containerId,
        access_token: accessToken,
      },
    }
  );

  return { mediaId: publishData.id };
};

module.exports = { getAuthUrl, exchangeCodeForToken, getInstagramProfile, saveAccount, publishPost };
