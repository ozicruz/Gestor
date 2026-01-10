document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3002/api';
    
    // --- ESTADO ---
    let listaOSCache = [];
    let cacheProdutos = [], cacheServicos = [], cacheUsuarios = [], cacheVeiculos = [];
    let ordemAtual = { coluna: 'id', direcao: 'desc' }; 
    let osIdEdicao = null;
    let itensParaSalvar = [], servicosParaSalvar = [];

    // --- VARIÁVEIS TEMPORÁRIAS GLOBAIS ---
    window.tempProdutoId = null;
    window.tempServicoId = null;

    // --- ELEMENTOS ---
    const tabelaCorpo = document.getElementById('tabela-os');
    const inputBusca = document.getElementById('input-busca-placa');
    const btnNovaOS = document.getElementById('btnNovaOS');
    const feedbackAlert = document.getElementById('feedback-alert');
    const modalOS = document.getElementById('os-modal');
    const modalBody = document.getElementById('os-modal-body');

    // --- HELPERS ---
    const safeNumber = (val) => parseFloat(String(val).replace(',', '.')) || 0;
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeNumber(val));
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
    
    const showAlert = (msg, success = true) => {
        if (!feedbackAlert) return alert(msg);
        feedbackAlert.textContent = msg;
        feedbackAlert.className = `p-4 mb-4 rounded text-center font-bold fixed top-4 right-4 z-[9999] shadow-lg animate-bounce ${success ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`;
        feedbackAlert.classList.remove('hidden');
        setTimeout(() => feedbackAlert.classList.add('hidden'), 3000);
    };

    // --- CARREGAR DADOS ---
    const carregarDadosAuxiliares = async () => {
        try {
            const [resProd, resServ, resUsers, resVeic] = await Promise.all([
                fetch(`${API_URL}/produtos`).catch(() => ({ ok: false })),
                fetch(`${API_URL}/servicos`).catch(() => ({ ok: false })),
                fetch(`${API_URL}/usuarios`).catch(() => ({ ok: false })),
                fetch(`${API_URL}/veiculos`).catch(() => ({ ok: false }))
            ]);

            if (resProd.ok) cacheProdutos = await resProd.json();
            if (resServ.ok) cacheServicos = await resServ.json();
            if (resUsers.ok) cacheUsuarios = await resUsers.json();
            if (resVeic.ok) {
                const veiculos = await resVeic.json();
                cacheVeiculos = veiculos.map(v => ({
                    id: v.id,
                    nome: v.placa, 
                    codigo: (v.modelo || '') + ' ' + (v.marca || ''), 
                    cliente_nome: v.cliente_nome 
                }));
            }
        } catch (error) { console.error("Erro dados aux:", error); }
    };

    // --- AUTOCOMPLETE INTELIGENTE (COM ORDENAÇÃO CORRIGIDA PARA SERVIÇOS) ---
    const setupAutocomplete = (inputId, listId, dataArray, priceInputId, hiddenIdCallback, tipoItem = 'produto') => {
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        const priceInput = document.getElementById(priceInputId);
        
        if (!input || !list) return;
        
        let currentFocus = -1;
        let lastResults = []; 

        // Helper para pegar o nome ou descrição de forma segura
        const getNome = (item) => (item.nome || item.descricao || '').toLowerCase();

        const selectItem = (item) => {
            // Usa nome ou descrição para preencher o input
            input.value = item.nome || item.descricao;
            
            if(priceInput && tipoItem !== 'veiculo') {
                const p = item.preco_unitario || item.preco || item.valor || 0;
                priceInput.value = p.toFixed(2);
            }
            hiddenIdCallback(item.id);
            list.innerHTML = '';
            list.classList.add('hidden');
            if(priceInput) priceInput.focus();
        };

        input.addEventListener('input', function() {
            hiddenIdCallback(null);
            const termo = input.value.toLowerCase(); 
            list.innerHTML = ''; currentFocus = -1;
            
            if (termo.length < 1) { list.classList.add('hidden'); return; }

            const dadosSeguros = dataArray || [];
            
            // 1. Filtra (procura em nome, descrição ou código)
            let matches = dadosSeguros.filter(item => {
                const nomeItem = getNome(item);
                const codigoItem = (item.codigo || '').toLowerCase();
                return nomeItem.includes(termo) || codigoItem.includes(termo);
            });

            // 2. Ordena Alfabeticamente (Agora funciona para Produtos e Serviços)
            matches.sort((a, b) => {
                const nomeA = getNome(a);
                const nomeB = getNome(b);
                
                // Prioridade para quem COMEÇA com o termo digitado
                const aComeca = nomeA.startsWith(termo);
                const bComeca = nomeB.startsWith(termo);
                
                if (aComeca && !bComeca) return -1;
                if (!aComeca && bComeca) return 1;
                
                return nomeA.localeCompare(nomeB);
            });
            
            lastResults = matches; 

            if (matches.length > 0) { 
                list.classList.remove('hidden'); 
                matches.slice(0, 10).forEach(item => { 
                    const div = document.createElement('div'); 
                    div.className = "p-2 hover:bg-blue-100 cursor-pointer border-b text-sm text-gray-700 bg-white"; 
                    
                    let displayHtml = '';
                    // Define o texto a ser exibido (Nome ou Descrição)
                    const textoPrincipal = item.nome || item.descricao;

                    if (tipoItem === 'veiculo') {
                        displayHtml = `<strong>${textoPrincipal}</strong> <span class="text-xs text-gray-500 uppercase">${item.codigo} - ${item.cliente_nome || ''}</span>`;
                    } else {
                        const p = item.preco_unitario || item.preco || item.valor || 0; 
                        let estoqueInfo = '';
                        if (item.quantidade_em_estoque !== undefined && item.quantidade_em_estoque !== null) {
                            const corEstoque = item.quantidade_em_estoque > 0 ? 'text-gray-500' : 'text-red-500 font-bold';
                            estoqueInfo = ` <span class="text-xs ${corEstoque} ml-2">(Estq: ${item.quantidade_em_estoque})</span>`;
                        }
                        displayHtml = `<strong>${textoPrincipal}</strong> - ${formatCurrency(p)}${estoqueInfo}`;
                    }
                    div.innerHTML = displayHtml;
                    div.addEventListener('mousedown', (e) => { e.preventDefault(); selectItem(item); }); 
                    list.appendChild(div); 
                }); 
            } else { list.classList.add('hidden'); }
        });

        // Navegação por teclado (Mantida)
        input.addEventListener('keydown', function(e) { 
            let x = list.getElementsByTagName('div'); 
            if (e.key === 'ArrowDown') { currentFocus++; addActive(x); } 
            else if (e.key === 'ArrowUp') { currentFocus--; addActive(x); } 
            else if (e.key === 'Enter') { 
                if (currentFocus > -1 && x) { e.preventDefault(); x[currentFocus].click(); }
                else if (lastResults.length > 0) { e.preventDefault(); selectItem(lastResults[0]); }
            } 
            else if (e.key === 'Tab') {
                if(lastResults.length > 0 && input.value.length > 2) { selectItem(lastResults[0]); } 
                list.classList.add('hidden');
            }
            else if (e.key === 'Escape') list.classList.add('hidden'); 
        });

        input.addEventListener('blur', () => {
            setTimeout(() => { 
                if (window.tempProdutoId === null && window.tempServicoId === null && input.value.trim() !== '' && lastResults.length > 0) {
                    // Tenta encontrar correspondência exata tanto por nome quanto por descrição
                    const match = lastResults.find(i => getNome(i) === input.value.toLowerCase());
                    if(match) selectItem(match);
                }
                list.classList.add('hidden'); 
            }, 200);
        });

        function addActive(x) { 
            if (!x) return; 
            removeActive(x); 
            if (currentFocus >= x.length) currentFocus = 0; 
            if (currentFocus < 0) currentFocus = (x.length - 1); 
            x[currentFocus].classList.add('bg-blue-200'); 
            x[currentFocus].scrollIntoView({ block: 'nearest' }); 
        }
        function removeActive(x) { for (let i = 0; i < x.length; i++) x[i].classList.remove('bg-blue-200'); }
    };

    // --- MODAL DE NOVA OS ---
    const abrirModalNovaOS = () => {
        const anterior = document.getElementById('modal-nova-os-container'); if(anterior) anterior.remove();
        
        const div = document.createElement('div');
        div.id = 'modal-nova-os-container';
        div.className = "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]";
        div.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-6 w-96 border border-gray-200 relative">
                <h3 class="text-xl font-bold text-gray-800 mb-4 text-center">Nova Ordem de Serviço</h3>
                <div class="mb-2 relative">
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-2 text-center">Digite a Placa do Veículo</label>
                    <input type="text" id="input-nova-placa-modal" class="w-full border-2 border-gray-300 rounded-lg p-3 text-3xl text-center uppercase font-bold text-gray-800 focus:border-blue-600 outline-none" placeholder="ABC1234" maxlength="8" autocomplete="off">
                    <div id="list-nova-placa-autocomplete" class="hidden absolute left-0 right-0 bg-white border border-gray-300 shadow-lg max-h-40 overflow-y-auto z-50 rounded-b-lg"></div>
                </div>
                <div id="msg-erro-placa" class="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 text-center">
                    <p class="font-bold">Veículo não encontrado!</p>
                    <a href="clientes_veiculos.html" class="underline mt-1 block text-blue-600">Cadastrar Veículo Agora &rarr;</a>
                </div>
                <div class="flex justify-between gap-3 mt-4">
                    <button id="btn-cancel-placa-modal" class="flex-1 px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200">Cancelar</button>
                    <button id="btn-confirm-placa-modal" class="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg">Criar OS &rarr;</button>
                </div>
            </div>`;
        document.body.appendChild(div);

        const input = document.getElementById('input-nova-placa-modal');
        const btnCriar = document.getElementById('btn-confirm-placa-modal');
        const btnCancel = document.getElementById('btn-cancel-placa-modal');
        const msgErro = document.getElementById('msg-erro-placa');

        input.focus();
        setupAutocomplete('input-nova-placa-modal', 'list-nova-placa-autocomplete', cacheVeiculos, null, () => {}, 'veiculo');

        const fechar = () => { if(div) div.remove(); };

        const tentarCriar = async () => {
            const placa = input.value.trim().toUpperCase();
            if (placa.length < 3) { input.classList.add('border-red-500'); return; }

            btnCriar.disabled = true;
            btnCriar.innerHTML = 'Verificando...';
            msgErro.classList.add('hidden');
            input.classList.remove('border-red-500');

            try {
                const res = await fetch(`${API_URL}/os`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ placa: placa }) 
                });
                const data = await res.json();

                if (res.ok) {
                    fechar();
                    showAlert(`OS #${data.id} criada!`);
                    await carregarOS();
                    window.abrirModalEdicao(data.id);
                } else {
                    if (res.status === 404 || (data.message && data.message.includes('encontrado'))) {
                        msgErro.classList.remove('hidden');
                        input.classList.add('border-red-500');
                        input.select();
                    } else {
                        alert("Erro: " + data.message);
                    }
                }
            } catch (err) { alert("Erro de conexão."); } 
            finally { btnCriar.disabled = false; btnCriar.innerHTML = 'Criar OS &rarr;'; }
        };

        btnCancel.onclick = fechar;
        btnCriar.onclick = tentarCriar;
        input.onkeydown = (e) => { 
            if(e.key === 'Enter') { e.preventDefault(); setTimeout(() => tentarCriar(), 100); }
            if(e.key === 'Escape') fechar();
        };
    };

    // --- CARREGAR LISTA ---
    window.carregarOS = async () => {
        try {
            const res = await fetch(`${API_URL}/os`);
            if (!res.ok) throw new Error("Erro API");
            listaOSCache = await res.json();
            renderizarTabela();
        } catch (err) { console.error(err); if(tabelaCorpo) tabelaCorpo.innerHTML = '<tr><td colspan="7" class="text-center text-red-500">Erro ao carregar dados.</td></tr>'; }
    };

    const renderizarTabela = () => {
        if (!tabelaCorpo) return;
        tabelaCorpo.innerHTML = '';
        const termo = inputBusca ? inputBusca.value.toLowerCase() : '';
        let lista = listaOSCache.filter(o => JSON.stringify(o).toLowerCase().includes(termo));

        if (lista.length === 0) { tabelaCorpo.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-gray-500">Nenhuma OS encontrada.</td></tr>'; return; }

        lista.sort((a, b) => { let valA = a[ordemAtual.coluna], valB = b[ordemAtual.coluna]; if (['id', 'total', 'total_calculado'].includes(ordemAtual.coluna)) { valA = safeNumber(valA); valB = safeNumber(valB); } else { valA = String(valA||'').toLowerCase(); valB = String(valB||'').toLowerCase(); } if (valA < valB) return ordemAtual.direcao === 'asc' ? -1 : 1; if (valA > valB) return ordemAtual.direcao === 'asc' ? 1 : -1; return 0; });

        lista.forEach(os => {
            let badge = 'bg-gray-100 text-gray-800'; const st = (os.status || 'Orçamento').toUpperCase();
            if (st.includes('FINALIZADA') || st.includes('CONCLU') || st.includes('FATURADA')) badge = 'bg-green-100 text-green-800 border border-green-200';
            else if (st === 'PRONTO') badge = 'bg-teal-100 text-teal-800 border border-teal-200 font-bold';
            else if (st.includes('ANDAMENTO')) badge = 'bg-blue-100 text-blue-800 border border-blue-200';
            else if (st.includes('AGUARDANDO')) badge = 'bg-orange-100 text-orange-800 border border-orange-200';
            else badge = 'bg-yellow-100 text-yellow-800 border border-yellow-200';

            const mecanico = os.mecanico_nome ? `<br><span class="text-xs text-blue-600 font-bold">🔧 ${os.mecanico_nome}</span>` : '';
            const valorTotal = os.total_calculado !== undefined ? os.total_calculado : os.total;

            tabelaCorpo.innerHTML += `
                <tr class="hover:bg-gray-50 border-b transition-colors cursor-pointer" onclick="abrirModalEdicao(${os.id})">
                    <td class="px-6 py-4 font-bold text-gray-700">#${os.id}</td>
                    <td class="px-6 py-4 font-bold uppercase">${os.placa || '-'}</td>
                    <td class="px-6 py-4 text-gray-600">${os.cliente_nome || 'Consumidor'}</td>
                    <td class="px-6 py-4 text-sm">${formatDate(os.data_entrada)}${mecanico}</td>
                    <td class="px-6 py-4 font-bold text-gray-800">${formatCurrency(valorTotal)}</td>
                    <td class="px-6 py-4 text-center"><span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${badge}">${os.status}</span></td>
                    <td class="px-6 py-4 text-right whitespace-nowrap"><button class="text-blue-600 font-bold hover:text-blue-800 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100">Ver / Editar</button></td>
                </tr>`;
        });
    };

    // --- MODAL DE EDIÇÃO ---
    window.abrirModalEdicao = async (id = null) => {
        osIdEdicao = id; 
        itensParaSalvar = []; 
        servicosParaSalvar = [];
        window.tempProdutoId = null;
        window.tempServicoId = null;

        modalOS.classList.remove('hidden', 'modal-oculto');
        modalBody.innerHTML = '<div class="text-center p-10"><p>Carregando...</p></div>';

        if (cacheProdutos.length === 0 || cacheUsuarios.length === 0) { await carregarDadosAuxiliares(); }

        try {
            const res = await fetch(`${API_URL}/os/${id}`); const dados = await res.json();
            
            itensParaSalvar = (dados.itens || []).map(i => ({ 
                produto_id: i.produto_id, 
                nome: i.nome || i.nome_produto || i.descricao || 'Peça', 
                quantidade: i.quantidade, 
                valor_unitario: i.valor_unitario 
            }));
            
            servicosParaSalvar = (dados.servicos || []).map(s => ({ 
                servico_id: s.servico_id, 
                nome: s.nome || s.descricao || 'Serviço', 
                quantidade: s.quantidade, 
                valor: s.valor 
            }));
            
            renderizarModalHTML(dados);
            
            if (dados.mecanico_id && document.getElementById('modal-mecanico')) {
                document.getElementById('modal-mecanico').value = dados.mecanico_id.toString();
            }

            // Ativa o Autocomplete Inteligente
            setupAutocomplete('add-item-nome', 'list-item-autocomplete', cacheProdutos, 'add-item-valor', (id) => { window.tempProdutoId = id; }, 'produto');
            setupAutocomplete('add-servico-nome', 'list-servico-autocomplete', cacheServicos, 'add-servico-valor', (id) => { window.tempServicoId = id; }, 'servico');
            
            atualizarListasVisuais();
        } catch (err) { console.error(err); modalBody.innerHTML = `<p class="text-red-500 p-4">Erro: ${err.message}</p>`; }
    };

    const renderizarModalHTML = (dados) => {
        const isLocked = dados.status === 'Finalizada' || dados.status === 'Faturada';
        const disabledAttr = isLocked ? 'disabled' : '';
        const bgInput = isLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white';

        const opcoesFluxo = ['Orçamento', 'Aguardando peças', 'Em andamento', 'Pronto'];
        let opcoesStatus = '';
        opcoesFluxo.forEach(st => { opcoesStatus += `<option value="${st}" ${dados.status === st ? 'selected' : ''}>${st}</option>`; });
        if (isLocked && !opcoesFluxo.includes(dados.status)) { opcoesStatus += `<option value="${dados.status}" selected>${dados.status}</option>`; }

        let optionsMecanicos = '<option value="">Selecione...</option>';
        cacheUsuarios.forEach(u => optionsMecanicos += `<option value="${u.id}">${u.nome}</option>`);

        let statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${isLocked ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">${dados.status}</span>`;
        if (isLocked && dados.venda_gerada_id) {
            statusBadge += `<div class="mt-1 text-right"><a href="#" onclick="window.imprimirReciboVenda(${dados.venda_gerada_id})" class="text-xs font-bold text-blue-600 hover:underline">Venda #${dados.venda_gerada_id}</a></div>`;
        }

        let htmlBotoes = '';
        if (!isLocked) {
            htmlBotoes = `<button onclick="salvarAlteracoes()" class="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 mr-2">💾 Salvar</button>`;
            if (dados.status === 'Pronto') {
                htmlBotoes += `<button onclick="gerarVenda(${dados.id})" class="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">💰 Gerar Venda</button>`;
            } else {
                htmlBotoes += `<button disabled class="bg-gray-300 text-gray-500 px-4 py-2 rounded font-bold cursor-not-allowed" title="Mude o status para 'Pronto' para liberar a venda">💰 Gerar Venda</button>`;
            }
        } else { htmlBotoes = `<span class="px-4 py-2 bg-gray-100 text-gray-600 rounded font-bold border">Bloqueado</span>`; }

        modalBody.innerHTML = `
            <div class="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100 flex justify-between items-center">
                <div><h3 class="font-bold text-gray-800 text-lg">Cliente: ${dados.cliente_nome || 'NÃO IDENTIFICADO'}</h3><p class="text-gray-600 text-sm">Veículo: <span class="font-bold uppercase">${dados.placa || '-'}</span> ${dados.modelo || ''}</p></div>
                <div class="text-right"><p class="text-xs text-gray-400 font-bold">OS #${dados.id || 'NOVA'}</p>${statusBadge}</div>
            </div>
            <div class="mb-6"><label class="block text-xs font-bold text-blue-700 uppercase mb-1">Mecânico / Responsável Técnico</label>${isLocked ? `<div class="p-2 bg-gray-100 rounded border font-bold text-gray-700">${dados.mecanico_nome||'Não Informado'}</div>` : `<select id="modal-mecanico" class="form-input w-full ${bgInput}">${optionsMecanicos}</select>`}</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Problema Relatado</label><textarea id="modal-problema" class="form-input w-full ${bgInput}" rows="3" ${disabledAttr}>${dados.problema_relatado || ''}</textarea></div>
                <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Diagnóstico Técnico</label><textarea id="modal-diagnostico" class="form-input w-full ${bgInput}" rows="3" ${disabledAttr}>${dados.diagnostico_tecnico || ''}</textarea></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="border rounded-lg p-4 bg-gray-50 flex flex-col h-full"><h4 class="font-bold text-gray-700 mb-3 border-b pb-2">Itens (Peças)</h4><ul id="lista-itens-visual" class="space-y-2 mb-4 text-sm flex-grow ${isLocked ? 'opacity-75' : ''}"></ul>${!isLocked ? `<div class="flex gap-2 items-end relative"><div class="flex-grow relative"><input id="add-item-nome" placeholder="Buscar item..." class="form-input text-sm w-full mb-1" autocomplete="off"><div id="list-item-autocomplete" class="hidden absolute bg-white border z-10 w-full shadow-lg max-h-40 overflow-y-auto"></div><div class="flex gap-2"><input id="add-item-qtd" type="number" value="1" class="form-input text-sm w-16 text-center"><input id="add-item-valor" type="text" placeholder="R$ 0,00" class="form-input text-sm w-24 text-right"></div></div><button onclick="adicionarItemLista()" class="bg-gray-700 text-white px-3 rounded font-bold h-10 hover:bg-gray-800 mb-0.5">+</button></div>` : ''}</div>
                <div class="border rounded-lg p-4 bg-gray-50 flex flex-col h-full"><h4 class="font-bold text-gray-700 mb-3 border-b pb-2">Mão de Obra</h4><ul id="lista-servicos-visual" class="space-y-2 mb-4 text-sm flex-grow ${isLocked ? 'opacity-75' : ''}"></ul>${!isLocked ? `<div class="flex gap-2 items-end relative"><div class="flex-grow relative"><input id="add-servico-nome" placeholder="Buscar serviço..." class="form-input text-sm w-full mb-1" autocomplete="off"><div id="list-servico-autocomplete" class="hidden absolute bg-white border z-10 w-full shadow-lg max-h-40 overflow-y-auto"></div><div class="flex gap-2"><input id="add-servico-qtd" type="number" value="1" class="form-input text-sm w-16 text-center" placeholder="Qtd"><input id="add-servico-valor" type="text" placeholder="R$ 0,00" class="form-input text-sm w-full text-right"></div></div><button onclick="adicionarServicoLista()" class="bg-gray-700 text-white px-3 rounded font-bold h-10 hover:bg-gray-800 mb-0.5">+</button></div>` : ''}</div>
            </div>
            <div class="flex flex-col md:flex-row justify-between items-center pt-4 border-t gap-4">
                <div class="w-full md:w-1/3"><label class="block text-xs font-bold text-gray-500 mb-1">Situação</label><select id="modal-status" class="form-input w-full ${bgInput}" ${disabledAttr}>${opcoesStatus}</select></div>
                <div class="text-right"><p class="text-sm text-gray-500 uppercase font-bold">Total</p><p class="text-3xl font-bold text-gray-800" id="modal-total-display">R$ 0,00</p></div>
            </div>
            <div class="flex justify-end gap-3 mt-8">
                <button onclick="fecharModal()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-300">Fechar</button>
                <button onclick="imprimirOS(${dados.id})" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow">🖨️ Imprimir</button>
                ${htmlBotoes}
            </div>`;
    };

    // --- CORREÇÃO APLICADA: PERMITE ADICIONAR SEM ID (ITEM AVULSO) ---
    window.adicionarItemLista = () => { 
        const nome = document.getElementById('add-item-nome').value; 
        const qtd = safeNumber(document.getElementById('add-item-qtd').value); 
        const val = safeNumber(document.getElementById('add-item-valor').value); 
        
        if(!nome) return showAlert("Preencha o nome do item.", false); 
        
        // ADICIONA MESMO SEM PRODUTO_ID (VAI COMO ITEM AVULSO)
        itensParaSalvar.push({ produto_id: window.tempProdutoId || null, nome, quantidade: qtd, valor_unitario: val }); 
        
        // Reset
        document.getElementById('add-item-nome').value=''; 
        document.getElementById('add-item-valor').value=''; 
        document.getElementById('add-item-qtd').value='1'; 
        window.tempProdutoId=null; 
        atualizarListasVisuais(); 
        document.getElementById('add-item-nome').focus();
    };

    window.adicionarServicoLista = () => { 
        const nome = document.getElementById('add-servico-nome').value; 
        const qtd = safeNumber(document.getElementById('add-servico-qtd').value); 
        const val = safeNumber(document.getElementById('add-servico-valor').value); 
        
        if(!nome) return showAlert("Preencha o nome do serviço.", false); 
        
        // ADICIONA MESMO SEM SERVICO_ID
        servicosParaSalvar.push({ servico_id: window.tempServicoId || null, nome, quantidade: qtd, valor: val }); 
        
        // Reset
        document.getElementById('add-servico-nome').value=''; 
        document.getElementById('add-servico-valor').value=''; 
        document.getElementById('add-servico-qtd').value='1'; 
        window.tempServicoId=null; 
        atualizarListasVisuais(); 
        document.getElementById('add-servico-nome').focus();
    };

    window.removerItemLista = (idx) => { itensParaSalvar.splice(idx, 1); atualizarListasVisuais(); };
    window.removerServicoLista = (idx) => { servicosParaSalvar.splice(idx, 1); atualizarListasVisuais(); };

    const atualizarListasVisuais = () => {
        const ulItens = document.getElementById('lista-itens-visual'); const ulServicos = document.getElementById('lista-servicos-visual'); const isLocked = document.getElementById('modal-mecanico') && document.getElementById('modal-mecanico').tagName !== 'SELECT'; 
        let total = 0;
        ulItens.innerHTML = ''; itensParaSalvar.forEach((i, idx) => { total += i.quantidade*i.valor_unitario; ulItens.innerHTML += `<li class="flex justify-between items-center bg-white border p-2 rounded mb-1 text-sm"><span class="truncate pr-2">${i.quantidade}x ${i.nome}</span><div class="whitespace-nowrap"><span class="font-bold mr-1">${formatCurrency(i.quantidade*i.valor_unitario)}</span>${!isLocked ? `<button onclick="removerItemLista(${idx})" class="text-red-500 font-bold ml-2">&times;</button>`:''}</div></li>`; });
        ulServicos.innerHTML = ''; servicosParaSalvar.forEach((s, idx) => { total += s.quantidade*s.valor; ulServicos.innerHTML += `<li class="flex justify-between items-center bg-white border p-2 rounded mb-1 text-sm"><span class="truncate pr-2">${s.quantidade}x ${s.nome}</span><div class="whitespace-nowrap"><span class="font-bold mr-1">${formatCurrency(s.quantidade*s.valor)}</span>${!isLocked ? `<button onclick="removerServicoLista(${idx})" class="text-red-500 font-bold ml-2">&times;</button>`:''}</div></li>`; });
        document.getElementById('modal-total-display').textContent = formatCurrency(total);
    };

    window.salvarAlteracoes = async () => {
        try {
            const elemMec = document.getElementById('modal-mecanico');
            const mecanicoValor = elemMec ? elemMec.value : undefined;

            const payload = {
                problema_relatado: document.getElementById('modal-problema').value,
                diagnostico_tecnico: document.getElementById('modal-diagnostico').value,
                status: document.getElementById('modal-status').value,
                mecanico_id: mecanicoValor,
                itens: itensParaSalvar,
                servicos: servicosParaSalvar
            };
            const res = await fetch(`${API_URL}/os/${osIdEdicao}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            if (res.ok) { showAlert("OS Salva!", true); if(typeof window.carregarOS === 'function') window.carregarOS(); window.fecharModal(); return true; } 
            else { const err = await res.json(); showAlert("Erro ao salvar: " + err.message, false); return false; }
        } catch (err) { showAlert("Erro de conexão.", false); return false; }
    };

    window.gerarVenda = async (id) => { if(confirm("Deseja enviar para Vendas?")) { const salvou = await window.salvarAlteracoes(); if(salvou) window.location.href = `gestao_vendas.html?carregar_os=${id}`; } };
    window.fecharModal = () => modalOS.classList.add('hidden', 'modal-oculto');

    // --- IMPRESSÃO DE RECIBO DE VENDA ---
    window.imprimirReciboVenda = async (vendaId) => {
        if(!vendaId) return showAlert("Venda não identificada.", false);
        try {
            const res = await fetch(`${API_URL}/relatorios/vendas/${vendaId}`);
            if(!res.ok) throw new Error("Venda não encontrada.");
            const venda = await res.json();
            
            let emp = { nome_fantasia: 'Minha Oficina' };
            try { const r = await fetch(`${API_URL}/empresa`); if(r.ok) emp = await r.json(); } catch(e){}

            let itensHtml = '';
            [...(venda.itens || []), ...(venda.servicos || [])].forEach(i => {
                const sub = i.subtotal || (i.quantidade * (i.valor_unitario || i.valor));
                itensHtml += `<tr><td style="border-bottom:1px solid #ddd; padding:6px;">${i.nome}</td><td style="border-bottom:1px solid #ddd; padding:6px; text-align:center;">${i.quantidade}</td><td style="border-bottom:1px solid #ddd; padding:6px; text-align:right;">${formatCurrency(i.valor_unitario || i.valor || 0)}</td><td style="border-bottom:1px solid #ddd; padding:6px; text-align:right;">${formatCurrency(sub)}</td></tr>`;
            });

            const htmlContent = `<html><head><meta charset="UTF-8"><title>Recibo Venda #${vendaId}</title><style>body{font-family:'Helvetica',sans-serif;padding:30px;font-size:14px;color:#333}.header{display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin:20px 0}th{text-align:left;border-bottom:2px solid #000;padding:8px;background:#eee}td{padding:8px}.totals{width:300px;margin-left:auto;text-align:right}.row{display:flex;justify-content:space-between;padding:4px 0}.final{border-top:2px solid #000;font-weight:bold;font-size:18px;margin-top:5px;padding-top:5px}.footer{text-align:center;margin-top:40px;border-top:1px dashed #ccc;padding-top:10px;font-size:12px;color:#666}</style></head><body><div class="header"><div><h1>${emp.nome_fantasia}</h1></div><div style="text-align:right;"><h2>RECIBO #${venda.id}</h2><p>${new Date(venda.data).toLocaleDateString('pt-BR')}</p></div></div><p><strong>Cliente:</strong> ${venda.cliente_nome || 'Consumidor'}</p><table><thead><tr><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead><tbody>${itensHtml}</tbody></table><div class="totals"><div class="row"><span>Desconto:</span><span>- ${formatCurrency(venda.desconto_valor || 0)}</span></div><div class="row final"><span>TOTAL:</span><span>${formatCurrency(venda.total)}</span></div></div><div class="footer"><p>Documento sem valor fiscal.</p></div></body></html>`;

            if (window.electronAPI) window.electronAPI.send('print-to-pdf', { html: htmlContent, name: `Venda_${vendaId}.pdf` });
            else { const w = window.open('', '', 'width=800,height=600'); w.document.write(htmlContent); w.document.close(); w.print(); }
        } catch(e) { console.error(e); showAlert("Erro ao gerar recibo: " + e.message, false); }
    };

    window.imprimirOS = async (id) => {
        try {
            const res = await fetch(`${API_URL}/os/${id}`);
            if (!res.ok) throw new Error("Erro ao buscar OS.");
            const os = await res.json();

            let emp = { nome_fantasia: 'Minha Oficina', endereco: '', telefone: '', email: '' };
            try { const resEmp = await fetch(`${API_URL}/empresa`); if (resEmp.ok) emp = await resEmp.json(); } catch (e) { }

            let listaImpressao = [];
            if (os.itens && os.itens.length > 0) {
                os.itens.forEach(item => { listaImpressao.push({ nome: item.nome || item.nome_produto || item.descricao || 'Peça', quantidade: item.quantidade, valor: item.valor_unitario || item.valor || 0 }); });
            }
            if (os.servicos && os.servicos.length > 0) {
                os.servicos.forEach(serv => { listaImpressao.push({ nome: serv.nome || serv.descricao || 'Serviço', quantidade: serv.quantidade, valor: serv.valor || 0 }); });
            }

            let itensHtml = '';
            if (listaImpressao.length === 0) { itensHtml = '<tr><td colspan="4" style="text-align:center; padding:10px; color:#777;">Nenhum item registrado.</td></tr>'; } 
            else {
                listaImpressao.forEach(i => {
                    const totalItem = i.quantidade * i.valor;
                    itensHtml += `<tr><td style="border-bottom:1px solid #ddd; padding:6px;">${i.nome}</td><td style="border-bottom:1px solid #ddd; padding:6px; text-align:center;">${i.quantidade}</td><td style="border-bottom:1px solid #ddd; padding:6px; text-align:right;">${formatCurrency(i.valor)}</td><td style="border-bottom:1px solid #ddd; padding:6px; text-align:right;">${formatCurrency(totalItem)}</td></tr>`;
                });
            }

            const htmlContent = `<html><head><title>OS #${os.id}</title><style>body { font-family: 'Helvetica', sans-serif; padding: 30px; font-size: 14px; color: #333; } .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; } .header h1 { margin: 0; font-size: 22px; } .header p { margin: 2px 0; font-size: 12px; } .box-info { margin-bottom: 15px; padding: 10px; background: #f9f9f9; border: 1px solid #eee; border-radius: 4px; } .box-title { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 5px; } table { width: 100%; border-collapse: collapse; margin: 20px 0; } th { text-align: left; border-bottom: 2px solid #000; padding: 8px; background: #eee; } td { padding: 8px; } .totals { width: 300px; margin-left: auto; text-align: right; } .row { display: flex; justify-content: space-between; padding: 4px 0; } .final { border-top: 2px solid #000; font-weight: bold; font-size: 18px; margin-top: 5px; padding-top: 5px; } .footer { text-align: center; margin-top: 40px; border-top: 1px dashed #ccc; padding-top: 10px; font-size: 12px; color: #666; } .status { font-weight: bold; padding: 3px 8px; background: #eee; border-radius: 4px; font-size: 12px; }</style></head><body>
                <div class="header"><div><h1>${emp.nome_fantasia}</h1><p>${emp.endereco || ''}</p><p>${emp.telefone || ''}</p></div><div style="text-align:right;"><h2>ORDEM DE SERVIÇO</h2><p>#${os.id}</p><p>${new Date(os.data_entrada).toLocaleDateString('pt-BR')}</p><span class="status">${os.status}</span></div></div>
                <div class="box-info"><div class="box-title">Cliente / Veículo</div><div style="display: flex; justify-content: space-between;"><div><strong>${os.cliente_nome || 'Consumidor'}</strong><br>${os.cliente_telefone || ''}</div><div style="text-align:right;"><strong>${os.placa || ''}</strong><br>${os.modelo || ''}</div></div></div>
                <div class="box-info"><div class="box-title">Problema Relatado</div><p style="margin:0;">${os.problema_relatado || 'Não informado.'}</p></div>
                ${os.diagnostico_tecnico ? `<div class="box-info"><div class="box-title">Diagnóstico Técnico</div><p style="margin:0;">${os.diagnostico_tecnico}</p></div>` : ''}
                <table><thead><tr><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead><tbody>${itensHtml}</tbody></table>
                <div class="totals"><div class="row final"><span>TOTAL:</span><span>${formatCurrency(os.total)}</span></div></div>
                <div class="footer"><div style="display: flex; justify-content: space-between; margin-top: 40px;"><div style="width: 45%; border-top: 1px solid #000; padding-top: 5px;">Assinatura da Oficina</div><div style="width: 45%; border-top: 1px solid #000; padding-top: 5px;">Assinatura do Cliente</div></div></div>
            </body></html>`;

            if (window.electronAPI) { window.electronAPI.send('print-to-pdf', { html: htmlContent, name: `OS_${os.id}.pdf` }); } 
            else { const w = window.open('', '', 'width=900,height=700'); w.document.write(htmlContent); w.document.close(); setTimeout(() => w.print(), 500); }
        } catch (e) { console.error(e); showAlert("Erro ao gerar PDF da OS: " + e.message, false); }
    };

    if (btnNovaOS) btnNovaOS.addEventListener('click', abrirModalNovaOS);
    if (inputBusca) inputBusca.addEventListener('input', window.carregarOS);

    carregarDadosAuxiliares();
    window.carregarOS();
});