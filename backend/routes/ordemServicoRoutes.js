const express = require('express');
const router = express.Router();
const osController = require('../controllers/ordemServicoController');

// Rotas Padrão
router.get('/', osController.listarOS);
router.post('/', osController.criarOrdemServico);
router.get('/:id', osController.buscarOSPorId);
router.put('/:id', osController.atualizarOS);

// Rota de Gerar Venda (POST)
router.post('/:id/gerar-venda', osController.gerarVendaDeOS);

module.exports = router;