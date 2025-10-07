// public/js/gestao_clientes.js

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';

    // --- ELEMENTOS DO DOM ---
    const tabelaClientesBody = document.getElementById('tabela-clientes');
    const clienteModal = document.getElementById('cliente-modal');
    const veiculoModal = document.getElementById('veiculo-modal');
    const feedbackAlert = document.getElementById('feedback-alert');
    const inputBusca = document.getElementById('input-busca-cliente'); // Assumindo que o ID do input de busca é este no seu HTML

    let todosOsClientes = []; 

    // --- FUNÇÕES AUXILIARES ---
    const showAlert = (message, isSuccess = true) => {
        feedbackAlert.textContent = message;
        feedbackAlert.className = `feedback-alert p-4 mb-4 text-sm rounded-lg ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
        feedbackAlert.style.display = 'block';
        setTimeout(() => { feedbackAlert.style.display = 'none'; }, 4000);
    };

    // --- FUNÇÕES DE CLIENTE ---

    // CORREÇÃO: Função para desenhar a tabela (agora completa)
    const desenharTabela = (clientesParaRenderizar) => {
        tabelaClientesBody.innerHTML = '';
        if (clientesParaRenderizar.length === 0) {
            tabelaClientesBody.innerHTML = `<tr><td colspan="3" class="text-center text-gray-500 py-4">Nenhum cliente encontrado.</td></tr>`;
            return;
        }
        clientesParaRenderizar.forEach(cliente => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4"><div class="text-sm font-medium text-gray-900">${cliente.nome}</div></td>
                <td class="px-6 py-4"><div class="text-sm text-gray-900">${cliente.telefone || ''}</div><div class="text-sm text-gray-500">${cliente.email || ''}</div></td>
                <td class="px-6 py-4 text-right text-sm font-medium">
                    <button data-action="ver-veiculos" data-cliente-id="${cliente.id}" data-cliente-nome="${cliente.nome.replace(/'/g, "\\'")}" class="bg-gray-600 text-white px-3 py-1 rounded-md text-xs hover:bg-gray-700 mr-2">Ver Veículos</button>
                    <button data-action="editar-cliente" data-cliente-id="${cliente.id}" class="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
                    <button data-action="remover-cliente" data-cliente-id="${cliente.id}" class="text-red-600 hover:text-red-900">Remover</button>
                </td>
            `;
            tabelaClientesBody.appendChild(tr);
        });
    };

    // CORREÇÃO: Função para buscar os dados (agora refatorada)
    const renderizarTabelaClientes = async () => {
        try {
            const response = await fetch(`${API_URL}/clientes`);
            if (!response.ok) throw new Error('Erro ao carregar clientes.');
            
            const clientes = await response.json();
            todosOsClientes = clientes; // Guarda a lista completa
            desenharTabela(todosOsClientes); // Desenha a tabela com todos os clientes
        } catch (error) {
            showAlert(error.message, false);
        }
    };

    // --- O resto das suas funções (abrirModalCliente, removerCliente, etc.) continuam iguais ---
    // ... (cole aqui o resto das suas funções, desde 'abrirModalCliente' até 'removerVeiculo') ...
    const abrirModalCliente = async (isEdit = false, clienteId = null) => {
        const form = document.getElementById('cliente-form');
        form.reset();
        document.getElementById('cliente-id').value = '';
        const title = document.getElementById('cliente-modal-title');

        if (isEdit && clienteId) {
            title.textContent = 'Editar Cliente';
            // CORREÇÃO: Usando a lista que já temos em vez de fazer novo fetch
            const cliente = todosOsClientes.find(c => c.id === clienteId);
            if (cliente) {
                document.getElementById('cliente-id').value = cliente.id;
                document.getElementById('cliente-nome').value = cliente.nome;
                document.getElementById('cliente-telefone').value = cliente.telefone;
                document.getElementById('cliente-email').value = cliente.email;
                document.getElementById('cliente-endereco').value = cliente.endereco;
            }
        } else {
            title.textContent = 'Novo Cliente';
        }
        clienteModal.classList.add('active');
    };

    const removerCliente = async (id) => {
        if (confirm('Tem a certeza que deseja remover este cliente? Todos os seus veículos também serão removidos.')) {
            const response = await fetch(`${API_URL}/clientes/${id}`, { method: 'DELETE' });
            const result = await response.json();
            showAlert(result.message, response.ok);
            if(response.ok) await renderizarTabelaClientes();
        }
    };

    document.getElementById('cliente-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('cliente-id').value;
        const data = {
            nome: document.getElementById('cliente-nome').value,
            telefone: document.getElementById('cliente-telefone').value,
            email: document.getElementById('cliente-email').value,
            endereco: document.getElementById('cliente-endereco').value,
        };
        
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/clientes/${id}` : `${API_URL}/clientes`;

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        showAlert(result.message, response.ok);
        if(response.ok) {
            clienteModal.classList.remove('active');
            await renderizarTabelaClientes();
        }
    });

    const abrirModalVeiculos = async (clienteId, clienteNome) => {
        document.getElementById('veiculo-modal-title').textContent = `Veículos de ${clienteNome}`;
        document.getElementById('veiculo-cliente-id').value = clienteId;
        document.getElementById('veiculo-form').reset();
        await renderizarListaVeiculos(clienteId);
        veiculoModal.classList.add('active');
    };

    const renderizarListaVeiculos = async (clienteId) => {
        const response = await fetch(`${API_URL}/clientes/${clienteId}/veiculos`);
        const veiculos = await response.json();
        const listaDiv = document.getElementById('veiculos-lista');
        listaDiv.innerHTML = '';
        if (veiculos.length === 0) {
            listaDiv.innerHTML = '<p class="text-center text-gray-500">Nenhum veículo registado para este cliente.</p>';
            return;
        }
        veiculos.forEach(v => {
            listaDiv.innerHTML += `
                <div class="flex justify-between items-center p-2 border-b">
                    <div>
                        <span class="font-bold text-lg">${v.placa}</span>
                        <span class="text-sm text-gray-600 ml-2">${v.marca || ''} ${v.modelo || ''}</span>
                    </div>
                    <button data-action="remover-veiculo" data-veiculo-id="${v.id}" data-cliente-id="${v.cliente_id}" class="text-red-500 text-xs hover:text-red-700">Remover</button>
                </div>
            `;
        });
    };

    document.getElementById('veiculo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const clienteId = document.getElementById('veiculo-cliente-id').value;
        const veiculoData = {
            cliente_id: clienteId,
            placa: document.getElementById('veiculo-placa').value.toUpperCase(),
            marca: document.getElementById('veiculo-marca').value,
            modelo: document.getElementById('veiculo-modelo').value,
            ano: document.getElementById('veiculo-ano').value || null,
            cor: document.getElementById('veiculo-cor').value,
        };
        const response = await fetch(`${API_URL}/veiculos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(veiculoData)
        });
        const result = await response.json();
        showAlert(result.message, response.ok);
        if (response.ok) {
            await renderizarListaVeiculos(clienteId);
            document.getElementById('veiculo-form').reset();
        }
    });

    const removerVeiculo = async (veiculoId, clienteId) => {
        if (confirm('Tem a certeza que deseja remover este veículo?')) {
            const response = await fetch(`${API_URL}/veiculos/${veiculoId}`, { method: 'DELETE' });
            const result = await response.json();
            showAlert(result.message, response.ok);
            if (response.ok) await renderizarListaVeiculos(clienteId);
        }
    };

    // --- EVENT LISTENERS ---
    
    // ADICIONADO: Event listener para o campo de busca
    inputBusca.addEventListener('input', () => {
        const termo = inputBusca.value.toLowerCase();
        const clientesFiltrados = todosOsClientes.filter(cliente =>
            cliente.nome.toLowerCase().includes(termo) ||
            (cliente.telefone && cliente.telefone.includes(termo)) // Adicionado parêntese de fechamento aqui
        ).sort((a, b) => a.nome.localeCompare(b.nome));
        desenharTabela(clientesFiltrados);
    });

    document.getElementById('btnNovoCliente').addEventListener('click', () => abrirModalCliente(false));
    document.getElementById('btn-cancelar-cliente').addEventListener('click', () => clienteModal.classList.remove('active'));
    document.getElementById('btn-fechar-veiculo').addEventListener('click', () => veiculoModal.classList.remove('active'));

    document.body.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        
        if (action === 'ver-veiculos') {
            const clienteId = button.dataset.clienteId;
            const clienteNome = button.dataset.clienteNome;
            abrirModalVeiculos(parseInt(clienteId), clienteNome);
        }
        if (action === 'editar-cliente') {
            const clienteId = button.dataset.clienteId;
            abrirModalCliente(true, parseInt(clienteId));
        }
        if (action === 'remover-cliente') {
            const clienteId = button.dataset.clienteId;
            removerCliente(parseInt(clienteId));
        }
        if (action === 'remover-veiculo') {
            const veiculoId = button.dataset.veiculoId;
            const clienteId = button.dataset.clienteId;
            removerVeiculo(parseInt(veiculoId), parseInt(clienteId));
        }
    });

    // --- INICIALIZAÇÃO ---
    renderizarTabelaClientes();
});