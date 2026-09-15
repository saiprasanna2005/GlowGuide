const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const c = require('../controllers/settingsController');

router.use(authMiddleware);
router.get('/', c.getSettings);
router.put('/', c.putSettings);

module.exports = router;
