const express = require('express');
const userRoutes = require('./userRoutes');
const apiRoutes = require('./apiRoutes');
const endpointRoutes = require('./endpointRoutes');
const endpointRelationshipRoutes = require('./endpointRelationshipRoutes');
const resourceRoutes = require('./resourceRoutes');
const pingRoutes = require('./pingRoutes');


const router = express.Router();

router.use('/users', userRoutes);
router.use('/apis', apiRoutes);
router.use('/endpoints', endpointRoutes);
router.use('/relationships', endpointRelationshipRoutes);
router.use('/resources', resourceRoutes);
router.use('/ping', pingRoutes);

module.exports = router;