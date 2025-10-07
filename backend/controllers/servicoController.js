// backend/controllers/servicoController.js
const Servico = require('../models/servicoModel');

// --- FUNÇÃO DE BUSCA ADICIONADA ---
const buscarServicosPorNome = async (req, res) => {
    try {
        const termo = req.query.q;
        if (!termo) {
            return res.json([]);
        }
        const servicos = await Servico.searchByName(termo);
        res.json(servicos);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar serviços.', error: err.message });
    }
};

const buscarServicoPorId = async (req, res) => {
    try {
        const servico = await Servico.findById(req.params.id);
        if (servico) {
            res.json(servico);
        } else {
            res.status(404).json({ message: 'Serviço não encontrado.' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar serviço.', error: err.message });
    }
};

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
                if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ message: 'Não é possível apagar. Este serviço já está em uso em Ordens de Serviço ou Vendas.' });
        }
        res.status(500).json({ message: 'Erro ao remover serviço.', error: err.message });
    }
};

module.exports = {
    listarServicos,
    criarServico,
    atualizarServico,
    removerServico,
    buscarServicoPorId,
    buscarServicosPorNome // <-- EXPORTAR A NOVA FUNÇÃO
};