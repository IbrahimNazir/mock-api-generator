const express = require('express');
const apiController = require('../controllers/apiController');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

// API Routes
router.post('/',authenticate, apiController.createApi);
router.get('/', authenticate, apiController.getAllApis);
router.get('/:id',authenticate, apiController.getApiById);
router.put('/:id',authenticate, apiController.updateApi);
router.delete('/:id',authenticate, apiController.deleteApi);

module.exports = router;