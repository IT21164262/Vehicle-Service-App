const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/authMiddleware.cjs');
const service = require('../controllers/serviceController.cjs');

router.use(authenticate);
router.get('/', service.list);
router.post('/', requireAdmin, service.create);
router.get('/:id', service.validateId, service.get);
router.patch('/:id', requireAdmin, service.validateId, service.update);
router.delete('/:id', requireAdmin, service.validateId, service.remove);

module.exports = router;
