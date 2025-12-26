document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'http://localhost:3002/api';
    
    // --- ESTADO INICIAL ---
    const urlParams = new URLSearchParams(window.location.search);
    const osIdParaCarregar = urlParams.get('carregar_os');

    let listaClientes = [], listaProdutos = [], listaServicos = [];
    let listaFormasPagamento = [], listaContasCaixa = [];

    let vendaAtual = {
        os_id: null,
        cliente_id: null,
        itens: [],
        total: 0,
        subtotal: 0,
        desconto_tipo: 'R$',
        desconto_valor: 0,
        acrescimo_tipo: '%',
        acrescimo_valor: 0,
        FormaPagamentoID: null,
        ContaCaixaID: null,
        DataVencimento: null,
        numParcelas: 1
    };

    let selectedItems = { cliente: null, produto: null, servico: null };
    let ultimaVendaSalva = null;

    // --- DOM ELEMENTS ---
    const btnAddProduto = document.getElementById('btn-add-produto');
    const btnAddServico = document.getElementById('btn-add-servico');
    const btnFinalizarVenda = document.getElementById('btn-finalizar-venda');
    const itensVendaContainer = document.getElementById('itens-venda-container');
    const carrinhoVazioMsg = document.getElementById('carrinho-vazio-msg');
    const vendaForm = document.getElementById('venda-form');
    const vendaConfirmacaoEl = document.getElementById('venda-confirmacao');
    const confirmacaoTextoEl = document.getElementById('confirmacao-texto');
    const btnNovaVenda = document.getElementById('btn-nova-venda');
    const btnImprimirRecibo = document.getElementById('btn-imprimir-recibo');
    const feedbackAlert = document.getElementById('feedback-alert');

    // Inputs de Quantidade
    const inputProdutoQtd = document.getElementById('input-produto-qtd');
    const inputServicoQtd = document.getElementById('input-servico-qtd');

    // Opcionais
    const inputDescontoValor = document.getElementById('desconto-valor');
    const selectDescontoTipo = document.getElementById('desconto-tipo');
    const blocoDesconto = document.getElementById('bloco-desconto');
    const descontoAplicadoContainer = document.getElementById('desconto-aplicado-container');
    const descontoAplicadoValor = document.getElementById('desconto-aplicado-valor');

    const inputAcrescimoValor = document.getElementById('acrescimo-valor');
    const selectAcrescimoTipo = document.getElementById('acrescimo-tipo');
    const blocoAcrescimo = document.getElementById('bloco-acrescimo');

    const selectFormaPagamento = document.getElementById('select-forma-pagamento');
    const selectContaCaixa = document.getElementById('select-conta-caixa');
    const inputDataVencimento = document.getElementById('input-data-vencimento');
    
    const blocoContaCaixa = document.getElementById('bloco-conta-caixa');
    const blocoDataVencimento = document.getElementById('bloco-data-vencimento');
    const blocoParcelamento = document.getElementById('bloco-parcelamento');
    const selectNumParcelas = document.getElementById('select-num-parcelas');

    // --- CARREGAR DADOS ---
    async function carregarItensDaOS(id) {
        try {
            const res = await fetch(`${API_URL}/os/${id}`);
            if (!res.ok) throw new Error("Erro ao buscar OS");
            const os = await res.json();

            if (os.status === 'Finalizada') alert("Atenção: Esta OS já foi finalizada!");

            vendaAtual.os_id = os.id;

            if (os.cliente_id) {
                vendaAtual.cliente_id = os.cliente_id;
                selectedItems.cliente = os.cliente_id;
                const inputCliente = document.getElementById('input-search-cliente');
                if (inputCliente) inputCliente.value = os.cliente_nome || '';
            }

            if (os.itens) {
                os.itens.forEach(item => {
                    vendaAtual.itens.push({
                        id: item.produto_id, nome: item.nome, tipo: 'produto',
                        quantidade: item.quantidade, precoUnitario: parseFloat(item.valor_unitario || 0),
                        subtotal: item.quantidade * parseFloat(item.valor_unitario || 0)
                    });
                });
            }

            if (os.servicos) {
                os.servicos.forEach(serv => {
                    vendaAtual.itens.push({
                        id: serv.servico_id, nome: serv.nome, tipo: 'serviço',
                        quantidade: serv.quantidade || 1, precoUnitario: parseFloat(serv.valor || 0),
                        subtotal: (serv.quantidade || 1) * parseFloat(serv.valor || 0)
                    });
                });
            }

            renderizarItensVenda();
            showAlert(`OS #${os.id} carregada!`, true);
            window.history.replaceState({}, document.title, window.location.pathname);

        } catch (err) { console.error(err); showAlert("Erro OS: " + err.message, false); }
    }

    if (osIdParaCarregar) carregarItensDaOS(osIdParaCarregar);

    // --- HELPER FUNCTIONS ---
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const showAlert = (msg, success = true) => {
        if (!feedbackAlert) return;
        feedbackAlert.textContent = msg;
        feedbackAlert.className = `p-4 mb-4 text-sm rounded-lg ${success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
        feedbackAlert.classList.remove('hidden');
        setTimeout(() => feedbackAlert.classList.add('hidden'), 3000);
    };

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // --- AUTOCOMPLETE (300ms de delay no foco) ---
    const setupAutocomplete = (inputId, resultsId, type) => {
        const input = document.getElementById(inputId);
        const results = document.getElementById(resultsId);
        if (!input || !results) return;

        let activeIndex = -1;

        const updateActiveItem = () => {
            const items = results.querySelectorAll('.autocomplete-item');
            items.forEach((item, index) => {
                if (index === activeIndex) {
                    item.classList.add('bg-blue-100', 'font-bold'); 
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('bg-blue-100', 'font-bold');
                }
            });
        };

        input.addEventListener('input', debounce(async () => {
            const query = input.value.toLowerCase();
            activeIndex = -1;
            selectedItems[type] = null;
            if (type === 'cliente') vendaAtual.cliente_id = null;

            if (!query) { results.innerHTML = ''; results.classList.add('hidden'); return; }

            try {
                let endpoint = type === 'produto' ? 'produtos' : (type === 'cliente' ? 'clientes' : 'servicos');
                const res = await fetch(`${API_URL}/${endpoint}/search?q=${query}`);
                if (!res.ok) throw new Error('Erro busca');
                const items = await res.json();

                results.innerHTML = ''; results.classList.remove('hidden');
                
                if (items.length === 0) {
                    results.innerHTML = '<div class="p-2 text-gray-500 italic">Nada encontrado.</div>';
                } else {
                    items.forEach((item) => {
                        const div = document.createElement('div');
                        div.className = 'autocomplete-item p-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100'; 
                        
                        if (type === 'cliente') div.textContent = item.nome;
                        else {
                            const p = item.preco_unitario || item.preco || 0;
                            const stk = item.quantidade_em_estoque !== undefined ? ` | Stock: ${item.quantidade_em_estoque}` : '';
                            div.textContent = `${item.nome}${stk} (${formatCurrency(p)})`;
                        }

                        div.addEventListener('click', () => {
                            input.value = item.nome;
                            selectedItems[type] = item.id;
                            if (type === 'cliente') vendaAtual.cliente_id = item.id;
                            results.classList.add('hidden');
                            
                            // Auto-Focus com delay
                            if(type === 'produto') setTimeout(() => document.getElementById('input-produto-qtd')?.focus(), 100);
                            if(type === 'servico') setTimeout(() => document.getElementById('input-servico-qtd')?.focus(), 100);
                        });
                        results.appendChild(div);
                    });
                }
            } catch (e) { console.error(e); }
        }, 300)); 

        input.addEventListener('keydown', (e) => {
            const items = results.querySelectorAll('.autocomplete-item');
            if (results.classList.contains('hidden') || items.length === 0) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = (activeIndex + 1) % items.length; updateActiveItem(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = (activeIndex - 1 + items.length) % items.length; updateActiveItem(); }
            else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex > -1) items[activeIndex].click(); }
            else if (e.key === 'Escape') { results.classList.add('hidden'); }
        });

        document.addEventListener('click', (e) => { if (!e.target.closest('.autocomplete-container')) results.classList.add('hidden'); });
    };

    // --- CARREGAR DADOS ---
    const popularDadosIniciais = async () => {
        try {
            const [cli, formas, contas] = await Promise.all([
                fetch(`${API_URL}/clientes`), fetch(`${API_URL}/financeiro/formaspagamento`), fetch(`${API_URL}/financeiro/contascaixa`)
            ]);
            listaClientes = await cli.json();
            listaFormasPagamento = await formas.json();
            listaContasCaixa = await contas.json();

            if (selectFormaPagamento) {
                selectFormaPagamento.innerHTML = '<option value="">Selecione...</option>';
                listaFormasPagamento.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f.id;
                    let nome = f.Nome;
                    if (nome.includes('Fiado') || f.TipoLancamento === 'A_PRAZO') nome = 'A Prazo';
                    opt.textContent = nome;
                    opt.dataset.tipo = f.TipoLancamento;
                    opt.dataset.aceitaParcelas = f.aceitaParcelas;
                    opt.dataset.maxParcelas = f.maxParcelas;
                    selectFormaPagamento.appendChild(opt);
                });
            }

            if (selectContaCaixa) {
                selectContaCaixa.innerHTML = '<option value="">Selecione...</option>';
                listaContasCaixa.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id; opt.textContent = c.Nome;
                    selectContaCaixa.appendChild(opt);
                });
            }
        } catch (e) { console.error(e); }
    };

    // --- RENDERIZAR CARRINHO ---
    const renderizarItensVenda = () => {
        if (!itensVendaContainer) return;
        itensVendaContainer.innerHTML = '';
        let subtotal = 0;

        if (vendaAtual.itens.length === 0) {
            if (carrinhoVazioMsg) carrinhoVazioMsg.style.display = 'block';
        } else {
            if (carrinhoVazioMsg) carrinhoVazioMsg.style.display = 'none';
            vendaAtual.itens.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'flex justify-between items-center text-sm p-2 bg-gray-50 rounded mb-1';
                div.innerHTML = `
                    <div class="flex-grow">
                        <p class="font-semibold text-gray-800">${item.nome} <span class="text-xs text-gray-500">(${item.tipo})</span></p>
                        <p class="text-gray-600">${item.quantidade} x ${formatCurrency(item.precoUnitario)}</p>
                    </div>
                    <p class="font-semibold w-24 text-right">${formatCurrency(item.subtotal)}</p>
                    <button type="button" onclick="removerItem(${index})" class="ml-3 text-red-500 hover:text-red-700 font-bold">X</button>`;
                itensVendaContainer.appendChild(div);
                subtotal += item.subtotal;
            });
        }
        vendaAtual.subtotal = subtotal;

        let descVal = 0, acrescVal = 0;
        if (blocoDesconto && !blocoDesconto.classList.contains('hidden') && inputDescontoValor) {
            vendaAtual.desconto_valor = parseFloat(inputDescontoValor.value) || 0;
            vendaAtual.desconto_tipo = selectDescontoTipo.value;
            descVal = vendaAtual.desconto_tipo === '%' ? subtotal * (vendaAtual.desconto_valor / 100) : vendaAtual.desconto_valor;
        }
        if (blocoAcrescimo && !blocoAcrescimo.classList.contains('hidden') && inputAcrescimoValor) {
            vendaAtual.acrescimo_valor = parseFloat(inputAcrescimoValor.value) || 0;
            vendaAtual.acrescimo_tipo = selectAcrescimoTipo.value;
            acrescVal = vendaAtual.acrescimo_tipo === '%' ? subtotal * (vendaAtual.acrescimo_valor / 100) : vendaAtual.acrescimo_valor;
        }

        const total = subtotal - descVal + acrescVal;
        vendaAtual.total = total;
        vendaAtual.desconto_valor_calculado = descVal;
        vendaAtual.acrescimo_valor_calculado = acrescVal;

        const subEl = document.getElementById('subtotal-valor');
        if (subEl) subEl.textContent = formatCurrency(subtotal);
        if (descontoAplicadoContainer) {
            if (descVal > 0) {
                descontoAplicadoValor.textContent = `- ${formatCurrency(descVal)}`;
                descontoAplicadoContainer.classList.remove('hidden');
            } else descontoAplicadoContainer.classList.add('hidden');
        }
        const totEl = document.getElementById('total-valor');
        if (totEl) totEl.textContent = formatCurrency(total);

        if (btnFinalizarVenda) btnFinalizarVenda.disabled = vendaAtual.itens.length === 0;
    };

    window.removerItem = (index) => {
        vendaAtual.itens.splice(index, 1);
        renderizarItensVenda();
    };

    // --- AÇÕES COM TIMEOUT DE FOCO 300ms ---
    const adicionarProduto = async () => {
        const id = selectedItems.produto;
        const inputQtd = document.getElementById('input-produto-qtd');
        const qtd = inputQtd ? parseInt(inputQtd.value) : 1;
        if (!id || qtd <= 0) return showAlert('Selecione produto e quantidade.', false);
        try {
            const res = await fetch(`${API_URL}/produtos/${id}`);
            if (!res.ok) throw new Error('Produto erro');
            const prod = await res.json();
            
            const existente = vendaAtual.itens.find(i => i.id === id && i.tipo === 'produto');
            const qtdTotal = (existente ? existente.quantidade : 0) + qtd;
            if (qtdTotal > prod.quantidade_em_estoque) return showAlert(`Stock insuficiente (${prod.quantidade_em_estoque})`, false);
            
            if (existente) {
                existente.quantidade += qtd;
                existente.subtotal = existente.quantidade * existente.precoUnitario;
            } else {
                vendaAtual.itens.push({
                    id: prod.id, nome: prod.nome, tipo: 'produto',
                    quantidade: qtd, precoUnitario: parseFloat(prod.preco_unitario),
                    subtotal: qtd * parseFloat(prod.preco_unitario)
                });
            }
            renderizarItensVenda();
            
            const inputBusca = document.getElementById('input-search-produto');
            if(inputBusca) { inputBusca.value = ''; setTimeout(() => inputBusca.focus(), 300); }
            if(inputQtd) inputQtd.value = 1;
            selectedItems.produto = null;
        } catch (e) { showAlert(e.message, false); }
    };

    const adicionarServico = async () => {
        const id = selectedItems.servico;
        const inputQtd = document.getElementById('input-servico-qtd');
        const qtd = inputQtd ? parseInt(inputQtd.value) : 1;
        if (!id || qtd <= 0) return showAlert('Selecione serviço.', false);
        try {
            const res = await fetch(`${API_URL}/servicos/${id}`);
            if (!res.ok) throw new Error('Erro');
            const serv = await res.json();
            if (vendaAtual.itens.some(i => i.id === id && i.tipo === 'serviço')) return showAlert('Já adicionado.', false);
            
            vendaAtual.itens.push({
                id: serv.id, nome: serv.nome, tipo: 'serviço',
                quantidade: qtd, precoUnitario: parseFloat(serv.preco),
                subtotal: qtd * parseFloat(serv.preco)
            });
            renderizarItensVenda();
            
            const inputBusca = document.getElementById('input-search-servico');
            if(inputBusca) { inputBusca.value = ''; setTimeout(() => inputBusca.focus(), 300); }
            if(inputQtd) inputQtd.value = 1;
            selectedItems.servico = null;
        } catch (e) { showAlert(e.message, false); }
    };

    // --- KEY LISTENERS ---
    if(inputProdutoQtd) inputProdutoQtd.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); btnAddProduto.click(); } });
    if(inputServicoQtd) inputServicoQtd.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); btnAddServico.click(); } });

    // --- PAGAMENTO ---
    const handleFormaPagamento = () => {
        if (!selectFormaPagamento) return;
        const opt = selectFormaPagamento.options[selectFormaPagamento.selectedIndex];
        
        blocoParcelamento?.classList.add('hidden');
        blocoContaCaixa?.classList.add('hidden');
        blocoDataVencimento?.classList.add('hidden');
        blocoDesconto?.classList.remove('hidden'); 
        blocoAcrescimo?.classList.add('hidden');
        
        if(inputAcrescimoValor) inputAcrescimoValor.value = 0;
        vendaAtual.acrescimo_valor = 0; 

        if (!opt || !opt.value) { renderizarItensVenda(); return; }

        const tipo = opt.dataset.tipo; 
        const aceitaParcelas = opt.dataset.aceitaParcelas === '1';
        const nomePagamento = opt.textContent.toLowerCase(); 

        if (tipo === 'A_PRAZO') {
            blocoDataVencimento?.classList.remove('hidden');
            blocoDesconto?.classList.add('hidden'); 
            vendaAtual.desconto_valor = 0; 
            if(inputDescontoValor) inputDescontoValor.value = 0;
            vendaAtual.numParcelas = 1;
            if (inputDataVencimento) {
                const hoje = new Date();
                hoje.setDate(hoje.getDate() + 30);
                inputDataVencimento.value = hoje.toISOString().split('T')[0];
            }
        } else {
            blocoContaCaixa?.classList.remove('hidden'); 
            if (selectContaCaixa && listaContasCaixa.length > 0) {
                let termoBusca = '';
                if (nomePagamento.includes('dinheiro') || nomePagamento.includes('especie')) termoBusca = 'caixa';
                else if (nomePagamento.includes('pix') || nomePagamento.includes('cartão') || nomePagamento.includes('débito')) termoBusca = 'banco';
                
                if (termoBusca) {
                    let contaAlvo = listaContasCaixa.find(c => c.Nome.toLowerCase().includes(termoBusca));
                    if (contaAlvo) selectContaCaixa.value = contaAlvo.id;
                }
            }
            if (aceitaParcelas) {
                blocoParcelamento?.classList.remove('hidden');
                const max = parseInt(opt.dataset.maxParcelas) || 12;
                if (selectNumParcelas) {
                    selectNumParcelas.innerHTML = '';
                    for (let i = 1; i <= max; i++) {
                        const o = document.createElement('option');
                        o.value = i; o.textContent = i === 1 ? '1x (À Vista)' : `${i}x`;
                        selectNumParcelas.appendChild(o);
                    }
                }
                atualizarParcelas();
            } else {
                vendaAtual.numParcelas = 1;
            }
        }
        renderizarItensVenda();
    };

    const atualizarParcelas = () => {
        if (blocoParcelamento && blocoParcelamento.classList.contains('hidden')) return;
        const n = selectNumParcelas ? (parseInt(selectNumParcelas.value) || 1) : 1;
        vendaAtual.numParcelas = n;
        if (n > 1) blocoAcrescimo?.classList.remove('hidden');
        else {
            blocoAcrescimo?.classList.add('hidden');
            vendaAtual.acrescimo_valor = 0; 
            if(inputAcrescimoValor) inputAcrescimoValor.value = 0;
        }
        renderizarItensVenda();
    };

    // --- FINALIZAR VENDA ---
    const finalizarVenda = async () => {
        const formaId = selectFormaPagamento ? selectFormaPagamento.value : null;
        const contaId = selectContaCaixa ? selectContaCaixa.value : null;
        const dataVenc = inputDataVencimento ? inputDataVencimento.value : null;
        
        if (!formaId) return showAlert('Selecione forma de pagamento.', false);
        const formaObj = listaFormasPagamento.find(f => f.id == formaId);
        
        if (formaObj.TipoLancamento === 'A_VISTA' && selectContaCaixa && !contaId) return showAlert('Selecione conta/caixa.', false);
        if (formaObj.TipoLancamento === 'A_PRAZO') {
            if (!vendaAtual.cliente_id) return showAlert('Fiado exige cliente.', false);
            if (inputDataVencimento && !dataVenc) return showAlert('Data vencimento obrigatória.', false);
        }

        vendaAtual.FormaPagamentoID = parseInt(formaId);
        vendaAtual.ContaCaixaID = (formaObj.TipoLancamento === 'A_VISTA' && contaId) ? parseInt(contaId) : null;
        vendaAtual.DataVencimento = (formaObj.TipoLancamento === 'A_PRAZO') ? dataVenc : null;
        vendaAtual.desconto_valor = vendaAtual.desconto_valor_calculado || 0;
        vendaAtual.acrescimo_valor = vendaAtual.acrescimo_valor_calculado || 0;

        if (btnFinalizarVenda) btnFinalizarVenda.disabled = true;
        
        try {
            const res = await fetch(`${API_URL}/vendas`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vendaAtual)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message);

            if (vendaAtual.os_id) {
                try {
                    await fetch(`${API_URL}/os/${vendaAtual.os_id}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'Finalizada' })
                    });
                } catch (e) {}
            }

            ultimaVendaSalva = { ...vendaAtual, id: result.id, data: new Date() };

            if (vendaConfirmacaoEl && confirmacaoTextoEl) {
                confirmacaoTextoEl.textContent = `Venda #${result.id} | Total: ${formatCurrency(vendaAtual.total)}`;
                if (vendaForm) vendaForm.style.display = 'none';
                vendaConfirmacaoEl.style.display = 'block';
            } else {
                alert(`✅ Venda #${result.id} realizada!`);
                window.location.reload();
            }

        } catch (e) { showAlert(e.message, false); 
        } finally { if (btnFinalizarVenda) btnFinalizarVenda.disabled = false; }
    };

    // --- IMPRESSÃO (COM FORMATAÇÃO DE PAGAMENTO AJUSTADA) ---
    const imprimirRecibo = async () => {
        if (!ultimaVendaSalva) return;
        
        // 1. Dados da Empresa
        let emp = { nome_fantasia: 'OFICINA', endereco: '', cnpj_cpf: '', telefone: '' };
        try { const res = await fetch(`${API_URL}/empresa`); if(res.ok) emp = await res.json(); } catch(e){}

        // 2. Dados Cliente e Arquivo
        const cli = listaClientes.find(c => c.id === ultimaVendaSalva.cliente_id);
        const nomeCliente = cli ? cli.nome : 'Consumidor Final';
        const nomeArquivo = `Venda_${ultimaVendaSalva.id}.pdf`;

        // 3. Itens HTML
        let itensHtml = '';
        ultimaVendaSalva.itens.forEach(i => {
            itensHtml += `
            <tr>
                <td style="border-bottom:1px solid #ddd; padding:6px;">${i.nome}</td>
                <td style="border-bottom:1px solid #ddd; padding:6px; text-align:center;">${i.quantidade}</td>
                <td style="border-bottom:1px solid #ddd; padding:6px; text-align:right;">${formatCurrency(i.precoUnitario)}</td>
                <td style="border-bottom:1px solid #ddd; padding:6px; text-align:right;">${formatCurrency(i.subtotal)}</td>
            </tr>`;
        });

        // 4. LÓGICA DE PAGAMENTO (ABREVIAÇÃO E PARCELAS)
        const formaObj = listaFormasPagamento.find(f => f.id == ultimaVendaSalva.FormaPagamentoID);
        let nomeForma = formaObj ? formaObj.Nome : 'Dinheiro';

        // Abreviações
        nomeForma = nomeForma.replace('Cartão de ', '').replace('Cartão ', ''); // Vira "Crédito" ou "Débito"

        // Detalhe das Parcelas / À Vista
        const parcelas = ultimaVendaSalva.numParcelas || 1;
        
        if (nomeForma.includes('Crédito')) {
            if (parcelas === 1) nomeForma += ' (À Vista)';
            else nomeForma += ` (${parcelas}x)`;
        } else if (nomeForma.includes('Fiado') || nomeForma.includes('Prazo')) {
            nomeForma = 'A Prazo'; // Normaliza Fiado
            if (parcelas > 1) nomeForma += ` (${parcelas}x)`;
        }

        // 5. Vencimento (apenas se houver)
        let vencimentoHtml = '';
        if (ultimaVendaSalva.DataVencimento) {
            const partes = ultimaVendaSalva.DataVencimento.split('-'); 
            const dataFmt = `${partes[2]}/${partes[1]}/${partes[0]}`;
            vencimentoHtml = `<div style="display:flex; justify-content:space-between; color:#b91c1c; margin-bottom:5px;"><span>Vencimento:</span><span style="font-weight:bold;">${dataFmt}</span></div>`;
        }

        // 6. HTML Final
        const htmlContent = `
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Venda #${ultimaVendaSalva.id}</title>
            <style>
                body { font-family: 'Helvetica', sans-serif; padding: 30px; font-size: 14px; color: #333; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 22px; color: #000; text-transform: uppercase; }
                .header p { margin: 2px 0; font-size: 12px; color: #555; }
                .receipt-info { text-align: right; }
                .receipt-info h2 { margin: 0; font-size: 20px; font-weight: bold; }
                .section-box { border: 1px solid #ccc; padding: 10px; margin-bottom: 15px; border-radius: 4px; background: #f9f9f9; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
                th { text-align: left; border-bottom: 2px solid #000; padding: 8px; background: #eee; font-size: 12px; }
                td { font-size: 13px; }
                .totals-box { width: 300px; margin-left: auto; text-align: right; }
                .row { display: flex; justify-content: space-between; padding: 4px 0; }
                .row.final { border-top: 2px solid #000; margin-top: 5px; padding-top: 5px; font-size: 18px; font-weight: bold; color: #000; }
                .footer { text-align: center; margin-top: 40px; border-top: 1px dashed #ccc; padding-top: 10px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <div><h1>${emp.nome_fantasia || 'OFICINA'}</h1><p>${emp.endereco || ''}</p><p>${emp.telefone || ''}</p></div>
                <div class="receipt-info"><h2>RECIBO DE VENDA</h2><p>Venda #${ultimaVendaSalva.id}</p><p>Data: ${new Date().toLocaleDateString('pt-BR')}</p></div>
            </div>
            <div class="section-box"><strong>Cliente:</strong> ${nomeCliente}</div>
            <table>
                <thead><tr><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead>
                <tbody>${itensHtml}</tbody>
            </table>
            <div class="totals-box">
                <div class="row"><span>Subtotal:</span><span>${formatCurrency(ultimaVendaSalva.subtotal || ultimaVendaSalva.total)}</span></div>
                <div class="row" style="color:#dc2626;"><span>Desconto:</span><span>- ${formatCurrency(ultimaVendaSalva.desconto_valor || 0)}</span></div>
                <div class="row" style="border-bottom:1px solid #ddd; margin-bottom:5px; padding-bottom:5px;"><span>Forma Pagamento:</span><span style="font-weight:bold;">${nomeForma}</span></div>
                ${vencimentoHtml}
                <div class="row final"><span>TOTAL:</span><span>${formatCurrency(ultimaVendaSalva.total)}</span></div>
            </div>
            <div class="footer"><p>Obrigado pela sua preferência!</p><p>Documento sem valor fiscal.</p></div>
        </body>
        </html>`;

        if (window.electronAPI) window.electronAPI.send('print-to-pdf', { html: htmlContent, name: nomeArquivo });
        else { const w = window.open('', '', 'width=800,height=600'); w.document.write(htmlContent); w.document.close(); w.print(); }
    };

    // --- EVENT LISTENERS ---
    if(btnAddProduto) btnAddProduto.addEventListener('click', adicionarProduto);
    if(btnAddServico) btnAddServico.addEventListener('click', adicionarServico);
    if(selectFormaPagamento) selectFormaPagamento.addEventListener('change', handleFormaPagamento);
    if(selectNumParcelas) selectNumParcelas.addEventListener('change', atualizarParcelas);
    if(vendaForm) vendaForm.addEventListener('submit', (e) => { e.preventDefault(); finalizarVenda(); });
    if(btnNovaVenda) btnNovaVenda.addEventListener('click', () => window.location.reload());
    if(btnImprimirRecibo) btnImprimirRecibo.addEventListener('click', imprimirRecibo);

    if(inputDescontoValor) inputDescontoValor.addEventListener('input', () => { vendaAtual.desconto_valor = parseFloat(inputDescontoValor.value) || 0; renderizarItensVenda(); });
    if(selectDescontoTipo) selectDescontoTipo.addEventListener('change', () => { vendaAtual.desconto_tipo = selectDescontoTipo.value; renderizarItensVenda(); });
    if(inputAcrescimoValor) inputAcrescimoValor.addEventListener('input', () => { vendaAtual.acrescimo_valor = parseFloat(inputAcrescimoValor.value) || 0; renderizarItensVenda(); });
    if(selectAcrescimoTipo) selectAcrescimoTipo.addEventListener('change', () => { vendaAtual.acrescimo_tipo = selectAcrescimoTipo.value; renderizarItensVenda(); });

    // --- RÁPIDOS ---
    const btnNovoClienteRapido = document.getElementById('btn-novo-cliente-rapido');
    const modalClienteRapido = document.getElementById('modal-rapido-cliente');
    const formClienteRapido = document.getElementById('form-rapido-cliente');

    if(btnNovoClienteRapido) {
        btnNovoClienteRapido.addEventListener('click', () => {
            if(formClienteRapido) formClienteRapido.reset();
            modalClienteRapido.classList.remove('hidden');
            setTimeout(() => document.getElementById('rapido-cliente-nome')?.focus(), 100);
        });
        const btnCanc = modalClienteRapido.querySelector('button.bg-gray-200');
        if(btnCanc) btnCanc.onclick = () => modalClienteRapido.classList.add('hidden');

        formClienteRapido?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formClienteRapido.querySelector('button[type="submit"]');
            btn.disabled = true;
            try {
                const res = await fetch(`${API_URL}/clientes`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ nome: document.getElementById('rapido-cliente-nome').value.toUpperCase(), telefone: document.getElementById('rapido-cliente-telefone').value }) });
                if(res.ok) {
                    const novo = await res.json();
                    modalClienteRapido.classList.add('hidden');
                    showAlert("Cliente OK!", true);
                    const inp = document.getElementById('input-search-cliente');
                    if(inp) { inp.value = novo.nome || document.getElementById('rapido-cliente-nome').value.toUpperCase(); inp.focus(); }
                    vendaAtual.cliente_id = novo.id || novo.lastID;
                    selectedItems.cliente = vendaAtual.cliente_id;
                }
            } catch(e) {} finally { btn.disabled = false; }
        });
    }

    const btnNovoServicoRapido = document.getElementById('btn-novo-servico-rapido');
    const modalServicoRapido = document.getElementById('modal-rapido-servico');
    const formServicoRapido = document.getElementById('form-rapido-servico');

    if(btnNovoServicoRapido) {
        btnNovoServicoRapido.addEventListener('click', () => {
            if(formServicoRapido) formServicoRapido.reset();
            modalServicoRapido.classList.remove('hidden');
            setTimeout(() => document.getElementById('rapido-servico-nome')?.focus(), 100);
        });
        const btnCanc = modalServicoRapido.querySelector('button.bg-gray-200');
        if(btnCanc) btnCanc.onclick = () => modalServicoRapido.classList.add('hidden');

        formServicoRapido?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formServicoRapido.querySelector('button[type="submit"]');
            btn.disabled = true;
            try {
                const res = await fetch(`${API_URL}/servicos`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ nome: document.getElementById('rapido-servico-nome').value.toUpperCase(), preco: parseFloat(document.getElementById('rapido-servico-preco').value) }) });
                if(res.ok) {
                    const novo = await res.json();
                    modalServicoRapido.classList.add('hidden');
                    showAlert("Serviço OK!", true);
                    const inp = document.getElementById('input-search-servico');
                    if(inp) { inp.value = novo.nome || document.getElementById('rapido-servico-nome').value.toUpperCase(); inp.focus(); }
                    selectedItems.servico = novo.id || novo.lastID;
                }
            } catch(e) {} finally { btn.disabled = false; }
        });
    }

    const btnNovoProdutoRapido = document.getElementById('btn-novo-produto-rapido');
    const modalProdutoRapido = document.getElementById('produto-modal');
    const formProdutoRapido = document.getElementById('produto-form-rapido');

    if(btnNovoProdutoRapido) {
        btnNovoProdutoRapido.addEventListener('click', () => {
            if(formProdutoRapido) formProdutoRapido.reset();
            modalProdutoRapido.classList.remove('hidden', 'modal-oculto');
            setTimeout(() => document.getElementById('rapido-nome')?.focus(), 100);
        });
        const btnCanc = document.getElementById('btn-cancelar-rapido');
        if(btnCanc) btnCanc.onclick = () => modalProdutoRapido.classList.add('hidden', 'modal-oculto');

        formProdutoRapido?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dados = {
                nome: document.getElementById('rapido-nome').value.toUpperCase(),
                preco_unitario: parseFloat(document.getElementById('rapido-preco').value || 0),
                valor_custo: parseFloat(document.getElementById('rapido-custo').value || 0),
                quantidade_em_estoque: parseInt(document.getElementById('rapido-estoque').value || 0),
                stock_minimo: parseInt(document.getElementById('rapido-minimo').value || 0)
            };
            try {
                const res = await fetch(`${API_URL}/produtos`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados) });
                if(res.ok) {
                    const novo = await res.json();
                    modalProdutoRapido.classList.add('hidden', 'modal-oculto');
                    showAlert("Produto OK!", true);
                    const inp = document.getElementById('input-search-produto');
                    if(inp) { inp.value = dados.nome; inp.focus(); }
                    selectedItems.produto = novo.id || novo.lastID;
                }
            } catch(e) {}
        });
    }

    setupAutocomplete('input-search-cliente', 'results-cliente', 'cliente');
    setupAutocomplete('input-search-produto', 'results-produto', 'produto');
    setupAutocomplete('input-search-servico', 'results-servico', 'servico');
    popularDadosIniciais();
});