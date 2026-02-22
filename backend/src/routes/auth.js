const express = require('express');
const router = express.Router();
const { login, getMe, changePassword, updateProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/password', authenticate, changePassword);
router.put('/profile', authenticate, updateProfile);

module.exports = router;
