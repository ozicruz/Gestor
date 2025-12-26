document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';
    let clienteId = null; 

    // VARIÁVEIS GLOBAIS
    let vendasCache = []; 
    let ordemAtual = { coluna: 'data', direcao: 'desc' };

    // --- ELEMENTOS DO DOM ---
    const feedbackAlert = document.getElementById('feedback-alert');
    
    // Perfil
    const nomeEl = document.getElementById('detalhe-nome-cliente');
    const statusEl = document.getElementById('detalhe-status-cliente');
    const telEl = document.getElementById('detalhe-telefone');
    const emailEl = document.getElementById('detalhe-email');
    const enderecoEl = document.getElementById('detalhe-endereco');
    
    // Botões e Listas
    const btnEditar = document.getElementById('btn-editar-cliente');
    const btnRemover = document.getElementById('btn-remover-cliente');
    const tabelaHistorico = document.getElementById('tabela-historico-compras');
    const veiculosLista = document.getElementById('veiculos-lista');
    
    // Formulários
    const veiculoForm = document.getElementById('veiculo-form');
    const clienteForm = document.getElementById('cliente-form');
    const clienteModal = document.getElementById('cliente-modal');
    const btnCancelarCliente = document.getElementById('btn-cancelar-cliente');

    // Modal Recibo
    const modalRecibo = document.getElementById('modalRecibo');
    const btnFecharRecibo = document.getElementById('btn-fechar-recibo');

    // --- HELPERS ---
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    
    const formatarData = (dataISO) => {
        if(!dataISO) return '-';
        const dataObj = new Date(dataISO);
        return dataObj.toLocaleDateString('pt-BR');
    };

    const showAlert = (message, isSuccess = true) => {
        if (!feedbackAlert) return alert(message);
        feedbackAlert.textContent = message;
        feedbackAlert.className = `p-4 mb-4 rounded-lg font-bold text-center shadow-sm ${
            isSuccess ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`;
        feedbackAlert.classList.remove('hidden');
        setTimeout(() => feedbackAlert.classList.add('hidden'), 4000);
    };

    // --- 1. RENDERIZAR TABELA ---
    const renderizarTabelaHistorico = () => {
        tabelaHistorico.innerHTML = '';
        
        if (!vendasCache || vendasCache.length === 0) {
            tabelaHistorico.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-400 italic">Nenhuma compra registrada.</td></tr>';
            return;
        }

        vendasCache.sort((a, b) => {
            let valA = a[ordemAtual.coluna];
            let valB = b[ordemAtual.coluna];

            if (ordemAtual.coluna === 'data') {
                valA = new Date(valA || 0);
                valB = new Date(valB || 0);
            } else if (ordemAtual.coluna === 'total' || ordemAtual.coluna === 'id') {
                valA = Number(valA || 0);
                valB = Number(valB || 0);
            } else {
                valA = (valA || '').toString().toLowerCase();
                valB = (valB || '').toString().toLowerCase();
            }

            if (valA < valB) return ordemAtual.direcao === 'asc' ? -1 : 1;
            if (valA > valB) return ordemAtual.direcao === 'asc' ? 1 : -1;
            return 0;
        });

        document.querySelectorAll('#historico-thead span').forEach(s => s.textContent = '');
        const seta = document.getElementById(`seta-${ordemAtual.coluna}`);
        if(seta) seta.textContent = ordemAtual.direcao === 'asc' ? '▲' : '▼';

        vendasCache.forEach(venda => {
            tabelaHistorico.innerHTML += `
                <tr class="hover:bg-blue-50 transition-colors border-b border-gray-100 cursor-pointer group" onclick="window.verDetalhesVenda(${venda.id})">
                    <td class="px-4 py-3 text-gray-600">${formatarData(venda.data)}</td>
                    <td class="px-4 py-3 font-medium text-blue-600 group-hover:text-blue-800 group-hover:underline">#${venda.id}</td>
                    <td class="px-4 py-3 text-gray-600 text-sm">${venda.forma_pagamento || '-'}</td>
                    <td class="px-4 py-3 text-right font-bold text-gray-800">${formatCurrency(venda.total)}</td>
                </tr>
            `;
        });
    };

    document.querySelectorAll('#historico-thead th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const coluna = th.dataset.sort;
            if (ordemAtual.coluna === coluna) {
                ordemAtual.direcao = ordemAtual.direcao === 'asc' ? 'desc' : 'asc';
            } else {
                ordemAtual.coluna = coluna;
                ordemAtual.direcao = 'asc';
            }
            renderizarTabelaHistorico();
        });
    });

    // --- 2. CARREGAR DADOS ---

    const carregarCliente = async (id) => {
        try {
            const response = await fetch(`${API_URL}/clientes/${id}`);
            if (!response.ok) throw new Error('Cliente não encontrado.');
            const cliente = await response.json();

            nomeEl.textContent = cliente.nome;
            telEl.textContent = cliente.telefone || '-';
            emailEl.textContent = cliente.email || '-';
            enderecoEl.textContent = cliente.endereco || '-';

            let badgeClass = 'bg-gray-100 text-gray-800';
            let statusTexto = 'Verificar';

            if (cliente.statusFinanceiro === 'vermelho') {
                badgeClass = 'bg-red-100 text-red-800 border border-red-200';
                statusTexto = 'Débito Vencido';
            } else if (cliente.statusFinanceiro === 'verde') {
                badgeClass = 'bg-green-100 text-green-800 border border-green-200';
                statusTexto = 'Em Dia';
            }

            if(statusEl) statusEl.innerHTML = `<span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${badgeClass}">${statusTexto}</span>`;

            // Preenche Form Edição
            document.getElementById('cliente-id').value = cliente.id;
            document.getElementById('cliente-nome').value = cliente.nome;
            document.getElementById('cliente-telefone').value = cliente.telefone || '';
            document.getElementById('cliente-email').value = cliente.email || '';
            document.getElementById('cliente-endereco').value = cliente.endereco || '';

        } catch (error) {
            console.error(error);
            nomeEl.textContent = "Erro ao carregar";
        }
    };

    const carregarHistorico = async (id) => {
        try {
            const dataInicio = '2000-01-01';
            const dataFim = new Date().toISOString().split('T')[0];

            const response = await fetch(`${API_URL}/relatorios/vendas?data_inicio=${dataInicio}&data_fim=${dataFim}`);
            
            if (!response.ok) {
                console.warn("API de relatórios retornou erro:", response.status);
                tabelaHistorico.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-red-400">Erro ao carregar histórico.</td></tr>';
                return;
            }

            const todasVendas = await response.json();
            vendasCache = todasVendas.filter(v => v.cliente_nome === nomeEl.textContent || v.cliente_id == id);
            renderizarTabelaHistorico(); 
        } catch (error) {
            console.error("Erro histórico:", error);
            tabelaHistorico.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-red-400">Falha na conexão.</td></tr>';
        }
    };

    const renderizarListaVeiculos = async (id) => {
        try {
            const response = await fetch(`${API_URL}/veiculos`);
            
            if (!response.ok) {
                veiculosLista.innerHTML = '<p class="text-center text-gray-400 py-4 italic">Nenhum veículo registado.</p>';
                return;
            }

            const todosVeiculos = await response.json();
            const veiculosCliente = todosVeiculos.filter(v => v.cliente_id == id);
            
            veiculosLista.innerHTML = '';
            if (veiculosCliente.length === 0) {
                veiculosLista.innerHTML = '<p class="text-center text-gray-400 py-4 italic">Nenhum veículo registado.</p>';
                return;
            }
            
            veiculosCliente.forEach(v => {
                veiculosLista.innerHTML += `
                    <div class="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex flex-col">
                            <span class="font-bold text-gray-800 text-lg tracking-wide uppercase">${v.placa}</span>
                            <span class="text-xs text-gray-500 uppercase">${v.marca || ''} ${v.modelo || ''} ${v.cor || ''}</span>
                        </div>
                        <button data-action="remover-veiculo" data-veiculo-id="${v.id}" class="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors" title="Remover Veículo">
                            🗑️
                        </button>
                    </div>
                `;
            });
        } catch (error) {
            console.error("Erro veículos:", error);
            veiculosLista.innerHTML = '<p class="text-center text-gray-400 py-4 italic">Erro ao carregar veículos.</p>';
        }
    };

    // --- EVENTOS (CORRIGIDOS PARA O MODAL) ---

    // ABRIR MODAL
    if(btnEditar) {
        btnEditar.addEventListener('click', () => {
            clienteModal.classList.remove('hidden');       // Remove a classe do Tailwind
            clienteModal.classList.remove('modal-oculto'); // Remove a classe antiga se existir
        });
    }

    // FECHAR MODAL
    if(btnCancelarCliente) {
        btnCancelarCliente.addEventListener('click', () => {
            clienteModal.classList.add('hidden');
        });
    }
    
    // Fechar ao clicar fora
    if(clienteModal) {
        clienteModal.addEventListener('click', (e) => {
            if(e.target === clienteModal) clienteModal.classList.add('hidden');
        });
    }

    if(btnFecharRecibo) btnFecharRecibo.addEventListener('click', () => document.getElementById('modalRecibo').classList.add('hidden'));

    if(clienteForm) {
        clienteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('cliente-id').value;
            const data = {
                nome: document.getElementById('cliente-nome').value.toUpperCase(),
                telefone: document.getElementById('cliente-telefone').value,
                email: document.getElementById('cliente-email').value,
                endereco: document.getElementById('cliente-endereco').value,
            };
            try {
                const response = await fetch(`${API_URL}/clientes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    showAlert("Dados atualizados!", true);
                    clienteModal.classList.add('hidden'); // Fecha corretamente
                    carregarCliente(id);
                } else {
                    const errData = await response.json();
                    throw new Error(errData.message || "Erro ao atualizar");
                }
            } catch (err) { showAlert(err.message, false); }
        });
    }

    if(btnRemover) {
        btnRemover.addEventListener('click', async () => {
            if (confirm('⚠️ TEM A CERTEZA?\n\nIsso apagará o cliente.')) {
                try {
                    const response = await fetch(`${API_URL}/clientes/${clienteId}`, { method: 'DELETE' });
                    if (response.ok) {
                        alert('Cliente removido.');
                        window.location.href = 'gestao_clientes.html';
                    }
                } catch (err) { alert("Erro ao remover."); }
            }
        });
    }

    if(veiculoForm) {
        veiculoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = veiculoForm.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            const veiculoData = {
                cliente_id: clienteId,
                placa: document.getElementById('veiculo-placa').value.toUpperCase(),
                marca: document.getElementById('veiculo-marca').value,
                modelo: document.getElementById('veiculo-modelo').value,
                cor: ""
            };
            try {
                const response = await fetch(`${API_URL}/veiculos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(veiculoData)
                });
                if(response.ok) {
                    renderizarListaVeiculos(clienteId);
                    veiculoForm.reset();
                    document.getElementById('veiculo-placa').focus();
                } else throw new Error((await response.json()).message);
            } catch (err) { showAlert(err.message, false); }
            finally { btnSubmit.disabled = false; }
        });
    }

    if(veiculosLista) {
        veiculosLista.addEventListener('click', async (e) => {
            const button = e.target.closest('[data-action="remover-veiculo"]');
            if (button && confirm('Remover este veículo?')) {
                const veiculoId = button.dataset.veiculoId;
                try {
                    const response = await fetch(`${API_URL}/veiculos/${veiculoId}`, { method: 'DELETE' });
                    if(response.ok) renderizarListaVeiculos(clienteId);
                } catch(err) { console.error(err); }
            }
        });
    }

    // --- INICIALIZAÇÃO ---
    const init = () => {
        const urlParams = new URLSearchParams(window.location.search);
        clienteId = urlParams.get('id');

        if (clienteId) {
            document.getElementById('veiculo-cliente-id').value = clienteId;
            carregarCliente(clienteId);
            setTimeout(() => carregarHistorico(clienteId), 300); 
            renderizarListaVeiculos(clienteId);
        } else {
            nomeEl.textContent = "Cliente não especificado.";
        }
    };

    init();
});

