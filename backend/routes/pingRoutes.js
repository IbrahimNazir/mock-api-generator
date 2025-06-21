const express = require('express');
const UserController = require('../controllers/userController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('*',(req, res) => {
  // This route is for testing purposes only
  res.status(200).json({ message: 'Ping successful' });
});

module.exports = router;