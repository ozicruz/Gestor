const { dbRun, dbGet, dbAll } = require('../database/database');
const OrdemServico = require('../models/ordemServicoModel');

const listarOS = async (req, res) => {
    try {
        const ordens = await OrdemServico.findAll();
        res.json(ordens);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar OS.', error: err.message });
    }
};

const criarOrdemServico = async (req, res) => {
    try {
        const { placa } = req.body;
        if (!placa) return res.status(400).json({ message: 'Placa obrigatória.' });

        const result = await OrdemServico.create(placa);
        // Ajuste aqui também para garantir, caso use result.id
        const novoId = result.id || result.lastID; 
        res.status(201).json({ id: novoId, message: 'OS criada.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao criar OS.', error: err.message });
    }
};

const buscarOSPorId = async (req, res) => {
    try {
        const os = await OrdemServico.findById(req.params.id);
        if (os) res.json(os);
        else res.status(404).json({ message: 'OS não encontrada.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar OS.', error: err.message });
    }
};

const atualizarOS = async (req, res) => {
    try {
        const { id } = req.params;
        
        // TRAVA DE SEGURANÇA
        const osAtual = await dbGet('SELECT status FROM Ordens_Servico WHERE id = ?', [id]);
        if (osAtual && (osAtual.status === 'Finalizada' || osAtual.status === 'Faturada')) {
            return res.status(403).json({ message: '⛔ AÇÃO NEGADA: OS já finalizada.' });
        }

        await OrdemServico.update(id, req.body);
        res.json({ message: 'OS atualizada com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar.', error: err.message });
    }
};

const gerarVendaDeOS = async (req, res) => {
    const { id } = req.params;

    // INICIA TRANSAÇÃO
    await dbRun('BEGIN TRANSACTION');

    try {
        const os = await OrdemServico.findById(id);
        if (!os) throw new Error('OS não encontrada.');

        if (os.status === 'Finalizada' || os.status === 'Faturada') {
            throw new Error('Esta OS já foi finalizada.');
        }

        const itensOS = await dbAll('SELECT * FROM Itens_OS WHERE os_id = ?', [id]);
        const servicosOS = await dbAll('SELECT * FROM Servicos_OS WHERE os_id = ?', [id]);

        if (itensOS.length === 0 && servicosOS.length === 0) {
            throw new Error('A OS está vazia. Adicione itens antes de gerar venda.');
        }

        // 2. Baixa Estoque
        for (const item of itensOS) {
            // Se o produto_id for nulo (item avulso), ignoramos a baixa de estoque
            if (item.produto_id) {
                await dbRun(
                    'UPDATE Produtos SET quantidade_em_estoque = quantidade_em_estoque - ? WHERE id = ?',
                    [item.quantidade, item.produto_id]
                );
            }
        }

        // 3. CRIA A VENDA
        const dataHoje = new Date().toISOString();
        const resultVenda = await dbRun(`
            INSERT INTO Vendas (cliente_id, data, total, forma_pagamento, desconto, acrescimo, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [os.cliente_id, dataHoje, os.total, 'A Definir', 0, 0, 'Finalizada']);
        
        // --- A CORREÇÃO MÁGICA ESTÁ AQUI ---
        // Usamos .id porque o seu database.js retorna { id: ..., changes: ... }
        const vendaId = resultVenda.id; 

        if (!vendaId) {
            throw new Error("Falha ao recuperar ID da venda criada.");
        }

        // 4. Itens Venda
        for (const item of itensOS) {
            // Se não tiver ID de produto, usamos um ID genérico ou deixamos null, mas o venda_id é OBRIGATÓRIO
            await dbRun(`INSERT INTO Itens_Venda (venda_id, produto_id, quantidade, valor_unitario, subtotal) VALUES (?, ?, ?, ?, ?)`,
                [vendaId, item.produto_id, item.quantidade, item.valor_unitario, item.quantidade * item.valor_unitario]);
        }
        
        // 5. Serviços Venda (Opcional: Se tiver tabela de serviços na venda, insira aqui)
        // Se não tiver tabela específica para serviços na venda, pode pular ou adaptar.

        // 6. Finaliza OS
        await dbRun("UPDATE Ordens_Servico SET status = 'Finalizada' WHERE id = ?", [id]);

        await dbRun('COMMIT');
        res.json({ message: "Venda gerada com sucesso!", venda_id: vendaId });

    } catch (err) {
        await dbRun('ROLLBACK');
        console.error('Erro ao gerar venda:', err);
        res.status(500).json({ message: err.message || 'Erro ao processar venda.' });
    }
};

module.exports = { listarOS, criarOrdemServico, buscarOSPorId, atualizarOS, gerarVendaDeOS };