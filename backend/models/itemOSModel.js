// backend/models/itemOSModel.js
const { dbRun, dbGet } = require('../database/database');

const create = async (os_id, itemData) => {
    const { produto_id, quantidade } = itemData;
    await dbRun('BEGIN TRANSACTION');
    try {
        const produto = await dbGet('SELECT preco_unitario, quantidade_em_estoque FROM Produtos WHERE id = ?', [produto_id]);
        if (!produto) throw new Error('Produto não encontrado');
        if (produto.quantidade_em_estoque < quantidade) throw new Error('Stock insuficiente.');

        await dbRun('INSERT INTO Itens_OS (os_id, produto_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)', [os_id, produto_id, quantidade, produto.preco_unitario]);
        await dbRun('UPDATE Produtos SET quantidade_em_estoque = quantidade_em_estoque - ? WHERE id = ?', [quantidade, produto_id]);

        await dbRun('COMMIT');
    } catch (err) {
        await dbRun('ROLLBACK');
        throw err; // Re-lança o erro para o controller
    }
};

const remove = async (item_id) => {
    await dbRun('BEGIN TRANSACTION');
    try {
        const item = await dbGet('SELECT os_id, produto_id, quantidade FROM Itens_OS WHERE id = ?', [item_id]);
        if (!item) throw new Error('Item da OS não encontrado');

        await dbRun('DELETE FROM Itens_OS WHERE id = ?', [item_id]);
        await dbRun('UPDATE Produtos SET quantidade_em_estoque = quantidade_em_estoque + ? WHERE id = ?', [item.quantidade, item.produto_id]);

        await dbRun('COMMIT');
        return item.os_id;
    } catch (err) {
        await dbRun('ROLLBACK');
        throw err; // Re-lança o erro para o controller
    }
};

module.exports = { create, remove };