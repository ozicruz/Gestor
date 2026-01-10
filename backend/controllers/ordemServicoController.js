const { dbRun, dbGet, dbAll } = require('../database/database');

const listarOS = async (req, res) => {
    try {
        const sql = `
            SELECT os.*, 
                   c.nome as cliente_nome, 
                   v.placa, v.modelo, v.marca, 
                   u.nome as mecanico_nome,
                   (COALESCE((SELECT SUM(quantidade * valor_unitario) FROM Itens_OS WHERE os_id = os.id), 0) + 
                    COALESCE((SELECT SUM(quantidade * valor) FROM Servicos_OS WHERE os_id = os.id), 0)) as total_calculado
            FROM Ordens_Servico os
            LEFT JOIN Veiculos v ON os.veiculo_id = v.id
            LEFT JOIN Clientes c ON v.cliente_id = c.id
            LEFT JOIN Usuarios u ON os.mecanico_id = u.id
            ORDER BY os.id DESC
        `;
        const ordens = await dbAll(sql);
        res.json(ordens);
    } catch (err) { res.status(500).json({ message: 'Erro ao buscar OS.', error: err.message }); }
};

const criarOrdemServico = async (req, res) => {
    try {
        const { placa } = req.body;
        if (!placa) return res.status(400).json({ message: 'Placa obrigatória.' });

        const veiculo = await dbGet('SELECT id, cliente_id FROM Veiculos WHERE placa = ?', [placa]);
        
        if (!veiculo) {
            return res.status(404).json({ message: 'Veículo não encontrado. Cadastre-o primeiro.' });
        }

        const result = await dbRun(`
            INSERT INTO Ordens_Servico 
            (veiculo_id, data_entrada, status, total, problema_relatado, diagnostico_tecnico) 
            VALUES (?, datetime("now", "localtime"), ?, ?, ?, ?)
        `, [veiculo.id, 'Orçamento', 0, '', '']);

        res.status(201).json({ id: result.id, message: 'OS Criada.' });

    } catch (err) { 
        console.error("Erro Criar OS:", err);
        res.status(500).json({ message: 'Erro ao criar OS.', error: err.message }); 
    }
};

const buscarOSPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        const os = await dbGet(`
            SELECT os.*, 
                   v.cliente_id, 
                   c.nome as cliente_nome, 
                   v.placa, v.modelo, v.marca, 
                   u.nome as mecanico_nome
            FROM Ordens_Servico os
            LEFT JOIN Veiculos v ON os.veiculo_id = v.id
            LEFT JOIN Clientes c ON v.cliente_id = c.id
            LEFT JOIN Usuarios u ON os.mecanico_id = u.id
            WHERE os.id = ?
        `, [id]);

        if (!os) return res.status(404).json({ message: 'OS não encontrada.' });

        const itens = await dbAll(`
            SELECT ios.*, p.nome as nome_produto 
            FROM Itens_OS ios 
            LEFT JOIN Produtos p ON ios.produto_id = p.id 
            WHERE ios.os_id = ?`, [id]);
            
        const servicos = await dbAll(`
            SELECT sos.*, s.nome 
            FROM Servicos_OS sos 
            LEFT JOIN Servicos s ON sos.servico_id = s.id 
            WHERE sos.os_id = ?`, [id]);

        const totalItens = (itens || []).reduce((acc, i) => acc + (i.quantidade * i.valor_unitario), 0);
        const totalServicos = (servicos || []).reduce((acc, s) => acc + (s.quantidade * s.valor), 0);
        os.total = totalItens + totalServicos;

        res.json({ ...os, itens, servicos });
    } catch (err) { res.status(500).json({ message: 'Erro ao buscar OS.', error: err.message }); }
};

