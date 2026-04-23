const cron                 = require('node-cron');
const { fetchDuePosts, processSinglePost } = require('../services/publish.service');

// Guard — prevents two runs overlapping if a tick takes longer than 1 minute
let isRunning = false;

/**
 * Core job logic executed on every cron tick.
 * Fetches all due posts and processes them concurrently.
 */
const runPublishJob = async () => {
  if (isRunning) {
    console.log('[SCHEDULER] Previous tick still running — skipping this tick.');
    return;
  }

  isRunning = true;

  try {
    const posts = await fetchDuePosts();

    if (posts.length === 0) {
      // Quiet tick — no posts due
      return;
    }

    console.log(`[SCHEDULER] ⏰ Tick — ${posts.length} post(s) due for publishing.`);

    // Process all due posts in parallel (independent of each other)
    await Promise.allSettled(posts.map((post) => processSinglePost(post)));

    console.log(`[SCHEDULER] ✅ Tick complete — processed ${posts.length} post(s).`);
  } catch (err) {
    // Never crash the server — log and continue
    console.error('[SCHEDULER] ❌ Fatal job error:', err.message);
  } finally {
    isRunning = false;
  }
};

/**
 * Start the cron scheduler.
 * Called once on server startup from server.js.
 *
 * Schedule: every minute  →  "* * * * *"
 */
const startScheduler = () => {
  cron.schedule('* * * * *', runPublishJob, {
    scheduled: true,
    timezone:  'UTC',   // always use UTC internally; frontend handles display conversion
  });

  console.log('[SCHEDULER] ✅ Cron job started — running every minute (UTC).');
};

module.exports = { startScheduler };
