// backend/controllers/servicoController.js
const Servico = require('../models/servicoModel');

const listarServicos = async (req, res) => {
    try {
        const servicos = await Servico.findAll();
        res.json(servicos);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar serviços.', error: err.message });
    }
};

const criarServico = async (req, res) => {
    try {
        const result = await Servico.create(req.body);
        res.status(201).json({ id: result.id, message: 'Serviço criado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao criar serviço.', error: err.message });
    }
};

const atualizarServico = async (req, res) => {
    try {
        await Servico.update(req.params.id, req.body);
        res.json({ message: 'Serviço atualizado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar serviço.', error: err.message });
    }
};

const removerServico = async (req, res) => {
    try {
        await Servico.remove(req.params.id);
        res.json({ message: 'Serviço removido com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao remover serviço.', error: err.message });
    }
};

module.exports = {
    listarServicos,
    criarServico,
    atualizarServico,
    removerServico
};