// --- FUNÇÃO ATUALIZAR CORRIGIDA (TRAVA DE SEGURANÇA + HISTÓRICO CORRETO) ---
const atualizarOrdemServico = async (req, res) => {
    const { id } = req.params;
    const { status, problema_relatado, diagnostico_tecnico, itens, servicos, mecanico_id } = req.body;

    try {
        await dbRun('BEGIN TRANSACTION');

        const osAtual = await dbGet('SELECT status FROM Ordens_Servico WHERE id = ?', [id]);
        if (!osAtual) throw new Error("OS não encontrada");

        // Regra de Estoque: Só considera 'Baixado' se estiver sendo trabalhado ou finalizado
        // 'Aprovada' e 'Aguardando peças' NÃO baixam estoque (pois o carro não está sendo montado)
        const statusBaixaEstoque = ['Em andamento', 'Pronto', 'Finalizada', 'Faturada'];
        
        const estavaBaixado = statusBaixaEstoque.includes(osAtual.status);
        const vaiFicarBaixado = statusBaixaEstoque.includes(status);

        // 1. DEVOLUÇÃO (Se estava baixado e agora não vai estar, ou para recalcular)
        if (estavaBaixado) {
            const itensAntigos = await dbAll('SELECT * FROM Itens_OS WHERE os_id = ?', [id]);
            for (const item of itensAntigos) {
                if (item.produto_id) {
                    await dbRun('UPDATE Produtos SET quantidade_em_estoque = quantidade_em_estoque + ? WHERE id = ?', [item.quantidade, item.produto_id]);
                    // Log de devolução
                    await dbRun(`INSERT INTO MovimentacoesEstoque (produto_id, quantidade, tipo, observacao) VALUES (?, ?, 'ENTRADA', ?)`, [item.produto_id, item.quantidade, `Retorno OS #${id} (${status})`]);
                }
            }
        }

        // 2. ATUALIZA DADOS DA OS
        await dbRun(`
            UPDATE Ordens_Servico 
            SET status = ?, problema_relatado = ?, diagnostico_tecnico = ?, mecanico_id = ?
            WHERE id = ?
        `, [status, problema_relatado, diagnostico_tecnico, mecanico_id || null, id]);

        // Limpa itens antigos para recriar
        await dbRun('DELETE FROM Itens_OS WHERE os_id = ?', [id]);
        await dbRun('DELETE FROM Servicos_OS WHERE os_id = ?', [id]);

        let novoTotal = 0;

        // 3. INSERE NOVOS ITENS E BAIXA ESTOQUE (Se o status exigir)
        if (itens) {
            for (const item of itens) {
                const qtd = parseFloat(item.quantidade);
                const valUnit = parseFloat(item.valor_unitario);
                
                await dbRun(`INSERT INTO Itens_OS (os_id, produto_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)`, 
                    [id, item.produto_id || null, qtd, valUnit]);
                
                novoTotal += (qtd * valUnit);

                if (vaiFicarBaixado && item.produto_id) {
                    await dbRun('UPDATE Produtos SET quantidade_em_estoque = quantidade_em_estoque - ? WHERE id = ?', [qtd, item.produto_id]);
                    await dbRun(`INSERT INTO MovimentacoesEstoque (produto_id, quantidade, tipo, observacao) VALUES (?, ?, 'SAIDA', ?)`, [item.produto_id, -qtd, `Saída OS #${id}`]);
                }
            }
        }

        if (servicos) {
            for (const serv of servicos) {
                const valServ = parseFloat(serv.valor || 0);
                const qtdServ = parseFloat(serv.quantidade || 1);
                await dbRun(`INSERT INTO Servicos_OS (os_id, servico_id, quantidade, valor) VALUES (?, ?, ?, ?)`, 
                    [id, serv.servico_id || null, qtdServ, valServ]);
                novoTotal += (qtdServ * valServ);
            }
        }

        await dbRun('UPDATE Ordens_Servico SET total = ? WHERE id = ?', [novoTotal, id]);
        await dbRun('COMMIT');
        
        res.json({ message: 'OS atualizada com sucesso.' });

    } catch (err) {
        await dbRun('ROLLBACK');
        console.error("Erro ao salvar OS:", err);
        res.status(500).json({ message: err.message || 'Erro ao atualizar OS.' });
    }
};

module.exports = { listarOS, criarOrdemServico, buscarOSPorId, atualizarOrdemServico };