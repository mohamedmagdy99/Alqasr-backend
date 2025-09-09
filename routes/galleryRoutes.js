const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const{getGallery} = require('../controllers/galleryController');
router.get('/',auth,getGallery);
module.exports = router;