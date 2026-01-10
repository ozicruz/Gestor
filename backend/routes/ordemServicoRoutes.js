const express = require('express');
const router = express.Router();
const ordemServicoController = require('../controllers/ordemServicoController');

// Listar todas
router.get('/', ordemServicoController.listarOS);

// Criar nova
router.post('/', ordemServicoController.criarOrdemServico);

// Buscar uma específica
router.get('/:id', ordemServicoController.buscarOSPorId);

// Atualizar (Salvar/Editar)
// O erro estava aqui: certifique-se de que o controller exporta 'atualizarOrdemServico'
router.put('/:id', ordemServicoController.atualizarOrdemServico);

module.exports = router;