const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // JWT middleware
const MockController = require('../controllers/mockController');

// Mock endpoints
router.get('/:username/:apiPath/:endpointPath', MockController.getAllResources);
router.get('/:username/:apiPath/:endpointPath/:resourceId', MockController.getResourceById);
router.post('/:username/:apiPath/:endpointPath', MockController.createResource);
router.put('/:username/:apiPath/:endpointPath/:resourceId', MockController.updateResource);
router.patch('/:username/:apiPath/:endpointPath/:resourceId', MockController.patchResource);

module.exports = router;