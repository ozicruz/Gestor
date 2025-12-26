const Produto = require('../models/produtoModel');
const { dbGet, dbRun } = require('../database/database'); // <--- ADICIONADO dbRun

// --- FUNÇÃO DE BUSCA ---
const buscarProdutosPorNome = async (req, res) => {
    try {
        const termo = req.query.q;
        if (!termo) return res.json([]);
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
        if (produto) res.json(produto);
        else res.status(404).json({ message: 'Produto não encontrado.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar produto.', error: err.message });
    }
};

const criarProduto = async (req, res) => {
    try {
        const nomeLimpo = req.body.nome.trim();
        const duplicado = await dbGet('SELECT id FROM Produtos WHERE UPPER(nome) = UPPER(?)', [nomeLimpo]);
        if (duplicado) return res.status(400).json({ message: `O produto "${nomeLimpo}" já está cadastrado!` });

        const dados = { ...req.body, nome: nomeLimpo };
        const result = await Produto.create(dados);
        res.status(201).json({ id: result.id, message: 'Produto criado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao criar produto.', error: err.message });
    }
};

// --- ATUALIZAÇÃO CORRIGIDA (COM HISTÓRICO) ---
const atualizarProduto = async (req, res) => {
    try {
        const id = req.params.id;
        const nomeLimpo = req.body.nome.trim();
        
        // 1. Busca dados antigos para comparação
        const produtoAntigo = await Produto.findById(id);
        if (!produtoAntigo) return res.status(404).json({ message: 'Produto não encontrado.' });

        // 2. Verifica duplicidade de nome
        const duplicado = await dbGet('SELECT id FROM Produtos WHERE UPPER(nome) = UPPER(?) AND id != ?', [nomeLimpo, id]);
        if (duplicado) return res.status(400).json({ message: `Já existe outro produto chamado "${nomeLimpo}"!` });

        // 3. Lógica do Histórico (Movimentações)
        const qtdNova = parseInt(req.body.quantidade_em_estoque);
        const qtdAntiga = produtoAntigo.quantidade_em_estoque;
        const novoCusto = req.body.valor_custo;
        
        // Pega a observação enviada pelo frontend ou define padrão
        const observacao = req.body.observacao || 'Ajuste de Cadastro';

        if (qtdNova !== qtdAntiga) {
            const diferenca = qtdNova - qtdAntiga;
            const tipoMovimento = diferenca > 0 ? 'ENTRADA' : 'AJUSTE_SAIDA';
            
            await dbRun(`INSERT INTO MovimentacoesEstoque (produto_id, quantidade, tipo, custo_unitario, observacao) VALUES (?, ?, ?, ?, ?)`, 
            [id, diferenca, tipoMovimento, novoCusto, observacao]);
        }

        // 4. Atualiza o Produto
        const dados = { ...req.body, nome: nomeLimpo };
        await Produto.update(id, dados);
        
        res.json({ message: 'Produto atualizado com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao atualizar produto.', error: err.message });
    }
};

const removerProduto = async (req, res) => {
    try {
        await Produto.remove(req.params.id);
        res.json({ message: 'Produto removido com sucesso.' });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ message: 'Não é possível apagar. Este produto já está em uso.' });
        res.status(500).json({ message: 'Erro ao remover produto.', error: err.message });
    }
};

module.exports = {
    listarProdutos,
    buscarProdutoPorId,
    criarProduto,
    atualizarProduto,
    removerProduto,
    buscarProdutosPorNome
};