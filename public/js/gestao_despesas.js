// Aguarda o HTML estar pronto
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. PREENCHER OS DROPDOWNS QUANDO A PÁGINA CARREGA ---

    const selectCategorias = document.getElementById('despesaCategoria');
    const selectContas = document.getElementById('despesaConta');

    // Função para carregar as Categorias de DESPESA
    async function carregarCategorias() {
        try {
            // Chamamos a API GET que testámos (filtrando por DESPESA)
            const response = await fetch('http://localhost:3002/api/financeiro/categorias?tipo=DESPESA');
            const categorias = await response.json();

            selectCategorias.innerHTML = '<option value="">Selecione...</option>'; // Limpa o "A carregar..."
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

    // Função para carregar as Contas/Caixa
    async function carregarContas() {
        try {
            // Chamamos a API GET que testámos
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

    // Executa as funções assim que a página abre
    carregarCategorias();
    carregarContas();

    // --- 2. ENVIAR O FORMULÁRIO (O TESTE DO POST) ---

    const formDespesa = document.getElementById('formDespesa');
    formDespesa.addEventListener('submit', async (e) => {
        e.preventDefault(); // Impede o recarregamento da página

        // Monta o objeto JSON que a nossa API espera
        const dadosDespesa = {
            Descricao: document.getElementById('despesaDescricao').value,
            Valor: parseFloat(document.getElementById('despesaValor').value),
            Tipo: 'DESPESA', // Fixo, pois é o formulário de despesa
            DataPagamento: document.getElementById('despesaData').value,
            CategoriaID: parseInt(document.getElementById('despesaCategoria').value),
            ContaCaixaID: parseInt(document.getElementById('despesaConta').value)
        };

        try {
            // Chama a nossa API POST!
            const response = await fetch('http://localhost:3002/api/financeiro/lancamento', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosDespesa) // Converte o objeto JS em texto JSON
            });

            if (response.status === 201) {
                alert('Despesa lançada com sucesso!');
                formDespesa.reset(); // Limpa o formulário
                // Aqui você também fecharia o modal e atualizaria a tabela de movimentos
            } else {
                const erro = await response.json();
                alert(`Erro ao salvar: ${erro.message}`);
            }
        } catch (err) {
            console.error('Erro de rede ao salvar despesa:', err);
            alert('Erro de conexão. Verifique o console.');
        }
    });

    // (Aqui iria a lógica para abrir e fechar o modal com os botões)
});