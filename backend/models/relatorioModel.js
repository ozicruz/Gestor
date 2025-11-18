// backend/models/relatorioModel.js
const { dbAll } = require('../database/database');

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

module.exports = {
    findProdutosMaisVendidos,
    findStockBaixo
};