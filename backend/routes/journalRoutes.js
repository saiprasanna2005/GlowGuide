const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const c = require('../controllers/journalController');

router.use(authMiddleware);
router.get('/', c.getEntries);
router.get('/:id', c.getEntry);
router.post('/', c.createEntry);
router.put('/:id', c.updateEntry);
router.delete('/:id', c.deleteEntry);

module.exports = router;
