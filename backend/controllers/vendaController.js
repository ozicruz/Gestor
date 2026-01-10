const { dbGet, dbRun, dbAll } = require('../database/database');

const getDataHoraLocal = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localTime = new Date(now.getTime() - offsetMs);
    return localTime.toISOString().slice(0, 19).replace('T', ' ');
};

const criarVenda = async (req, res) => {
    try {
        const { cliente_id, os_id, itens, total, desconto_tipo, desconto_valor, acrescimo_tipo, acrescimo_valor, FormaPagamentoID, ContaCaixaID, DataVencimento, num_parcelas, vendedor_id } = req.body;

        const dataVenda = getDataHoraLocal(); 

        await dbRun('BEGIN TRANSACTION');

        // --- VERIFICAÇÃO DE ESTOQUE ---
        let estoqueJaBaixado = false;
        if (os_id) {
            const osOrigem = await dbGet('SELECT status FROM Ordens_Servico WHERE id = ?', [os_id]);
            // Se a OS já estava 'Em andamento' ou 'Finalizada', o estoque já foi baixado no controller da OS.
            if (osOrigem && osOrigem.status !== 'Orçamento' && osOrigem.status !== 'Cancelada') {
                estoqueJaBaixado = true;
            }
            // REMOVIDO: Não tentamos mais atualizar a OS com 'TEMP' aqui para evitar erro de Foreign Key
        }

        // 1. Cria a Venda Primeiro (Para gerar o ID)
        const sqlVenda = `
            INSERT INTO Vendas (cliente_id, os_id, total, desconto_tipo, desconto_valor, acrescimo_tipo, acrescimo_valor, FormaPagamentoID, ContaCaixaID, DataVencimento, num_parcelas, data, vendedor_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await dbRun(sqlVenda, [
            cliente_id, os_id, total, desconto_tipo, desconto_valor, acrescimo_tipo, acrescimo_valor, FormaPagamentoID, ContaCaixaID, DataVencimento, num_parcelas || 1, dataVenda, vendedor_id || null
        ]);
        
        const vendaId = result.id;

        // 2. AGORA SIM: Atualiza a OS com o ID real e Status
        if (os_id) {
            await dbRun("UPDATE Ordens_Servico SET status = 'Finalizada', venda_gerada_id = ? WHERE id = ?", [vendaId, os_id]);
        }

        // 3. Insere os Itens e Baixa Estoque (CONDICIONAL)
        if (itens && itens.length > 0) {
            for (const item of itens) {
                if (item.tipo === 'produto') {
                    // Regista o item na venda
                    await dbRun(`INSERT INTO Itens_Venda (venda_id, produto_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)`, 
                        [vendaId, item.id, item.quantidade, item.precoUnitario]);
                    
                    // SÓ BAIXA ESTOQUE SE AINDA NÃO FOI BAIXADO PELA OS
                    if (!estoqueJaBaixado) {
                        await dbRun(`UPDATE Produtos SET quantidade_em_estoque = quantidade_em_estoque - ? WHERE id = ?`, 
                            [item.quantidade, item.id]);

                        await dbRun(`INSERT INTO MovimentacoesEstoque (produto_id, quantidade, tipo, custo_unitario, observacao, data) VALUES (?, ?, ?, ?, ?, ?)`, 
                            [item.id, -item.quantidade, 'VENDA', 0, `Venda #${vendaId}`, dataVenda]);
                    } 
                    // Se foi OS já baixada, o histórico já tem "OS #..." gravado pelo controller da OS.

                } else if (item.tipo === 'serviço') {
                    await dbRun(`INSERT INTO Servicos_Venda (venda_id, servico_id, quantidade, valor) VALUES (?, ?, ?, ?)`, 
                        [vendaId, item.id, item.quantidade, item.precoUnitario]);
                }
            }
        }

        // 4. LANÇAMENTO FINANCEIRO
        const formaPagto = await dbGet('SELECT Nome, TipoLancamento FROM FormasPagamento WHERE id = ?', [FormaPagamentoID]);
        const tipoLanc = formaPagto ? formaPagto.TipoLancamento : 'A_VISTA';

        let statusFinanceiro = 'PAGO';
        let dataPagtoFinanceiro = dataVenda.substring(0, 10); 
        
        if (tipoLanc === 'A_PRAZO') {
            statusFinanceiro = 'PENDENTE';
            dataPagtoFinanceiro = null;
        }

        const catVenda = await dbGet("SELECT id FROM CategoriasFinanceiras WHERE Nome LIKE '%Venda%' LIMIT 1");
        const categoriaID = catVenda ? catVenda.id : null;

        const dataVencimentoFinal = DataVencimento || dataPagtoFinanceiro || dataVenda.substring(0, 10);

        await dbRun(`
            INSERT INTO Lancamentos (Descricao, Valor, Tipo, Status, DataVencimento, DataPagamento, ClienteID, VendaID, FormaPagamentoID, CategoriaID, ContaCaixaID)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            `Venda Balcão #${vendaId}`, total, 'RECEITA', statusFinanceiro, 
            dataVencimentoFinal, dataPagtoFinanceiro, 
            cliente_id, vendaId, FormaPagamentoID, categoriaID, ContaCaixaID
        ]);

        if (statusFinanceiro === 'PAGO' && ContaCaixaID) {
            await dbRun('UPDATE ContasCaixa SET Saldo = Saldo + ? WHERE id = ?', [total, ContaCaixaID]);
        }

        await dbRun('COMMIT');
        res.status(201).json({ id: vendaId, message: 'Venda realizada com sucesso.' });

    } catch (err) {
        await dbRun('ROLLBACK');
        console.error("Erro Venda:", err);
        res.status(500).json({ message: 'Erro ao processar venda.', error: err.message });
    }
};

const listarVendas = async (req, res) => {
    try {
        const vendas = await dbAll(`SELECT v.*, c.nome as cliente_nome, fp.Nome as forma_pagamento FROM Vendas v LEFT JOIN Clientes c ON v.cliente_id = c.id LEFT JOIN FormasPagamento fp ON v.FormaPagamentoID = fp.id ORDER BY v.data DESC`);
        res.json(vendas);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const obterPerformanceVendedores = async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query;
        const sql = `SELECT u.nome as vendedor, COUNT(v.id) as total_vendas, SUM(v.total) as total_faturado FROM Vendas v JOIN Usuarios u ON v.vendedor_id = u.id WHERE date(v.data) BETWEEN date(?) AND date(?) GROUP BY u.id ORDER BY total_faturado DESC`;
        const dados = await dbAll(sql, [data_inicio, data_fim]);
        res.json(dados);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { criarVenda, listarVendas, obterPerformanceVendedores };