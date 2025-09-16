// backend/routes/vendaRoutes.js
const express = require('express');
const router = express.Router();
const vendaController = require('../controllers/vendaController');

// A venda de balcão é uma única operação de criação (POST)
router.post('/vendas', vendaController.registarVenda);

module.exports = router;