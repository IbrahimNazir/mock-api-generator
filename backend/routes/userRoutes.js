const express = require('express');
const UserController = require('../controllers/userController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', UserController.register);
router.post('/login', UserController.login);
router.get('/profile', auth, UserController.getProfile);
router.put('/profile', auth, UserController.updateProfile);
router.delete('/profile', auth, UserController.deleteProfile);
router.get('/apis', auth, UserController.getUserApis);

module.exports = router;