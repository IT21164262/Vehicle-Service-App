const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/authMiddleware.cjs');
const service = require('../controllers/serviceController.cjs');
const { handleServiceUpload } = require('../middleware/serviceUpload.cjs');

router.use(authenticate);
router.get('/', service.list);
router.get('/promoted', service.promoted);
router.get('/popular', service.popular);
router.get('/recent', service.recent);
router.post('/', requireAdmin, service.create);
router.get('/:id', service.validateId, service.get);
router.patch('/:id', requireAdmin, service.validateId, service.update);
router.post('/:id/image', requireAdmin, service.validateId, handleServiceUpload, service.uploadImage);
router.post('/:id/promo-image', requireAdmin, service.validateId, handleServiceUpload, service.uploadPromoImage);
router.delete('/:id', requireAdmin, service.validateId, service.remove);

module.exports = router;
