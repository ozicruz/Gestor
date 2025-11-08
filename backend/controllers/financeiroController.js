// backend/controllers/financeiroController.js
const FinanceiroModel = require('../models/financeiroModel');
const { dbRun } = require('../database/database'); // Importamos dbRun para transações

// --- Controladores de Listas ---

const listarCategorias = async (req, res) => {
    try {
        const tipo = req.query.tipo;
        const categorias = await FinanceiroModel.getCategorias(tipo);
        res.status(200).json(categorias);
    } catch (error) {
        console.error("Erro ao buscar categorias:", error);
        res.status(500).json({ message: "Erro interno ao buscar categorias." });
    }
};

const listarContasCaixa = async (req, res) => {
    try {
        const contas = await FinanceiroModel.getContasCaixa();
        res.status(200).json(contas);
    } catch (error) {
        console.error("Erro ao buscar contas/caixa:", error);
        res.status(500).json({ message: "Erro interno ao buscar contas." });
    }
};

// --- Controladores do Dashboard ---

const getDashboardResumo = async (req, res) => {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

        // Executa todas as consultas em paralelo
        const [
            saldoResult,
            entradasResult,
            saidasResult,
            vencidoResult,
            pagarHojeResult
        ] = await Promise.all([
            FinanceiroModel.getSaldoAtual(),
            FinanceiroModel.getEntradasMes(inicioMes, fimMes),
            FinanceiroModel.getSaidasMes(inicioMes, fimMes),
            FinanceiroModel.getReceberVencido(hoje),
            FinanceiroModel.getPagarHoje(hoje)
        ]);

        const resumo = {
            SaldoAtualTotal: saldoResult.SaldoAtualTotal,
            EntradasMes: entradasResult.EntradasMes,
            SaidasMes: saidasResult.SaidasMes,
            ContasReceberVencido: vencidoResult.ContasReceberVencido,
            ContasPagarHoje: pagarHojeResult.ContasPagarHoje
        };
        res.status(200).json(resumo);
    } catch (error) {
        console.error("Erro ao buscar resumo do dashboard:", error);
        res.status(500).json({ message: "Erro interno ao buscar resumo." });
    }
};

const getMovimentoCaixa = async (req, res) => {
    try {
        const { data_inicio, data_fim, conta_id } = req.query;
        const movimentos = await FinanceiroModel.getMovimentoCaixa(data_inicio, data_fim, conta_id);
        res.status(200).json(movimentos);
    } catch (error) {
        console.error("Erro ao buscar movimento de caixa:", error);
        res.status(500).json({ message: "Erro interno ao buscar movimentos." });
    }
};

// --- Controlador de Lançamento Manual ---

const criarLancamentoManual = async (req, res) => {
    try {
        const { Descricao, Valor, Tipo, DataPagamento, CategoriaID, ContaCaixaID } = req.body;
        if (!Descricao || !Valor || !Tipo || !DataPagamento || !CategoriaID || !ContaCaixaID) {
            return res.status(400).json({ message: "Todos os campos são obrigatórios." });
        }

        const novoLancamento = {
            Descricao, Valor, Tipo, DataPagamento, CategoriaID, ContaCaixaID,
            Status: 'PAGO', // Lançamentos manuais já entram como pagos
            DataVencimento: DataPagamento, // DataVenc = DataPagamento
            ClienteID: null,
            VendaID: null
        };

        const result = await FinanceiroModel.createLancamento(novoLancamento);
        res.status(201).json({ id: result.id, ...novoLancamento });
    } catch (error) {
        console.error("Erro ao criar lançamento:", error);
        res.status(500).json({ message: "Erro interno ao criar lançamento." });
    }
};

// --- Controladores de Contas a Receber ---

const getContasAReceberResumo = async (req, res) => {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        
        const [totalResult, vencidoResult, hojeResult] = await Promise.all([
            FinanceiroModel.getTotalAReceber(),
            FinanceiroModel.getTotalVencido(hoje),
            FinanceiroModel.getReceberHoje(hoje)
        ]);

        res.status(200).json({
            TotalAReceber: totalResult.TotalAReceber,
            TotalVencido: vencidoResult.TotalVencido,
            ReceberHoje: hojeResult.ReceberHoje
        });
    } catch (error) {
        console.error("Erro ao buscar resumo de contas a receber:", error);
        res.status(500).json({ message: "Erro interno ao buscar resumo." });
    }
};

