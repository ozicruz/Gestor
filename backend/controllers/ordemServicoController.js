// backend/controllers/ordemServicoController.js
const OS = require('../models/ordemServicoModel');

const listarOS = async (req, res) => {
    try {
        const ordens = await OS.findAll();
        res.json(ordens);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar Ordens de Serviço.', error: err.message });
    }
};
const OrdemServico = require('../models/ordemServicoModel');

const criarOrdemServico = async (req, res) => {
    try {
        const { placa } = req.body;
        if (!placa) {
            return res.status(400).json({ message: 'A placa do veículo é obrigatória.' });
        }

        const result = await OrdemServico.create(placa);
        res.status(201).json({ id: result.id, message: 'Ordem de Serviço criada com sucesso.' });
    } catch (err) {
        console.error('--- ERRO DETALHADO NO BACKEND ---', err);
        res.status(500).json({ message: 'Erro ao criar a Ordem de Serviço.', error: err.message });
    }
};

const buscarOSPorId = async (req, res) => {
    try {
        const os = await OS.findById(req.params.id);
        if (os) res.json(os);
        else res.status(404).json({ message: 'Ordem de Serviço não encontrada.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar detalhes da OS.', error: err.message });
    }
};

const abrirOS = async (req, res) => {
    try {
        const result = await OS.create(req.body);
        res.status(201).json({ id: result.id, message: 'Ordem de Serviço aberta com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao abrir Ordem de Serviço.', error: err.message });
    }
};

const atualizarOS = async (req, res) => {
    try {
        await OS.update(req.params.id, req.body);
        res.json({ message: 'OS atualizada com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar a OS.', error: err.message });
    }
};

module.exports = { listarOS, buscarOSPorId, abrirOS, atualizarOS, criarOrdemServico };