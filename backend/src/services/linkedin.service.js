const axios = require('axios');
const prisma = require('../config/prisma');

const AUTH_URL   = 'https://www.linkedin.com/oauth/v2';
const API_URL    = 'https://api.linkedin.com/v2';

// ─── OAuth ────────────────────────────────────────────────────────────────────

/**
 * Build the LinkedIn OAuth authorisation URL.
 */
const getAuthUrl = (token) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.LINKEDIN_CLIENT_ID,
    redirect_uri:  process.env.LINKEDIN_REDIRECT_URI,
    // w_member_social  — create/delete posts
    // r_liteprofile    — read basic profile (id, name)
    // r_emailaddress   — read email
    scope:         'openid profile email w_member_social',
    state:         token || 'linkedin_oauth_state', // pass JWT token through OAuth state param
  });
  return `${AUTH_URL}/authorization?${params.toString()}`;
};

/**
 * Exchange OAuth `code` for an access token.
 * @param {string} code
 * @returns {Promise<{ accessToken: string, expiresIn: number }>}
 */
const exchangeCodeForToken = async (code) => {
  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  process.env.LINKEDIN_REDIRECT_URI,
    client_id:     process.env.LINKEDIN_CLIENT_ID,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
  });

  const { data } = await axios.post(`${AUTH_URL}/accessToken`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return {
    accessToken: data.access_token,
    expiresIn:   data.expires_in, // seconds (~5184000 = 60 days)
  };
};

/**
 * Fetch the authenticated LinkedIn member's profile (id + name).
 * @param {string} accessToken
 * @returns {Promise<{ memberId: string, name: string }>}
 */
const getMemberProfile = async (accessToken) => {
  const { data } = await axios.get(`${API_URL}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return {
    memberId: data.sub,                                       // URN-safe numeric ID
    name:     `${data.given_name} ${data.family_name}`.trim(),
  };
};

/**
 * Upsert LinkedIn SocialAccount record for a user.
 */
const saveAccount = async (userId, { accessToken, expiresIn, memberId, name }) => {
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000)
    : null;

  return prisma.socialAccount.upsert({
    where:  { userId_platform: { userId, platform: 'LINKEDIN' } },
    update: { accessToken, expiresAt, accountId: memberId, accountName: name },
    create: {
      userId,
      platform:    'LINKEDIN',
      accessToken,
      expiresAt,
      accountId:   memberId,
      accountName: name,
    },
  });
};

// ─── Publishing ───────────────────────────────────────────────────────────────

/**
 * Register an image with LinkedIn's Assets API (required before attaching to a post).
 * @param {string} memberId
 * @param {string} accessToken
 * @returns {Promise<{ asset: string, uploadUrl: string }>}
 */
const registerImageUpload = async (memberId, accessToken) => {
  const { data } = await axios.post(
    `${API_URL}/assets?action=registerUpload`,
    {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner:   `urn:li:person:${memberId}`,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier:       'urn:li:userGeneratedContent',
          },
        ],
      },
    },
    {
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    }
  );

  return {
    asset:     data.value.asset,
    uploadUrl: data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
  };
};

/**
 * Upload image binary to LinkedIn's upload URL.
 * @param {string} uploadUrl
 * @param {Buffer} imageBuffer  — raw image bytes
 * @param {string} accessToken
 */
const uploadImageToLinkedIn = async (uploadUrl, imageBuffer, accessToken) => {
  await axios.put(uploadUrl, imageBuffer, {
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
  });
};

/**
 * Publish a UGC post to LinkedIn.
 * Supports text-only posts and image posts.
 *
 * @param {string} userId  — internal app user id
 * @param {{ caption: string, mediaUrl?: string, imageBuffer?: Buffer }} postData
 * @returns {Promise<{ postId: string }>}
 */
const publishPost = async (userId, { caption, mediaUrl, imageBuffer }) => {
  const account = await prisma.socialAccount.findUnique({
    where: { userId_platform: { userId, platform: 'LINKEDIN' } },
  });

  if (!account) {
    const err = new Error('LinkedIn account not connected.');
    err.status = 400;
    throw err;
  }

  const { accessToken, accountId: memberId } = account;

  // Build the UGC post body
  let shareMediaCategory = 'NONE';
  let media              = [];

  if (imageBuffer || mediaUrl) {
    // Register + upload image asset
    const { asset, uploadUrl } = await registerImageUpload(memberId, accessToken);
    const buffer = imageBuffer || (await fetchRemoteImage(mediaUrl));
    await uploadImageToLinkedIn(uploadUrl, buffer, accessToken);

    shareMediaCategory = 'IMAGE';
    media = [
      {
        status:      'READY',
        description: { text: caption.substring(0, 200) },
        media:       asset,
        title:       { text: 'Post Image' },
      },
    ];
  }

  const body = {
    author:         `urn:li:person:${memberId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary:   { text: caption },
        shareMediaCategory,
        ...(media.length > 0 && { media }),
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const { data, headers } = await axios.post(`${API_URL}/ugcPosts`, body, {
    headers: {
      Authorization:               `Bearer ${accessToken}`,
      'Content-Type':              'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });

  // LinkedIn returns the post ID in the x-restli-id header
  const postId = headers['x-restli-id'] || data.id;
  return { postId };
};

/**
 * Helper — download a remote image as a Buffer (for Cloudinary-hosted media).
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
const fetchRemoteImage = async (url) => {
  const { data } = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(data);
};

module.exports = {
  getAuthUrl,
  exchangeCodeForToken,
  getMemberProfile,
  saveAccount,
  publishPost,
};
