const cloudinary = require('cloudinary').v2; // v1 package, still uses .v2 API
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage for multer — stores directly to cloud
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'my-post-app',         // Cloudinary folder name
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov'],
    resource_type: 'auto',          // auto-detect image or video
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

module.exports = { cloudinary, upload };
