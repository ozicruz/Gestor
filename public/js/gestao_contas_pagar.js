document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3002/api';
    const tabelaCorpo = document.getElementById('tabela-pagar-corpo');
    
    // --- ELEMENTOS DO MODAL NOVA CONTA ---
    const modalNova = document.getElementById('modal-nova-conta');
    const btnNova = document.getElementById('btn-nova-conta');
    const btnCancelarNova = document.getElementById('btn-cancelar');
    const formNova = document.getElementById('form-nova-conta');
    const selectCategoriaNova = document.getElementById('nova-categoria');

    // --- ELEMENTOS DO MODAL PAGAMENTO (BAIXA) ---
    const modalPagto = document.getElementById('modal-pagamento');
    const formPagto = document.getElementById('form-pagamento');
    const btnCancelarPagto = document.getElementById('btn-cancelar-pagamento');
    const inputPagtoId = document.getElementById('pagamento-id');
    const inputPagtoValor = document.getElementById('pagamento-valor');
    const inputPagtoData = document.getElementById('pagamento-data');
    const selectPagtoConta = document.getElementById('pagamento-conta');
    const selectPagtoForma = document.getElementById('pagamento-forma');
    const txtPagtoDescricao = document.getElementById('pagamento-descricao-texto');

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatDate = (date) => {
        if(!date) return '-';
        const [ano, mes, dia] = date.split('T')[0].split('-');
        return `${dia}/${mes}/${ano}`;
    };

    // --- 1. CARREGAR DADOS ---
    const carregarTudo = async () => {
        // Resumo
        try {
            // CORREÇÃO: rota com hífen
            const resResumo = await fetch(`${API_URL}/financeiro/contas-pagar/resumo`);
            const resumo = await resResumo.json();
            document.getElementById('card-total').textContent = formatCurrency(resumo.TotalAPagar || 0);
            document.getElementById('card-vencido').textContent = formatCurrency(resumo.TotalVencido || 0);
            document.getElementById('card-hoje').textContent = formatCurrency(resumo.PagarHoje || 0);
        } catch(e) { console.error("Erro resumo:", e); }

        // Tabela
        try {
            // CORREÇÃO: rota com hífen
            const resLista = await fetch(`${API_URL}/financeiro/contas-pagar`);
            const lista = await resLista.json();
            
            tabelaCorpo.innerHTML = '';
            if(!lista || lista.length === 0) {
                tabelaCorpo.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhuma conta pendente. 👏👏</td></tr>';
                return;
            }

            const hoje = new Date().toISOString().split('T')[0];

            lista.forEach(item => {
                const isVencido = item.DataVencimento < hoje;
                const classeVencimento = isVencido ? 'text-red-600 font-bold' : 'text-gray-700';
                
                // Botão de Pagar
                const btnPagar = `<button onclick="abrirModalPagamento(${item.id}, '${item.Descricao.replace(/'/g, "\\'")}', ${item.Valor})" 
                                    class="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-bold border border-green-200 hover:bg-green-200 transition-colors">
                                    Pagar
                                  </button>`;

                tabelaCorpo.innerHTML += `
                    <tr class="hover:bg-gray-50 border-b transition-colors">
                        <td class="px-6 py-4 font-medium text-gray-800">${item.Descricao}</td>
                        <td class="px-6 py-4 text-sm text-gray-500"><span class="bg-gray-100 px-2 py-1 rounded text-xs">${item.CategoriaNome || '-'}</span></td>
                        <td class="px-6 py-4 ${classeVencimento}">${formatDate(item.DataVencimento)}</td>
                        <td class="px-6 py-4 text-right font-bold text-gray-800">${formatCurrency(item.Valor)}</td>
                        <td class="px-6 py-4 text-center flex justify-center gap-2">
                            ${btnPagar}
                            <button onclick="excluirConta(${item.id})" class="bg-red-50 text-red-600 px-3 py-1 rounded text-xs font-bold border border-red-100 hover:bg-red-100 transition-colors" title="Excluir">
                                🗑️
                            </button>
                        </td>
                    </tr>
                `;
            });
        } catch(e) {
            console.error("Erro lista:", e);
            tabelaCorpo.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Erro ao carregar dados.</td></tr>';
        }
    };

    // --- 2. LÓGICA DO PAGAMENTO (BAIXA) ---
    
    // Torna a função global para ser chamada pelo onclick do HTML
    window.abrirModalPagamento = async (id, descricao, valorPendente) => {
        // Preenche os campos do modal
        inputPagtoId.value = id;
        txtPagtoDescricao.textContent = `Pagando: ${descricao}`;
        inputPagtoValor.value = valorPendente; // Sugere o valor total
        inputPagtoData.value = new Date().toISOString().split('T')[0]; // Hoje
        
        // Carrega combos se estiverem vazios
        if(selectPagtoConta.options.length <= 1) await carregarOpcoesPagamento();

        modalPagto.classList.remove('hidden');
    };

    const carregarOpcoesPagamento = async () => {
        try {
            const [resContas, resFormas] = await Promise.all([
                // CORREÇÃO: 'contas' (sem 'caixa')
                fetch(`${API_URL}/financeiro/contas`),
                // CORREÇÃO: 'formas-pagamento' (com hífen)
                fetch(`${API_URL}/financeiro/formas-pagamento`)
            ]);
            
            const contas = await resContas.json();
            const formas = await resFormas.json();

            selectPagtoConta.innerHTML = '<option value="">Selecione a Conta...</option>';
            contas.forEach(c => selectPagtoConta.innerHTML += `<option value="${c.id}">${c.Nome}</option>`);

            selectPagtoForma.innerHTML = '<option value="">Selecione a Forma...</option>';
            formas.forEach(f => selectPagtoForma.innerHTML += `<option value="${f.id}">${f.Nome}</option>`);
        } catch (err) { console.error("Erro ao carregar opções de pagamento", err); }
    };

    // Confirmar Pagamento
    formPagto.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = inputPagtoId.value;
        const dadosBaixa = {
            ValorRecebido: parseFloat(inputPagtoValor.value),
            DataPagamento: inputPagtoData.value,
            ContaCaixaID: parseInt(selectPagtoConta.value),
            FormaPagamentoID: parseInt(selectPagtoForma.value)
        };

        if(!dadosBaixa.ContaCaixaID || !dadosBaixa.FormaPagamentoID || dadosBaixa.ValorRecebido <= 0) {
            alert("Preencha todos os campos corretamente (Valor, Conta e Forma).");
            return;
        }

        const btnSubmit = formPagto.querySelector('button[type="submit"]');
        const textoOriginal = btnSubmit.innerHTML;
        btnSubmit.innerHTML = "Processando...";
        btnSubmit.disabled = true;

        try {
            // CORREÇÃO: 'lancamentos' (plural)
            const response = await fetch(`${API_URL}/financeiro/lancamentos/${id}/baixar`, {
                method: 'PUT', // Geralmente baixa é PUT, mas verifique se seu backend espera PUT ou POST
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(dadosBaixa)
            });

            const result = await response.json();

            if (response.ok) {
                alert("Pagamento registrado com sucesso!");
                modalPagto.classList.add('hidden');
                carregarTudo(); // Atualiza a tabela
            } else {
                alert(`Erro: ${result.message}`);
            }
        } catch (err) {
            alert("Erro de comunicação com o servidor.");
        } finally {
            btnSubmit.innerHTML = textoOriginal;
            btnSubmit.disabled = false;
        }
    });

    // Fechar Modal Pagamento
    btnCancelarPagto.addEventListener('click', () => modalPagto.classList.add('hidden'));


    // --- 3. MODAL DE NOVA CONTA (Criação) ---
    const carregarCategorias = async () => {
        try {
            const res = await fetch(`${API_URL}/financeiro/categorias?tipo=DESPESA`);
            const cats = await res.json();
            selectCategoriaNova.innerHTML = '';
            cats.forEach(c => {
                selectCategoriaNova.innerHTML += `<option value="${c.id}">${c.Nome}</option>`;
            });
        } catch(e){ console.error(e); }
    };

    btnNova.addEventListener('click', () => {
        modalNova.classList.remove('hidden');
        carregarCategorias();
        document.getElementById('nova-vencimento').value = new Date().toISOString().split('T')[0];
    });
    btnCancelarNova.addEventListener('click', () => modalNova.classList.add('hidden'));

    formNova.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dados = {
            Descricao: document.getElementById('nova-descricao').value,
            Valor: document.getElementById('nova-valor').value,
            DataVencimento: document.getElementById('nova-vencimento').value,
            CategoriaID: selectCategoriaNova.value,
            Tipo: 'DESPESA',
            Status: 'PENDENTE'
        };

        const btnSalvar = formNova.querySelector('button[type="submit"]');
        btnSalvar.textContent = "Salvando...";
        btnSalvar.disabled = true;

        try {
            // CORREÇÃO: 'lancamentos' (plural)
            const response = await fetch(`${API_URL}/financeiro/lancamentos`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(dados)
            });

            if (response.ok) {
                alert("Conta a pagar agendada com sucesso!");
                modalNova.classList.add('hidden');
                formNova.reset();
                carregarTudo();
            } else {
                alert("Erro ao salvar conta.");
            }
        } catch (error) {
            alert("Erro: " + error.message);
        } finally {
            btnSalvar.textContent = "Salvar";
            btnSalvar.disabled = false;
        }
    });

    // Excluir Conta
    window.excluirConta = async (id) => {
        if(!confirm("Tem certeza que deseja excluir esta conta?")) return;
        try {
            // CORREÇÃO: 'lancamentos' (plural)
            await fetch(`${API_URL}/financeiro/lancamentos/${id}`, { method: 'DELETE' });
            carregarTudo();
        } catch (err) { alert("Erro ao excluir: " + err.message); }
    };

    // Inicialização
    carregarTudo();
});