const listarContasAReceber = async (req, res) => {
    try {
        const filtros = { ...req.query, hoje: new Date().toISOString().split('T')[0] };
        const pendencias = await FinanceiroModel.getContasAReceber(filtros);
        res.status(200).json(pendencias);
    } catch (error) {
        console.error("Erro ao buscar contas a receber:", error);
        res.status(500).json({ message: "Erro interno ao buscar pendências." });
    }
};

// --- O Controlador de Baixa (com Transação) ---

const baixarLancamento = async (req, res) => {
    const { id } = req.params;
    const { ValorRecebido, DataPagamento, ContaCaixaID } = req.body;

    try {
        // 1. Inicia a Transação
        await dbRun('BEGIN TRANSACTION');

        const dividaOriginal = await FinanceiroModel.findLancamentoPendenteById(id);
        if (!dividaOriginal) {
            await dbRun('ROLLBACK');
            return res.status(404).json({ message: "Dívida não encontrada ou já paga." });
        }

        const valorOriginal = parseFloat(dividaOriginal.Valor);
        const valorRecebidoFloat = parseFloat(ValorRecebido);

        if (valorRecebidoFloat > valorOriginal) {
            await dbRun('ROLLBACK');
            return res.status(400).json({ message: "O valor recebido não pode ser maior que o valor da dívida." });
        }

        // Cenário 1: Pagamento TOTAL
        if (valorRecebidoFloat === valorOriginal) {
            await FinanceiroModel.updateLancamentoParaPago(id, DataPagamento, ContaCaixaID);
        } 
        // Cenário 2: Pagamento PARCIAL (Amortização)
        else {
            // A. Atualiza a dívida original
            const novoValorPendente = valorOriginal - valorRecebidoFloat;
            await FinanceiroModel.updateLancamentoValorPendente(id, novoValorPendente);
            
            // B. Cria um novo lançamento PAGO com o valor recebido
            const lancamentoPago = {
                Descricao: `Pagto parcial ref. Lançamento #${id}`,
                Valor: valorRecebidoFloat,
                Tipo: 'RECEITA',
                Status: 'PAGO',
                DataPagamento: DataPagamento,
                DataVencimento: DataPagamento,
                CategoriaID: dividaOriginal.CategoriaID,
                ContaCaixaID: ContaCaixaID,
                ClienteID: dividaOriginal.ClienteID,
                VendaID: dividaOriginal.VendaID
            };
            await FinanceiroModel.createLancamento(lancamentoPago);
        }

        // 2. Confirma a Transação
        await dbRun('COMMIT');
        res.status(200).json({ message: "Pagamento registrado com sucesso!" });

    } catch (error) {
        // 3. Desfaz a Transação em caso de erro
        await dbRun('ROLLBACK');
        console.error("Erro ao dar baixa em pagamento:", error);
        res.status(500).json({ message: "Erro interno ao processar pagamento." });
    }
};

// --- Controlador de Relatórios ---

const getRelatorioDRE = async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query;
        if (!data_inicio || !data_fim) {
            return res.status(400).json({ message: "As datas de início e fim são obrigatórias." });
        }

        const grupos = await FinanceiroModel.getDRE(data_inicio, data_fim);

        let TotalReceitas = 0, TotalDespesas = 0;
        const ReceitasDetalhadas = [], DespesasDetalhadas = [];

        for (const grupo of grupos) {
            const total = parseFloat(grupo.TotalPorCategoria);
            if (grupo.Tipo === 'RECEITA') {
                ReceitasDetalhadas.push({ categoria: grupo.CategoriaNome, total: total });
                TotalReceitas += total;
            } else {
                DespesasDetalhadas.push({ categoria: grupo.CategoriaNome, total: total });
                TotalDespesas += total;
            }
        }

        const dre = {
            TotalReceitas, TotalDespesas,
            LucroPrejuizo: TotalReceitas - TotalDespesas,
            Receitas: ReceitasDetalhadas,
            Despesas: DespesasDetalhadas
        };
        res.status(200).json(dre);
    } catch (error) {
        console.error("Erro ao gerar DRE:", error);
        res.status(500).json({ message: "Erro interno ao gerar relatório." });
    }
};

module.exports = {
    listarCategorias,
    listarContasCaixa,
    getDashboardResumo,
    getMovimentoCaixa,
    criarLancamentoManual,
    getContasAReceberResumo,
    listarContasAReceber,
    baixarLancamento,
    getRelatorioDRE
};