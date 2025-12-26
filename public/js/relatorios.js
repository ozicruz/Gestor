document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';

    // --- VARIÁVEIS GLOBAIS ---
    let vendasCache = [];
    let ordemAtual = { coluna: 'data', direcao: 'desc' };
    let produtosCache = [];
    let ordemProdutos = { coluna: 'lucroBruto', direcao: 'desc' };

    // --- ELEMENTOS DO DOM ---
    const formDRE = document.getElementById('form-relatorio-dre');
    const btnGerarDRE = document.getElementById('btn-gerar-dre');
    const btnGerarProdutos = document.getElementById('btn-gerar-produtos');
    const btnGerarStock = document.getElementById('btn-gerar-stock');
    const btnGerarVendas = document.getElementById('btn-gerar-vendas');
    const btnGerarServicos = document.getElementById('btn-gerar-servicos');
    const btnGerarClientes = document.getElementById('btn-gerar-clientes');
    
    const inputDataInicio = document.getElementById('data-inicio');
    const inputDataFim = document.getElementById('data-fim');
    const areaRelatorio = document.getElementById('area-relatorio');
    const feedbackAlert = document.getElementById('feedback-alert');
    const modalDetalhes = document.getElementById('modal-detalhes-venda');
    const btnFecharDetalhes = document.getElementById('btn-fechar-detalhes');

    // --- FUNÇÕES AUXILIARES ---
    
    const setCarregando = (btn, estado) => {
        if (estado) {
            btn.dataset.originalContent = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<span class="animate-pulse">⏳</span> A gerar...`;
        } else {
            btn.disabled = false;
            if (btn.dataset.originalContent) {
                btn.innerHTML = btn.dataset.originalContent;
            }
        }
    };

    const formatCurrency = (value) => {
        const valor = parseFloat(value) || 0;
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
    };

    const formatarDataLocal = (dataString) => {
        if (!dataString) return '-';
        let dataIso = dataString.replace(' ', 'T');
        if (!dataIso.endsWith('Z') && !dataIso.includes('+')) dataIso; // Assume local se não tiver timezone
        const dataObj = new Date(dataIso);
        return dataObj.toLocaleDateString('pt-BR') + ' ' + dataObj.toLocaleTimeString('pt-BR');
    };

    const showAlert = (message, isSuccess = true) => {
        if(feedbackAlert) {
            feedbackAlert.textContent = message;
            feedbackAlert.style.display = 'block';
            feedbackAlert.className = isSuccess ? 'p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg' : 'p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg';
            setTimeout(() => feedbackAlert.style.display = 'none', 5000);
        } else { alert(message); }
    };

    // --- IMPRESSÃO DE RELATÓRIOS GERAIS (TABELAS) ---
    const adicionarBotaoImprimir = (tituloRelatorio, conteudoHTML, usarPeriodo = true) => {
        const btnImprimir = document.createElement('button');
        btnImprimir.innerHTML = '&#128424; Imprimir / Salvar PDF'; 
        btnImprimir.className = 'bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-6 rounded-lg shadow-lg mt-6 transition-transform active:scale-95';

        btnImprimir.addEventListener('click', async () => {
            let dadosEmpresa = { nome_fantasia: 'Minha Oficina', endereco: '' };
            try { const r = await fetch(`${API_URL}/empresa`); if(r.ok) dadosEmpresa = await r.json(); } catch(e){}

            const template = document.getElementById('relatorio-template');
            const clone = template.content.cloneNode(true);

            clone.querySelector('[data-relatorio="empresa-nome"]').textContent = dadosEmpresa.nome_fantasia;
            clone.querySelector('[data-relatorio="empresa-endereco"]').textContent = dadosEmpresa.endereco || '';

            let periodo = "Período Completo";
            if (usarPeriodo && inputDataInicio.value && inputDataFim.value) {
                const dInicio = new Date(inputDataInicio.value).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
                const dFim = new Date(inputDataFim.value).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
                periodo = `${dInicio} a ${dFim}`;
            }

            clone.querySelector('[data-relatorio="titulo"]').textContent = tituloRelatorio;
            clone.querySelector('[data-relatorio="periodo"]').textContent = periodo;
            clone.getElementById('relatorio-conteudo-pdf').innerHTML = conteudoHTML;

            const htmlContent = new XMLSerializer().serializeToString(clone);
            const filename = `${tituloRelatorio.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

            if (window.electronAPI) {
                window.electronAPI.send('print-to-pdf', { html: htmlContent, name: filename });
            } else {
                const win = window.open('', '', 'width=900,height=600');
                win.document.write(htmlContent);
                win.document.close();
                win.print();
            }
        });

        areaRelatorio.appendChild(btnImprimir);
    };

