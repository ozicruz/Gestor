// public/js/gestao_os.js (Versão Definitiva e 100% Completa)

document.addEventListener('DOMContentLoaded', async () => {
    // --- CONFIGURAÇÃO E GLOBAIS ---
    const API_URL = 'http://localhost:3002/api';
    let todasAsOS = [];
    let listaProdutos = [];
    let listaServicos = [];
    let osAtual = null;
    let selectedItemOS = { produto: null, servico: null };
    const statusOrder = { 'Em andamento': 1, 'Aguardando peça': 2, 'Aberta': 3, 'Finalizada': 4, 'Entregue': 5, 'Cancelada': 6 };
    let sortState = { column: 'status', direction: 'asc' };

    // --- ELEMENTOS DO DOM ---
    const tabelaOSHead = document.getElementById('tabela-os-head');
    const tabelaOSBody = document.getElementById('tabela-os');
    const inputBusca = document.getElementById('input-busca-placa');
    const feedbackAlert = document.getElementById('feedback-alert');
    const osModal = document.getElementById('os-modal');
    const osModalTitle = document.getElementById('os-modal-title');
    const osModalBody = document.getElementById('os-modal-body');
    
    // --- CARREGAMENTO INICIAL DE DADOS ---
    await (async () => {
        try {
            const [produtosRes, servicosRes] = await Promise.all([ fetch(`${API_URL}/produtos`), fetch(`${API_URL}/servicos`) ]);
            listaProdutos = await produtosRes.json();
            listaServicos = await servicosRes.json();
        } catch (error) { console.error('Erro ao carregar produtos e serviços:', error); }
    })();

    // --- FUNÇÕES AUXILIARES ---
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    const showAlert = (message, isSuccess = true) => {
        if (!feedbackAlert) return;
        feedbackAlert.textContent = message;
        feedbackAlert.className = `p-4 mb-4 text-sm rounded-lg ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
        feedbackAlert.style.display = 'block';
        setTimeout(() => { feedbackAlert.style.display = 'none'; }, 4000);
    };

    // --- LÓGICA DA PÁGINA PRINCIPAL ---
    const sortData = (data) => {
        return [...data].sort((a, b) => {
            const valA = a[sortState.column], valB = b[sortState.column];
            const direction = sortState.direction === 'asc' ? 1 : -1;
            if (sortState.column === 'status') return (statusOrder[valA] - statusOrder[valB]) * direction;
            if (['id', 'total'].includes(sortState.column)) return (parseFloat(valA) - parseFloat(valB)) * direction;
            if (sortState.column === 'data_entrada') return (new Date(valA) - new Date(valB)) * direction;
            return String(valA).localeCompare(String(valB)) * direction;
        });
    };
    const updateHeaderSortIcons = () => {
        tabelaOSHead.querySelectorAll('th[data-sort]').forEach(th => {
            th.textContent = th.textContent.replace(/ [▲▼]/, '');
            if (th.dataset.sort === sortState.column) th.textContent += sortState.direction === 'asc' ? ' ▲' : ' ▼';
        });
    };
    const desenharTabela = (osParaRenderizar) => {
        tabelaOSBody.innerHTML = '';
        if (osParaRenderizar.length === 0) {
            tabelaOSBody.innerHTML = `<tr><td colspan="7" class="text-center text-gray-500 py-4">Nenhuma Ordem de Serviço encontrada.</td></tr>`;
            return;
        }
        osParaRenderizar.forEach(os => {
            const tr = document.createElement('tr');
            const dataEntrada = new Date(os.data_entrada).toLocaleDateString('pt-BR');
            let statusClass = 'bg-yellow-100 text-yellow-800';
            if (['Finalizada', 'Entregue'].includes(os.status)) statusClass = 'bg-green-100 text-green-800';
            if (os.status === 'Cancelada') statusClass = 'bg-red-100 text-red-800';
            tr.innerHTML = `
                <td class="px-6 py-4 font-bold">${os.id}</td>
                <td class="px-6 py-4">${os.placa}</td>
                <td class="px-6 py-4">${os.cliente_nome}</td>
                <td class="px-6 py-4">${dataEntrada}</td>
                <td class="px-6 py-4 font-semibold">${formatCurrency(os.total)}</td>
                <td class="px-6 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${os.status}</span></td>
                <td class="px-6 py-4 text-right text-sm font-medium"><button data-action="editar-os" data-os-id="${os.id}" class="text-indigo-600 hover:text-indigo-900">Ver / Editar</button></td>
            `;
            tabelaOSBody.appendChild(tr);
        });
    };
    const renderizarTabelaOS = async () => {
        try {
            const response = await fetch(`${API_URL}/ordens-servico`);
            todasAsOS = await response.json();
            const osOrdenadas = sortData(todasAsOS);
            desenharTabela(osOrdenadas);
            updateHeaderSortIcons();
        } catch (error) { showAlert('Não foi possível carregar as Ordens de Serviço.', false); }
    };

    // --- FUNÇÕES DO MODAL ---
    const fecharModal = () => { osModal.classList.remove('active'); osModalBody.innerHTML = ''; osAtual = null; };
    const abrirModalNovaOS = () => {
        osModalTitle.textContent = 'Nova Ordem de Serviço';
        osModalBody.innerHTML = `
            <form id="form-nova-os">
                <div class="mb-4">
                    <label for="input-placa" class="block text-sm font-medium text-gray-700">Placa do Veículo</label>
                    <div class="flex items-center gap-2 mt-1">
                        <input type="text" id="input-placa" required class="form-input block w-full uppercase">
                        <button type="button" data-action="procurar-placa" class="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 whitespace-nowrap">Procurar</button>
                    </div>
                </div>
                <div id="info-cliente-veiculo" class="hidden p-3 bg-gray-100 rounded-md mb-4 text-sm"></div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" data-action="fechar-modal" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700" disabled>Criar OS</button>
                </div>
            </form>
        `;
        osModal.classList.add('active');
    };
    const procurarPlaca = async () => {
        const placaInput = osModalBody.querySelector('#input-placa');
        const infoDiv = osModalBody.querySelector('#info-cliente-veiculo');
        const btnCriar = osModalBody.querySelector('button[type="submit"]');
        if (!placaInput || !infoDiv || !btnCriar) return;

        const placa = placaInput.value.toUpperCase();
        if (!placa) return;

        try {
            const response = await fetch(`${API_URL}/veiculos/placa/${placa}`);
            if (!response.ok) {
                infoDiv.innerHTML = `<p>Veículo não encontrado. <a href="gestao_clientes.html" class="text-blue-600 hover:underline">Cadastrar novo?</a></p>`;
                btnCriar.disabled = true;
            } else {
                const veiculo = await response.json();
                infoDiv.innerHTML = `<p><strong>Cliente:</strong> ${veiculo.cliente.nome}</p><p><strong>Veículo:</strong> ${veiculo.marca || ''} ${veiculo.modelo || ''}</p>`;
                btnCriar.disabled = false;
            }
            infoDiv.classList.remove('hidden');
        } catch (error) {
            infoDiv.innerHTML = `<p class="text-red-600">Erro ao procurar placa.</p>`;
            btnCriar.disabled = true;
            infoDiv.classList.remove('hidden');
        }
    };
    const criarNovaOS = async () => { 
        const placa = osModalBody.querySelector('#input-placa').value.toUpperCase();
        try {
            const response = await fetch(`${API_URL}/ordens-servico`,{
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placa })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            fecharModal();
            showAlert('Nova OS criada com sucesso!');
            await renderizarTabelaOS();
            abrirModalEdicaoOS(result.id);
        } catch (error) {
            showAlert(error.message, false);
        }
    };
    
    // --- LÓGICA DE EDIÇÃO COMPLETA ---
    const setupAutocompleteOS = (inputId, items, type) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'autocomplete-results hidden';
        input.parentNode.appendChild(resultsContainer);

        input.addEventListener('input', () => {
            const query = input.value.toLowerCase();
            resultsContainer.innerHTML = '';
            selectedItemOS[type] = null;
            if (!query) { resultsContainer.classList.add('hidden'); return; }

            const filtered = items
                .filter(i => i.nome.toLowerCase().includes(query))
                .sort((a, b) => { // <-- LÓGICA DE ORDENAÇÃO CORRIGIDA
                    const aStartsWith = a.nome.toLowerCase().startsWith(query);
                    const bStartsWith = b.nome.toLowerCase().startsWith(query);
                    if (aStartsWith && !bStartsWith) return -1;
                    if (!aStartsWith && bStartsWith) return 1;
                    return a.nome.localeCompare(b.nome);
                });

            resultsContainer.classList.remove('hidden');
            filtered.forEach(item => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                const price = item.preco_unitario || item.preco || 0;
                div.textContent = `${item.nome} (${formatCurrency(price)})`;
                div.addEventListener('click', () => {
                    input.value = item.nome;
                    selectedItemOS[type] = item.id;
                    resultsContainer.classList.add('hidden');
                });
                resultsContainer.appendChild(div);
            });
        });
    };

    const renderizarItensServicosNoModal = () => {
        const itensLista = document.getElementById('os-itens-lista');
        const servicosLista = document.getElementById('os-servicos-lista');
        const totalModal = document.getElementById('os-total-valor');
        if (!itensLista || !servicosLista || !totalModal) return;
        
        itensLista.innerHTML = '';
        servicosLista.innerHTML = '';
        let total = 0;

        osAtual.itens.forEach((item, index) => {
            const subtotal = item.quantidade * item.valor_unitario;
            const itemHTML = `<div class="flex justify-between items-center text-sm p-1 bg-gray-100 rounded"><span>${item.quantidade}x ${item.nome} - ${formatCurrency(subtotal)}</span><button type="button" data-action="remover-item" data-item-id="${item.id}" class="text-red-500 font-bold px-2">X</button></div>`;
            itensLista.innerHTML += itemHTML;
            total += subtotal;
        });
        osAtual.servicos.forEach((servico, index) => {
            const subtotal = servico.quantidade * servico.valor;
            const servicoHTML = `<div class="flex justify-between items-center text-sm p-1 bg-gray-100 rounded"><span>${servico.quantidade}x ${servico.nome} - ${formatCurrency(subtotal)}</span><button type="button" data-action="remover-servico" data-servico-id="${servico.id}" class="text-red-500 font-bold px-2">X</button></div>`;
            servicosLista.innerHTML += servicoHTML;
            total += subtotal;
        });
        totalModal.textContent = formatCurrency(total);
    };

    const adicionarItemOS = async () => {
        try {
            const produtoId = selectedItemOS.produto;
            const quantidade = parseInt(document.getElementById('input-os-produto-qtd').value);
            if (!produtoId || !quantidade) return;

            const response = await fetch(`${API_URL}/os/${osAtual.id}/itens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ produto_id: produtoId, quantidade })
            });
            if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
            
            await abrirModalEdicaoOS(osAtual.id);
        } catch (error) { showAlert(error.message, false); }
    };

    const removerItemOS = async (itemId) => {
        try {
            const response = await fetch(`${API_URL}/itens-os/${itemId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Falha ao remover item.');
            await abrirModalEdicaoOS(osAtual.id);
        } catch (error) { showAlert(error.message, false); }
    };

    const adicionarServicoOS = async () => {
        try {
            const servicoId = selectedItemOS.servico;
            const quantidade = parseInt(document.getElementById('input-os-servico-qtd').value);
            if (!servicoId || !quantidade) return;

            const response = await fetch(`${API_URL}/os/${osAtual.id}/servicos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ servico_id: servicoId, quantidade })
            });
            if (!response.ok) throw new Error('Falha ao adicionar serviço.');
            
            await abrirModalEdicaoOS(osAtual.id);
        } catch (error) { showAlert(error.message, false); }
    };

    const removerServicoOS = async (servicoId) => {
        try {
            const response = await fetch(`${API_URL}/servicos-os/${servicoId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Falha ao remover serviço.');
            await abrirModalEdicaoOS(osAtual.id);
        } catch (error) { showAlert(error.message, false); }
    };

    const salvarAlteracoesOS = async () => {
        const data = {
            problema_relatado: document.getElementById('problema_relatado').value,
            diagnostico_tecnico: document.getElementById('diagnostico_tecnico').value,
            status: document.getElementById('status-os').value,
            // ESTAS LINHAS ESTAVAM EM FALTA:
            itens: osAtual.itens,
            servicos: osAtual.servicos
        };

        try {
            const response = await fetch(`${API_URL}/ordens-servico/${osAtual.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Falha ao salvar alterações.');
            showAlert('Ordem de Serviço atualizada com sucesso!');
            fecharModal();
            await renderizarTabelaOS();
        } catch (error) {
            showAlert(error.message, false);
        }
    };
    
        const imprimirOS = () => {
        if (!osAtual) return showAlert('Nenhuma OS aberta para imprimir.', false);
        const template = document.getElementById('os-recibo-template');
        if (!template) return showAlert('Molde de impressão não encontrado no HTML.', false);

        const clone = template.content.cloneNode(true);
        
        clone.querySelector('[data-recibo="os-id"]').textContent = osAtual.id;
        clone.querySelector('[data-recibo="data"]').textContent = new Date(osAtual.data_entrada).toLocaleDateString('pt-BR');
        clone.querySelector('[data-recibo="cliente-nome"]').textContent = osAtual.cliente_nome;
        clone.querySelector('[data-recibo="veiculo-modelo"]').textContent = `${osAtual.marca || ''} ${osAtual.modelo || ''}`;
        clone.querySelector('[data-recibo="veiculo-placa"]').textContent = osAtual.placa;
        clone.querySelector('[data-recibo="problema-relatado"]').textContent = osAtual.problema_relatado || 'Nenhum problema relatado.';
        clone.querySelector('[data-recibo="diagnostico-tecnico"]').textContent = osAtual.diagnostico_tecnico || 'Nenhum diagnóstico informado.';
        clone.querySelector('[data-recibo="total"]').textContent = formatCurrency(osAtual.total);
        
        const tabelaItensBody = clone.querySelector('[data-recibo="itens-tabela"]');
        let htmlItens = '';
        osAtual.itens.forEach(item => {
            const subtotal = item.quantidade * item.valor_unitario;
            htmlItens += `<tr><td>${item.nome} (Peça)</td><td style="text-align: center;">${item.quantidade}</td><td style="text-align: right;">${formatCurrency(item.valor_unitario)}</td><td style="text-align: right;">${formatCurrency(subtotal)}</td></tr>`;
        });
        osAtual.servicos.forEach(servico => {
            const subtotal = servico.quantidade * servico.valor;
            htmlItens += `<tr><td>${servico.nome} (Serviço)</td><td style="text-align: center;">${servico.quantidade}</td><td style="text-align: right;">${formatCurrency(servico.valor)}</td><td style="text-align: right;">${formatCurrency(subtotal)}</td></tr>`;
        });
        tabelaItensBody.innerHTML = htmlItens;

        const htmlContent = new XMLSerializer().serializeToString(clone);
        const filename = `Ordem_de_Servico_${osAtual.id}.pdf`;
        window.electronAPI.send('print-to-pdf', { html: htmlContent, name: filename });
    };

    const abrirModalEdicaoOS = async (osId) => {
        try {
            const response = await fetch(`${API_URL}/ordens-servico/${osId}`);
            if (!response.ok) throw new Error('Não foi possível carregar os dados da OS.');
            osAtual = await response.json();
            
            osModalTitle.textContent = `Editando Ordem de Serviço #${osAtual.id}`;
            osModalBody.innerHTML = `
                <div class="text-sm mb-4 p-4 bg-gray-50 rounded-lg border">
                    <p><strong>Cliente:</strong> ${osAtual.cliente_nome} | <strong>Telefone:</strong> ${osAtual.cliente_telefone || 'N/A'}</p>
                    <p><strong>Veículo:</strong> ${osAtual.marca || ''} ${osAtual.modelo || ''} | <strong>Placa:</strong> ${osAtual.placa}</p>
                </div>
                <form id="form-edit-os">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label for="problema_relatado" class="block text-sm font-medium text-gray-700">Problema Relatado</label>
                            <textarea id="problema_relatado" rows="4" class="form-input mt-1 w-full">${osAtual.problema_relatado || ''}</textarea>
                        </div>
                        <div>
                            <label for="diagnostico_tecnico" class="block text-sm font-medium text-gray-700">Diagnóstico Técnico</label>
                            <textarea id="diagnostico_tecnico" rows="4" class="form-input mt-1 w-full">${osAtual.diagnostico_tecnico || ''}</textarea>
                        </div>
                    </div>
                    <hr class="my-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 class="font-semibold mb-2">Itens / Peças</h4>
                            <div id="os-itens-lista" class="mb-4 space-y-2 min-h-[60px]"></div>
                            <div class="flex items-end gap-2">
                                <div class="flex-grow autocomplete-container relative"><label class="text-xs">Adicionar Item</label><input type="text" id="input-os-produto" placeholder="Buscar item..." class="form-input w-full text-sm"></div>
                                <div class="w-20"><label class="block text-xs text-center">Qtd.</label><input type="number" id="input-os-produto-qtd" value="1" min="1" class="form-input w-full mt-1 text-center text-sm"></div>
                                <button type="button" data-action="adicionar-item" class="bg-gray-600 text-white px-3 py-2 text-xs rounded-md hover:bg-gray-700 h-10">Add</button>
                            </div>
                        </div>
                        <div>
                            <h4 class="font-semibold mb-2">Serviços Executados</h4>
                            <div id="os-servicos-lista" class="mb-4 space-y-2 min-h-[60px]"></div>
                            <div class="flex items-end gap-2">
                                <div class="flex-grow autocomplete-container relative"><label class="text-xs">Adicionar Serviço</label><input type="text" id="input-os-servico" placeholder="Buscar serviço..." class="form-input w-full text-sm"></div>
                                <div class="w-20"><label class="block text-xs text-center">Qtd.</label><input type="number" id="input-os-servico-qtd" value="1" min="1" class="form-input w-full mt-1 text-center text-sm"></div>
                                <button type="button" data-action="adicionar-servico" class="bg-gray-600 text-white px-3 py-2 text-xs rounded-md hover:bg-gray-700 h-10">Add</button>
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mt-6 pt-4 border-t">
                        <div>
                            <label for="status-os" class="block text-sm font-medium text-gray-700">Status</label>
                            <select id="status-os" class="form-input mt-1"><option>Aberta</option><option>Em andamento</option><option>Aguardando peça</option><option>Finalizada</option><option>Entregue</option><option>Cancelada</option></select>
                        </div>
                        <div class="text-xl font-bold">TOTAL: <span id="os-total-valor">${formatCurrency(osAtual.total)}</span></div>
                    </div>
                    <div class="mt-8 flex justify-between">
                        <button type="button" data-action="fechar-modal" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Fechar</button>
                        <div><button type="button" data-action="imprimir-os" class="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg mr-2">Imprimir</button><button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Salvar Alterações</button></div>
                    </div>
                </form>
            `;
            document.getElementById('status-os').value = osAtual.status;
            renderizarItensServicosNoModal();
            setupAutocompleteOS('input-os-produto', listaProdutos, 'produto');
            setupAutocompleteOS('input-os-servico', listaServicos, 'servico');
            osModal.classList.add('active');
        } catch (error) { showAlert(error.message, false); fecharModal(); }
    };

    // --- EVENT LISTENERS ---
    inputBusca.addEventListener('input', () => {
        const termo = inputBusca.value.toLowerCase();
        
        const osFiltradas = todasAsOS
            .filter(os => 
                os.placa.toLowerCase().includes(termo) || 
                os.cliente_nome.toLowerCase().includes(termo)
            )
            .sort((a, b) => { // <-- LÓGICA DE ORDENAÇÃO CORRIGIDA
                const aClientStartsWith = a.cliente_nome.toLowerCase().startsWith(termo);
                const bClientStartsWith = b.cliente_nome.toLowerCase().startsWith(termo);
                const aPlacaStartsWith = a.placa.toLowerCase().startsWith(termo);
                const bPlacaStartsWith = b.placa.toLowerCase().startsWith(termo);

                if ((aClientStartsWith || aPlacaStartsWith) && !(bClientStartsWith || bPlacaStartsWith)) return -1;
                if (!(aClientStartsWith || aPlacaStartsWith) && (bClientStartsWith || bPlacaStartsWith)) return 1;
                
                return a.cliente_nome.localeCompare(b.cliente_nome);
            });

        desenharTabela(osFiltradas);
    });
    tabelaOSHead.addEventListener('click', (e) => {
        const header = e.target.closest('th[data-sort]');
        if (!header) return;
        const column = header.dataset.sort;
        if (sortState.column === column) sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
        else { sortState.column = column; sortState.direction = 'asc'; }
        renderizarTabelaOS();
    });
    document.getElementById('btnNovaOS').addEventListener('click', abrirModalNovaOS);
    tabelaOSBody.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action="editar-os"]');
        if (button) abrirModalEdicaoOS(button.dataset.osId);
    });
    osModal.addEventListener('click', async (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) { if (e.target === osModal) fecharModal(); return; }
        const action = target.dataset.action;
        if (action === 'fechar-modal') fecharModal();
        if (action === 'procurar-placa') await procurarPlaca();
        if (action === 'adicionar-item') await adicionarItemOS();
        if (action === 'remover-item') await removerItemOS(target.dataset.itemId);
        if (action === 'adicionar-servico') await adicionarServicoOS();
        if (action === 'remover-servico') await removerServicoOS(target.dataset.servicoId);
        if (action === 'imprimir-os') imprimirOS();
    });
    osModal.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (e.target.id === 'form-nova-os') await criarNovaOS();
        if (e.target.id === 'form-edit-os') await salvarAlteracoesOS();
    });
    
    // --- INICIALIZAÇÃO ---
    renderizarTabelaOS();
});