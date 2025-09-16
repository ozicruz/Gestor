// public/js/gestao_vendas.js

// O evento DOMContentLoaded garante que todo o código JavaScript só será executado
// após o HTML da página ter sido completamente carregado.
document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO E VARIÁVEIS GLOBAIS ---

    // Define a URL base para todas as chamadas à API do backend.
    const API_URL = 'http://localhost:3002/api';

    // Variáveis para armazenar em memória os dados vindos do backend.
    let listaClientes = [],
        listaProdutos = [],
        listaServicos = [];

    // Objeto que representa o estado atual da venda (o "carrinho de compras").
    let vendaAtual = {
        cliente_id: null,
        itens: [],
        total: 0
    };

    // Objeto para guardar temporariamente o item selecionado nos campos de autocomplete.
    let selectedItems = {
        cliente: null,
        produto: null,
        servico: null
    };
    
    // Variável para armazenar os detalhes da última venda salva, para fins de impressão.
    let ultimaVendaSalva = null;

    // --- REFERÊNCIAS AOS ELEMENTOS DO DOM ---

    const btnAddProduto = document.getElementById('btn-add-produto');
    const btnAddServico = document.getElementById('btn-add-servico');
    const btnFinalizarVenda = document.getElementById('btn-finalizar-venda');
    const itensVendaContainer = document.getElementById('itens-venda-container');
    const carrinhoVazioMsg = document.getElementById('carrinho-vazio-msg');
    const totalValorEl = document.getElementById('total-valor');
    const vendaForm = document.getElementById('venda-form');
    const vendaConfirmacaoEl = document.getElementById('venda-confirmacao');
    const confirmacaoTextoEl = document.getElementById('confirmacao-texto');
    const btnNovaVenda = document.getElementById('btn-nova-venda');
    const btnImprimirRecibo = document.getElementById('btn-imprimir-recibo');

    // --- FUNÇÕES AUXILIARES ---

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const showAlert = (message, isSuccess = true) => {
        const feedbackAlert = document.getElementById('feedback-alert');
        feedbackAlert.textContent = message;
        feedbackAlert.className = `p-4 mb-4 text-sm rounded-lg ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
        feedbackAlert.classList.remove('hidden');
        setTimeout(() => feedbackAlert.classList.add('hidden'), 5000);
    };

    // --- FUNÇÕES PRINCIPAIS ---

    const popularDados = async () => {
        try {
            const [clientesRes, produtosRes, servicosRes] = await Promise.all([
                fetch(`${API_URL}/clientes`),
                fetch(`${API_URL}/produtos`),
                fetch(`${API_URL}/servicos`)
            ]);
            listaClientes = await clientesRes.json();
            listaProdutos = await produtosRes.json();
            listaServicos = await servicosRes.json();

            setupAutocomplete('input-search-cliente', 'results-cliente', listaClientes, 'cliente');
            setupAutocomplete('input-search-produto', 'results-produto', listaProdutos, 'produto');
            setupAutocomplete('input-search-servico', 'results-servico', listaServicos, 'servico');
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            showAlert('Não foi possível carregar os dados do servidor.', false);
        }
    };

    const setupAutocomplete = (inputId, resultsId, items, type) => {
        const input = document.getElementById(inputId);
        const results = document.getElementById(resultsId);

        input.addEventListener('input', () => {
            const query = input.value.toLowerCase();
            results.innerHTML = '';
            selectedItems[type] = null;
            if (type === 'cliente') vendaAtual.cliente_id = null;
            if (!query) {
                results.classList.add('hidden');
                return;
            }

            const filteredItems = items
                .filter(item => item.nome.toLowerCase().startsWith(query))
                .sort((a, b) => a.nome.localeCompare(b.nome));

            results.classList.remove('hidden');
            filteredItems.forEach((item) => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.textContent = item.preco_unitario ? `${item.nome} (${formatCurrency(item.preco_unitario)})` : (item.preco ? `${item.nome} (${formatCurrency(item.preco)})` : item.nome);
                
                div.addEventListener('click', () => {
                    input.value = item.nome;
                    selectedItems[type] = item.id;
                    if (type === 'cliente') vendaAtual.cliente_id = item.id;
                    results.classList.add('hidden');
                });
                results.appendChild(div);
            });
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('.autocomplete-container') !== input.parentElement) {
                results.classList.add('hidden');
            }
        });
    };

    const renderizarItensVenda = () => {
        itensVendaContainer.innerHTML = '';
        vendaAtual.total = 0;

        if (vendaAtual.itens.length === 0) {
            itensVendaContainer.appendChild(carrinhoVazioMsg);
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
                vendaAtual.total += item.subtotal;
            });
        }

        totalValorEl.textContent = formatCurrency(vendaAtual.total);
        btnFinalizarVenda.disabled = vendaAtual.itens.length === 0;
    };

    const adicionarProduto = () => {
        const produtoId = selectedItems.produto;
        const quantidade = parseInt(document.getElementById('input-produto-qtd').value);

        if (!produtoId) return alert('Selecione um produto da lista.');
        if (!quantidade || quantidade <= 0) return alert('Insira uma quantidade válida.');
        
        const produto = listaProdutos.find(p => p.id === produtoId);
        const itemExistente = vendaAtual.itens.find(item => item.id === produtoId && item.tipo === 'produto');
        
        const qtdTotalNoCarrinho = (itemExistente ? itemExistente.quantidade : 0) + quantidade;
        if (qtdTotalNoCarrinho > produto.quantidade_em_estoque) return alert(`Stock insuficiente. Disponível: ${produto.quantidade_em_estoque}`);

        if (itemExistente) {
            itemExistente.quantidade += quantidade;
            itemExistente.subtotal = itemExistente.quantidade * itemExistente.precoUnitario;
        } else {
            vendaAtual.itens.push({
                id: produto.id,
                nome: produto.nome,
                tipo: 'produto',
                quantidade: quantidade,
                precoUnitario: parseFloat(produto.preco_unitario),
                subtotal: quantidade * parseFloat(produto.preco_unitario)
            });
        }
        renderizarItensVenda();
        document.getElementById('input-search-produto').value = '';
        selectedItems.produto = null;
    };

    const adicionarServico = () => {
        const servicoId = selectedItems.servico;
        if (!servicoId) return alert('Selecione um serviço da lista.');
        if (vendaAtual.itens.some(item => item.id === servicoId && item.tipo === 'serviço')) return alert('Este serviço já foi adicionado.');
        
        const servico = listaServicos.find(s => s.id === servicoId);
        vendaAtual.itens.push({
            id: servico.id,
            nome: servico.nome,
            tipo: 'serviço',
            quantidade: 1,
            precoUnitario: parseFloat(servico.preco),
            subtotal: parseFloat(servico.preco)
        });
        renderizarItensVenda();
        document.getElementById('input-search-servico').value = '';
        selectedItems.servico = null;
    };

    const removerItem = (index) => {
        vendaAtual.itens.splice(index, 1);
        renderizarItensVenda();
    };

    const finalizarVenda = async () => {
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
            vendaForm.style.display = 'none';
            vendaConfirmacaoEl.style.display = 'block';

        } catch (error) {
            alert(`Erro: ${error.message}`);
            btnFinalizarVenda.disabled = false;
        }
    };

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
            tr.innerHTML = `<td>${item.nome} (${item.tipo})</td><td style="text-align: center;">${item.quantidade}</td><td style="text-align: right;">${formatCurrency(item.precoUnitario)}</td><td style="text-align: right;">${formatCurrency(item.subtotal)}</td>`;
            tabelaItensBody.appendChild(tr);
        });
        clone.querySelector('[data-recibo="total"]').textContent = formatCurrency(ultimaVendaSalva.total);

        const htmlContent = new XMLSerializer().serializeToString(clone);
        const filename = `Venda_${ultimaVendaSalva.id}.pdf`;

        // Envia o HTML e o nome do ficheiro para o processo principal (main.js)
        window.electronAPI.send('print-to-pdf', { html: htmlContent, name: filename });
    };

    const resetarParaNovaVenda = () => {
        vendaAtual = {
            cliente_id: null,
            itens: [],
            total: 0
        };
        selectedItems = {
            cliente: null,
            produto: null,
            servico: null
        };
        // O método reset() só funciona em elementos <form>
        if (vendaForm) {
            vendaForm.reset();
        }
        vendaForm.style.display = 'block';
        vendaConfirmacaoEl.style.display = 'none';
        popularDados();
        renderizarItensVenda();
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

    // --- INICIALIZAÇÃO DA PÁGINA ---
    
    popularDados();
    renderizarItensVenda();
});