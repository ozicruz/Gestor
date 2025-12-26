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

    // Modal Produto (Criar/Editar)
    const modalProduto = document.getElementById('modal-produto');
    const formProduto = document.getElementById('form-produto');
    const btnNovo = document.getElementById('btnNovoProduto');
    const btnCancelar = document.getElementById('btn-cancelar');

    // Modal Entrada (Novo)
    const modalEntrada = document.getElementById('modal-entrada');
    const formEntrada = document.getElementById('form-entrada-estoque');

    // Inputs do Form Produto
    const inputNome = document.getElementById('produto-nome');
    const inputDescricao = document.getElementById('produto-descricao');
    const inputEstoque = document.getElementById('produto-estoque');
    const inputMinimo = document.getElementById('produto-stock-minimo');
    const inputCusto = document.getElementById('produto-custo');
    const inputPreco = document.getElementById('produto-preco');

    // --- FUNÇÕES AUXILIARES ---
    const safeNumber = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(val.toString().replace(',', '.')) || 0;
    };

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeNumber(val));

    const formatarParaInput = (valor) => (parseFloat(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const showAlert = (message, isSuccess = true) => {
        feedbackAlert.textContent = message;
        feedbackAlert.className = `p-4 mb-4 rounded-lg font-bold text-center shadow-sm ${isSuccess ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`;
        feedbackAlert.classList.remove('hidden');
        setTimeout(() => feedbackAlert.classList.add('hidden'), 4000);
    };

    // --- 1. CARREGAR PRODUTOS ---
    const carregarProdutos = async () => {
        try {
            const response = await fetch(`${API_URL}/produtos`);
            listaProdutosCache = await response.json();
            renderizarTabela(); 
        } catch (error) {
            console.error(error);
            tabelaCorpo.innerHTML = '<tr><td colspan="5" class="text-center text-red-500 p-4">Erro ao carregar produtos.</td></tr>';
        }
    };

    // --- 2. RENDERIZAR TABELA ---
    const renderizarTabela = () => {
        tabelaCorpo.innerHTML = '';
        const termo = inputBusca.value.toLowerCase();

        let filtrados = listaProdutosCache.filter(p => 
            p.nome.toLowerCase().includes(termo) || 
            (p.descricao && p.descricao.toLowerCase().includes(termo))
        );

        filtrados.sort((a, b) => {
            let valA = a[ordemAtual.coluna];
            let valB = b[ordemAtual.coluna];
            if (typeof valA === 'number') return ordemAtual.direcao === 'asc' ? valA - valB : valB - valA;
            valA = (valA || '').toString().toLowerCase(); valB = (valB || '').toString().toLowerCase();
            if (valA < valB) return ordemAtual.direcao === 'asc' ? -1 : 1;
            if (valA > valB) return ordemAtual.direcao === 'asc' ? 1 : -1;
            return 0;
        });

        if (filtrados.length === 0) {
            tabelaCorpo.innerHTML = '<tr><td colspan="5" class="text-center p-6 text-gray-500 italic">Nenhum produto encontrado.</td></tr>';
            return;
        }

        filtrados.forEach(p => {
            const estoqueBaixo = p.quantidade_em_estoque <= p.stock_minimo;
            const classeEstoque = estoqueBaixo ? 'text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-100' : 'text-gray-700';
            const iconeAlerta = estoqueBaixo ? '⚠️' : '';

            tabelaCorpo.innerHTML += `
                <tr class="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                    <td class="px-6 py-4 text-gray-500 font-mono text-xs">#${p.id}</td>
                    <td class="px-6 py-4">
                        <p class="font-bold text-gray-800">${p.nome}</p>
                        <p class="text-xs text-gray-500 truncate max-w-xs">${p.descricao || '-'}</p>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <span class="${classeEstoque}">${iconeAlerta} ${p.quantidade_em_estoque}</span>
                    </td>
                    <td class="px-6 py-4 text-right font-medium text-gray-800">${formatCurrency(p.preco_unitario)}</td>
                    <td class="px-6 py-4 text-center">
                        <div class="flex justify-end gap-2">
                            <button onclick="abrirModalEntrada(${p.id})" class="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 p-2 rounded transition-colors" title="Dar Entrada (Comprar)">
                                📥
                            </button>
                            <button onclick="editarProduto(${p.id})" class="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded transition-colors" title="Editar">
                                ✏️
                            </button>
                            <button onclick="excluirProduto(${p.id})" class="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors" title="Excluir">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    };

    // --- 3. LÓGICA DE ORDENAÇÃO ---
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const coluna = th.dataset.sort;
            if (ordemAtual.coluna === coluna) ordemAtual.direcao = ordemAtual.direcao === 'asc' ? 'desc' : 'asc';
            else { ordemAtual.coluna = coluna; ordemAtual.direcao = 'asc'; }
            renderizarTabela();
        });
    });

    // --- 4. SALVAR PRODUTO (CRIAR / EDITAR) ---
    formProduto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSalvar = formProduto.querySelector('button[type="submit"]');
        const txtOriginal = btnSalvar.innerText;
        btnSalvar.innerText = "Salvando..."; btnSalvar.disabled = true;

        const dados = {
            nome: inputNome.value.trim().toUpperCase(),
            descricao: inputDescricao.value.trim(),
            quantidade_em_estoque: parseInt(inputEstoque.value),
            stock_minimo: parseInt(inputMinimo.value) || 0,
            valor_custo: safeNumber(inputCusto.value),
            preco_unitario: safeNumber(inputPreco.value)
        };

        try {
            let url = `${API_URL}/produtos`;
            let method = 'POST';
            if (produtoIdEdicao) { url += `/${produtoIdEdicao}`; method = 'PUT'; }

            const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
            if (!response.ok) throw new Error("Erro ao salvar produto.");

            showAlert("Produto salvo!", true);
            modalProduto.classList.add('hidden');
            formProduto.reset();
            carregarProdutos();
        } catch (error) { console.error(error); showAlert(error.message, false); } 
        finally { btnSalvar.innerText = txtOriginal; btnSalvar.disabled = false; }
    });

    // --- 5. ENTRADA DE ESTOQUE (NOVO) ---
    window.abrirModalEntrada = (id) => {
        const p = listaProdutosCache.find(prod => prod.id === id);
        if (!p) return;

        document.getElementById('entrada-produto-id').value = p.id;
        document.getElementById('entrada-produto-nome').textContent = p.nome;
        document.getElementById('entrada-qtd').value = 1;
        document.getElementById('entrada-custo').value = formatarParaInput(p.valor_custo); // Sugere o custo atual
        document.getElementById('entrada-obs').value = '';

        modalEntrada.classList.remove('hidden');
        setTimeout(() => document.getElementById('entrada-qtd').focus(), 100);
    };

    formEntrada.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formEntrada.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerHTML = 'Processando...';

        const id = document.getElementById('entrada-produto-id').value;
        const qtdEntrada = parseInt(document.getElementById('entrada-qtd').value);
        const novoCusto = safeNumber(document.getElementById('entrada-custo').value);
        
        // Recupera o produto atual para somar o estoque
        const produtoAtual = listaProdutosCache.find(p => p.id == id);
        if(!produtoAtual) return;

        const novoEstoque = produtoAtual.quantidade_em_estoque + qtdEntrada;

        // Payload: Atualiza estoque e custo
        const dadosAtualizacao = {
            ...produtoAtual,
            quantidade_em_estoque: novoEstoque,
            valor_custo: novoCusto,
            observacao: document.getElementById('entrada-obs').value
        };

        try {
            // 1. Atualiza o Produto
            const resProd = await fetch(`${API_URL}/produtos/${id}`, { 
                method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dadosAtualizacao) 
            });
            if(!resProd.ok) throw new Error("Erro ao atualizar estoque.");

            // 2. (Opcional - Futuro) Aqui poderíamos lançar no financeiro automaticamente (POST /financeiro/lancamentos)
            // Por enquanto, apenas atualiza o cadastro do produto.

            showAlert(`Entrada de +${qtdEntrada} itens realizada!`, true);
            modalEntrada.classList.add('hidden');
            carregarProdutos(); // Atualiza a tela
        } catch(err) {
            console.error(err);
            showAlert("Erro na entrada: " + err.message, false);
        } finally {
            btn.disabled = false; btn.innerHTML = '<span>✅</span> Confirmar';
        }
    });

    // --- AÇÕES GLOBAIS ---
    window.editarProduto = async (id) => {
        const p = listaProdutosCache.find(prod => prod.id === id);
        if (p) {
            produtoIdEdicao = p.id;
            inputNome.value = p.nome;
            inputDescricao.value = p.descricao || '';
            inputEstoque.value = p.quantidade_em_estoque;
            inputMinimo.value = p.stock_minimo;
            inputCusto.value = formatarParaInput(p.valor_custo);
            inputPreco.value = formatarParaInput(p.preco_unitario);
            document.querySelector('#modal-produto h2').textContent = "Editar Produto";
            modalProduto.classList.remove('hidden');
        }
    };

    window.excluirProduto = async (id) => {
        if (confirm("Tem a certeza que deseja excluir este produto?")) {
            try {
                const res = await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
                if (res.ok) { carregarProdutos(); showAlert("Produto removido.", true); } 
                else { const err = await res.json(); alert(`Erro: ${err.message}`); }
            } catch (err) { console.error(err); alert("Erro de conexão."); }
        }
    };

    btnNovo.addEventListener('click', () => {
        produtoIdEdicao = null; formProduto.reset();
        document.querySelector('#modal-produto h2').textContent = "Novo Produto";
        modalProduto.classList.remove('hidden');
        setTimeout(() => inputNome.focus(), 100);
    });

    btnCancelar.addEventListener('click', () => modalProduto.classList.add('hidden'));
    inputBusca.addEventListener('input', renderizarTabela);
    carregarProdutos();
});