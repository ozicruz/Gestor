// public/js/gestao_contas_receber.js

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. REFERÊNCIAS AOS ELEMENTOS ---
    // Cards de Resumo
    const cardTotalReceber = document.getElementById('card-total-receber');
    const cardTotalVencido = document.getElementById('card-total-vencido');
    const cardReceberHoje = document.getElementById('card-receber-hoje');
    
    // Tabela de Pendências
    const tabelaCorpo = document.getElementById('tabela-pendencias-corpo');

    // Modal de Baixa (Pagamento)
    const modalBaixa = document.getElementById('modalBaixa');
    const formBaixa = document.getElementById('formBaixa');
    const btnFecharModalBaixa = document.getElementById('btnFecharModalBaixa');
    const modalBaixaTitulo = document.getElementById('modalBaixaTitulo');
    const baixaLancamentoId = document.getElementById('baixaLancamentoId'); // Input escondido
    const baixaValorOriginal = document.getElementById('baixaValorOriginal');
    const baixaValorRecebido = document.getElementById('baixaValorRecebido');
    const baixaDataPagamento = document.getElementById('baixaDataPagamento');
    const baixaContaCaixa = document.getElementById('baixaContaCaixa');
    const baixaFormaPagamento = document.getElementById('baixaFormaPagamento');
    
    // --- 2. FUNÇÕES DE FORMATAÇÃO ---
    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        }).format(valor);
    }
    
    // Formata data 'AAAA-MM-DD' para 'DD/MM/AAAA'
    function formatarData(dataISO) {
        // Adiciona timeZone 'UTC' para evitar problemas de fuso horário
        return new Date(dataISO).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
    }

    // --- 3. FUNÇÕES PRINCIPAIS DE ATUALIZAÇÃO ---

    // Função ÚNICA para atualizar TUDO
    async function atualizarPainel() {
        console.log("A atualizar painel de Contas a Receber...");
        await atualizarCardsResumo();
        await atualizarTabelaPendencias();
    }

    // Função para os CARDS
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

    // Função para a TABELA
    async function atualizarTabelaPendencias() {
        try {
            const response = await fetch('http://localhost:3002/api/financeiro/contasareceber');
            const pendencias = await response.json();

            tabelaCorpo.innerHTML = ''; // Limpa a tabela

            if (pendencias.length === 0) {
                tabelaCorpo.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhuma pendência encontrada.</td></tr>';
                return;
            }

            const hoje = new Date(new Date().toISOString().split('T')[0]); // Data de hoje, sem hora

            pendencias.forEach(p => {
                const dataVenc = new Date(p.DataVencimento);
                let statusClasse = 'text-gray-700'; // A vencer
                if (dataVenc < hoje) {
                    statusClasse = 'text-red-600 font-bold'; // Vencido
                }

                const linha = `
                    <tr class="border-t">
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

        } catch (err) {
            console.error("Erro ao buscar pendências:", err);
            tabelaCorpo.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Erro ao carregar pendências.</td></tr>';
        }
    }
    
    // --- 4. LÓGICA DO MODAL DE "DAR BAIXA" ---
    
    // Carrega as Contas/Caixa para o dropdown do modal
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
            // Só mostramos opções A_VISTA (Dinheiro, Pix, Cartão)
            // Não faz sentido pagar "fiado" com mais "fiado"
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

    // Abre o modal e preenche com os dados da dívida
    function abrirModalBaixa(id, descricao, valor) {
        modalBaixaTitulo.textContent = `Receber Pagamento (${descricao})`;
        baixaLancamentoId.value = id;
        baixaValorOriginal.textContent = formatarMoeda(valor);
        baixaValorRecebido.value = valor; // Sugere o valor total
        baixaDataPagamento.value = new Date().toISOString().split('T')[0]; // Sugere data de hoje
        
        carregarContasBaixa(); // Carrega as contas
        carregarFormasPagamentoBaixa();

        modalBaixa.classList.remove('modal-oculto');
    }

    // Fecha o modal
    btnFecharModalBaixa.addEventListener('click', () => {
        modalBaixa.classList.add('modal-oculto');
    });

    // Event listener na tabela para apanhar cliques nos botões "Receber"
    tabelaCorpo.addEventListener('click', (e) => {
        const botao = e.target.closest('[data-acao="dar-baixa"]');
        if (botao) {
            const id = botao.dataset.id;
            const valor = parseFloat(botao.dataset.valor);
            const descricao = botao.dataset.descricao;
            abrirModalBaixa(id, descricao, valor);
        }
    });

    // Submissão do formulário de pagamento (Amortização)
    formBaixa.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = baixaLancamentoId.value;
        const dadosBaixa = {
            ValorRecebido: parseFloat(baixaValorRecebido.value),
            DataPagamento: baixaDataPagamento.value,
            ContaCaixaID: parseInt(baixaContaCaixa.value)
            FormaPagamentoID: parseInt(baixaFormaPagamento.value)
        };

        // Validações
        if (!dadosBaixa.ValorRecebido || dadosBaixa.ValorRecebido <= 0) {
            alert("O valor recebido deve ser maior que zero.");
            return;
        }
        if (!dadosBaixa.DataPagamento) {
            alert("A data de pagamento é obrigatória.");
            return;
        }
        if (!dadosBaixa.ContaCaixaID) {
            alert("A conta/caixa de destino é obrigatória.");
            return;
        }
        if (!dadosBaixa.FormaPagamentoID) {
            alert("A forma de pagamento é obrigatória.");
            return;
        }
        
        try {
            // Chama a nossa API de baixa/amortização!
            const response = await fetch(`http://localhost:3002/api/financeiro/lancamento/${id}/baixar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosBaixa)
            });

            const resultado = await response.json();
            if (!response.ok) {
                throw new Error(resultado.message);
            }

            alert('Pagamento registrado com sucesso!');
            modalBaixa.classList.add('modal-oculto'); // Fecha o modal
            
            // ATUALIZA O PAINEL INTEIRO!
            // (Os cartões vão mudar, e a dívida vai desaparecer ou ter o valor reduzido)
            await atualizarPainel();

        } catch (err) {
            console.error('Erro ao dar baixa em pagamento:', err);
            alert(`Erro ao salvar: ${err.message}`);
        }
    });

    // --- 5. CARREGAMENTO INICIAL ---
    // Chama a função principal quando a página carrega
    atualizarPainel();
});