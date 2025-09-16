// backend/routes/patioRoutes.js
const express = require('express');
const router = express.Router();
const patioController = require('../controllers/patioController');

router.get('/patio', patioController.listarVeiculosNoPatio);

module.exports = router;