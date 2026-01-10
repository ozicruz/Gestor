document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'http://localhost:3002/api/financeiro'; 
    const API_BASE = 'http://localhost:3002/api'; // Para buscar dados da empresa

    // --- ELEMENTOS ---
    const btnAbrir = document.getElementById('btnAbrirModalDespesa');
    const btnFechar = document.getElementById('btnFecharModal');
    const btnFecharX = document.getElementById('btnFecharModalX');
    const modal = document.getElementById('modalDespesa');
    const formDespesa = document.getElementById('formDespesa');
    
    const selectCategorias = document.getElementById('despesaCategoria');
    const selectContas = document.getElementById('despesaConta');
    
    const cardSaldo = document.getElementById('card-saldo');
    const cardEntradas = document.getElementById('card-entradas');
    const cardSaidas = document.getElementById('card-saidas');
    const cardVencido = document.getElementById('card-vencido');
    
    const tabelaCorpo = document.getElementById('tabela-movimentos-corpo');
    const filtroDataMovimento = document.getElementById('filtroDataMovimento');

    const lblTotalDiaEntradas = document.getElementById('totalDiaEntradas');
    const lblTotalDiaSaidas = document.getElementById('totalDiaSaidas');
    const lblTotalDiaSaldo = document.getElementById('totalDiaSaldo');

    // Ordenação
    const headersTabela = document.querySelectorAll('#tabela-movimentos-header th[data-sort]');
    let todosOsMovimentos = []; 
    let sortColumn = 'DataPagamento'; 
    let sortDirection = 'desc'; 

    // --- INICIALIZAÇÃO DATA ---
    const hojeISO = new Date().toISOString().split('T')[0];
    if (filtroDataMovimento) {
        filtroDataMovimento.value = hojeISO; 
        filtroDataMovimento.addEventListener('change', () => {
            carregarMovimentosDaAPI();
        });
    }

    // --- FORMATAÇÃO ---
    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
    }

    function formatarData(dataISO) {
        if(!dataISO) return '-';
        const [ano, mes, dia] = dataISO.split('T')[0].split('-');
        return `${dia}/${mes}/${ano}`;
    }

    // --- IMPRESSÃO DE RECIBO (LÓGICA IGUAL A RELATÓRIOS/VENDAS) ---
    window.imprimirReciboFinanceiro = async (descricao, valor, data, beneficiario) => {
        
        // 1. Busca dados da empresa para o cabeçalho (igual ao relatorios.js)
        let emp = { nome_fantasia: 'Minha Oficina', endereco: '', telefone: '' };
        try { 
            const res = await fetch(`${API_BASE}/empresa`); 
            if(res.ok) emp = await res.json(); 
        } catch(e) { console.error("Erro ao buscar empresa", e); }

        const nomeArquivo = `Recibo_${descricao.replace(/[^a-z0-9]/gi, '_').substring(0, 15)}_${new Date().getTime()}.pdf`;

        // 2. Monta o HTML (Estilo Limpo e Profissional)
        const htmlContent = `
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Recibo de Pagamento</title>
            <style>
                body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                .recibo-box { border: 2px solid #333; padding: 30px; max-width: 700px; margin: 0 auto; }
                
                .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 20px; margin-bottom: 30px; }
                .header h1 { margin: 0; font-size: 22px; text-transform: uppercase; }
                .header p { margin: 2px 0; font-size: 12px; color: #666; }
                
                .titulo-recibo { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 2px; }
                
                .linha-dado { margin-bottom: 15px; font-size: 16px; border-bottom: 1px dotted #eee; padding-bottom: 5px; }
                .label { font-weight: bold; width: 140px; display: inline-block; color: #555; }
                .valor-destaque { float: right; font-size: 20px; font-weight: bold; background: #eee; padding: 5px 10px; border-radius: 4px; }
                
                .declaracao { margin-top: 40px; font-style: italic; text-align: justify; color: #555; }
                
                .assinatura-area { margin-top: 80px; text-align: center; }
                .assinatura-linha { border-top: 1px solid #000; width: 60%; margin: 0 auto; padding-top: 10px; }
                .data-local { margin-top: 40px; text-align: right; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="recibo-box">
                <div class="header">
                    <h1>${emp.nome_fantasia}</h1>
                    <p>${emp.endereco || ''}</p>
                    <p>${emp.telefone || ''}</p>
                </div>

                <div class="titulo-recibo">RECIBO DE PAGAMENTO</div>
                
                <div class="linha-dado">
                    <span class="valor-destaque">R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}</span>
                    <span class="label">VALOR:</span>
                </div>

                <div class="linha-dado">
                    <span class="label">REFERENTE A:</span> ${descricao}
                </div>

                <div class="linha-dado">
                    <span class="label">DATA:</span> ${formatarData(data)}
                </div>
                
                ${beneficiario ? `<div class="linha-dado"><span class="label">BENEFICIÁRIO:</span> ${beneficiario}</div>` : ''}

                <p class="declaracao">
                    Declaro para os devidos fins que recebi a importância supra mencionada, dando plena e rasa quitação.
                </p>

                <div class="data-local">
                    Emissão: ${new Date().toLocaleDateString('pt-BR')}
                </div>

                <div class="assinatura-area">
                    <div class="assinatura-linha"></div>
                    <strong>Assinatura do Recebedor</strong>
                </div>
            </div>
        </body>
        </html>`;

        // 3. Envia para o Electron gerar o PDF (Lógica da tela de Vendas)
        if (window.electronAPI) {
            window.electronAPI.send('print-to-pdf', { html: htmlContent, name: nomeArquivo });
        } else {
            // Fallback apenas se abrir no navegador comum
            const w = window.open('', '', 'width=800,height=600');
            w.document.write(htmlContent);
            w.document.close();
            w.print();
        }
    };

    // --- MODAL ---
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

    // --- CARREGAMENTO DE DADOS ---
    async function atualizarDashboard() {
        await Promise.all([
            atualizarCardsResumo(),
            carregarMovimentosDaAPI()
        ]);
    }

    async function atualizarCardsResumo() {
        try {
            const response = await fetch(`${API_URL}/dashboard/resumo`);
            if (!response.ok) throw new Error("Falha ao buscar resumo");
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

    async function carregarMovimentosDaAPI() {
        try {
            const dataSelecionada = filtroDataMovimento.value;
            const url = `${API_URL}/movimento-caixa?data_inicio=${dataSelecionada}&data_fim=${dataSelecionada}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error("Falha ao buscar movimentos");
            todosOsMovimentos = await response.json();
            
            aplicarFiltroEOrdem(); 
            calcularTotaisDoDia(todosOsMovimentos);

        } catch (err) {
            console.error("Erro movimentos:", err);
            if(tabelaCorpo) tabelaCorpo.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-red-500">Erro ao carregar movimentos.</td></tr>';
        }
    }

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
            tabelaCorpo.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-gray-400 font-light">Nenhum movimento registrado nesta data.</td></tr>';
            return;
        }

        movimentos.forEach(mov => {
            const isDespesa = mov.Tipo === 'DESPESA';
            const valorClasse = isDespesa ? 'text-red-600 font-bold' : 'text-green-600 font-bold';
            const icone = isDespesa ? '🔻' : '🔹';
            
            const usuarioResponsavel = mov.UsuarioNome ? `<span class="text-xs text-gray-400 block mt-1">(Lançado por: ${mov.UsuarioNome})</span>` : '';
            
            // Botão de Recibo chama a função que usa o Electron
            const descSafe = mov.Descricao.replace(/'/g, "\\'");
            const botaoRecibo = isDespesa 
                ? `<button onclick="window.imprimirReciboFinanceiro('${descSafe}', ${mov.Valor}, '${mov.DataPagamento}', '')" 
                   class="ml-2 text-gray-500 hover:text-blue-700 transition-colors" title="Imprimir Recibo">
                   🖨️
                   </button>`
                : '';

            const linha = `
                <tr class="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                    <td class="px-6 py-4 text-sm text-gray-600">${formatarData(mov.DataPagamento)}</td>
                    <td class="px-6 py-4 text-sm font-medium text-gray-800">
                        ${mov.Descricao}
                        ${usuarioResponsavel}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500"><span class="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 border border-gray-200">${mov.CategoriaNome || '-'}</span></td>
                    <td class="px-6 py-4 text-right text-sm ${valorClasse}">${icone} ${formatarMoeda(mov.Valor)}</td>
                    <td class="px-6 py-4 text-center">
                        ${botaoRecibo}
                    </td>
                </tr>
            `;
            tabelaCorpo.innerHTML += linha;
        });
    };

    // --- CARREGAR SELECTS ---
    async function carregarCategorias() {
        if(!selectCategorias) return;
        try {
            const response = await fetch(`${API_URL}/categorias?tipo=DESPESA`);
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
            const response = await fetch(`${API_URL}/contas`);
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
            
            const usuarioJson = localStorage.getItem('usuario_logado');
            const usuario = usuarioJson ? JSON.parse(usuarioJson) : null;
            const usuarioId = usuario ? usuario.id : null;

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
                ContaCaixaID: document.getElementById('despesaConta').value || null,
                usuario_id: usuarioId
            };

            try {
                const response = await fetch(`${API_URL}/lancamentos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosDespesa)
                });

                if (response.status === 201) {
                    alert('Saída registrada com sucesso!');
                    formDespesa.reset();
                    fecharModal();
                    await atualizarDashboard(); 
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

    atualizarDashboard();
});