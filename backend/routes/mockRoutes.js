const express = require('express');
const router = express.Router();
const MockController = require('../controllers/mockController');
const { delayNMilliSecs } = require('../middleware/delayNMilliSecs');

// Mock endpoints.
// Version negotiation (query / header / body), access control and ETag
// handling happen inside the controller via services/mockResolver.js.
router.get('/:username/:apiPath/:endpointPath', delayNMilliSecs, MockController.getAllResources);
router.get('/:username/:apiPath/:endpointPath/:resourceId', delayNMilliSecs, MockController.getResourceById);
router.post('/:username/:apiPath/:endpointPath', delayNMilliSecs, MockController.createResource);
router.put('/:username/:apiPath/:endpointPath/:resourceId', delayNMilliSecs, MockController.updateResource);
router.patch('/:username/:apiPath/:endpointPath/:resourceId', delayNMilliSecs, MockController.patchResource);
router.delete('/:username/:apiPath/:endpointPath/:resourceId', delayNMilliSecs, MockController.deleteResource);

module.exports = router;