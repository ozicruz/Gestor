// backend/models/servicoModel.js
const { dbAll, dbRun } = require('../database/database');

const findAll = () => {
    return dbAll('SELECT * FROM Servicos ORDER BY nome');
};

const create = (servico) => {
    const { nome, descricao, preco } = servico;
    return dbRun(
        'INSERT INTO Servicos (nome, descricao, preco) VALUES (?, ?, ?)',
        [nome, descricao, preco]
    );
};

const update = (id, servico) => {
    const { nome, descricao, preco } = servico;
    return dbRun(
        'UPDATE Servicos SET nome = ?, descricao = ?, preco = ? WHERE id = ?',
        [nome, descricao, preco, id]
    );
};

const remove = (id) => {
    return dbRun('DELETE FROM Servicos WHERE id = ?', [id]);
};

module.exports = {
    findAll,
    create,
    update,
    remove
};