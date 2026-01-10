const { dbAll, dbRun, dbGet } = require('../database/database');

const listarUsuarios = async (req, res) => {
    try {
        const usuarios = await dbAll('SELECT * FROM Usuarios');
        const usuariosFormatados = usuarios.map(u => ({
            ...u,
            permissoes: u.permissoes ? JSON.parse(u.permissoes) : []
        }));
        res.json(usuariosFormatados);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const criarUsuario = async (req, res) => {
    const { nome, login, senha, is_admin, permissoes, cargo, email, telefone, salario, comissao_produto, comissao_servico, data_admissao, status } = req.body;
    try {
        const existe = await dbGet('SELECT id FROM Usuarios WHERE login = ?', [login]);
        if (existe) return res.status(400).json({ message: "Login já existe." });
        const permissoesJson = JSON.stringify(permissoes || []);
        
        await dbRun(`INSERT INTO Usuarios 
            (nome, login, senha, is_admin, permissoes, cargo, email, telefone, salario, comissao_produto, comissao_servico, data_admissao, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nome, login, senha, is_admin ? 1 : 0, permissoesJson, cargo || '', email || '', telefone || '', salario || 0, comissao_produto || 0, comissao_servico || 0, data_admissao || null, status || 'ATIVO']);
        res.status(201).json({ message: "Usuário criado com sucesso." });
    } catch (err) { res.status(500).json({ message: "Erro ao criar usuário." }); }
};

const atualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const { nome, login, senha, is_admin, permissoes, cargo, email, telefone, salario, comissao_produto, comissao_servico, data_admissao, status } = req.body;
    try {
        const permissoesJson = JSON.stringify(permissoes || []);
        let sql = `UPDATE Usuarios SET nome=?, login=?, is_admin=?, permissoes=?, cargo=?, email=?, telefone=?, salario=?, comissao_produto=?, comissao_servico=?, data_admissao=?, status=?`;
        let params = [nome, login, is_admin ? 1 : 0, permissoesJson, cargo, email, telefone, salario, comissao_produto, comissao_servico, data_admissao, status];

        if (senha && senha.trim() !== "") { sql += `, senha=?`; params.push(senha); }
        sql += ` WHERE id=?`; params.push(id);

        await dbRun(sql, params);
        res.json({ message: "Usuário atualizado." });
    } catch (err) { res.status(500).json({ message: "Erro ao atualizar." }); }
};

const removerUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await dbGet('SELECT login FROM Usuarios WHERE id = ?', [id]);
        if(user && user.login === 'admin') return res.status(400).json({ message: "Não é possível apagar o Admin Principal." });
        await dbRun('DELETE FROM Usuarios WHERE id = ?', [id]);
        res.json({ message: "Usuário removido." });
    } catch (err) { res.status(500).json({ message: "Erro ao remover." }); }
};

const autenticar = async (req, res) => {
    const { login, senha } = req.body;
    try {
        const user = await dbGet('SELECT * FROM Usuarios WHERE login = ? AND senha = ?', [login, senha]);
        if (user) {
            res.json({ sucesso: true, usuario: { id: user.id, nome: user.nome, is_admin: user.is_admin, permissoes: JSON.parse(user.permissoes || '[]') } });
        } else {
            res.status(401).json({ sucesso: false, message: "Login ou senha inválidos." });
        }
    } catch (err) { res.status(500).json({ message: "Erro no servidor." }); }
};

// --- GERAR FOLHA (COM PREVIEW E CONFIRMAÇÃO) ---
const gerarFolhaPagamento = async (req, res) => {
    const { data_inicio, data_fim, conta_caixa_id, data_pagamento, status_lancamento, preview } = req.body;
    
    try {
        if (!data_inicio || !data_fim) return res.status(400).json({ message: "Período obrigatório." });

        let catSalario = await dbGet("SELECT id FROM CategoriasFinanceiras WHERE Nome = 'Salários'");
        if (!catSalario) {
            const result = await dbRun("INSERT INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Salários', 'DESPESA')");
            catSalario = { id: result.id };
        }

        const usuarios = await dbAll("SELECT * FROM Usuarios WHERE status = 'ATIVO'");
        let resumoFolha = [];
        let totalGeral = 0;

        for (const user of usuarios) {
            const salarioFixo = user.salario || 0;
            let comissaoProdTotal = 0;
            let comissaoServTotal = 0;
            let totalVendasProd = 0;
            let totalVendasServ = 0;

            // Comissão Produtos
            if (user.comissao_produto > 0) {
                const sqlProd = `
                    SELECT SUM(iv.quantidade * iv.valor_unitario) as total
                    FROM Itens_Venda iv
                    JOIN Vendas v ON iv.venda_id = v.id
                    WHERE v.vendedor_id = ? AND date(v.data) BETWEEN date(?) AND date(?)
                `;
                const resProd = await dbGet(sqlProd, [user.id, data_inicio, data_fim]);
                totalVendasProd = resProd.total || 0;
                comissaoProdTotal = (totalVendasProd * user.comissao_produto) / 100;
            }

            // Comissão Serviços
            if (user.comissao_servico > 0) {
                const sqlServ = `
                    SELECT SUM(sv.quantidade * sv.valor) as total
                    FROM Servicos_Venda sv
                    JOIN Vendas v ON sv.venda_id = v.id
                    WHERE v.vendedor_id = ? AND date(v.data) BETWEEN date(?) AND date(?)
                `;
                const resServ = await dbGet(sqlServ, [user.id, data_inicio, data_fim]);
                totalVendasServ = resServ.total || 0;
                comissaoServTotal = (totalVendasServ * user.comissao_servico) / 100;
            }

            const totalPagar = salarioFixo + comissaoProdTotal + comissaoServTotal;

            if (totalPagar > 0) {
                resumoFolha.push({
                    id: user.id,
                    nome: user.nome,
                    fixo: salarioFixo,
                    vendas_prod: totalVendasProd,
                    comissao_prod: comissaoProdTotal,
                    vendas_serv: totalVendasServ,
                    comissao_serv: comissaoServTotal,
                    total: totalPagar
                });
                totalGeral += totalPagar;
            }
        }

        // SE FOR PREVIEW, RETORNA OS DADOS SEM SALVAR
        if (preview) {
            return res.json({
                preview: true,
                resumo: resumoFolha,
                total_geral: totalGeral
            });
        }

        // SE NÃO FOR PREVIEW, GRAVA NO BANCO
        let gravados = 0;
        for (const item of resumoFolha) {
            const dI = data_inicio.split('-').reverse().join('/');
            const dF = data_fim.split('-').reverse().join('/');
            const desc = `Pagto (${dI} a ${dF}) - ${item.nome}`;
            
            await dbRun(`
                INSERT INTO Lancamentos (Descricao, Valor, Tipo, Status, DataVencimento, DataPagamento, CategoriaID, ContaCaixaID)
                VALUES (?, ?, 'DESPESA', ?, ?, ?, ?, ?)
            `, [
                desc, item.total, status_lancamento || 'PENDENTE',
                data_pagamento, status_lancamento === 'PAGO' ? data_pagamento : null,
                catSalario.id, conta_caixa_id || null
            ]);

            if (status_lancamento === 'PAGO' && conta_caixa_id) {
                await dbRun('UPDATE ContasCaixa SET Saldo = Saldo - ? WHERE id = ?', [item.total, conta_caixa_id]);
            }
            gravados++;
        }

        res.json({ 
            message: `Folha processada! ${gravados} pagamentos gerados.`,
            detalhes: resumoFolha.map(i => `${i.nome}: R$ ${i.total.toFixed(2)}`)
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao gerar folha.", error: err.message });
    }
};

module.exports = { listarUsuarios, criarUsuario, atualizarUsuario, removerUsuario, autenticar, gerarFolhaPagamento };