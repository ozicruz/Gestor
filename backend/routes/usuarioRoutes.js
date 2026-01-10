const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Rotas de Gestão
router.get('/usuarios', usuarioController.listarUsuarios);
router.post('/usuarios', usuarioController.criarUsuario);
router.put('/usuarios/:id', usuarioController.atualizarUsuario);
router.delete('/usuarios/:id', usuarioController.removerUsuario);

// Rota de Login
router.post('/login', usuarioController.autenticar);

router.post('/usuarios/gerar-folha', usuarioController.gerarFolhaPagamento);

module.exports = router;