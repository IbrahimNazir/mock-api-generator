const express = require('express');
const router = express.Router();
const MockController = require('../controllers/mockController');
const { delayNMilliSecs } = require('../middleware/delayNMilliSecs');
const { mockLimiter } = require('../middleware/rateLimit');

// Mock endpoints.
// Version negotiation (query / header / body), access control and ETag
// handling happen inside the controller via services/mockResolver.js.
// Rate limit first (cheap, per IP + per API), then the optional simulated latency.
const guard = [mockLimiter, delayNMilliSecs];

router.get('/:username/:apiPath/:endpointPath', guard, MockController.getAllResources);
router.get('/:username/:apiPath/:endpointPath/:resourceId', guard, MockController.getResourceById);
router.post('/:username/:apiPath/:endpointPath', guard, MockController.createResource);
router.put('/:username/:apiPath/:endpointPath/:resourceId', guard, MockController.updateResource);
router.patch('/:username/:apiPath/:endpointPath/:resourceId', guard, MockController.patchResource);
router.delete('/:username/:apiPath/:endpointPath/:resourceId', guard, MockController.deleteResource);

module.exports = router;