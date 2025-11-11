// public/js/gestao_vendas.js (Versão Final, Limpa e Corrigida)

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO E VARIÁVEIS GLOBAIS ---
    const API_URL = 'http://localhost:3002/api';
    const TAXA_PARCELAMENTO = 0.05; // Taxa de 5%
    
    let listaClientes = [], listaProdutos = [], listaServicos = [];
    let listaFormasPagamento = [];
    let listaContasCaixa = [];
    
    let vendaAtual = {
        cliente_id: null,
        itens: [],
        total: 0,
        subtotal: 0,
        desconto_tipo: 'R$',
        desconto_valor: 0,
        FormaPagamentoID: null,
        ContaCaixaID: null,
        DataVencimento: null,
        numParcelas: 1 
    };

    let selectedItems = { cliente: null, produto: null, servico: null };
    let ultimaVendaSalva = null;

    // --- REFERÊNCIAS AOS ELEMENTOS DO DOM ---
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
    const inputDescontoValor = document.getElementById('desconto-valor');
    const selectDescontoTipo = document.getElementById('desconto-tipo');
    const selectFormaPagamento = document.getElementById('select-forma-pagamento');
    const selectContaCaixa = document.getElementById('select-conta-caixa');
    const inputDataVencimento = document.getElementById('input-data-vencimento');
    const blocoContaCaixa = document.getElementById('bloco-conta-caixa');
    const blocoDataVencimento = document.getElementById('bloco-data-vencimento');
    const blocoParcelamento = document.getElementById('bloco-parcelamento');
    const selectNumParcelas = document.getElementById('select-num-parcelas');
    const infoTaxaParcela = document.getElementById('info-taxa-parcela');
    const valorTaxaEl = document.getElementById('valor-taxa');
    const totalParceladoEl = document.getElementById('total-parcelado');

    // --- LISTENERS DE DESCONTO ---
    inputDescontoValor.addEventListener('input', () => {
        vendaAtual.desconto_valor = parseFloat(inputDescontoValor.value) || 0;
        renderizarItensVenda(); 
    });
    selectDescontoTipo.addEventListener('change', () => {
        vendaAtual.desconto_tipo = selectDescontoTipo.value;
        renderizarItensVenda(); 
    });

    // --- FUNÇÕES AUXILIARES ---
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const showAlert = (message, isSuccess = true) => {
        const feedbackAlert = document.getElementById('feedback-alert');
        if (!feedbackAlert) return;
        feedbackAlert.textContent = message;
        feedbackAlert.className = `p-4 mb-4 text-sm rounded-lg ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
        feedbackAlert.classList.remove('hidden');
        setTimeout(() => feedbackAlert.classList.add('hidden'), 5000);
    };

    // --- FUNÇÃO DE AUTOCOMPLETE (Corrigida) ---
    const setupAutocomplete = (inputId, resultsId, type) => {
        const input = document.getElementById(inputId);
        const results = document.getElementById(resultsId);
        let activeIndex = -1;

        const updateActiveItem = () => {
            const items = results.querySelectorAll('.autocomplete-item');
            items.forEach((item, index) => {
                if (index === activeIndex) {
                    item.classList.add('active');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('active');
                }
            });
        };

        input.addEventListener('input', async () => {
            const query = input.value.toLowerCase();
            results.innerHTML = '';
            activeIndex = -1;
            selectedItems[type] = null;
            if (type === 'cliente') vendaAtual.cliente_id = null;
            
            if (!query) { // Busca com 1 dígito
                results.classList.add('hidden');
                return;
            }

            try {
                let searchEndpoint = '';
                if (type === 'produto') searchEndpoint = 'produtos';
                else if (type === 'cliente') searchEndpoint = 'clientes';
                else if (type === 'servico') searchEndpoint = 'servicos';

                const response = await fetch(`${API_URL}/${searchEndpoint}/search?q=${query}`);
                if (!response.ok) throw new Error('A resposta da rede não foi bem-sucedida.');
                
                const filteredItems = await response.json();

                results.classList.remove('hidden');
                if (filteredItems.length === 0) {
                    results.innerHTML = '<div class="autocomplete-item-none">Nenhum resultado encontrado.</div>';
                } else {
                    filteredItems.forEach((item) => {
                        const div = document.createElement('div');
                        div.className = 'autocomplete-item';
                        
                        if (type === 'cliente') {
                            div.textContent = item.nome;
                        } else {
                            const preco = item.preco_unitario || item.preco || 0;
                            const stock = item.quantidade_em_estoque;
                            if (type === 'produto') {
                                div.textContent = `${item.nome} | Stock: ${stock} | (${formatCurrency(preco)})`;
                            } else {
                                div.textContent = `${item.nome} (${formatCurrency(preco)})`;
                            }
                        }
                        
                        div.addEventListener('click', () => {
                            input.value = item.nome;
                            selectedItems[type] = item.id;
                            if (type === 'cliente') vendaAtual.cliente_id = item.id;
                            results.classList.add('hidden');
                        });
                        results.appendChild(div);
                    });
                }
            } catch (error) {
                console.error(`Erro ao buscar ${type}:`, error);
                results.innerHTML = `<div class="autocomplete-item-none">Erro na busca.</div>`;
            }
        });

        input.addEventListener('keydown', (e) => {
            const items = results.querySelectorAll('.autocomplete-item');
            if (results.classList.contains('hidden') || items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                updateActiveItem();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + items.length) % items.length;
                updateActiveItem();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex > -1) {
                    items[activeIndex].click();
                    if (type === 'produto') {
                        document.getElementById('input-produto-qtd').focus();
                    } else if (type === 'servico') {
                        document.getElementById('input-servico-qtd').focus();
                    }
                }
            } else if (e.key === 'Escape') {
                results.classList.add('hidden');
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.autocomplete-container')) {
                results.classList.add('hidden');
            }
        });
    };
    
    // --- FUNÇÃO DE CARREGAMENTO DE DADOS (Corrigida e Limpa) ---
    const popularDadosIniciais = async () => {
        try {
            // Busca tudo em paralelo
            const [clientesRes, formasRes, contasRes] = await Promise.all([
                fetch(`${API_URL}/clientes`),
                fetch(`${API_URL}/financeiro/formaspagamento`),
                fetch(`${API_URL}/financeiro/contascaixa`)
            ]);

            listaClientes = await clientesRes.json();
            listaFormasPagamento = await formasRes.json();
            listaContasCaixa = await contasRes.json();

            // Preenche Formas de Pagamento (Versão única e correta)
            selectFormaPagamento.innerHTML = '<option value="">Selecione a forma...</option>';
            listaFormasPagamento.forEach(forma => {
                const option = document.createElement('option');
                option.value = forma.id;
                option.textContent = forma.Nome;
                option.dataset.tipo = forma.TipoLancamento;
                option.dataset.aceitaParcelas = forma.aceitaParcelas;
                option.dataset.maxParcelas = forma.maxParcelas;
                selectFormaPagamento.appendChild(option);
            });

            // Preenche Contas/Caixa
            selectContaCaixa.innerHTML = '<option value="">Selecione a conta...</option>';
            listaContasCaixa.forEach(conta => {
                const option = document.createElement('option');
                option.value = conta.id;
                option.textContent = conta.Nome;
                selectContaCaixa.appendChild(option);
            });

        } catch (error) {
            console.error("Erro ao carregar dados iniciais:", error);
            showAlert("Erro fatal ao carregar dados financeiros. Verifique o console.", false);
        }
    };

    // --- FUNÇÕES DE RENDERIZAÇÃO E CÁLCULO ---
    const renderizarItensVenda = () => {
        itensVendaContainer.innerHTML = '';
        let subtotal = 0;

        if (vendaAtual.itens.length === 0) {
            carrinhoVazioMsg.style.display = 'block';
        } else {
            carrinhoVazioMsg.style.display = 'none';
            vendaAtual.itens.forEach((item, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'flex justify-between items-center text-sm p-2 bg-gray-50 rounded';
                itemDiv.innerHTML = `
                    <div class="flex-grow">
                        <p class="font-semibold text-gray-800">${item.nome} <span class="text-xs text-gray-500">(${item.tipo})</span></p>
                        <p class="text-gray-600">${item.quantidade} x ${formatCurrency(item.precoUnitario)}</p>
                    </div>
                    <p class="font-semibold w-24 text-right">${formatCurrency(item.subtotal)}</p>
                    <button type="button" data-action="remover-item" data-index="${index}" class="ml-3 text-red-500 hover:text-red-700 font-bold">X</button>`;
                itensVendaContainer.appendChild(itemDiv);
                subtotal += item.subtotal; 
            });
        }

        let valorDoDesconto = 0;
        if (vendaAtual.desconto_tipo === '%') {
            valorDoDesconto = subtotal * (vendaAtual.desconto_valor / 100);
        } else {
            valorDoDesconto = vendaAtual.desconto_valor;
        }
        
        if (valorDoDesconto > subtotal) valorDoDesconto = subtotal;

        const totalFinal = subtotal - valorDoDesconto;

        vendaAtual.subtotal = subtotal;
        vendaAtual.total = totalFinal;

        document.getElementById('subtotal-valor').textContent = formatCurrency(subtotal);
        const descontoAplicadoContainer = document.getElementById('desconto-aplicado-container');
        if (valorDoDesconto > 0) {
            document.getElementById('desconto-aplicado-valor').textContent = `- ${formatCurrency(valorDoDesconto)}`;
            descontoAplicadoContainer.classList.remove('hidden');
        } else {
            descontoAplicadoContainer.classList.add('hidden');
        }
        document.getElementById('total-valor').textContent = formatCurrency(totalFinal);
        
        // Atualiza o cálculo de parcelas (se visível)
        atualizarBlocoParcelamento();

        btnFinalizarVenda.disabled = vendaAtual.itens.length === 0;
    };
    
    const adicionarProduto = async () => {
        const produtoId = selectedItems.produto;
        const quantidade = parseInt(document.getElementById('input-produto-qtd').value);
        if (!produtoId) return showAlert('Selecione um produto da lista.', false);
        if (!quantidade || quantidade <= 0) return showAlert('Insira uma quantidade válida.', false);
        try {
            const res = await fetch(`${API_URL}/produtos/${produtoId}`);
            if (!res.ok) throw new Error('Produto não encontrado.');
            const produto = await res.json();
            const itemExistente = vendaAtual.itens.find(item => item.id === produtoId && item.tipo === 'produto');
            const qtdTotalNoCarrinho = (itemExistente ? itemExistente.quantidade : 0) + quantidade;
            if (qtdTotalNoCarrinho > produto.quantidade_em_estoque) return showAlert(`Stock insuficiente. Disponível: ${produto.quantidade_em_estoque}`, false);
            if (itemExistente) {
                itemExistente.quantidade += quantidade;
                itemExistente.subtotal = itemExistente.quantidade * itemExistente.precoUnitario;
            } else {
                vendaAtual.itens.push({
                    id: produto.id, nome: produto.nome, tipo: 'produto',
                    quantidade: quantidade, precoUnitario: parseFloat(produto.preco_unitario),
                    subtotal: quantidade * parseFloat(produto.preco_unitario)
                });
            }
            renderizarItensVenda();
            document.getElementById('input-search-produto').value = '';
            selectedItems.produto = null;
            document.getElementById('input-produto-qtd').value = 1;
        } catch (error) {
            showAlert(error.message, false);
        }
    };

    const adicionarServico = async () => {
        const servicoId = selectedItems.servico;
        const quantidade = parseInt(document.getElementById('input-servico-qtd').value);
        if (!servicoId) return showAlert('Selecione um serviço da lista.', false);
        if (!quantidade || quantidade <= 0) return showAlert('Insira uma quantidade válida.', false);
        try {
            const res = await fetch(`${API_URL}/servicos/${servicoId}`);
            if (!res.ok) throw new Error('Serviço não encontrado.');
            const servico = await res.json();
            if (vendaAtual.itens.some(item => item.id === servicoId && item.tipo === 'serviço')) {
                return showAlert('Este serviço já foi adicionado.', false);
            }
            vendaAtual.itens.push({
                id: servico.id, nome: servico.nome, tipo: 'serviço',
                quantidade: quantidade, precoUnitario: parseFloat(servico.preco),
                subtotal: quantidade * parseFloat(servico.preco)
            });
            renderizarItensVenda();
            document.getElementById('input-search-servico').value = '';
            document.getElementById('input-servico-qtd').value = 1; 
            selectedItems.servico = null;
        } catch (error) {
            showAlert(error.message, false);
        }
    };

    const removerItem = (index) => {
        vendaAtual.itens.splice(index, 1);
        renderizarItensVenda();
    };

    // --- FUNÇÕES DE LÓGICA DE PAGAMENTO ---
    function handleFormaPagamentoChange() {
        const formaSelecionadaEl = selectFormaPagamento.options[selectFormaPagamento.selectedIndex];
        if (!formaSelecionadaEl || !formaSelecionadaEl.value) {
            blocoParcelamento.classList.add('hidden');
            blocoContaCaixa.classList.add('hidden');
            blocoDataVencimento.classList.add('hidden');
            return;
        }
        const tipo = formaSelecionadaEl.dataset.tipo;
        const aceitaParcelas = formaSelecionadaEl.dataset.aceitaParcelas === '1';
        const maxParcelas = parseInt(formaSelecionadaEl.dataset.maxParcelas) || 1;
        
        blocoParcelamento.classList.add('hidden');
        blocoContaCaixa.classList.add('hidden');
        blocoDataVencimento.classList.add('hidden');
        infoTaxaParcela.classList.add('hidden');

        if (tipo === 'A_PRAZO') { // "Fiado"
            blocoDataVencimento.classList.remove('hidden');
            vendaAtual.numParcelas = 1; 
        } else if (aceitaParcelas) { // "Cartão de Crédito"
            blocoParcelamento.classList.remove('hidden');
            blocoContaCaixa.classList.remove('hidden'); 
            selectNumParcelas.innerHTML = '';
            for (let i = 1; i <= maxParcelas; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i}x` + (i > 1 ? ` (com taxa 5%)` : ` (sem taxa)`);
                selectNumParcelas.appendChild(option);
            }
            atualizarBlocoParcelamento();
        } else { // "Pix / Dinheiro"
            blocoContaCaixa.classList.remove('hidden');
            vendaAtual.numParcelas = 1;
        }
    }
    
    function atualizarBlocoParcelamento() {
        // Só executa se o bloco estiver visível
        if (blocoParcelamento.classList.contains('hidden')) {
            return;
        }

        const numParcelas = parseInt(selectNumParcelas.value) || 1;
        vendaAtual.numParcelas = numParcelas; 

        if (numParcelas > 1) {
            const total = vendaAtual.total;
            const valorTaxa = parseFloat((total * TAXA_PARCELAMENTO).toFixed(2));
            const valorLiquido = total - valorTaxa;
            const valorParcela = parseFloat((valorLiquido / numParcelas).toFixed(2));
            const valorUltimaParcela = valorLiquido - (valorParcela * (numParcelas - 1));
            
            valorTaxaEl.textContent = valorTaxa.toFixed(2);
            totalParceladoEl.textContent = `${numParcelas}x de ${formatCurrency(valorParcela)} (última de ${formatCurrency(valorUltimaParcela)})`;
            infoTaxaParcela.classList.remove('hidden');
        } else {
            infoTaxaParcela.classList.add('hidden');
        }
    }

    // --- FUNÇÃO DE FINALIZAR VENDA ---
    const finalizarVenda = async () => {
        const formaId = selectFormaPagamento.value;
        const contaId = selectContaCaixa.value;
        const dataVenc = inputDataVencimento.value;
        const formaSelecionada = listaFormasPagamento.find(f => f.id == formaId);
        
        vendaAtual.FormaPagamentoID = parseInt(formaId);
        vendaAtual.numParcelas = parseInt(selectNumParcelas.value) || 1; 

        if (!formaId || !formaSelecionada) {
            showAlert('Por favor, selecione uma Forma de Pagamento.', false); return;
        }
        if (formaSelecionada.TipoLancamento === 'A_VISTA' && !contaId) {
            showAlert('Por favor, selecione a Conta/Caixa de destino.', false); return; 
        }
        if (formaSelecionada.TipoLancamento === 'A_PRAZO') {
            if (!vendaAtual.cliente_id) {
                showAlert('Vendas "Fiado" (A Prazo) exigem um cliente selecionado.', false); return;
            }
            if (!dataVenc) {
                showAlert('Por favor, insira a Data de Vencimento para o fiado.', false); return;
            }
        }
        
        vendaAtual.ContaCaixaID = (formaSelecionada.TipoLancamento === 'A_VISTA') ? parseInt(contaId) : null;
        vendaAtual.DataVencimento = (formaSelecionada.TipoLancamento === 'A_PRAZO') ? dataVenc : null;

        btnFinalizarVenda.disabled = true;
        try {
            const response = await fetch(`${API_URL}/vendas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vendaAtual)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            ultimaVendaSalva = { ...vendaAtual, id: result.id, data: new Date() };
            confirmacaoTextoEl.textContent = `Venda #${result.id} | Valor Total: ${formatCurrency(vendaAtual.total)}`;
            const parentGrid = vendaForm.querySelector('.grid');
            if(parentGrid) parentGrid.style.display = 'none';
            vendaConfirmacaoEl.style.display = 'block';

        } catch (error) {
            showAlert(`Erro: ${error.message}`, false);
        } finally {
            btnFinalizarVenda.disabled = false;
        }
    };

    // --- FUNÇÃO DE IMPRESSÃO ---
    const imprimirRecibo = () => {
        if (!ultimaVendaSalva) return;
        const template = document.getElementById('recibo-template');
        const clone = template.content.cloneNode(true);
        const cliente = listaClientes.find(c => c.id === ultimaVendaSalva.cliente_id);

        clone.querySelector('[data-recibo="venda-id"]').textContent = ultimaVendaSalva.id;
        clone.querySelector('[data-recibo="data"]').textContent = new Date(ultimaVendaSalva.data).toLocaleDateString('pt-BR');
        clone.querySelector('[data-recibo="cliente-nome"]').textContent = cliente ? cliente.nome : 'Consumidor Final';

        const tabelaItensBody = clone.querySelector('[data-recibo="itens-tabela"]');
        ultimaVendaSalva.itens.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.nome} (${item.tipo})</td>
                <td class="text-center">${item.quantidade}</td>
                <td class="text-right">${formatCurrency(item.precoUnitario)}</td>
                <td class="text-right">${formatCurrency(item.subtotal)}</td>
            `;
            tabelaItensBody.appendChild(tr);
        });

        clone.querySelector('[data-recibo="subtotal"]').textContent = formatCurrency(ultimaVendaSalva.subtotal);
        clone.querySelector('[data-recibo="total"]').textContent = formatCurrency(ultimaVendaSalva.total);

        const descontoInfo = clone.querySelector('[data-recibo="desconto-info"]');
        if (ultimaVendaSalva.desconto_valor > 0) {
            let valorDoDesconto = 0;
            if (ultimaVendaSalva.desconto_tipo === '%') {
                valorDoDesconto = ultimaVendaSalva.subtotal * (ultimaVendaSalva.desconto_valor / 100);
            } else {
                valorDoDesconto = ultimaVendaSalva.desconto_valor;
            }
            clone.querySelector('[data-recibo="desconto"]').textContent = `- ${formatCurrency(valorDoDesconto)}`;
            descontoInfo.classList.remove('hidden');
        }

        const htmlContent = new XMLSerializer().serializeToString(clone);
        const filename = `Venda_${ultimaVendaSalva.id}.pdf`;
        window.electronAPI.send('print-to-pdf', { html: htmlContent, name: filename });
    };

    const resetarParaNovaVenda = () => {
        window.location.reload();
    };

    // --- REGISTO DOS EVENT LISTENERS ---
    btnAddProduto.addEventListener('click', adicionarProduto);
    btnAddServico.addEventListener('click', adicionarServico);
    vendaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        finalizarVenda();
    });
    btnNovaVenda.addEventListener('click', resetarParaNovaVenda);
    btnImprimirRecibo.addEventListener('click', imprimirRecibo);
    itensVendaContainer.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action="remover-item"]');
        if (button) {
            removerItem(parseInt(button.dataset.index));
        }
    });

    // --- Listeners de Pagamento (Corrigidos, sem duplicados) ---
    selectFormaPagamento.addEventListener('change', handleFormaPagamentoChange);
    selectNumParcelas.addEventListener('change', atualizarBlocoParcelamento);

    // --- INICIALIZAÇÃO DA PÁGINA ---
    setupAutocomplete('input-search-cliente', 'results-cliente', 'cliente');
    setupAutocomplete('input-search-produto', 'results-produto', 'produto');
    setupAutocomplete('input-search-servico', 'results-servico', 'servico');
    
    popularDadosIniciais(); 
    renderizarItensVenda();
});