// backend/routes/ordemServicoRoutes.js
const express = require('express');
const router = express.Router();

const osController = require('../controllers/ordemServicoController');
const itemOSController = require('../controllers/itemOSController');
const servicoOSController = require('../controllers/servicoOSController');

// Rotas principais da OS
router.get('/ordens-servico', osController.listarOS);
router.post('/ordens-servico', osController.abrirOS);
router.get('/ordens-servico/:id', osController.buscarOSPorId);
router.put('/ordens-servico/:id', osController.atualizarOS);

// Rotas para itens da OS
router.post('/os/:os_id/itens', itemOSController.adicionarItem);
router.delete('/itens-os/:item_id', itemOSController.removerItem);

// Rotas para serviços da OS
router.post('/os/:os_id/servicos', servicoOSController.adicionarServico);
router.delete('/servicos-os/:servico_os_id', servicoOSController.removerServico);

module.exports = router;