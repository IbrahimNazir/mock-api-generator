const express = require('express');
const ApiController = require('../controllers/apiController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, ApiController.createApi);
router.get('/:id', auth, ApiController.getApi);
router.get('/', auth, ApiController.getAllApis);
router.put('/:id', auth, ApiController.updateApi);
router.delete('/:id', auth, ApiController.deleteApi);

module.exports = router;