const FinanceiroModel = require('../models/financeiroModel');
const { dbAll, dbRun } = require('../database/database');

// --- 1. CONTAS E CAIXAS (Lógica SQL Direta - A que funciona) ---

const listarContas = async (req, res) => {
    try {
        // Busca direta no banco, sem depender do Model antigo
        const contas = await dbAll('SELECT * FROM ContasCaixa');
        res.json(contas);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar contas.', error: error.message });
    }
};

const criarConta = async (req, res) => {
    const { nome, saldoInicial } = req.body;
    try {
        const sql = 'INSERT INTO ContasCaixa (Nome, SaldoInicial, Saldo) VALUES (?, ?, ?)';
        await dbRun(sql, [nome, saldoInicial || 0, saldoInicial || 0]);
        res.status(201).json({ message: 'Conta criada com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar conta.', error: error.message });
    }
};

const removerConta = async (req, res) => {
    const { id } = req.params;
    try {
        if (id == 1) { 
            return res.status(400).json({ message: 'Não é possível remover o Caixa Principal.' });
        }
        await dbRun('DELETE FROM ContasCaixa WHERE id = ?', [id]);
        res.json({ message: 'Conta removida.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover conta.', error: error.message });
    }
};

// --- 2. OUTRAS LISTAGENS ---

const listarFormasPagamento = async (req, res) => {
    try { res.json(await FinanceiroModel.getFormasPagamento()); } 
    catch (e) { res.status(500).json({ message: "Erro ao buscar formas." }); }
};

const listarCategorias = async (req, res) => {
    try { res.json(await FinanceiroModel.getCategorias(req.query.tipo)); } 
    catch (e) { res.status(500).json({ message: "Erro ao buscar categorias." }); }
};

// --- 3. LANÇAMENTOS E BAIXAS ---

const criarLancamento = async (req, res) => {
    try {
        const { Descricao, Valor, Tipo, Status, ContaCaixaID, CategoriaID } = req.body;

        if (!Descricao || !Valor || !Tipo) {
            return res.status(400).json({ message: 'Campos obrigatórios: Descrição, Valor e Tipo.' });
        }

        // Sanitização: Garante que IDs vazios virem NULL e números sejam números
        const dadosLimpos = {
            ...req.body,
            ContaCaixaID: ContaCaixaID ? Number(ContaCaixaID) : null,
            CategoriaID: CategoriaID ? Number(CategoriaID) : null,
            Valor: parseFloat(Valor)
        };

        const result = await FinanceiroModel.createLancamento(dadosLimpos);

        // Lógica de Atualização de Saldo
        // Se for PAGO (ou status não informado, assume-se pago na criação rápida) e tiver conta vinculada
        if ((Status === 'PAGO' || !Status) && dadosLimpos.ContaCaixaID) {
            let valorEffect = dadosLimpos.Valor;
            if (Tipo === 'DESPESA') valorEffect = valorEffect * -1;
            await dbRun('UPDATE ContasCaixa SET Saldo = Saldo + ? WHERE id = ?', [valorEffect, dadosLimpos.ContaCaixaID]);
        }

        res.status(201).json({ id: result.id, message: 'Lançamento criado com sucesso.' });

    } catch (err) {
        console.error('Erro ao criar lançamento:', err);
        res.status(500).json({ message: 'Erro ao salvar lançamento.', error: err.message });
    }
};

