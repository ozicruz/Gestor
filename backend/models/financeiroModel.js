// backend/models/financeiroModel.js
const { dbAll, dbGet, dbRun } = require('../database/database');

// --- GETs AUXILIARES ---
const getFormasPagamento = () => dbAll('SELECT * FROM FormasPagamento ORDER BY id');
const getContasCaixa = () => dbAll('SELECT id, Nome, SaldoInicial FROM ContasCaixa');

const getCategorias = (tipo) => {
    let sqlQuery = "SELECT * FROM CategoriasFinanceiras";
    let params = [];
    if (tipo) {
        sqlQuery += " WHERE Tipo = ?";
        params.push(tipo);
    }
    return dbAll(sqlQuery, params);
};

// --- DASHBOARD ---
const getSaldoAtual = () => {
    return dbGet(`
        SELECT 
            (SELECT COALESCE(SUM(CAST(Valor AS REAL)), 0) FROM Lancamentos WHERE Tipo = 'RECEITA' AND Status = 'PAGO') - 
            (SELECT COALESCE(SUM(CAST(Valor AS REAL)), 0) FROM Lancamentos WHERE Tipo = 'DESPESA' AND Status = 'PAGO') 
        AS SaldoAtualTotal
    `);
};

// CORREÇÃO AQUI: Usamos date() para garantir que vendas com horário sejam incluídas no filtro
const getEntradasMes = (inicio, fim) => dbGet("SELECT COALESCE(SUM(CAST(Valor AS REAL)), 0) AS EntradasMes FROM Lancamentos WHERE Tipo = 'RECEITA' AND Status = 'PAGO' AND date(DataPagamento) BETWEEN ? AND ?", [inicio, fim]);

const getSaidasMes = (inicio, fim) => dbGet("SELECT COALESCE(SUM(CAST(Valor AS REAL)), 0) AS SaidasMes FROM Lancamentos WHERE Tipo = 'DESPESA' AND Status = 'PAGO' AND date(DataPagamento) BETWEEN ? AND ?", [inicio, fim]);

const getReceberVencido = (hoje) => dbGet("SELECT COALESCE(SUM(CAST(Valor AS REAL)), 0) AS ContasReceberVencido FROM Lancamentos WHERE Tipo = 'RECEITA' AND Status = 'PENDENTE' AND date(DataVencimento) < date(?)", [hoje]);

const getPagarHoje = (hoje) => dbGet("SELECT COALESCE(SUM(CAST(Valor AS REAL)), 0) AS ContasPagarHoje FROM Lancamentos WHERE Tipo = 'DESPESA' AND Status = 'PENDENTE' AND date(DataVencimento) = date(?)", [hoje]);

// --- MOVIMENTO DO DIA (A CORREÇÃO PRINCIPAL) ---
const getMovimentoCaixa = (data_inicio, data_fim, conta_id) => {
    let params = [];
    let sql = `
        SELECT l.id, l.Descricao, l.Valor, l.Tipo, l.DataPagamento, c.Nome AS CategoriaNome, cc.Nome AS ContaCaixaNome
        FROM Lancamentos l
        LEFT JOIN CategoriasFinanceiras c ON l.CategoriaID = c.id
        LEFT JOIN ContasCaixa cc ON l.ContaCaixaID = cc.id
        WHERE l.Status = 'PAGO'
    `;
    
    // AQUI: Usamos date(l.DataPagamento) para ignorar as horas e pegar tudo do dia
    if (data_inicio && data_fim) { 
        sql += " AND date(l.DataPagamento) BETWEEN ? AND ?"; 
        params.push(data_inicio, data_fim); 
    }
    
    if (conta_id) { 
        sql += " AND l.ContaCaixaID = ?"; 
        params.push(conta_id); 
    }
    
    sql += " ORDER BY l.DataPagamento DESC";
    return dbAll(sql, params);
};

