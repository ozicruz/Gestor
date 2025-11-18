// public/js/gestao_contas_receber.js (Versão ATUALIZADA com Ordenação)

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. REFERÊNCIAS AOS ELEMENTOS ---
    const cardTotalReceber = document.getElementById('card-total-receber');
    const cardTotalVencido = document.getElementById('card-total-vencido');
    const cardReceberHoje = document.getElementById('card-receber-hoje');
    const tabelaCorpo = document.getElementById('tabela-pendencias-corpo');
    const modalBaixa = document.getElementById('modalBaixa');
    const formBaixa = document.getElementById('formBaixa');
    const btnFecharModalBaixa = document.getElementById('btnFecharModalBaixa');
    const modalBaixaTitulo = document.getElementById('modalBaixaTitulo');
    const baixaLancamentoId = document.getElementById('baixaLancamentoId');
    const baixaValorOriginal = document.getElementById('baixaValorOriginal');
    const baixaValorRecebido = document.getElementById('baixaValorRecebido');
    const baixaDataPagamento = document.getElementById('baixaDataPagamento');
    const baixaContaCaixa = document.getElementById('baixaContaCaixa');
    const baixaFormaPagamento = document.getElementById('baixaFormaPagamento');

    // --- NOVO: Seletores e Variáveis de Ordenação ---
    const headersTabela = document.querySelectorAll('#tabela-pendencias-header th[data-sort]');
    let todasAsPendencias = []; // Guarda a lista completa
    let sortColumn = 'DataVencimento'; // Coluna padrão (Vencimento)
    let sortDirection = 'asc'; // Direção padrão (mais antigos primeiro)

    // --- 2. FUNÇÕES DE FORMATAÇÃO ---
    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
    }
    function formatarData(dataISO) {
        return new Date(dataISO).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    // --- 3. FUNÇÕES PRINCIPAIS DE ATUALIZAÇÃO ---

    // Função ÚNICA para atualizar TUDO
    async function atualizarPainel() {
        console.log("A atualizar painel de Contas a Receber...");
        await Promise.all([
            atualizarCardsResumo(),
            carregarPendenciasDaAPI() // Carrega os dados da tabela
        ]);
    }

    // Função para os CARDS (sem alteração)
    async function atualizarCardsResumo() {
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/contasareceber/resumo');
            const resumo = await response.json();
            cardTotalReceber.textContent = formatarMoeda(resumo.TotalAReceber);
            cardTotalVencido.textContent = formatarMoeda(resumo.TotalVencido);
            cardReceberHoje.textContent = formatarMoeda(resumo.ReceberHoje);
        } catch (err) {
            console.error("Erro ao buscar resumo de contas a receber:", err);
            cardTotalReceber.textContent = "Erro";
        }
    }

    // --- NOVO: Funções refatoradas para a Tabela (com ordenação) ---

    // 1. Busca os dados da API
    async function carregarPendenciasDaAPI() {
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/contasareceber');
            todasAsPendencias = await response.json();
            aplicarFiltroEOrdem(); // Chama a função para ordenar e desenhar
        } catch (err) {
            console.error("Erro ao buscar pendências:", err);
            tabelaCorpo.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Erro ao carregar pendências.</td></tr>';
        }
    }

    // 2. Função central que ordena e chama o "desenho"
    const aplicarFiltroEOrdem = () => {
        // (Sem filtro por enquanto, mas podemos adicionar um inputBusca aqui no futuro)
        const pendenciasFiltradas = [...todasAsPendencias];

        // Ordena
        pendenciasFiltradas.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            if (sortColumn === 'Valor') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else if (sortColumn === 'DataVencimento') {
                valA = new Date(valA);
                valB = new Date(valB);
            } else {
                valA = (valA || '').toLowerCase();
                valB = (valB || '').toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // 3. Desenha
        desenharTabela(pendenciasFiltradas);
    };

    // 4. Função que desenha a tabela
    const desenharTabela = (pendenciasParaRenderizar) => {
        tabelaCorpo.innerHTML = ''; // Limpa a tabela
        if (pendenciasParaRenderizar.length === 0) {
            tabelaCorpo.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhuma pendência encontrada.</td></tr>';
            return;
        }

        const hoje = new Date(new Date().toISOString().split('T')[0]);

        pendenciasParaRenderizar.forEach(p => {
            const dataVenc = new Date(p.DataVencimento);
            let statusClasse = 'text-gray-700'; // A vencer
            if (dataVenc < hoje) {
                statusClasse = 'text-red-600 font-bold'; // Vencido
            }

            const linha = `
                <tr class="border-t hover:bg-gray-50">
                    <td class="p-3">${p.ClienteNome || 'Consumidor Final'}</td>
                    <td class="p-3">${p.Descricao}</td>
                    <td class="p-3 ${statusClasse}">${formatarData(p.DataVencimento)}</td>
                    <td class="p-3 text-right font-semibold">${formatarMoeda(p.Valor)}</td>
                    <td class="p-3 text-center">
                        <button data-acao="dar-baixa" 
                                data-id="${p.id}" 
                                data-valor="${p.Valor}" 
                                data-descricao="${p.Descricao}"
                                class="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg text-sm shadow">
                            Receber
                        </button>
                    </td>
                </tr>
            `;
            tabelaCorpo.innerHTML += linha;
        });
    };

    // --- 4. LÓGICA DO MODAL "DAR BAIXA" (sem alteração) ---
    // (O seu código original de carregarContasBaixa, carregarFormasPagamentoBaixa, abrirModalBaixa, etc., fica aqui)
    // (Vou colar por si, para garantir)

    async function carregarContasBaixa() {
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/contascaixa');
            const contas = await response.json();
            baixaContaCaixa.innerHTML = '<option value="">Selecione a conta...</option>';
            contas.forEach(conta => {
                const option = document.createElement('option');
                option.value = conta.id;
                option.textContent = conta.Nome;
                baixaContaCaixa.appendChild(option);
            });
        } catch (err) {
            console.error('Erro ao carregar contas:', err);
            baixaContaCaixa.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    async function carregarFormasPagamentoBaixa() {
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/formaspagamento');
            const formas = await response.json();
            baixaFormaPagamento.innerHTML = '<option value="">Selecione a forma...</option>';
            formas.forEach(forma => {
                if (forma.TipoLancamento === 'A_VISTA') {
                    const option = document.createElement('option');
                    option.value = forma.id;
                    option.textContent = forma.Nome;
                    baixaFormaPagamento.appendChild(option);
                }
            });
        } catch (err) {
            console.error('Erro ao carregar formas de pagamento:', err);
            baixaFormaPagamento.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    function abrirModalBaixa(id, descricao, valor) {
        modalBaixaTitulo.textContent = `Receber Pagamento (${descricao})`;
        baixaLancamentoId.value = id;
        baixaValorOriginal.textContent = formatarMoeda(valor);
        baixaValorRecebido.value = valor;
        baixaDataPagamento.value = new Date().toISOString().split('T')[0];

        carregarContasBaixa();
        carregarFormasPagamentoBaixa();
        modalBaixa.classList.remove('modal-oculto');
    }

    btnFecharModalBaixa.addEventListener('click', () => {
        modalBaixa.classList.add('modal-oculto');
    });

    tabelaCorpo.addEventListener('click', (e) => {
        const botao = e.target.closest('[data-acao="dar-baixa"]');
        if (botao) {
            const id = botao.dataset.id;
            const valor = parseFloat(botao.dataset.valor);
            const descricao = botao.dataset.descricao;
            abrirModalBaixa(id, descricao, valor);
        }
    });

    formBaixa.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = baixaLancamentoId.value;
        const dadosBaixa = {
            ValorRecebido: parseFloat(baixaValorRecebido.value),
            DataPagamento: baixaDataPagamento.value,
            ContaCaixaID: parseInt(baixaContaCaixa.value),
            FormaPagamentoID: parseInt(baixaFormaPagamento.value)
        };

        if (!dadosBaixa.ValorRecebido || dadosBaixa.ValorRecebido <= 0) {
            alert("O valor recebido deve ser maior que zero."); return;
        }
        if (!dadosBaixa.DataPagamento) {
            alert("A data de pagamento é obrigatória."); return;
        }
        if (!dadosBaixa.FormaPagamentoID) {
            alert("A forma de pagamento é obrigatória."); return;
        }
        if (!dadosBaixa.ContaCaixaID) {
            alert("A conta/caixa de destino é obrigatória."); return;
        }

        try {
            const response = await fetch(`http://localhost:3002/api/financeiro/lancamento/${id}/baixar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosBaixa)
            });

            const resultado = await response.json();
            if (!response.ok) { throw new Error(resultado.message); }

            alert('Pagamento registrado com sucesso!');
            modalBaixa.classList.add('modal-oculto');

            // ATUALIZADO: Recarrega tudo (Cards e Tabela)
            await atualizarPainel();

        } catch (err) {
            console.error('Erro ao dar baixa em pagamento:', err);
            alert(`Erro ao salvar: ${err.message}`);
        }
    });

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

            // Re-renderiza a tabela com a nova ordem
            aplicarFiltroEOrdem();
        });
    });

    // --- 5. CARREGAMENTO INICIAL ---
    atualizarPainel();
});