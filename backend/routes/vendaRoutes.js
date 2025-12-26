const express = require('express');
const router = express.Router();
const vendaController = require('../controllers/vendaController');

router.post('/', vendaController.criarVenda);

module.exports = router;