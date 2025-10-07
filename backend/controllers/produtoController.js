// backend/controllers/produtoController.js
const Produto = require('../models/produtoModel');

// --- FUNÇÃO DE BUSCA ---
const buscarProdutosPorNome = async (req, res) => {
    try {
        const termo = req.query.q;
        if (!termo) {
            return res.json([]);
        }
        const produtos = await Produto.searchByName(termo);
        res.json(produtos);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar produtos.', error: err.message });
    }
};

const listarProdutos = async (req, res) => {
    try {
        const produtos = await Produto.findAll();
        res.json(produtos);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar produtos.', error: err.message });
    }
};

const buscarProdutoPorId = async (req, res) => {
    try {
        const produto = await Produto.findById(req.params.id);
        if (produto) {
            res.json(produto);
        } else {
            res.status(404).json({ message: 'Produto não encontrado.' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar produto.', error: err.message });
    }
};

// ... (resto das funções criar, atualizar, remover ficam iguais) ...

const criarProduto = async (req, res) => {
    try {
        const result = await Produto.create(req.body);
        res.status(201).json({ id: result.id, message: 'Produto criado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao criar produto.', error: err.message });
    }
};

const atualizarProduto = async (req, res) => {
    try {
        await Produto.update(req.params.id, req.body);
        res.json({ message: 'Produto atualizado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar produto.', error: err.message });
    }
};

const removerProduto = async (req, res) => {
    try {
        await Produto.remove(req.params.id);
        res.json({ message: 'Produto removido com sucesso.' });
    } catch (err) {
        // Adicionar esta verificação
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ message: 'Não é possível apagar. Este produto já está em uso em Ordens de Serviço ou Vendas.' });
        }
        res.status(500).json({ message: 'Erro ao remover produto.', error: err.message });
    }
};


module.exports = {
    listarProdutos,
    buscarProdutoPorId,
    criarProduto,
    atualizarProduto,
    removerProduto,
    buscarProdutosPorNome // <-- EXPORTAR A NOVA FUNÇÃO
};