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

// ... (resto das funções criar, atualizar, remover ficam iguais) ...

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

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove,
    searchByName // <-- EXPORTAR A NOVA FUNÇÃO
};