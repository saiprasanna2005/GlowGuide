const express = require('express');
const router = express.Router();
const optionalAuth = require('../middleware/optionalAuth');
const c = require('../controllers/feedbackController');

router.post('/', optionalAuth, c.submitFeedback);

module.exports = router;
