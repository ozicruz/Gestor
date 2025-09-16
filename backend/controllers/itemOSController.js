// backend/controllers/itemOSController.js
const ItemOS = require('../models/itemOSModel');
const OS = require('../models/ordemServicoModel');

const adicionarItem = async (req, res) => {
    try {
        await ItemOS.create(req.params.os_id, req.body);
        await OS.recalculateTotal(req.params.os_id);
        res.status(201).json({ message: 'Item adicionado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: err.message || 'Erro ao adicionar item.' });
    }
};

const removerItem = async (req, res) => {
    try {
        const os_id = await ItemOS.remove(req.params.item_id);
        await OS.recalculateTotal(os_id);
        res.json({ message: 'Item removido com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: err.message || 'Erro ao remover item.' });
    }
};

module.exports = { adicionarItem, removerItem };