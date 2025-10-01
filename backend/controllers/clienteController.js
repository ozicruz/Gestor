// backend/controllers/clienteController.js
const Cliente = require('../models/clienteModel');

// --- NOVA FUNÇÃO PARA BUSCA ---
const buscarClientesPorNome = async (req, res) => {
    try {
        const termo = req.query.q;
        if (!termo) {
            return res.json([]);
        }
        const clientes = await Cliente.searchByName(termo);
        res.json(clientes);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar clientes.', error: err.message });
    }
};

const listarClientes = async (req, res) => {
    // ... (código existente inalterado)
    try {
        const clientes = await Cliente.findAll();
        res.json(clientes);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar clientes.', error: err.message });
    }
};

const criarCliente = async (req, res) => {
    // ... (código existente inalterado)
    try {
        const result = await Cliente.create(req.body);
        res.status(201).json({ id: result.id, message: 'Cliente criado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao criar cliente.', error: err.message });
    }
};

const atualizarCliente = async (req, res) => {
    // ... (código existente inalterado)
    try {
        await Cliente.update(req.params.id, req.body);
        res.json({ message: 'Cliente atualizado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar cliente.', error: err.message });
    }
};

const removerCliente = async (req, res) => {
    // ... (código existente inalterado)
    try {
        await Cliente.remove(req.params.id);
        res.json({ message: 'Cliente removido com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao remover cliente.', error: err.message });
    }
};

module.exports = {
    listarClientes,
    criarCliente,
    atualizarCliente,
    removerCliente,
    buscarClientesPorNome // <-- Adicionar a nova função aqui
};