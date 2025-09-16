// backend/routes/servicoRoutes.js
const express = require('express');
const router = express.Router();
const servicoController = require('../controllers/servicoController');

// Define as rotas para serviços
router.get('/servicos', servicoController.listarServicos);
router.post('/servicos', servicoController.criarServico);
router.put('/servicos/:id', servicoController.atualizarServico);
router.delete('/servicos/:id', servicoController.removerServico);

module.exports = router;