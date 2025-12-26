// backend/controllers/veiculoController.js
const { dbRun, dbAll, dbGet } = require('../database/database');

// 1. Listar TODOS os veículos (Usado na gestão geral)
const listarVeiculos = async (req, res) => {
    try {
        const veiculos = await dbAll('SELECT * FROM Veiculos');
        res.json(veiculos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar veículos', error: error.message });
    }
};

// 2. Listar veículos de UM cliente específico (Usado no detalhe do cliente)
const listarVeiculosDoCliente = async (req, res) => {
    const { cliente_id } = req.params;
    try {
        const veiculos = await dbAll('SELECT * FROM Veiculos WHERE cliente_id = ?', [cliente_id]);
        res.json(veiculos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar veículos do cliente', error: error.message });
    }
};

// 3. Buscar por Placa (Usado na busca rápida)
const buscarVeiculoPorPlaca = async (req, res) => {
    const { placa } = req.params;
    try {
        const veiculo = await dbGet('SELECT * FROM Veiculos WHERE placa = ?', [placa]);
        if (veiculo) {
            res.json(veiculo);
        } else {
            res.status(404).json({ message: 'Veículo não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar placa', error: error.message });
    }
};

// 4. Adicionar Veículo (Nome corrigido para bater com a rota)
const adicionarVeiculo = async (req, res) => {
    const { cliente_id, placa, marca, modelo, cor } = req.body;
    
    if (!cliente_id || !placa) {
        return res.status(400).json({ message: 'Cliente e Placa são obrigatórios.' });
    }

    try {
        // Verifica se a placa já existe
        const existe = await dbGet('SELECT id FROM Veiculos WHERE placa = ?', [placa]);
        if (existe) {
            return res.status(400).json({ message: 'Esta placa já está cadastrada!' });
        }

        const sql = 'INSERT INTO Veiculos (cliente_id, placa, marca, modelo, cor) VALUES (?, ?, ?, ?, ?)';
        const result = await dbRun(sql, [cliente_id, placa, marca, modelo, cor]);
        
        res.status(201).json({ id: result.lastID, message: 'Veículo criado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao salvar veículo', error: error.message });
    }
};

// 5. Remover Veículo (Nome corrigido para bater com a rota)
const removerVeiculo = async (req, res) => {
    const { id } = req.params;
    try {
        await dbRun('DELETE FROM Veiculos WHERE id = ?', [id]);
        res.json({ message: 'Veículo deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar', error: error.message });
    }
};

// EXPORTAR TUDO (Muito importante conferir se os nomes batem com o require nas rotas)
module.exports = {
    listarVeiculos,
    listarVeiculosDoCliente,
    buscarVeiculoPorPlaca,
    adicionarVeiculo,
    removerVeiculo
};