// --- CRIAÇÃO E EXCLUSÃO ---
const createLancamento = async (dados) => {
    const { Descricao, Valor, Tipo, CategoriaID, ContaCaixaID, DataPagamento, DataVencimento, Status, ClienteID, VendaID, FormaPagamentoID } = dados;
    const statusFinal = Status || 'PAGO';
    const vencimentoFinal = DataVencimento || DataPagamento;

    const sql = `
        INSERT INTO Lancamentos (
            Descricao, Valor, Tipo, CategoriaID, ContaCaixaID, 
            DataPagamento, DataVencimento, Status, ClienteID, VendaID, FormaPagamentoID
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        Descricao, Valor, Tipo, CategoriaID || null, ContaCaixaID || null, 
        DataPagamento || null, vencimentoFinal, statusFinal, 
        ClienteID || null, VendaID || null, FormaPagamentoID || null
    ];
    
    return await dbRun(sql, params);
};

const deleteLancamento = async (id) => {
    const lancamento = await dbGet('SELECT * FROM Lancamentos WHERE id = ?', [id]);
    if (!lancamento) return null;

    if (lancamento.Status === 'PAGO' && lancamento.ContaCaixaID) {
        let valorEstorno = parseFloat(lancamento.Valor);
        if (lancamento.Tipo === 'DESPESA') valorEstorno = Math.abs(valorEstorno); 
        else valorEstorno = -Math.abs(valorEstorno);
        await dbRun('UPDATE ContasCaixa SET Saldo = Saldo + ? WHERE id = ?', [valorEstorno, lancamento.ContaCaixaID]);
    }
    return await dbRun('DELETE FROM Lancamentos WHERE id = ?', [id]);
};

// --- CONTAS A PAGAR ---
const getContasAPagar = () => {
    return dbAll(`
        SELECT l.*, c.Nome as CategoriaNome, cc.Nome as ContaCaixaNome
        FROM Lancamentos l
        LEFT JOIN CategoriasFinanceiras c ON l.CategoriaID = c.id
        LEFT JOIN ContasCaixa cc ON l.ContaCaixaID = cc.id
        WHERE l.Tipo = 'DESPESA' AND l.Status = 'PENDENTE'
        ORDER BY l.DataVencimento ASC
    `);
};

const getResumoContasPagar = async (hoje) => {
    const sqlBase = "SELECT COALESCE(SUM(CAST(Valor AS REAL)), 0) as total FROM Lancamentos WHERE Tipo='DESPESA' AND Status='PENDENTE'";
    const total = await dbGet(sqlBase);
    const vencido = await dbGet(sqlBase + " AND date(DataVencimento) < date(?)", [hoje]);
    const pagarHoje = await dbGet(sqlBase + " AND date(DataVencimento) = date(?)", [hoje]);

    return { TotalAPagar: total?.total || 0, TotalVencido: vencido?.total || 0, PagarHoje: pagarHoje?.total || 0 };
};

// --- CONTAS A RECEBER ---
const getTotalAReceber = () => dbGet("SELECT COALESCE(SUM(CAST(Valor AS REAL)), 0) AS TotalAReceber FROM Lancamentos WHERE Tipo = 'RECEITA' AND Status = 'PENDENTE'");
const getTotalVencido = (hoje) => dbGet("SELECT COALESCE(SUM(CAST(Valor AS REAL)), 0) AS TotalVencido FROM Lancamentos WHERE Tipo = 'RECEITA' AND Status = 'PENDENTE' AND date(DataVencimento) < date(?)", [hoje]);
const getReceberHoje = (hoje) => dbGet("SELECT COALESCE(SUM(CAST(Valor AS REAL)), 0) AS ReceberHoje FROM Lancamentos WHERE Tipo = 'RECEITA' AND Status = 'PENDENTE' AND date(DataVencimento) = date(?)", [hoje]);

const getContasAReceber = (filtros) => {
    const { cliente_id, status, data_inicio, data_fim, hoje } = filtros;
    let params = [];
    let sql = `SELECT l.id, l.Descricao, l.Valor, l.DataVencimento, l.VendaID, c.Nome AS ClienteNome FROM Lancamentos l LEFT JOIN Clientes c ON l.ClienteID = c.id WHERE l.Tipo = 'RECEITA' AND l.Status = 'PENDENTE'`;
    
    if (cliente_id) { sql += " AND l.ClienteID = ?"; params.push(cliente_id); }
    if (data_inicio && data_fim) { sql += " AND date(l.DataVencimento) BETWEEN ? AND ?"; params.push(data_inicio, data_fim); }
    
    if (status === 'vencido') { sql += " AND date(l.DataVencimento) < date(?)"; params.push(hoje); }
    else if (status === 'a_vencer') { sql += " AND date(l.DataVencimento) >= date(?)"; params.push(hoje); }
    
    sql += " ORDER BY l.DataVencimento ASC";
    return dbAll(sql, params);
};

const findLancamentoPendenteById = (id) => dbGet("SELECT * FROM Lancamentos WHERE id = ? AND Status = 'PENDENTE'", [id]);
const updateLancamentoParaPago = (id, DataPagamento, ContaCaixaID, FormaPagamentoID) => dbRun("UPDATE Lancamentos SET Status = 'PAGO', DataPagamento = ?, ContaCaixaID = ?, FormaPagamentoID = ? WHERE id = ?", [DataPagamento, ContaCaixaID, FormaPagamentoID, id]);
const updateLancamentoValorPendente = (id, novoValor) => dbRun("UPDATE Lancamentos SET Valor = ?, Descricao = CONCAT(Descricao, ' (Pagto Parcial)') WHERE id = ?", [novoValor, id]);

// --- DRE ---
const getDRE = async (inicio, fim) => {
    const sqlGrupos = `SELECT c.Nome AS CategoriaNome, l.Tipo, COALESCE(SUM(l.Valor), 0) AS TotalPorCategoria FROM Lancamentos l JOIN CategoriasFinanceiras c ON l.CategoriaID = c.id WHERE l.Status = 'PAGO' AND date(l.DataPagamento) BETWEEN ? AND ? GROUP BY l.CategoriaID, l.Tipo, c.Nome`;
    const sqlCMV = `SELECT COALESCE(SUM(iv.quantidade * p.valor_custo), 0) AS TotalCMV FROM Itens_Venda iv JOIN Vendas v ON iv.venda_id = v.id JOIN Produtos p ON iv.produto_id = p.id JOIN Lancamentos l ON l.VendaID = v.id WHERE l.Status = 'PAGO' AND date(l.DataPagamento) BETWEEN ? AND ?`;
    const [grupos, [cmvResult]] = await Promise.all([dbAll(sqlGrupos, [inicio, fim]), dbAll(sqlCMV, [inicio, fim])]);
    return { grupos, totalCMV: cmvResult?.TotalCMV || 0 };
};

module.exports = {
    getFormasPagamento, getCategorias, getContasCaixa,
    getSaldoAtual, getEntradasMes, getSaidasMes, getReceberVencido, getPagarHoje, getMovimentoCaixa,
    createLancamento, deleteLancamento,
    getContasAPagar, getResumoContasPagar,
    getTotalAReceber, getTotalVencido, getReceberHoje, getContasAReceber,
    findLancamentoPendenteById, updateLancamentoParaPago, updateLancamentoValorPendente,
    getDRE
};