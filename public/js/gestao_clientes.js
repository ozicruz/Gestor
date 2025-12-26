document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';
    let listaClientes = []; // Cache local para busca/ordenação
    let ordemAtual = { coluna: 'nome', direcao: 'asc' };

    // --- ELEMENTOS ---
    const tabelaCorpo = document.getElementById('tabela-clientes-corpo');
    const inputBusca = document.getElementById('input-busca-cliente');
    const feedbackAlert = document.getElementById('feedback-alert');
    
    // Modal
    const modal = document.getElementById('cliente-modal');
    const form = document.getElementById('cliente-form');
    const btnNovo = document.getElementById('btnNovoCliente');
    const btnCancelar = document.getElementById('btn-cancelar-cliente');

    // --- FUNÇÕES AUXILIARES ---
    const showAlert = (message, isSuccess = true) => {
        feedbackAlert.textContent = message;
        feedbackAlert.className = `p-4 mb-6 rounded-lg font-bold text-center shadow-sm ${
            isSuccess ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`;
        feedbackAlert.classList.remove('hidden');
        setTimeout(() => feedbackAlert.classList.add('hidden'), 4000);
    };

    // --- 1. CARREGAR E RENDERIZAR ---
    const carregarClientes = async () => {
        try {
            const response = await fetch(`${API_URL}/clientes`);
            listaClientes = await response.json();
            renderizarTabela();
        } catch (error) {
            console.error(error);
            tabelaCorpo.innerHTML = '<tr><td colspan="4" class="text-center p-6 text-red-500">Erro ao carregar clientes.</td></tr>';
        }
    };

    const renderizarTabela = () => {
        tabelaCorpo.innerHTML = '';
        
        // 1. Filtrar
        const termo = inputBusca.value.toLowerCase();
        let filtrados = listaClientes.filter(c => 
            c.nome.toLowerCase().includes(termo) || 
            (c.telefone && c.telefone.includes(termo))
        );

        if (filtrados.length === 0) {
            tabelaCorpo.innerHTML = '<tr><td colspan="4" class="text-center p-6 text-gray-400 italic">Nenhum cliente encontrado.</td></tr>';
            return;
        }

        // 2. Ordenar
        filtrados.sort((a, b) => {
            let valA = a[ordemAtual.coluna] || '';
            let valB = b[ordemAtual.coluna] || '';
            
            // Ordem personalizada para status (Vermelho > Laranja > Verde)
            if (ordemAtual.coluna === 'statusFinanceiro') {
                const pesos = { 'vermelho': 3, 'laranja': 2, 'verde': 1 };
                valA = pesos[valA] || 0;
                valB = pesos[valB] || 0;
            } else {
                valA = valA.toString().toLowerCase();
                valB = valB.toString().toLowerCase();
            }

            if (valA < valB) return ordemAtual.direcao === 'asc' ? -1 : 1;
            if (valA > valB) return ordemAtual.direcao === 'asc' ? 1 : -1;
            return 0;
        });

        // 3. Desenhar
        filtrados.forEach(c => {
            // Define o visual do Status
            let statusHtml = '<span class="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">?</span>';
            if (c.statusFinanceiro === 'verde') statusHtml = '<span class="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Em dia</span>';
            if (c.statusFinanceiro === 'laranja') statusHtml = '<span class="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">Pendente</span>';
            if (c.statusFinanceiro === 'vermelho') statusHtml = '<span class="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">Vencido</span>';

            tabelaCorpo.innerHTML += `
                <tr class="hover:bg-teal-50 transition-colors border-b border-gray-50 last:border-none">
                    <td class="px-6 py-4 whitespace-nowrap">${statusHtml}</td>
                    <td class="px-6 py-4 font-bold text-gray-700 uppercase">${c.nome}</td>
                    <td class="px-6 py-4 text-gray-600 font-mono text-sm">${c.telefone || '-'}</td>
                    <td class="px-6 py-4 text-right">
                        <a href="detalhe_cliente.html?id=${c.id}" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1.5 px-4 rounded shadow transition-all hover:shadow-md">
                            Ver Detalhes
                        </a>
                    </td>
                </tr>
            `;
        });

        atualizarIconesOrdenacao();
    };

    // --- 2. LÓGICA DE ORDENAÇÃO (CLIQUE) ---
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const coluna = th.dataset.sort;
            if (ordemAtual.coluna === coluna) {
                ordemAtual.direcao = ordemAtual.direcao === 'asc' ? 'desc' : 'asc';
            } else {
                ordemAtual.coluna = coluna;
                ordemAtual.direcao = 'asc';
            }
            renderizarTabela();
        });
    });

    const atualizarIconesOrdenacao = () => {
        ['statusFinanceiro', 'nome', 'telefone'].forEach(col => {
            const el = document.getElementById(`sort-icon-${col}`);
            if(el) el.textContent = '';
        });
        const icone = ordemAtual.direcao === 'asc' ? '▲' : '▼';
        const el = document.getElementById(`sort-icon-${ordemAtual.coluna}`);
        if(el) el.textContent = ` ${icone}`;
    };

    // --- 3. NOVO CLIENTE ---
    btnNovo.addEventListener('click', () => {
        form.reset();
        document.getElementById('cliente-id').value = '';
        modal.classList.remove('modal-oculto');
    });

    btnCancelar.addEventListener('click', () => modal.classList.add('modal-oculto'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSubmit = form.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Salvando...";

        const novoCliente = {
            nome: document.getElementById('cliente-nome').value.trim().toUpperCase(),
            telefone: document.getElementById('cliente-telefone').value.trim(),
            email: document.getElementById('cliente-email').value.trim(),
            endereco: document.getElementById('cliente-endereco').value.trim()
        };

        try {
            const response = await fetch(`${API_URL}/clientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoCliente)
            });

            if (response.ok) {
                showAlert('Cliente cadastrado com sucesso!', true);
                modal.classList.add('modal-oculto');
                carregarClientes();
            } else {
                throw new Error('Erro ao salvar cliente.');
            }
        } catch (error) {
            showAlert(error.message, false);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Salvar";
        }
    });

    // --- EVENTOS FINAIS ---
    inputBusca.addEventListener('input', renderizarTabela);

    // Iniciar
    carregarClientes();
});