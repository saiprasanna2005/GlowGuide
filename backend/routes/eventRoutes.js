const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const c = require('../controllers/eventController');

router.use(authMiddleware);
router.get('/', c.getEvents);
router.post('/', c.createEvent);
router.put('/:id', c.updateEvent);
router.delete('/:id', c.deleteEvent);
router.put('/:id/tasks/:taskId', c.updateTask);

module.exports = router;
