// 'DOMContentLoaded' garante que o HTML foi carregado
    document.addEventListener('DOMContentLoaded', () => {

        // --- 1. O SEU CÓDIGO ORIGINAL (para o ano) ---
        document.getElementById('currentYear').textContent = new Date().getFullYear();

        // --- 2. REFERÊNCIAS AOS ELEMENTOS ---
        const btnAbrir = document.getElementById('btnAbrirModalDespesa');
        const btnFechar = document.getElementById('btnFecharModal');
        const modal = document.getElementById('modalDespesa');
        const formDespesa = document.getElementById('formDespesa');
        const selectCategorias = document.getElementById('despesaCategoria');
        const selectContas = document.getElementById('despesaConta');

        // Referências aos novos elementos do Dashboard
        const cardSaldo = document.getElementById('card-saldo');
        const cardEntradas = document.getElementById('card-entradas');
        const cardSaidas = document.getElementById('card-saidas');
        const cardVencido = document.getElementById('card-vencido');
        const tabelaCorpo = document.getElementById('tabela-movimentos-corpo');

        // --- 3. FUNÇÕES DE FORMATAÇÃO ---
        function formatarMoeda(valor) {
            // Formata o número para R$ -2.300,00
            return new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
            }).format(valor);
        }

        // --- 4. FUNÇÕES DE ATUALIZAÇÃO DO DASHBOARD (Onde a magia acontece) ---

        // Função ÚNICA para atualizar TUDO
        async function atualizarDashboard() {
            console.log("A atualizar dashboard...");
            await atualizarCardsResumo();
            await atualizarTabelaMovimentos();
        }

        // Função para os CARDS
        async function atualizarCardsResumo() {
            try {
                const response = await fetch('http://localhost:3002/api/financeiro/dashboard/resumo');
                const resumo = await response.json();

                // Preenche os cards com os dados da API
                cardSaldo.textContent = formatarMoeda(resumo.SaldoAtualTotal);
                cardEntradas.textContent = formatarMoeda(resumo.EntradasMes);
                cardSaidas.textContent = formatarMoeda(resumo.SaidasMes);
                cardVencido.textContent = formatarMoeda(resumo.ContasReceberVencido);
                
                // Adiciona classes de cor ao Saldo
                cardSaldo.classList.toggle('text-red-900', resumo.SaldoAtualTotal < 0);
                cardSaldo.classList.toggle('text-blue-900', resumo.SaldoAtualTotal >= 0);

            } catch (err) {
                console.error("Erro ao buscar resumo:", err);
                cardSaldo.textContent = "Erro";
            }
        }

        // Função para a TABELA
        async function atualizarTabelaMovimentos() {
            try {
                const response = await fetch('http://localhost:3002/api/financeiro/movimentocaixa');
                const movimentos = await response.json();

                tabelaCorpo.innerHTML = ''; // Limpa a tabela

                if (movimentos.length === 0) {
                    tabelaCorpo.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhum movimento encontrado.</td></tr>';
                    return;
                }

                movimentos.forEach(mov => {
                    const valorClasse = mov.Tipo === 'DESPESA' ? 'valor-despesa' : 'valor-receita';
                    const valorFormatado = formatarMoeda(mov.Valor);
                    
                    const dataFormatada = new Date(mov.DataPagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'});

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

            } catch (err) {
                console.error("Erro ao buscar movimentos:", err);
                tabelaCorpo.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-red-500">Erro ao carregar movimentos.</td></tr>';
            }
        }

        // --- 5. LÓGICA DO MODAL (Como já tínhamos) ---

        btnAbrir.addEventListener('click', () => {
            modal.classList.remove('modal-oculto');
            carregarCategorias();
            carregarContas();
            document.getElementById('despesaData').value = new Date().toISOString().split('T')[0];
        });
        btnFechar.addEventListener('click', () => {
            modal.classList.add('modal-oculto');
        });

        // Funções GET para o modal (sem alterações)
        async function carregarCategorias() { /* ... (código igual ao anterior) ... */ }
        async function carregarContas() { /* ... (código igual ao anterior) ... */ }
        // Copie as funções carregarCategorias() e carregarContas() da nossa conversa anterior

        // --- 6. EVENTO DE SUBMISSÃO (Ajustado para atualizar) ---
        
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
                    
                    // --- AQUI É A MUDANÇA ---
                    // Atualiza o dashboard automaticamente após o sucesso
                    await atualizarDashboard(); 
                    
                } else {
                    const erro = await response.json();
                    alert(`Erro ao salvar: ${erro.message}`);
                }
            } catch (err) {
                console.error('Erro de rede ao salvar despesa:', err);
                alert('Erro de conexão. Verifique o console.');
            }
        });

        // --- 7. CARREGAMENTO INICIAL ---
        // Chama a função principal quando a página carrega pela primeira vez
        atualizarDashboard();
    });