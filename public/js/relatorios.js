document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'http://localhost:3002/api';

    // --- VARIÁVEIS GLOBAIS (CACHE E ORDEM) ---
    let vendasCache = [];
    let ordemVendas = { coluna: 'data', direcao: 'desc' };

    let produtosCache = [];
    let ordemProdutos = { coluna: 'lucroBruto', direcao: 'desc' };

    let performanceCache = [];
    let ordemPerformance = { coluna: 'total_faturado', direcao: 'desc' };

    let servicosCache = [];
    let ordemServicos = { coluna: 'total', direcao: 'desc' };

    let clientesCache = [];
    let ordemClientes = { coluna: 'total_gasto', direcao: 'desc' };

    let stockCache = [];
    let ordemStock = { coluna: 'falta', direcao: 'desc' };

    let extratoAtual = { vendedor: '', vendas: [], taxa: 10 };

    // --- ELEMENTOS DO DOM ---
    const formDRE = document.getElementById('form-relatorio-dre');
    const btnGerarDRE = document.getElementById('btn-gerar-dre');
    const btnGerarProdutos = document.getElementById('btn-gerar-produtos');
    const btnGerarStock = document.getElementById('btn-gerar-stock');
    const btnGerarVendas = document.getElementById('btn-gerar-vendas');
    const btnGerarServicos = document.getElementById('btn-gerar-servicos');
    const btnGerarClientes = document.getElementById('btn-gerar-clientes');
    const btnGerarPerformance = document.getElementById('btn-gerar-performance');
    const btnGerarAuditoria = document.getElementById('btn-gerar-auditoria'); 
    
    const inputDataInicio = document.getElementById('data-inicio');
    const inputDataFim = document.getElementById('data-fim');
    const areaRelatorio = document.getElementById('area-relatorio');
    const feedbackAlert = document.getElementById('feedback-alert');
    const modalDetalhes = document.getElementById('modal-detalhes-venda');
    const btnFecharDetalhes = document.getElementById('btn-fechar-detalhes');

    // --- INJEÇÃO DO MODAL DE EXTRATO ---
    if (!document.getElementById('modal-extrato-vendedor')) {
        const modalHtml = `
        <div id="modal-extrato-vendedor" class="fixed inset-0 bg-gray-900 bg-opacity-50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 relative flex flex-col max-h-[90vh]">
                <button id="btn-fechar-extrato" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                <h3 class="text-2xl font-bold text-gray-800 mb-2">Extrato de Vendas</h3>
                <p id="extrato-subtitulo" class="text-gray-600 mb-4">Detalhamento por vendedor</p>
                <div class="overflow-auto flex-1 border border-gray-200 rounded">
                    <table class="w-full text-sm text-left border-collapse">
                        <thead class="bg-gray-100 sticky top-0 text-gray-700">
                            <tr><th class="p-3">#</th><th class="p-3">Data</th><th class="p-3">Cliente</th><th class="p-3">Pagamento</th><th class="p-3 text-right">Total</th></tr>
                        </thead>
                        <tbody id="lista-extrato-vendedor" class="divide-y divide-gray-100 bg-white"></tbody>
                        <tfoot class="bg-gray-50 font-bold sticky bottom-0">
                            <tr><td colspan="4" class="p-3 text-right">TOTAL FATURADO:</td><td id="extrato-total-final" class="p-3 text-right text-green-700">R$ 0,00</td></tr>
                        </tfoot>
                    </table>
                    <div class="bg-gray-100 p-4 border-b flex flex-wrap justify-between items-center gap-4">
                        <div class="flex items-center gap-4 bg-white p-2 rounded shadow-sm border">
                            <label class="text-gray-700 font-bold text-sm">Taxas RH (%):</label>
                            <div class="flex items-center gap-1 border-r pr-3">
                                <span class="text-xs text-blue-600 font-bold">PROD</span>
                                <input type="text" id="input-taxa-prod" value="0" disabled class="w-12 border rounded p-1 text-center font-bold text-gray-600 bg-gray-200 cursor-not-allowed">
                            </div>
                            <div class="flex items-center gap-1">
                                <span class="text-xs text-purple-600 font-bold">SERV</span>
                                <input type="text" id="input-taxa-serv" value="0" disabled class="w-12 border rounded p-1 text-center font-bold text-gray-600 bg-gray-200 cursor-not-allowed">
                            </div>
                        </div>
                        <button id="btn-imprimir-extrato" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded shadow flex items-center gap-2 transition transform active:scale-95">
                            🖨️ Imprimir Recibo
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    const modalExtrato = document.getElementById('modal-extrato-vendedor');
    const btnFecharExtrato = document.getElementById('btn-fechar-extrato');
    const btnImprimirExtrato = document.getElementById('btn-imprimir-extrato'); 

    if(btnFecharExtrato) btnFecharExtrato.onclick = () => modalExtrato.classList.add('hidden');
    modalExtrato.onclick = (e) => { if(e.target === modalExtrato) modalExtrato.classList.add('hidden'); };

    // --- HELPER FUNCTIONS ---
    const setCarregando = (btn, estado) => {
        if (!btn) return;
        if (estado) {
            btn.dataset.originalContent = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<span class="animate-pulse">⏳</span> ...`;
        } else {
            btn.disabled = false;
            if (btn.dataset.originalContent) btn.innerHTML = btn.dataset.originalContent;
        }
    };

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(value) || 0);

    const formatarDataLocal = (dataString) => {
        if (!dataString) return '-';
        let dataLimpa = dataString.replace('T', ' ').replace('Z', '');
        let [dataPart, horaPart] = dataLimpa.split(' ');
        if (!dataPart) return dataString;
        let [ano, mes, dia] = dataPart.split('-');
        if (horaPart) { horaPart = horaPart.split('.')[0]; return `${dia}/${mes}/${ano} ${horaPart}`; }
        return `${dia}/${mes}/${ano}`;
    };

    const getArrow = (atual, col) => atual.coluna === col ? (atual.direcao === 'asc' ? ' ▲' : ' ▼') : '';

    const ordenarArray = (dados, ordem) => {
        dados.sort((a, b) => {
            let valA = a[ordem.coluna];
            let valB = b[ordem.coluna];
            if (!isNaN(parseFloat(valA)) && isFinite(valA) && typeof valA !== 'string') {
                valA = parseFloat(valA); valB = parseFloat(valB);
            } else {
                valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase();
            }
            if (valA < valB) return ordem.direcao === 'asc' ? -1 : 1;
            if (valA > valB) return ordem.direcao === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const showAlert = (message, isSuccess = true) => {
        if(feedbackAlert) {
            feedbackAlert.textContent = message;
            feedbackAlert.style.display = 'block';
            feedbackAlert.className = isSuccess ? 'p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg' : 'p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg';
            setTimeout(() => feedbackAlert.style.display = 'none', 5000);
        } else { alert(message); }
    };

    const adicionarBotaoImprimir = (tituloRelatorio, conteudoHTML) => {
        const btnImprimir = document.createElement('button');
        btnImprimir.innerHTML = '&#128424; Imprimir / Salvar PDF'; 
        btnImprimir.className = 'bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-6 rounded-lg shadow-lg mt-6 transition-transform active:scale-95';

        btnImprimir.addEventListener('click', async () => {
            let dadosEmpresa = { nome_fantasia: 'Minha Oficina', endereco: '' };
            try { const r = await fetch(`${API_URL}/empresa`); if(r.ok) dadosEmpresa = await r.json(); } catch(e){}

            const template = document.getElementById('relatorio-template');
            let htmlBase = '';
            
            if (template) {
                const clone = template.content.cloneNode(true);
                clone.querySelector('[data-relatorio="empresa-nome"]').textContent = dadosEmpresa.nome_fantasia;
                clone.querySelector('[data-relatorio="empresa-endereco"]').textContent = dadosEmpresa.endereco || '';
                
                let periodo = "Período Completo";
                if (inputDataInicio.value && inputDataFim.value) {
                    const dInicio = new Date(inputDataInicio.value).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
                    const dFim = new Date(inputDataFim.value).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
                    periodo = `${dInicio} a ${dFim}`;
                }
                clone.querySelector('[data-relatorio="titulo"]').textContent = tituloRelatorio;
                clone.querySelector('[data-relatorio="periodo"]').textContent = periodo;
                clone.getElementById('relatorio-conteudo-pdf').innerHTML = conteudoHTML;
                htmlBase = new XMLSerializer().serializeToString(clone);
            } else {
                htmlBase = `<html><body><h1>${tituloRelatorio}</h1>${conteudoHTML}</body></html>`;
            }

            const filename = `${tituloRelatorio.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

            if (window.electronAPI) window.electronAPI.send('print-to-pdf', { html: htmlBase, name: filename });
            else {
                const win = window.open('', '', 'width=900,height=600');
                win.document.write(htmlBase);
                win.document.close();
                win.print();
            }
        });
        areaRelatorio.appendChild(btnImprimir);
    };

    // --- IMPRESSÃO FINAL (RELATÓRIOS COM VENCIMENTO) ---
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
            itensHtml += `<tr>
                <td style="border-bottom:1px solid #eee; padding:8px;">${nome}</td>
                <td style="border-bottom:1px solid #eee; padding:8px; text-align:center;">${qtd}</td>
                <td style="border-bottom:1px solid #eee; padding:8px; text-align:right;">${formatCurrency(valUnit)}</td>
                <td style="border-bottom:1px solid #eee; padding:8px; text-align:right;">${formatCurrency(subtotal)}</td>
            </tr>`;
        });

        let nomeForma = venda.forma_pagamento || 'Dinheiro';
        nomeForma = nomeForma.replace(/Fiado/gi, '').replace('/', '').trim(); 
        if(nomeForma === '') nomeForma = 'A Prazo';

        const parcelas = venda.num_parcelas || 1;
        if (parcelas > 1) {
            const valorParcela = venda.total / parcelas;
            nomeForma += ` (${parcelas}x de ${formatCurrency(valorParcela)})`;
        }

        // --- LÓGICA VENCIMENTO (API PODE MANDAR snake_case OU PascalCase) ---
        let htmlVencimento = '';
        // Verifica se existe data_vencimento ou DataVencimento
        const dtVenc = venda.data_vencimento || venda.DataVencimento;
        
        if (dtVenc) {
            let dataFormatada = '';
            // Se já vier formatada ou ISO, tratamos aqui
            if (dtVenc.includes('-')) {
                const [ano, mes, dia] = dtVenc.split('T')[0].split('-'); // Tira o tempo se tiver
                dataFormatada = `${dia}/${mes}/${ano}`;
            } else {
                dataFormatada = new Date(dtVenc).toLocaleDateString('pt-BR');
            }
            
            htmlVencimento = `<div class="row" style="color: #c02424; font-weight: bold; border-top: 1px dashed #ddd; margin-top:5px; padding-top:5px;"><span>Vencimento:</span><span>${dataFormatada}</span></div>`;
        }
        // -------------------------------------------------------------

        let htmlAcrescimo = '';
        if (venda.acrescimo_valor && venda.acrescimo_valor > 0) {
            htmlAcrescimo = `<div class="row" style="color: #b91c1c;"><span>(+) Juros/Acréscimo:</span><span>${formatCurrency(venda.acrescimo_valor)}</span></div>`;
        }

        const htmlContent = `<html><head><meta charset="UTF-8"><title>Recibo</title><style>
            body{font-family:'Helvetica',sans-serif;padding:40px;font-size:14px;color:#333;line-height:1.4}
            .header{border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:25px;display:flex;justify-content:space-between}
            .header h1{margin:0;font-size:24px;text-transform:uppercase;color:#000}
            .info-empresa p{margin:2px 0;font-size:13px;color:#555}
            .info-recibo{text-align:right}
            .info-recibo h2{margin:0;font-size:18px;color:#333}
            .box-cliente{background:#f9f9f9;padding:10px;border-radius:5px;border:1px solid #eee;margin-bottom:20px}
            table{width:100%;border-collapse:collapse;margin-bottom:20px}
            th{text-align:left;border-bottom:2px solid #333;padding:8px;font-weight:bold;font-size:12px;text-transform:uppercase}
            .totals{width:250px;margin-left:auto;background:#f9f9f9;padding:15px;border-radius:5px;border:1px solid #eee}
            .row{display:flex;justify-content:space-between;margin-bottom:5px}
            .final{border-top:2px solid #333;margin-top:10px;padding-top:10px;font-size:18px;font-weight:bold;color:#000}
            .footer{text-align:center;margin-top:50px;font-size:11px;color:#999;border-top:1px dashed #ddd;padding-top:10px}
        </style></head><body>
            
            <div class="header">
                <div class="info-empresa">
                    <h1>${emp.nome_fantasia}</h1>
                    <p>${emp.endereco || ''}</p>
                    <p><strong>WhatsApp / Tel:</strong> ${emp.telefone || ''}</p>
                </div>
                <div class="info-recibo">
                    <h2>RECIBO #${venda.id}</h2>
                    <p>${new Date(venda.data).toLocaleDateString('pt-BR')}</p>
                </div>
            </div>

            <div class="box-cliente">
                <strong>Cliente:</strong> ${venda.cliente_nome || 'Consumidor Final'}
            </div>

            <table><thead><tr><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead><tbody>${itensHtml}</tbody></table>
            
            <div class="totals">
                <div class="row"><span>Subtotal:</span><span>${formatCurrency(venda.subtotal || (venda.total - (venda.acrescimo_valor||0) + (venda.desconto_valor||0)))}</span></div>
                <div class="row"><span>(-) Desconto:</span><span>- ${formatCurrency(venda.desconto_valor || 0)}</span></div>
                ${htmlAcrescimo}
                <div class="row"><span>Pagamento:</span><span>${nomeForma}</span></div>
                
                ${htmlVencimento}

                <div class="row final"><span>TOTAL:</span><span>${formatCurrency(venda.total)}</span></div>
            </div>
            
            <div class="footer"><p>Obrigado pela preferência!</p></div></body></html>`;

        if (window.electronAPI) window.electronAPI.send('print-to-pdf', { html: htmlContent, name: nomeArquivo });
        else { const w = window.open('', '', 'width=800,height=600'); w.document.write(htmlContent); w.document.close(); w.print(); }
    };

    // --- DETALHES VENDA MODAL ---
    window.verDetalhesVenda = async (id) => {
        try {
            const res = await fetch(`${API_URL}/relatorios/vendas/${id}`);
            const venda = await res.json();
            
            document.getElementById('detalhe-id').textContent = venda.id;
            document.getElementById('detalhe-data').textContent = formatarDataLocal(venda.data);
            
            let infoExtra = '';
            if (venda.os_id) infoExtra += ` <span class="bg-blue-100 text-blue-800 px-2 rounded text-xs ml-2">OS #${venda.os_id}</span>`;
            if (venda.vendedor_nome) infoExtra += ` <span class="text-xs text-gray-500 ml-2">Vend: ${venda.vendedor_nome}</span>`;
            document.getElementById('detalhe-cliente').innerHTML = (venda.cliente_nome || 'Consumidor') + infoExtra;
            
            // Pagamento com parcelas
            let pagtoTexto = venda.forma_pagamento || '-';
            if (venda.num_parcelas > 1) {
                const valParcela = venda.total / venda.num_parcelas;
                pagtoTexto += ` (${venda.num_parcelas}x de ${formatCurrency(valParcela)})`;
            }
            document.getElementById('detalhe-pagamento').textContent = pagtoTexto;
            
            const lista = document.getElementById('detalhe-lista-itens'); 
            lista.innerHTML = '';
            const todosItens = [...(venda.itens || []), ...(venda.servicos || [])];
            todosItens.forEach(i => {
                const sub = i.subtotal || (i.quantidade * (i.valor_unitario || i.valor));
                lista.innerHTML += `<li class="flex justify-between border-b py-1"><span>${i.quantidade}x ${i.nome}</span><span class="font-mono">${formatCurrency(sub)}</span></li>`;
            });
            
            const subCalc = venda.subtotal || (venda.total - (venda.acrescimo_valor||0) + (venda.desconto_valor||0));
            if(document.getElementById('detalhe-subtotal')) document.getElementById('detalhe-subtotal').textContent = `Subtotal: ${formatCurrency(subCalc)}`;
            if(document.getElementById('detalhe-desconto')) document.getElementById('detalhe-desconto').textContent = venda.desconto_valor ? `Desconto: - ${formatCurrency(venda.desconto_valor)}` : '';
            
            // Juros dinâmico no modal
            const elTotal = document.getElementById('detalhe-total');
            const jurosAnt = document.getElementById('detalhe-acrescimo-dinamico');
            if(jurosAnt) jurosAnt.remove();

            if (venda.acrescimo_valor > 0 && elTotal) {
                const divJuros = document.createElement('div');
                divJuros.id = 'detalhe-acrescimo-dinamico';
                divJuros.className = "text-right text-red-600 font-bold mb-1";
                divJuros.innerHTML = `Juros/Acréscimo: + ${formatCurrency(venda.acrescimo_valor)}`;
                elTotal.parentNode.insertBefore(divJuros, elTotal);
            }
            if(elTotal) elTotal.textContent = formatCurrency(venda.total);
            
            const btnImp = document.getElementById('btn-imprimir-recibo-modal');
            const novoBtn = btnImp.cloneNode(true); 
            btnImp.parentNode.replaceChild(novoBtn, btnImp);
            novoBtn.addEventListener('click', () => imprimirReciboIndividual(venda));

            modalDetalhes.classList.remove('hidden'); 
            modalDetalhes.style.display = 'flex';
            modalDetalhes.style.zIndex = '9999';
        } catch(e) { console.error(e); alert("Erro detalhes."); }
    };
    if(btnFecharDetalhes) btnFecharDetalhes.onclick = () => { modalDetalhes.classList.add('hidden'); modalDetalhes.style.display='none'; };

    // =========================================
    // RELATÓRIOS (Lógica Completa Restaurada)
    // =========================================

    // 1. RELATÓRIO DE VENDAS
    const renderizarTabelaVendas = () => {
        areaRelatorio.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-gray-800">Relatório de Vendas Realizadas</h2>`;
        if (vendasCache.length === 0) { areaRelatorio.innerHTML += '<p class="text-gray-500">Nenhuma venda encontrada.</p>'; return; }
        ordenarArray(vendasCache, ordemVendas);
        let html = `<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"><div class="overflow-auto h-[400px]"><table class="w-full report-table"><thead class="bg-gray-100 sticky top-0"><tr>
        <th class="p-3 cursor-pointer" onclick="window.ordenarVendas('id')">#${getArrow(ordemVendas,'id')}</th>
        <th class="p-3 cursor-pointer" onclick="window.ordenarVendas('data')">Data${getArrow(ordemVendas,'data')}</th>
        <th class="p-3 cursor-pointer" onclick="window.ordenarVendas('cliente_nome')">Cliente${getArrow(ordemVendas,'cliente_nome')}</th>
        <th class="p-3 cursor-pointer" onclick="window.ordenarVendas('vendedor_nome')">Vendedor${getArrow(ordemVendas,'vendedor_nome')}</th>
        <th class="p-3 cursor-pointer" onclick="window.ordenarVendas('forma_pagamento')">Pagamento${getArrow(ordemVendas,'forma_pagamento')}</th>
        <th class="p-3 text-right cursor-pointer" onclick="window.ordenarVendas('total')">Total${getArrow(ordemVendas,'total')}</th>
        <th class="p-3 text-center">Ações</th></tr></thead><tbody>`;
        
        vendasCache.forEach(v => {
            const dataF = formatarDataLocal(v.data).split(' ')[0];
            let pagto = v.forma_pagamento || '-';
            if (v.num_parcelas > 1) pagto += ` (${v.num_parcelas}x)`;
            const vendedor = v.vendedor_nome ? `<span class="bg-pink-100 text-pink-800 text-xs font-bold px-2 py-1 rounded">${v.vendedor_nome}</span>` : '-';
            html += `<tr class="hover:bg-blue-50 transition-colors"><td class="p-3">${v.id}</td><td class="p-3">${dataF}</td><td class="p-3">${v.cliente_nome||'Consumidor'}</td><td class="p-3">${vendedor}</td><td class="p-3">${pagto}</td><td class="p-3 text-right font-bold">${formatCurrency(v.total)}</td><td class="p-3 text-center"><button class="text-blue-600 bg-blue-50 px-2 py-1 rounded font-bold text-xs btn-detalhes" data-id="${v.id}">Detalhes</button></td></tr>`;
        });
        html += `</tbody></table></div></div>`;
        html += `<div class="mt-4 text-right text-xl font-bold border-t pt-4">Total: ${formatCurrency(vendasCache.reduce((a,c)=>a+c.total,0))}</div>`;
        areaRelatorio.innerHTML += html;
        document.querySelectorAll('.btn-detalhes').forEach(btn => btn.addEventListener('click', (e) => verDetalhesVenda(e.target.dataset.id)));
        adicionarBotaoImprimir("Relatório de Vendas", html);
    };
    window.ordenarVendas = (c) => { ordemVendas.direcao = (ordemVendas.coluna === c && ordemVendas.direcao === 'asc') ? 'desc' : 'asc'; ordemVendas.coluna = c; renderizarTabelaVendas(); };

    // 2. PERFORMANCE VENDEDORES
    const renderizarTabelaPerformance = () => {
        areaRelatorio.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-gray-800">Performance da Equipe</h2>`;
        areaRelatorio.innerHTML += `<p class="text-sm text-gray-500 mb-4">💡 Clique no nome do vendedor para ver a lista detalhada de vendas.</p>`;
        if (performanceCache.length === 0) { areaRelatorio.innerHTML += '<p class="text-gray-500">Nenhum dado.</p>'; return; }
        performanceCache.sort((a,b) => b.total_faturado - a.total_faturado);
        let html = `<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"><div class="overflow-auto h-[400px]"><table class="w-full report-table"><thead class="bg-pink-50 sticky top-0"><tr><th class="p-3">Vendedor</th><th class="p-3 text-center">Qtd. Vendas</th><th class="p-3 text-right">Faturado ▼</th></tr></thead><tbody>`;
        performanceCache.forEach((d, i) => {
            const medalha = i === 0 ? '🥇 ' : (i === 1 ? '🥈 ' : (i === 2 ? '🥉 ' : ''));
            html += `<tr class="border-b hover:bg-blue-100 cursor-pointer transition-colors" onclick="window.verExtratoVendedor('${d.vendedor}')" title="Clique para ver lista de vendas"><td class="p-3 font-bold text-gray-700">${medalha}${d.vendedor}</td><td class="p-3 text-center text-lg">${d.total_vendas}</td><td class="p-3 text-right text-lg font-bold text-green-700">${formatCurrency(d.total_faturado)}</td></tr>`;
        });
        html += `</tbody></table></div></div>`;
        areaRelatorio.innerHTML += html;
    };

    // 3. TOP PRODUTOS
    const renderizarTabelaProdutos = () => {
        areaRelatorio.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-gray-800">Top Produtos</h2>`;
        if (produtosCache.length === 0) { areaRelatorio.innerHTML += '<p class="text-gray-500">Nenhum dado.</p>'; return; }
        ordenarArray(produtosCache, ordemProdutos);
        let html = `<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"><div class="overflow-auto h-[400px]"><table class="w-full report-table"><thead class="bg-gray-100 sticky top-0"><tr><th class="p-3 cursor-pointer" onclick="window.ordenarProdutos('nome')">Produto${getArrow(ordemProdutos,'nome')}</th><th class="p-3 text-center cursor-pointer" onclick="window.ordenarProdutos('totalVendido')">Qtd${getArrow(ordemProdutos,'totalVendido')}</th><th class="p-3 text-right cursor-pointer" onclick="window.ordenarProdutos('faturamentoBruto')">Faturamento${getArrow(ordemProdutos,'faturamentoBruto')}</th><th class="p-3 text-right cursor-pointer" onclick="window.ordenarProdutos('lucroBruto')">Lucro${getArrow(ordemProdutos,'lucroBruto')}</th></tr></thead><tbody>`;
        produtosCache.forEach(p => { html += `<tr class="border-b hover:bg-gray-50"><td class="p-3 font-medium">${p.nome}</td><td class="p-3 text-center">${p.totalVendido}</td><td class="p-3 text-right">${formatCurrency(p.faturamentoBruto)}</td><td class="p-3 text-right font-bold text-green-600">${formatCurrency(p.lucroBruto)}</td></tr>`; });
        html += `</tbody></table></div></div>`;
        areaRelatorio.innerHTML += html;
        adicionarBotaoImprimir("Top Produtos", html);
    };
    window.ordenarProdutos = (c) => { ordemProdutos.direcao = (ordemProdutos.coluna === c && ordemProdutos.direcao === 'asc') ? 'desc' : 'asc'; ordemProdutos.coluna = c; renderizarTabelaProdutos(); };

    // 4. RANKING SERVIÇOS
    const renderizarTabelaServicos = () => {
        areaRelatorio.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-gray-800">Ranking Serviços</h2>`;
        if (servicosCache.length === 0) { areaRelatorio.innerHTML += '<p class="text-gray-500">Nenhum dado.</p>'; return; }
        ordenarArray(servicosCache, ordemServicos);
        let html = `<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"><div class="overflow-auto h-[400px]"><table class="w-full report-table"><thead class="bg-gray-100 sticky top-0"><tr><th class="p-3 cursor-pointer" onclick="window.ordenarServicos('nome')">Serviço${getArrow(ordemServicos,'nome')}</th><th class="p-3 text-center cursor-pointer" onclick="window.ordenarServicos('quantidade')">Qtd.${getArrow(ordemServicos,'quantidade')}</th><th class="p-3 text-right cursor-pointer" onclick="window.ordenarServicos('total')">Total Gerado${getArrow(ordemServicos,'total')}</th></tr></thead><tbody>`;
        servicosCache.forEach(s => { html += `<tr class="border-b hover:bg-gray-50"><td class="p-3 font-medium">${s.nome}</td><td class="p-3 text-center">${s.quantidade}</td><td class="p-3 text-right font-bold text-blue-600">${formatCurrency(s.total)}</td></tr>`; });
        html += `</tbody></table></div></div>`;
        areaRelatorio.innerHTML += html;
        adicionarBotaoImprimir("Ranking Serviços", html);
    };
    window.ordenarServicos = (c) => { ordemServicos.direcao = (ordemServicos.coluna === c && ordemServicos.direcao === 'asc') ? 'desc' : 'asc'; ordemServicos.coluna = c; renderizarTabelaServicos(); };

    // 5. TOP CLIENTES
    const renderizarTabelaClientes = () => {
        areaRelatorio.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-gray-800">Top Clientes</h2>`;
        if (clientesCache.length === 0) { areaRelatorio.innerHTML += '<p class="text-gray-500">Nenhum dado.</p>'; return; }
        ordenarArray(clientesCache, ordemClientes);
        let html = `<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"><div class="overflow-auto h-[400px]"><table class="w-full report-table"><thead class="bg-gray-100 sticky top-0"><tr><th class="p-3 cursor-pointer" onclick="window.ordenarClientes('nome')">Cliente${getArrow(ordemClientes,'nome')}</th><th class="p-3 text-center cursor-pointer" onclick="window.ordenarClientes('numero_vendas')">Compras${getArrow(ordemClientes,'numero_vendas')}</th><th class="p-3 text-right cursor-pointer" onclick="window.ordenarClientes('total_gasto')">Total Gasto${getArrow(ordemClientes,'total_gasto')}</th></tr></thead><tbody>`;
        clientesCache.forEach(c => { html += `<tr class="border-b hover:bg-gray-50"><td class="p-3 font-medium">${c.nome}</td><td class="p-3 text-center">${c.numero_vendas}</td><td class="p-3 text-right font-bold text-green-600">${formatCurrency(c.total_gasto)}</td></tr>`; });
        html += `</tbody></table></div></div>`;
        areaRelatorio.innerHTML += html;
        adicionarBotaoImprimir("Top Clientes", html);
    };
    window.ordenarClientes = (c) => { ordemClientes.direcao = (ordemClientes.coluna === c && ordemClientes.direcao === 'asc') ? 'desc' : 'asc'; ordemClientes.coluna = c; renderizarTabelaClientes(); };

    // 6. STOCK BAIXO
    const renderizarTabelaStock = () => {
        areaRelatorio.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-gray-800">Stock Baixo</h2>`;
        if (stockCache.length === 0) { areaRelatorio.innerHTML += '<div class="p-4 bg-green-100 text-green-800 rounded">✅ Tudo OK!</div>'; return; }
        ordenarArray(stockCache, ordemStock);
        let html = `<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"><div class="overflow-auto h-[400px]"><table class="w-full report-table"><thead class="bg-red-50 sticky top-0"><tr><th class="p-3 cursor-pointer" onclick="window.ordenarStock('nome')">Produto${getArrow(ordemStock,'nome')}</th><th class="p-3 text-center cursor-pointer" onclick="window.ordenarStock('quantidade_em_estoque')">Atual${getArrow(ordemStock,'quantidade_em_estoque')}</th><th class="p-3 text-center cursor-pointer" onclick="window.ordenarStock('stock_minimo')">Mínimo${getArrow(ordemStock,'stock_minimo')}</th><th class="p-3 text-center cursor-pointer" onclick="window.ordenarStock('falta')">Falta${getArrow(ordemStock,'falta')}</th></tr></thead><tbody>`;
        stockCache.forEach(p => { html += `<tr class="border-b hover:bg-gray-50"><td class="p-3 font-medium">${p.nome}</td><td class="p-3 text-center text-red-600 font-bold">${p.quantidade_em_estoque}</td><td class="p-3 text-center">${p.stock_minimo}</td><td class="p-3 text-center font-bold">${p.falta}</td></tr>`; });
        html += `</tbody></table></div></div>`;
        areaRelatorio.innerHTML += html;
        adicionarBotaoImprimir("Stock Baixo", html);
    };
    window.ordenarStock = (c) => { ordemStock.direcao = (ordemStock.coluna === c && ordemStock.direcao === 'asc') ? 'desc' : 'asc'; ordemStock.coluna = c; renderizarTabelaStock(); };

    // --- FUNÇÕES DE EXTRATO VENDEDOR ---
    const renderizarDadosExtrato = () => {
        const listaEl = document.getElementById('lista-extrato-vendedor');
        const totalFooterEl = document.getElementById('extrato-total-final'); 
        if (!listaEl) return; 
        listaEl.innerHTML = '';
        let somaComissao = 0;
        const txProd = (extratoAtual.taxa_prod || 0) / 100;
        const txServ = (extratoAtual.taxa_serv || 0) / 100;

        extratoAtual.vendas.forEach(v => {
            const comissao = (v.total_prod_venda * txProd) + (v.total_serv_venda * txServ);
            somaComissao += comissao;
            listaEl.innerHTML += `<tr class="hover:bg-blue-50 cursor-pointer border-b" onclick="verDetalhesVenda(${v.id})"><td class="p-4">#${v.id}</td><td class="p-4">${formatarDataLocal(v.data)}</td><td class="p-4">${v.cliente_nome}</td><td class="p-4">${v.forma_pagamento}</td><td class="p-4 text-right">${formatCurrency(v.total)}</td></tr>`;
        });
        if(totalFooterEl) totalFooterEl.textContent = formatCurrency(somaComissao); 
    };

    window.verExtratoVendedor = async (nomeVendedor) => {
        const dI = inputDataInicio.value; const dF = inputDataFim.value;
        const modal = document.getElementById('modal-extrato-vendedor');
        modal.classList.remove('hidden'); modal.style.display = 'flex';
        
        try {
            const res = await fetch(`${API_URL}/relatorios/vendas?data_inicio=${dI}&data_fim=${dF}&vendedor=${encodeURIComponent(nomeVendedor)}`);
            const vendas = await res.json();
            
            let txProd = 0, txServ = 0;
            if (vendas.length > 0) { txProd = parseFloat(vendas[0].comissao_produto||0); txServ = parseFloat(vendas[0].comissao_servico||0); }
            
            document.getElementById('input-taxa-prod').value = txProd;
            document.getElementById('input-taxa-serv').value = txServ;
            document.getElementById('extrato-subtitulo').innerHTML = `Vendedor: <b>${nomeVendedor}</b>`;

            extratoAtual = { vendedor: nomeVendedor, periodo: `${dI} a ${dF}`, taxa_prod: txProd, taxa_serv: txServ, vendas: vendas };
            renderizarDadosExtrato(); 
        } catch (e) { console.error(e); alert("Erro ao buscar dados."); }
    };

    if(btnImprimirExtrato) {
        btnImprimirExtrato.addEventListener('click', async () => {
            let dadosEmpresa = { nome_fantasia: 'Minha Oficina', endereco: '' };
            try { const r = await fetch(`${API_URL}/empresa`); if(r.ok) dadosEmpresa = await r.json(); } catch(e){}
            const txProd = extratoAtual.taxa_prod || 0; const txServ = extratoAtual.taxa_serv || 0;
            const txProdDec = txProd / 100; const txServDec = txServ / 100;
            let totalVendas = 0; let totalComissao = 0; let linhasTabela = '';

            extratoAtual.vendas.forEach(v => {
                const comissao = (v.total_prod_venda * txProdDec) + (v.total_serv_venda * txServDec);
                totalVendas += v.total; totalComissao += comissao;
                linhasTabela += `<tr><td>${formatarDataLocal(v.data)}</td><td>Venda #${v.id} - ${v.cliente_nome}</td><td style="text-align:right">${formatCurrency(v.total)}</td><td style="text-align:right;font-weight:bold">${formatCurrency(comissao)}</td></tr>`;
            });

            const html = `<html><head><title>Extrato</title><style>body{font-family:sans-serif;padding:30px} table{width:100%;border-collapse:collapse;margin-top:20px} th{text-align:left;border-bottom:1px solid #000} td{padding:5px;border-bottom:1px solid #eee} .totals{text-align:right;margin-top:30px;font-size:16px}</style></head><body>
            <h2 style="text-align:center">${dadosEmpresa.nome_fantasia} - Extrato de Comissões</h2>
            <p><strong>Vendedor:</strong> ${extratoAtual.vendedor}</p><p><strong>Período:</strong> ${extratoAtual.periodo}</p>
            <table><thead><tr><th>Data</th><th>Descrição</th><th align="right">Venda</th><th align="right">Comissão</th></tr></thead><tbody>${linhasTabela}</tbody></table>
            <div class="totals"><p>Total Vendas: ${formatCurrency(totalVendas)}</p><p style="font-weight:bold">Total a Pagar: ${formatCurrency(totalComissao)}</p></div>
            </body></html>`;
            
            if (window.electronAPI) window.electronAPI.send('print-to-pdf', { html: html, name: `Comissao_${extratoAtual.vendedor}.pdf` });
            else { const w = window.open('', '', 'width=900,height=700'); w.document.write(html); w.document.close(); w.print(); }
        });
    }

    // --- FETCHERS ---
    const executarRelatorioVendas = async () => {
        const dI = inputDataInicio.value; const dF = inputDataFim.value;
        if(!dI || !dF) return showAlert("Datas?", false);
        setCarregando(btnGerarVendas, true);
        try {
            const res = await fetch(`${API_URL}/relatorios/vendas?data_inicio=${dI}&data_fim=${dF}`);
            vendasCache = await res.json();
            renderizarTabelaVendas();
        } catch(e) { showAlert(e.message, false); } finally { setCarregando(btnGerarVendas, false); }
    };

    const executarRelatorioPerformance = async () => {
        const dI = inputDataInicio.value; const dF = inputDataFim.value;
        if(!dI || !dF) return showAlert("Datas?", false);
        setCarregando(btnGerarPerformance, true);
        try {
            const res = await fetch(`${API_URL}/relatorios/performance-vendedores?data_inicio=${dI}&data_fim=${dF}`);
            performanceCache = await res.json();
            renderizarTabelaPerformance();
        } catch(e) {} finally { setCarregando(btnGerarPerformance, false); }
    };

    const executarRelatorioProdutos = async () => {
        const dI = inputDataInicio.value; const dF = inputDataFim.value;
        if(!dI || !dF) return showAlert("Datas?", false);
        setCarregando(btnGerarProdutos, true);
        try {
            const res = await fetch(`${API_URL}/relatorios/produtos-mais-vendidos?data_inicio=${dI}&data_fim=${dF}`);
            produtosCache = await res.json();
            renderizarTabelaProdutos();
        } catch(e) {} finally { setCarregando(btnGerarProdutos, false); }
    };

    const executarRelatorioServicos = async () => {
        const dI = inputDataInicio.value; const dF = inputDataFim.value;
        if(!dI || !dF) return showAlert("Datas?", false);
        setCarregando(btnGerarServicos, true);
        try {
            const res = await fetch(`${API_URL}/relatorios/servicos-ranking?data_inicio=${dI}&data_fim=${dF}`);
            servicosCache = await res.json();
            renderizarTabelaServicos();
        } catch(e) {} finally { setCarregando(btnGerarServicos, false); }
    };

    const executarRelatorioClientes = async () => {
        const dI = inputDataInicio.value; const dF = inputDataFim.value;
        if(!dI || !dF) return showAlert("Datas?", false);
        setCarregando(btnGerarClientes, true);
        try {
            const res = await fetch(`${API_URL}/relatorios/clientes-ranking?data_inicio=${dI}&data_fim=${dF}`);
            clientesCache = await res.json();
            renderizarTabelaClientes();
        } catch(e) {} finally { setCarregando(btnGerarClientes, false); }
    };

    const executarRelatorioStockBaixo = async () => {
        setCarregando(btnGerarStock, true);
        try {
            const res = await fetch(`${API_URL}/relatorios/stock-baixo`);
            const dados = await res.json();
            stockCache = dados.map(p => ({...p, falta: p.stock_minimo - p.quantidade_em_estoque}));
            renderizarTabelaStock();
        } catch(e) {} finally { setCarregando(btnGerarStock, false); }
    };

    const executarRelatorioAuditoria = async () => {
        const dI = inputDataInicio.value; const dF = inputDataFim.value;
        if(!dI || !dF) return showAlert("Selecione datas.", false);
        setCarregando(btnGerarAuditoria, true);
        try {
            const res = await fetch(`${API_URL}/relatorios/auditoria-vendas?data_inicio=${dI}&data_fim=${dF}`);
            const dados = await res.json();
            areaRelatorio.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-gray-800">Auditoria de Preços</h2>`;
            if (dados.length === 0) { areaRelatorio.innerHTML += `<div class="bg-green-50 p-4 rounded text-green-800 border border-green-200">✅ Tudo OK!</div>`; return; }
            let html = `<div class="overflow-auto max-h-[500px] shadow-sm border rounded-lg"><table class="w-full text-sm text-left"><thead class="bg-gray-100"><tr><th class="p-3">Vendedor</th><th class="p-3">Item</th><th class="p-3">Qtd</th><th class="p-3 text-right">Tabela</th><th class="p-3 text-right">Vendido</th><th class="p-3 text-right">Desvio</th></tr></thead><tbody>`;
            dados.forEach(d => {
                const cor = d.desvio_total < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold';
                html += `<tr class="border-b"><td class="p-3">${d.vendedor}</td><td class="p-3">${d.item}</td><td class="p-3">${d.quantidade}</td><td class="p-3 text-right">${formatCurrency(d.preco_tabela)}</td><td class="p-3 text-right">${formatCurrency(d.vendido_por)}</td><td class="p-3 text-right ${cor}">${formatCurrency(d.desvio_total)}</td></tr>`;
            });
            html += `</tbody></table></div>`;
            areaRelatorio.innerHTML += html;
            adicionarBotaoImprimir("Auditoria", html);
        } catch(e) { console.error(e); } finally { setCarregando(btnGerarAuditoria, false); }
    };

    const executarRelatorioDRE = async () => {
        const dI = inputDataInicio.value; const dF = inputDataFim.value;
        if (!dI || !dF) return showAlert("Datas?", false);
        setCarregando(btnGerarDRE, true);
        try {
            const res = await fetch(`${API_URL}/financeiro/relatorios/dre?data_inicio=${dI}&data_fim=${dF}`);
            const dreData = await res.json();
            const { TotalReceitas, TotalCMV, LucroBruto, TotalDespesas, LucroLiquido, Receitas, Despesas } = dreData;
            areaRelatorio.innerHTML = `<h2 class="text-2xl font-bold text-gray-800 mb-6">DRE</h2>`;
            let html = '<div class="space-y-4 max-w-4xl mx-auto">';
            html += `<div class="bg-blue-50 p-4 rounded"><h3 class="font-bold text-blue-800">(+) Receita</h3>`;
            Receitas.forEach(r => html += `<div class="flex justify-between text-sm"><span>${r.categoria}</span><span>${formatCurrency(r.total)}</span></div>`);
            html += `<div class="border-t mt-2 pt-2 flex justify-between font-bold"><span>Total</span><span>${formatCurrency(TotalReceitas)}</span></div></div>`;
            html += `<div class="bg-red-50 p-4 rounded"><h3 class="font-bold text-red-800">(-) CMV</h3><div class="flex justify-between font-bold text-red-900"><span>Custo</span><span>${formatCurrency(TotalCMV)}</span></div></div>`;
            html += `<div class="bg-gray-100 p-4 rounded border-l-4 border-gray-500 font-bold flex justify-between"><span>(=) Lucro Bruto</span><span>${formatCurrency(LucroBruto)}</span></div>`;
            html += `<div class="bg-orange-50 p-4 rounded"><h3 class="font-bold text-orange-800">(-) Despesas</h3>`;
            Despesas.forEach(d => html += `<div class="flex justify-between text-sm"><span>${d.categoria}</span><span>${formatCurrency(d.total)}</span></div>`);
            html += `<div class="border-t mt-2 pt-2 flex justify-between font-bold"><span>Total</span><span>${formatCurrency(TotalDespesas)}</span></div></div>`;
            const cor = LucroLiquido >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            html += `<div class="p-6 rounded border-l-4 ${cor} shadow mt-4 flex justify-between"><span class="text-2xl font-bold">(=) Resultado</span><span class="text-3xl font-bold">${formatCurrency(LucroLiquido)}</span></div></div>`;
            areaRelatorio.innerHTML += html;
            adicionarBotaoImprimir("DRE", html);
        } catch (e) { showAlert(e.message, false); } finally { setCarregando(btnGerarDRE, false); }
    };

    // --- INITIALIZATION ---
    const hoje = new Date();
    inputDataInicio.value = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    inputDataFim.value = hoje.toISOString().split('T')[0];

    if(formDRE) formDRE.addEventListener('submit', (e) => { e.preventDefault(); executarRelatorioDRE(); });
    if(btnGerarProdutos) btnGerarProdutos.addEventListener('click', executarRelatorioProdutos);
    if(btnGerarStock) btnGerarStock.addEventListener('click', executarRelatorioStockBaixo);
    if(btnGerarVendas) btnGerarVendas.addEventListener('click', executarRelatorioVendas);
    if(btnGerarServicos) btnGerarServicos.addEventListener('click', executarRelatorioServicos);
    if(btnGerarClientes) btnGerarClientes.addEventListener('click', executarRelatorioClientes);
    if(btnGerarPerformance) btnGerarPerformance.addEventListener('click', executarRelatorioPerformance);
    if(btnGerarAuditoria) btnGerarAuditoria.addEventListener('click', executarRelatorioAuditoria);
});