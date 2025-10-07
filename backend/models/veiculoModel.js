// backend/models/veiculoModel.js
const { dbAll, dbRun, dbGet } = require('../database/database');

const findByClienteId = (clienteId) => {
    return dbAll('SELECT * FROM Veiculos WHERE cliente_id = ? ORDER BY placa', [clienteId]);
};

const findByPlaca = (placa) => {
    const sql = `
        SELECT 
            v.*, 
            c.nome as cliente_nome 
        FROM Veiculos v
        JOIN Clientes c ON v.cliente_id = c.id
        WHERE v.placa = ?`;
    return dbGet(sql, [placa]);
};

const create = (veiculo) => {
    const { cliente_id, placa, marca, modelo, ano, cor } = veiculo;
    return dbRun(
        'INSERT INTO Veiculos (cliente_id, placa, marca, modelo, ano, cor) VALUES (?, ?, ?, ?, ?, ?)',
        [cliente_id, placa, marca, modelo, ano, cor]
    );
};

const remove = (id) => {
    return dbRun('DELETE FROM Veiculos WHERE id = ?', [id]);
};

module.exports = {
    findByClienteId,
    findByPlaca,
    create,
    remove
};