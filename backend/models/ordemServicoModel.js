// backend/models/ordemServicoModel.js
const { dbAll, dbGet, dbRun } = require('../database/database');

const findAll = () => {
    const sql = `
        SELECT os.id, os.status, os.data_entrada, os.total, v.placa, c.nome as cliente_nome 
        FROM Ordens_Servico os 
        JOIN Veiculos v ON os.veiculo_id = v.id 
        JOIN Clientes c ON v.cliente_id = c.id 
        ORDER BY os.data_entrada DESC`;
    return dbAll(sql);
};

// Em backend/models/ordemServicoModel.js

const findById = async (id) => {
    const os = await dbGet(`
        SELECT os.*, v.placa, v.marca, v.modelo, c.nome as cliente_nome, c.id as cliente_id 
        FROM Ordens_Servico os 
        JOIN Veiculos v ON os.veiculo_id = v.id 
        JOIN Clientes c ON v.cliente_id = c.id 
        WHERE os.id = ?`, [id]);
    
    if (os) {
        // CORREÇÃO: Adicionado "io.produto_id" e "p.id" para garantir que temos o ID correto do produto
        os.itens = await dbAll(`
            SELECT io.id, io.produto_id, io.quantidade, io.valor_unitario, p.nome 
            FROM Itens_OS io 
            JOIN Produtos p ON io.produto_id = p.id 
            WHERE io.os_id = ?`, [id]);

        // CORREÇÃO: Adicionado "so.servico_id" e "s.id" para garantir o ID correto do serviço
        os.servicos = await dbAll(`
            SELECT so.id, so.servico_id, so.valor, s.nome 
            FROM Servicos_OS so 
            JOIN Servicos s ON so.servico_id = s.id 
            WHERE so.os_id = ?`, [id]);
    }
    return os;
};

const create = (os) => {
    const { veiculo_id, problema_relatado } = os;
    return dbRun(
        'INSERT INTO Ordens_Servico (veiculo_id, problema_relatado, status) VALUES (?, ?, ?)',
        [veiculo_id, problema_relatado, 'Aberta']
    );
};

// Em backend/models/ordemServicoModel.js
const update = async (id, os) => {
    const { problema_relatado, diagnostico_tecnico, status, itens, servicos } = os;
    
    await dbRun('BEGIN TRANSACTION');
    try {
        await dbRun(
            'UPDATE Ordens_Servico SET problema_relatado = ?, diagnostico_tecnico = ?, status = ? WHERE id = ?', 
            [problema_relatado, diagnostico_tecnico, status, id]
        );

        await dbRun('DELETE FROM Itens_OS WHERE os_id = ?', [id]);
        await dbRun('DELETE FROM Servicos_OS WHERE os_id = ?', [id]);
        
        if (itens && itens.length > 0) {
            for (const item of itens) {
                // CORREÇÃO: Usa sempre "item.produto_id", que agora é consistente.
                await dbRun('INSERT INTO Itens_OS (os_id, produto_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)', [id, item.produto_id, item.quantidade, item.valor_unitario]);
            }
        }
        
        if (servicos && servicos.length > 0) {
            for (const servico of servicos) {
                // CORREÇÃO: Usa sempre "servico.servico_id", que agora é consistente.
                await dbRun('INSERT INTO Servicos_OS (os_id, servico_id, valor) VALUES (?, ?, ?)', [id, servico.servico_id, servico.valor]);
            }
        }

        const itensResult = await dbAll('SELECT SUM(quantidade * valor_unitario) as total FROM Itens_OS WHERE os_id = ?', [id]);
        const totalItens = (itensResult && itensResult.length > 0) ? (itensResult[0].total || 0) : 0;
        const servicosResult = await dbAll('SELECT SUM(valor) as total FROM Servicos_OS WHERE os_id = ?', [id]);
        const totalServicos = (servicosResult && servicosResult.length > 0) ? (servicosResult[0].total || 0) : 0;
        const totalFinal = parseFloat(totalItens) + parseFloat(totalServicos);
        await dbRun('UPDATE Ordens_Servico SET total = ? WHERE id = ?', [totalFinal, id]);

        await dbRun('COMMIT');
    } catch (err) {
        console.error("Erro na transação de atualização da OS:", err);
        await dbRun('ROLLBACK');
        throw err;
    }
};

// Esta função ficará aqui, pois pertence à lógica da OS.
const recalculateTotal = async (os_id) => {
    const itensResult = await dbAll('SELECT SUM(quantidade * valor_unitario) as total FROM Itens_OS WHERE os_id = ?', [os_id]);
    const totalItens = itensResult[0]?.total || 0;

    const servicosResult = await dbAll('SELECT SUM(valor) as total FROM Servicos_OS WHERE os_id = ?', [os_id]);
    const totalServicos = servicosResult[0]?.total || 0;

    const totalFinal = parseFloat(totalItens) + parseFloat(totalServicos);
    return dbRun('UPDATE Ordens_Servico SET total = ? WHERE id = ?', [totalFinal, os_id]);
};

module.exports = { findAll, findById, create, update, recalculateTotal };