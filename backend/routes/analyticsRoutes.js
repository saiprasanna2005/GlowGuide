const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const c = require('../controllers/analyticsController');

router.use(authMiddleware);
router.get('/dashboard', c.getDashboard);

module.exports = router;
