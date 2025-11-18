// backend/models/vendaModel.js (Versão Final e SIMPLES - A Sua Lógica)
const { dbRun, dbGet } = require('../database/database');

const create = (vendaData) => {
    // Agora lemos os campos de acréscimo do frontend
    const {
        cliente_id, os_id, itens, total,
        desconto_tipo, desconto_valor,
        acrescimo_tipo, acrescimo_valor, // <-- NOVOS CAMPOS
        FormaPagamentoID, ContaCaixaID, DataVencimento
        // numParcelas é ignorado pelo backend, é só para o recibo
    } = vendaData;

    return new Promise(async (resolve, reject) => {
        await dbRun('BEGIN TRANSACTION');
        try {
            // 1. Salvar a Venda (Agora com acréscimo)
            const vendaResult = await dbRun(
                'INSERT INTO Vendas (cliente_id, os_id, total, desconto_tipo, desconto_valor, acrescimo_tipo, acrescimo_valor, FormaPagamentoID, DataVencimento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [cliente_id, os_id, total, desconto_tipo, desconto_valor, acrescimo_tipo, acrescimo_valor, FormaPagamentoID, DataVencimento]
            );
            const vendaId = vendaResult.id;

            // 2. Salvar Itens e Abater Stock (Sem alteração)
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

            // --- 3. LÓGICA DE LANÇAMENTO (A LÓGICA CORRETA E SIMPLES) ---

            const formaPag = await dbGet('SELECT * FROM FormasPagamento WHERE id = ?', [FormaPagamentoID]);
            if (!formaPag) throw new Error('Forma de Pagamento inválida.');

            const hojeSQL = new Date().toISOString().split('T')[0];
            const categoriaIdVenda = itens.some(item => item.tipo === 'produto') ? 1 : 2; // 1=Produto, 2=Serviço

            let lancamento;

            // --- CENÁRIO 1: "Fiado" (A_PRAZO) ---
            if (formaPag.TipoLancamento === 'A_PRAZO') {
                lancamento = {
                    Descricao: `Venda de Balcão #${vendaId}`, Valor: total, Tipo: 'RECEITA',
                    Status: 'PENDENTE', DataVencimento: DataVencimento, DataPagamento: null,
                    ClienteID: cliente_id, VendaID: vendaId, FormaPagamentoID: FormaPagamentoID,
                    CategoriaID: categoriaIdVenda, ContaCaixaID: null
                };
            }
            // --- CENÁRIO 2: "À Vista" (Dinheiro, Pix, Cartão 1x, Cartão 10x) ---
            else {
                // Qualquer outro tipo de pagamento entra no caixa imediatamente
                lancamento = {
                    Descricao: `Venda de Balcão #${vendaId}`, Valor: total, Tipo: 'RECEITA',
                    Status: 'PAGO', DataVencimento: hojeSQL, DataPagamento: hojeSQL,
                    ClienteID: cliente_id, VendaID: vendaId, FormaPagamentoID: FormaPagamentoID,
                    CategoriaID: categoriaIdVenda, ContaCaixaID: ContaCaixaID
                };
            }

            // Insere o ÚNICO lançamento (sem taxas, sem parcelas)
            await dbRun(
                `INSERT INTO Lancamentos (Descricao, Valor, Tipo, Status, DataVencimento, DataPagamento, ClienteID, VendaID, FormaPagamentoID, CategoriaID, ContaCaixaID) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    lancamento.Descricao, lancamento.Valor, lancamento.Tipo, lancamento.Status,
                    lancamento.DataVencimento, lancamento.DataPagamento, lancamento.ClienteID,
                    lancamento.VendaID, lancamento.FormaPagamentoID, lancamento.CategoriaID, lancamento.ContaCaixaID
                ]
            );

            // --- FIM DA LÓGICA DE LANÇAMENTO ---

            await dbRun('COMMIT');
            resolve(vendaResult);

        } catch (err) {
            await dbRun('ROLLBACK');
            console.error('Erro na transação de venda:', err.message);
            reject(err);
        }
    });
};

module.exports = { create };