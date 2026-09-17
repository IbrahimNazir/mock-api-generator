const express = require('express');
const UserController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, UserController.register);
router.post('/login', authLimiter, UserController.login);
router.get('/profile', auth, UserController.getProfile);
router.put('/profile', auth, UserController.updateProfile);
router.delete('/profile', auth, UserController.deleteProfile);
router.get('/apis', auth, UserController.getUserApis);

module.exports = router;