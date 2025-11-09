// backend/models/vendaModel.js (Versão ATUALIZADA)
const { dbRun, dbGet } = require('../database/database');
// NOTA: não precisamos do financeiroModel, vamos usar dbRun/dbGet diretamente

const create = (vendaData) => {
    // --- ALTERADO: Obter os novos campos financeiros do frontend ---
    const { 
        cliente_id, 
        os_id, 
        itens, 
        total, 
        desconto_tipo, 
        desconto_valor,
        FormaPagamentoID,
        ContaCaixaID,    // Pode ser 'null' se for 'Fiado'
        DataVencimento   // Pode ser 'null' se for 'A_VISTA'
    } = vendaData;

    return new Promise(async (resolve, reject) => {
        // A sua transação existente. Perfeito.
        await dbRun('BEGIN TRANSACTION');
        try {
            // --- ALTERADO: Adicionar os novos campos ao INSERT da Venda ---
            const vendaResult = await dbRun(
                'INSERT INTO Vendas (cliente_id, os_id, total, desconto_tipo, desconto_valor, FormaPagamentoID, DataVencimento) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [cliente_id, os_id, total, desconto_tipo, desconto_valor, FormaPagamentoID, DataVencimento]
            );
            const vendaId = vendaResult.id;

            // O seu loop de itens (sem alterações)
            for (const item of itens) {
                if (item.tipo === 'produto') {
                    await dbRun(
                        'INSERT INTO Itens_Venda (venda_id, produto_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)',
                        [vendaId, item.id, item.quantidade, item.precoUnitario]
                    );
                    await dbRun(
                        'UPDATE Produtos SET quantidade_em_estoque = quantidade_em_estoque - ? WHERE id = ?',
                        [item.quantidade, item.id]
                    );
                } else if (item.tipo === 'serviço') {
                    await dbRun(
                        'INSERT INTO Servicos_Venda (venda_id, servico_id, valor, quantidade) VALUES (?, ?, ?, ?)',
                        [vendaId, item.id, item.precoUnitario, item.quantidade]
                    );
                }
            }
            
            // --- NOVO: LÓGICA DE CRIAÇÃO DO LANÇAMENTO FINANCEIRO ---

            // 1. Descobrir se a forma de pagamento é A_VISTA ou A_PRAZO
            const formaPag = await dbGet('SELECT TipoLancamento FROM FormasPagamento WHERE id = ?', [FormaPagamentoID]);
            if (!formaPag) {
                throw new Error('Forma de Pagamento inválida.');
            }

            // 2. Definir o Status, Categoria e Datas do Lançamento
            const statusLancamento = (formaPag.TipoLancamento === 'A_PRAZO') ? 'PENDENTE' : 'PAGO';
            const hoje = new Date().toISOString().split('T')[0];

            // Define a Categoria (1="Venda de Produtos", 2="Venda de Serviços")
            const hasProdutos = itens.some(item => item.tipo === 'produto');
            const categoriaId = hasProdutos ? 1 : 2; // Dá prioridade a "Venda de Produtos"
            
            // 3. Montar o objeto do Lançamento
            const lancamento = {
                Descricao: `Venda de Balcão #${vendaId}`,
                Valor: total,
                Tipo: 'RECEITA',
                Status: statusLancamento,
                DataVencimento: (statusLancamento === 'PENDENTE') ? DataVencimento : hoje,
                DataPagamento: (statusLancamento === 'PAGO') ? hoje : null,
                ClienteID: cliente_id,
                VendaID: vendaId,
                FormaPagamentoID: FormaPagamentoID,
                CategoriaID: categoriaId,
                ContaCaixaID: (statusLancamento === 'PAGO') ? ContaCaixaID : null
            };
            
            // 4. Inserir o Lançamento
            await dbRun(
                `INSERT INTO Lancamentos 
                 (Descricao, Valor, Tipo, Status, DataVencimento, DataPagamento, 
                  ClienteID, VendaID, FormaPagamentoID, CategoriaID, ContaCaixaID) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    lancamento.Descricao, lancamento.Valor, lancamento.Tipo, lancamento.Status,
                    lancamento.DataVencimento, lancamento.DataPagamento, lancamento.ClienteID,
                    lancamento.VendaID, lancamento.FormaPagamentoID, lancamento.CategoriaID, lancamento.ContaCaixaID
                ]
            );

            // --- FIM DA NOVA LÓGICA ---

            await dbRun('COMMIT');
            resolve(vendaResult);

        } catch (err) {
            await dbRun('ROLLBACK');
            reject(err);
        }
    });
};

module.exports = { create };