// backend/models/produtoModel.js
const { dbAll, dbGet, dbRun } = require('../database/database');

// --- FUNÇÃO DE BUSCA COM LIKE ---
const searchByName = (termo) => {
    const sql = `
        SELECT * FROM Produtos 
        WHERE nome LIKE ? 
        ORDER BY 
            CASE 
                WHEN nome LIKE ? THEN 1
                ELSE 2 
            END, 
            nome
    `;
    const params = [`%${termo}%`, `${termo}%`];
    return dbAll(sql, params);
};

const findAll = () => {
    return dbAll('SELECT * FROM Produtos ORDER BY nome');
};

const findById = (id) => {
    return dbGet('SELECT * FROM Produtos WHERE id = ?', [id]);
};

const create = (produto) => {
    // ATUALIZADO: Adicionado 'stock_minimo'
    const { nome, descricao, quantidade_em_estoque, preco_unitario, valor_custo, stock_minimo } = produto;
    return dbRun(
        'INSERT INTO Produtos (nome, descricao, quantidade_em_estoque, preco_unitario, valor_custo, stock_minimo) VALUES (?, ?, ?, ?, ?, ?)',
        [nome, descricao, quantidade_em_estoque, preco_unitario, valor_custo, stock_minimo]
    );
};

const update = (id, produto) => {
    // ATUALIZADO: Adicionado 'stock_minimo'
    const { nome, descricao, quantidade_em_estoque, preco_unitario, valor_custo, stock_minimo } = produto;
    return dbRun(
        'UPDATE Produtos SET nome = ?, descricao = ?, quantidade_em_estoque = ?, preco_unitario = ?, valor_custo = ?, stock_minimo = ? WHERE id = ?',
        [nome, descricao, quantidade_em_estoque, preco_unitario, valor_custo, stock_minimo, id]
    );
};

const remove = (id) => {
    return dbRun('DELETE FROM Produtos WHERE id = ?', [id]);
};

// 1. Busca os melhores preços (Filtrando Retornos e Custo Zero)
const getMelhoresPrecos = (id) => {
    const sql = `
        SELECT observacao, custo_unitario, data
        FROM MovimentacoesEstoque
        WHERE produto_id = ? 
        AND tipo = 'ENTRADA'
        AND custo_unitario > 0
        AND observacao NOT LIKE 'Retorno OS%'
        ORDER BY custo_unitario ASC
        LIMIT 5
    `;
    return dbAll(sql, [id]);
};

// 2. Registra Entrada e Atualiza Estoque (Transação atômica idealmente, mas aqui simplificado)
const registrarEntrada = async (idProduto, quantidade, custo, obs) => {
    // A. Adiciona no histórico
    await dbRun(
        `INSERT INTO MovimentacoesEstoque (produto_id, quantidade, tipo, custo_unitario, observacao) VALUES (?, ?, 'ENTRADA', ?, ?)`,
        [idProduto, quantidade, custo, obs]
    );

    // B. Atualiza o saldo do produto e o custo de custo atual
    // Nota: Atualizamos o valor_custo do produto para o valor da última compra
    return dbRun(
        `UPDATE Produtos SET quantidade_em_estoque = quantidade_em_estoque + ?, valor_custo = ? WHERE id = ?`,
        [quantidade, custo, idProduto]
    );
};

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove,
    searchByName,
    getMelhoresPrecos,
    registrarEntrada

};