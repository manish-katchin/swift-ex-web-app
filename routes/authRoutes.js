const express = require('express');
const { loginUser, registerAdmin, setupSuperAdmin } = require('../controllers/authController');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', loginUser);
router.post('/setup-superadmin', setupSuperAdmin);
router.post('/register-admin', verifyToken, restrictTo('superadmin'), registerAdmin);

module.exports = router;