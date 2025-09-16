// backend/models/servicoOSModel.js
const { dbRun, dbGet } = require('../database/database');

const create = async (os_id, servicoData) => {
    const { servico_id } = servicoData;
    await dbRun('BEGIN TRANSACTION');
    const servico = await dbGet('SELECT preco FROM Servicos WHERE id = ?', [servico_id]);
    if (!servico) throw new Error('Serviço não encontrado');

    await dbRun('INSERT INTO Servicos_OS (os_id, servico_id, valor) VALUES (?, ?, ?)', [os_id, servico_id, servico.preco]);
    return dbRun('COMMIT');
};

const remove = async (servico_os_id) => {
    await dbRun('BEGIN TRANSACTION');
    const servico = await dbGet('SELECT os_id FROM Servicos_OS WHERE id = ?', [servico_os_id]);
    if (!servico) throw new Error('Serviço da OS não encontrado');

    await dbRun('DELETE FROM Servicos_OS WHERE id = ?', [servico_os_id]);
    await dbRun('COMMIT');
    return servico.os_id; // Retorna o ID da OS para recalcular o total
};

module.exports = { create, remove };