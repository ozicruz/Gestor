// backend/models/relatorioModel.js
const { dbAll, dbGet } = require('../database/database');

/**
 * Busca produtos vendidos num período.
 */
const findProdutosMaisVendidos = (data_inicio, data_fim) => {
    // Atenção: Ajuste 'Itens_Venda' se o nome da sua tabela for diferente no banco
    // Usa 'produto_id' conforme visto em outras partes do seu código
    const sql = `
        SELECT 
            p.nome,
            p.id as produtoId,
            SUM(iv.quantidade) as totalVendido,
            SUM(iv.quantidade * iv.valor_unitario) as faturamentoBruto,
            SUM(iv.quantidade * p.valor_custo) as custoTotal,
            (SUM(iv.quantidade * iv.valor_unitario) - SUM(iv.quantidade * p.valor_custo)) as lucroBruto
        FROM Itens_Venda iv
        JOIN Produtos p ON iv.produto_id = p.id
        JOIN Vendas v ON iv.venda_id = v.id
        WHERE date(v.data) BETWEEN date(?) AND date(?)
        GROUP BY p.id, p.nome
        ORDER BY lucroBruto DESC
    `;
    return dbAll(sql, [data_inicio, data_fim]);
};

const findStockBaixo = () => {
    const sql = `
        SELECT id, nome, quantidade_em_estoque, stock_minimo 
        FROM Produtos 
        WHERE quantidade_em_estoque <= stock_minimo AND stock_minimo > 0
    `;
    return dbAll(sql);
};

const findVendasRealizadas = (data_inicio, data_fim) => {
    const sql = `
        SELECT 
            v.id, v.data, v.total, 
            c.nome AS cliente_nome, 
            fp.Nome AS forma_pagamento,
            v.desconto_valor, v.acrescimo_valor
        FROM Vendas v
        LEFT JOIN Clientes c ON v.cliente_id = c.id
        LEFT JOIN FormasPagamento fp ON v.FormaPagamentoID = fp.id
        WHERE date(v.data) BETWEEN date(?) AND date(?)
        ORDER BY v.data DESC
    `;
    return dbAll(sql, [data_inicio, data_fim]);
};

const findVendaDetalhes = async (vendaId) => {
    // 1. Busca a Venda
    const sqlVenda = `
        SELECT v.*, c.nome AS cliente_nome, fp.Nome AS forma_pagamento 
        FROM Vendas v
        LEFT JOIN Clientes c ON v.cliente_id = c.id
        LEFT JOIN FormasPagamento fp ON v.FormaPagamentoID = fp.id
        WHERE v.id = ?
    `;
    const venda = await dbGet(sqlVenda, [vendaId]);

    if (!venda) return null;

    // 2. Busca Produtos (Itens_Venda)
    const sqlItens = `
        SELECT p.nome, iv.quantidade, iv.valor_unitario, (iv.quantidade * iv.valor_unitario) as subtotal
        FROM Itens_Venda iv
        JOIN Produtos p ON iv.produto_id = p.id
        WHERE iv.venda_id = ?
    `;
    const itens = await dbAll(sqlItens, [vendaId]);

    // 3. Busca Serviços (Servicos_Venda)
    const sqlServicos = `
        SELECT s.nome, sv.quantidade, sv.valor as valor_unitario, (sv.quantidade * sv.valor) as subtotal
        FROM Servicos_Venda sv
        JOIN Servicos s ON sv.servico_id = s.id
        WHERE sv.venda_id = ?
    `;
    const servicos = await dbAll(sqlServicos, [vendaId]);

    return { ...venda, itens, servicos };
};

// --- NOVAS FUNÇÕES CORRIGIDAS ---

// 1. Ranking de Serviços (Corrigido para usar a tabela Servicos_Venda)
const findRankingServicos = (inicio, fim) => {
    const sql = `
        SELECT 
            s.nome,
            COUNT(sv.id) as quantidade,
            SUM(sv.quantidade * sv.valor) as total
        FROM Servicos_Venda sv
        JOIN Servicos s ON sv.servico_id = s.id
        JOIN Vendas v ON sv.venda_id = v.id
        WHERE date(v.data) BETWEEN date(?) AND date(?)
        GROUP BY s.id
        ORDER BY total DESC
    `;
    return dbAll(sql, [inicio, fim]);
};

// 2. Ranking de Clientes
const findRankingClientes = (inicio, fim) => {
    const sql = `
        SELECT 
            c.nome,
            COUNT(v.id) as numero_vendas,
            SUM(v.total) as total_gasto
        FROM Vendas v
        JOIN Clientes c ON v.cliente_id = c.id
        WHERE date(v.data) BETWEEN date(?) AND date(?)
        GROUP BY c.id
        ORDER BY total_gasto DESC
        LIMIT 20
    `;
    return dbAll(sql, [inicio, fim]);
};

module.exports = {
    findProdutosMaisVendidos,
    findStockBaixo,
    findVendasRealizadas,
    findVendaDetalhes,
    findRankingServicos,
    findRankingClientes
};