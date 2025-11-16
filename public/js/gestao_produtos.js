// public/js/gestao_produtos.js (Versão Final com Stock Mínimo)

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';

    // --- ELEMENTOS DO DOM (ATUALIZADO) ---
    const tabelaProdutosBody = document.getElementById('tabela-produtos');
    const modal = document.getElementById('produto-modal');
    const modalTitle = document.getElementById('modal-title');
    const produtoForm = document.getElementById('produto-form');
    const btnNovoProduto = document.getElementById('btnNovoProduto');
    const btnCancelar = document.getElementById('btn-cancelar');
    const feedbackAlert = document.getElementById('feedback-alert');
    const inputId = document.getElementById('produto-id');
    const inputNome = document.getElementById('produto-nome');
    const inputDescricao = document.getElementById('produto-descricao');
    const inputEstoque = document.getElementById('produto-estoque');
    const inputPreco = document.getElementById('produto-preco');
    const inputCusto = document.getElementById('produto-custo');
    const inputStockMinimo = document.getElementById('produto-stock-minimo'); // --- NOVO ---
    const inputBusca = document.getElementById('input-busca-produto');
    const headersTabela = document.querySelectorAll('#tabela-produtos-header th[data-sort]');

    let todosOsProdutos = [];
    let sortColumn = 'nome'; 
    let sortDirection = 'asc'; 

    // --- FUNÇÕES AUXILIARES (CORRIGIDAS) ---
    
    const parseCurrency = (value) => {
        if (typeof value !== 'string') {
            return (typeof value === 'number') ? value : 0;
        }
        const soNumerosEVirgula = value.replace(/[^0-9,]/g, '');
        const numeroComPonto = soNumerosEVirgula.replace(',', '.');
        return parseFloat(numeroComPonto) || 0;
    };
    
    const formatCurrencyForInput = (value) => {
        return (parseFloat(value) || 0).toFixed(2).replace('.', ',');
    };
    
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    
    const showAlert = (message, isSuccess = true) => {
        feedbackAlert.textContent = message;
        feedbackAlert.className = `feedback-alert p-4 mb-4 text-sm rounded-lg ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
        feedbackAlert.style.display = 'block';
        setTimeout(() => { feedbackAlert.style.display = 'none'; }, 4000);
    };
    
    // --- FUNÇÕES PRINCIPAIS (CRUD) ---
    
    const carregarProdutos = async () => {
        try {
            const response = await fetch(`${API_URL}/produtos`);
            if (!response.ok) throw new Error('Erro ao carregar produtos.');
            
            todosOsProdutos = await response.json();
            aplicarFiltroEOrdem(); 
        } catch (error) {
            showAlert(error.message, false);
        }
    };

    const aplicarFiltroEOrdem = () => {
        const termo = inputBusca.value.toLowerCase();
        const produtosFiltrados = todosOsProdutos.filter(produto => 
            produto.nome.toLowerCase().includes(termo)
        );

        // ATUALIZADO: Adicionado 'stock_minimo'
        produtosFiltrados.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            if (['quantidade_em_estoque', 'preco_unitario', 'valor_custo', 'stock_minimo'].includes(sortColumn)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else { 
                valA = (valA || '').toLowerCase();
                valB = (valB || '').toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        desenharTabela(produtosFiltrados);
    };

    // ATUALIZADO: Adicionada coluna "Stock Mín."
    const desenharTabela = (produtosParaRenderizar) => {
        tabelaProdutosBody.innerHTML = '';
        if (produtosParaRenderizar.length === 0) {
            tabelaProdutosBody.innerHTML = `<tr><td colspan="6" class="text-center text-gray-500 py-4">Nenhum produto encontrado.</td></tr>`;
            return;
        }
        produtosParaRenderizar.forEach(produto => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${produto.nome}</div><div class="text-sm text-gray-500">${(produto.descricao || '').substring(0, 40)}...</div></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${produto.quantidade_em_estoque}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${produto.stock_minimo}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatCurrency(produto.valor_custo)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatCurrency(produto.preco_unitario)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button data-action="editar-produto" data-produto-id="${produto.id}" class="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
                    <button data-action="remover-produto" data-produto-id="${produto.id}" class="text-red-600 hover:text-red-900">Remover</button>
                </td>
            `;
            tabelaProdutosBody.appendChild(tr);
        });
    };

    // --- Funções do Modal (ATUALIZADAS) ---
    
    const abrirModal = async (isEdit = false, produtoId = null) => {
        produtoForm.reset();
        inputId.value = '';
        if (isEdit && produtoId) {
            modalTitle.textContent = 'Editar Produto';
            const produto = todosOsProdutos.find(p => p.id === produtoId);
            if (produto) {
                inputId.value = produto.id;
                inputNome.value = produto.nome;
                inputDescricao.value = produto.descricao;
                inputEstoque.value = produto.quantidade_em_estoque;
                inputStockMinimo.value = produto.stock_minimo || 0; // --- NOVO ---
                inputCusto.value = formatCurrencyForInput(produto.valor_custo);
                inputPreco.value = formatCurrencyForInput(produto.preco_unitario);
            } else {
                showAlert('Erro: Produto não encontrado para edição.', false);
                return;
            }
        } else {
            modalTitle.textContent = 'Novo Produto';
            inputCusto.value = '0,00';
            inputPreco.value = '0,00';
            inputEstoque.value = 0;
            inputStockMinimo.value = 0; // --- NOVO ---
        }
        modal.classList.remove('modal-oculto');
        setTimeout(() => { inputNome.focus(); }, 100);
    };

    const fecharModal = () => modal.classList.add('modal-oculto');

    const removerProduto = async (id) => {
        if (confirm('Tem a certeza que deseja remover este produto?')) {
            try {
                const response = await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showAlert(result.message);
                carregarProdutos(); 
            } catch (error) {
                showAlert(error.message, false);
            }
        }
    };

    // --- EVENT LISTENERS ---
    btnNovoProduto.addEventListener('click', () => abrirModal(false));
    btnCancelar.addEventListener('click', fecharModal);
    
    // Listener do Formulário (ATUALIZADO)
    produtoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = inputId.value;
        
        // ATUALIZADO: Adiciona 'stock_minimo'
        const produtoData = {
            nome: inputNome.value,
            descricao: inputDescricao.value,
            quantidade_em_estoque: parseInt(inputEstoque.value, 10),
            preco_unitario: parseCurrency(inputPreco.value),
            valor_custo: parseCurrency(inputCusto.value),
            stock_minimo: parseInt(inputStockMinimo.value, 10) // --- NOVO ---
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/produtos/${id}` : `${API_URL}/produtos`;

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produtoData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            showAlert(result.message);
            fecharModal();
            carregarProdutos(); 
        } catch (error) {
            showAlert(error.message, false);
        }
    });

    // Listener da Tabela (para Editar/Remover)
    tabelaProdutosBody.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const produtoId = button.dataset.produtoId;

        if (action === 'editar-produto') {
            abrirModal(true, parseInt(produtoId));
        }
        if (action === 'remover-produto') {
            removerProduto(parseInt(produtoId));
        }
    });

    // Listener da Busca
    inputBusca.addEventListener('input', aplicarFiltroEOrdem);

    // Listener para ORDENAÇÃO
    headersTabela.forEach(header => {
        header.addEventListener('click', () => {
            const newSortColumn = header.dataset.sort;
            
            if (sortColumn === newSortColumn) {
                sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
            } else {
                sortColumn = newSortColumn;
                sortDirection = 'asc';
            }
            
            headersTabela.forEach(h => {
                const arrow = h.querySelector('.sort-arrow');
                if (h.dataset.sort === sortColumn) {
                    arrow.innerHTML = sortDirection === 'asc' ? ' ▲' : ' ▼';
                } else {
                    arrow.innerHTML = ''; 
                }
            });

            aplicarFiltroEOrdem();
        });
    });

    // --- INICIALIZAÇÃO ---
    carregarProdutos();
});