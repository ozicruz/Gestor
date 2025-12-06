// backend/routes/relatorioRoutes.js
const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');

// Define a rota: GET /api/relatorios/produtos-mais-vendidos
router.get('/produtos-mais-vendidos', relatorioController.listarProdutosMaisVendidos);

// Define a rota: GET /api/relatorios/stock-baixo
router.get('/stock-baixo', relatorioController.listarStockBaixo);

router.get('/vendas', relatorioController.listarVendasRealizadas);

router.get('/vendas/:id', relatorioController.buscarDetalhesVenda);

module.exports = router;