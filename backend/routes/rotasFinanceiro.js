// backend/routes/rotasFinanceiro.js
const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiroController');
const { db } = require('../database/database'); // Importamos o db, embora o controller o use mais

// --- Rotas de Apoio (Listas) ---
router.get('/categorias', financeiroController.listarCategorias);
router.get('/contascaixa', financeiroController.listarContasCaixa);

// --- Rotas do Dashboard (Página 1) ---
router.get('/dashboard/resumo', financeiroController.getDashboardResumo);
router.get('/movimentocaixa', financeiroController.getMovimentoCaixa);
router.post('/lancamento', financeiroController.criarLancamentoManual);

// --- Rotas de Contas a Receber (Página 2) ---
router.get('/contasareceber/resumo', financeiroController.getContasAReceberResumo);
router.get('/contasareceber', financeiroController.listarContasAReceber);
router.post('/lancamento/:id/baixar', financeiroController.baixarLancamento); // Ação de pagar

// --- Rotas de Relatórios (Página 3) ---
router.get('/relatorios/dre', financeiroController.getRelatorioDRE);


console.log('✅ Ficheiro de rotas FINANCEIRO carregado!'); // Log para sabermos que funcionou

module.exports = router;