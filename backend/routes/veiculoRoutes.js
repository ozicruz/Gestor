const express = require('express');
const router = express.Router();
const veiculoController = require('../controllers/veiculoController');

router.get('/', veiculoController.listarVeiculos);
router.post('/', veiculoController.adicionarVeiculo);

router.delete('/:id', veiculoController.removerVeiculo);

module.exports = router;