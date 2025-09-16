// backend/controllers/vendaController.js
const Venda = require('../models/vendaModel');

const registarVenda = async (req, res) => {
    try {
        const result = await Venda.create(req.body);
        res.status(201).json({ id: result.id, message: 'Venda registada com sucesso!' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao registar a venda.', error: err.message });
    }
};

module.exports = {
    registarVenda
};