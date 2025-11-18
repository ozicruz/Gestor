// backend/models/ordemServicoModel.js (Versão FINAL E COMPLETA)
const { dbAll, dbGet, dbRun } = require('../database/database');

const create = (placa) => {
    return new Promise(async (resolve, reject) => {
        try {
            // A busca do veículo continua igual
            const veiculo = await dbGet('SELECT id FROM Veiculos WHERE placa = ?', [placa]);
            if (!veiculo) {
                return reject(new Error('Veículo com esta placa não foi encontrado para criar a OS.'));
            }

            // --- CORREÇÃO APLICADA AQUI ---
            // Removemos o 'cliente_id' da consulta INSERT
            const sql = `
                INSERT INTO Ordens_Servico (veiculo_id, data_entrada, status, total) 
                VALUES (?, ?, ?, ?)
            `;
            // Removemos o 'cliente_id' dos parâmetros
            const params = [veiculo.id, new Date().toISOString(), 'Aberta', 0];

            const result = await dbRun(sql, params);
            resolve(result);
        } catch (err) {
            reject(err);
        }
    });
};

const findAll = () => {
    const sql = `
        SELECT os.id, os.status, os.data_entrada, os.total, v.placa, c.nome as cliente_nome 
        FROM Ordens_Servico os 
        JOIN Veiculos v ON os.veiculo_id = v.id 
        JOIN Clientes c ON v.cliente_id = c.id 
        ORDER BY os.data_entrada DESC`;
    return dbAll(sql);
};

const findById = async (id) => {
    const os = await dbGet(`
        SELECT os.*, 
               v.placa, v.marca, v.modelo, 
               c.nome as cliente_nome, c.telefone as cliente_telefone
        FROM Ordens_Servico os 
        JOIN Veiculos v ON os.veiculo_id = v.id 
        JOIN Clientes c ON v.cliente_id = c.id 
        WHERE os.id = ?`, [id]);

    if (os) {
        os.itens = await dbAll(`
            SELECT io.id, io.produto_id, io.quantidade, io.valor_unitario, p.nome 
            FROM Itens_OS io 
            JOIN Produtos p ON io.produto_id = p.id 
            WHERE io.os_id = ?`, [id]);

        // --- CORREÇÃO APLICADA AQUI ---
        os.servicos = await dbAll(`
            SELECT so.id, so.servico_id, so.valor, so.quantidade, s.nome 
            FROM Servicos_OS so 
            JOIN Servicos s ON so.servico_id = s.id 
            WHERE so.os_id = ?`, [id]);
    }
    return os;
};

const update = async (id, os) => {
    const { problema_relatado, diagnostico_tecnico, status, itens, servicos } = os;

    await dbRun('BEGIN TRANSACTION');
    try {
        await dbRun(
            'UPDATE Ordens_Servico SET problema_relatado = ?, diagnostico_tecnico = ?, status = ? WHERE id = ?',
            [problema_relatado, diagnostico_tecnico, status, id]
        );

        await dbRun('DELETE FROM Itens_OS WHERE os_id = ?', [id]);
        if (itens && itens.length > 0) {
            for (const item of itens) {
                await dbRun('INSERT INTO Itens_OS (os_id, produto_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)', [id, item.produto_id, item.quantidade, item.valor_unitario]);
            }
        }

        await dbRun('DELETE FROM Servicos_OS WHERE os_id = ?', [id]);
        if (servicos && servicos.length > 0) {
            for (const servico of servicos) {
                // --- CORREÇÃO APLICADA AQUI ---
                await dbRun('INSERT INTO Servicos_OS (os_id, servico_id, valor, quantidade) VALUES (?, ?, ?, ?)', [id, servico.servico_id, servico.valor, servico.quantidade]);
            }
        }

        await dbRun('COMMIT');
        await recalculateTotal(id);
    } catch (err) {
        await dbRun('ROLLBACK');
        throw err;
    }
};

const recalculateTotal = async (os_id) => {
    const itensResult = await dbGet('SELECT SUM(quantidade * valor_unitario) as total FROM Itens_OS WHERE os_id = ?', [os_id]);
    const totalItens = itensResult?.total || 0;

    // --- CORREÇÃO APLICADA AQUI ---
    const servicosResult = await dbGet('SELECT SUM(valor * quantidade) as total FROM Servicos_OS WHERE os_id = ?', [os_id]);
    const totalServicos = servicosResult?.total || 0;

    const totalFinal = parseFloat(totalItens) + parseFloat(totalServicos);
    return dbRun('UPDATE Ordens_Servico SET total = ? WHERE id = ?', [totalFinal, os_id]);
};

module.exports = { findAll, findById, create, update, recalculateTotal };