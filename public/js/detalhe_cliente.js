// public/js/detalhe_cliente.js
document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';
    let clienteId = null; // Vamos buscar isto da URL

    // --- ELEMENTOS DO DOM ---
    const feedbackAlert = document.getElementById('feedback-alert');
    // Perfil
    const nomeEl = document.getElementById('detalhe-nome-cliente');
    const statusEl = document.getElementById('detalhe-status-cliente');
    const telEl = document.getElementById('detalhe-telefone');
    const emailEl = document.getElementById('detalhe-email');
    const enderecoEl = document.getElementById('detalhe-endereco');
    const btnEditar = document.getElementById('btn-editar-cliente');
    const btnRemover = document.getElementById('btn-remover-cliente');
    
    // Histórico de Compras
    const tabelaHistorico = document.getElementById('tabela-historico-compras');

    // Veículos
    const veiculosLista = document.getElementById('veiculos-lista');
    const veiculoForm = document.getElementById('veiculo-form');
    
    // Modais
    const clienteModal = document.getElementById('cliente-modal');
    const btnCancelarCliente = document.getElementById('btn-cancelar-cliente');
    const clienteForm = document.getElementById('cliente-form');
    
    // --- FUNÇÕES AUXILIARES ---
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const formatarData = (dataISO) => new Date(dataISO).toLocaleDateString('pt-BR', {timeZone: 'UTC'});

    const showAlert = (message, isSuccess = true) => {
        feedbackAlert.textContent = message;
        feedbackAlert.className = `feedback-alert p-4 mb-4 text-sm rounded-lg ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
        feedbackAlert.style.display = 'block';
        setTimeout(() => { feedbackAlert.style.display = 'none'; }, 4000);
    };

    // --- FUNÇÕES DE CARREGAMENTO (AS 3 APIs) ---
    
    // 1. Carrega o Perfil Principal do Cliente
    const carregarCliente = async (id) => {
        try {
            const response = await fetch(`${API_URL}/clientes/${id}`);
            if (!response.ok) throw new Error('Cliente não encontrado.');
            const cliente = await response.json();
            
            nomeEl.textContent = cliente.nome;
            telEl.textContent = cliente.telefone || 'Não informado';
            emailEl.textContent = cliente.email || 'Não informado';
            enderecoEl.textContent = cliente.endereco || 'Não informado';
            
            // Define o Status (igual ao da lista)
            switch (cliente.statusFinanceiro) {
                case 'vermelho':
                    statusEl.innerHTML = `<span class="px-2 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-800">Cliente com débito vencido</span>`;
                    break;
                case 'laranja':
                    statusEl.innerHTML = `<span class="px-2 py-0.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">Cliente com débito pendente</span>`;
                    break;
                case 'verde':
                    statusEl.innerHTML = `<span class="px-2 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">Cliente em dia</span>`;
                    break;
            }
            
            // Prepara o formulário de edição (escondido)
            document.getElementById('cliente-id').value = cliente.id;
            document.getElementById('cliente-nome').value = cliente.nome;
            document.getElementById('cliente-telefone').value = cliente.telefone;
            document.getElementById('cliente-email').value = cliente.email;
            document.getElementById('cliente-endereco').value = cliente.endereco;
            
        } catch (error) {
            showAlert(error.message, false);
            nomeEl.textContent = "Erro ao carregar cliente.";
        }
    };

    // 2. Carrega o Histórico de Compras
    const carregarHistorico = async (id) => {
        try {
            const response = await fetch(`${API_URL}/clientes/${id}/vendas`);
            const vendas = await response.json();
            
            tabelaHistorico.innerHTML = '';
            if (vendas.length === 0) {
                tabelaHistorico.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-gray-500">Nenhum histórico de compras encontrado.</td></tr>';
                return;
            }
            vendas.forEach(venda => {
                tabelaHistorico.innerHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4">Venda #${venda.id}</td>
                        <td class="px-6 py-4">${formatarData(venda.data)}</td>
                        <td class="px-6 py-4 text-right font-medium">${formatCurrency(venda.total)}</td>
                    </tr>
                `;
            });
        } catch (error) {
            showAlert("Erro ao carregar histórico de compras.", false);
        }
    };

    // 3. Carrega e Gere os Veículos (Lógica movida de gestao_clientes.js)
    const renderizarListaVeiculos = async (id) => {
        try {
            const response = await fetch(`${API_URL}/clientes/${id}/veiculos`);
            const veiculos = await response.json();
            veiculosLista.innerHTML = '';
            if (veiculos.length === 0) {
                veiculosLista.innerHTML = '<p class="text-center text-gray-500">Nenhum veículo registado para este cliente.</p>';
                return;
            }
            veiculos.forEach(v => {
                veiculosLista.innerHTML += `
                    <div class="flex justify-between items-center p-2 border-b">
                        <div>
                            <span class="font-bold text-lg">${v.placa}</span>
                            <span class="text-sm text-gray-600 ml-2">${v.marca || ''} ${v.modelo || ''} (${v.ano || 'N/A'})</span>
                        </div>
                        <button data-action="remover-veiculo" data-veiculo-id="${v.id}" class="text-red-500 text-xs hover:text-red-700">Remover</button>
                    </div>
                `;
            });
        } catch (error) {
            showAlert("Erro ao carregar veículos.", false);
        }
    };

    // --- FUNÇÕES DE AÇÃO (Botões e Formulários) ---

    // Botão Editar (Abre o modal)
    btnEditar.addEventListener('click', () => {
        clienteModal.classList.add('active');
    });
    btnCancelarCliente.addEventListener('click', () => {
        clienteModal.classList.remove('active');
    });

    // Submissão do formulário de EDIÇÃO
    clienteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('cliente-id').value;
        const data = {
            nome: document.getElementById('cliente-nome').value,
            telefone: document.getElementById('cliente-telefone').value,
            email: document.getElementById('cliente-email').value,
            endereco: document.getElementById('cliente-endereco').value,
        };

        const response = await fetch(`${API_URL}/clientes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        showAlert(result.message, response.ok);
        
        if(response.ok) {
            clienteModal.classList.remove('active');
            await carregarCliente(id); // Recarrega os dados do perfil
        }
    });

    // Botão Remover Cliente
    btnRemover.addEventListener('click', async () => {
        if (confirm('Tem a certeza que deseja remover este cliente? Todos os seus veículos e histórico de OS serão apagados.')) {
            const response = await fetch(`${API_URL}/clientes/${clienteId}`, { method: 'DELETE' });
            const result = await response.json();
            if(response.ok) {
                alert('Cliente removido com sucesso.');
                window.location.href = 'gestao_clientes.html'; // Volta para a lista
            } else {
                showAlert(result.message, false);
            }
        }
    });

    // Submissão do formulário de NOVO VEÍCULO
    veiculoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
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
            await renderizarListaVeiculos(clienteId); // Recarrega a lista
            veiculoForm.reset();
        }
    });

    // Remover Veículo (listener na lista)
    veiculosLista.addEventListener('click', async (e) => {
        const button = e.target.closest('[data-action="remover-veiculo"]');
        if (button) {
            if (confirm('Tem a certeza que deseja remover este veículo?')) {
                const veiculoId = button.dataset.veiculoId;
                const response = await fetch(`${API_URL}/veiculos/${veiculoId}`, { method: 'DELETE' });
                const result = await response.json();
                showAlert(result.message, response.ok);
                if (response.ok) await renderizarListaVeiculos(clienteId);
            }
        }
    });


    // --- INICIALIZAÇÃO DA PÁGINA ---
    const init = () => {
        // Pega o ID da URL (ex: ...html?id=1)
        const urlParams = new URLSearchParams(window.location.search);
        clienteId = urlParams.get('id');
        
        if (clienteId) {
            // Define o ID no formulário de veículos
            document.getElementById('veiculo-cliente-id').value = clienteId;
            // Carrega todos os dados das 3 APIs
            carregarCliente(clienteId);
            carregarHistorico(clienteId);
            renderizarListaVeiculos(clienteId);
        } else {
            nomeEl.textContent = "ID do Cliente não encontrado.";
        }
    };

    init();
});