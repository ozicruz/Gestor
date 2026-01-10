const Produto = require('../models/produtoModel');
const { dbGet, dbRun, dbAll } = require('../database/database'); // IMPORTAÇÕES COMPLETAS

// --- FUNÇÃO DE BUSCA ---
const buscarProdutosPorNome = async (req, res) => {
    try {
        const termo = req.query.q;
        if (!termo) return res.json([]);

        // Busca usando SQL direto com LIKE
        const sql = `
            SELECT * FROM Produtos 
            WHERE nome LIKE ? OR descricao LIKE ? 
            LIMIT 10
        `;
        const termoBusca = `%${termo}%`;
        
        const produtos = await dbAll(sql, [termoBusca, termoBusca]);
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

// --- CRIAÇÃO ---
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

// --- ATUALIZAÇÃO (COM HISTÓRICO DE ENTRADA) ---
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

        // 3. Prepara variáveis para o Histórico (DEFINIÇÃO DAS VARIÁVEIS QUE FALTAVAM)
        const qtdNova = parseInt(req.body.quantidade_em_estoque);
        const qtdAntiga = produtoAntigo.quantidade_em_estoque;
        const novoCusto = req.body.valor_custo;
        const observacao = req.body.observacao || 'Ajuste de Cadastro'; 

        // 4. Se houve mudança de estoque, grava no histórico
        if (qtdNova !== qtdAntiga) {
            const diferenca = qtdNova - qtdAntiga;
            const tipoMovimento = diferenca > 0 ? 'ENTRADA' : 'AJUSTE_SAIDA';
            
            // Grava na tabela MovimentacoesEstoque
            await dbRun(`INSERT INTO MovimentacoesEstoque (produto_id, quantidade, tipo, custo_unitario, observacao) VALUES (?, ?, ?, ?, ?)`, 
            [id, diferenca, tipoMovimento, novoCusto, observacao]);
        }

        // 5. Atualiza o Produto
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

// --- FUNÇÃO: HISTÓRICO DO PRODUTO ---
const obterHistorico = async (req, res) => {
    try {
        const id = req.params.id;
        const sql = `
            SELECT data, tipo, quantidade, custo_unitario, observacao 
            FROM MovimentacoesEstoque 
            WHERE produto_id = ? 
            ORDER BY data DESC
        `;
        const historico = await dbAll(sql, [id]);
        res.json(historico);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar histórico.', error: err.message });
    }
};

// --- NOVA FUNÇÃO: COMPARATIVO DE PREÇOS POR FORNECEDOR ---
const obterMelhoresPrecos = async (req, res) => {
    const { id } = req.params;
    try {
        const entradas = await Produto.getMelhoresPrecos(id);

        // Lógica de formatação de string (Regra de Negócio fica aqui ou no front, ok aqui)
        const ranking = entradas.map(mov => {
            let fornecedor = 'Desconhecido';
            if (mov.observacao && mov.observacao.includes('Forn:')) {
                const partes = mov.observacao.split('|');
                const parteForn = partes.find(p => p.trim().startsWith('Forn:'));
                if (parteForn) fornecedor = parteForn.replace('Forn:', '').trim();
            } else if (mov.observacao && !mov.observacao.includes('NF:')) {
                fornecedor = mov.observacao;
            }
            return {
                fornecedor: fornecedor,
                custo: mov.custo_unitario,
                data: mov.data
            };
        });

        res.json(ranking);
    } catch (err) {
        console.error("Erro ranking:", err);
        res.status(500).json({ message: 'Erro ao buscar preços.' });
    }
};

const registrarEntradaEstoque = async (req, res) => {
    const { id } = req.params; // ID do produto
    const { quantidade, custo, fornecedor, nota_fiscal } = req.body;

    if (!quantidade || quantidade <= 0) {
        return res.status(400).json({ message: "Quantidade inválida." });
    }

    try {
        // Formata a observação padronizada
        const obs = `Forn: ${fornecedor || 'Balcão'} | NF: ${nota_fiscal || 'S/N'}`;
        
        // Chama o Model
        await Produto.registrarEntrada(id, parseInt(quantidade), parseFloat(custo || 0), obs);

        res.json({ message: "Entrada registrada com sucesso!" });
    } catch (error) {
        console.error("Erro entrada:", error);
        res.status(500).json({ message: "Erro ao registrar entrada." });
    }
};

module.exports = {
    listarProdutos,
    buscarProdutoPorId,
    criarProduto,
    atualizarProduto,
    removerProduto,
    buscarProdutosPorNome,
    obterHistorico,
    obterMelhoresPrecos,
    registrarEntradaEstoque

};