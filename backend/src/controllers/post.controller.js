const prisma = require('../config/prisma');

// ─── Create Post ──────────────────────────────────────────────────────────────

/**
 * POST /api/posts
 * Body: { caption, hashtags?, mediaUrl?, platforms, scheduledTime, status? }
 */
const createPost = async (req, res) => {
  const { caption, hashtags, mediaUrl, platforms, scheduledTime, status } = req.body;

  if (!caption)       return res.status(400).json({ error: 'Caption is required.' });
  if (!platforms?.length) return res.status(400).json({ error: 'At least one platform is required.' });
  if (!scheduledTime) return res.status(400).json({ error: 'Scheduled time is required.' });

  const scheduled = new Date(scheduledTime);
  if (isNaN(scheduled.getTime())) {
    return res.status(400).json({ error: 'Invalid scheduledTime format.' });
  }

  const post = await prisma.post.create({
    data: {
      userId:        req.user.id,
      caption,
      hashtags:      hashtags  || [],
      mediaUrl:      mediaUrl  || null,
      platforms:     platforms,
      scheduledTime: scheduled,
      // Allow explicit DRAFT; default to SCHEDULED if time is in the future
      status: status || (scheduled > new Date() ? 'SCHEDULED' : 'DRAFT'),
    },
  });

  res.status(201).json({ message: 'Post created.', post });
};

// ─── List Posts ───────────────────────────────────────────────────────────────

/**
 * GET /api/posts
 * Optional query: ?status=SCHEDULED|DRAFT|PUBLISHED|FAILED
 */
const getPosts = async (req, res) => {
  const { status } = req.query;

  const where = { userId: req.user.id };
  if (status) where.status = status.toUpperCase();

  const posts = await prisma.post.findMany({
    where,
    orderBy: { scheduledTime: 'asc' },
  });

  res.json({ posts });
};

// ─── Get Single Post ──────────────────────────────────────────────────────────

/**
 * GET /api/posts/:id
 */
const getPost = async (req, res) => {
  const post = await prisma.post.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });

  if (!post) return res.status(404).json({ error: 'Post not found.' });

  res.json({ post });
};

// ─── Update Post ──────────────────────────────────────────────────────────────

/**
 * PATCH /api/posts/:id
 * Only DRAFT or SCHEDULED posts can be edited.
 */
const updatePost = async (req, res) => {
  const existing = await prisma.post.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });

  if (!existing) return res.status(404).json({ error: 'Post not found.' });

  if (!['DRAFT', 'SCHEDULED'].includes(existing.status)) {
    return res.status(400).json({
      error: `Cannot edit a post with status "${existing.status}".`,
    });
  }

  const { caption, hashtags, mediaUrl, platforms, scheduledTime, status } = req.body;

  const data = {};
  if (caption       !== undefined) data.caption       = caption;
  if (hashtags      !== undefined) data.hashtags       = hashtags;
  if (mediaUrl      !== undefined) data.mediaUrl       = mediaUrl;
  if (platforms     !== undefined) data.platforms      = platforms;
  if (status        !== undefined) data.status         = status;
  if (scheduledTime !== undefined) {
    const d = new Date(scheduledTime);
    if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid scheduledTime.' });
    data.scheduledTime = d;
  }

  const post = await prisma.post.update({
    where: { id: existing.id },
    data,
  });

  res.json({ message: 'Post updated.', post });
};

// ─── Delete Post ──────────────────────────────────────────────────────────────

/**
 * DELETE /api/posts/:id
 */
const deletePost = async (req, res) => {
  const existing = await prisma.post.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });

  if (!existing) return res.status(404).json({ error: 'Post not found.' });

  await prisma.post.delete({ where: { id: existing.id } });

  res.json({ message: 'Post deleted.' });
};

// ─── Upload Media ─────────────────────────────────────────────────────────────

/**
 * POST /api/posts/upload
 * Accepts multipart/form-data with field "media".
 * Cloudinary storage handled by multer middleware in route.
 */
const uploadMedia = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  res.status(201).json({
    message:  'File uploaded successfully.',
    mediaUrl: req.file.path,        // Cloudinary secure URL
    mediaType: req.file.mimetype?.startsWith('video') ? 'VIDEO' : 'IMAGE',
  });
};

module.exports = { createPost, getPosts, getPost, updatePost, deletePost, uploadMedia };
