// public/js/gestao_servicos.js

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
    const renderizarTabela = async () => {
        try {
            const response = await fetch(`${API_URL}/servicos`);
            if (!response.ok) throw new Error('Erro ao carregar serviços.');
            const servicos = await response.json();

            tabelaServicosBody.innerHTML = '';
            if (servicos.length === 0) {
                tabelaServicosBody.innerHTML = `<tr><td colspan="3" class="text-center text-gray-500 py-4">Nenhum serviço cadastrado.</td></tr>`;
                return;
            }
            servicos.forEach(servico => {
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
        } catch (error) {
            showAlert(error.message, false);
        }
    };

    const abrirModal = async (isEdit = false, servicoId = null) => {
        servicoForm.reset();
        inputId.value = '';
        if (isEdit && servicoId) {
            modalTitle.textContent = 'Editar Serviço';
            // Idealmente teríamos uma rota /api/servicos/:id
            const response = await fetch(`${API_URL}/servicos`);
            const servicos = await response.json();
            const servico = servicos.find(s => s.id === servicoId);
            if (servico) {
                inputId.value = servico.id;
                inputNome.value = servico.nome;
                inputDescricao.value = servico.descricao;
                inputPreco.value = parseFloat(servico.preco).toFixed(2).replace('.', ',');
            }
        } else {
            modalTitle.textContent = 'Novo Serviço';
        }
        modal.classList.add('active');
    };

    const fecharModal = () => modal.classList.remove('active');

    const removerServico = async (id) => {
        if (confirm('Tem a certeza que deseja remover este serviço?')) {
            try {
                const response = await fetch(`${API_URL}/servicos/${id}`, { method: 'DELETE' });
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
    btnNovoServico.addEventListener('click', () => abrirModal(false));
    btnCancelar.addEventListener('click', fecharModal);
    
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
            renderizarTabela();
        } catch (error) {
            showAlert(error.message, false);
        }
    });

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

    // --- INICIALIZAÇÃO ---
    renderizarTabela();
});