const baixarLancamento = async (req, res) => {
    const { id } = req.params;
    const { ValorRecebido, DataPagamento, ContaCaixaID, FormaPagamentoID } = req.body;

    try {
        await dbRun('BEGIN TRANSACTION');

        const dividaOriginal = await FinanceiroModel.findLancamentoPendenteById(id);
        if (!dividaOriginal) {
            await dbRun('ROLLBACK');
            return res.status(404).json({ message: "Dívida não encontrada ou já paga." });
        }

        // --- PROTEÇÃO NOVA: Valor Padrão e Validação ---
        // Se não vier valor, assume que é o valor total da dívida
        let valorRecebidoFloat = ValorRecebido ? parseFloat(ValorRecebido) : parseFloat(dividaOriginal.Valor);

        if (isNaN(valorRecebidoFloat) || valorRecebidoFloat <= 0) {
            await dbRun('ROLLBACK');
            return res.status(400).json({ message: "O valor do pagamento deve ser maior que zero." });
        }
        
        if (!FormaPagamentoID || !ContaCaixaID) {
            await dbRun('ROLLBACK');
            return res.status(400).json({ message: "Selecione a Conta (Caixa) e a Forma de Pagamento." });
        }
        // ------------------------------------------------

        const valorOriginal = parseFloat(dividaOriginal.Valor);

        // Arredondamento para evitar problemas com dizimas (ex: 99.99999)
        const diff = Math.abs(valorOriginal - valorRecebidoFloat);

        if (diff < 0.01) { 
            // Pagamento TOTAL (se a diferença for menor que 1 centavo)
            await FinanceiroModel.updateLancamentoParaPago(id, DataPagamento, ContaCaixaID, FormaPagamentoID);
        } else if (valorRecebidoFloat < valorOriginal) {
            // Pagamento PARCIAL
            const novoValorPendente = valorOriginal - valorRecebidoFloat;
            await FinanceiroModel.updateLancamentoValorPendente(id, novoValorPendente);
            
            const lancamentoPago = {
                Descricao: `Pagto parcial ref. #${id} - ${dividaOriginal.Descricao}`,
                Valor: valorRecebidoFloat,
                Tipo: dividaOriginal.Tipo, 
                Status: 'PAGO',
                DataPagamento: DataPagamento,
                DataVencimento: DataPagamento, // Vencimento vira a data do pagamento
                CategoriaID: dividaOriginal.CategoriaID,
                ContaCaixaID: ContaCaixaID,
                ClienteID: dividaOriginal.ClienteID,
                VendaID: dividaOriginal.VendaID,
                FormaPagamentoID: FormaPagamentoID
            };
            await FinanceiroModel.createLancamento(lancamentoPago);
        } else {
            await dbRun('ROLLBACK');
            return res.status(400).json({ message: "O valor pago não pode ser maior que a dívida." });
        }

        // Atualiza o Saldo da Conta Caixa
        let valorEffect = valorRecebidoFloat;
        if (dividaOriginal.Tipo === 'DESPESA') valorEffect = valorEffect * -1;
        await dbRun('UPDATE ContasCaixa SET Saldo = Saldo + ? WHERE id = ?', [valorEffect, ContaCaixaID]);

        await dbRun('COMMIT');
        res.json({ message: "Baixa realizada com sucesso!" });

    } catch (error) {
        await dbRun('ROLLBACK');
        console.error("Erro ao baixar:", error);
        res.status(500).json({ message: "Erro ao processar baixa.", error: error.message });
    }
};

const excluirLancamento = async (req, res) => {
    try {
        const { id } = req.params;
        await FinanceiroModel.deleteLancamento(id);
        res.json({ message: 'Lançamento excluído com sucesso.' });
    } catch (err) {
        console.error("Erro ao excluir:", err);
        res.status(500).json({ message: 'Erro ao excluir lançamento.' });
    }
};

// --- 4. RELATÓRIOS E DASHBOARD ---

const getDashboardResumo = async (req, res) => {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

        const [saldoResult, entradasResult, saidasResult, vencidoResult, pagarHojeResult] = await Promise.all([
            FinanceiroModel.getSaldoAtual(),
            FinanceiroModel.getEntradasMes(inicioMes, fimMes),
            FinanceiroModel.getSaidasMes(inicioMes, fimMes),
            FinanceiroModel.getReceberVencido(hoje),
            FinanceiroModel.getPagarHoje(hoje)
        ]);

        const resumo = {
            SaldoAtualTotal: Number(saldoResult?.SaldoAtualTotal) || 0,
            EntradasMes: Number(entradasResult?.EntradasMes) || 0,
            SaidasMes: Number(saidasResult?.SaidasMes) || 0,
            ContasReceberVencido: Number(vencidoResult?.ContasReceberVencido) || 0,
            ContasPagarHoje: Number(pagarHojeResult?.ContasPagarHoje) || 0
        };
        res.status(200).json(resumo);
    } catch (error) {
        res.status(500).json({ message: "Erro interno ao buscar resumo." });
    }
};

