const User = require('../models/User');
const { comparePassword } = require('../utils/passwordUtils');
const jwt = require('jsonwebtoken');

class UserController {
  static async register(req, res) {
    try {
      const { username, email, password, role } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      const user = await User.create({ username, email, password, role });
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
      res.status(201).json({ user, token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const user = await User.findByEmail(email);
      if (!user || !(await comparePassword(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is inactive' });
      }
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
      res.json({ user: { id: user.id, username: user.username, email: user.email, role: user.role }, token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateProfile(req, res) {
    try {
      const updates = req.body;
      const user = await User.update(req.user.id, updates);
      if (!user) {
        return res.status(400).json({ error: 'No updates provided' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteProfile(req, res) {
    try {
      const result = await User.delete(req.user.id);
      if (!result) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getUserApis(req, res) {
    try {
      const apis = await User.getApis(req.user.id);
      res.json(apis);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = UserController;