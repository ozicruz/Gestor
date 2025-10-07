// public/js/gestao_produtos.js

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';

    // --- ELEMENTOS DO DOM ---
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
    const inputBusca = document.getElementById('input-busca-produto'); // CORREÇÃO: Referência ao campo de busca

    let todosOsProdutos = []; // Nova variável global

    // --- FUNÇÕES AUXILIARES ---
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const parseCurrency = (value) => parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
    const showAlert = (message, isSuccess = true) => {
        feedbackAlert.textContent = message;
        feedbackAlert.className = `feedback-alert p-4 mb-4 text-sm rounded-lg ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
        feedbackAlert.style.display = 'block';
        setTimeout(() => { feedbackAlert.style.display = 'none'; }, 4000);
    };
    
    // CORREÇÃO: A função de desenhar a tabela foi movida para fora, para ser reutilizável.
    const desenharTabela = (produtosParaRenderizar) => {
        tabelaProdutosBody.innerHTML = '';
        if (produtosParaRenderizar.length === 0) {
            tabelaProdutosBody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-4">Nenhum produto encontrado.</td></tr>`;
            return;
        }
        produtosParaRenderizar.forEach(produto => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${produto.nome}</div><div class="text-sm text-gray-500">${(produto.descricao || '').substring(0, 40)}</div></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${produto.quantidade_em_estoque}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatCurrency(produto.preco_unitario)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button data-action="editar-produto" data-produto-id="${produto.id}" class="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
                    <button data-action="remover-produto" data-produto-id="${produto.id}" class="text-red-600 hover:text-red-900">Remover</button>
                </td>
            `;
            tabelaProdutosBody.appendChild(tr);
        });
    };

    // --- FUNÇÕES PRINCIPAIS (CRUD) ---
    const renderizarTabela = async () => {
        try {
            const response = await fetch(`${API_URL}/produtos`);
            if (!response.ok) throw new Error('Erro ao carregar produtos.');
            
            const produtos = await response.json();
            todosOsProdutos = produtos; // Guarda a lista completa
            desenharTabela(todosOsProdutos); // Chama a função para desenhar a tabela inicial

        } catch (error) {
            showAlert(error.message, false);
        }
    };

    const abrirModal = async (isEdit = false, produtoId = null) => {
        produtoForm.reset();
        inputId.value = '';
        if (isEdit && produtoId) {
            modalTitle.textContent = 'Editar Produto';
            try {
                const response = await fetch(`${API_URL}/produtos/${produtoId}`);
                if (!response.ok) throw new Error('Produto não encontrado.');
                const produto = await response.json();
                
                inputId.value = produto.id;
                inputNome.value = produto.nome;
                inputDescricao.value = produto.descricao;
                inputEstoque.value = produto.quantidade_em_estoque;
                inputPreco.value = parseFloat(produto.preco_unitario).toFixed(2).replace('.', ',');
            } catch (error) {
                showAlert(error.message, false);
                return;
            }
        } else {
            modalTitle.textContent = 'Novo Produto';
        }
        modal.classList.add('active');
    };

    const fecharModal = () => modal.classList.remove('active');

    const removerProduto = async (id) => {
        if (confirm('Tem a certeza que deseja remover este produto?')) {
            try {
                const response = await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showAlert(result.message);
                renderizarTabela();
            } catch (error) {
                showAlert(error.message, false);
            }
        }
    };

    // --- EVENT LISTENERS ---
    btnNovoProduto.addEventListener('click', () => abrirModal(false));
    btnCancelar.addEventListener('click', fecharModal);
    
    produtoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = inputId.value;
        const produtoData = {
            nome: inputNome.value,
            descricao: inputDescricao.value,
            quantidade_em_estoque: parseInt(inputEstoque.value, 10),
            preco_unitario: parseCurrency(inputPreco.value)
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
            renderizarTabela();
        } catch (error) {
            showAlert(error.message, false);
        }
    });

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

    // CORREÇÃO: O event listener da busca foi movido para aqui, para dentro do DOMContentLoaded.
    inputBusca.addEventListener('input', () => {
        const termo = inputBusca.value.toLowerCase();
        const produtosFiltrados = todosOsProdutos
            .filter(produto => produto.nome.toLowerCase().includes(termo))
            .sort((a, b) => a.nome.localeCompare(b.nome)); // <-- ADICIONE ESTA LINHA

        desenharTabela(produtosFiltrados);
    });

    // --- INICIALIZAÇÃO ---
    renderizarTabela();
});
// CORREÇÃO: A chave '}' extra no final do ficheiro foi removida.