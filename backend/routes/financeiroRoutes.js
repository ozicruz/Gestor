const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiroController');

// --- 1. Contas e Caixas ---
// CORREÇÃO: Frontend chama '/contas', não '/contascaixa'
router.get('/contas', financeiroController.listarContas); 
router.get('/contascaixa', financeiroController.listarContas); // Mantém compatibilidade
router.post('/contascaixa', financeiroController.criarConta);
router.delete('/contascaixa/:id', financeiroController.removerConta);

// --- 2. Auxiliares ---
router.get('/formas-pagamento', financeiroController.listarFormasPagamento);
router.get('/categorias', financeiroController.listarCategorias);

// --- 3. Lançamentos ---
router.post('/lancamentos', financeiroController.criarLancamento);
// CORREÇÃO: Frontend chama '/baixar' (verbo), não '/baixa'
router.put('/lancamentos/:id/baixar', financeiroController.baixarLancamento); 
router.put('/lancamentos/:id/baixa', financeiroController.baixarLancamento); // Mantém compatibilidade
router.delete('/lancamentos/:id', financeiroController.excluirLancamento);

// --- 4. Relatórios e Dashboard ---
router.get('/dashboard/resumo', financeiroController.getDashboardResumo);
router.get('/movimento-caixa', financeiroController.getMovimentoCaixa);
router.get('/contas-receber/resumo', financeiroController.getContasAReceberResumo);
router.get('/contas-receber', financeiroController.listarContasAReceber);
router.get('/contas-pagar/resumo', financeiroController.obterResumoContasPagar);
router.get('/contas-pagar', financeiroController.listarContasAPagar);
router.get('/relatorios/dre', financeiroController.getRelatorioDRE);

module.exports = router;