const express    = require('express');
const router     = express.Router();
const { protect }  = require('../middleware/auth.middleware');
const { upload }   = require('../config/cloudinary');
const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  uploadMedia,
} = require('../controllers/post.controller');

// All post routes are protected
router.use(protect);

// POST   /api/posts/upload   — upload media to Cloudinary (must be before /:id routes)
router.post('/upload', upload.single('media'), uploadMedia);

// POST   /api/posts          — create a new post
router.post('/',    createPost);

// GET    /api/posts          — list all posts (?status=SCHEDULED etc.)
router.get('/',     getPosts);

// GET    /api/posts/:id      — get single post
router.get('/:id',  getPost);

// PATCH  /api/posts/:id      — update a draft/scheduled post
router.patch('/:id', updatePost);

// DELETE /api/posts/:id      — delete a post
router.delete('/:id', deletePost);

module.exports = router;
