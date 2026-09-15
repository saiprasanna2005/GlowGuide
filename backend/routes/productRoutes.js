const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const c = require('../controllers/productController');

router.use(authMiddleware);
router.get('/', c.getProducts);
router.post('/', c.createProduct);
router.put('/:id', c.updateProduct);
router.delete('/:id', c.deleteProduct);

module.exports = router;
