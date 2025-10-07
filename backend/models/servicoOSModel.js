// backend/models/servicoOSModel.js
const { dbRun, dbGet } = require('../database/database');

const create = async (os_id, servicoData) => {
    const { servico_id, quantidade } = servicoData;
    await dbRun('BEGIN TRANSACTION');
    try {
        const servico = await dbGet('SELECT preco FROM Servicos WHERE id = ?', [servico_id]);
        if (!servico) throw new Error('Serviço não encontrado');

        await dbRun('INSERT INTO Servicos_OS (os_id, servico_id, valor, quantidade) VALUES (?, ?, ?, ?)', [os_id, servico_id, servico.preco, quantidade]);
        
        await dbRun('COMMIT');
    } catch (err) {
        await dbRun('ROLLBACK');
        throw err;
    }
};

const remove = async (servico_os_id) => {
    await dbRun('BEGIN TRANSACTION');
    try {
        const servico = await dbGet('SELECT os_id FROM Servicos_OS WHERE id = ?', [servico_os_id]);
        if (!servico) throw new Error('Serviço da OS não encontrado');

        await dbRun('DELETE FROM Servicos_OS WHERE id = ?', [servico_os_id]);

        await dbRun('COMMIT');
        return servico.os_id;
    } catch (err) {
        await dbRun('ROLLBACK');
        throw err;
    }
};

module.exports = { create, remove };