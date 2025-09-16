// backend/controllers/veiculoController.js
const Veiculo = require('../models/veiculoModel');

const listarVeiculosDoCliente = async (req, res) => {
    try {
        const veiculos = await Veiculo.findByClienteId(req.params.cliente_id);
        res.json(veiculos);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar veículos.', error: err.message });
    }
};

const buscarVeiculoPorPlaca = async (req, res) => {
    try {
        const veiculo = await Veiculo.findByPlaca(req.params.placa);
        if (veiculo) {
            res.json(veiculo);
        } else {
            res.status(404).json({ message: 'Veículo não encontrado.' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar veículo.', error: err.message });
    }
};

const adicionarVeiculo = async (req, res) => {
    try {
        const result = await Veiculo.create(req.body);
        res.status(201).json({ id: result.id, message: 'Veículo adicionado com sucesso.' });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ message: 'Esta placa já está registada.' });
        }
        res.status(500).json({ message: 'Erro ao adicionar veículo.', error: err.message });
    }
};

const removerVeiculo = async (req, res) => {
    try {
        await Veiculo.remove(req.params.id);
        res.json({ message: 'Veículo removido com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao remover veículo.', error: err.message });
    }
};

module.exports = {
    listarVeiculosDoCliente,
    buscarVeiculoPorPlaca,
    adicionarVeiculo,
    removerVeiculo
};