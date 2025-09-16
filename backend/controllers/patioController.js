// backend/controllers/patioController.js
const Patio = require('../models/patioModel');

const listarVeiculosNoPatio = async (req, res) => {
    try {
        const veiculos = await Patio.findAllActive();
        res.json(veiculos);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar veículos no pátio.', error: err.message });
    }
};

module.exports = {
    listarVeiculosNoPatio
};