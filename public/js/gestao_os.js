document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3002/api';
    
    // ESTADO
    let listaOSCache = [];
    let cacheProdutos = []; 
    let cacheServicos = []; 
    let ordemAtual = { coluna: 'id', direcao: 'desc' }; 
    let osIdEdicao = null;
    let itensParaSalvar = []; 
    let servicosParaSalvar = [];

    // ELEMENTOS
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
        feedbackAlert.className = `p-4 mb-4 rounded text-center font-bold ${success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
        feedbackAlert.classList.remove('hidden');
        setTimeout(() => feedbackAlert.classList.add('hidden'), 4000);
    };

    // --- CARREGAR DADOS AUXILIARES ---
    const carregarDadosAuxiliares = async () => {
        try {
            const [resProd, resServ] = await Promise.all([
                fetch(`${API_URL}/produtos`),
                fetch(`${API_URL}/servicos`)
            ]);
            if (resProd.ok) cacheProdutos = await resProd.json();
            if (resServ.ok) cacheServicos = await resServ.json();
        } catch (error) {
            console.error("Erro dados aux:", error);
        }
    };

    // --- AUTOCOMPLETE INTELIGENTE ---
    const setupAutocomplete = (inputId, listId, dataArray, priceInputId, hiddenIdCallback) => {
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        const priceInput = document.getElementById(priceInputId);
        
        if (!input || !list) return;

        let currentFocus = -1;

        input.addEventListener('input', function() {
            hiddenIdCallback(null); 
            const termo = this.value.toLowerCase();
            list.innerHTML = '';
            currentFocus = -1;
            
            if (termo.length < 1) {
                list.classList.add('hidden');
                return;
            }

            const matches = dataArray.filter(item => 
                (item.nome && item.nome.toLowerCase().includes(termo)) || 
                (item.codigo && item.codigo.toLowerCase().includes(termo))
            );

            matches.sort((a, b) => {
                const nomeA = a.nome.toLowerCase();
                const nomeB = b.nome.toLowerCase();
                const aStarts = nomeA.startsWith(termo);
                const bStarts = nomeB.startsWith(termo);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1; 
                return nomeA.localeCompare(nomeB); 
            });

            if (matches.length > 0) {
                list.classList.remove('hidden');
                matches.forEach(item => {
                    const div = document.createElement('div');
                    div.className = "autocomplete-item p-2 hover:bg-blue-100 cursor-pointer border-b text-sm text-gray-700";
                    const estoqueInfo = item.quantidade_em_estoque !== undefined ? ` (Est: ${item.quantidade_em_estoque})` : '';
                    
                    // CORREÇÃO 1: Busca o preço correto (produtos usam preco_unitario, serviços usam preco/valor)
                    const precoItem = item.preco_unitario || item.preco || item.valor || 0;

                    div.innerHTML = `<strong>${item.nome}</strong> - ${formatCurrency(precoItem)}${estoqueInfo}`;
                    div.innerHTML += `<input type='hidden' value='${JSON.stringify(item)}'>`;

                    div.addEventListener('click', function() {
                        selecionarItem(item);
                    });
                    list.appendChild(div);
                });
            } else {
                list.classList.add('hidden');
            }
        });

        input.addEventListener('keydown', function(e) {
            let x = list.getElementsByTagName('div');
            if (e.key === 'ArrowDown') { currentFocus++; addActive(x); }
            else if (e.key === 'ArrowUp') { currentFocus--; addActive(x); }
            else if (e.key === 'Enter') { e.preventDefault(); if (currentFocus > -1 && x) x[currentFocus].click(); }
            else if (e.key === 'Escape') list.classList.add('hidden');
        });

        function addActive(x) {
            if (!x) return;
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            x[currentFocus].classList.add('bg-blue-200', 'font-bold');
            x[currentFocus].scrollIntoView({ block: 'nearest' });
        }

        function removeActive(x) {
            for (let i = 0; i < x.length; i++) x[i].classList.remove('bg-blue-200', 'font-bold');
        }

        function selecionarItem(item) {
            input.value = item.nome;
            if(priceInput) {
                // CORREÇÃO 2: Preenche o input formatado bonitinho
                const val = item.preco_unitario || item.preco || item.valor || 0;
                // Se for 0, deixa vazio para mostrar o placeholder R$ 0,00, senão formata "19,90"
                if (val === 0) {
                    priceInput.value = "";
                } else {
                    priceInput.value = val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
            }
            hiddenIdCallback(item.id);
            list.innerHTML = '';
            list.classList.add('hidden');
        }

        document.addEventListener('click', (e) => {
            if (e.target !== input && e.target !== list) list.classList.add('hidden');
        });
    };

    // --- MANIPULAÇÃO DE MODAL E PLACA ---
    const solicitarPlacaVisual = () => {
        return new Promise((resolve) => {
            const div = document.createElement('div');
            div.className = "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]";
            div.innerHTML = `
                <div class="bg-white rounded-xl shadow-2xl p-6 w-96 border border-gray-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4 text-center">Nova Ordem de Serviço</h3>
                    <div class="mb-6">
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-2 text-center">Digite a Placa</label>
                        <input type="text" id="input-nova-placa-modal" class="w-full border-2 border-gray-300 rounded-lg p-3 text-3xl text-center uppercase font-bold text-gray-800 focus:border-blue-600 outline-none" placeholder="ABC1234" maxlength="8" autocomplete="off">
                    </div>
                    <div class="flex justify-between gap-3">
                        <button id="btn-cancel-placa-modal" class="flex-1 px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200">Cancelar</button>
                        <button id="btn-confirm-placa-modal" class="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg">Criar OS &rarr;</button>
                    </div>
                </div>`;
            document.body.appendChild(div);
            const input = document.getElementById('input-nova-placa-modal');
            input.focus();
            const fechar = (val) => { div.remove(); resolve(val); };
            document.getElementById('btn-cancel-placa-modal').onclick = () => fechar(null);
            const confirmar = () => {
                const v = input.value.trim().toUpperCase();
                if(v.length < 3) return input.classList.add('border-red-500');
                fechar(v);
            };
            document.getElementById('btn-confirm-placa-modal').onclick = confirmar;
            input.onkeydown = (e) => { if(e.key === 'Enter') confirmar(); };
            div.onclick = (e) => { if(e.target === div) fechar(null); };
        });
    };

    // --- CARREGAR LISTA ---
    const carregarOS = async () => {
        try {
            const res = await fetch(`${API_URL}/os`);
            if (!res.ok) throw new Error("Erro API");
            listaOSCache = await res.json();
            renderizarTabela();
        } catch (err) {
            console.error(err);
            if(tabelaCorpo) tabelaCorpo.innerHTML = '<tr><td colspan="7" class="text-center text-red-500">Erro ao carregar dados.</td></tr>';
        }
    };

    const renderizarTabela = () => {
        if (!tabelaCorpo) return;
        tabelaCorpo.innerHTML = '';
        const termo = inputBusca ? inputBusca.value.toLowerCase() : '';
        let lista = listaOSCache.filter(o => JSON.stringify(o).toLowerCase().includes(termo));

        if (lista.length === 0) {
            tabelaCorpo.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-gray-500">Nenhuma OS encontrada.</td></tr>';
            return;
        }

        lista.sort((a, b) => {
            let valA = a[ordemAtual.coluna], valB = b[ordemAtual.coluna];
            if (['id', 'total'].includes(ordemAtual.coluna)) { valA = safeNumber(valA); valB = safeNumber(valB); }
            else { valA = String(valA||'').toLowerCase(); valB = String(valB||'').toLowerCase(); }
            if (valA < valB) return ordemAtual.direcao === 'asc' ? -1 : 1;
            if (valA > valB) return ordemAtual.direcao === 'asc' ? 1 : -1;
            return 0;
        });

        lista.forEach(os => {
            let badge = 'bg-gray-100 text-gray-800';
            const st = (os.status || 'Orçamento').toUpperCase();
            if (st.includes('FINALIZADA') || st.includes('CONCLU')) badge = 'bg-green-100 text-green-800 border border-green-200';
            else if (st.includes('ANDAMENTO')) badge = 'bg-blue-100 text-blue-800 border border-blue-200';
            else if (st.includes('ENTREGUE')) badge = 'bg-teal-100 text-teal-800 border border-teal-200';
            else badge = 'bg-yellow-100 text-yellow-800 border border-yellow-200';

            tabelaCorpo.innerHTML += `
                <tr class="hover:bg-gray-50 border-b transition-colors cursor-pointer" onclick="abrirModalEdicao(${os.id})">
                    <td class="px-6 py-4 font-bold text-gray-700">#${os.id}</td>
                    <td class="px-6 py-4 font-bold uppercase">${os.placa || '-'}</td>
                    <td class="px-6 py-4 text-gray-600">${os.cliente_nome || 'Consumidor'}</td>
                    <td class="px-6 py-4 text-sm">${formatDate(os.data_entrada)}</td>
                    <td class="px-6 py-4 font-bold text-gray-800">${formatCurrency(os.total)}</td>
                    <td class="px-6 py-4 text-center"><span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${badge}">${os.status}</span></td>
                    <td class="px-6 py-4 text-right whitespace-nowrap">
                        <button class="text-blue-600 font-bold hover:text-blue-800 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100">Ver / Editar</button>
                    </td>
                </tr>`;
        });
    };

    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            ordemAtual.direcao = (ordemAtual.coluna === col && ordemAtual.direcao === 'asc') ? 'desc' : 'asc';
            ordemAtual.coluna = col;
            renderizarTabela();
        });
    });

    // --- MODAL DE EDIÇÃO ---
    window.abrirModalEdicao = async (id = null) => {
        osIdEdicao = id;
        itensParaSalvar = [];
        servicosParaSalvar = [];
        
        modalOS.classList.remove('hidden', 'modal-oculto');
        modalBody.innerHTML = '<div class="text-center p-10"><p>Carregando...</p></div>';

        if (cacheProdutos.length === 0) await carregarDadosAuxiliares();

        try {
            let dados = { status: 'Orçamento', placa: '', itens: [], servicos: [] };
            if (id) {
                const res = await fetch(`${API_URL}/os/${id}`);
                if (res.ok) dados = await res.json();
                
                itensParaSalvar = (dados.itens || []).map(i => ({ produto_id: i.produto_id, nome: i.nome || i.nome_produto || i.descricao, quantidade: i.quantidade, valor_unitario: i.valor_unitario }));
                servicosParaSalvar = (dados.servicos || []).map(s => ({ servico_id: s.servico_id, nome: s.nome || s.descricao, quantidade: s.quantidade || 1, valor: s.valor }));
            }
            renderizarModalHTML(dados);
            
            window.tempProdutoId = null;
            window.tempServicoId = null;

            setupAutocomplete('add-item-nome', 'list-item-autocomplete', cacheProdutos, 'add-item-valor', (id) => { window.tempProdutoId = id; });
            setupAutocomplete('add-servico-nome', 'list-servico-autocomplete', cacheServicos, 'add-servico-valor', (id) => { window.tempServicoId = id; });

            atualizarListasVisuais();
        } catch (err) {
            console.error(err);
            modalBody.innerHTML = `<p class="text-red-500 p-4">Erro: ${err.message}</p>`;
        }
    };

    const renderizarModalHTML = (dados) => {
        const isLocked = dados.status === 'Finalizada' || dados.status === 'Faturada' || dados.status === 'Entregue';
        const disabledAttr = isLocked ? 'disabled' : '';
        const bgInput = isLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white';

        let opcoesStatus = `
            <option value="Orçamento" ${dados.status === 'Orçamento' ? 'selected' : ''}>Orçamento</option>
            <option value="Em andamento" ${dados.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
            <option value="Aguardando peças" ${dados.status === 'Aguardando peças' ? 'selected' : ''}>Aguardando peças</option>
        `;
        if (isLocked) opcoesStatus += `<option value="${dados.status}" selected>${dados.status}</option>`;

        modalBody.innerHTML = `
            <div class="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100 flex justify-between items-center">
                <div>
                    <h3 class="font-bold text-gray-800 text-lg">Cliente: ${dados.cliente_nome || 'NÃO IDENTIFICADO'}</h3>
                    <p class="text-gray-600 text-sm">Veículo: <span class="font-bold uppercase">${dados.modelo || ''} - ${dados.placa || ''}</span></p>
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-400 font-bold">OS #${dados.id || 'NOVA'}</p>
                    <span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${isLocked ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${dados.status || 'Nova'}</span>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Problema Relatado</label>
                    <textarea id="modal-problema" class="form-input w-full ${bgInput}" rows="3" ${disabledAttr}>${dados.problema_relatado || dados.problema || ''}</textarea>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Diagnóstico Técnico</label>
                    <textarea id="modal-diagnostico" class="form-input w-full ${bgInput}" rows="3" ${disabledAttr}>${dados.diagnostico_tecnico || dados.diagnostico || ''}</textarea>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="border rounded-lg p-4 bg-gray-50 flex flex-col h-full">
                    <h4 class="font-bold text-gray-700 mb-3 border-b pb-2 flex justify-between">Itens <span class="text-xs text-gray-500 font-normal">Estoque</span></h4>
                    <ul id="lista-itens-visual" class="space-y-2 mb-4 text-sm flex-grow ${isLocked ? 'opacity-75' : ''}"></ul>
                    ${!isLocked ? `
                    <div class="flex gap-2 items-end relative">
                        <div class="flex-grow relative">
                            <input id="add-item-nome" placeholder="Buscar item..." class="form-input text-sm w-full mb-1" autocomplete="off">
                            <div id="list-item-autocomplete" class="autocomplete-results hidden absolute w-full max-h-40 overflow-y-auto bg-white border border-gray-300 z-50 rounded shadow-lg top-full left-0"></div>
                            <div class="flex gap-2">
                                <input id="add-item-qtd" type="number" value="1" class="form-input text-sm w-16 text-center">
                                <input id="add-item-valor" type="text" placeholder="R$ 0,00" class="form-input text-sm w-24 text-right">
                            </div>
                        </div>
                        <button onclick="adicionarItemLista()" class="bg-gray-700 text-white px-3 rounded font-bold h-10 hover:bg-gray-800 mb-0.5">+</button>
                    </div>` : ''}
                </div>

                <div class="border rounded-lg p-4 bg-gray-50 flex flex-col h-full">
                    <h4 class="font-bold text-gray-700 mb-3 border-b pb-2">Mão de Obra</h4>
                    <ul id="lista-servicos-visual" class="space-y-2 mb-4 text-sm flex-grow ${isLocked ? 'opacity-75' : ''}"></ul>
                    ${!isLocked ? `
                    <div class="flex gap-2 items-end relative">
                        <div class="flex-grow relative">
                            <input id="add-servico-nome" placeholder="Buscar serviço..." class="form-input text-sm w-full mb-1" autocomplete="off">
                            <div id="list-servico-autocomplete" class="autocomplete-results hidden absolute w-full max-h-40 overflow-y-auto bg-white border border-gray-300 z-50 rounded shadow-lg top-full left-0"></div>
                            <div class="flex gap-2">
                                <input id="add-servico-qtd" type="number" value="1" class="form-input text-sm w-16 text-center" placeholder="Qtd">
                                <input id="add-servico-valor" type="text" placeholder="R$ 0,00" class="form-input text-sm w-full text-right">
                            </div>
                        </div>
                        <button onclick="adicionarServicoLista()" class="bg-gray-700 text-white px-3 rounded font-bold h-10 hover:bg-gray-800 mb-0.5">+</button>
                    </div>` : ''}
                </div>
            </div>

            <div class="flex flex-col md:flex-row justify-between items-center pt-4 border-t gap-4">
                <div class="w-full md:w-1/3">
                    <label class="block text-xs font-bold text-gray-500 mb-1">Situação</label>
                    <select id="modal-status" class="form-input w-full ${bgInput}" ${disabledAttr}>${opcoesStatus}</select>
                </div>
                <div class="text-right">
                    <p class="text-sm text-gray-500 uppercase font-bold">Total</p>
                    <p class="text-3xl font-bold text-gray-800" id="modal-total-display">R$ 0,00</p>
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-8">
                <button onclick="fecharModal()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-300">Fechar</button>
                <button onclick="imprimirOS(${dados.id})" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow">🖨️ Imprimir</button>
                ${!isLocked ? `
                    <button id="btn-salvar-os" onclick="salvarAlteracoes()" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow">💾 Salvar</button>
                    <button onclick="gerarVenda(${dados.id})" class="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow flex items-center gap-2"><span>💰</span> Gerar Venda</button>
                ` : `<span class="px-4 py-2 bg-green-100 text-green-800 rounded font-bold border border-green-300 shadow-sm cursor-default">✅ Venda Gerada</span>`}
            </div>
        `;
    };

    window.adicionarItemLista = () => {
        const nome = document.getElementById('add-item-nome').value;
        const qtd = safeNumber(document.getElementById('add-item-qtd').value);
        const val = safeNumber(document.getElementById('add-item-valor').value);
        if(!nome) return alert("Preencha o nome do item.");
        
        const prodId = window.tempProdutoId || null;
        itensParaSalvar.push({ produto_id: prodId, nome, quantidade: qtd, valor_unitario: val });
        
        document.getElementById('add-item-nome').value = '';
        document.getElementById('add-item-valor').value = '';
        document.getElementById('add-item-qtd').value = '1';
        window.tempProdutoId = null;
        atualizarListasVisuais();
    };

    window.adicionarServicoLista = () => {
        const nome = document.getElementById('add-servico-nome').value;
        const qtd = safeNumber(document.getElementById('add-servico-qtd').value);
        const val = safeNumber(document.getElementById('add-servico-valor').value);
        if(!nome) return alert("Preencha o nome do serviço.");

        const servId = window.tempServicoId || null;
        servicosParaSalvar.push({ servico_id: servId, nome, quantidade: qtd, valor: val });
        
        document.getElementById('add-servico-nome').value = '';
        document.getElementById('add-servico-valor').value = '';
        document.getElementById('add-servico-qtd').value = '1';
        window.tempServicoId = null;
        atualizarListasVisuais();
    };

    window.removerItemLista = (idx) => { itensParaSalvar.splice(idx, 1); atualizarListasVisuais(); };
    window.removerServicoLista = (idx) => { servicosParaSalvar.splice(idx, 1); atualizarListasVisuais(); };

    const atualizarListasVisuais = () => {
        const ulItens = document.getElementById('lista-itens-visual');
        const ulServicos = document.getElementById('lista-servicos-visual');
        const isLocked = document.getElementById('btn-salvar-os') === null;
        let total = 0;
        
        ulItens.innerHTML = '';
        itensParaSalvar.forEach((item, idx) => {
            const sub = item.quantidade * item.valor_unitario;
            total += sub;
            const btnDelete = isLocked ? '' : `<button onclick="removerItemLista(${idx})" class="text-red-500 font-bold px-2 hover:bg-red-50 rounded ml-2">&times;</button>`;
            ulItens.innerHTML += `<li class="flex justify-between items-center bg-white border p-2 rounded mb-1 text-sm">
                <span class="truncate pr-2">${item.quantidade}x ${item.nome}</span>
                <div class="whitespace-nowrap"><span class="font-bold mr-1">${formatCurrency(sub)}</span>${btnDelete}</div>
            </li>`;
        });

        ulServicos.innerHTML = '';
        servicosParaSalvar.forEach((serv, idx) => {
            const qtd = serv.quantidade || 1;
            const sub = serv.valor * qtd;
            total += sub;
            const btnDelete = isLocked ? '' : `<button onclick="removerServicoLista(${idx})" class="text-red-500 font-bold px-2 hover:bg-red-50 rounded ml-2">&times;</button>`;
            ulServicos.innerHTML += `<li class="flex justify-between items-center bg-white border p-2 rounded mb-1 text-sm">
                <span class="truncate pr-2">${qtd > 1 ? qtd + 'x ' : ''}${serv.nome}</span>
                <div class="whitespace-nowrap"><span class="font-bold mr-1">${formatCurrency(sub)}</span>${btnDelete}</div>
            </li>`;
        });

        document.getElementById('modal-total-display').textContent = formatCurrency(total);
    };

    window.salvarAlteracoes = async () => {
        const payload = {
            problema_relatado: document.getElementById('modal-problema').value,
            diagnostico_tecnico: document.getElementById('modal-diagnostico').value,
            status: document.getElementById('modal-status').value,
            itens: itensParaSalvar,
            servicos: servicosParaSalvar
        };
        try {
            const res = await fetch(`${API_URL}/os/${osIdEdicao}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            if (res.ok) { showAlert("OS Salva!"); fecharModal(); carregarOS(); }
            else { const err = await res.json(); alert("Erro: " + err.message); }
        } catch (err) { console.error(err); alert("Erro de conexão."); }
    };

    window.gerarVenda = async (id) => {
        if(!confirm("Deseja enviar esta OS para o Caixa e finalizar lá?")) return;

        try {
            await window.salvarAlteracoes();
            
            window.location.href = `gestao_vendas.html?carregar_os=${id}`;
            
        } catch(err) {
            console.error(err);
            alert("Erro ao salvar OS antes de redirecionar.");
        }
    };

    window.fecharModal = () => modalOS.classList.add('hidden', 'modal-oculto');

    // --- NOVA IMPRESSÃO (MODELO ORDEM_DE_SERVICO_2) ---
    window.imprimirOS = async (id) => {
        try {
            const res = await fetch(`${API_URL}/os/${id}`);
            const os = await res.json();
            
            // Dados para o PDF
            const empresaNome = "OFICINA MECÂNICA"; 
            const empresaEnd = "Rua da Oficina, 123 - Centro";
            
            let itensHtml = '';
            
            const lista = [...(os.itens || []), ...(os.servicos || [])];
            if (lista.length === 0) itensHtml = '<tr><td colspan="4" style="text-align:center; padding:10px;">Nenhum item.</td></tr>';
            else {
                lista.forEach(i => {
                    const tipo = i.produto_id ? "(Peça)" : "(Serviço)";
                    const val = i.valor_unitario || i.valor || 0;
                    const qtd = i.quantidade || 1;
                    const total = val * qtd;
                    itensHtml += `
                    <tr>
                        <td style="border-bottom:1px solid #ddd; padding:6px;">${i.nome || i.descricao} ${tipo}</td>
                        <td style="border-bottom:1px solid #ddd; padding:6px; text-align:center;">${qtd}</td>
                        <td style="border-bottom:1px solid #ddd; padding:6px; text-align:right;">${formatCurrency(val)}</td>
                        <td style="border-bottom:1px solid #ddd; padding:6px; text-align:right;">${formatCurrency(total)}</td>
                    </tr>`;
                });
            }

            const nomeArquivo = `OS_${os.id}_${(os.cliente_nome||'CLIENTE').replace(/[^a-zA-Z0-9]/g,'_')}.pdf`;

            const htmlContent = `
            <html>
            <head>
                <meta charset="UTF-8">
                <title>OS #${os.id}</title>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 30px; font-size: 14px; color: #333; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                    .header h1 { margin: 0; font-size: 22px; color: #000; }
                    .header p { margin: 2px 0; font-size: 12px; color: #555; }
                    .os-title { text-align: right; }
                    .os-title h2 { margin: 0; font-size: 24px; color: #000; }
                    
                    .section-box { border: 1px solid #ccc; padding: 10px; margin-bottom: 15px; border-radius: 4px; background: #f9f9f9; }
                    .section-title { font-weight: bold; margin-bottom: 5px; font-size: 13px; text-transform: uppercase; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
                    
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { text-align: left; border-bottom: 2px solid #000; padding: 8px; background: #eee; font-size: 12px; }
                    td { font-size: 13px; }
                    
                    .total-box { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
                    .assinatura { margin-top: 60px; border-top: 1px solid #000; width: 60%; margin-left: auto; margin-right: auto; text-align: center; padding-top: 5px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>${empresaNome}</h1>
                        <p>${empresaEnd}</p>
                        <p>Data: ${formatDate(os.data_entrada)}</p>
                    </div>
                    <div class="os-title">
                        <h2>ORDEM DE SERVIÇO</h2>
                        <p style="font-size: 18px; font-weight: bold;">#${os.id}</p>
                    </div>
                </div>

                <div class="section-box">
                    <div class="section-title">Dados do Cliente e Veículo</div>
                    <p><strong>Cliente:</strong> ${os.cliente_nome || 'Consumidor'} | <strong>Telefone:</strong> ${os.cliente_telefone || '-'}</p>
                    <p><strong>Veículo:</strong> ${os.placa || '-'} | ${os.modelo || ''} ${os.marca || ''}</p>
                </div>

                <div class="section-box">
                    <div class="section-title">Problema Relatado / Diagnóstico</div>
                    <p><strong>Problema:</strong> ${os.problema_relatado || 'Não informado.'}</p>
                    <p style="margin-top:5px;"><strong>Diagnóstico:</strong> ${os.diagnostico_tecnico || 'Não informado.'}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th width="50%">Descrição</th>
                            <th width="10%" style="text-align:center">Qtd.</th>
                            <th width="20%" style="text-align:right">Vlr. Unit.</th>
                            <th width="20%" style="text-align:right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itensHtml}
                    </tbody>
                </table>

                <div class="total-box">
                    TOTAL: ${formatCurrency(os.total)}
                </div>

                <div class="assinatura">
                    Assinatura do Cliente<br>
                    (Autorizo a execução dos serviços acima descritos)
                </div>
            </body>
            </html>`;

            if (window.electronAPI) window.electronAPI.send('print-to-pdf', { html: htmlContent, name: nomeArquivo });
            else { const win = window.open('', '', 'width=800,height=600'); win.document.write(htmlContent); win.document.close(); win.print(); }
        } catch(e) { console.error(e); alert("Erro ao gerar PDF: " + e.message); }
    };

    if (btnNovaOS) btnNovaOS.addEventListener('click', async () => {
        const placa = await solicitarPlacaVisual();
        if (!placa) return;
        try {
            const res = await fetch(`${API_URL}/os`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placa: placa }) });
            const data = await res.json();
            if (res.ok) { showAlert(`OS #${data.id} criada!`); await carregarOS(); abrirModalEdicao(data.id); } 
            else { 
                if (data.message && data.message.includes('não foi encontrado')) { if(confirm(`Veículo não encontrado!\nDeseja cadastrar agora?`)) window.location.href = 'gestao_clientes.html'; }
                else alert("Erro: " + data.message); 
            }
        } catch (err) { console.error(err); alert("Erro ao criar OS."); }
    });

    if (inputBusca) inputBusca.addEventListener('input', carregarOS);
    carregarDadosAuxiliares();
    carregarOS();
});