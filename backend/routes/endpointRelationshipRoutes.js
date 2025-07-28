const express = require('express');
const auth = require('../middleware/auth');
const EndpointRelationshipsController = require('../controllers/endpointRelationshipController');

const router = express.Router();

router.post('/', auth, EndpointRelationshipsController.createRelationship);
router.get('/:id', auth, EndpointRelationshipsController.getRelationship);
router.get('/endpoint/:endpointId', auth, EndpointRelationshipsController.getRelationshipsByEndpoint);
router.delete('/:id', auth, EndpointRelationshipsController.deleteRelationship);
router.delete('/endpoint/:id', auth, EndpointRelationshipsController.deleteByEndpointId);

module.exports = router;