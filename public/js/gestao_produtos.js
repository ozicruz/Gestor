document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';
    let produtoIdEdicao = null;
    let listaProdutosCache = []; 
    let ordemAtual = { coluna: 'nome', direcao: 'asc' };

    // --- ELEMENTOS DO DOM ---
    const tabelaCorpo = document.getElementById('tabela-produtos');
    const inputBusca = document.getElementById('input-busca-produto');
    const feedbackAlert = document.getElementById('feedback-alert');

    // Modais e Forms
    const modalProduto = document.getElementById('modal-produto');
    const formProduto = document.getElementById('form-produto');
    const btnNovo = document.getElementById('btnNovoProduto');
    const btnCancelar = document.getElementById('btn-cancelar');
    
    // Modal de Entrada (Estoque)
    const modalEntrada = document.getElementById('modal-entrada');
    const formEntrada = document.getElementById('form-entrada-estoque');
    
    // Inputs Produto (Cadastro)
    const inputNome = document.getElementById('produto-nome');
    const inputDescricao = document.getElementById('produto-descricao');
    const inputEstoque = document.getElementById('produto-estoque');
    const inputMinimo = document.getElementById('produto-stock-minimo');
    const inputCusto = document.getElementById('produto-custo');
    const inputPreco = document.getElementById('produto-preco');

    // --- FUNÇÕES AUXILIARES ---
    const safeNumber = (val) => parseFloat(String(val).replace(',', '.')) || 0;
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeNumber(val));
    const formatarParaInput = (valor) => (parseFloat(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const showAlert = (message, isSuccess = true) => {
        if (!feedbackAlert) return;
        feedbackAlert.textContent = message;
        feedbackAlert.className = `p-4 mb-6 rounded-lg font-bold text-center shadow-sm ${
            isSuccess ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`;
        feedbackAlert.classList.remove('hidden');
        setTimeout(() => feedbackAlert.classList.add('hidden'), 4000);
    };

    // --- RENDERIZAÇÃO ---
    const renderizarTabela = () => {
        tabelaCorpo.innerHTML = '';
        if (listaProdutosCache.length === 0) {
            tabelaCorpo.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum produto encontrado.</td></tr>';
            return;
        }

        // Ordenação
        listaProdutosCache.sort((a, b) => {
            let valA = a[ordemAtual.coluna];
            let valB = b[ordemAtual.coluna];
            
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return ordemAtual.direcao === 'asc' ? -1 : 1;
            if (valA > valB) return ordemAtual.direcao === 'asc' ? 1 : -1;
            return 0;
        });

        listaProdutosCache.forEach(p => {
            // Verifica status de estoque
            let statusEstoque = '<span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">OK</span>';
            if (p.quantidade_em_estoque <= 0) {
                statusEstoque = '<span class="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">ZERADO</span>';
            } else if (p.quantidade_em_estoque <= (p.stock_minimo || 5)) {
                statusEstoque = '<span class="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded">BAIXO</span>';
            }

            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50 transition-colors';
            tr.innerHTML = `
                <td class="p-4 font-medium text-gray-800">#${p.id}</td>
                <td class="p-4 font-medium text-gray-800">
                    <div class="font-bold">${p.nome}</div>
                    <div class="text-xs text-gray-500 truncate max-w-xs">${p.descricao || ''}</div>
                </td>
                <td class="p-4 text-center">
                    <div class="flex flex-col items-center gap-1">
                        <span class="font-bold">${p.quantidade_em_estoque}</span>
                        ${statusEstoque}
                    </div>
                </td>
                <td class="p-4 text-right font-bold text-blue-600">${formatCurrency(p.preco_unitario)}</td>
                <td class="p-4 text-center">
                    <div class="flex justify-center gap-2">
                        <button onclick="window.abrirModalEntrada(${p.id})" class="bg-green-50 text-green-600 hover:bg-green-100 p-2 rounded" title="Dar Entrada / Comprar">
                            📥
                        </button>
                        <button onclick="window.location.href='historico_produto.html?id=${p.id}'" class="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded" title="Histórico">
                            📋
                        </button>
                        <button onclick="editarProduto(${p.id})" class="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 p-2 rounded" title="Editar">
                            ✏️
                        </button>
                        <button onclick="excluirProduto(${p.id})" class="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded" title="Excluir">
                            🗑️
                        </button>
                    </div>
                </td>
            `;
            tabelaCorpo.appendChild(tr);
        });
    };

    const carregarProdutos = async () => {
        try {
            const res = await fetch(`${API_URL}/produtos`);
            listaProdutosCache = await res.json();
            renderizarTabela();
        } catch (err) {
            console.error(err);
            showAlert("Erro ao carregar produtos.", false);
        }
    };

    // --- BUSCA ---
    inputBusca.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        if (!termo) {
            carregarProdutos();
            return;
        }
        const filtrados = listaProdutosCache.filter(p => 
            p.nome.toLowerCase().includes(termo) || 
            (p.descricao && p.descricao.toLowerCase().includes(termo))
        );
        // Renderiza apenas os filtrados sem alterar o cache principal
        const cacheBackup = [...listaProdutosCache];
        listaProdutosCache = filtrados;
        renderizarTabela();
        listaProdutosCache = cacheBackup; 
    });

    // --- CADASTRAR / EDITAR PRODUTO ---
    formProduto.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const produto = {
            nome: inputNome.value,
            descricao: inputDescricao.value,
            quantidade_em_estoque: parseInt(inputEstoque.value) || 0,
            stock_minimo: parseInt(inputMinimo.value) || 0,
            valor_custo: safeNumber(inputCusto.value),
            preco_unitario: safeNumber(inputPreco.value)
        };

        const method = produtoIdEdicao ? 'PUT' : 'POST';
        const url = produtoIdEdicao ? `${API_URL}/produtos/${produtoIdEdicao}` : `${API_URL}/produtos`;

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produto)
            });

            if (res.ok) {
                showAlert(produtoIdEdicao ? "Produto atualizado!" : "Produto cadastrado!");
                modalProduto.classList.add('hidden');
                formProduto.reset();
                carregarProdutos();
            } else {
                const err = await res.json();
                showAlert(`Erro: ${err.message}`, false);
            }
        } catch (error) {
            console.error(error);
            showAlert("Erro de conexão.", false);
        }
    });

    // --- DAR ENTRADA NO ESTOQUE (CORRIGIDO ID) ---
    if (formEntrada) {
        formEntrada.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Submetendo entrada...");

            // CORREÇÃO: O ID agora bate com o HTML (entrada-produto-id)
            const elId = document.getElementById('entrada-produto-id'); 
            const id = elId ? elId.value : null;

            if (!id) {
                alert("Erro: ID do produto não encontrado.");
                return;
            }

            const qtd = document.getElementById('entrada-qtd').value;
            const custo = document.getElementById('entrada-custo').value;
            const forn = document.getElementById('entrada-fornecedor').value;
            const nf = document.getElementById('entrada-nf').value;
            const obsExtra = document.getElementById('entrada-obs-extra').value;

            // Combina obs extra na nota/fornecedor se necessário, ou manda separado dependendo do backend
            // Aqui mandamos os campos limpos, o backend formata a observação
            
            const btnSalvar = formEntrada.querySelector('button[type="submit"]');
            const txtOriginal = btnSalvar ? btnSalvar.innerText : "Salvar";
            
            if (btnSalvar) {
                btnSalvar.disabled = true;
                btnSalvar.innerText = "Salvando...";
            }

            try {
                const res = await fetch(`${API_URL}/produtos/${id}/entrada`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        quantidade: qtd,
                        custo: custo,
                        fornecedor: forn,
                        nota_fiscal: nf,
                        observacao_extra: obsExtra 
                    })
                });

                if (res.ok) {
                    alert("Estoque atualizado com sucesso!");
                    modalEntrada.classList.add('hidden');
                    formEntrada.reset();
                    carregarProdutos();
                } else {
                    const err = await res.json();
                    alert("Erro: " + err.message);
                }
            } catch (error) {
                console.error(error);
                alert("Erro de conexão ao dar entrada.");
            } finally {
                if (btnSalvar) {
                    btnSalvar.disabled = false;
                    btnSalvar.innerText = txtOriginal;
                }
            }
        });
    }

    // --- FUNÇÕES GLOBAIS (JANELA) ---
    window.abrirModalEntrada = (id) => {
        const p = listaProdutosCache.find(prod => prod.id === id);
        if (!p) {
            console.error("Produto não encontrado no cache:", id);
            return;
        }

        // Preenche os campos do modal usando os IDs corretos do HTML
        const elId = document.getElementById('entrada-produto-id');
        const elNome = document.getElementById('entrada-produto-nome');
        const elCusto = document.getElementById('entrada-custo');
        
        if (elId) elId.value = p.id;
        if (elNome) elNome.textContent = p.nome;
        if (elCusto) elCusto.value = formatarParaInput(p.valor_custo); // Sugere o custo atual

        // Limpa campos opcionais
        if(document.getElementById('entrada-qtd')) document.getElementById('entrada-qtd').value = 1;
        if(document.getElementById('entrada-fornecedor')) document.getElementById('entrada-fornecedor').value = '';
        if(document.getElementById('entrada-nf')) document.getElementById('entrada-nf').value = '';
        if(document.getElementById('entrada-obs-extra')) document.getElementById('entrada-obs-extra').value = '';

        if (modalEntrada) {
            modalEntrada.classList.remove('hidden');
            setTimeout(() => document.getElementById('entrada-qtd')?.focus(), 100);
        }
    };

    window.editarProduto = (id) => {
        const p = listaProdutosCache.find(item => item.id === id);
        if (p) {
            produtoIdEdicao = id;
            inputNome.value = p.nome;
            inputDescricao.value = p.descricao || '';
            inputEstoque.value = p.quantidade_em_estoque;
            inputMinimo.value = p.stock_minimo || 0;
            
            inputCusto.value = formatarParaInput(p.valor_custo);
            inputPreco.value = formatarParaInput(p.preco_unitario);
            
            const tituloModal = document.querySelector('#modal-produto h2');
            if(tituloModal) tituloModal.textContent = "Editar Produto";
            
            modalProduto.classList.remove('hidden');
        }
    };

    window.excluirProduto = async (id) => {
        if (confirm("Tem a certeza que deseja excluir este produto?")) {
            try {
                const res = await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    carregarProdutos();
                    showAlert("Produto removido.", true);
                } else {
                    const err = await res.json();
                    alert(`Erro: ${err.message}`);
                }
            } catch (err) {
                alert("Erro de conexão.");
            }
        }
    };

    // Eventos de Interface
    if(btnNovo) btnNovo.addEventListener('click', () => { 
        produtoIdEdicao = null; 
        formProduto.reset(); 
        const tituloModal = document.querySelector('#modal-produto h2');
        if(tituloModal) tituloModal.textContent = "Novo Produto";
        modalProduto.classList.remove('hidden'); 
        setTimeout(() => inputNome.focus(), 100); 
    });

    if(btnCancelar) btnCancelar.addEventListener('click', () => modalProduto.classList.add('hidden'));
    
    // Ordenação ao clicar no cabeçalho
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const coluna = th.dataset.sort;
            if (ordemAtual.coluna === coluna) {
                ordemAtual.direcao = ordemAtual.direcao === 'asc' ? 'desc' : 'asc';
            } else {
                ordemAtual.coluna = coluna;
                ordemAtual.direcao = 'asc';
            }
            // Atualiza ícones visuais
            document.querySelectorAll('th[data-sort]').forEach(header => {
               header.textContent = header.textContent.replace(' ▲', '').replace(' ▼', '');
            });
            th.textContent += ordemAtual.direcao === 'asc' ? ' ▲' : ' ▼';
            
            renderizarTabela();
        });
    });

    // Inicializa
    carregarProdutos();
});