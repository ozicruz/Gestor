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
        vendedor_id: null,
        itens: [],
        total: 0,
        subtotal: 0,
        desconto_tipo: 'R$',
        desconto_valor: 0,
        desconto_valor_calculado: 0,
        acrescimo_tipo: '%',
        acrescimo_valor: 0,
        acrescimo_valor_calculado: 0,
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

    // Inputs
    const inputProdutoQtd = document.getElementById('input-produto-qtd');
    const inputProdutoValorManual = document.getElementById('input-produto-valor-manual');
    const inputServicoQtd = document.getElementById('input-servico-qtd');
    const inputServicoValorManual = document.getElementById('input-servico-valor-manual');
    
    const inputDescontoValor = document.getElementById('desconto-valor');
    const selectDescontoTipo = document.getElementById('desconto-tipo');
    const inputAcrescimoValor = document.getElementById('acrescimo-valor');
    const selectAcrescimoTipo = document.getElementById('acrescimo-tipo');
    const selectFormaPagamento = document.getElementById('select-forma-pagamento');
    const selectContaCaixa = document.getElementById('select-conta-caixa');
    const inputDataVencimento = document.getElementById('input-data-vencimento');
    const selectNumParcelas = document.getElementById('select-num-parcelas');

    // Admin UI
    const adminVendedorContainer = document.getElementById('admin-vendedor-container');
    const selectVendedorAdmin = document.getElementById('select-vendedor-admin');

    // Blocos de UI
    const blocoDesconto = document.getElementById('bloco-desconto');
    const blocoAcrescimo = document.getElementById('bloco-acrescimo');
    const blocoContaCaixa = document.getElementById('bloco-conta-caixa');
    const blocoDataVencimento = document.getElementById('bloco-data-vencimento');
    const blocoParcelamento = document.getElementById('bloco-parcelamento');
    const descontoAplicadoContainer = document.getElementById('desconto-aplicado-container');
    const descontoAplicadoValor = document.getElementById('desconto-aplicado-valor');

    // --- FUNÇÃO DE CARREGAMENTO DA OS ---
    async function carregarItensDaOS(id) {
        try {
            const res = await fetch(`${API_URL}/os/${id}`);
            if (!res.ok) throw new Error("Erro ao buscar dados da OS");
            const os = await res.json();

            vendaAtual.os_id = os.id;
            
            if (os.mecanico_id) {
                vendaAtual.vendedor_id = os.mecanico_id;
                const container = document.querySelector('.max-w-7xl'); 
                
                if (container && !document.getElementById('aviso-vinculo-os')) {
                    const infoDiv = document.createElement('div');
                    infoDiv.id = 'aviso-vinculo-os';
                    infoDiv.className = "bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 rounded shadow-sm flex justify-between items-center";
                    infoDiv.innerHTML = `
                        <div>
                            <span class="font-bold">Origem:</span> Ordem de Serviço #${os.id}
                            <br>
                            <span class="font-bold">Responsável Técnico:</span> ${os.mecanico_nome || 'Não identificado'}
                        </div>
                        <span class="text-xs bg-white px-2 py-1 rounded border">Vínculo Automático</span>
                    `;
                    container.insertBefore(infoDiv, container.firstChild);
                }
            }

            if (os.cliente_id) {
                vendaAtual.cliente_id = os.cliente_id;
                selectedItems.cliente = os.cliente_id;
                const inputCliente = document.getElementById('input-search-cliente');
                if (inputCliente) {
                    inputCliente.value = os.cliente_nome || 'Cliente da OS';
                    inputCliente.setAttribute('readonly', true);
                    inputCliente.classList.add('bg-gray-100', 'cursor-not-allowed', 'text-gray-600', 'font-bold');
                    inputCliente.title = "Cliente vinculado à OS";
                }
            } else {
                showAlert("Aviso: Esta OS não tem cliente vinculado no cadastro. Selecione um cliente manualmente.", false);
            }

            if (os.itens && os.itens.length > 0) {
                os.itens.forEach(item => {
                    vendaAtual.itens.push({
                        id: item.produto_id, 
                        nome: item.nome || item.nome_produto || item.descricao || 'Peça sem nome', 
                        tipo: 'produto',
                        quantidade: item.quantidade, 
                        precoUnitario: parseFloat(item.valor_unitario || 0),
                        subtotal: item.quantidade * parseFloat(item.valor_unitario || 0)
                    });
                });
            }

            if (os.servicos && os.servicos.length > 0) {
                os.servicos.forEach(serv => {
                    vendaAtual.itens.push({
                        id: serv.servico_id, 
                        nome: serv.nome || serv.descricao || 'Serviço', 
                        tipo: 'serviço',
                        quantidade: serv.quantidade || 1, 
                        precoUnitario: parseFloat(serv.valor || 0),
                        subtotal: (serv.quantidade || 1) * parseFloat(serv.valor || 0)
                    });
                });
            }

            renderizarItensVenda();
            showAlert(`Dados da OS #${os.id} importados com sucesso!`, true);
            window.history.replaceState({}, document.title, window.location.pathname);

        } catch (err) { 
            console.error("Erro ao carregar OS:", err); 
            showAlert("Erro ao importar OS: " + err.message, false); 
        }
    }

    if (osIdParaCarregar) {
        setTimeout(() => carregarItensDaOS(osIdParaCarregar), 300);
    }

    // --- HELPERS ---
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const showAlert = (msg, success = true) => {
        if (!feedbackAlert) return;
        feedbackAlert.textContent = msg;
        feedbackAlert.className = `p-4 mb-4 text-sm rounded-lg shadow font-bold text-center ${success ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`;
        feedbackAlert.classList.remove('hidden');
        
        // Garante que o alerta fique visível no topo
        feedbackAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => feedbackAlert.classList.add('hidden'), 4000);
    };

    function debounce(func, wait) {
        let timeout;
        return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
    }

    // --- AUTOCOMPLETE ---
    const setupAutocomplete = (inputId, resultsId, type) => {
        const input = document.getElementById(inputId);
        const results = document.getElementById(resultsId);
        if (!input || !results) return;

        let currentFocus = -1;

        input.addEventListener('input', debounce(async () => {
            const query = input.value.toLowerCase();
            currentFocus = -1;
            selectedItems[type] = null;
            if (type === 'cliente') vendaAtual.cliente_id = null;

            if (!query) { results.innerHTML = ''; results.classList.add('hidden'); return; }

            try {
                let endpoint = type === 'produto' ? 'produtos' : (type === 'cliente' ? 'clientes' : 'servicos');
                const res = await fetch(`${API_URL}/${endpoint}/search?q=${query}`);
                
                let items = [];
                if (res.ok) {
                    items = await res.json();
                } else {
                    const resAll = await fetch(`${API_URL}/${endpoint}`);
                    if(resAll.ok) {
                        const all = await resAll.json();
                        items = all.filter(i => i.nome.toLowerCase().includes(query));
                    }
                }

                items.sort((a, b) => {
                    const nomeA = a.nome.toLowerCase();
                    const nomeB = b.nome.toLowerCase();
                    if (nomeA.startsWith(query) && !nomeB.startsWith(query)) return -1;
                    if (!nomeA.startsWith(query) && nomeB.startsWith(query)) return 1;
                    return nomeA.localeCompare(nomeB);
                });

                results.innerHTML = ''; results.classList.remove('hidden');
                
                if (items.length === 0) {
                    results.innerHTML = '<div class="p-2 text-gray-500 italic">Nada encontrado.</div>';
                } else {
                    items.slice(0, 15).forEach((item) => {
                        const div = document.createElement('div');
                        div.className = 'autocomplete-item p-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 text-sm'; 
                        
                        if (type === 'cliente') div.textContent = item.nome;
                        else {
                            const p = item.preco_unitario || item.preco || 0;
                            const stk = item.quantidade_em_estoque !== undefined ? ` | Est: ${item.quantidade_em_estoque}` : '';
                            div.innerHTML = `<strong>${item.nome}</strong>${stk} - ${formatCurrency(p)}`;
                        }

                        div.addEventListener('click', () => {
                            input.value = item.nome;
                            selectedItems[type] = item.id;
                            if (type === 'cliente') vendaAtual.cliente_id = item.id;
                            results.classList.add('hidden');
                            
                            if(type === 'produto') setTimeout(() => document.getElementById('input-produto-qtd')?.focus(), 100);
                            if(type === 'servico') setTimeout(() => document.getElementById('input-servico-qtd')?.focus(), 100);
                        });
                        results.appendChild(div);
                    });
                }
            } catch (e) { console.error(e); }
        }, 300)); 

        input.addEventListener('keydown', function(e) {
            let x = results.getElementsByTagName('div');
            if (e.key === 'ArrowDown') { currentFocus++; addActive(x); } 
            else if (e.key === 'ArrowUp') { currentFocus--; addActive(x); } 
            else if (e.key === 'Enter') { e.preventDefault(); if (currentFocus > -1 && x) x[currentFocus].click(); } 
            else if (e.key === 'Escape') { results.classList.add('hidden'); }
        });

        function addActive(x) {
            if (!x) return;
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            x[currentFocus].classList.add('bg-blue-100', 'font-bold');
            x[currentFocus].scrollIntoView({ block: 'nearest' });
        }

        function removeActive(x) {
            for (let i = 0; i < x.length; i++) x[i].classList.remove('bg-blue-100', 'font-bold');
        }

        document.addEventListener('click', (e) => { if (!e.target.closest('.autocomplete-container')) results.classList.add('hidden'); });
    };

    // --- CARREGAR DADOS GERAIS ---
    const popularDadosIniciais = async () => {
        try {
            const [cli, formas, contas, usuarios] = await Promise.all([
                fetch(`${API_URL}/clientes`).catch(() => ({ ok: false })), 
                fetch(`${API_URL}/financeiro/formas-pagamento`).catch(() => ({ ok: false })), 
                fetch(`${API_URL}/financeiro/contas`).catch(() => ({ ok: false })),
                fetch(`${API_URL}/usuarios`).catch(() => ({ ok: false }))
            ]);
            
            if(cli.ok) listaClientes = await cli.json();
            if(formas.ok) listaFormasPagamento = await formas.json();
            if(contas.ok) listaContasCaixa = await contas.json();
            const listaUsuarios = usuarios.ok ? await usuarios.json() : [];

            if (selectFormaPagamento) {
                selectFormaPagamento.innerHTML = '<option value="">Selecione...</option>';
                listaFormasPagamento.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f.id;
                    let nome = f.Nome;
                    if (nome.includes('Fiado') || f.TipoLancamento === 'A_PRAZO') nome = 'A Prazo / Fiado';
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

            const userLogado = JSON.parse(localStorage.getItem('usuario_logado'));
            if (userLogado && userLogado.is_admin && adminVendedorContainer) {
                adminVendedorContainer.classList.remove('hidden');
                selectVendedorAdmin.innerHTML = '';
                listaUsuarios.forEach(u => {
                    const opt = document.createElement('option');
                    opt.value = u.id;
                    opt.textContent = u.nome;
                    if (u.id === userLogado.id) opt.selected = true; 
                    selectVendedorAdmin.appendChild(opt);
                });
            }

        } catch (e) { console.error(e); }
    };

    // --- RENDERIZAR ITENS DA VENDA ---
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
                div.className = 'flex justify-between items-center text-sm p-3 bg-gray-50 rounded mb-2 border border-gray-100';
                div.innerHTML = `
                    <div class="flex-grow">
                        <p class="font-bold text-gray-800">${item.nome} <span class="text-xs font-normal text-gray-500 ml-1 bg-white px-1 rounded border">${item.tipo === 'serviço' ? 'Serviço' : 'Peça'}</span></p>
                        <p class="text-gray-600 text-xs mt-1">${item.quantidade} x ${formatCurrency(item.precoUnitario)}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-gray-800">${formatCurrency(item.subtotal)}</p>
                        <button type="button" onclick="removerItem(${index})" class="text-red-500 hover:text-red-700 text-xs mt-1 underline">Remover</button>
                    </div>`;
                itensVendaContainer.appendChild(div);
                subtotal += item.subtotal;
            });
        }
        vendaAtual.subtotal = subtotal;

        let descVal = 0, acrescVal = 0;
        
        // Desconto
        if (inputDescontoValor) {
            vendaAtual.desconto_valor = parseFloat(inputDescontoValor.value) || 0;
            vendaAtual.desconto_tipo = selectDescontoTipo.value;
            descVal = vendaAtual.desconto_tipo === '%' ? subtotal * (vendaAtual.desconto_valor / 100) : vendaAtual.desconto_valor;
        }

        // Acréscimo (Juros)
        if (blocoAcrescimo && !blocoAcrescimo.classList.contains('hidden') && inputAcrescimoValor) {
            vendaAtual.acrescimo_valor = parseFloat(inputAcrescimoValor.value) || 0;
            vendaAtual.acrescimo_tipo = selectAcrescimoTipo.value;
            acrescVal = vendaAtual.acrescimo_tipo === '%' ? subtotal * (vendaAtual.acrescimo_valor / 100) : vendaAtual.acrescimo_valor;
        }

        const total = subtotal - descVal + acrescVal;
        vendaAtual.total = total;
        vendaAtual.desconto_valor_calculado = descVal; 
        vendaAtual.acrescimo_valor_calculado = acrescVal;

        // Atualizações na UI
        const subEl = document.getElementById('subtotal-valor');
        if (subEl) subEl.textContent = formatCurrency(subtotal);
        
        if (descontoAplicadoContainer) {
            if (descVal > 0) {
                descontoAplicadoValor.textContent = `- ${formatCurrency(descVal)}`;
                descontoAplicadoContainer.classList.remove('hidden');
            } else descontoAplicadoContainer.classList.add('hidden');
        }

        const totEl = document.getElementById('total-valor');
        if (totEl) {
            let totalHtml = formatCurrency(total);
            if (vendaAtual.numParcelas > 1) {
                const valorParcela = total / vendaAtual.numParcelas;
                totalHtml += ` <span class="text-xs text-gray-500 font-normal block md:inline">(ou ${vendaAtual.numParcelas}x de ${formatCurrency(valorParcela)})</span>`;
            }
            totEl.innerHTML = totalHtml;
        }

        if (btnFinalizarVenda) btnFinalizarVenda.disabled = vendaAtual.itens.length === 0;
    };

    window.removerItem = (index) => {
        vendaAtual.itens.splice(index, 1);
        renderizarItensVenda();
    };

    // --- ADD PRODUTO/SERVIÇO ---
    const adicionarProduto = async () => {
        const id = selectedItems.produto;
        const inputQtd = document.getElementById('input-produto-qtd');
        const inputValor = document.getElementById('input-produto-valor-manual');
        const qtd = inputQtd ? parseInt(inputQtd.value) : 1;
        const valorManual = inputValor ? parseFloat(inputValor.value) : 0;

        if (!id || qtd <= 0) return showAlert('Selecione produto e quantidade.', false);
        try {
            const res = await fetch(`${API_URL}/produtos/${id}`);
            if (!res.ok) throw new Error('Produto erro');
            const prod = await res.json();
            const precoFinal = (valorManual > 0) ? valorManual : parseFloat(prod.preco_unitario);
            const existente = vendaAtual.itens.find(i => i.id === id && i.tipo === 'produto');
            const qtdTotal = (existente ? existente.quantidade : 0) + qtd;
            
            if (prod.quantidade_em_estoque !== undefined && qtdTotal > prod.quantidade_em_estoque) {
                return showAlert(`Atenção: Estoque insuficiente (Disp: ${prod.quantidade_em_estoque})`, false);
            }
            
            if (existente) {
                existente.quantidade += qtd;
                existente.precoUnitario = precoFinal; 
                existente.subtotal = existente.quantidade * existente.precoUnitario;
            } else {
                vendaAtual.itens.push({
                    id: prod.id, nome: prod.nome, tipo: 'produto',
                    quantidade: qtd, precoUnitario: precoFinal, subtotal: qtd * precoFinal
                });
            }
            renderizarItensVenda();
            
            const inputBusca = document.getElementById('input-search-produto');
            if(inputBusca) { inputBusca.value = ''; setTimeout(() => inputBusca.focus(), 300); }
            if(inputQtd) inputQtd.value = 1;
            if(inputValor) inputValor.value = ''; 
            selectedItems.produto = null;
        } catch (e) { showAlert(e.message, false); }
    };

    const adicionarServico = async () => {
        const id = selectedItems.servico;
        const inputQtd = document.getElementById('input-servico-qtd');
        const inputValorManual = document.getElementById('input-servico-valor-manual');
        const qtd = inputQtd ? parseInt(inputQtd.value) : 1;
        const valorManual = inputValorManual ? parseFloat(inputValorManual.value) : 0;

        if (!id || qtd <= 0) return showAlert('Selecione serviço.', false);
        try {
            const res = await fetch(`${API_URL}/servicos/${id}`);
            if (!res.ok) throw new Error('Erro ao buscar serviço');
            const serv = await res.json();
            const precoFinal = (valorManual > 0) ? valorManual : parseFloat(serv.preco);

            if (vendaAtual.itens.some(i => i.id === id && i.tipo === 'serviço')) {
                return showAlert('Serviço já adicionado.', false);
            }
            
            vendaAtual.itens.push({
                id: serv.id, nome: serv.nome, tipo: 'serviço',
                quantidade: qtd, precoUnitario: precoFinal, subtotal: qtd * precoFinal
            });
            renderizarItensVenda();
            
            const inputBusca = document.getElementById('input-search-servico');
            if(inputBusca) { inputBusca.value = ''; setTimeout(() => inputBusca.focus(), 300); }
            if(inputQtd) inputQtd.value = 1;
            if(inputValorManual) inputValorManual.value = '';
            selectedItems.servico = null;
        } catch (e) { showAlert(e.message, false); }
    };

    if(inputProdutoQtd) inputProdutoQtd.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); btnAddProduto.click(); } });
    if(inputProdutoValorManual) inputProdutoValorManual.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); btnAddProduto.click(); } });
    if(inputServicoQtd) inputServicoQtd.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); btnAddServico.click(); } });
    if(inputServicoValorManual) inputServicoValorManual.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); btnAddServico.click(); } });

    // --- FORMA PAGAMENTO ---
    const handleFormaPagamento = () => {
        if (!selectFormaPagamento) return;
        const opt = selectFormaPagamento.options[selectFormaPagamento.selectedIndex];
        
        blocoParcelamento?.classList.add('hidden');
        blocoContaCaixa?.classList.add('hidden');
        blocoDataVencimento?.classList.add('hidden');
        blocoAcrescimo?.classList.add('hidden');
        blocoDesconto?.classList.remove('hidden'); 
        
        if(inputAcrescimoValor) inputAcrescimoValor.value = 0;
        vendaAtual.acrescimo_valor = 0; 

        if (!opt || !opt.value) { renderizarItensVenda(); return; }

        const tipo = opt.dataset.tipo; 
        const aceitaParcelas = opt.dataset.aceitaParcelas === '1';
        const nomePagamento = opt.textContent.toLowerCase(); 

        if (tipo === 'A_PRAZO') {
            blocoDataVencimento?.classList.remove('hidden');
            blocoDesconto?.classList.add('hidden');
            vendaAtual.numParcelas = 1;
            if (inputDataVencimento) {
                const hoje = new Date();
                hoje.setDate(hoje.getDate() + 30);
                inputDataVencimento.value = hoje.toISOString().split('T')[0];
            }
        } else {
            blocoContaCaixa?.classList.remove('hidden'); 
            
            if (selectContaCaixa && listaContasCaixa.length > 0) {
                let contaAlvo = null;
                if (nomePagamento.includes('dinheiro') || nomePagamento.includes('espécie')) {
                    contaAlvo = listaContasCaixa.find(c => c.Nome.toLowerCase().includes('caixa') || c.Nome.toLowerCase().includes('gaveta'));
                } else {
                    contaAlvo = listaContasCaixa.find(c => c.Nome.toLowerCase().includes('banco'));
                    if (!contaAlvo) contaAlvo = listaContasCaixa.find(c => !c.Nome.toLowerCase().includes('caixa') && !c.Nome.toLowerCase().includes('gaveta'));
                }
                if (contaAlvo) selectContaCaixa.value = contaAlvo.id;
                else if (listaContasCaixa.length > 0) selectContaCaixa.value = listaContasCaixa[0].id;
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
        
        const usuarioJson = localStorage.getItem('usuario_logado');
        const usuario = usuarioJson ? JSON.parse(usuarioJson) : null;
        if (!usuario) return showAlert("Erro: Usuário não identificado.", false);
        
        if (!formaId) return showAlert('Selecione forma de pagamento.', false);
        const formaObj = listaFormasPagamento.find(f => f.id == formaId);
        
        if (formaObj.TipoLancamento === 'A_VISTA' && selectContaCaixa && !contaId) return showAlert('Selecione conta/caixa.', false);
        if (formaObj.TipoLancamento === 'A_PRAZO') {
            if (!vendaAtual.cliente_id) return showAlert('Venda a prazo exige um cliente selecionado.', false);
            if (inputDataVencimento && !dataVenc) return showAlert('Data vencimento obrigatória.', false);
        }

        vendaAtual.FormaPagamentoID = parseInt(formaId);
        vendaAtual.ContaCaixaID = (formaObj.TipoLancamento === 'A_VISTA' && contaId) ? parseInt(contaId) : null;
        vendaAtual.DataVencimento = (formaObj.TipoLancamento === 'A_PRAZO') ? dataVenc : null;
        vendaAtual.desconto_valor = vendaAtual.desconto_valor_calculado || 0;
        vendaAtual.acrescimo_valor = vendaAtual.acrescimo_valor_calculado || 0;
        
        if (!vendaAtual.vendedor_id) {
            if (adminVendedorContainer && !adminVendedorContainer.classList.contains('hidden') && selectVendedorAdmin.value) {
                vendaAtual.vendedor_id = parseInt(selectVendedorAdmin.value);
            } else {
                vendaAtual.vendedor_id = usuario.id;
            }
        }

        if (btnFinalizarVenda) btnFinalizarVenda.disabled = true;
        btnFinalizarVenda.innerHTML = 'Processando...';
        
        try {
            const res = await fetch(`${API_URL}/vendas`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vendaAtual)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message);

            ultimaVendaSalva = { ...vendaAtual, id: result.id, data: new Date() };

            if (vendaConfirmacaoEl && confirmacaoTextoEl) {
                confirmacaoTextoEl.textContent = `Venda #${result.id} | Total: ${formatCurrency(vendaAtual.total)}`;
                if (vendaForm) vendaForm.style.display = 'none';
                vendaConfirmacaoEl.style.display = 'block';
            } else {
                showAlert(`✅ Venda #${result.id} realizada!`, true);
                setTimeout(() => window.location.reload(), 1500);
            }

        } catch (e) { 
            showAlert(e.message, false); 
            btnFinalizarVenda.disabled = false;
            btnFinalizarVenda.innerHTML = 'Finalizar Venda';
        }
    };

    // --- IMPRESSÃO RECIBO ---
    const imprimirRecibo = async () => {
        if (!ultimaVendaSalva) return;
        let emp = { nome_fantasia: 'OFICINA', endereco: '', cnpj_cpf: '', telefone: '' };
        try { const res = await fetch(`${API_URL}/empresa`); if(res.ok) emp = await res.json(); } catch(e){}

        const cli = listaClientes.find(c => c.id === ultimaVendaSalva.cliente_id);
        const nomeCliente = cli ? cli.nome : 'Consumidor Final';
        const nomeArquivo = `Venda_${ultimaVendaSalva.id}.pdf`;

        let itensHtml = '';
        ultimaVendaSalva.itens.forEach(i => {
            itensHtml += `<tr>
                <td style="border-bottom:1px solid #eee; padding:8px;">${i.nome}</td>
                <td style="border-bottom:1px solid #eee; padding:8px; text-align:center;">${i.quantidade}</td>
                <td style="border-bottom:1px solid #eee; padding:8px; text-align:right;">${formatCurrency(i.precoUnitario)}</td>
                <td style="border-bottom:1px solid #eee; padding:8px; text-align:right;">${formatCurrency(i.subtotal)}</td>
            </tr>`;
        });

        const formaObj = listaFormasPagamento.find(f => f.id == ultimaVendaSalva.FormaPagamentoID);
        let nomeForma = formaObj ? formaObj.Nome : 'Dinheiro';
        nomeForma = nomeForma.replace(/Fiado/gi, '').replace('/', '').trim(); 
        if(nomeForma === '') nomeForma = 'A Prazo';

        const parcelas = ultimaVendaSalva.numParcelas || 1;
        if (parcelas > 1) {
            const valorParcela = ultimaVendaSalva.total / parcelas;
            nomeForma += ` (${parcelas}x de ${formatCurrency(valorParcela)})`;
        }

        let htmlVencimento = '';
        if (ultimaVendaSalva.DataVencimento) {
            const [ano, mes, dia] = ultimaVendaSalva.DataVencimento.split('-');
            const dataFormatada = `${dia}/${mes}/${ano}`;
            htmlVencimento = `<div class="row" style="color: #c02424; font-weight: bold; border-top: 1px dashed #ddd; margin-top:5px; padding-top:5px;"><span>Vencimento:</span><span>${dataFormatada}</span></div>`;
        }

        let htmlAcrescimo = '';
        if (ultimaVendaSalva.acrescimo_valor > 0) {
            htmlAcrescimo = `<div class="row" style="color: #b91c1c;"><span>(+) Juros/Acréscimo:</span><span>${formatCurrency(ultimaVendaSalva.acrescimo_valor)}</span></div>`;
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
                    <h2>RECIBO #${ultimaVendaSalva.id}</h2>
                    <p>${new Date().toLocaleDateString('pt-BR')}</p>
                </div>
            </div>
            <div class="box-cliente"><strong>Cliente:</strong> ${nomeCliente}</div>
            <table>
                <thead><tr><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead>
                <tbody>${itensHtml}</tbody>
            </table>
            <div class="totals">
                <div class="row"><span>Subtotal:</span><span>${formatCurrency(ultimaVendaSalva.subtotal)}</span></div>
                <div class="row"><span>(-) Desconto:</span><span>- ${formatCurrency(ultimaVendaSalva.desconto_valor||0)}</span></div>
                ${htmlAcrescimo}
                <div class="row"><span>Pagamento:</span><span>${nomeForma}</span></div>
                ${htmlVencimento}
                <div class="row final"><span>TOTAL:</span><span>${formatCurrency(ultimaVendaSalva.total)}</span></div>
            </div>
            <div class="footer"><p>Obrigado pela preferência!</p></div>
        </body></html>`;

        if (window.electronAPI) window.electronAPI.send('print-to-pdf', { html: htmlContent, name: nomeArquivo });
        else { const w = window.open('', '', 'width=800,height=600'); w.document.write(htmlContent); w.document.close(); w.print(); }
    };

    if(btnAddProduto) btnAddProduto.addEventListener('click', adicionarProduto);
    if(btnAddServico) btnAddServico.addEventListener('click', adicionarServico);
    if(selectFormaPagamento) selectFormaPagamento.addEventListener('change', handleFormaPagamento);
    if(selectNumParcelas) selectNumParcelas.addEventListener('change', atualizarParcelas);
    if(vendaForm) vendaForm.addEventListener('submit', (e) => { e.preventDefault(); finalizarVenda(); });
    if(btnNovaVenda) btnNovaVenda.addEventListener('click', () => window.location.reload());
    if(btnImprimirRecibo) btnImprimirRecibo.addEventListener('click', imprimirRecibo);
    
    if(inputDescontoValor) inputDescontoValor.addEventListener('input', () => { renderizarItensVenda(); });
    if(selectDescontoTipo) selectDescontoTipo.addEventListener('change', () => { renderizarItensVenda(); });
    if(inputAcrescimoValor) inputAcrescimoValor.addEventListener('input', () => { renderizarItensVenda(); });
    if(selectAcrescimoTipo) selectAcrescimoTipo.addEventListener('change', () => { renderizarItensVenda(); });

    setupAutocomplete('input-search-cliente', 'results-cliente', 'cliente');
    setupAutocomplete('input-search-produto', 'results-produto', 'produto');
    setupAutocomplete('input-search-servico', 'results-servico', 'servico');
    popularDadosIniciais();

    // ============================================================
    // --- LÓGICA DE CADASTRO RÁPIDO (FINAL E CORRIGIDA) ---
    // ============================================================

    const fecharModalSeguro = (modal) => {
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = ''; 
        }
    };

    // --- 1. CLIENTE RÁPIDO ---
    const btnNovoClienteRapido = document.getElementById('btn-novo-cliente-rapido');
    const modalClienteRapido = document.getElementById('modal-rapido-cliente');
    const formClienteRapido = document.getElementById('form-rapido-cliente');

    if (btnNovoClienteRapido) {
        btnNovoClienteRapido.addEventListener('click', () => {
            if (modalClienteRapido) {
                formClienteRapido.reset();
                modalClienteRapido.classList.remove('hidden');
                setTimeout(() => document.getElementById('rapido-cliente-nome').focus(), 100);
            }
        });
    }

    if (modalClienteRapido) {
        const btnCancelar = modalClienteRapido.querySelector('button[type="button"]');
        if (btnCancelar) {
            btnCancelar.removeAttribute('onclick');
            btnCancelar.addEventListener('click', () => fecharModalSeguro(modalClienteRapido));
        }
    }

    if (formClienteRapido) {
        formClienteRapido.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSalvar = formClienteRapido.querySelector('button[type="submit"]');
            if(btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = "Salvando..."; }

            const nome = document.getElementById('rapido-cliente-nome').value.toUpperCase();
            const telefone = document.getElementById('rapido-cliente-telefone').value;

            try {
                const res = await fetch(`${API_URL}/clientes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, telefone, email: '', endereco: '' })
                });

                if (res.ok) {
                    const novoCliente = await res.json();
                    
                    // 1. Fecha o modal PRIMEIRO (para o usuário ver a tela destravada)
                    fecharModalSeguro(modalClienteRapido);
                    
                    // 2. Mostra notificação não-intrusiva
                    showAlert('Cliente cadastrado com sucesso!', true);
                    
                    const inputCliente = document.getElementById('input-search-cliente');
                    if (inputCliente) {
                        inputCliente.value = nome;
                        selectedItems.cliente = novoCliente.id;
                        vendaAtual.cliente_id = novoCliente.id;
                        inputCliente.classList.add('bg-green-50');
                        setTimeout(() => document.getElementById('input-search-produto').focus(), 300);
                    }
                } else {
                    showAlert('Erro ao cadastrar cliente.', false);
                }
            } catch (err) { console.error(err); showAlert('Erro de conexão.', false); } 
            finally { if(btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = "Salvar"; } }
        });
    }

    // --- 2. SERVIÇO RÁPIDO ---
    const btnNovoServicoRapido = document.getElementById('btn-novo-servico-rapido');
    const modalServicoRapido = document.getElementById('modal-rapido-servico');
    const formServicoRapido = document.getElementById('form-rapido-servico');

    if (btnNovoServicoRapido) {
        btnNovoServicoRapido.addEventListener('click', () => {
            if (modalServicoRapido) {
                formServicoRapido.reset();
                modalServicoRapido.classList.remove('hidden');
                setTimeout(() => document.getElementById('rapido-servico-nome').focus(), 100);
            }
        });
    }

    if (modalServicoRapido) {
        const btnCancelar = modalServicoRapido.querySelector('button[type="button"]');
        if (btnCancelar) {
            btnCancelar.removeAttribute('onclick');
            btnCancelar.addEventListener('click', () => fecharModalSeguro(modalServicoRapido));
        }
    }

    if (formServicoRapido) {
        formServicoRapido.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSalvar = formServicoRapido.querySelector('button[type="submit"]');
            if(btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = "Salvando..."; }

            const nome = document.getElementById('rapido-servico-nome').value.toUpperCase();
            const preco = parseFloat(document.getElementById('rapido-servico-preco').value) || 0;

            try {
                const res = await fetch(`${API_URL}/servicos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, preco, descricao: 'Cadastro Rápido' })
                });

                if (res.ok) {
                    const novoServico = await res.json();
                    
                    fecharModalSeguro(modalServicoRapido);
                    showAlert('Serviço cadastrado!', true);

                    const inputServico = document.getElementById('input-search-servico');
                    if (inputServico) {
                        inputServico.value = nome;
                        selectedItems.servico = novoServico.id;
                        document.getElementById('input-servico-valor-manual').value = preco.toFixed(2);
                        document.getElementById('input-servico-qtd').focus();
                    }
                } else {
                    showAlert('Erro ao cadastrar serviço.', false);
                }
            } catch (err) { console.error(err); showAlert('Erro de conexão.', false); }
            finally { if(btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = "Salvar"; } }
        });
    }

    // --- 3. PRODUTO RÁPIDO ---
    const btnNovoProdutoRapido = document.getElementById('btn-novo-produto-rapido');
    const modalProdutoRapido = document.getElementById('produto-modal');
    const formProdutoRapido = document.getElementById('produto-form-rapido');
    const btnCancelarProdutoRapido = document.getElementById('btn-cancelar-rapido');

    if (btnNovoProdutoRapido) {
        btnNovoProdutoRapido.addEventListener('click', () => {
            if (modalProdutoRapido) {
                formProdutoRapido.reset();
                modalProdutoRapido.classList.remove('hidden');
                setTimeout(() => document.getElementById('rapido-nome').focus(), 100);
            }
        });
    }

    if (btnCancelarProdutoRapido) {
        btnCancelarProdutoRapido.addEventListener('click', () => fecharModalSeguro(modalProdutoRapido));
    }

    if (formProdutoRapido) {
        formProdutoRapido.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSalvar = formProdutoRapido.querySelector('button[type="submit"]');
            if(btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = "Salvando..."; }

            const dados = {
                nome: document.getElementById('rapido-nome').value.toUpperCase(),
                preco_unitario: parseFloat(document.getElementById('rapido-preco').value) || 0,
                valor_custo: parseFloat(document.getElementById('rapido-custo').value) || 0,
                quantidade_em_estoque: parseFloat(document.getElementById('rapido-estoque').value) || 0,
                stock_minimo: parseFloat(document.getElementById('rapido-minimo').value) || 0,
                descricao: 'Cadastro Rápido'
            };

            try {
                const res = await fetch(`${API_URL}/produtos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });

                if (res.ok) {
                    const novoProduto = await res.json();
                    
                    fecharModalSeguro(modalProdutoRapido);
                    showAlert('Produto cadastrado com sucesso!', true);

                    const inputProd = document.getElementById('input-search-produto');
                    if (inputProd) {
                        inputProd.value = dados.nome;
                        selectedItems.produto = novoProduto.id;
                        document.getElementById('input-produto-valor-manual').value = dados.preco_unitario.toFixed(2);
                        document.getElementById('input-produto-qtd').focus();
                    }
                } else {
                    const err = await res.json().catch(() => ({}));
                    showAlert('Erro: ' + (err.message || 'Verifique se o nome já existe.'), false);
                }
            } catch (err) { console.error(err); showAlert('Erro de conexão.', false); } 
            finally { if(btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = "Salvar"; } }
        });
    }
});