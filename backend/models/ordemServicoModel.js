const { dbAll, dbGet, dbRun } = require('../database/database');

const create = (placa) => {
    return new Promise(async (resolve, reject) => {
        try {
            const veiculo = await dbGet('SELECT id FROM Veiculos WHERE placa = ?', [placa]);
            if (!veiculo) {
                return reject(new Error('Veículo com esta placa não foi encontrado para criar a OS.'));
            }

            const sql = `
                INSERT INTO Ordens_Servico (veiculo_id, data_entrada, status, total) 
                VALUES (?, ?, ?, ?)
            `;
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
               v.placa, v.marca, v.modelo, v.cliente_id, 
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

        os.servicos = await dbAll(`
            SELECT so.id, so.servico_id, so.valor, so.quantidade, s.nome 
            FROM Servicos_OS so 
            JOIN Servicos s ON so.servico_id = s.id 
            WHERE so.os_id = ?`, [id]);
    }
    return os;
};

const update = async (id, dados) => {
    const { problema_relatado, diagnostico_tecnico, status, itens, servicos, placa, cliente_nome } = dados;

    await dbRun('BEGIN TRANSACTION');
    try {
        if (placa || cliente_nome) {
            const osAtual = await dbGet('SELECT veiculo_id FROM Ordens_Servico WHERE id = ?', [id]);
            
            if (osAtual) {
                if (placa) {
                    await dbRun('UPDATE Veiculos SET placa = ? WHERE id = ?', [placa, osAtual.veiculo_id]);
                }

                if (cliente_nome) {
                    const veiculo = await dbGet('SELECT cliente_id FROM Veiculos WHERE id = ?', [osAtual.veiculo_id]);
                    if (veiculo) {
                        await dbRun('UPDATE Clientes SET nome = ? WHERE id = ?', [cliente_nome, veiculo.cliente_id]);
                    }
                }
            }
        }

        await dbRun(
            'UPDATE Ordens_Servico SET problema_relatado = ?, diagnostico_tecnico = ?, status = ? WHERE id = ?',
            [problema_relatado, diagnostico_tecnico, status, id]
        );

        if (itens) {
            await dbRun('DELETE FROM Itens_OS WHERE os_id = ?', [id]);
            if (itens.length > 0) {
                for (const item of itens) {
                    await dbRun('INSERT INTO Itens_OS (os_id, produto_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)', [id, item.produto_id, item.quantidade, item.valor_unitario]);
                }
            }
        }

        if (servicos) {
            await dbRun('DELETE FROM Servicos_OS WHERE os_id = ?', [id]);
            if (servicos.length > 0) {
                for (const servico of servicos) {
                    await dbRun('INSERT INTO Servicos_OS (os_id, servico_id, valor, quantidade) VALUES (?, ?, ?, ?)', [id, servico.servico_id, servico.valor, servico.quantidade]);
                }
            }
        }

        await dbRun('COMMIT');
        
        if (itens || servicos) {
            await recalculateTotal(id);
        }
        
    } catch (err) {
        await dbRun('ROLLBACK');
        throw err;
    }
};

const recalculateTotal = async (os_id) => {
    const itensResult = await dbGet('SELECT SUM(quantidade * valor_unitario) as total FROM Itens_OS WHERE os_id = ?', [os_id]);
    const totalItens = itensResult?.total || 0;

    const servicosResult = await dbGet('SELECT SUM(valor * quantidade) as total FROM Servicos_OS WHERE os_id = ?', [os_id]);
    const totalServicos = servicosResult?.total || 0;

    const totalFinal = parseFloat(totalItens) + parseFloat(totalServicos);
    return dbRun('UPDATE Ordens_Servico SET total = ? WHERE id = ?', [totalFinal, os_id]);
};

module.exports = { findAll, findById, create, update, recalculateTotal };