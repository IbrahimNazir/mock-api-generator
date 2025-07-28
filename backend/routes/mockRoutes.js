const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // JWT middleware
const MockController = require('../controllers/mockController');
const { delayNMilliSecs } = require('../middleware/delayNMilliSecs');

// Mock endpoints
router.get('/:username/:apiPath/:endpointPath', delayNMilliSecs, MockController.getAllResources);
router.get('/:username/:apiPath/:endpointPath/:resourceId', delayNMilliSecs, MockController.getResourceById);
router.post('/:username/:apiPath/:endpointPath', delayNMilliSecs, MockController.createResource);
router.put('/:username/:apiPath/:endpointPath/:resourceId', delayNMilliSecs, MockController.updateResource);
router.patch('/:username/:apiPath/:endpointPath/:resourceId', delayNMilliSecs, MockController.patchResource);

module.exports = router;