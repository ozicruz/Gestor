document.addEventListener('DOMContentLoaded', () => {

    // --- 1. REFERÊNCIAS AOS ELEMENTOS ---
    const cardTotalReceber = document.getElementById('card-total-receber');
    const cardTotalVencido = document.getElementById('card-total-vencido');
    const cardReceberHoje = document.getElementById('card-receber-hoje');
    const tabelaCorpo = document.getElementById('tabela-pendencias-corpo');
    
    // Modal
    const modalBaixa = document.getElementById('modalBaixa');
    const formBaixa = document.getElementById('formBaixa');
    const btnFecharModalBaixa = document.getElementById('btnFecharModalBaixa');
    const btnFecharX = document.getElementById('btnFecharX');
    
    // Campos do Form
    const modalBaixaTitulo = document.getElementById('modalBaixaTitulo');
    const baixaLancamentoId = document.getElementById('baixaLancamentoId');
    const baixaValorOriginal = document.getElementById('baixaValorOriginal');
    const baixaValorRecebido = document.getElementById('baixaValorRecebido');
    const baixaDataPagamento = document.getElementById('baixaDataPagamento');
    const baixaContaCaixa = document.getElementById('baixaContaCaixa');
    const baixaFormaPagamento = document.getElementById('baixaFormaPagamento');

    // Ordenação
    const headersTabela = document.querySelectorAll('#tabela-pendencias th[data-sort]');
    let todasAsPendencias = []; 
    let sortColumn = 'DataVencimento'; 
    let sortDirection = 'asc'; 

    // --- 2. FUNÇÕES AUXILIARES ---
    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
    }
    
    function formatarData(dataISO) {
        if(!dataISO) return '-';
        const [ano, mes, dia] = dataISO.split('T')[0].split('-');
        return `${dia}/${mes}/${ano}`;
    }

    // --- 3. ATUALIZAÇÃO DE DADOS ---
    async function atualizarPainel() {
        await Promise.all([
            atualizarCardsResumo(),
            carregarPendenciasDaAPI()
        ]);
    }

    async function atualizarCardsResumo() {
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/contasareceber/resumo');
            const resumo = await response.json();
            cardTotalReceber.textContent = formatarMoeda(resumo.TotalAReceber);
            cardTotalVencido.textContent = formatarMoeda(resumo.TotalVencido);
            cardReceberHoje.textContent = formatarMoeda(resumo.ReceberHoje);
        } catch (err) {
            console.error("Erro resumo:", err);
        }
    }

    async function carregarPendenciasDaAPI() {
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/contasareceber');
            todasAsPendencias = await response.json();
            aplicarFiltroEOrdem();
        } catch (err) {
            console.error("Erro lista:", err);
            tabelaCorpo.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Erro ao carregar dados.</td></tr>';
        }
    }

    const aplicarFiltroEOrdem = () => {
        const pendenciasFiltradas = [...todasAsPendencias];

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

        desenharTabela(pendenciasFiltradas);
    };

    const desenharTabela = (pendencias) => {
        tabelaCorpo.innerHTML = ''; 
        if (pendencias.length === 0) {
            tabelaCorpo.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhum recebimento pendente. 👏👏</td></tr>';
            return;
        }

        const hoje = new Date().toISOString().split('T')[0];

        pendencias.forEach(p => {
            const isVencido = p.DataVencimento < hoje;
            const statusClasse = isVencido ? 'text-red-600 font-bold' : 'text-gray-700';
            const statusTexto = isVencido ? ' (Vencido)' : '';

            // Escapa aspas para evitar erro no onclick
            const descSafe = p.Descricao.replace(/'/g, "\\'");
            const clienteSafe = p.ClienteNome ? p.ClienteNome.replace(/'/g, "\\'") : 'Consumidor Final';

            const linha = `
                <tr class="border-b hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 font-medium text-gray-800">${p.ClienteNome || 'Consumidor Final'}</td>
                    <td class="px-6 py-4 text-gray-600">${p.Descricao}</td>
                    <td class="px-6 py-4 ${statusClasse}">${formatarData(p.DataVencimento)}${statusTexto}</td>
                    <td class="px-6 py-4 text-right font-bold text-gray-800">${formatarMoeda(p.Valor)}</td>
                    <td class="px-6 py-4 text-center">
                        <button onclick="window.abrirModalBaixa(${p.id}, '${descSafe}', '${clienteSafe}', ${p.Valor})" 
                                class="bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 font-bold py-1 px-3 rounded text-sm shadow transition-colors">
                            Receber
                        </button>
                    </td>
                </tr>
            `;
            tabelaCorpo.innerHTML += linha;
        });
    };

    // --- 4. LÓGICA DO MODAL ---
    
    // Torna global para o onclick do HTML funcionar
    window.abrirModalBaixa = async (id, descricao, cliente, valor) => {
        modalBaixaTitulo.textContent = `Receber de: ${cliente}`;
        baixaLancamentoId.value = id;
        baixaValorOriginal.textContent = formatarMoeda(valor);
        baixaValorRecebido.value = valor;
        baixaDataPagamento.value = new Date().toISOString().split('T')[0];

        // Carrega combos apenas se necessário
        if (baixaContaCaixa.options.length <= 1) await carregarCombos();

        modalBaixa.classList.remove('hidden');
    };

    const fecharModal = () => modalBaixa.classList.add('hidden');
    
    if(btnFecharModalBaixa) btnFecharModalBaixa.addEventListener('click', fecharModal);
    if(btnFecharX) btnFecharX.addEventListener('click', fecharModal);

    async function carregarCombos() {
        try {
            const [resContas, resFormas] = await Promise.all([
                fetch('http://localhost:3002/api/financeiro/contascaixa'),
                fetch('http://localhost:3002/api/financeiro/formaspagamento')
            ]);
            
            const contas = await resContas.json();
            const formas = await resFormas.json();

            baixaContaCaixa.innerHTML = '<option value="">Selecione...</option>';
            contas.forEach(c => baixaContaCaixa.innerHTML += `<option value="${c.id}">${c.Nome}</option>`);

            baixaFormaPagamento.innerHTML = '<option value="">Selecione...</option>';
            formas.forEach(f => {
                if (f.TipoLancamento === 'A_VISTA') {
                    baixaFormaPagamento.innerHTML += `<option value="${f.id}">${f.Nome}</option>`;
                }
            });
        } catch (err) { console.error('Erro combos:', err); }
    }


    formBaixa.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = baixaLancamentoId.value;
        const dadosBaixa = {
            ValorRecebido: parseFloat(baixaValorRecebido.value),
            DataPagamento: baixaDataPagamento.value,
            ContaCaixaID: parseInt(baixaContaCaixa.value),
            FormaPagamentoID: parseInt(baixaFormaPagamento.value)
        };

        if (dadosBaixa.ValorRecebido <= 0) {
            alert("O valor recebido deve ser maior que zero."); return;
        }
        if (!dadosBaixa.ContaCaixaID || !dadosBaixa.FormaPagamentoID) {
            alert("Selecione Conta e Forma de Pagamento."); return;
        }

        const btnSubmit = formBaixa.querySelector('button[type="submit"]');
        const textoOriginal = btnSubmit.innerHTML;
        btnSubmit.innerHTML = "Processando...";
        btnSubmit.disabled = true;

        try {
            const response = await fetch(`http://localhost:3002/api/financeiro/lancamento/${id}/baixar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosBaixa)
            });

            if (!response.ok) { 
                const erro = await response.json();
                throw new Error(erro.message); 
            }

            alert('Recebimento registrado com sucesso! 💰');
            fecharModal();
            await atualizarPainel();

        } catch (err) {
            alert(`Erro: ${err.message}`);
        } finally {
            btnSubmit.innerHTML = textoOriginal;
            btnSubmit.disabled = false;
        }
    });

    // Ordenação (Listeners)
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
            aplicarFiltroEOrdem();
        });
    });

    // Inicialização
    atualizarPainel();
});