const getMovimentoCaixa = async (req, res) => {
    try {
        const { data_inicio, data_fim, conta_id } = req.query;
        res.json(await FinanceiroModel.getMovimentoCaixa(data_inicio, data_fim, conta_id));
    } catch (error) { res.status(500).json({ message: "Erro ao buscar movimentos." }); }
};

const getContasAReceberResumo = async (req, res) => {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        const [total, vencido, hojeVal] = await Promise.all([
            FinanceiroModel.getTotalAReceber(),
            FinanceiroModel.getTotalVencido(hoje),
            FinanceiroModel.getReceberHoje(hoje)
        ]);
        res.json({ TotalAReceber: total.TotalAReceber, TotalVencido: vencido.TotalVencido, ReceberHoje: hojeVal.ReceberHoje });
    } catch (error) { res.status(500).json({ message: "Erro no resumo receber." }); }
};

const listarContasAReceber = async (req, res) => {
    try {
        const filtros = { ...req.query, hoje: new Date().toISOString().split('T')[0] };
        res.json(await FinanceiroModel.getContasAReceber(filtros));
    } catch (error) { res.status(500).json({ message: "Erro ao buscar pendências." }); }
};

const listarContasAPagar = async (req, res) => {
    try { res.json(await FinanceiroModel.getContasAPagar()); } 
    catch (err) { res.status(500).json({ message: 'Erro ao buscar contas a pagar.' }); }
};

const obterResumoContasPagar = async (req, res) => {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        res.json(await FinanceiroModel.getResumoContasPagar(hoje));
    } catch (err) { res.status(500).json({ message: 'Erro ao buscar resumo.' }); }
};

const getRelatorioDRE = async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query;
        if (!data_inicio || !data_fim) return res.status(400).json({ message: "Datas obrigatórias." });

        const { grupos, totalCMV } = await FinanceiroModel.getDRE(data_inicio, data_fim);
        
        // Variáveis inicializadas
        let RecProdutos = 0;
        let RecServicos = 0;
        let RecOutras = 0;
        let DespTotal = 0;
        
        const RecDet = [], DespDet = [];

        // Loop corrigido para separar Serviços de Outras Receitas
        for (const g of grupos) {
            const val = parseFloat(g.TotalPorCategoria);
            if (g.Tipo === 'RECEITA') {
                if (g.CategoriaNome === 'Venda de Produtos') {
                    RecProdutos += val;
                } else if (g.CategoriaNome === 'Venda de Serviços') {
                    RecServicos += val; // Agora somamos serviços separadamente
                } else {
                    RecOutras += val;
                }
                RecDet.push({ categoria: g.CategoriaNome, total: val });
            } else {
                DespDet.push({ categoria: g.CategoriaNome, total: val });
                DespTotal += val;
            }
        }

        const TotalRec = RecProdutos + RecServicos + RecOutras;

        // CÁLCULO CORRETO: Lucro Bruto é a operação principal (Peças + Mão de Obra) menos o custo das peças
        const LucroBruto = (RecProdutos + RecServicos) - totalCMV;

        // Resultado Líquido: Lucro Bruto + Outras Receitas (ex: Rendimentos) - Despesas
        const LucroLiquido = (LucroBruto + RecOutras) - DespTotal;

        res.json({ 
            TotalReceitas: TotalRec, 
            TotalDespesas: DespTotal, 
            TotalCMV: totalCMV, 
            LucroBruto, 
            LucroLiquido, 
            Receitas: RecDet, 
            Despesas: DespDet 
        });

    } catch (error) { 
        console.error("Erro DRE:", error);
        res.status(500).json({ message: "Erro ao gerar DRE." }); 
    }
};

module.exports = {
    listarContas, // Esta é a função correta
    criarConta,
    removerConta,
    listarFormasPagamento,
    listarCategorias,
    criarLancamento,
    baixarLancamento,
    excluirLancamento,
    getDashboardResumo,
    getMovimentoCaixa,
    getContasAReceberResumo,
    listarContasAReceber,
    listarContasAPagar,
    obterResumoContasPagar,
    getRelatorioDRE
};