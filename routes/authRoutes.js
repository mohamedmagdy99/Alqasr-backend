const express = require('express');
const router = express.Router();
const {signup,signin,getUsers} = require('../controllers/authController');
router.post('/signup',signup);
router.post('/backend/signin',signin);
router.post('/',getUsers);
module.exports = router;