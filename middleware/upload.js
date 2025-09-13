const multer = require('multer');
const storage = multer.memoryStorage(); // files stored in memory temporarily
const upload = multer({ storage });
module.exports = upload;