const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produtoController');

// 1. Rotas Específicas (DEVEM VIR PRIMEIRO)
router.get('/produtos/search', produtoController.buscarProdutosPorNome); // <--- O autocomplete chama aqui
router.get('/produtos/buscar', produtoController.buscarProdutosPorNome); // (Backup caso chame 'buscar')

// 2. Rotas Gerais
router.get('/produtos', produtoController.listarProdutos);
router.post('/produtos', produtoController.criarProduto);

// 3. Rotas com ID (DEVEM VIR DEPOIS DAS ESPECÍFICAS)
// Se esta viesse primeiro, o sistema acharia que "search" é um ID
router.get('/produtos/:id', produtoController.buscarProdutoPorId);
router.put('/produtos/:id', produtoController.atualizarProduto);
router.delete('/produtos/:id', produtoController.removerProduto);

// 4. Rotas Extras (Histórico/Preços)
router.get('/produtos/:id/historico', produtoController.obterHistorico);
router.get('/produtos/:id/melhores-precos', produtoController.obterMelhoresPrecos);
router.post('/produtos/:id/entrada', produtoController.registrarEntradaEstoque);

module.exports = router;