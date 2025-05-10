const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Session = require('../models/Session');
const { comparePassword } = require('../utils/passwordUtils');

// Generate JWT tokens
const generateTokens = (user) => {
  // Access token - short lived
  const accessToken = jwt.sign(
    { 
      userId: user.id,
      username: user.username,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
  
  // Refresh token - longer lived
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Calculate expiry date for the refresh token
const calculateRefreshTokenExpiry = () => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES || '7d';
  const milliseconds = 
    expiresIn.endsWith('d') ? parseInt(expiresIn) * 24 * 60 * 60 * 1000 :
    expiresIn.endsWith('h') ? parseInt(expiresIn) * 60 * 60 * 1000 :
    expiresIn.endsWith('m') ? parseInt(expiresIn) * 60 * 1000 :
    parseInt(expiresIn) * 1000;
  
  return new Date(Date.now() + milliseconds);
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Check if username or email already exists
    const existingUser = await User.findByUsername(username) || await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    
    // Create user
    const user = await User.create({ username, email, password });
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is disabled' });
    }
    
    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    
    // Create session
    const expiresAt = calculateRefreshTokenExpiry();
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    
    await Session.create({
      userId: user.id,
      refreshToken,
      userAgent,
      ipAddress,
      expiresAt
    });
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/auth/refresh-token'
    });
    
    res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    // Get refresh token from cookies or request body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }
    
    // Find session by refresh token
    const session = await Session.findByRefreshToken(refreshToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      await Session.deactivate(session.id);
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    
    // Verify refresh token
    let decodedToken;
    try {
      decodedToken = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      await Session.deactivate(session.id);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Find user
    const user = await User.findById(decodedToken.userId);
    if (!user || !user.is_active) {
      await Session.deactivate(session.id);
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    
    // Generate new tokens
    const tokens = generateTokens(user);
    
    // Update session
    const expiresAt = calculateRefreshTokenExpiry();
    await Session.deactivate(session.id);
    await Session.create({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      expiresAt
    });
    
    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/auth/refresh-token'
    });
    
    res.json({
      message: 'Token refreshed successfully',
      accessToken: tokens.accessToken
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    // Get refresh token from cookies or request body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (refreshToken) {
      // Find and deactivate session
      const session = await Session.findByRefreshToken(refreshToken);
      if (session) {
        await Session.deactivate(session.id);
      }
    }
    
    // Clear cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh-token'
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // User ID is set by the authenticate middleware
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    // User ID is set by the authenticate middleware
    const userId = req.user.userId;
    
    const { username, email, password } = req.body;
    
    // Update user
    const user = await User.update(userId, { username, email, password });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all sessions for the current user
exports.getSessions = async (req, res) => {
  try {
    // User ID is set by the authenticate middleware
    const userId = req.user.userId;
    
    const sessions = await Session.findActiveByUser(userId);
    
    res.json(sessions.map(session => ({
      id: session.id,
      userAgent: session.user_agent,
      ipAddress: session.ip_address,
      createdAt: session.created_at,
      expiresAt: session.expires_at
    })));
  } catch (error) {
    console.error('Error getting user sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Revoke a specific session
exports.revokeSession = async (req, res) => {
  try {
    // User ID is set by the authenticate middleware
    const userId = req.user.userId;
    const { sessionId } = req.params;
    
    // Find session
    const session = await Session.findById(sessionId);
    if (!session || session.user_id !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Deactivate session
    await Session.deactivate(sessionId);
    
    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Revoke all sessions except the current one
exports.revokeAllSessions = async (req, res) => {
  try {
    // User ID is set by the authenticate middleware
    const userId = req.user.userId;
    
    // Get current session ID
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    let currentSessionId = null;
    
    if (refreshToken) {
      const session = await Session.findByRefreshToken(refreshToken);
      if (session) {
        currentSessionId = session.id;
      }
    }
    
    // Deactivate all other sessions
    const deactivatedSessions = await Session.deactivateAllForUser(userId, currentSessionId);
    
    res.json({ 
      message: 'All other sessions revoked successfully',
      count: deactivatedSessions.length 
    });
  } catch (error) {
    console.error('Error revoking all sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
