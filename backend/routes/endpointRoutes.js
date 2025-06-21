const express = require('express');
const EndpointController = require('../controllers/endpointController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, EndpointController.createEndpoint);
router.get('/:id', auth, EndpointController.getEndpoint);
router.get('/api/:apiId', auth, EndpointController.getEndpointsByApi);
router.put('/:id', auth, EndpointController.updateEndpoint);
router.delete('/:id', auth, EndpointController.deleteEndpoint);

module.exports = router;