// backend/controllers/vendaController.js
const { dbRun, dbAll, dbGet } = require('../database/database');

const criarVenda = async (req, res) => {
    const { 
        cliente_id, total, subtotal, desconto_valor, acrescimo_valor, 
        desconto_tipo, acrescimo_tipo, 
        FormaPagamentoID, ContaCaixaID, DataVencimento, numParcelas, 
        itens, os_id 
    } = req.body;

    await dbRun('BEGIN TRANSACTION');

    try {
        const dataHoje = new Date().toISOString();
        const parcelas = numParcelas && numParcelas > 1 ? numParcelas : 1; // Garante inteiro
        
        // --- 1. DETECTOR DE CATEGORIA (PRODUTO vs SERVIÇO) ---
        let temProduto = false;
        let temServico = false;
        
        if (itens && itens.length > 0) {
            itens.forEach(item => {
                if (item.tipo === 'produto') temProduto = true;
                if (item.tipo === 'serviço') temServico = true;
            });
        }

        // Prioridade: Se tiver produto, é "Venda de Produtos". Se for só serviço, é "Venda de Serviços".
        let nomeCategoria = 'Venda de Produtos';
        if (temServico && !temProduto) {
            nomeCategoria = 'Venda de Serviços';
        }

        const catDb = await dbGet('SELECT id FROM CategoriasFinanceiras WHERE Nome = ?', [nomeCategoria]);
        const categoriaID = catDb ? catDb.id : null;

        // --- 2. BUSCA NOME DA FORMA DE PAGTO ---
        let nomeForma = 'Não Informado';
        if (FormaPagamentoID) {
            const forma = await dbGet('SELECT Nome FROM FormasPagamento WHERE id = ?', [FormaPagamentoID]);
            if (forma) nomeForma = forma.Nome;
        }

        // --- 3. INSERIR A VENDA (Agora salvando num_parcelas) ---
        const resultVenda = await dbRun(`
            INSERT INTO Vendas (
                cliente_id, data, total, subtotal, 
                desconto_valor, acrescimo_valor, desconto_tipo, acrescimo_tipo,
                forma_pagamento, FormaPagamentoID, ContaCaixaID, DataVencimento, 
                num_parcelas, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            cliente_id || null, 
            dataHoje, 
            total, 
            subtotal || total, 
            desconto_valor || 0, 
            acrescimo_valor || 0,
            desconto_tipo || 'R$',
            acrescimo_tipo || '%',
            nomeForma, 
            FormaPagamentoID, 
            ContaCaixaID || null,
            DataVencimento || null,
            parcelas, // <--- SALVANDO AS PARCELAS AQUI
            'Finalizada'
        ]);

        const vendaId = resultVenda.id;

        // --- 4. ITENS E ESTOQUE ---
        if (itens && itens.length > 0) {
            for (const item of itens) {
                if (item.tipo === 'produto') {
                    await dbRun(`
                        INSERT INTO Itens_Venda (venda_id, produto_id, quantidade, valor_unitario, subtotal)
                        VALUES (?, ?, ?, ?, ?)
                    `, [vendaId, item.id, item.quantidade, item.precoUnitario, item.subtotal]);

                    await dbRun(`UPDATE Produtos SET quantidade_em_estoque = quantidade_em_estoque - ? WHERE id = ?`, [item.quantidade, item.id]);
                }
                else if (item.tipo === 'serviço') {
                     try {
                        await dbRun(`
                            INSERT INTO Servicos_Venda (venda_id, servico_id, quantidade, valor)
                            VALUES (?, ?, ?, ?)
                        `, [vendaId, item.id, item.quantidade, item.precoUnitario]);
                     } catch(e) { console.warn("Tabela Servicos_Venda ignorada."); }
                }
            }
        }

        if (os_id) await dbRun("UPDATE Ordens_Servico SET status = 'Finalizada' WHERE id = ?", [os_id]);

        // --- 5. LANÇAMENTOS FINANCEIROS ---
        
        // Define a descrição base
        let descFin = `Venda Balcão #${vendaId}`;
        if (parcelas > 1) descFin += ` (${parcelas}x)`; // Adiciona info de parcela na descrição

        if (ContaCaixaID) { 
            // Venda À VISTA / Cartão com Recebimento Imediato
            // Lança o valor TOTAL de uma vez, mas com a descrição mostrando que foi parcelado
            await dbRun(`
                INSERT INTO Lancamentos (
                    Descricao, Valor, Tipo, Status, DataVencimento, DataPagamento, 
                    ClienteID, VendaID, FormaPagamentoID, ContaCaixaID, CategoriaID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                descFin, 
                total, 
                'RECEITA', 
                'PAGO', 
                dataHoje, 
                dataHoje,
                cliente_id, 
                vendaId, 
                FormaPagamentoID, 
                ContaCaixaID,
                categoriaID 
            ]);
            
            await dbRun('UPDATE ContasCaixa SET Saldo = Saldo + ? WHERE id = ?', [total, ContaCaixaID]);

        } else if (DataVencimento) { 
            // Venda FIADO / A PRAZO (Aqui sim dividimos em linhas separadas)
            const valorParcela = total / parcelas; 

            for (let i = 0; i < parcelas; i++) {
                let dataVencParcela = new Date(DataVencimento);
                dataVencParcela.setMonth(dataVencParcela.getMonth() + i);
                let dataVencISO = dataVencParcela.toISOString().split('T')[0];

                let descParcela = `Venda Prazo #${vendaId}`;
                if (parcelas > 1) descParcela += ` (${i + 1}/${parcelas})`;

                await dbRun(`
                    INSERT INTO Lancamentos (
                        Descricao, Valor, Tipo, Status, DataVencimento, 
                        ClienteID, VendaID, FormaPagamentoID, CategoriaID
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    descParcela, 
                    valorParcela,
                    'RECEITA', 
                    'PENDENTE', 
                    dataVencISO,
                    cliente_id, 
                    vendaId, 
                    FormaPagamentoID,
                    categoriaID 
                ]);
            }
        }

        await dbRun('COMMIT');
        res.status(201).json({ id: vendaId, message: 'Venda realizada com sucesso!' });

    } catch (err) {
        await dbRun('ROLLBACK');
        console.error("Erro ao criar venda:", err);
        res.status(500).json({ message: "Erro ao processar venda: " + err.message });
    }
};

module.exports = { criarVenda };