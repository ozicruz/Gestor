// backend/models/financeiroModel.js
const { dbAll, dbGet, dbRun } = require('../database/database');

// --- Funções GET Simples (Listas) ---

const getCategorias = (tipo) => {
    let sqlQuery = "SELECT * FROM CategoriasFinanceiras";
    let params = [];
    if (tipo) {
        sqlQuery += " WHERE Tipo = ?";
        params.push(tipo);
    }
    return dbAll(sqlQuery, params);
};

const getContasCaixa = () => {
    return dbAll('SELECT id, Nome, SaldoInicial FROM ContasCaixa');
};

// --- Funções do Dashboard ---

const getSaldoAtual = () => {
    // Esta consulta calcula o saldo total de todos os tempos
    const sql = `
        SELECT 
            (SELECT COALESCE(SUM(Valor), 0) FROM Lancamentos WHERE Tipo = 'RECEITA' AND Status = 'PAGO') - 
            (SELECT COALESCE(SUM(Valor), 0) FROM Lancamentos WHERE Tipo = 'DESPESA' AND Status = 'PAGO') 
        AS SaldoAtualTotal
    `;
    return dbGet(sql); // dbGet pois retorna apenas um valor/linha
};

const getEntradasMes = (inicioMes, fimMes) => {
    const sql = `
        SELECT COALESCE(SUM(Valor), 0) AS EntradasMes 
        FROM Lancamentos 
        WHERE Tipo = 'RECEITA' AND Status = 'PAGO' 
        AND DataPagamento BETWEEN ? AND ?
    `;
    return dbGet(sql, [inicioMes, fimMes]);
};

const getSaidasMes = (inicioMes, fimMes) => {
    const sql = `
        SELECT COALESCE(SUM(Valor), 0) AS SaidasMes 
        FROM Lancamentos 
        WHERE Tipo = 'DESPESA' AND Status = 'PAGO' 
        AND DataPagamento BETWEEN ? AND ?
    `;
    return dbGet(sql, [inicioMes, fimMes]);
};

const getReceberVencido = (hoje) => {
    const sql = `
        SELECT COALESCE(SUM(Valor), 0) AS ContasReceberVencido 
        FROM Lancamentos 
        WHERE Tipo = 'RECEITA' AND Status = 'PENDENTE' 
        AND DataVencimento < ?
    `;
    return dbGet(sql, [hoje]);
};

const getPagarHoje = (hoje) => {
    const sql = `
        SELECT COALESCE(SUM(Valor), 0) AS ContasPagarHoje 
        FROM Lancamentos 
        WHERE Tipo = 'DESPESA' AND Status = 'PENDENTE' 
        AND DataVencimento = ?
    `;
    return dbGet(sql, [hoje]);
};

const getMovimentoCaixa = (data_inicio, data_fim, conta_id) => {
    let params = [];
    let sqlQuery = `
        SELECT l.id, l.Descricao, l.Valor, l.Tipo, l.DataPagamento,
               c.Nome AS CategoriaNome, cc.Nome AS ContaCaixaNome
        FROM Lancamentos l
        LEFT JOIN CategoriasFinanceiras c ON l.CategoriaID = c.id
        LEFT JOIN ContasCaixa cc ON l.ContaCaixaID = cc.id
        WHERE l.Status = 'PAGO'
    `;
    if (data_inicio && data_fim) {
        sqlQuery += " AND l.DataPagamento BETWEEN ? AND ?";
        params.push(data_inicio, data_fim);
    }
    if (conta_id) {
        sqlQuery += " AND l.ContaCaixaID = ?";
        params.push(conta_id);
    }
    sqlQuery += " ORDER BY l.DataPagamento DESC";
    return dbAll(sqlQuery, params);
};

// --- Funções de Contas a Receber ---

const getTotalAReceber = () => {
    const sql = `SELECT COALESCE(SUM(Valor), 0) AS TotalAReceber
                 FROM Lancamentos WHERE Tipo = 'RECEITA' AND Status = 'PENDENTE'`;
    return dbGet(sql);
};

const getTotalVencido = (hoje) => {
    const sql = `SELECT COALESCE(SUM(Valor), 0) AS TotalVencido
                 FROM Lancamentos WHERE Tipo = 'RECEITA' AND Status = 'PENDENTE' AND DataVencimento < ?`;
    return dbGet(sql, [hoje]);
};

