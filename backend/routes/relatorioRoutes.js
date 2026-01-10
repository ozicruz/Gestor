const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');
const vendaController = require('../controllers/vendaController');

router.get('/produtos-mais-vendidos', relatorioController.listarProdutosMaisVendidos);
router.get('/stock-baixo', relatorioController.listarStockBaixo);
router.get('/vendas', relatorioController.listarVendasRealizadas);
router.get('/vendas/:id', relatorioController.buscarDetalhesVenda);
router.get('/servicos-ranking', relatorioController.listarRankingServicos);
router.get('/clientes-ranking', relatorioController.listarRankingClientes);
router.get('/performance-vendedores', vendaController.obterPerformanceVendedores);
router.get('/auditoria-vendas', relatorioController.getAuditoriaVendas);

module.exports = router;