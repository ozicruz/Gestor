// public/js/gestao_clientes.js (Versão Refatorada)

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';

    // --- ELEMENTOS DO DOM ---
    const tabelaClientesBody = document.getElementById('tabela-clientes-corpo'); // Mudei o ID para ser mais específico
    const clienteModal = document.getElementById('cliente-modal');
    const feedbackAlert = document.getElementById('feedback-alert');
    const inputBusca = document.getElementById('input-busca-cliente');
    const headersTabela = document.querySelectorAll('#tabela-clientes-header th[data-sort]'); // Para ordenação

    let todosOsClientes = [];
    let sortColumn = 'nome'; // Coluna padrão para ordenar
    let sortDirection = 'asc'; // Direção padrão

    // --- FUNÇÕES AUXILIARES ---
    const showAlert = (message, isSuccess = true) => {
        feedbackAlert.textContent = message;
        feedbackAlert.className = `feedback-alert p-4 mb-4 text-sm rounded-lg ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
        feedbackAlert.style.display = 'block';
        setTimeout(() => { feedbackAlert.style.display = 'none'; }, 4000);
    };

    // --- FUNÇÕES DE CLIENTE ---

    // Função principal para buscar os dados da API
    const carregarClientes = async () => {
        try {
            const response = await fetch(`${API_URL}/clientes`);
            if (!response.ok) throw new Error('Erro ao carregar clientes.');
            
            todosOsClientes = await response.json();
            renderizarTabela(); // Desenha a tabela com todos os clientes
        } catch (error) {
            showAlert(error.message, false);
        }
    };

    // Função para ORDENAR, FILTRAR e DESENHAR a tabela
        const renderizarTabela = () => {
            tabelaClientesBody.innerHTML = '';
            const termo = inputBusca.value.toLowerCase();

            // 1. Filtra os clientes
            const clientesFiltrados = todosOsClientes.filter(cliente =>
                cliente.nome.toLowerCase().includes(termo) ||
                (cliente.telefone && cliente.telefone.includes(termo))
            );

            // 2. Ordena os clientes (A sua ordenação por 'statusFinanceiro' vai funcionar aqui!)
            clientesFiltrados.sort((a, b) => {
                let valA = a[sortColumn] || '';
                let valB = b[sortColumn] || '';
                
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });

            if (clientesFiltrados.length === 0) {
                tabelaClientesBody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-4">Nenhum cliente encontrado.</td></tr>`;
                return;
            }

            // 3. Desenha as linhas da tabela
            clientesFiltrados.forEach(cliente => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50";

                // --- LÓGICA DO NOVO STATUS ---
                let iconeStatus = '';
                switch (cliente.statusFinanceiro) {
                    case 'vermelho':
                        iconeStatus = `<span title="Cliente com débito vencido" class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Vencido</span>`;
                        break;
                    case 'laranja':
                        iconeStatus = `<span title="Cliente com débito pendente" class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendente</span>`;
                        break;
                    case 'verde':
                        iconeStatus = `<span title="Cliente sem débitos" class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Em dia</span>`;
                        break;
                }
                
                // Removemos o ícone da coluna "Nome" e adicionámos a nova coluna "Status" no início
                tr.innerHTML = `
                    <td class="px-4 py-4 text-center">
                        ${iconeStatus}
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-medium text-gray-900">${cliente.nome}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-900">${cliente.telefone || ''}</div>
                        <div class="text-sm text-gray-500">${cliente.email || ''}</div>
                    </td>
                    <td class="px-6 py-4 text-right text-sm font-medium">
                        <a href="detalhe_cliente.html?id=${cliente.id}" class="bg-blue-600 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-700">
                            Ver Detalhes
                        </a>
                    </td>
                `;
                tabelaClientesBody.appendChild(tr);
            });
        };

    // --- O modal de NOVO cliente (o de editar vai para a outra página) ---
    const abrirModalCliente = () => {
        const form = document.getElementById('cliente-form');
        form.reset();
        document.getElementById('cliente-id').value = '';
        document.getElementById('cliente-modal-title').textContent = 'Novo Cliente';
        clienteModal.classList.remove('modal-oculto');
    };

    // Salva o NOVO cliente
    document.getElementById('cliente-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('cliente-id').value;
        
        // Este formulário agora só cria NOVOS clientes
        if (id) { 
            clienteModal.classList.add('modal-oculto');
            return; // Formulário de edição estará noutra página
        } 

        const data = {
            nome: document.getElementById('cliente-nome').value,
            telefone: document.getElementById('cliente-telefone').value,
            email: document.getElementById('cliente-email').value,
            endereco: document.getElementById('cliente-endereco').value,
        };
        
        const response = await fetch(`${API_URL}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        showAlert(result.message, response.ok);
        if(response.ok) {
            clienteModal.classList.remove('active');
            await carregarClientes(); // Recarrega a lista
        }
    });

    // --- EVENT LISTENERS ---
    
    // Listener para o campo de busca
    inputBusca.addEventListener('input', renderizarTabela);

    // Listeners para ORDENAÇÃO (SUGESTÃO 1)
    headersTabela.forEach(header => {
        header.addEventListener('click', () => {
            const newSortColumn = header.dataset.sort;
            if (sortColumn === newSortColumn) {
                sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
            } else {
                sortColumn = newSortColumn;
                sortDirection = 'asc';
            }
            
            // Remove setas de outros headers
            headersTabela.forEach(h => h.querySelector('.sort-arrow').innerHTML = '');
            // Adiciona seta no header atual
            header.querySelector('.sort-arrow').innerHTML = sortDirection === 'asc' ? ' ▲' : ' ▼';

            renderizarTabela();
        });
    });

    document.getElementById('btnNovoCliente').addEventListener('click', () => abrirModalCliente());
    clienteModal.classList.add('modal-oculto');

    // O modal de VEÍCULOS e os botões de EDITAR/REMOVER foram movidos para a 'detalhe_cliente.js'
    // Por isso, removemos os 'event listeners' antigos daqui.

    // --- INICIALIZAÇÃO ---
    carregarClientes();
});