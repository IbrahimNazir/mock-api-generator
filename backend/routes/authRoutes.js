// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {authenticate} = require('../middleware/authenticate');

// Public routes (no authentication required)
router.post('/register', authController.register); // Register a new user
router.post('/login', authController.login); // Login and get access/refresh tokens
router.post('/refresh-token', authController.refreshToken); // Refresh access token using refresh token
router.post('/logout', authController.logout); // Logout and invalidate refresh token

// Protected routes (require JWT authentication)
router.get('/profile', authenticate, authController.getProfile); // Get current user's profile
router.put('/profile', authenticate, authController.updateProfile); // Update current user's profile
router.get('/sessions', authenticate, authController.getSessions); // Get all active sessions for the current user
router.delete('/sessions/:sessionId', authenticate, authController.revokeSession); // Revoke a specific session
router.delete('/sessions', authenticate, authController.revokeAllSessions); // Revoke all sessions except the current one

module.exports = router;