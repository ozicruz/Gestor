// public/js/gestao_financeiro.js (Versão ATUALIZADA com Ordenação)

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. REFERÊNCIAS AOS ELEMENTOS ---
    const btnAbrir = document.getElementById('btnAbrirModalDespesa');
    const btnFechar = document.getElementById('btnFecharModal');
    const modal = document.getElementById('modalDespesa');
    const formDespesa = document.getElementById('formDespesa');
    const selectCategorias = document.getElementById('despesaCategoria');
    const selectContas = document.getElementById('despesaConta');
    const cardSaldo = document.getElementById('card-saldo');
    const cardEntradas = document.getElementById('card-entradas');
    const cardSaidas = document.getElementById('card-saidas');
    const cardVencido = document.getElementById('card-vencido');
    const tabelaCorpo = document.getElementById('tabela-movimentos-corpo');

    // --- NOVO: Seletores e Variáveis de Ordenação ---
    const headersTabela = document.querySelectorAll('#tabela-movimentos-header th[data-sort]');
    let todosOsMovimentos = []; // Guarda a lista completa
    let sortColumn = 'DataPagamento'; // Coluna padrão
    let sortDirection = 'desc'; // Direção padrão (mais recentes primeiro)

    // --- 2. FUNÇÕES DE FORMATAÇÃO ---
    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
    }

    function formatarData(dataISO) {
        return new Date(dataISO).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    // --- 3. FUNÇÕES DE ATUALIZAÇÃO DO DASHBOARD ---

    // Função ÚNICA para atualizar TUDO
    async function atualizarDashboard() {
        console.log("A atualizar dashboard...");
        // Carrega os dois em paralelo
        await Promise.all([
            atualizarCardsResumo(),
            carregarMovimentosDaAPI() // Carrega os dados da tabela
        ]);
    }

    // Função para os CARDS (sem alteração)
    async function atualizarCardsResumo() {
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/dashboard/resumo');
            const resumo = await response.json();
            cardSaldo.textContent = formatarMoeda(resumo.SaldoAtualTotal);
            cardEntradas.textContent = formatarMoeda(resumo.EntradasMes);
            cardSaidas.textContent = formatarMoeda(resumo.SaidasMes);
            cardVencido.textContent = formatarMoeda(resumo.ContasReceberVencido);
            cardSaldo.classList.toggle('text-red-900', resumo.SaldoAtualTotal < 0);
            cardSaldo.classList.toggle('text-blue-900', resumo.SaldoAtualTotal >= 0);
        } catch (err) {
            console.error("Erro ao buscar resumo:", err);
            if (cardSaldo) cardSaldo.textContent = "Erro";
        }
    }

    // --- NOVO: Funções refatoradas para a Tabela (com ordenação) ---

    // 1. Busca os dados da API
    async function carregarMovimentosDaAPI() {
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/movimentocaixa');
            todosOsMovimentos = await response.json();
            aplicarFiltroEOrdem(); // Chama a função para ordenar e desenhar
        } catch (err) {
            console.error("Erro ao buscar movimentos:", err);
            tabelaCorpo.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-red-500">Erro ao carregar movimentos.</td></tr>';
        }
    }

    // 2. Função central que ordena e chama o "desenho"
    const aplicarFiltroEOrdem = () => {
        // (Sem filtro por enquanto, mas podemos adicionar um inputBusca aqui no futuro)
        const movimentosFiltrados = [...todosOsMovimentos];

        // Ordena
        movimentosFiltrados.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            // Trata números (Valor)
            if (sortColumn === 'Valor') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            }
            // Trata datas
            else if (sortColumn === 'DataPagamento') {
                valA = new Date(valA);
                valB = new Date(valB);
            }
            // Trata strings (Descricao, CategoriaNome)
            else {
                valA = (valA || '').toLowerCase();
                valB = (valB || '').toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // 3. Desenha
        desenharTabela(movimentosFiltrados);
    };

    // 4. Função que desenha a tabela
    const desenharTabela = (movimentosParaRenderizar) => {
        tabelaCorpo.innerHTML = ''; // Limpa a tabela
        if (movimentosParaRenderizar.length === 0) {
            tabelaCorpo.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhum movimento encontrado.</td></tr>';
            return;
        }

        movimentosParaRenderizar.forEach(mov => {
            const valorClasse = mov.Tipo === 'DESPESA' ? 'valor-despesa' : 'valor-receita';
            const valorFormatado = formatarMoeda(mov.Valor);
            const dataFormatada = formatarData(mov.DataPagamento);

            const linha = `
                <tr>
                    <td class="p-3">${dataFormatada}</td>
                    <td class="p-3">${mov.Descricao}</td>
                    <td class="p-3">${mov.CategoriaNome || 'Sem Categoria'}</td>
                    <td class="p-3 text-right ${valorClasse}">${valorFormatado}</td>
                </tr>
            `;
            tabelaCorpo.innerHTML += linha;
        });
    };

    // --- 4. LÓGICA DO MODAL (sem alteração) ---
    // (O seu código de btnAbrir, btnFechar, carregarCategorias, carregarContas, e formDespesa.submit)
    // (Copie e cole o seu código original destas funções aqui)

    // (Vou colar por si, para garantir)
    if (btnAbrir && btnFechar && modal) {
        btnAbrir.addEventListener('click', () => {
            modal.classList.remove('modal-oculto');
            carregarCategorias();
            carregarContas();
            const dataInput = document.getElementById('despesaData');
            if (dataInput) dataInput.value = new Date().toISOString().split('T')[0];
        });
        btnFechar.addEventListener('click', () => {
            modal.classList.add('modal-oculto');
        });
    }

    async function carregarCategorias() {
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/categorias?tipo=DESPESA');
            const categorias = await response.json();
            selectCategorias.innerHTML = '<option value="">Selecione...</option>';
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.Nome;
                selectCategorias.appendChild(option);
            });
        } catch (err) {
            console.error('Erro ao carregar categorias:', err);
            selectCategorias.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    async function carregarContas() {
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/contascaixa');
            const contas = await response.json();
            selectContas.innerHTML = '<option value="">Selecione...</option>';
            contas.forEach(conta => {
                const option = document.createElement('option');
                option.value = conta.id;
                option.textContent = conta.Nome;
                selectContas.appendChild(option);
            });
        } catch (err) {
            console.error('Erro ao carregar contas:', err);
            selectContas.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    if (formDespesa) {
        formDespesa.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dadosDespesa = {
                Descricao: document.getElementById('despesaDescricao').value,
                Valor: parseFloat(document.getElementById('despesaValor').value),
                Tipo: 'DESPESA',
                DataPagamento: document.getElementById('despesaData').value,
                CategoriaID: parseInt(document.getElementById('despesaCategoria').value),
                ContaCaixaID: parseInt(document.getElementById('despesaConta').value)
            };
            try {
                const response = await fetch('http://localhost:3002/api/financeiro/lancamento', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosDespesa)
                });
                if (response.status === 201) {
                    alert('Despesa lançada com sucesso!');
                    formDespesa.reset();
                    modal.classList.add('modal-oculto');
                    await atualizarDashboard(); // ATUALIZADO: Agora recarrega tudo
                } else {
                    const erro = await response.json();
                    alert(`Erro ao salvar: ${erro.message}`);
                }
            } catch (err) {
                console.error('Erro de rede ao salvar despesa:', err);
                alert('Erro de conexão. Verifique o console.');
            }
        });
    }

    // --- NOVO: Listener para ORDENAÇÃO ---
    headersTabela.forEach(header => {
        header.addEventListener('click', () => {
            const newSortColumn = header.dataset.sort;
            if (sortColumn === newSortColumn) {
                sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
            } else {
                sortColumn = newSortColumn;
                sortDirection = 'asc';
            }

            headersTabela.forEach(h => {
                const arrow = h.querySelector('.sort-arrow');
                if (h.dataset.sort === sortColumn) {
                    arrow.innerHTML = sortDirection === 'asc' ? ' ▲' : ' ▼';
                } else {
                    arrow.innerHTML = '';
                }
            });

            // Re-renderiza a tabela com a nova ordem (sem chamar a API de novo)
            aplicarFiltroEOrdem();
        });
    });

    // --- 5. CARREGAMENTO INICIAL ---
    atualizarDashboard();
});