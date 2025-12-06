// backend/models/relatorioModel.js
const { dbAll, dbGet } = require('../database/database');

/**
 * Busca produtos vendidos num período, calcula o total vendido,
 * o faturamento bruto, o custo total (CMV) e o lucro bruto de cada um.
 */
const findProdutosMaisVendidos = (data_inicio, data_fim) => {

    // Esta consulta SQL junta Vendas, Itens, Produtos e Lançamentos
    // para garantir que só contamos produtos de VENDAS PAGAS.
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
        JOIN Lancamentos l ON l.VendaID = v.id
        WHERE 
            l.Status = 'PAGO' 
            AND l.Tipo = 'RECEITA'
            AND l.DataPagamento BETWEEN ? AND ?
        GROUP BY 
            p.id, p.nome
        ORDER BY 
            lucroBruto DESC -- Ordena pelos mais lucrativos
    `;

    return dbAll(sql, [data_inicio, data_fim]);
};

const findStockBaixo = () => {

    // Filtra apenas produtos onde o mínimo é maior que 0
    const sql = `
        SELECT 
            id,
            nome,
            quantidade_em_estoque,
            stock_minimo
        FROM Produtos
        WHERE 
            quantidade_em_estoque < stock_minimo
            AND stock_minimo > 0
        ORDER BY 
            (stock_minimo - quantidade_em_estoque) DESC -- Ordena pelos mais urgentes
    `;

    return dbAll(sql);
};
// --- NOVAS FUNÇÕES PARA RELATÓRIO DE VENDAS ---

const findVendasRealizadas = (data_inicio, data_fim) => {
    const sql = `
        SELECT 
            v.id,
            v.data,
            v.total,
            c.nome AS cliente_nome,
            fp.Nome AS forma_pagamento,
            v.desconto_valor,
            v.acrescimo_valor
        FROM Vendas v
        LEFT JOIN Clientes c ON v.cliente_id = c.id
        LEFT JOIN FormasPagamento fp ON v.FormaPagamentoID = fp.id
        WHERE date(v.data) BETWEEN ? AND ?
        ORDER BY v.data DESC
    `;
    return dbAll(sql, [data_inicio, data_fim]);
};

const findVendaDetalhes = async (vendaId) => {
    // 1. Busca os dados da venda
    const sqlVenda = `
        SELECT v.*, c.nome AS cliente_nome, fp.Nome AS forma_pagamento 
        FROM Vendas v
        LEFT JOIN Clientes c ON v.cliente_id = c.id
        LEFT JOIN FormasPagamento fp ON v.FormaPagamentoID = fp.id
        WHERE v.id = ?
    `;
    const venda = await dbGet(sqlVenda, [vendaId]);

    if (!venda) return null;

    // 2. Busca os produtos (itens)
    const sqlItens = `
        SELECT p.nome, iv.quantidade, iv.valor_unitario, (iv.quantidade * iv.valor_unitario) as subtotal
        FROM Itens_Venda iv
        JOIN Produtos p ON iv.produto_id = p.id
        WHERE iv.venda_id = ?
    `;
    const itens = await dbAll(sqlItens, [vendaId]);

    // 3. Busca os serviços
    const sqlServicos = `
        SELECT s.nome, sv.quantidade, sv.valor as valor_unitario, (sv.quantidade * sv.valor) as subtotal
        FROM Servicos_Venda sv
        JOIN Servicos s ON sv.servico_id = s.id
        WHERE sv.venda_id = ?
    `;
    const servicos = await dbAll(sqlServicos, [vendaId]);

    return { ...venda, itens, servicos };
};

module.exports = {
    findProdutosMaisVendidos,
    findStockBaixo,
    findVendasRealizadas,
    findVendaDetalhes
};