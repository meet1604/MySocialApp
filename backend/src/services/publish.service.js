const prisma              = require('../config/prisma');
const instagramService    = require('./instagram.service');
const linkedinService     = require('./linkedin.service');

/**
 * Attempt to publish one post to all of its target platforms.
 *
 * Returns a result object per platform so the caller can decide
 * the final post status (PUBLISHED vs FAILED).
 *
 * @param {object} post  — full Post record from Prisma (includes user)
 * @returns {Promise<{ platform: string, success: boolean, error?: string }[]>}
 */
const publishPost = async (post) => {
  const { id: postId, userId, caption, hashtags, mediaUrl, platforms } = post;

  // Build the full caption — append hashtags if any
  const fullCaption = hashtags?.length
    ? `${caption}\n\n${hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}`
    : caption;

  const results = [];

  for (const platform of platforms) {
    try {
      if (platform === 'INSTAGRAM') {
        if (!mediaUrl) {
          throw new Error('Instagram requires a media URL (image/video).');
        }
        await instagramService.publishPost(userId, {
          caption:  fullCaption,
          mediaUrl,
        });
        console.log(`[PUBLISH] ✅ Instagram — Post ${postId}`);
      }

      if (platform === 'LINKEDIN') {
        await linkedinService.publishPost(userId, {
          caption:  fullCaption,
          mediaUrl: mediaUrl || null,
        });
        console.log(`[PUBLISH] ✅ LinkedIn — Post ${postId}`);
      }

      results.push({ platform, success: true });
    } catch (err) {
      console.error(`[PUBLISH] ❌ ${platform} — Post ${postId}: ${err.message}`);
      results.push({ platform, success: false, error: err.message });
    }
  }

  return results;
};

/**
 * Fetch all posts that are due to be published.
 * Criteria: status = SCHEDULED AND scheduledTime <= now
 */
const fetchDuePosts = async () => {
  return prisma.post.findMany({
    where: {
      status:        'SCHEDULED',
      scheduledTime: { lte: new Date() },
    },
  });
};

/**
 * Mark a post as PUBLISHED.
 * @param {string} postId
 */
const markPublished = async (postId) => {
  return prisma.post.update({
    where: { id: postId },
    data:  {
      status:      'PUBLISHED',
      publishedAt: new Date(),
      errorMessage: null,
    },
  });
};

/**
 * Mark a post as FAILED with an error summary.
 * @param {string} postId
 * @param {string} errorSummary
 */
const markFailed = async (postId, errorSummary) => {
  return prisma.post.update({
    where: { id: postId },
    data:  {
      status:       'FAILED',
      errorMessage: errorSummary,
    },
  });
};

/**
 * Process a single post end-to-end:
 *   fetch → publish → update status
 *
 * Safe — never throws. All errors are caught and written to DB.
 *
 * @param {object} post
 */
const processSinglePost = async (post) => {
  console.log(`[SCHEDULER] Processing post ${post.id} (platforms: ${post.platforms.join(', ')})`);

  let results;
  try {
    results = await publishPost(post);
  } catch (err) {
    // Unexpected top-level error (e.g. DB connection)
    console.error(`[SCHEDULER] Unexpected error on post ${post.id}:`, err.message);
    await markFailed(post.id, err.message);
    return;
  }

  const allSucceeded    = results.every((r) => r.success);
  const anyFailed       = results.some((r) => !r.success);
  const failedPlatforms = results.filter((r) => !r.success);

  if (allSucceeded) {
    await markPublished(post.id);
  } else {
    // Partial failure or full failure — mark FAILED with details
    const summary = failedPlatforms
      .map((r) => `${r.platform}: ${r.error}`)
      .join(' | ');
    await markFailed(post.id, summary);
  }
};

module.exports = { publishPost, fetchDuePosts, processSinglePost, markPublished, markFailed };
