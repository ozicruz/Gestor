// backend/models/produtoModel.js
const { dbAll, dbGet, dbRun } = require('../database/database');

// --- NOVA FUNÇÃO DE BUSCA ---
const searchByName = (termo) => {
    // O operador '%' é um coringa. '%termo%' busca qualquer registro
    // que contenha o termo em qualquer parte do nome.
    const sql = 'SELECT * FROM Produtos WHERE nome LIKE ? ORDER BY nome';
    const params = [`%${termo}%`];
    return dbAll(sql, params);
};

const findAll = () => {
    return dbAll('SELECT * FROM Produtos ORDER BY nome');
};

const findById = (id) => {
    return dbGet('SELECT * FROM Produtos WHERE id = ?', [id]);
};

const create = (produto) => {
    const { nome, descricao, quantidade_em_estoque, preco_unitario } = produto;
    return dbRun(
        'INSERT INTO Produtos (nome, descricao, quantidade_em_estoque, preco_unitario) VALUES (?, ?, ?, ?)',
        [nome, descricao, quantidade_em_estoque, preco_unitario]
    );
};

const update = (id, produto) => {
    const { nome, descricao, quantidade_em_estoque, preco_unitario } = produto;
    return dbRun(
        'UPDATE Produtos SET nome = ?, descricao = ?, quantidade_em_estoque = ?, preco_unitario = ? WHERE id = ?',
        [nome, descricao, quantidade_em_estoque, preco_unitario, id]
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
    searchByName // <-- Adicionar a nova função
};