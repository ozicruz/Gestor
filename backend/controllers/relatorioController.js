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

const listarVendasRealizadas = async (req, res) => {
    const { data_inicio, data_fim } = req.query;
    if (!data_inicio || !data_fim) {
        return res.status(400).json({ message: "Datas obrigatórias." });
    }
    try {
        const vendas = await RelatorioModel.findVendasRealizadas(data_inicio, data_fim);
        res.json(vendas);
    } catch (err) {
        res.status(500).json({ message: "Erro ao buscar vendas.", error: err.message });
    }
};

const buscarDetalhesVenda = async (req, res) => {
    try {
        const detalhes = await RelatorioModel.findVendaDetalhes(req.params.id);
        if (detalhes) res.json(detalhes);
        else res.status(404).json({ message: "Venda não encontrada." });
    } catch (err) {
        res.status(500).json({ message: "Erro ao buscar detalhes.", error: err.message });
    }
};

const listarRankingServicos = async (req, res) => {
    const { data_inicio, data_fim } = req.query;
    if (!data_inicio || !data_fim) {
        return res.status(400).json({ message: "Datas obrigatórias." });
    }
    try {
        const servicos = await RelatorioModel.findRankingServicos(data_inicio, data_fim);
        res.json(servicos);
    } catch (err) {
        console.error("Erro ao buscar ranking de serviços:", err.message);
        res.status(500).json({ message: "Erro ao buscar ranking de serviços.", error: err.message });
    }
};

const listarRankingClientes = async (req, res) => {
    const { data_inicio, data_fim } = req.query;
    if (!data_inicio || !data_fim) {
        return res.status(400).json({ message: "Datas obrigatórias." });
    }
    try {
        const clientes = await RelatorioModel.findRankingClientes(data_inicio, data_fim);
        res.json(clientes);
    } catch (err) {
        console.error("Erro ao buscar ranking de clientes:", err.message);
        res.status(500).json({ message: "Erro ao buscar ranking de clientes.", error: err.message });
    }
};

module.exports = {
    listarProdutosMaisVendidos,
    listarStockBaixo,
    listarVendasRealizadas,
    buscarDetalhesVenda,
    listarRankingServicos,
    listarRankingClientes
};