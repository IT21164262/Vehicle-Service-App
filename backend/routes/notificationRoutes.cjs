const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware.cjs');
const controller = require('../controllers/notificationController.cjs');
router.use(authenticate);
router.get('/', controller.list);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);
module.exports = router;
