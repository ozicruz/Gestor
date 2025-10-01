// backend/routes/produtoRoutes.js
const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produtoController');

// Define as rotas para produtos
router.get('/produtos', produtoController.listarProdutos);
router.get('/produtos/:id', produtoController.buscarProdutoPorId);

// --- ROTA NOVA PARA A BUSCA (AUTOCOMPLETE) ---
router.get('/produtos/search', produtoController.buscarProdutosPorNome);

router.post('/produtos', produtoController.criarProduto);
router.put('/produtos/:id', produtoController.atualizarProduto);
router.delete('/produtos/:id', produtoController.removerProduto);

module.exports = router;