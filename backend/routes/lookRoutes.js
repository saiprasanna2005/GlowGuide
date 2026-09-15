const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const c = require('../controllers/lookController');

router.use(authMiddleware);
router.get('/', c.getLooks);
router.post('/', c.createLook);
router.delete('/:id', c.deleteLook);

module.exports = router;
