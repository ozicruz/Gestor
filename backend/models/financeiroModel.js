// backend/models/financeiroModel.js
const { dbAll, dbGet, dbRun } = require('../database/database');

// --- NOVO: FUNÇÃO PARA BUSCAR FORMAS DE PAGAMENTO ---
const getFormasPagamento = () => {
    return dbAll('SELECT * FROM FormasPagamento ORDER BY id');
};

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

const updateLancamentoParaPago = (id, DataPagamento, ContaCaixaID, FormaPagamentoID) => {
    const sql = `
        UPDATE Lancamentos 
        SET Status = 'PAGO', DataPagamento = ?, ContaCaixaID = ?, FormaPagamentoID = ? 
        WHERE id = ?
    `;
    return dbRun(sql, [DataPagamento, ContaCaixaID, FormaPagamentoID, id]);
};

const updateLancamentoValorPendente = (id, novoValor) => {
    const sql = `UPDATE Lancamentos SET Valor = ?, Descricao = CONCAT(Descricao, ' (Pagto Parcial)') WHERE id = ?`;
    return dbRun(sql, [novoValor, id]);
};

// --- Funções de Relatórios ---

const getDRE = async (data_inicio, data_fim) => {
    // 1. Precisamos de duas consultas: uma para Receitas/Despesas e outra para o Custo (CMV)

    // Consulta 1: Busca Receitas (sem ser de produtos) e Despesas
    const sqlGrupos = `
        SELECT 
            c.Nome AS CategoriaNome,
            l.Tipo,
            COALESCE(SUM(l.Valor), 0) AS TotalPorCategoria
        FROM Lancamentos l
        JOIN CategoriasFinanceiras c ON l.CategoriaID = c.id
        WHERE 
            l.Status = 'PAGO'
            AND l.DataPagamento BETWEEN ? AND ?
        GROUP BY 
            l.CategoriaID, l.Tipo, c.Nome
    `;

    // Consulta 2: Calcula o Custo da Mercadoria Vendida (CMV)
    // Multiplica a quantidade vendida (Itens_Venda) pelo custo (Produtos)
    const sqlCMV = `
        SELECT 
            COALESCE(SUM(iv.quantidade * p.valor_custo), 0) AS TotalCMV
        FROM Itens_Venda iv
        JOIN Vendas v ON iv.venda_id = v.id
        JOIN Produtos p ON iv.produto_id = p.id
        JOIN Lancamentos l ON l.VendaID = v.id
        WHERE 
            l.Status = 'PAGO'
            AND l.DataPagamento BETWEEN ? AND ?
    `;

    // Executa as duas consultas em paralelo
    const [grupos, [cmvResult]] = await Promise.all([
        dbAll(sqlGrupos, [data_inicio, data_fim]),
        dbAll(sqlCMV, [data_inicio, data_fim])
    ]);

    // Retorna ambos os resultados para o Controller
    return { grupos, totalCMV: cmvResult.TotalCMV };
};

module.exports = {
    getFormasPagamento,
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