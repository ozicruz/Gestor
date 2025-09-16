// public/js/gestao_os.js

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';
    let listaProdutos = [];
    let listaServicos = [];
    let osAtual = null;
    let selectedItemOS = { produto: null, servico: null }; // Estado para o autocomplete do modal

    // --- ELEMENTOS DO DOM ---
    const tabelaOSBody = document.getElementById('tabela-os');
    const osModal = document.getElementById('os-modal');
    const osModalBody = document.getElementById('os-modal-body');
    const osModalTitle = document.getElementById('os-modal-title');
    
    // --- FUNÇÕES AUXILIARES ---
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    const showAlert = (message, isSuccess = true) => {
        const feedbackAlert = document.getElementById('feedback-alert');
        if (!feedbackAlert) return;
        feedbackAlert.textContent = message;
        feedbackAlert.className = `feedback-alert p-4 mb-4 text-sm rounded-lg ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
        feedbackAlert.style.display = 'block';
        setTimeout(() => { feedbackAlert.style.display = 'none'; }, 4000);
    };

    const carregarProdutosEServicos = async () => {
        try {
            const [produtosRes, servicosRes] = await Promise.all([
                fetch(`${API_URL}/produtos`),
                fetch(`${API_URL}/servicos`)
            ]);
            listaProdutos = await produtosRes.json();
            listaServicos = await servicosRes.json();
        } catch (error) {
            console.error('Erro ao carregar produtos e serviços:', error);
        }
    };

    // --- FUNÇÕES DA PÁGINA PRINCIPAL ---
    const renderizarTabelaOS = async () => {
        try {
            const response = await fetch(`${API_URL}/ordens-servico`);
            const ordens = await response.json();
            tabelaOSBody.innerHTML = '';
            ordens.forEach(os => {
                const tr = document.createElement('tr');
                const dataEntrada = new Date(os.data_entrada).toLocaleDateString('pt-BR');
                let statusClass = 'bg-yellow-100 text-yellow-800';
                if (os.status === 'Finalizada' || os.status === 'Entregue') statusClass = 'bg-green-100 text-green-800';
                if (os.status === 'Cancelada') statusClass = 'bg-red-100 text-red-800';

                tr.innerHTML = `
                    <td class="px-6 py-4 font-bold">${os.id}</td>
                    <td class="px-6 py-4">${os.placa}</td>
                    <td class="px-6 py-4">${os.cliente_nome}</td>
                    <td class="px-6 py-4">${dataEntrada}</td>
                    <td class="px-6 py-4 font-semibold">${formatCurrency(os.total)}</td>
                    <td class="px-6 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${os.status}</span></td>
                    <td class="px-6 py-4 text-right text-sm font-medium">
                        <button data-action="editar-os" data-os-id="${os.id}" class="text-indigo-600 hover:text-indigo-900">Ver / Editar</button>
                    </td>
                `;
                tabelaOSBody.appendChild(tr);
            });
        } catch (error) {
            showAlert('Não foi possível carregar as Ordens de Serviço.', false);
        }
    };

    const abrirModalNovaOS = () => {
        osModalTitle.textContent = 'Abrir Nova Ordem de Serviço';
        osModalBody.innerHTML = `
            <div>
                <label for="input-placa-busca" class="block text-sm font-medium text-gray-700">Digite a placa do veículo</label>
                <div class="flex items-center gap-2 mt-1">
                    <input type="text" id="input-placa-busca" class="form-input block w-full uppercase" placeholder="ABC1234">
                    <button id="btn-procurar-placa" class="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800">Procurar</button>
                </div>
                <div id="busca-resultado" class="mt-4"></div>
            </div>
            <div class="mt-6 text-right">
                <button data-action="fechar-modal" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancelar</button>
            </div>
        `;
        osModal.classList.add('active');
        document.getElementById('btn-procurar-placa').addEventListener('click', procurarPlaca);
    };

    const procurarPlaca = async () => {
        const placa = document.getElementById('input-placa-busca').value.toUpperCase();
        const resultadoDiv = document.getElementById('busca-resultado');
        if (!placa) {
            resultadoDiv.innerHTML = '<p class="text-red-500">Por favor, digite uma placa.</p>';
            return;
        }
        const response = await fetch(`${API_URL}/veiculos/placa/${placa}`);
        if (!response.ok) {
            resultadoDiv.innerHTML = '<p class="text-red-500">Veículo não encontrado. <a href="gestao_clientes.html" class="underline">Registe-o primeiro</a>.</p>';
            return;
        }
        const veiculo = await response.json();
        resultadoDiv.innerHTML = `
            <div class="bg-green-50 border border-green-200 p-3 rounded-md">
                <p><strong>Placa:</strong> ${veiculo.placa}</p>
                <p><strong>Cliente:</strong> ${veiculo.cliente_nome}</p>
                <form id="os-form-nova">
                    <input type="hidden" id="os-veiculo-id" value="${veiculo.id}">
                    <div class="mt-4">
                        <label for="os-problema" class="block text-sm font-medium text-gray-700">Problema Relatado pelo Cliente</label>
                        <textarea id="os-problema" rows="3" required class="form-input mt-1 block w-full"></textarea>
                    </div>
                    <div class="flex justify-end gap-3 mt-4">
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Confirmar e Abrir OS</button>
                    </div>
                </form>
            </div>
        `;
        document.getElementById('os-form-nova').addEventListener('submit', criarNovaOS);
    };
    
    const criarNovaOS = async (e) => {
        e.preventDefault();
        const osData = {
            veiculo_id: document.getElementById('os-veiculo-id').value,
            problema_relatado: document.getElementById('os-problema').value
        };
        const response = await fetch(`${API_URL}/ordens-servico`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(osData)
        });
        if (response.ok) {
            fecharModalOS();
            await renderizarTabelaOS();
            showAlert('Ordem de Serviço aberta com sucesso!', true);
        } else {
            showAlert('Erro ao abrir a Ordem de Serviço.', false);
        }
    };

    // --- Funções para EDITAR OS ---
    const abrirModalEdicaoOS = async (osId) => {
        osModalTitle.textContent = `Editando Ordem de Serviço #${osId}`;
        osModalBody.innerHTML = '<p class="text-center">A carregar dados da OS...</p>';
        osModal.classList.add('active');

        try {
            const response = await fetch(`${API_URL}/ordens-servico/${osId}`);
            if (!response.ok) throw new Error('Falha ao carregar OS.');
            osAtual = await response.json();
            
            // =================================================================================
            // === CORREÇÃO 1: HTML DO MODAL ATUALIZADO PARA INCLUIR O CAMPO DE QUANTIDADE ===
            // =================================================================================
            osModalBody.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg mb-4">
                    <h3 class="font-bold">Cliente: <span class="font-normal">${osAtual.cliente_nome}</span></h3>
                    <p class="font-bold">Veículo: <span class="font-normal">${osAtual.marca || ''} ${osAtual.modelo || ''}</span> | Placa: <span class="font-normal">${osAtual.placa}</span></p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label for="os-problema-relatado" class="block text-sm font-medium text-gray-700">Problema Relatado</label><textarea id="os-problema-relatado" rows="3" class="form-input mt-1 w-full">${osAtual.problema_relatado || ''}</textarea></div>
                    <div><label for="os-diagnostico-tecnico" class="block text-sm font-medium text-gray-700">Diagnóstico Técnico</label><textarea id="os-diagnostico-tecnico" rows="3" class="form-input mt-1 w-full">${osAtual.diagnostico_tecnico || ''}</textarea></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                    <div>
                        <h4 class="font-semibold mb-2">Itens Utilizados</h4>
                        <div id="os-itens-lista" class="mb-4 space-y-2"></div>
                        <div class="flex items-end gap-2">
                            <div class="flex-grow autocomplete-container"><input type="text" id="input-os-produto" placeholder="Buscar peça..." class="form-input w-full text-sm"><div id="results-os-produto" class="autocomplete-results hidden"></div></div>
                            <div class="w-20"><label for="input-os-produto-qtd" class="block text-xs font-medium text-gray-700 text-center">Qtd.</label><input type="number" id="input-os-produto-qtd" value="1" min="1" class="form-input w-full mt-1 text-center"></div>
                            <button data-action="adicionar-item" class="bg-gray-600 text-white px-3 py-2 text-xs rounded-md hover:bg-gray-700 h-10">Add</button>
                        </div>
                    </div>
                    <div>
                        <h4 class="font-semibold mb-2">Serviços Executados</h4>
                        <div id="os-servicos-lista" class="mb-4 space-y-2"></div>
                        <div class="flex items-end gap-2"><div class="flex-grow autocomplete-container"><input type="text" id="input-os-servico" placeholder="Buscar serviço..." class="form-input w-full text-sm"><div id="results-os-servico" class="autocomplete-results hidden"></div></div><button data-action="adicionar-servico" class="bg-gray-600 text-white px-3 py-2 text-xs rounded-md hover:bg-gray-700 h-10">Add</button></div>
                    </div>
                </div>
                <div class="flex justify-between items-center mt-6 pt-4 border-t">
                    <div class="text-xl font-bold">TOTAL: <span id="os-total-valor">${formatCurrency(osAtual.total)}</span></div>
                    <div><label for="os-status" class="block text-sm font-medium text-gray-700">Status</label><select id="os-status" class="form-input mt-1"><option value="Aberta" ${osAtual.status === 'Aberta' ? 'selected' : ''}>Aberta</option><option value="Em andamento" ${osAtual.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option><option value="Aguardando peça" ${osAtual.status === 'Aguardando peça' ? 'selected' : ''}>Aguardando peça</option><option value="Finalizada" ${osAtual.status === 'Finalizada' ? 'selected' : ''}>Finalizada</option><option value="Entregue" ${osAtual.status === 'Entregue' ? 'selected' : ''}>Entregue</option><option value="Cancelada" ${osAtual.status === 'Cancelada' ? 'selected' : ''}>Cancelada</option></select></div>
                </div>
                <div class="mt-8 flex justify-between">
                    <button data-action="fechar-modal" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Fechar</button>
                    <div><button data-action="imprimir-os" class="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg mr-2">Imprimir</button><button data-action="salvar-os" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Salvar Alterações</button></div>
                </div>
            `;
            renderizarItensDaOS();
            setupAutocomplete('input-os-produto', listaProdutos, 'produto');
            setupAutocomplete('input-os-servico', listaServicos, 'servico');
        } catch (error) {
            osModalBody.innerHTML = `<p class="text-red-500 text-center">Erro ao carregar dados. Tente novamente.</p>`;
        }
    };

    const renderizarItensDaOS = () => {
        if (!osAtual) return;
        const itensListaDiv = document.getElementById('os-itens-lista');
        const servicosListaDiv = document.getElementById('os-servicos-lista');
        const totalValorEl = document.getElementById('os-total-valor');
        
        const totalItens = osAtual.itens.reduce((sum, item) => sum + (item.quantidade * item.valor_unitario), 0);
        const totalServicos = osAtual.servicos.reduce((sum, serv) => sum + serv.valor, 0);
        osAtual.total = totalItens + totalServicos;

        itensListaDiv.innerHTML = osAtual.itens.map((item, index) => `
            <div class="flex justify-between items-center text-sm p-1 bg-gray-100 rounded">
                <span>${item.quantidade}x ${item.nome}</span>
                <button data-action="remover-item" data-index="${index}" class="text-red-500 text-xs px-2">x</button>
            </div>`).join('');
        servicosListaDiv.innerHTML = osAtual.servicos.map((servico, index) => `
            <div class="flex justify-between items-center text-sm p-1 bg-gray-100 rounded">
                <span>${servico.nome}</span>
                <button data-action="remover-servico" data-index="${index}" class="text-red-500 text-xs px-2">x</button>
            </div>`).join('');
        
        totalValorEl.textContent = formatCurrency(osAtual.total);
    };

// Em public/js/gestao_os.js

    const setupAutocomplete = (inputId, items, type) => {
        const input = document.getElementById(inputId);
        const resultsId = inputId.replace('input-', 'results-');
        const results = document.getElementById(resultsId);
        
        input.addEventListener('input', () => {
            const query = input.value.toLowerCase();
            results.innerHTML = '';
            if (type === 'produto') selectedItemOS.produto = null;
            if (type === 'servico') selectedItemOS.servico = null;

            if (!query) { results.classList.add('hidden'); return; }
            
            // CORREÇÃO 1: Alterado de .includes() para .startsWith() para filtrar corretamente
            const filtered = items
                .filter(i => i.nome.toLowerCase().startsWith(query))
                .sort((a, b) => a.nome.localeCompare(b.nome));

            results.classList.remove('hidden');
            filtered.forEach(item => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';

                // CORREÇÃO 2: Adicionada a lógica para mostrar o preço, igual à da tela de Vendas
                div.textContent = item.preco_unitario 
                    ? `${item.nome} (${formatCurrency(item.preco_unitario)})` 
                    : (item.preco ? `${item.nome} (${formatCurrency(item.preco)})` : item.nome);
                
                div.addEventListener('click', () => {
                    input.value = item.nome;
                    if (type === 'produto') selectedItemOS.produto = item;
                    if (type === 'servico') selectedItemOS.servico = item;
                    results.classList.add('hidden');
                });
                results.appendChild(div);
            });
        });
    };

    // =====================================================================================
    // === CORREÇÃO 2: LÓGICA DE ADICIONAR ITEM ATUALIZADA PARA LER A QUANTIDADE ===
    // =====================================================================================
  // Em public/js/gestao_os.js

    const adicionarItemOS = () => {
        const produto = selectedItemOS.produto;
        const qtdInput = document.getElementById('input-os-produto-qtd');
        const quantidade = parseInt(qtdInput.value);

        if (!produto) return alert('Selecione uma peça da lista.');
        if (!quantidade || quantidade <= 0) return alert('Insira uma quantidade válida.');
        
        // CORREÇÃO: Cria o objeto com a propriedade "produto_id" para manter a consistência.
        const novoItem = { 
            id: null, // O ID da linha Itens_OS ainda não existe
            produto_id: produto.id, // O ID do produto
            nome: produto.nome,
            quantidade: quantidade, 
            valor_unitario: parseFloat(produto.preco_unitario)
        };
        
        const itemExistente = osAtual.itens.find(item => item.produto_id === produto.id);

        if (itemExistente) {
            itemExistente.quantidade += quantidade;
        } else {
            osAtual.itens.push(novoItem);
        }

        renderizarItensDaOS();
        document.getElementById('input-os-produto').value = '';
        qtdInput.value = 1;
        selectedItemOS.produto = null;
    };

    const adicionarServicoOS = () => {
        const servico = selectedItemOS.servico;
        if (!servico) return alert('Selecione um serviço da lista.');
        if (osAtual.servicos.some(s => s.servico_id === servico.id)) return alert('Este serviço já foi adicionado.');
        
        // CORREÇÃO: Cria o objeto com a propriedade "servico_id"
        osAtual.servicos.push({ 
            id: null, // O ID da linha Servicos_OS ainda não existe
            servico_id: servico.id, // O ID do serviço
            nome: servico.nome,
            valor: parseFloat(servico.preco)
        });

        renderizarItensDaOS();
        document.getElementById('input-os-servico').value = '';
        selectedItemOS.servico = null;
    };
    
    const removerItemOS = (index) => {
        osAtual.itens.splice(index, 1);
        renderizarItensDaOS();
    };
    
    const removerServicoOS = (index) => {
        osAtual.servicos.splice(index, 1);
        renderizarItensDaOS();
    };
    
    const salvarAlteracoesOS = async () => {
        if (!osAtual) return;
        const dataParaSalvar = {
            problema_relatado: document.getElementById('os-problema-relatado').value,
            diagnostico_tecnico: document.getElementById('os-diagnostico-tecnico').value,
            status: document.getElementById('os-status').value,
            itens: osAtual.itens,
            servicos: osAtual.servicos
        };
        try {
            const response = await fetch(`${API_URL}/ordens-servico/${osAtual.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataParaSalvar)
            });
            if(response.ok) {
                showAlert('OS atualizada com sucesso!', true);
                fecharModalOS();
                await renderizarTabelaOS();
            } else {
                const result = await response.json();
                showAlert(result.message || 'Erro ao atualizar a OS.', false);
            }
        } catch (error) {
            showAlert('Erro de comunicação ao salvar a OS.', false);
        }
    };
    
    const fecharModalOS = () => { osModal.classList.remove('active'); osModalBody.innerHTML = ''; osAtual = null; };

    const imprimirOS = async (osId) => {
        try {
            const response = await fetch(`${API_URL}/ordens-servico/${osId}`);
            if (!response.ok) throw new Error('Não foi possível carregar os dados da OS para impressão.');
            const os = await response.json();
            const template = document.getElementById('os-recibo-template');
            const clone = template.content.cloneNode(true);

            clone.querySelector('[data-recibo="os-id"]').textContent = os.id;
            clone.querySelector('[data-recibo="data"]').textContent = new Date(os.data_entrada).toLocaleDateString('pt-BR');
            clone.querySelector('[data-recibo="cliente-nome"]').textContent = os.cliente_nome;
            clone.querySelector('[data-recibo="veiculo-modelo"]').textContent = `${os.marca || ''} ${os.modelo || ''}`;
            clone.querySelector('[data-recibo="veiculo-placa"]').textContent = os.placa;
            clone.querySelector('[data-recibo="problema-relatado"]').textContent = os.problema_relatado || 'Nenhum';
            clone.querySelector('[data-recibo="diagnostico-tecnico"]').textContent = os.diagnostico_tecnico || 'Nenhum';
            clone.querySelector('[data-recibo="total"]').textContent = formatCurrency(os.total || 0);

            const tabelaItensBody = clone.querySelector('[data-recibo="itens-tabela"]');
            const allItems = [
                ...os.itens.map(i => ({...i, tipo: 'Item', subtotal: i.quantidade * i.valor_unitario})), 
                ...os.servicos.map(s => ({...s, nome: s.nome, quantidade: 1, valor_unitario: s.valor, subtotal: s.valor, tipo: 'Serviço'}))
            ];
            tabelaItensBody.innerHTML = '';
            allItems.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${item.nome} (${item.tipo})</td><td style="text-align: center;">${item.quantidade}</td><td style="text-align: right;">${formatCurrency(item.valor_unitario || item.valor)}</td><td style="text-align: right;">${formatCurrency(item.subtotal || item.valor)}</td>`;
                tabelaItensBody.appendChild(tr);
            });

            const htmlContent = new XMLSerializer().serializeToString(clone);
            const filename = `OS_${os.id}.pdf`;
                // ADICIONE ESTA LINHA PARA DEPURAÇÃO
            console.log("HTML a ser impresso:", htmlContent);
            window.electronAPI.send('print-to-pdf', { html: htmlContent, name: filename });
        } catch (error) {
            console.error('Erro ao imprimir OS:', error);
            showAlert('Não foi possível gerar o recibo da OS.', false);
        }
    };

    // --- EVENT LISTENERS ---
    carregarProdutosEServicos();
    renderizarTabelaOS();
    document.getElementById('btnNovaOS').addEventListener('click', abrirModalNovaOS);

    document.body.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        
        if (action === 'editar-os') abrirModalEdicaoOS(button.dataset.osId);
        if (action === 'remover-item') removerItemOS(parseInt(button.dataset.index));
        if (action === 'remover-servico') removerServicoOS(parseInt(button.dataset.index));
        if (action === 'salvar-os') salvarAlteracoesOS();
        if (action === 'imprimir-os') imprimirOS(osAtual.id);
        if (action === 'fechar-modal') fecharModalOS();
        if (action === 'adicionar-item') adicionarItemOS();
        if (action === 'adicionar-servico') adicionarServicoOS();
    });
});