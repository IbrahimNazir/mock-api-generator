const express = require('express');
const mockController = require('../controllers/mockController');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

// Mock API Routes
router.all('/:apiId/*', mockController.handleMockRequest);

module.exports = router;