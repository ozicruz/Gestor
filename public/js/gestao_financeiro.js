document.addEventListener('DOMContentLoaded', () => {

    // --- 1. REFERÊNCIAS AOS ELEMENTOS ---
    const btnAbrir = document.getElementById('btnAbrirModalDespesa');
    const btnFechar = document.getElementById('btnFecharModal');
    const btnFecharX = document.getElementById('btnFecharModalX');
    const modal = document.getElementById('modalDespesa');
    const formDespesa = document.getElementById('formDespesa');
    
    const selectCategorias = document.getElementById('despesaCategoria');
    const selectContas = document.getElementById('despesaConta');
    
    // Cards Topo (Mês)
    const cardSaldo = document.getElementById('card-saldo');
    const cardEntradas = document.getElementById('card-entradas');
    const cardSaidas = document.getElementById('card-saidas');
    const cardVencido = document.getElementById('card-vencido');
    
    // Tabela e Filtro (Dia)
    const tabelaCorpo = document.getElementById('tabela-movimentos-corpo');
    const filtroDataMovimento = document.getElementById('filtroDataMovimento');

    // Totais do Rodapé (Dia) - NOVOS
    const lblTotalDiaEntradas = document.getElementById('totalDiaEntradas');
    const lblTotalDiaSaidas = document.getElementById('totalDiaSaidas');
    const lblTotalDiaSaldo = document.getElementById('totalDiaSaldo');

    // Ordenação
    const headersTabela = document.querySelectorAll('#tabela-movimentos-header th[data-sort]');
    let todosOsMovimentos = []; 
    let sortColumn = 'DataPagamento'; 
    let sortDirection = 'desc'; 

    // --- 2. CONFIGURAÇÃO INICIAL DE DATA ---
    const hojeISO = new Date().toISOString().split('T')[0];
    if (filtroDataMovimento) {
        filtroDataMovimento.value = hojeISO; // Define o filtro como HOJE
        
        // Se mudar a data, recarrega a tabela
        filtroDataMovimento.addEventListener('change', () => {
            carregarMovimentosDaAPI();
        });
    }

    // --- 3. FUNÇÕES DE FORMATAÇÃO ---
    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
    }

    function formatarData(dataISO) {
        if(!dataISO) return '-';
        const [ano, mes, dia] = dataISO.split('T')[0].split('-');
        return `${dia}/${mes}/${ano}`;
    }

    // --- 4. FUNÇÕES DO MODAL ---
    const abrirModal = () => {
        modal.classList.remove('hidden');
        carregarCategorias();
        carregarContas();
        const dataInput = document.getElementById('despesaData');
        if (dataInput) dataInput.value = new Date().toISOString().split('T')[0];
    };

    const fecharModal = () => modal.classList.add('hidden');

    if (btnAbrir) btnAbrir.addEventListener('click', abrirModal);
    if (btnFechar) btnFechar.addEventListener('click', fecharModal);
    if (btnFecharX) btnFecharX.addEventListener('click', fecharModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) fecharModal();
        });
    }

    // --- 5. BUSCA DE DADOS (API) ---
    async function atualizarDashboard() {
        await Promise.all([
            atualizarCardsResumo(),
            carregarMovimentosDaAPI()
        ]);
    }

    async function atualizarCardsResumo() {
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/dashboard/resumo');
            const resumo = await response.json();
            
            if(cardSaldo) {
                cardSaldo.textContent = formatarMoeda(resumo.SaldoAtualTotal);
                cardSaldo.classList.remove('text-red-900', 'text-blue-900');
                cardSaldo.classList.add(resumo.SaldoAtualTotal < 0 ? 'text-red-900' : 'text-blue-900');
            }
            if(cardEntradas) cardEntradas.textContent = formatarMoeda(resumo.EntradasMes);
            if(cardSaidas) cardSaidas.textContent = formatarMoeda(resumo.SaidasMes);
            if(cardVencido) cardVencido.textContent = formatarMoeda(resumo.ContasReceberVencido);

        } catch (err) {
            console.error("Erro resumo:", err);
        }
    }

    // Carrega Tabela e Calcula Totais do Dia
    async function carregarMovimentosDaAPI() {
        try {
            const dataSelecionada = filtroDataMovimento.value;
            // Busca dados apenas da data selecionada
            const url = `http://localhost:3002/api/financeiro/movimentocaixa?data_inicio=${dataSelecionada}&data_fim=${dataSelecionada}`;

            const response = await fetch(url);
            todosOsMovimentos = await response.json();
            
            aplicarFiltroEOrdem(); 
            calcularTotaisDoDia(todosOsMovimentos); // <--- Aqui chamamos o cálculo do rodapé

        } catch (err) {
            console.error("Erro movimentos:", err);
            if(tabelaCorpo) tabelaCorpo.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-red-500">Erro ao carregar movimentos.</td></tr>';
        }
    }

    // --- NOVA FUNÇÃO: CALCULA OS TOTAIS DO DIA ---
    function calcularTotaisDoDia(movimentos) {
        let ent = 0;
        let sai = 0;

        movimentos.forEach(m => {
            const valor = parseFloat(m.Valor);
            if(m.Tipo === 'RECEITA') ent += valor;
            else if(m.Tipo === 'DESPESA') sai += valor;
        });

        const saldoDia = ent - sai;

        if(lblTotalDiaEntradas) lblTotalDiaEntradas.textContent = formatarMoeda(ent);
        if(lblTotalDiaSaidas) lblTotalDiaSaidas.textContent = formatarMoeda(sai);
        
        if(lblTotalDiaSaldo) {
            lblTotalDiaSaldo.textContent = formatarMoeda(saldoDia);
            
            // Ajusta cor do saldo do dia
            lblTotalDiaSaldo.classList.remove('text-red-600', 'text-blue-900', 'text-gray-500');
            if (saldoDia < 0) lblTotalDiaSaldo.classList.add('text-red-600');
            else if (saldoDia > 0) lblTotalDiaSaldo.classList.add('text-blue-900');
            else lblTotalDiaSaldo.classList.add('text-gray-500');
        }
    }

    const aplicarFiltroEOrdem = () => {
        const movimentosFiltrados = [...todosOsMovimentos];

        movimentosFiltrados.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            if (sortColumn === 'Valor') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else if (sortColumn === 'DataPagamento') {
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

        desenharTabela(movimentosFiltrados);
    };

    const desenharTabela = (movimentos) => {
        if (!tabelaCorpo) return;
        tabelaCorpo.innerHTML = ''; 
        
        if (movimentos.length === 0) {
            tabelaCorpo.innerHTML = '<tr><td colspan="4" class="text-center p-8 text-gray-400 font-light">Nenhum movimento registrado nesta data.</td></tr>';
            return;
        }

        movimentos.forEach(mov => {
            const isDespesa = mov.Tipo === 'DESPESA';
            const valorClasse = isDespesa ? 'text-red-600 font-bold' : 'text-green-600 font-bold';
            const icone = isDespesa ? '🔻' : '🔹';

            const linha = `
                <tr class="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                    <td class="px-6 py-4 text-sm text-gray-600">${formatarData(mov.DataPagamento)}</td>
                    <td class="px-6 py-4 text-sm font-medium text-gray-800">${mov.Descricao}</td>
                    <td class="px-6 py-4 text-sm text-gray-500"><span class="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 border border-gray-200">${mov.CategoriaNome || '-'}</span></td>
                    <td class="px-6 py-4 text-right text-sm ${valorClasse}">${icone} ${formatarMoeda(mov.Valor)}</td>
                </tr>
            `;
            tabelaCorpo.innerHTML += linha;
        });
    };

    // --- CARREGAR SELECTS (Modais) ---
    async function carregarCategorias() {
        if(!selectCategorias) return;
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/categorias?tipo=DESPESA');
            const categorias = await response.json();
            selectCategorias.innerHTML = '<option value="">Selecione...</option>';
            categorias.forEach(cat => {
                selectCategorias.innerHTML += `<option value="${cat.id}">${cat.Nome}</option>`;
            });
        } catch (err) { console.error(err); }
    }

    async function carregarContas() {
        if(!selectContas) return;
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/contascaixa');
            const contas = await response.json();
            selectContas.innerHTML = '<option value="">Selecione...</option>';
            contas.forEach(conta => {
                selectContas.innerHTML += `<option value="${conta.id}">${conta.Nome}</option>`;
            });
        } catch (err) { console.error(err); }
    }

    // --- SALVAR DESPESA ---
    if (formDespesa) {
        formDespesa.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnSubmit = formDespesa.querySelector('button[type="submit"]');
            const textoOriginal = btnSubmit.innerText;
            btnSubmit.innerText = "Salvando...";
            btnSubmit.disabled = true;

            const dadosDespesa = {
                Descricao: document.getElementById('despesaDescricao').value,
                Valor: parseFloat(document.getElementById('despesaValor').value),
                Tipo: 'DESPESA',
                Status: 'PAGO',
                DataPagamento: document.getElementById('despesaData').value,
                CategoriaID: document.getElementById('despesaCategoria').value || null,
                ContaCaixaID: document.getElementById('despesaConta').value || null
            };

            try {
                const response = await fetch('http://localhost:3002/api/financeiro/lancamento', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosDespesa)
                });

                if (response.status === 201) {
                    alert('Saída registrada com sucesso!');
                    formDespesa.reset();
                    fecharModal();
                    await atualizarDashboard(); // Recarrega tudo
                } else {
                    const erro = await response.json();
                    alert(`Erro ao salvar: ${erro.message}`);
                }
            } catch (err) {
                console.error(err);
                alert('Erro de conexão.');
            } finally {
                btnSubmit.innerText = textoOriginal;
                btnSubmit.disabled = false;
            }
        });
    }

    // --- ORDENAÇÃO ---
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

    // INICIALIZAÇÃO
    atualizarDashboard();
});