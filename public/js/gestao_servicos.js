// public/js/gestao_servicos.js (Versão CORRIGIDA com Ordenação e Filtro)

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';

    // --- ELEMENTOS DO DOM ---
    const tabelaServicosBody = document.getElementById('tabela-servicos');
    const modal = document.getElementById('servico-modal');
    const modalTitle = document.getElementById('modal-title');
    const servicoForm = document.getElementById('servico-form');
    const btnNovoServico = document.getElementById('btnNovoServico');
    const btnCancelar = document.getElementById('btn-cancelar');
    const feedbackAlert = document.getElementById('feedback-alert');
    const inputId = document.getElementById('servico-id');
    const inputNome = document.getElementById('servico-nome');
    const inputDescricao = document.getElementById('servico-descricao');
    const inputPreco = document.getElementById('servico-preco');
    const inputBusca = document.getElementById('input-busca-servico');

    // --- NOVO: Seletores e Variáveis de Ordenação ---
    const headersTabela = document.querySelectorAll('#tabela-servicos-header th[data-sort]');
    let todosOsServicos = [];
    let sortColumn = 'nome'; // Coluna padrão
    let sortDirection = 'asc'; // Direção padrão

    // --- FUNÇÕES AUXILIARES ---
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const parseCurrency = (value) => parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
    const showAlert = (message, isSuccess = true) => {
        feedbackAlert.textContent = message;
        feedbackAlert.className = `feedback-alert p-4 mb-4 text-sm rounded-lg ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
        feedbackAlert.style.display = 'block';
        setTimeout(() => { feedbackAlert.style.display = 'none'; }, 4000);
    };

    // --- FUNÇÕES PRINCIPAIS (CRUD) ---

    // 1. Busca os dados da API
    const carregarServicos = async () => {
        try {
            const response = await fetch(`${API_URL}/servicos`);
            if (!response.ok) throw new Error('Erro ao carregar serviços.');

            todosOsServicos = await response.json();
            aplicarFiltroEOrdem(); // Chama a nova função central
        } catch (error) {
            showAlert(error.message, false);
        }
    };

    // 2. ATUALIZADO: Função central que filtra, ordena e desenha
    const aplicarFiltroEOrdem = () => {
        const termo = inputBusca.value.toLowerCase();

        // 2a. Filtra
        const servicosFiltrados = todosOsServicos.filter(servico =>
            servico.nome.toLowerCase().includes(termo)
        );

        // 2b. Ordena (Lógica de ordenação dinâmica)
        servicosFiltrados.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            if (sortColumn === 'preco') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else { // Trata strings (nome)
                valA = (valA || '').toLowerCase();
                valB = (valB || '').toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // 2c. Desenha
        desenharTabela(servicosFiltrados);
    };

    // 3. A função de desenhar a tabela (sem alterações)
    const desenharTabela = (servicosParaRenderizar) => {
        tabelaServicosBody.innerHTML = '';
        if (servicosParaRenderizar.length === 0) {
            tabelaServicosBody.innerHTML = `<tr><td colspan="3" class="text-center text-gray-500 py-4">Nenhum serviço encontrado.</td></tr>`;
            return;
        }
        servicosParaRenderizar.forEach(servico => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${servico.nome}</div><div class="text-sm text-gray-500">${(servico.descricao || '').substring(0, 40)}...</div></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatCurrency(servico.preco)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button data-action="editar-servico" data-servico-id="${servico.id}" class="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
                    <button data-action="remover-servico" data-servico-id="${servico.id}" class="text-red-600 hover:text-red-900">Remover</button>
                </td>
            `;
            tabelaServicosBody.appendChild(tr);
        });
    };

    // --- Funções do Modal (abrir, fechar, remover) ---
    const abrirModal = async (isEdit = false, servicoId = null) => {
        servicoForm.reset();
        inputId.value = '';
        if (isEdit && servicoId) {
            modalTitle.textContent = 'Editar Serviço';
            // ATUALIZADO: Busca na lista local em vez de nova API
            const servico = todosOsServicos.find(s => s.id === servicoId);
            if (servico) {
                inputId.value = servico.id;
                inputNome.value = servico.nome;
                inputDescricao.value = servico.descricao;
                inputPreco.value = parseFloat(servico.preco).toFixed(2).replace('.', ',');
            }
        } else {
            modalTitle.textContent = 'Novo Serviço';
        }
        modal.classList.remove('modal-oculto');
        setTimeout(() => { document.getElementById('servico-nome').focus(); }, 100);
    };

    const fecharModal = () => modal.classList.add('modal-oculto');

    const removerServico = async (id) => {
        if (confirm('Tem a certeza que deseja remover este serviço?')) {
            try {
                const response = await fetch(`${API_URL}/servicos/${id}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showAlert(result.message);
                carregarServicos(); // Recarrega a lista
            } catch (error) {
                showAlert(error.message, false);
            }
        }
    };

    // --- EVENT LISTENERS ---
    btnNovoServico.addEventListener('click', () => abrirModal(false));
    btnCancelar.addEventListener('click', fecharModal);

    // Listener do Formulário
    servicoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = inputId.value;
        const servicoData = {
            nome: inputNome.value,
            descricao: inputDescricao.value,
            preco: parseCurrency(inputPreco.value)
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/servicos/${id}` : `${API_URL}/servicos`;

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(servicoData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            showAlert(result.message);
            fecharModal();
            carregarServicos(); // Recarrega a lista
        } catch (error) {
            showAlert(error.message, false);
        }
    });

    // Listener da Tabela (para Editar/Remover)
    tabelaServicosBody.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const servicoId = parseInt(button.dataset.servicoId);

        if (action === 'editar-servico') {
            abrirModal(true, servicoId);
        }
        if (action === 'remover-servico') {
            removerServico(servicoId);
        }
    });

    // ATUALIZADO: Listener da Busca (agora só chama a função central)
    inputBusca.addEventListener('input', aplicarFiltroEOrdem);

    // --- NOVO: Listener para ORDENAÇÃO ---
    headersTabela.forEach(header => {
        header.addEventListener('click', () => {
            const newSortColumn = header.dataset.sort;

            if (sortColumn === newSortColumn) {
                sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
            } else {
                sortColumn = newSortColumn;
                sortDirection = 'asc';
            }

            // Atualiza as setas
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
    carregarServicos();
});