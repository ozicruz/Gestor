document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'http://localhost:3002/api';
    let servicoIdEdicao = null;
    let listaServicosCache = []; // Cache para busca rápida
    
    // --- NOVO: ESTADO DE ORDENAÇÃO ---
    let ordemAtual = { coluna: 'nome', direcao: 'asc' };

    // ELEMENTOS
    const tabelaCorpo = document.getElementById('tabela-servicos');
    const inputBusca = document.getElementById('input-busca-servico');
    const feedbackAlert = document.getElementById('feedback-alert');
    const modal = document.getElementById('modal-servico');
    const form = document.getElementById('form-servico');
    const btnNovo = document.getElementById('btnNovoServico');
    const btnCancelar = document.getElementById('btn-cancelar');
    
    // Inputs
    const inputNome = document.getElementById('servico-nome');
    const inputDescricao = document.getElementById('servico-descricao');
    const inputPreco = document.getElementById('servico-preco');

    // --- HELPER ---
    const safeNumber = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(val.toString().replace(',', '.')) || 0;
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeNumber(val));
    };

    const formatarParaInput = (valor) => {
        return (parseFloat(valor) || 0).toLocaleString('pt-BR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    };

    const showAlert = (message, isSuccess = true) => {
        if(!feedbackAlert) return alert(message);
        feedbackAlert.textContent = message;
        feedbackAlert.className = `p-4 mb-4 rounded-lg font-bold text-center shadow-sm ${
            isSuccess ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`;
        feedbackAlert.classList.remove('hidden');
        setTimeout(() => feedbackAlert.classList.add('hidden'), 4000);
    };

    // --- 1. CARREGAR (DA API) ---
    const carregarServicos = async () => {
        try {
            const response = await fetch(`${API_URL}/servicos`);
            listaServicosCache = await response.json();
            renderizarTabela();
        } catch (error) {
            console.error(error);
            if(tabelaCorpo) tabelaCorpo.innerHTML = '<tr><td colspan="4" class="text-center text-red-500 p-4">Erro ao carregar dados.</td></tr>';
        }
    };

    // --- 2. RENDERIZAR (LOCAL COM ORDENAÇÃO) ---
    const renderizarTabela = () => {
        if(!tabelaCorpo) return;
        tabelaCorpo.innerHTML = '';

        const termo = inputBusca ? inputBusca.value.toLowerCase() : '';
        let filtrados = listaServicosCache.filter(s => s.nome.toLowerCase().includes(termo));

        // --- LÓGICA DE ORDENAÇÃO ADICIONADA ---
        filtrados.sort((a, b) => {
            let valA = a[ordemAtual.coluna];
            let valB = b[ordemAtual.coluna];

            // Tratamento especial para preço (que pode vir como 'preco' ou 'valor' dependendo da API/Banco)
            if (ordemAtual.coluna === 'preco') {
                valA = a.preco || a.valor || 0;
                valB = b.preco || b.valor || 0;
            }

            if (typeof valA === 'number') {
                return ordemAtual.direcao === 'asc' ? valA - valB : valB - valA;
            }

            valA = (valA || '').toString().toLowerCase();
            valB = (valB || '').toString().toLowerCase();
            
            if (valA < valB) return ordemAtual.direcao === 'asc' ? -1 : 1;
            if (valA > valB) return ordemAtual.direcao === 'asc' ? 1 : -1;
            return 0;
        });
        // ---------------------------------------

        if (filtrados.length === 0) {
            tabelaCorpo.innerHTML = '<tr><td colspan="4" class="text-center p-6 text-gray-500 italic">Nenhum serviço encontrado.</td></tr>';
            return;
        }

        filtrados.forEach(s => {
            tabelaCorpo.innerHTML += `
                <tr class="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                    <td class="px-6 py-4 font-mono text-xs text-gray-500">#${s.id}</td>
                    <td class="px-6 py-4">
                        <p class="font-bold text-gray-800 uppercase">${s.nome}</p>
                        <p class="text-xs text-gray-500 truncate max-w-xs">${s.descricao || '-'}</p>
                    </td>
                    <td class="px-6 py-4 text-right font-medium text-gray-800">${formatCurrency(s.preco || s.valor)}</td>
                    <td class="px-6 py-4 text-center">
                        <div class="flex justify-end gap-2">
                            <button onclick="editarServico(${s.id})" class="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded transition-colors" title="Editar">
                                ✏️
                            </button>
                            <button onclick="excluirServico(${s.id})" class="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors" title="Excluir">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    };

    // --- 3. EVENTOS DE ORDENAÇÃO ---
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

    // --- 4. SALVAR ---
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const txtOriginal = btn.innerText;
            btn.innerText = "Salvando...";
            btn.disabled = true;

            const dados = {
                nome: inputNome.value.trim().toUpperCase(),
                descricao: inputDescricao.value.trim(),
                preco: safeNumber(inputPreco.value)
            };

            try {
                let url = `${API_URL}/servicos`;
                let method = 'POST';
                if (servicoIdEdicao) { url += `/${servicoIdEdicao}`; method = 'PUT'; }

                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });

                const resJson = await response.json();

                if (!response.ok) throw new Error(resJson.message || "Erro ao salvar.");
                
                showAlert("Serviço salvo com sucesso!", true);
                modal.classList.add('hidden');
                form.reset();
                carregarServicos(); 
            } catch (err) {
                showAlert(err.message, false);
            } finally {
                btn.innerText = txtOriginal;
                btn.disabled = false;
            }
        });
    }

    // --- 5. FUNÇÕES GLOBAIS ---
    window.editarServico = async (id) => {
        const s = listaServicosCache.find(item => item.id === id);
        if (s) {
            servicoIdEdicao = s.id;
            inputNome.value = s.nome;
            inputDescricao.value = s.descricao || '';
            inputPreco.value = formatarParaInput(s.preco || s.valor);
            
            document.querySelector('#modal-servico h2').textContent = "Editar Serviço";
            modal.classList.remove('hidden');
            setTimeout(() => inputNome.focus(), 100); 
        }
    };

    window.excluirServico = async (id) => {
        if(confirm("Remover este serviço?")) {
            try {
                const res = await fetch(`${API_URL}/servicos/${id}`, { method: 'DELETE' });
                if(res.ok) {
                    carregarServicos();
                    showAlert("Serviço removido.", true);
                } else {
                    const err = await res.json();
                    alert("Erro: " + err.message);
                }
            } catch (e) { console.error(e); }
        }
    };

    // --- EVENTOS GERAIS ---
    if(btnNovo) btnNovo.addEventListener('click', () => {
        servicoIdEdicao = null;
        form.reset();
        document.querySelector('#modal-servico h2').textContent = "Novo Serviço";
        modal.classList.remove('hidden');
        setTimeout(() => inputNome.focus(), 100); 
    });

    if(btnCancelar) btnCancelar.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    if(inputBusca) inputBusca.addEventListener('input', renderizarTabela);

    carregarServicos();
});