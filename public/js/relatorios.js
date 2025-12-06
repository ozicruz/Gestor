document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';

    // --- VARIÁVEIS GLOBAIS (CACHE DE VENDAS) ---
    let vendasCache = [];
    let ordemAtual = { coluna: 'data', direcao: 'desc' };

    // --- ELEMENTOS DO DOM ---
    const formDRE = document.getElementById('form-relatorio-dre');
    const btnGerarDRE = document.getElementById('btn-gerar-dre');
    const btnGerarProdutos = document.getElementById('btn-gerar-produtos');
    const btnGerarStock = document.getElementById('btn-gerar-stock');
    const inputDataInicio = document.getElementById('data-inicio');
    const inputDataFim = document.getElementById('data-fim');
    const areaRelatorio = document.getElementById('area-relatorio');
    const feedbackAlert = document.getElementById('feedback-alert');
    const btnGerarVendas = document.getElementById('btn-gerar-vendas');
    const modalDetalhes = document.getElementById('modal-detalhes-venda');
    const btnFecharDetalhes = document.getElementById('btn-fechar-detalhes');

    // --- FUNÇÕES AUXILIARES ---
    
    // 1. Formata Moeda (R$)
    const formatCurrency = (value) => {
        const valor = parseFloat(value) || 0;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    };

    // 2. Formata Data (Corrige UTC para Hora Local) - A FUNÇÃO QUE FALTAVA
    const formatarDataLocal = (dataString) => {
        if (!dataString) return '-';
        // Troca espaço por T e garante o Z no final para o JS saber que é UTC
        let dataIso = dataString.replace(' ', 'T');
        if (!dataIso.endsWith('Z')) dataIso += 'Z';
        
        const dataObj = new Date(dataIso);
        return dataObj.toLocaleDateString('pt-BR') + ' ' + dataObj.toLocaleTimeString('pt-BR');
    };

    // 3. Converte Imagem para Base64 (Para o Logo no PDF)
    const converterImagemParaBase64 = async (url) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn("Não foi possível carregar o logo:", error);
            return null;
        }
    };

    const showAlert = (message, isSuccess = true) => {
        if(feedbackAlert) {
            feedbackAlert.textContent = message;
            feedbackAlert.style.display = 'block';
            feedbackAlert.className = isSuccess ? 'feedback-alert feedback-success' : 'feedback-alert feedback-error';
            setTimeout(() => feedbackAlert.style.display = 'none', 5000);
        } else {
            alert(message);
        }
    };

    const adicionarBotaoImprimir = (tituloRelatorio, conteudoHTML, usarPeriodo = true) => {
        const btnImprimir = document.createElement('button');
        btnImprimir.innerHTML = '&#128424; Imprimir / Salvar PDF'; 
        btnImprimir.className = 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg shadow mt-6';

        btnImprimir.addEventListener('click', async () => {
            let dadosEmpresa = {};
            try {
                const response = await fetch(`${API_URL}/empresa`);
                if (response.ok) dadosEmpresa = await response.json();
            } catch (err) { console.error(err); }

            const template = document.getElementById('relatorio-template');
            const clone = template.content.cloneNode(true);

            clone.querySelector('[data-relatorio="empresa-nome"]').textContent = dadosEmpresa.nome_fantasia || 'Nome da Empresa';
            clone.querySelector('[data-relatorio="empresa-endereco"]').textContent = dadosEmpresa.endereco || 'Endereço não configurado';

            let periodo = "Período Completo";
            if (usarPeriodo && inputDataInicio.valueAsDate && inputDataFim.valueAsDate) {
                periodo = `${inputDataInicio.valueAsDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a ${inputDataFim.valueAsDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;
            }

            clone.querySelector('[data-relatorio="titulo"]').textContent = tituloRelatorio;
            clone.querySelector('[data-relatorio="periodo"]').textContent = periodo;
            clone.getElementById('relatorio-conteudo-pdf').innerHTML = conteudoHTML;

            const htmlContent = new XMLSerializer().serializeToString(clone);
            const filename = `${tituloRelatorio.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

            if (window.electronAPI) {
                window.electronAPI.send('print-to-pdf', { html: htmlContent, name: filename });
            } else {
                alert('Funcionalidade disponível apenas no App Desktop.');
            }
        });

        areaRelatorio.appendChild(btnImprimir);
    };

    // --- RELATÓRIO DRE ---
    const desenharDRE = (dreData) => {
        const { TotalReceitas, TotalCMV, LucroBruto, TotalDespesas, LucroLiquido, Receitas, Despesas } = dreData;

        areaRelatorio.innerHTML = '';
        areaRelatorio.style.textAlign = 'left';

        const header = document.createElement('h2');
        header.className = "text-2xl font-bold text-gray-800 mb-4";
        header.textContent = `DRE de ${inputDataInicio.valueAsDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a ${inputDataFim.valueAsDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;
        areaRelatorio.appendChild(header);

        let htmlDRE = '<div class="space-y-4 dre-container">';
        htmlDRE += `<div><h3 class="text-xl font-semibold text-gray-700">(+) Receita Bruta Total</h3><div class="pl-4 border-l-2 border-gray-200 mt-1">`;
        Receitas.forEach(r => htmlDRE += `<p class="text-sm text-gray-600">${r.categoria}: ${formatCurrency(r.total)}</p>`);
        htmlDRE += `<p class="font-bold text-gray-800 mt-1">Total Receitas: ${formatCurrency(TotalReceitas)}</p></div></div>`;
        htmlDRE += `<div><h3 class="text-xl font-semibold text-gray-700">(-) Custo da Mercadoria Vendida (CMV)</h3><div class="pl-4 border-l-2 border-gray-200 mt-1"><p class="font-bold text-gray-800">Total CMV: ${formatCurrency(TotalCMV)}</p></div></div>`;
        htmlDRE += `<div class="border-t pt-2"><h3 class="text-2xl font-bold text-blue-600">(=) Lucro Bruto: ${formatCurrency(LucroBruto)}</h3></div>`;
        htmlDRE += `<div><h3 class="text-xl font-semibold text-gray-700 mt-4">(-) Despesas Operacionais</h3><div class="pl-4 border-l-2 border-gray-200 mt-1">`;
        Despesas.forEach(d => htmlDRE += `<p class="text-sm text-gray-600">${d.categoria}: ${formatCurrency(d.total)}</p>`);
        htmlDRE += `<p class="font-bold text-red-600 mt-1">Total Despesas: ${formatCurrency(TotalDespesas)}</p></div></div>`;
        const lucroClasse = LucroLiquido >= 0 ? 'text-green-600' : 'text-red-600';
        htmlDRE += `<div class="border-t-2 border-gray-800 pt-4 mt-6"><h3 class="text-3xl font-bold ${lucroClasse}">(=) Lucro Líquido: ${formatCurrency(LucroLiquido)}</h3></div></div>`;
        
        areaRelatorio.innerHTML += htmlDRE;
        adicionarBotaoImprimir("Relatório DRE", htmlDRE);
    };

    const executarRelatorioDRE = async () => {
        const dataInicio = inputDataInicio.value;
        const dataFim = inputDataFim.value;
        if (!dataInicio || !dataFim) return showAlert("Selecione as datas.", false);
        
        btnGerarDRE.disabled = true;
        btnGerarDRE.textContent = "A gerar...";
        try {
            const response = await fetch(`${API_URL}/financeiro/relatorios/dre?data_inicio=${dataInicio}&data_fim=${dataFim}`);
            const dreData = await response.json();
            if (!response.ok) throw new Error(dreData.message);
            desenharDRE(dreData);
        } catch (err) {
            console.error(err);
            showAlert(err.message, false);
        } finally {
            btnGerarDRE.disabled = false;
            btnGerarDRE.textContent = "Gerar Relatório DRE";
        }
    };

    // --- RELATÓRIO PRODUTOS ---
    const desenharTabelaProdutos = (produtos) => {
        areaRelatorio.innerHTML = '';
        const header = document.createElement('h2');
        header.className = "text-2xl font-bold text-gray-800 mb-4";
        header.textContent = `Produtos Mais Lucrativos`;
        areaRelatorio.appendChild(header);

        if (produtos.length === 0) {
            areaRelatorio.innerHTML += '<p class="text-gray-500">Nenhum produto vendido.</p>';
            return;
        }

        let tabelaHTML = `<div class="bg-white rounded-lg shadow overflow-hidden"><table class="w-full report-table"><thead class="bg-gray-100"><tr><th class="px-6 py-3 text-left">Produto</th><th class="px-6 py-3 text-center">Qtd.</th><th class="px-6 py-3 text-right">Faturamento</th><th class="px-6 py-3 text-right">CMV</th><th class="px-6 py-3 text-right">Lucro</th></tr></thead><tbody class="divide-y divide-gray-200">`;
        produtos.forEach(p => {
            tabelaHTML += `<tr class="hover:bg-gray-50"><td class="px-6 py-4 font-medium">${p.nome}</td><td class="px-6 py-4 text-center">${p.totalVendido}</td><td class="px-6 py-4 text-right">${formatCurrency(p.faturamentoBruto)}</td><td class="px-6 py-4 text-right text-red-600">(${formatCurrency(p.custoTotal)})</td><td class="px-6 py-4 text-right font-bold text-green-600">${formatCurrency(p.lucroBruto)}</td></tr>`;
        });
        tabelaHTML += `</tbody></table></div>`;
        areaRelatorio.innerHTML += tabelaHTML;
        adicionarBotaoImprimir("Relatório de Produtos", tabelaHTML);
    };

    const executarRelatorioProdutos = async () => {
        const dataInicio = inputDataInicio.value;
        const dataFim = inputDataFim.value;
        if (!dataInicio || !dataFim) return showAlert("Selecione as datas.", false);

        btnGerarProdutos.disabled = true;
        btnGerarProdutos.textContent = "A gerar...";
        try {
            const response = await fetch(`${API_URL}/relatorios/produtos-mais-vendidos?data_inicio=${dataInicio}&data_fim=${dataFim}`);
            const produtos = await response.json();
            if (!response.ok) throw new Error(produtos.message);
            desenharTabelaProdutos(produtos);
        } catch (err) {
            console.error(err);
            showAlert(err.message, false);
        } finally {
            btnGerarProdutos.disabled = false;
            btnGerarProdutos.textContent = "Gerar Relatório de Produtos";
        }
    };

    // --- RELATÓRIO STOCK BAIXO ---
    const desenharTabelaStockBaixo = (produtos) => {
        areaRelatorio.innerHTML = '';
        const header = document.createElement('h2');
        header.className = "text-2xl font-bold text-gray-800 mb-4";
        header.textContent = `Relatório de Stock Baixo`;
        areaRelatorio.appendChild(header);

        if (produtos.length === 0) {
            areaRelatorio.innerHTML += '<p class="text-gray-500">Tudo em ordem!</p>';
            return;
        }

        let tabelaHTML = `<div class="bg-white rounded-lg shadow overflow-hidden"><table class="w-full report-table"><thead class="bg-gray-100"><tr><th class="px-6 py-3 text-left">Produto</th><th class="px-6 py-3 text-center">Atual</th><th class="px-6 py-3 text-center">Mínimo</th><th class="px-6 py-3 text-center">Comprar</th></tr></thead><tbody class="divide-y divide-gray-200">`;
        produtos.forEach(p => {
            tabelaHTML += `<tr class="hover:bg-gray-50"><td class="px-6 py-4 font-medium">${p.nome}</td><td class="px-6 py-4 text-center font-bold text-red-600">${p.quantidade_em_estoque}</td><td class="px-6 py-4 text-center text-blue-600">${p.stock_minimo}</td><td class="px-6 py-4 text-center font-bold text-green-600">${p.stock_minimo - p.quantidade_em_estoque}</td></tr>`;
        });
        tabelaHTML += `</tbody></table></div>`;
        areaRelatorio.innerHTML += tabelaHTML;
        adicionarBotaoImprimir("Relatório Stock Baixo", tabelaHTML);
    };

    const executarRelatorioStockBaixo = async () => {
        btnGerarStock.disabled = true;
        btnGerarStock.textContent = "A gerar...";
        try {
            const response = await fetch(`${API_URL}/relatorios/stock-baixo`);
            const produtos = await response.json();
            if (!response.ok) throw new Error(produtos.message);
            desenharTabelaStockBaixo(produtos);
        } catch (err) {
            console.error(err);
            showAlert(err.message, false);
        } finally {
            btnGerarStock.disabled = false;
            btnGerarStock.textContent = "Ver Relatório de Stock Baixo";
        }
    };

    // --- NOVA FUNÇÃO: GERAR HTML DO RECIBO ---
    const gerarHtmlRecibo = async (venda) => {
        // 1. Busca dados da empresa
        let empresa = { nome: 'Minha Oficina', endereco: 'Endereço não configurado' };
        try {
            const res = await fetch(`${API_URL}/empresa`);
            if (res.ok) empresa = await res.json();
        } catch (e) { console.error("Erro ao buscar empresa", e); }

        // 2. LOGO (Tenta carregar assets/logo.png e converte para Base64)
        const caminhoLogo = 'assets/logo.png'; 
        const logoBase64 = await converterImagemParaBase64(caminhoLogo);

        // 3. Formata dados (USANDO A FUNÇÃO DE FUSO HORÁRIO)
        const dataFormatada = formatarDataLocal(venda.data);
        
        let itensHtml = '';
        venda.itens.forEach(item => {
            itensHtml += `
                <tr>
                    <td style="padding: 5px; border-bottom: 1px solid #eee;">${item.nome}</td>
                    <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: center;">${item.quantidade}</td>
                    <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.valor_unitario)}</td>
                    <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.subtotal)}</td>
                </tr>`;
        });
        venda.servicos.forEach(serv => {
            itensHtml += `
                <tr>
                    <td style="padding: 5px; border-bottom: 1px solid #eee;">${serv.nome} (Serviço)</td>
                    <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: center;">${serv.quantidade}</td>
                    <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(serv.valor_unitario)}</td>
                    <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(serv.subtotal)}</td>
                </tr>`;
        });

        // 4. HTML Recibo
        return `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Courier New', monospace; font-size: 14px; color: #000; padding: 20px; max-width: 80mm; margin: 0 auto; }
                h1 { font-size: 16px; text-align: center; margin: 5px 0; font-weight: bold; text-transform: uppercase; }
                p { margin: 2px 0; }
                .center { text-align: center; }
                .line { border-bottom: 1px dashed #000; margin: 10px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                .totals { margin-top: 10px; text-align: right; }
                .total-final { font-size: 16px; font-weight: bold; margin-top: 5px; }
                .logo-img { max-width: 80%; max-height: 80px; margin: 0 auto 10px auto; display: block; }
            </style>
        </head>
        <body>
            <div class="center">
                ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="Logo">` : ''}
                <h1>${empresa.nome_fantasia || 'OFICINA MECÂNICA'}</h1>
                <p>${empresa.endereco || ''}</p>
                <p>${empresa.telefone || ''}</p>
                <p>${empresa.email || ''}</p>
            </div>
            <div class="line"></div>
            <p class="center"><strong>RECIBO #${venda.id}</strong></p>
            <p>Data: ${dataFormatada}</p>
            <p>Cliente: ${venda.cliente_nome || 'Consumidor Final'}</p>
            <div class="line"></div>
            <table>
                <thead>
                    <tr>
                        <th style="text-align: left;">Item</th>
                        <th>Qtd</th>
                        <th>Vl.Unit</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itensHtml}
                </tbody>
            </table>
            <div class="line"></div>
            <div class="totals">
                <p>Subtotal: ${formatCurrency(venda.total - (venda.acrescimo_valor || 0) + (venda.desconto_valor || 0))}</p>
                ${venda.desconto_valor > 0 ? `<p>Desconto: - ${formatCurrency(venda.desconto_valor)}</p>` : ''}
                ${venda.acrescimo_valor > 0 ? `<p>Acréscimo: + ${formatCurrency(venda.acrescimo_valor)}</p>` : ''}
                <p class="total-final">TOTAL: ${formatCurrency(venda.total)}</p>
            </div>
            <div class="line"></div>
            <p>Forma de Pagamento: ${venda.forma_pagamento}</p>
            <br>
            <div class="center">
                <p>Obrigado pela preferência!</p>
            </div>
        </body>
        </html>
        `;
    };

    // --- RELATÓRIO DE VENDAS (COM ORDENAÇÃO E SCROLL) ---

    // 1. Função de abrir detalhes (Modal)
    const verDetalhesVenda = async (id) => {
        try {
            const response = await fetch(`${API_URL}/relatorios/vendas/${id}`);
            const venda = await response.json();

            document.getElementById('detalhe-id').textContent = venda.id;
            
            // CORREÇÃO: Usando a função auxiliar para data e hora
            document.getElementById('detalhe-data').textContent = formatarDataLocal(venda.data);
            
            document.getElementById('detalhe-cliente').textContent = venda.cliente_nome || 'Consumidor Final';
            document.getElementById('detalhe-pagamento').textContent = venda.forma_pagamento;

            const lista = document.getElementById('detalhe-lista-itens');
            lista.innerHTML = '';
            
            let subtotalCalc = 0;
            venda.itens.forEach(item => {
                lista.innerHTML += `<li>${item.quantidade}x ${item.nome} (${formatCurrency(item.subtotal)})</li>`;
                subtotalCalc += item.subtotal;
            });
            venda.servicos.forEach(serv => {
                lista.innerHTML += `<li>${serv.quantidade}x ${serv.nome} (Serviço) (${formatCurrency(serv.subtotal)})</li>`;
                subtotalCalc += serv.subtotal;
            });

            document.getElementById('detalhe-subtotal').textContent = `Subtotal: ${formatCurrency(subtotalCalc)}`;
            
            const desc = venda.desconto_valor || 0;
            const acresc = venda.acrescimo_valor || 0;
            const descEl = document.getElementById('detalhe-desconto');
            const acrescEl = document.getElementById('detalhe-acrescimo');

            descEl.textContent = `Desconto: - ${formatCurrency(desc)}`;
            descEl.style.display = desc > 0 ? 'block' : 'none';

            acrescEl.textContent = `Acréscimo: + ${formatCurrency(acresc)}`;
            acrescEl.style.display = acresc > 0 ? 'block' : 'none';

            document.getElementById('detalhe-total').textContent = formatCurrency(venda.total);

            // --- LÓGICA DO BOTÃO REIMPRIMIR ---
            const btnImprimir = document.getElementById('btn-imprimir-recibo-modal');
            const novoBtn = btnImprimir.cloneNode(true);
            btnImprimir.parentNode.replaceChild(novoBtn, btnImprimir);

            novoBtn.addEventListener('click', async () => {
                novoBtn.textContent = "Gerando PDF...";
                novoBtn.disabled = true;
                
                try {
                    const htmlRecibo = await gerarHtmlRecibo(venda);
                    const nomeArquivo = `Recibo_Venda_${venda.id}.pdf`;
                    
                    if (window.electronAPI) {
                        window.electronAPI.send('print-to-pdf', { html: htmlRecibo, name: nomeArquivo });
                    } else {
                        alert("Impressão disponível apenas no App Desktop.");
                    }
                } catch (err) {
                    alert("Erro ao gerar recibo: " + err.message);
                } finally {
                    novoBtn.textContent = "Imprimir Recibo";
                    novoBtn.innerHTML = '<span class="mr-2">&#128424;</span> Imprimir Recibo';
                    novoBtn.disabled = false;
                }
            });

            modalDetalhes.classList.remove('modal-oculto');

        } catch (error) {
            console.error(error);
            alert(`Erro ao carregar detalhes: ${error.message}`);
        }
    };

    // 2. Função de Ordenação (Lógica)
    const ordenarDados = (coluna) => {
        if (ordemAtual.coluna === coluna) {
            ordemAtual.direcao = ordemAtual.direcao === 'asc' ? 'desc' : 'asc';
        } else {
            ordemAtual.coluna = coluna;
            ordemAtual.direcao = 'asc';
        }

        vendasCache.sort((a, b) => {
            let valorA = a[coluna];
            let valorB = b[coluna];

            if (coluna === 'total' || coluna === 'id') {
                valorA = Number(valorA);
                valorB = Number(valorB);
            }
            if (typeof valorA === 'string') valorA = valorA.toLowerCase();
            if (typeof valorB === 'string') valorB = valorB.toLowerCase();

            if (valorA < valorB) return ordemAtual.direcao === 'asc' ? -1 : 1;
            if (valorA > valorB) return ordemAtual.direcao === 'asc' ? 1 : -1;
            return 0;
        });

        renderizarHTMLVendas();
    };

    // 3. Renderizar Tabela de Vendas (Visual Padronizado)
    const renderizarHTMLVendas = () => {
        areaRelatorio.innerHTML = '';
        
        const headerTitulo = document.createElement('h2');
        headerTitulo.className = "text-2xl font-bold text-gray-800 mb-4";
        headerTitulo.textContent = "Relatório de Vendas Realizadas";
        areaRelatorio.appendChild(headerTitulo);

        if (vendasCache.length === 0) {
            areaRelatorio.innerHTML += '<div class="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">Nenhuma venda encontrada neste período.</div>';
            return;
        }

        const getIcon = (col) => {
            if (ordemAtual.coluna !== col) return '<span class="text-gray-300 ml-1 text-[10px]">⇅</span>';
            return ordemAtual.direcao === 'asc' ? '<span class="text-blue-600 ml-1 text-[10px]">▲</span>' : '<span class="text-blue-600 ml-1 text-[10px]">▼</span>';
        };

        let html = `
        <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div class="overflow-y-auto max-h-[500px] custom-scrollbar"> 
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors th-ordenavel" data-ordenar="id">
                                # ${getIcon('id')}
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors th-ordenavel" data-ordenar="data">
                                Data ${getIcon('data')}
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors th-ordenavel" data-ordenar="cliente_nome">
                                Cliente ${getIcon('cliente_nome')}
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors th-ordenavel" data-ordenar="forma_pagamento">
                                Pagamento ${getIcon('forma_pagamento')}
                            </th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors th-ordenavel" data-ordenar="total">
                                Total ${getIcon('total')}
                            </th>
                            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
        `;

        vendasCache.forEach(v => {
            // CORREÇÃO: Usando a função auxiliar para data e hora
            const dataFormatada = formatarDataLocal(v.data).split(' ')[0]; // Pega só a data para a tabela

            html += `
                <tr class="hover:bg-blue-50 transition-colors duration-150 border-b border-gray-100 last:border-none">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">${v.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dataFormatada}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${v.cliente_nome || '<span class="text-gray-400 italic">Consumidor Final</span>'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${v.forma_pagamento}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">${formatCurrency(v.total)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button class="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors btn-ver-detalhe" data-id="${v.id}">
                            Detalhes
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div></div>`;
        
        const totalGeral = vendasCache.reduce((acc, curr) => acc + curr.total, 0);
        html += `<div class="mt-4 text-right text-gray-600 font-medium">Total: <span class="text-xl text-gray-800 font-bold">${formatCurrency(totalGeral)}</span></div>`;

        areaRelatorio.innerHTML += html;

        // --- REBIND DOS EVENTOS ---
        document.querySelectorAll('.th-ordenavel').forEach(th => {
            th.addEventListener('click', () => {
                const coluna = th.getAttribute('data-ordenar');
                ordenarDados(coluna);
            });
        });

        document.querySelectorAll('.btn-ver-detalhe').forEach(btn => {
            btn.addEventListener('click', (e) => verDetalhesVenda(e.target.dataset.id));
        });

        // Adiciona o botão de imprimir passando o HTML gerado
        adicionarBotaoImprimir("Relatório de Vendas", html);
    };

    // 4. Execução da Busca
    const executarRelatorioVendas = async () => {
        const dataInicio = inputDataInicio.value;
        const dataFim = inputDataFim.value;
        
        btnGerarVendas.disabled = true;
        btnGerarVendas.textContent = "A gerar...";
        areaRelatorio.innerHTML = '<p class="text-center text-gray-500">A carregar vendas...</p>';
        
        try {
            const res = await fetch(`${API_URL}/relatorios/vendas?data_inicio=${dataInicio}&data_fim=${dataFim}`);
            const dados = await res.json();
            if(!res.ok) throw new Error(dados.message);
            
            // Inicializa Cache e Renderiza
            vendasCache = dados;
            ordemAtual = { coluna: 'data', direcao: 'desc' };
            renderizarHTMLVendas();

        } catch (err) {
            console.error(err);
            alert('Erro ao gerar relatório de vendas.');
            areaRelatorio.innerHTML = `<p class="text-center text-red-500">Erro: ${err.message}</p>`;
        } finally {
            btnGerarVendas.disabled = false;
            btnGerarVendas.textContent = "Relatório de Vendas";
        }
    };

    // --- EVENT LISTENERS GERAIS ---
    formDRE.addEventListener('submit', async (e) => { e.preventDefault(); executarRelatorioDRE(); });
    btnGerarProdutos.addEventListener('click', executarRelatorioProdutos);
    btnGerarStock.addEventListener('click', executarRelatorioStockBaixo);
    if(btnGerarVendas) btnGerarVendas.addEventListener('click', executarRelatorioVendas);
    if(btnFecharDetalhes) btnFecharDetalhes.addEventListener('click', () => modalDetalhes.classList.add('modal-oculto'));

    // --- INICIALIZAÇÃO DATA ---
    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    inputDataInicio.value = inicioDoMes.toISOString().split('T')[0];
    inputDataFim.value = hoje.toISOString().split('T')[0];
});