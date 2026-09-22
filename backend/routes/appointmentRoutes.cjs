const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/authMiddleware.cjs');
const appointment = require('../controllers/appointmentController.cjs');

router.use(authenticate);
router.post('/', appointment.create);
router.get('/', appointment.list);
router.get('/:id', appointment.validateId, appointment.get);
router.patch('/:id/status', requireAdmin, appointment.validateId, appointment.changeStatus);
router.patch('/:id', appointment.validateId, appointment.update);
router.delete('/:id', appointment.validateId, appointment.remove);

module.exports = router;
