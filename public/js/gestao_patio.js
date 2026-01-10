document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3002/api';

    // Elementos das colunas
    const colTriagem = document.getElementById('col-triagem');
    const colServico = document.getElementById('col-servico');
    const colPronto = document.getElementById('col-pronto');

    // Contadores
    const countTriagem = document.getElementById('count-triagem');
    const countServico = document.getElementById('count-servico');
    const countPronto = document.getElementById('count-pronto');

    // Função Principal
    window.renderizarPatio = async () => {
        try {
            const response = await fetch(`${API_URL}/patio`);
            if (!response.ok) throw new Error('Erro ao carregar pátio');
            const veiculos = await response.json();

            // Limpa colunas
            colTriagem.innerHTML = '';
            colServico.innerHTML = '';
            colPronto.innerHTML = '';

            let c1 = 0, c2 = 0, c3 = 0;

            // Ordena por data (Antigos primeiro)
            veiculos.sort((a, b) => new Date(a.data_entrada) - new Date(b.data_entrada));

            if (veiculos.length === 0) {
                const msgVazio = '<p class="text-gray-400 text-center text-sm mt-4 italic">Nenhum veículo.</p>';
                colTriagem.innerHTML = msgVazio;
                colServico.innerHTML = msgVazio;
                colPronto.innerHTML = msgVazio;
                return;
            }

            veiculos.forEach(v => {
                const status = (v.status || '').toLowerCase();

                // FILTRO DE SAÍDA:
                // Se já foi faturada/finalizada, o cliente já retirou. Não mostrar no pátio.
                if (status.includes('finalizada') || status.includes('faturada') || status.includes('retirada') || status.includes('concluída')) {
                    return; 
                }

                const card = criarCard(v);

                // LÓGICA DAS COLUNAS:
                
                // Coluna 3: APENAS "Pronto" (Carro pronto para entrega)
                if (status === 'pronto') {
                    colPronto.appendChild(card);
                    c3++;
                } 
                // Coluna 2: Em Andamento (Na Rampa)
                else if (status.includes('andamento') || status.includes('serviço')) {
                    colServico.appendChild(card);
                    c2++;
                }
                // Coluna 1: Triagem / Orçamento / Aguardando Peças (Resto)
                else {
                    colTriagem.appendChild(card);
                    c1++;
                }
            });

            // Atualiza badges com os totais
            countTriagem.innerText = c1;
            countServico.innerText = c2;
            countPronto.innerText = c3;

        } catch (error) {
            console.error(error);
        }
    };

    // Cria o HTML do Card com Cores Dinâmicas
    function criarCard(v) {
        const div = document.createElement('div');
        div.className = 'bg-white p-4 rounded-lg shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-all transform hover:-translate-y-1 mb-3';
        
        const status = (v.status || 'Orçamento').toLowerCase();
        
        // --- CORES VISUAIS ---
        let borderClass = 'border-gray-400';
        let badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';

        if (status.includes('orçamento')) {
            borderClass = 'border-yellow-400';
            badgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        } else if (status.includes('aguardando')) {
            borderClass = 'border-orange-400';
            badgeClass = 'bg-orange-100 text-orange-800 border-orange-200';
        } else if (status.includes('andamento')) {
            borderClass = 'border-blue-500';
            badgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
        } else if (status === 'pronto') {
            borderClass = 'border-teal-500'; 
            badgeClass = 'bg-teal-100 text-teal-800 border-teal-200 font-bold';
        }

        div.classList.add(borderClass.split(' ')[0]);

        // Detectar Ícone
        const modelo = (v.modelo || '').toLowerCase();
        const marca = (v.marca || '').toLowerCase();
        const palavrasMoto = ['honda', 'yamaha', 'suzuki', 'kawasaki', 'titan', 'fan', 'biz', 'bros', 'fazer', 'cb', 'xre', 'pcx', 'scooter', 'moto'];
        const isMoto = palavrasMoto.some(p => modelo.includes(p) || marca.includes(p));
        const icone = isMoto ? '🏍️' : '🚗';

        // Data formatada
        const dataEntrada = new Date(v.data_entrada);
        const diasNoPatio = Math.floor((new Date() - dataEntrada) / (1000 * 60 * 60 * 24));
        const textoTempo = diasNoPatio === 0 ? 'Hoje' : `${diasNoPatio}d`;
        const corTempo = diasNoPatio > 7 ? 'text-red-600 font-bold' : 'text-gray-400';

        div.innerHTML = `
            <div onclick="window.location.href='gestao_os.html?id=${v.id}'">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">OS #${v.id}</span>
                    <div class="flex items-center gap-1 ${corTempo}" title="Tempo no pátio">
                        <span class="text-[10px]">🕒</span>
                        <span class="text-[10px]">${textoTempo}</span>
                    </div>
                </div>
                
                <h3 class="text-base font-bold text-gray-800 leading-tight uppercase truncate" title="${v.placa}">${v.placa}</h3>
                <p class="text-xs text-gray-600 flex items-center gap-1 mt-0.5 truncate">
                    ${icone} <span class="truncate">${v.modelo || 'Veículo'}</span>
                </p>
                
                <p class="text-xs text-gray-400 mt-2 truncate">👤 ${v.cliente_nome || 'Consumidor'}</p>

                <div class="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center">
                    <span class="text-[10px] px-2 py-0.5 rounded border uppercase ${badgeClass}">${v.status}</span>
                    <span class="text-[10px] text-gray-400">${dataEntrada.toLocaleDateString('pt-BR')}</span>
                </div>
            </div>
        `;
        return div;
    }

    renderizarPatio();
});