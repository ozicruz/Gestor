const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiroController');

// Listas auxiliares
router.get('/formaspagamento', financeiroController.listarFormasPagamento);
router.get('/categorias', financeiroController.listarCategorias);

// --- ROTAS DE CONTAS / CAIXAS (CORRIGIDAS) ---
router.get('/contascaixa', financeiroController.listarContas); // Usa a função nova SQL
router.post('/contascaixa', financeiroController.criarConta);
router.delete('/contascaixa/:id', financeiroController.removerConta);

// Dashboard e Movimentos
router.get('/dashboard/resumo', financeiroController.getDashboardResumo);
router.get('/movimentocaixa', financeiroController.getMovimentoCaixa);

// Lançamentos
router.post('/lancamento', financeiroController.criarLancamento);
router.delete('/lancamento/:id', financeiroController.excluirLancamento);

// Contas a Receber
router.get('/contasareceber/resumo', financeiroController.getContasAReceberResumo);
router.get('/contasareceber', financeiroController.listarContasAReceber);
router.post('/lancamento/:id/baixar', financeiroController.baixarLancamento);

// Contas a Pagar e Relatórios
router.get('/relatorios/dre', financeiroController.getRelatorioDRE);
router.get('/contasapagar', financeiroController.listarContasAPagar);
router.get('/contasapagar/resumo', financeiroController.obterResumoContasPagar);

module.exports = router;