const { dbAll, dbRun, dbGet } = require('../database/database');

// --- 1. Contas e Caixas ---
const listarContas = async (req, res) => {
    try {
        const contas = await dbAll('SELECT * FROM ContasCaixa');
        res.json(contas);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const criarConta = async (req, res) => {
    const { nome, saldo_inicial } = req.body;
    try {
        await dbRun(
            'INSERT INTO ContasCaixa (Nome, Saldo, SaldoInicial) VALUES (?, ?, ?)', 
            [nome, saldo_inicial || 0, saldo_inicial || 0]
        );
        res.status(201).json({ message: 'Conta criada.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const removerConta = async (req, res) => {
    const { id } = req.params;
    try {
        if(id == 1) return res.status(400).json({ message: "Não é possível remover o caixa principal." });
        await dbRun('DELETE FROM ContasCaixa WHERE id = ?', [id]);
        res.json({ message: 'Conta removida.' });
    } catch (err) { res.status(500).json({ message: "Erro ao remover (pode haver vínculos). " + err.message }); }
};

// --- 2. Auxiliares ---
const listarFormasPagamento = async (req, res) => {
    try {
        const formas = await dbAll('SELECT * FROM FormasPagamento');
        res.json(formas);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const listarCategorias = async (req, res) => {
    try {
        const { tipo } = req.query;
        let sql = 'SELECT * FROM CategoriasFinanceiras';
        let params = [];
        if (tipo) { sql += ' WHERE Tipo = ?'; params.push(tipo); }
        const categorias = await dbAll(sql, params);
        res.json(categorias);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// --- 3. Lançamentos ---
const criarLancamento = async (req, res) => {
    const { descricao, valor, tipo, data_vencimento, categoria_id, conta_id, forma_pagamento_id, status } = req.body;
    try {
        const result = await dbRun(
            `INSERT INTO Lancamentos (Descricao, Valor, Tipo, DataVencimento, CategoriaID, ContaCaixaID, FormaPagamentoID, Status, DataPagamento) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [descricao, valor, tipo, data_vencimento, categoria_id, conta_id, forma_pagamento_id, status, status === 'PAGO' ? new Date().toISOString() : null]
        );
        
        if (status === 'PAGO' && conta_id) {
            const operador = tipo === 'RECEITA' ? '+' : '-';
            await dbRun(`UPDATE ContasCaixa SET Saldo = Saldo ${operador} ? WHERE id = ?`, [valor, conta_id]);
        }

        res.status(201).json({ id: result.id, message: 'Lançamento criado.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const baixarLancamento = async (req, res) => {
    const { id } = req.params;
    const { ValorRecebido, ContaCaixaID, DataPagamento } = req.body; // Recebendo dados do modal
    
    try {
        const lancamento = await dbGet('SELECT * FROM Lancamentos WHERE id = ?', [id]);
        if (!lancamento) return res.status(404).json({ message: 'Lançamento não encontrado.' });
        if (lancamento.Status === 'PAGO') return res.status(400).json({ message: 'Já está pago.' });

        // Usa a data enviada ou hoje
        const dataPag = DataPagamento || new Date().toISOString();
        // Usa o valor recebido ou o valor original
        const valorFinal = ValorRecebido || lancamento.Valor;

        // Atualiza o lançamento para PAGO
        await dbRun('UPDATE Lancamentos SET Status = ?, DataPagamento = ?, Valor = ? WHERE id = ?', 
            ['PAGO', dataPag, valorFinal, id]);

        // Atualiza o Saldo da Conta Selecionada
        if (ContaCaixaID) {
            const operador = lancamento.Tipo === 'RECEITA' ? '+' : '-';
            await dbRun(`UPDATE ContasCaixa SET Saldo = Saldo ${operador} ? WHERE id = ?`, [valorFinal, ContaCaixaID]);
        }
        res.json({ message: 'Baixa realizada com sucesso.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const excluirLancamento = async (req, res) => {
    const { id } = req.params;
    try {
        const lanc = await dbGet('SELECT * FROM Lancamentos WHERE id = ?', [id]);
        if (lanc && lanc.Status === 'PAGO' && lanc.ContaCaixaID) {
            const operadorInverso = lanc.Tipo === 'RECEITA' ? '-' : '+';
            await dbRun(`UPDATE ContasCaixa SET Saldo = Saldo ${operadorInverso} ? WHERE id = ?`, [lanc.Valor, lanc.ContaCaixaID]);
        }
        await dbRun('DELETE FROM Lancamentos WHERE id = ?', [id]);
        res.json({ message: 'Lançamento excluído.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// --- 4. Dashboard e Relatórios ---
const getDashboardResumo = async (req, res) => {
    try {
        const saldoTotal = await dbGet('SELECT SUM(Saldo) as total FROM ContasCaixa');
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

        const entradas = await dbGet("SELECT SUM(Valor) as total FROM Lancamentos WHERE Tipo='RECEITA' AND Status='PAGO' AND date(DataPagamento) BETWEEN ? AND ?", [inicioMes, fimMes]);
        const saidas = await dbGet("SELECT SUM(Valor) as total FROM Lancamentos WHERE Tipo='DESPESA' AND Status='PAGO' AND date(DataPagamento) BETWEEN ? AND ?", [inicioMes, fimMes]);
        const vencidos = await dbGet("SELECT SUM(Valor) as total FROM Lancamentos WHERE Tipo='RECEITA' AND Status='PENDENTE' AND date(DataVencimento) < date('now')");

        res.json({
            SaldoAtualTotal: saldoTotal?.total || 0,
            EntradasMes: entradas?.total || 0,
            SaidasMes: saidas?.total || 0,
            AReceberVencido: vencidos?.total || 0
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMovimentoCaixa = async (req, res) => {
    const { data_inicio, data_fim } = req.query;
    try {
        const sql = `
            SELECT l.*, c.Nome as CategoriaNome, cc.Nome as ContaNome 
            FROM Lancamentos l
            LEFT JOIN CategoriasFinanceiras c ON l.CategoriaID = c.id
            LEFT JOIN ContasCaixa cc ON l.ContaCaixaID = cc.id
            WHERE l.Status = 'PAGO' 
            AND date(l.DataPagamento) BETWEEN date(?) AND date(?)
            ORDER BY l.DataPagamento DESC
        `;
        const movimentos = await dbAll(sql, [data_inicio, data_fim]);
        res.json(movimentos);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const getRelatorioDRE = async (req, res) => {
    const { data_inicio, data_fim } = req.query;
    try {
        const sqlProd = `SELECT SUM(iv.quantidade * iv.valor_unitario) as total FROM Itens_Venda iv JOIN Vendas v ON iv.venda_id = v.id WHERE date(v.data) BETWEEN date(?) AND date(?)`;
        const rProd = await dbGet(sqlProd, [data_inicio, data_fim]);
        const receitaProdutos = rProd?.total || 0;

        const sqlServ = `SELECT SUM(sv.valor * sv.quantidade) as total FROM Servicos_Venda sv JOIN Vendas v ON sv.venda_id = v.id WHERE date(v.data) BETWEEN date(?) AND date(?)`;
        const rServ = await dbGet(sqlServ, [data_inicio, data_fim]);
        const receitaServicos = rServ?.total || 0;

        const sqlCMV = `SELECT SUM(iv.quantidade * p.valor_custo) as total FROM Itens_Venda iv JOIN Vendas v ON iv.venda_id = v.id JOIN Produtos p ON iv.produto_id = p.id WHERE date(v.data) BETWEEN date(?) AND date(?)`;
        const c = await dbGet(sqlCMV, [data_inicio, data_fim]);
        const TotalCMV = c?.total || 0;

        const sqlCatDespesas = `SELECT c.Nome as categoria, SUM(l.Valor) as total FROM Lancamentos l JOIN CategoriasFinanceiras c ON l.CategoriaID = c.id WHERE l.Tipo='DESPESA' AND l.Status='PAGO' AND date(l.DataPagamento) BETWEEN date(?) AND date(?) GROUP BY c.Nome`;
        const listaDespesas = await dbAll(sqlCatDespesas, [data_inicio, data_fim]);
        const TotalDespesas = listaDespesas.reduce((acc, curr) => acc + curr.total, 0);

        const TotalReceitas = receitaProdutos + receitaServicos;
        const LucroBruto = TotalReceitas - TotalCMV;
        const LucroLiquido = LucroBruto - TotalDespesas;

        res.json({
            TotalReceitas, TotalCMV, LucroBruto, TotalDespesas, LucroLiquido,
            Receitas: [{ categoria: 'Venda de Produtos', total: receitaProdutos }, { categoria: 'Venda de Serviços', total: receitaServicos }],
            Despesas: listaDespesas
        });
    } catch (err) { res.status(500).json({ message: "Erro DRE: " + err.message }); }
};

// --- 5. Contas a Receber (CORRIGIDO: NOMES QUE O FRONT ESPERA) ---
const getContasAReceberResumo = async (req, res) => {
    try {
        const total = await dbGet("SELECT SUM(Valor) as total FROM Lancamentos WHERE Tipo='RECEITA' AND Status='PENDENTE'");
        const vencido = await dbGet("SELECT SUM(Valor) as total FROM Lancamentos WHERE Tipo='RECEITA' AND Status='PENDENTE' AND date(DataVencimento) < date('now', 'localtime')");
        const hoje = await dbGet("SELECT SUM(Valor) as total FROM Lancamentos WHERE Tipo='RECEITA' AND Status='PENDENTE' AND date(DataVencimento) = date('now', 'localtime')");

        // AQUI ESTAVA O ERRO: Mudamos os nomes das chaves para bater com o gestao_contas_receber.js
        res.json({
            TotalAReceber: total?.total || 0,
            TotalVencido: vencido?.total || 0,
            ReceberHoje: hoje?.total || 0
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const listarContasAReceber = async (req, res) => {
    try {
        const sql = `SELECT l.*, c.nome as NomeCliente, c.nome as ClienteNome FROM Lancamentos l LEFT JOIN Clientes c ON l.ClienteID = c.id WHERE l.Tipo = 'RECEITA' AND l.Status = 'PENDENTE' ORDER BY l.DataVencimento ASC`;
        const contas = await dbAll(sql);
        res.json(contas);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// --- 6. Contas a Pagar ---
const obterResumoContasPagar = async (req, res) => {
    try {
        const total = await dbGet("SELECT SUM(Valor) as total FROM Lancamentos WHERE Tipo='DESPESA' AND Status='PENDENTE'");
        const vencido = await dbGet("SELECT SUM(Valor) as total FROM Lancamentos WHERE Tipo='DESPESA' AND Status='PENDENTE' AND date(DataVencimento) < date('now', 'localtime')");
        res.json({ TotalAPagar: total?.total || 0, TotalVencido: vencido?.total || 0 });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const listarContasAPagar = async (req, res) => {
    try {
        const sql = `SELECT * FROM Lancamentos WHERE Tipo = 'DESPESA' AND Status = 'PENDENTE' ORDER BY DataVencimento ASC`;
        const contas = await dbAll(sql);
        res.json(contas);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
    listarContas, criarConta, removerConta,
    listarFormasPagamento, listarCategorias,
    criarLancamento, baixarLancamento, excluirLancamento,
    getDashboardResumo, getMovimentoCaixa, getRelatorioDRE,
    getContasAReceberResumo, listarContasAReceber, obterResumoContasPagar, listarContasAPagar
};