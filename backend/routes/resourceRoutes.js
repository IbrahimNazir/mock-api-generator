const express = require('express');
const ResourceController = require('../controllers/resourceController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, ResourceController.createResource);
router.get('/:id', auth, ResourceController.getResource);
router.get('/endpoint/:endpointId', auth, ResourceController.getResourcesByEndpoint);
router.put('/:id', auth, ResourceController.updateResource);
router.delete('/:id', auth, ResourceController.deleteResource);

module.exports = router;