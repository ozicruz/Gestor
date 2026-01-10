const { dbAll, dbGet } = require('../database/database');

const listarProdutosMaisVendidos = async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query;
        const sql = `
            SELECT p.nome, 
                   SUM(iv.quantidade) as totalVendido,
                   SUM(iv.quantidade * iv.valor_unitario) as faturamentoBruto,
                   SUM(iv.quantidade * (iv.valor_unitario - p.valor_custo)) as lucroBruto
            FROM Itens_Venda iv
            JOIN Vendas v ON iv.venda_id = v.id
            JOIN Produtos p ON iv.produto_id = p.id
            WHERE date(v.data) BETWEEN date(?) AND date(?)
            GROUP BY p.id
            ORDER BY lucroBruto DESC
        `;
        const dados = await dbAll(sql, [data_inicio, data_fim]);
        res.json(dados);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const listarStockBaixo = async (req, res) => {
    try {
        const sql = `SELECT * FROM Produtos WHERE quantidade_em_estoque <= stock_minimo`;
        const dados = await dbAll(sql);
        res.json(dados);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const listarVendasRealizadas = async (req, res) => {
    try {
        const { data_inicio, data_fim, vendedor } = req.query;
        
        // ATUALIZADO: Sub-selects para separar o valor de Produtos e Serviços em cada venda
        let sql = `
            SELECT v.*, 
                   c.nome as cliente_nome, 
                   fp.Nome as forma_pagamento,
                   u.nome as vendedor_nome,
                   u.comissao_produto, 
                   u.comissao_servico,
                   (SELECT SUM(iv.quantidade * iv.valor_unitario) FROM Itens_Venda iv WHERE iv.venda_id = v.id) as total_prod_venda,
                   (SELECT SUM(sv.quantidade * sv.valor) FROM Servicos_Venda sv WHERE sv.venda_id = v.id) as total_serv_venda
            FROM Vendas v
            LEFT JOIN Clientes c ON v.cliente_id = c.id
            LEFT JOIN FormasPagamento fp ON v.FormaPagamentoID = fp.id
            LEFT JOIN Usuarios u ON v.vendedor_id = u.id
            WHERE date(v.data) BETWEEN date(?) AND date(?)
        `;
        
        const params = [data_inicio, data_fim];

        if (vendedor) {
            sql += ` AND u.nome = ? `;
            params.push(vendedor);
        }

        sql += ` ORDER BY v.data DESC`;

        const dados = await dbAll(sql, params);
        res.json(dados);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const buscarDetalhesVenda = async (req, res) => {
    try {
        const { id } = req.params;
        const venda = await dbGet(`
            SELECT v.*, c.nome as cliente_nome, fp.Nome as forma_pagamento 
            FROM Vendas v 
            LEFT JOIN Clientes c ON v.cliente_id = c.id
            LEFT JOIN FormasPagamento fp ON v.FormaPagamentoID = fp.id
            WHERE v.id = ?`, [id]);

        if (!venda) return res.status(404).json({ message: "Venda não encontrada" });

        const itens = await dbAll(`
            SELECT iv.*, p.nome 
            FROM Itens_Venda iv 
            JOIN Produtos p ON iv.produto_id = p.id 
            WHERE iv.venda_id = ?`, [id]);

        const servicos = await dbAll(`
            SELECT sv.*, s.nome 
            FROM Servicos_Venda sv 
            JOIN Servicos s ON sv.servico_id = s.id 
            WHERE sv.venda_id = ?`, [id]);

        res.json({ ...venda, itens, servicos });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const listarRankingServicos = async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query;
        const sql = `
            SELECT s.nome, COUNT(sv.id) as quantidade, SUM(sv.valor * sv.quantidade) as total
            FROM Servicos_Venda sv
            JOIN Vendas v ON sv.venda_id = v.id
            JOIN Servicos s ON sv.servico_id = s.id
            WHERE date(v.data) BETWEEN date(?) AND date(?)
            GROUP BY s.id ORDER BY total DESC
        `;
        res.json(await dbAll(sql, [data_inicio, data_fim]));
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const listarRankingClientes = async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query;
        const sql = `
            SELECT c.nome, COUNT(v.id) as numero_vendas, SUM(v.total) as total_gasto
            FROM Vendas v
            JOIN Clientes c ON v.cliente_id = c.id
            WHERE date(v.data) BETWEEN date(?) AND date(?)
            GROUP BY c.id ORDER BY total_gasto DESC
        `;
        res.json(await dbAll(sql, [data_inicio, data_fim]));
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// --- AUDITORIA DE PREÇOS (Esta é a função que faltava ou estava com erro) ---
const getAuditoriaVendas = async (req, res) => {
    const { data_inicio, data_fim } = req.query;
    try {
        const sql = `
            SELECT 
                u.nome as vendedor,
                'PRODUTO' as tipo,
                p.nome as item,
                iv.quantidade,
                iv.valor_unitario as vendido_por,
                p.preco_unitario as preco_tabela,
                (iv.valor_unitario - p.preco_unitario) as desvio_unitario,
                ((iv.valor_unitario - p.preco_unitario) * iv.quantidade) as desvio_total,
                ((iv.valor_unitario - p.valor_custo) * iv.quantidade) as lucro_bruto
            FROM Itens_Venda iv
            JOIN Vendas v ON iv.venda_id = v.id
            JOIN Produtos p ON iv.produto_id = p.id
            JOIN Usuarios u ON v.vendedor_id = u.id
            WHERE date(v.data) BETWEEN date(?) AND date(?)
            AND iv.valor_unitario <> p.preco_unitario

            UNION ALL

            SELECT 
                u.nome as vendedor,
                'SERVIÇO' as tipo,
                s.nome as item,
                sv.quantidade,
                sv.valor as vendido_por,
                s.preco as preco_tabela,
                (sv.valor - s.preco) as desvio_unitario,
                ((sv.valor - s.preco) * sv.quantidade) as desvio_total,
                (sv.valor * sv.quantidade) as lucro_bruto
            FROM Servicos_Venda sv
            JOIN Vendas v ON sv.venda_id = v.id
            JOIN Servicos s ON sv.servico_id = s.id
            JOIN Usuarios u ON v.vendedor_id = u.id
            WHERE date(v.data) BETWEEN date(?) AND date(?)
            AND sv.valor <> s.preco

            ORDER BY vendedor, desvio_total ASC
        `;
        
        const dados = await dbAll(sql, [data_inicio, data_fim, data_inicio, data_fim]);
        res.json(dados);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ message: err.message }); 
    }
};

module.exports = {
    listarProdutosMaisVendidos,
    listarStockBaixo,
    listarVendasRealizadas,
    buscarDetalhesVenda,
    listarRankingServicos,
    listarRankingClientes,
    getAuditoriaVendas // <--- Certifique-se de que está exportado aqui!
};