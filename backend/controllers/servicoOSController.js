// backend/controllers/servicoOSController.js
const ServicoOS = require('../models/servicoOSModel');
const OS = require('../models/ordemServicoModel');

const adicionarServico = async (req, res) => {
    try {
        await ServicoOS.create(req.params.os_id, req.body);
        await OS.recalculateTotal(req.params.os_id);
        res.status(201).json({ message: 'Serviço adicionado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: err.message || 'Erro ao adicionar serviço.' });
    }
};

const removerServico = async (req, res) => {
    try {
        const os_id = await ServicoOS.remove(req.params.servico_os_id);
        await OS.recalculateTotal(os_id);
        res.json({ message: 'Serviço removido com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: err.message || 'Erro ao remover serviço.' });
    }
};

module.exports = { adicionarServico, removerServico };