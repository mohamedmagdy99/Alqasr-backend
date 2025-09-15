// middleware/upload.js
const multer = require("multer");

const storage = multer.memoryStorage(); // good for S3
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

module.exports = upload;