const getReceberHoje = (hoje) => {
    const sql = `SELECT COALESCE(SUM(Valor), 0) AS ReceberHoje
                 FROM Lancamentos WHERE Tipo = 'RECEITA' AND Status = 'PENDENTE' AND DataVencimento = ?`;
    return dbGet(sql, [hoje]);
};

const getContasAReceber = (filtros) => {
    const { cliente_id, status, data_inicio, data_fim, hoje } = filtros;
    let params = [];
    let sqlQuery = `
        SELECT l.id, l.Descricao, l.Valor, l.DataVencimento, l.VendaID, c.Nome AS ClienteNome
        FROM Lancamentos l
        LEFT JOIN Clientes c ON l.ClienteID = c.id
        WHERE l.Tipo = 'RECEITA' AND l.Status = 'PENDENTE'
    `;
    if (cliente_id) {
        sqlQuery += " AND l.ClienteID = ?";
        params.push(cliente_id);
    }
    if (data_inicio && data_fim) {
        sqlQuery += " AND l.DataVencimento BETWEEN ? AND ?";
        params.push(data_inicio, data_fim);
    }
    if (status === 'vencido') {
        sqlQuery += " AND l.DataVencimento < ?";
        params.push(hoje);
    } else if (status === 'a_vencer') {
        sqlQuery += " AND l.DataVencimento >= ?";
        params.push(hoje);
    }
    sqlQuery += " ORDER BY l.DataVencimento ASC";
    return dbAll(sqlQuery, params);
};

// --- Funções de Lançamento (INSERT/UPDATE) ---

const createLancamento = (lancamento) => {
    const { Descricao, Valor, Tipo, Status, DataPagamento, DataVencimento, CategoriaID, ContaCaixaID, ClienteID, VendaID } = lancamento;
    const sql = `
        INSERT INTO Lancamentos 
        (Descricao, Valor, Tipo, Status, DataPagamento, DataVencimento, CategoriaID, ContaCaixaID, ClienteID, VendaID)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return dbRun(sql, [Descricao, Valor, Tipo, Status, DataPagamento, DataVencimento, CategoriaID, ContaCaixaID, ClienteID, VendaID]);
};

// Helpers para a Transação de Baixa
const findLancamentoPendenteById = (id) => {
    return dbGet("SELECT * FROM Lancamentos WHERE id = ? AND Status = 'PENDENTE' AND Tipo = 'RECEITA'", [id]);
};

const updateLancamentoParaPago = (id, DataPagamento, ContaCaixaID) => {
    const sql = `UPDATE Lancamentos SET Status = 'PAGO', DataPagamento = ?, ContaCaixaID = ? WHERE id = ?`;
    return dbRun(sql, [DataPagamento, ContaCaixaID, id]);
};

const updateLancamentoValorPendente = (id, novoValor) => {
    const sql = `UPDATE Lancamentos SET Valor = ?, Descricao = CONCAT(Descricao, ' (Pagto Parcial)') WHERE id = ?`;
    return dbRun(sql, [novoValor, id]);
};

// --- Funções de Relatórios ---

const getDRE = (data_inicio, data_fim) => {
    const sql = `
        SELECT c.Nome AS CategoriaNome, l.Tipo, COALESCE(SUM(l.Valor), 0) AS TotalPorCategoria
        FROM Lancamentos l
        JOIN CategoriasFinanceiras c ON l.CategoriaID = c.id
        WHERE l.Status = 'PAGO' AND l.DataPagamento BETWEEN ? AND ?
        GROUP BY l.CategoriaID, l.Tipo, c.Nome
        ORDER BY l.Tipo, TotalPorCategoria DESC
    `;
    return dbAll(sql, [data_inicio, data_fim]);
};

module.exports = {
    getCategorias,
    getContasCaixa,
    getSaldoAtual,
    getEntradasMes,
    getSaidasMes,
    getReceberVencido,
    getPagarHoje,
    getMovimentoCaixa,
    getTotalAReceber,
    getTotalVencido,
    getReceberHoje,
    getContasAReceber,
    createLancamento,
    findLancamentoPendenteById,
    updateLancamentoParaPago,
    updateLancamentoValorPendente,
    getDRE
};