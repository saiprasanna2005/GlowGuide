/* ==========================================================================
   GlowGuide backend — routes/routineRoutes.js
   ========================================================================== */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const c = require('../controllers/routineController');

router.use(authMiddleware);

router.get('/', c.getRoutines);
router.post('/:type/steps', c.addStep);              // type = morning | evening
router.post('/:type/reorder', c.reorderSteps);
router.put('/steps/:id', c.updateStep);
router.delete('/steps/:id', c.deleteStep);
router.post('/steps/:id/complete', c.completeStep);

module.exports = router;