// --- IMPRESSÃO INDIVIDUAL (COM CORREÇÃO DE NOME) ---
    const imprimirReciboIndividual = async (venda) => {
        let emp = { nome_fantasia: 'Minha Oficina', endereco: '', cnpj_cpf: '', telefone: '' };
        try { const res = await fetch(`${API_URL}/empresa`); if(res.ok) emp = await res.json(); } catch(e){}

        const nomeArquivo = `Recibo_Venda_${venda.id}.pdf`;
        let itensHtml = '';
        const todosItens = [...(venda.itens || []), ...(venda.servicos || [])];

        todosItens.forEach(i => {
            const nome = i.nome || i.descricao;
            const qtd = i.quantidade || 1;
            const valUnit = i.valor_unitario || i.valor_unitario_venda || i.valor || 0;
            const subtotal = i.subtotal || (qtd * valUnit);

            itensHtml += `<tr><td style="border-bottom:1px solid #ccc; padding:5px;">${nome}</td><td style="border-bottom:1px solid #ccc; padding:5px; text-align:center;">${qtd}</td><td style="border-bottom:1px solid #ccc; padding:5px; text-align:right;">${formatCurrency(valUnit)}</td><td style="border-bottom:1px solid #ccc; padding:5px; text-align:right;">${formatCurrency(subtotal)}</td></tr>`;
        });

        // Formatação do Pagamento (Igual ao gestao_vendas.js)
        let nomeForma = venda.forma_pagamento || 'Dinheiro';
        nomeForma = nomeForma.replace('Cartão de ', '').replace('Cartão ', ''); // Abrevia

        if (nomeForma.includes('Crédito')) {
            if (venda.num_parcelas && venda.num_parcelas > 1) nomeForma += ` (${venda.num_parcelas}x)`;
            else nomeForma += ' (À Vista)';
        } else if (nomeForma.includes('Fiado')) {
            nomeForma = 'A Prazo';
            if (venda.num_parcelas > 1) nomeForma += ` (${venda.num_parcelas}x)`;
        }

        const htmlContent = `
        <html><head><meta charset="UTF-8"><title>Venda #${venda.id}</title><style>
            body{font-family:'Helvetica',sans-serif;padding:20px;font-size:14px;color:#000}
            .header{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:15px}
            .header h1{margin:0;font-size:20px;text-transform:uppercase}
            .header p{margin:2px 0;font-size:12px}
            table{width:100%;border-collapse:collapse;margin-top:10px}
            th{text-align:left;border-bottom:2px solid #000;padding:5px}
            .totals{margin-top:20px;text-align:right}
            .row{margin-bottom:5px}
            .total-final{font-size:18px;font-weight:bold;border-top:2px solid #000;padding-top:5px;margin-top:5px}
            .footer{text-align:center;margin-top:30px;font-size:11px;border-top:1px dashed #ccc;padding-top:5px}
        </style></head><body>
            <div class="header"><div><h1>${emp.nome_fantasia}</h1><p>${emp.endereco}</p><p>${emp.telefone}</p></div><div style="text-align:right;"><h2>VENDA #${venda.id}</h2><p>${new Date(venda.data).toLocaleDateString('pt-BR')}</p></div></div>
            <p><strong>Cliente:</strong> ${venda.cliente_nome || 'Consumidor Final'}</p>
            <table><thead><tr><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead><tbody>${itensHtml}</tbody></table>
            <div class="totals">
                <div class="row">Desconto: - ${formatCurrency(venda.desconto_valor || 0)}</div>
                <div class="row">Forma: <strong>${nomeForma}</strong></div>
                <div class="total-final">TOTAL: ${formatCurrency(venda.total)}</div>
            </div>
            <div class="footer"><p>Obrigado pela preferência!</p><p>Documento sem valor fiscal.</p></div>
        </body></html>`;

        if (window.electronAPI) window.electronAPI.send('print-to-pdf', { html: htmlContent, name: nomeArquivo });
        else { const w = window.open('', '', 'width=800,height=600'); w.document.write(htmlContent); w.document.close(); w.print(); }
    };

    // --- RELATÓRIOS DE LISTAGEM ---
    
    // DRE
    const desenharDRE = (dreData) => {
        const { TotalReceitas, TotalCMV, LucroBruto, TotalDespesas, LucroLiquido, Receitas, Despesas } = dreData;
        areaRelatorio.innerHTML = '';
        areaRelatorio.style.textAlign = 'left';

        const header = document.createElement('h2');
        header.className = "text-2xl font-bold text-gray-800 mb-6 border-b pb-2";
        header.textContent = "Demonstração do Resultado do Exercício (DRE)";
        areaRelatorio.appendChild(header);

        let htmlDRE = '<div class="space-y-6 max-w-4xl mx-auto">';
        
        htmlDRE += `<div class="bg-blue-50 p-4 rounded-lg border border-blue-100"><h3 class="text-lg font-bold text-blue-800 mb-2">(+) Receita Bruta</h3>`;
        Receitas.forEach(r => htmlDRE += `<div class="flex justify-between text-sm text-blue-700 mb-1"><span>${r.categoria}</span><span>${formatCurrency(r.total)}</span></div>`);
        htmlDRE += `<div class="border-t border-blue-200 mt-2 pt-2 flex justify-between font-bold text-blue-900"><span>Total Receitas</span><span>${formatCurrency(TotalReceitas)}</span></div></div>`;

        htmlDRE += `<div class="bg-red-50 p-4 rounded-lg border border-red-100"><h3 class="text-lg font-bold text-red-800 mb-2">(-) Custos (CMV)</h3>`;
        htmlDRE += `<div class="flex justify-between font-bold text-red-900"><span>Custo Mercadoria Vendida</span><span>${formatCurrency(TotalCMV)}</span></div></div>`;

        htmlDRE += `<div class="flex justify-between items-center p-4 bg-gray-100 rounded-lg border-l-4 border-gray-500"><span class="text-xl font-bold text-gray-700">(=) Lucro Bruto</span><span class="text-xl font-bold text-gray-800">${formatCurrency(LucroBruto)}</span></div>`;

        htmlDRE += `<div class="bg-orange-50 p-4 rounded-lg border border-orange-100"><h3 class="text-lg font-bold text-orange-800 mb-2">(-) Despesas Operacionais</h3>`;
        Despesas.forEach(d => htmlDRE += `<div class="flex justify-between text-sm text-orange-700 mb-1"><span>${d.categoria}</span><span>${formatCurrency(d.total)}</span></div>`);
        htmlDRE += `<div class="border-t border-orange-200 mt-2 pt-2 flex justify-between font-bold text-orange-900"><span>Total Despesas</span><span>${formatCurrency(TotalDespesas)}</span></div></div>`;

        const corLucro = LucroLiquido >= 0 ? 'bg-green-100 text-green-800 border-green-500' : 'bg-red-100 text-red-800 border-red-500';
        htmlDRE += `<div class="flex justify-between items-center p-6 rounded-lg border-l-4 ${corLucro} shadow-md mt-4"><span class="text-2xl font-bold">(=) Resultado Líquido</span><span class="text-3xl font-bold">${formatCurrency(LucroLiquido)}</span></div></div>`;
        
        areaRelatorio.innerHTML += htmlDRE;
        adicionarBotaoImprimir("Relatório DRE", htmlDRE);
    };

    const executarRelatorioDRE = async () => {
        const dataInicio = inputDataInicio.value;
        const dataFim = inputDataFim.value;
        if (!dataInicio || !dataFim) return showAlert("Selecione as datas.", false);
        setCarregando(btnGerarDRE, true);
        try {
            const response = await fetch(`${API_URL}/financeiro/relatorios/dre?data_inicio=${dataInicio}&data_fim=${dataFim}`);
            const dreData = await response.json();
            if (!response.ok) throw new Error(dreData.message);
            desenharDRE(dreData);
        } catch (err) { showAlert(err.message, false); } 
        finally { setCarregando(btnGerarDRE, false); }
    };

    // --- RENDERIZAR TABELA DE PRODUTOS (COM ORDENAÇÃO) ---
    const renderizarTabelaProdutos = () => {
        areaRelatorio.innerHTML = '';
        areaRelatorio.innerHTML += `<h2 class="text-2xl font-bold mb-4 text-gray-800">Produtos Mais Lucrativos</h2>`;

        if (produtosCache.length === 0) {
            areaRelatorio.innerHTML += '<p class="text-gray-500">Nenhum dado encontrado.</p>';
            return;
        }

        // Ordenação
        produtosCache.sort((a, b) => {
            let valA = a[ordemProdutos.coluna];
            let valB = b[ordemProdutos.coluna];

            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            } else {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            }

            if (valA < valB) return ordemProdutos.direcao === 'asc' ? -1 : 1;
            if (valA > valB) return ordemProdutos.direcao === 'asc' ? 1 : -1;
            return 0;
        });

        // Seta Indicadora
        const getArrow = (col) => ordemProdutos.coluna === col ? (ordemProdutos.direcao === 'asc' ? ' ▲' : ' ▼') : '';

        // Tabela HTML
        let html = `
        <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <table class="w-full report-table">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="p-3 text-left cursor-pointer hover:bg-gray-200 select-none" onclick="window.ordenarProdutos('nome')">Produto${getArrow('nome')}</th>
                        <th class="p-3 text-center cursor-pointer hover:bg-gray-200 select-none" onclick="window.ordenarProdutos('totalVendido')">Qtd.${getArrow('totalVendido')}</th>
                        <th class="p-3 text-right cursor-pointer hover:bg-gray-200 select-none" onclick="window.ordenarProdutos('faturamentoBruto')">Faturamento${getArrow('faturamentoBruto')}</th>
                        <th class="p-3 text-right cursor-pointer hover:bg-gray-200 select-none" onclick="window.ordenarProdutos('lucroBruto')">Lucro${getArrow('lucroBruto')}</th>
                    </tr>
                </thead>
                <tbody>`;

        produtosCache.forEach(p => {
            html += `<tr class="hover:bg-gray-50 border-b border-gray-100">
                <td class="p-3 text-gray-800 font-medium">${p.nome}</td>
                <td class="p-3 text-center text-gray-600">${p.totalVendido}</td>
                <td class="p-3 text-right text-gray-600">${formatCurrency(p.faturamentoBruto)}</td>
                <td class="p-3 text-right font-bold text-green-600 bg-green-50">${formatCurrency(p.lucroBruto)}</td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
        
        areaRelatorio.innerHTML += html;
        adicionarBotaoImprimir("Top Produtos", html);
    };

    // Função Global de Ordenar
    window.ordenarProdutos = (coluna) => {
        if (ordemProdutos.coluna === coluna) {
            ordemProdutos.direcao = ordemProdutos.direcao === 'asc' ? 'desc' : 'asc';
        } else {
            ordemProdutos.coluna = coluna;
            ordemProdutos.direcao = 'desc'; // Padrão descrescente para valores
        }
        renderizarTabelaProdutos();
    };

    // PRODUTOS
    const executarRelatorioProdutos = async () => {
        const dI = inputDataInicio.value; 
        const dF = inputDataFim.value;
        
        if (!dI || !dF) return showAlert("Selecione as datas.", false);
        
        setCarregando(btnGerarProdutos, true);
        try {
            const res = await fetch(`${API_URL}/relatorios/produtos-mais-vendidos?data_inicio=${dI}&data_fim=${dF}`);
            produtosCache = await res.json(); // Salva no cache
            
            // Reseta para ordenar por Lucro (o mais lógico)
            ordemProdutos = { coluna: 'lucroBruto', direcao: 'desc' };
            renderizarTabelaProdutos();

        } catch(e) { 
            console.error(e);
            showAlert(e.message, false); 
        } finally { 
            setCarregando(btnGerarProdutos, false); 
        }
    };

    // STOCK BAIXO
    const executarRelatorioStockBaixo = async () => {
        setCarregando(btnGerarStock, true);
        try {
            const response = await fetch(`${API_URL}/relatorios/stock-baixo`);
            const produtos = await response.json();
            areaRelatorio.innerHTML = '';
            areaRelatorio.innerHTML += `<h2 class="text-2xl font-bold mb-4">Stock Baixo</h2>`;
            
            if (produtos.length === 0) areaRelatorio.innerHTML += '<div class="p-4 bg-green-100 text-green-800 rounded">✅ Todo o stock está OK!</div>';
            else {
                let html = `<div class="bg-white rounded shadow overflow-hidden"><table class="w-full report-table"><thead class="bg-red-50"><tr><th>Produto</th><th class="text-center">Atual</th><th class="text-center">Mínimo</th><th class="text-center">Faltam</th></tr></thead><tbody>`;
                produtos.forEach(p => {
                    html += `<tr><td class="p-3">${p.nome}</td><td class="p-3 text-center text-red-600 font-bold">${p.quantidade_em_estoque}</td><td class="p-3 text-center">${p.stock_minimo}</td><td class="p-3 text-center font-bold">${p.stock_minimo - p.quantidade_em_estoque}</td></tr>`;
                });
                html += `</tbody></table></div>`;
                areaRelatorio.innerHTML += html;
                adicionarBotaoImprimir("Relatório Stock Baixo", html, false);
            }
        } catch (err) { showAlert(err.message, false); } 
        finally { setCarregando(btnGerarStock, false); }
    };

    // --- FUNÇÃO PONTUAL: RENDERIZAR TABELA DE VENDAS (COM ORDENAÇÃO) ---
    const renderizarTabelaVendas = () => {
        areaRelatorio.innerHTML = '';
        areaRelatorio.innerHTML += `<h2 class="text-2xl font-bold mb-4 text-gray-800">Relatório de Vendas Realizadas</h2>`;

        if (vendasCache.length === 0) {
            areaRelatorio.innerHTML += '<p class="text-gray-500">Nenhuma venda encontrada.</p>';
            return;
        }

        // 1. ORDENAÇÃO
        vendasCache.sort((a, b) => {
            let valA = a[ordemAtual.coluna];
            let valB = b[ordemAtual.coluna];

            if (ordemAtual.coluna === 'total' || ordemAtual.coluna === 'id') {
                valA = parseFloat(valA); valB = parseFloat(valB);
            } else {
                valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase();
            }

            if (valA < valB) return ordemAtual.direcao === 'asc' ? -1 : 1;
            if (valA > valB) return ordemAtual.direcao === 'asc' ? 1 : -1;
            return 0;
        });

        // Ícone da seta
        const getArrow = (col) => ordemAtual.coluna === col ? (ordemAtual.direcao === 'asc' ? ' ▲' : ' ▼') : '';

        // 2. TABELA HTML
        let html = `
        <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div class="overflow-auto h-[calc(100vh-480px)] min-h-[400px]">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-200 select-none" onclick="window.ordenarVendas('id')">#${getArrow('id')}</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-200 select-none" onclick="window.ordenarVendas('data')">Data${getArrow('data')}</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-200 select-none" onclick="window.ordenarVendas('cliente_nome')">Cliente${getArrow('cliente_nome')}</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-200 select-none" onclick="window.ordenarVendas('forma_pagamento')">Pagamento${getArrow('forma_pagamento')}</th>
                            <th class="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-200 select-none" onclick="window.ordenarVendas('total')">Total${getArrow('total')}</th>
                            <th class="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">`;

        vendasCache.forEach(v => {
            const dataF = formatarDataLocal(v.data).split(' ')[0];
            
            // 3. FORMATAÇÃO (ABREVIAÇÃO + PARCELAS)
            let pagto = v.forma_pagamento || '-';
            pagto = pagto.replace('Cartão de ', '').replace('Cartão ', ''); // Vira "Crédito" ou "Débito"

            if (pagto.includes('Crédito')) {
                if (v.num_parcelas > 1) pagto += ` (${v.num_parcelas}x)`;
                else pagto += ' (À Vista)';
            } else if (pagto.includes('Fiado') || pagto.includes('Prazo')) {
                pagto = 'A Prazo';
                if (v.num_parcelas > 1) pagto += ` (${v.num_parcelas}x)`;
            }

            html += `
                <tr class="hover:bg-blue-50 transition-colors">
                    <td class="px-6 py-4 text-sm font-medium text-gray-900">${v.id}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${dataF}</td>
                    <td class="px-6 py-4 text-sm text-gray-700">${v.cliente_nome || 'Consumidor'}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${pagto}</td>
                    <td class="px-6 py-4 text-sm font-bold text-right text-gray-900">${formatCurrency(v.total)}</td>
                    <td class="px-6 py-4 text-center">
                        <button class="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded font-bold text-xs btn-detalhes" data-id="${v.id}">Detalhes</button>
                    </td>
                </tr>`;
        });

        html += `</tbody></table></div></div>`;
        const totalGeral = vendasCache.reduce((acc, curr) => acc + curr.total, 0);
        html += `<div class="mt-4 text-right text-xl font-bold text-gray-800 border-t pt-4">Total: ${formatCurrency(totalGeral)}</div>`;

        areaRelatorio.innerHTML += html;

        // Reativa os botões de detalhes
        document.querySelectorAll('.btn-detalhes').forEach(btn => {
            btn.addEventListener('click', (e) => verDetalhesVenda(e.target.dataset.id));
        });

        adicionarBotaoImprimir("Relatório de Vendas", html);
    };

    // EXPOR FUNÇÃO DE ORDENAR PARA O HTML (Global)
    window.ordenarVendas = (coluna) => {
        if (ordemAtual.coluna === coluna) {
            ordemAtual.direcao = ordemAtual.direcao === 'asc' ? 'desc' : 'asc';
        } else {
            ordemAtual.coluna = coluna;
            ordemAtual.direcao = 'desc';
        }
        renderizarTabelaVendas();
    };

    // VENDAS E DETALHES
    const executarRelatorioVendas = async () => {
        const dI = inputDataInicio.value; 
        const dF = inputDataFim.value;
        
        if(!dI || !dF) return showAlert("Selecione as datas.", false);
        
        setCarregando(btnGerarVendas, true);
        try {
            const res = await fetch(`${API_URL}/relatorios/vendas?data_inicio=${dI}&data_fim=${dF}`);
            vendasCache = await res.json(); // Salva no cache
            
            ordemAtual = { coluna: 'data', direcao: 'desc' }; // Reseta ordenação
            renderizarTabelaVendas(); // Chama a renderização

        } catch (err) { showAlert(err.message, false); } 
        finally { setCarregando(btnGerarVendas, false); }
    };

    const verDetalhesVenda = async (id) => {
        try {
            const response = await fetch(`${API_URL}/relatorios/vendas/${id}`);
            const venda = await response.json();

            document.getElementById('detalhe-id').textContent = venda.id;
            document.getElementById('detalhe-data').textContent = formatarDataLocal(venda.data);
            document.getElementById('detalhe-cliente').textContent = venda.cliente_nome || 'Consumidor Final';
            document.getElementById('detalhe-pagamento').textContent = venda.forma_pagamento || '-';

            const lista = document.getElementById('detalhe-lista-itens');
            lista.innerHTML = '';
            
            venda.itens.forEach(i => lista.innerHTML += `<li>${i.quantidade}x ${i.nome} - ${formatCurrency(i.subtotal)}</li>`);
            venda.servicos.forEach(s => lista.innerHTML += `<li>${s.quantidade}x ${s.nome} (Serviço) - ${formatCurrency(s.subtotal)}</li>`);

            document.getElementById('detalhe-subtotal').textContent = `Subtotal: ${formatCurrency(venda.subtotal || venda.total)}`; // Fallback se subtotal nulo
            document.getElementById('detalhe-desconto').textContent = venda.desconto_valor ? `Desconto: - ${formatCurrency(venda.desconto_valor)}` : '';
            document.getElementById('detalhe-total').textContent = formatCurrency(venda.total);
            
            // CONFIGURA O BOTÃO DE IMPRESSÃO DO MODAL
            const btnImp = document.getElementById('btn-imprimir-recibo-modal');
            const novoBtn = btnImp.cloneNode(true); // Remove listeners antigos
            btnImp.parentNode.replaceChild(novoBtn, btnImp);
            
            novoBtn.addEventListener('click', () => {
                imprimirReciboIndividual(venda); // Chama a nova função de impressão
            });

            modalDetalhes.classList.remove('hidden');
            modalDetalhes.style.display = 'flex';

        } catch (err) { console.error(err); }
    };

    if(btnFecharDetalhes) {
        btnFecharDetalhes.addEventListener('click', () => {
            modalDetalhes.classList.add('hidden');
            modalDetalhes.style.display = 'none';
        });
    }

    // RANKINGS
    const executarRelatorioServicos = async () => {
        const dI = inputDataInicio.value; const dF = inputDataFim.value;
        if(!dI || !dF) return showAlert("Selecione datas.", false);
        setCarregando(btnGerarServicos, true);
        try {
            const res = await fetch(`${API_URL}/relatorios/servicos-ranking?data_inicio=${dI}&data_fim=${dF}`);
            const dados = await res.json();
            let html = `<div class="bg-white rounded shadow overflow-hidden"><table class="w-full report-table"><thead class="bg-gray-100"><tr><th>Serviço</th><th class="text-center">Qtd</th><th class="text-right">Total</th></tr></thead><tbody>`;
            dados.forEach(s => html += `<tr><td class="p-3">${s.nome}</td><td class="p-3 text-center">${s.quantidade}</td><td class="p-3 text-right font-bold text-blue-600">${formatCurrency(s.total)}</td></tr>`);
            html += `</tbody></table></div>`;
            areaRelatorio.innerHTML = '';
            areaRelatorio.innerHTML += `<h2 class="text-2xl font-bold mb-4">Ranking de Serviços</h2>` + html;
            adicionarBotaoImprimir("Ranking Serviços", html);
        } catch(e) { showAlert("Erro", false); } 
        finally { setCarregando(btnGerarServicos, false); }
    };

    const executarRelatorioClientes = async () => {
        const dI = inputDataInicio.value; const dF = inputDataFim.value;
        if(!dI || !dF) return showAlert("Selecione datas.", false);
        setCarregando(btnGerarClientes, true);
        try {
            const res = await fetch(`${API_URL}/relatorios/clientes-ranking?data_inicio=${dI}&data_fim=${dF}`);
            const dados = await res.json();
            let html = `<div class="bg-white rounded shadow overflow-hidden"><table class="w-full report-table"><thead class="bg-gray-100"><tr><th>Cliente</th><th class="text-center">Compras</th><th class="text-right">Gasto Total</th></tr></thead><tbody>`;
            dados.forEach(c => html += `<tr><td class="p-3">${c.nome}</td><td class="p-3 text-center">${c.numero_vendas}</td><td class="p-3 text-right font-bold text-green-600">${formatCurrency(c.total_gasto)}</td></tr>`);
            html += `</tbody></table></div>`;
            areaRelatorio.innerHTML = '';
            areaRelatorio.innerHTML += `<h2 class="text-2xl font-bold mb-4">Top Clientes</h2>` + html;
            adicionarBotaoImprimir("Top Clientes", html);
        } catch(e) { showAlert("Erro", false); } 
        finally { setCarregando(btnGerarClientes, false); }
    };

    // INICIALIZAÇÃO
    const hoje = new Date();
    inputDataInicio.value = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    inputDataFim.value = hoje.toISOString().split('T')[0];

    if(formDRE) formDRE.addEventListener('submit', (e) => { e.preventDefault(); executarRelatorioDRE(); });
    if(btnGerarProdutos) btnGerarProdutos.addEventListener('click', executarRelatorioProdutos);
    if(btnGerarStock) btnGerarStock.addEventListener('click', executarRelatorioStockBaixo);
    if(btnGerarVendas) btnGerarVendas.addEventListener('click', executarRelatorioVendas);
    if(btnGerarServicos) btnGerarServicos.addEventListener('click', executarRelatorioServicos);
    if(btnGerarClientes) btnGerarClientes.addEventListener('click', executarRelatorioClientes);

});