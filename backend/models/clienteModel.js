// backend/models/clienteModel.js
const { dbAll, dbRun, dbGet } = require('../database/database');

// --- NOVA FUNÇÃO DE BUSCA ---
const searchByName = (termo) => {
    const sql = 'SELECT * FROM Clientes WHERE nome LIKE ? ORDER BY nome';
    const params = [`%${termo}%`];
    return dbAll(sql, params);
};

const findAll = () => {
    return dbAll('SELECT * FROM Clientes ORDER BY nome');
};

const create = (cliente) => {
    const { nome, telefone, email, endereco } = cliente;
    return dbRun(
        'INSERT INTO Clientes (nome, telefone, email, endereco) VALUES (?, ?, ?, ?)',
        [nome, telefone, email, endereco]
    );
};

const update = (id, cliente) => {
    const { nome, telefone, email, endereco } = cliente;
    return dbRun(
        'UPDATE Clientes SET nome = ?, telefone = ?, email = ?, endereco = ? WHERE id = ?',
        [nome, telefone, email, endereco, id]
    );
};

// Ao remover um cliente, a base de dados está configurada para remover
// os seus veículos em cascata (ON DELETE CASCADE).
const remove = (id) => {
    return dbRun('DELETE FROM Clientes WHERE id = ?', [id]);
};

module.exports = {
    findAll,
    create,
    update,
    remove,
    searchByName // <-- Adicionar a nova função
};