// backend/routes/backupRoutes.js
const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');

router.get('/download', backupController.realizarBackup);
router.post('/restore', backupController.restaurarBackup);

module.exports = router;