// --- FUNÇÃO GLOBAL DE RECIBO ---
window.verDetalhesVenda = async (vendaId) => {
    // (Mantido igual)
    const modal = document.getElementById('modalRecibo');
    const formatCurrencyRecibo = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    try {
        const response = await fetch(`http://localhost:3002/api/relatorios/vendas/${vendaId}`);
        if (!response.ok) throw new Error("Erro ao buscar detalhes.");
        const venda = await response.json();

        document.getElementById('recibo-id-display').textContent = venda.id;
        document.getElementById('recibo-data').textContent = new Date(venda.data).toLocaleDateString('pt-BR');
        document.getElementById('recibo-forma').textContent = venda.forma_pagamento || 'Padrão';
        
        const tbody = document.getElementById('recibo-lista-itens');
        if(tbody) {
            tbody.innerHTML = '';
            if (venda.itens) {
                venda.itens.forEach(item => {
                    const totalItem = item.subtotal || (item.quantidade * item.valor_unitario);
                    tbody.innerHTML += `
                        <tr>
                            <td class="p-2"><div class="font-bold text-gray-800">${item.nome || item.descricao}</div><div class="text-xs text-gray-500">Produto</div></td>
                            <td class="text-center p-2">${item.quantidade}</td>
                            <td class="text-right p-2 font-medium">${formatCurrencyRecibo(totalItem)}</td>
                        </tr>`;
                });
            }
            if (venda.servicos) {
                venda.servicos.forEach(serv => {
                    tbody.innerHTML += `
                        <tr class="bg-blue-50">
                            <td class="p-2"><div class="font-bold text-blue-800">${serv.nome || serv.descricao}</div><div class="text-xs text-blue-500">Serviço</div></td>
                            <td class="text-center p-2">${serv.quantidade}</td>
                            <td class="text-right p-2 font-medium text-blue-700">${formatCurrencyRecibo(serv.subtotal)}</td>
                        </tr>`;
                });
            }
        }

        const subtotal = venda.subtotal || venda.total; 
        document.getElementById('recibo-subtotal').textContent = formatCurrencyRecibo(subtotal);
        document.getElementById('recibo-total').textContent = formatCurrencyRecibo(venda.total);
        
        const descRow = document.getElementById('recibo-desconto-row');
        const valorDesconto = venda.desconto_valor || venda.desconto || 0;

        if(descRow) {
            if(valorDesconto > 0) {
                descRow.classList.remove('hidden');
                document.getElementById('recibo-desconto').textContent = `- ${formatCurrencyRecibo(valorDesconto)}`;
            } else {
                descRow.classList.add('hidden');
            }
        }

        if(modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }

    } catch (error) {
        console.error(error);
        alert("Não foi possível carregar o recibo: " + error.message);
    }
};