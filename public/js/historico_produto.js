document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = 'http://localhost:3002/api';
    
    const urlParams = new URLSearchParams(window.location.search);
    const produtoId = urlParams.get('id');

    if (!produtoId) { alert("Produto não especificado."); window.location.href = 'gestao_produtos.html'; return; }

    // Elementos
    const elTitulo = document.getElementById('produto-titulo');
    const elSubtitulo = document.getElementById('produto-subtitulo');
    const elEstoque = document.getElementById('card-estoque');
    const elCusto = document.getElementById('card-custo-medio');
    const tbRanking = document.getElementById('tabela-ranking');
    const tbHistorico = document.getElementById('tabela-historico');

    // Variável global para armazenar os dados e permitir filtragem
    let historicoCache = [];

    // Helpers
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(val) || 0);
    const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR');
    const formatDateTime = (d) => new Date(d).toLocaleDateString('pt-BR') + ' ' + new Date(d).toLocaleTimeString('pt-BR');

    // --- FUNÇÃO DE FILTRAGEM E RENDERIZAÇÃO ---
    window.filtrarHistorico = (tipoFiltro) => {
        // 1. Atualiza visual dos botões
        const botoes = {
            'todas': document.getElementById('tab-todas'),
            'entrada': document.getElementById('tab-entrada'),
            'saida': document.getElementById('tab-saida')
        };

        // Reseta todos
        Object.values(botoes).forEach(btn => {
            if(btn) btn.className = "flex-1 py-1 px-3 rounded font-medium text-gray-600 hover:bg-white transition-all";
        });

        // Ativa o selecionado
        const btnAtivo = botoes[tipoFiltro];
        if (btnAtivo) {
            let corTexto = 'text-blue-600';
            if (tipoFiltro === 'entrada') corTexto = 'text-green-600';
            if (tipoFiltro === 'saida') corTexto = 'text-red-600';
            btnAtivo.className = `flex-1 py-1 px-3 rounded font-bold bg-white ${corTexto} shadow transition-all`;
        }

        // 2. Filtra os dados
        let dadosFiltrados = [];

        // FILTRO INTELIGENTE: Remove movimentações internas de OS da visualização padrão
        // Mantemos apenas: Vendas, Entradas Manuais (Compras), Ajustes e Perdas
        const ignorarInternos = (mov) => {
            const obs = (mov.observacao || '').toLowerCase();
            // Retorna TRUE se NÃO for uma movimentação interna de OS
            return !obs.includes('retorno os') && !obs.includes('saída os') && !obs.includes('saida os');
        };

        if (tipoFiltro === 'todas') {
            // Mostra tudo que é relevante (ignora movimentação interna da OS)
            dadosFiltrados = historicoCache.filter(ignorarInternos);
        } else if (tipoFiltro === 'entrada') {
            dadosFiltrados = historicoCache.filter(h => h.tipo === 'ENTRADA' && ignorarInternos(h));
        } else if (tipoFiltro === 'saida') {
            dadosFiltrados = historicoCache.filter(h => h.tipo !== 'ENTRADA' && ignorarInternos(h));
        }

        // 3. Renderiza Tabela
        tbHistorico.innerHTML = '';
        
        if (dadosFiltrados.length === 0) {
            // Se estiver vazio, verifica se é porque filtramos tudo
            if (historicoCache.length > 0 && tipoFiltro === 'todas') {
                tbHistorico.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">Apenas movimentações internas de OS registradas.</td></tr>';
            } else {
                tbHistorico.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">Nenhum registro relevante encontrado.</td></tr>';
            }
            return;
        }

        dadosFiltrados.forEach(mov => {
            const isEntrada = mov.tipo === 'ENTRADA';
            const corBadge = isEntrada ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
            const icone = isEntrada ? '📥' : '📤';
            
            // Custo só faz sentido mostrar na entrada
            const custoDisplay = (isEntrada && mov.custo_unitario > 0) ? formatCurrency(mov.custo_unitario) : '-';
            
            let obs = mov.observacao || '';
            
            // Formatação bonita para links de Venda
            if (obs.includes('Venda #')) {
                obs = obs.replace(/(Venda #\d+)/, '<span class="font-bold text-blue-600 bg-blue-50 px-1 rounded">$1</span>');
            }
            // Formatação bonita para Fornecedor
            if (obs.includes('Forn:')) {
                obs = obs.replace(/Forn: (.*?)( \| NF:|$)/, '<span class="font-bold text-gray-800 uppercase">$1</span>$2');
            }

            tbHistorico.innerHTML += `
                <tr class="hover:bg-gray-50 border-b border-gray-50 transition-colors">
                    <td class="p-3 text-xs text-gray-500 whitespace-nowrap">${formatDateTime(mov.data)}</td>
                    <td class="p-3 text-center">
                        <span class="${corBadge} px-2 py-1 rounded text-xs font-bold uppercase">${icone} ${mov.tipo}</span>
                    </td>
                    <td class="p-3 text-center font-bold ${isEntrada ? 'text-green-600' : 'text-red-600'}">
                        ${isEntrada ? '+' : ''}${mov.quantidade}
                    </td>
                    <td class="p-3 text-right text-xs font-mono text-gray-600">${custoDisplay}</td>
                    <td class="p-3 text-xs text-gray-600 truncate max-w-md" title="${mov.observacao || ''}">${obs}</td>
                </tr>
            `;
        });
    };

    try {
        // 1. Dados do Produto
        const resProd = await fetch(`${API_URL}/produtos/${produtoId}`);
        if (!resProd.ok) throw new Error("Produto não encontrado.");
        const produto = await resProd.json();

        elTitulo.textContent = produto.nome;
        elSubtitulo.textContent = produto.descricao || 'Sem descrição cadastrada.';
        elEstoque.textContent = produto.quantidade_em_estoque;
        elCusto.textContent = formatCurrency(produto.valor_custo);

        // 2. Ranking (Melhores Preços)
        const resRank = await fetch(`${API_URL}/produtos/${produtoId}/melhores-precos`);
        const ranking = await resRank.json();

        tbRanking.innerHTML = '';
        if (ranking.length === 0) {
            tbRanking.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-400 text-xs">Nenhuma compra registrada.</td></tr>';
        } else {
            ranking.forEach((r, i) => {
                const medalha = i === 0 ? '🥇' : (i === 1 ? '🥈' : '🥉');
                const destaque = i === 0 ? 'bg-yellow-50 font-bold' : '';
                tbRanking.innerHTML += `
                    <tr class="${destaque} hover:bg-gray-50 transition-colors">
                        <td class="p-3">
                            <span class="mr-1">${medalha}</span> 
                            <span class="uppercase text-gray-700 text-xs font-bold">${r.fornecedor || 'Desconhecido'}</span>
                        </td>
                        <td class="p-3 text-right text-green-700 font-bold text-xs">${formatCurrency(r.custo)}</td>
                        <td class="p-3 text-center text-gray-500 text-xs">${formatDate(r.data)}</td>
                    </tr>
                `;
            });
        }

        // 3. Histórico Completo (Busca e Salva no Cache)
        const resHist = await fetch(`${API_URL}/produtos/${produtoId}/historico`);
        historicoCache = await resHist.json();

        // Renderiza inicial (Todas - Agora Filtrado)
        filtrarHistorico('todas');

    } catch (err) {
        console.error(err);
        alert("Erro ao carregar dados: " + err.message);
    }
});