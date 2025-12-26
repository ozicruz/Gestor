// backend/controllers/clienteController.js
const Cliente = require('../models/clienteModel');
const { dbGet } = require('../database/database');

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
    try {
        const clientes = await Cliente.findAll();
        res.json(clientes);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar clientes.', error: err.message });
    }
};

const getClientePorId = async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (cliente) {
            res.json(cliente);
        } else {
            res.status(404).json({ message: 'Cliente não encontrado.' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar cliente.', error: err.message });
    }
};

const getVendasPorCliente = async (req, res) => {
    try {
        const vendas = await Cliente.findVendasByClienteId(req.params.id);
        res.json(vendas);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar vendas do cliente.', error: err.message });
    }
};

// --- CRIAÇÃO COM PROTEÇÃO AVANÇADA ---
const criarCliente = async (req, res) => {
    const { nome, telefone } = req.body;

    // 1. Limpeza: Remove espaços extras antes e depois
    const nomeLimpo = nome.trim(); 

    try {
        // 2. Verificação Robusta: Usa UPPER() para ignorar maiúsculas/minúsculas
        const duplicado = await dbGet('SELECT id FROM Clientes WHERE UPPER(nome) = UPPER(?)', [nomeLimpo]);
        
        if (duplicado) {
            return res.status(400).json({ message: `O cliente "${nomeLimpo}" já está cadastrado!` });
        }

        // Se passar, cria usando o nome limpo
        const dadosLimpos = { ...req.body, nome: nomeLimpo };
        const result = await Cliente.create(dadosLimpos);
        
        res.status(201).json({ id: result.id, message: 'Cliente criado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao criar cliente.', error: err.message });
    }
};

// --- ATUALIZAÇÃO COM PROTEÇÃO AVANÇADA ---
const atualizarCliente = async (req, res) => {
    const { nome } = req.body;
    const { id } = req.params;
    
    const nomeLimpo = nome.trim();

    try {
        // Verifica se existe OUTRO cliente (id diferente) com o mesmo nome (ignorando case e espaços)
        const duplicado = await dbGet(
            'SELECT id FROM Clientes WHERE UPPER(nome) = UPPER(?) AND id != ?', 
            [nomeLimpo, id]
        );
        
        if (duplicado) {
            return res.status(400).json({ message: `Já existe outro cliente chamado "${nomeLimpo}"!` });
        }

        const dadosLimpos = { ...req.body, nome: nomeLimpo };
        await Cliente.update(id, dadosLimpos);
        
        res.json({ message: 'Cliente atualizado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar cliente.', error: err.message });
    }
};

const removerCliente = async (req, res) => {
    try {
        await Cliente.remove(req.params.id);
        res.json({ message: 'Cliente removido com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao remover cliente.', error: err.message });
    }
};

module.exports = {
    listarClientes,
    getClientePorId,
    getVendasPorCliente,
    criarCliente,
    atualizarCliente,
    removerCliente,
    buscarClientesPorNome
};