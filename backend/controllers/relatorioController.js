// backend/controllers/relatorioController.js
const RelatorioModel = require('../models/relatorioModel');

const listarProdutosMaisVendidos = async (req, res) => {
    const { data_inicio, data_fim } = req.query;

    if (!data_inicio || !data_fim) {
        return res.status(400).json({ message: "Datas de início e fim são obrigatórias." });
    }

    try {
        const produtos = await RelatorioModel.findProdutosMaisVendidos(data_inicio, data_fim);
        res.json(produtos);
    } catch (err) {
        console.error("Erro ao buscar relatório de produtos:", err.message);
        res.status(500).json({ message: 'Erro interno ao buscar relatório de produtos.', error: err.message });
    }
};

const listarStockBaixo = async (req, res) => {
    try {
        const produtos = await RelatorioModel.findStockBaixo();
        res.json(produtos);
    } catch (err) {
        console.error("Erro ao buscar relatório de stock baixo:", err.message);
        res.status(500).json({ message: 'Erro interno ao buscar relatório de stock baixo.', error: err.message });
    }
};

module.exports = { 
    listarProdutosMaisVendidos,
    listarStockBaixo 
 
};