// backend/models/vendaModel.js
const { dbRun, dbGet } = require('../database/database');

const create = (vendaData) => {
    const { cliente_id, total, itens } = vendaData;

    return new Promise(async (resolve, reject) => {
        try {
            // Inicia a transação
            await dbRun('BEGIN TRANSACTION');

            // 1. Insere o registo principal da venda
            const vendaResult = await dbRun('INSERT INTO Vendas (cliente_id, total) VALUES (?, ?)', [cliente_id || null, total]);
            const vendaId = vendaResult.id;

            // 2. Itera sobre cada item da venda
            for (const item of itens) {
                if (item.tipo === 'produto') {
                    // Adiciona o item na tabela de itens da venda
                    await dbRun(
                        'INSERT INTO Itens_Venda (venda_id, produto_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)',
                        [vendaId, item.id, item.quantidade, item.precoUnitario]
                    );
                    // Atualiza o stock do produto
                    await dbRun(
                        'UPDATE Produtos SET quantidade_em_estoque = quantidade_em_estoque - ? WHERE id = ?',
                        [item.quantidade, item.id]
                    );
                } else if (item.tipo === 'serviço') {
                    // Adiciona o serviço na tabela de serviços da venda
                    await dbRun(
                        'INSERT INTO Servicos_Venda (venda_id, servico_id, valor) VALUES (?, ?, ?)',
                        [vendaId, item.id, item.precoUnitario]
                    );
                }
            }

            // Se tudo correu bem, confirma a transação
            await dbRun('COMMIT');
            resolve({ id: vendaId });

        } catch (err) {
            // Se algo deu errado, desfaz todas as alterações
            await dbRun('ROLLBACK');
            reject(err);
        }
    });
};

module.exports = {
    create
};