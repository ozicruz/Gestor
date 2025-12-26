const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');

router.get('/produtos-mais-vendidos', relatorioController.listarProdutosMaisVendidos);
router.get('/stock-baixo', relatorioController.listarStockBaixo);
router.get('/vendas', relatorioController.listarVendasRealizadas);
router.get('/vendas/:id', relatorioController.buscarDetalhesVenda);
router.get('/servicos-ranking', relatorioController.listarRankingServicos);
router.get('/clientes-ranking', relatorioController.listarRankingClientes);

module.exports = router;