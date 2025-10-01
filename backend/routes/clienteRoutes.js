// backend/routes/clienteRoutes.js
const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const veiculoController = require('../controllers/veiculoController');

// Rotas para Clientes
router.get('/clientes', clienteController.listarClientes);

// --- ROTA NOVA PARA A BUSCA (AUTOCOMPLETE) ---
router.get('/clientes/search', clienteController.buscarClientesPorNome);

router.post('/clientes', clienteController.criarCliente);
router.put('/clientes/:id', clienteController.atualizarCliente);
router.delete('/clientes/:id', clienteController.removerCliente);

// Rotas para Veículos
// ... (o resto do arquivo continua igual)
router.get('/clientes/:cliente_id/veiculos', veiculoController.listarVeiculosDoCliente);
router.get('/veiculos/placa/:placa', veiculoController.buscarVeiculoPorPlaca);
router.post('/veiculos', veiculoController.adicionarVeiculo);
router.delete('/veiculos/:id', veiculoController.removerVeiculo);

module.exports = router;