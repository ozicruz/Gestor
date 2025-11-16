// public/js/relatorios.js (Versão ATUALIZADA com os dois relatórios)

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';

    // --- ELEMENTOS DO DOM ---
    const formDRE = document.getElementById('form-relatorio-dre');
    const btnGerarDRE = document.getElementById('btn-gerar-dre');
    const btnGerarProdutos = document.getElementById('btn-gerar-produtos');
    const btnGerarStock = document.getElementById('btn-gerar-stock');
    const inputDataInicio = document.getElementById('data-inicio');
    const inputDataFim = document.getElementById('data-fim');
    const areaRelatorio = document.getElementById('area-relatorio');
    const feedbackAlert = document.getElementById('feedback-alert');

    // --- FUNÇÕES AUXILIARES ---
    const formatCurrency = (value) => {
        const valor = parseFloat(value) || 0;
        return new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        }).format(valor);
    };

    const showAlert = (message, isSuccess = true) => {
        // ... (código igual ao anterior)
    };

    // --- Funções do Relatório DRE (O seu código antigo) ---
    
    const desenharDRE = (dreData) => {
        // ... (código igual ao anterior, que desenha o DRE)
        // (Vou colar por si para garantir)
        const {
            TotalReceitas, TotalCMV, LucroBruto, TotalDespesas, LucroLiquido,
            Receitas: ReceitasDetalhadas, Despesas: DespesasDetalhadas
        } = dreData;

        areaRelatorio.innerHTML = '';
        areaRelatorio.style.textAlign = 'left'; 

        const header = document.createElement('h2');
        header.className = "text-2xl font-bold text-gray-800 mb-4";
        header.textContent = `DRE de ${inputDataInicio.valueAsDate.toLocaleDateString('pt-BR')} a ${inputDataFim.valueAsDate.toLocaleDateString('pt-BR')}`;
        areaRelatorio.appendChild(header);

        let htmlDRE = '<div class="space-y-4">';
        htmlDRE += `<div><h3 class="text-xl font-semibold text-gray-700">(+) Receita Bruta Total</h3><div class="pl-4 border-l-2 border-gray-200 mt-1">`;
        ReceitasDetalhadas.forEach(r => {
            htmlDRE += `<p class="text-sm text-gray-600">${r.categoria}: ${formatCurrency(r.total)}</p>`;
        });
        htmlDRE += `<p class="font-bold text-gray-800 mt-1">Total Receitas: ${formatCurrency(TotalReceitas)}</p></div></div>`;
        htmlDRE += `<div><h3 class="text-xl font-semibold text-gray-700">(-) Custo da Mercadoria Vendida (CMV)</h3><div class="pl-4 border-l-2 border-gray-200 mt-1"><p class="font-bold text-gray-800">Total CMV: ${formatCurrency(TotalCMV)}</p></div></div>`;
        htmlDRE += `<div class="border-t pt-2"><h3 class="text-2xl font-bold text-blue-600">(=) Lucro Bruto: ${formatCurrency(LucroBruto)}</h3><p class="text-sm text-gray-500">(Receita de Vendas - Custo dos Produtos)</p></div>`;
        htmlDRE += `<div><h3 class="text-xl font-semibold text-gray-700 mt-4">(-) Despesas Operacionais</h3><div class="pl-4 border-l-2 border-gray-200 mt-1">`;
        DespesasDetalhadas.forEach(d => {
            htmlDRE += `<p class="text-sm text-gray-600">${d.categoria}: ${formatCurrency(d.total)}</p>`;
        });
        htmlDRE += `<p class="font-bold text-red-600 mt-1">Total Despesas: ${formatCurrency(TotalDespesas)}</p></div></div>`;
        const lucroClasse = LucroLiquido >= 0 ? 'text-green-600' : 'text-red-600';
        htmlDRE += `<div class="border-t-2 border-gray-800 pt-4 mt-6"><h3 class="text-3xl font-bold ${lucroClasse}">(=) Lucro Líquido: ${formatCurrency(LucroLiquido)}</h3><p class="text-sm text-gray-500">(Lucro Bruto - Total Despesas)</p></div>`;
        htmlDRE += '</div>';
        areaRelatorio.innerHTML = htmlDRE;
    };
    
    // --- Funções do Relatório de PRODUTOS (NOVAS) ---
    
    // 1. Desenha a tabela de produtos
    const desenharTabelaProdutos = (produtos) => {
        areaRelatorio.innerHTML = ''; // Limpa a área
        areaRelatorio.style.textAlign = 'left';

        const header = document.createElement('h2');
        header.className = "text-2xl font-bold text-gray-800 mb-4";
        header.textContent = `Relatório de Produtos Mais Lucrativos (${inputDataInicio.valueAsDate.toLocaleDateString('pt-BR')} a ${inputDataFim.valueAsDate.toLocaleDateString('pt-BR')})`;
        areaRelatorio.appendChild(header);

        if (produtos.length === 0) {
            areaRelatorio.innerHTML += '<p class="text-center text-gray-500">Nenhum produto vendido neste período.</p>';
            return;
        }

        let tabelaHTML = `
            <div class="bg-white rounded-lg shadow overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-6 py-3 text-left">Produto</th>
                                <th class="px-6 py-3 text-center">Qtd. Vendida</th>
                                <th class="px-6 py-3 text-right">Faturamento Bruto</th>
                                <th class="px-6 py-3 text-right">Custo Total (CMV)</th>
                                <th class="px-6 py-3 text-right">Lucro Bruto</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
        `;
        
        produtos.forEach(p => {
            tabelaHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 font-medium">${p.nome}</td>
                    <td class="px-6 py-4 text-center">${p.totalVendido}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(p.faturamentoBruto)}</td>
                    <td class="px-6 py-4 text-right text-red-600">(${formatCurrency(p.custoTotal)})</td>
                    <td class="px-6 py-4 text-right font-bold text-green-600">${formatCurrency(p.lucroBruto)}</td>
                </tr>
            `;
        });

        tabelaHTML += `</tbody></table></div></div>`;
        areaRelatorio.innerHTML += tabelaHTML;
    };

    // 2. Chama a API de produtos
    const executarRelatorioProdutos = async () => {
        const dataInicio = inputDataInicio.value;
        const dataFim = inputDataFim.value;

        if (!dataInicio || !dataFim) {
            showAlert("Por favor, selecione a Data Início e a Data Fim.", false);
            return;
        }

        btnGerarProdutos.disabled = true;
        btnGerarProdutos.textContent = "A gerar...";
        areaRelatorio.innerHTML = '<p class="text-center text-gray-500">A carregar dados dos produtos...</p>';

        try {
            const response = await fetch(`${API_URL}/relatorios/produtos-mais-vendidos?data_inicio=${dataInicio}&data_fim=${dataFim}`);
            const produtos = await response.json();

            if (!response.ok) { throw new Error(produtos.message); }
            desenharTabelaProdutos(produtos);

        } catch (err) {
            console.error("Erro ao gerar relatório de produtos:", err);
            showAlert(err.message, false);
            areaRelatorio.innerHTML = `<p class="text-center text-red-500">Erro ao gerar relatório: ${err.message}</p>`;
        } finally {
            btnGerarProdutos.disabled = false;
            btnGerarProdutos.textContent = "Gerar Relatório de Produtos";
        }
    };

    // --- FUNÇÕES DO RELATÓRIO DE STOCK BAIXO (NOVAS) ---
    
    // 1. Desenha a tabela de Stock Baixo
    const desenharTabelaStockBaixo = (produtos) => {
        areaRelatorio.innerHTML = ''; // Limpa a área
        areaRelatorio.style.textAlign = 'left';

        const header = document.createElement('h2');
        header.className = "text-2xl font-bold text-gray-800 mb-4";
        header.textContent = `Relatório de Stock Baixo (Itens a Repor)`;
        areaRelatorio.appendChild(header);

        if (produtos.length === 0) {
            areaRelatorio.innerHTML += '<p class="text-center text-gray-500">Nenhum produto abaixo do stock mínimo. Tudo em ordem!</p>';
            return;
        }

        let tabelaHTML = `
            <div class="bg-white rounded-lg shadow overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-6 py-3 text-left">Produto</th>
                                <th class="px-6 py-3 text-center">Qtd. Atual</th>
                                <th class="px-6 py-3 text-center">Qtd. Mínima</th>
                                <th class="px-6 py-3 text-center">Necessário Comprar</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
        `;
        
        produtos.forEach(p => {
            const necessario = p.stock_minimo - p.quantidade_em_estoque;
            tabelaHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 font-medium">${p.nome}</td>
                    <td class="px-6 py-4 text-center font-bold text-red-600">${p.quantidade_em_estoque}</td>
                    <td class="px-6 py-4 text-center text-blue-600">${p.stock_minimo}</td>
                    <td class="px-6 py-4 text-center font-bold text-green-600">${necessario}</td>
                </tr>
            `;
        });

        tabelaHTML += `</tbody></table></div></div>`;
        areaRelatorio.innerHTML += tabelaHTML;
    };

    // 2. Chama a API de Stock Baixo
    const executarRelatorioStockBaixo = async () => {
        // Este relatório não precisa de datas
        btnGerarStock.disabled = true;
        btnGerarStock.textContent = "A gerar...";
        areaRelatorio.innerHTML = '<p class="text-center text-gray-500">A verificar stock...</p>';

        try {
            const response = await fetch(`${API_URL}/relatorios/stock-baixo`);
            const produtos = await response.json();

            if (!response.ok) { throw new Error(produtos.message); }
            desenharTabelaStockBaixo(produtos);

        } catch (err) {
            console.error("Erro ao gerar relatório de stock:", err);
            showAlert(err.message, false);
            areaRelatorio.innerHTML = `<p class="text-center text-red-500">Erro ao gerar relatório: ${err.message}</p>`;
        } finally {
            btnGerarStock.disabled = false;
            btnGerarStock.textContent = "Relatório de Stock Baixo";
        }
    };
    
    // --- EVENT LISTENERS ---
    
    // Listener do Botão DRE (O seu código antigo)
    formDRE.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const dataInicio = inputDataInicio.value;
        const dataFim = inputDataFim.value;

        if (!dataInicio || !dataFim) {
            showAlert("Por favor, selecione a Data Início e a Data Fim.", false);
            return;
        }

        btnGerarDRE.disabled = true;
        btnGerarDRE.textContent = "A gerar...";
        areaRelatorio.innerHTML = '<p class="text-center text-gray-500">A carregar dados...</p>';

        try {
            const response = await fetch(`${API_URL}/financeiro/relatorios/dre?data_inicio=${dataInicio}&data_fim=${dataFim}`);
            const dreData = await response.json();
            if (!response.ok) { throw new Error(dreData.message); }
            desenharDRE(dreData);
        } catch (err) {
            console.error("Erro ao gerar DRE:", err);
            showAlert(err.message, false);
            areaRelatorio.innerHTML = `<p class="text-center text-red-500">Erro ao gerar relatório: ${err.message}</p>`;
        } finally {
            btnGerarDRE.disabled = false;
            btnGerarDRE.textContent = "Gerar Relatório DRE";
        }
    });

    // --- NOVO: Listener do Botão Produtos ---
    btnGerarProdutos.addEventListener('click', executarRelatorioProdutos);
    // --- NOVO: Listener do Botão Stock ---
    btnGerarStock.addEventListener('click', executarRelatorioStockBaixo);

    // --- INICIALIZAÇÃO ---
    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    inputDataInicio.value = inicioDoMes.toISOString().split('T')[0];
    inputDataFim.value = hoje.toISOString().split('T')[0];
});