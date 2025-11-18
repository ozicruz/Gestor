// public/js/gestao_patio.js

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';

    // --- FUNÇÕES ---
    const renderizarPatio = async () => {
        const grid = document.getElementById('patio-grid');
        try {
            const response = await fetch(`${API_URL}/patio`);
            if (!response.ok) throw new Error('Não foi possível carregar os dados do pátio.');

            const veiculos = await response.json();
            grid.innerHTML = ''; // Limpa a grelha

            if (veiculos.length === 0) {
                grid.innerHTML = `<p class="col-span-full text-center text-gray-500 mt-8">Não há veículos no pátio com Ordens de Serviço ativas.</p>`;
                return;
            }

            veiculos.forEach(v => {
                const dataEntrada = new Date(v.data_entrada).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const card = document.createElement('div');
                card.className = 'bg-white rounded-lg shadow p-5 flex flex-col justify-between';
                card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-start">
                            <span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">${v.status}</span>
                            <span class="text-sm font-medium text-gray-500">OS #${v.id}</span>
                        </div>
                        <div class="mt-4 text-center">
                            <p class="text-3xl font-bold text-gray-800 tracking-wider">${v.placa}</p>
                            <p class="text-gray-600">${v.marca || ''} ${v.modelo || ''}</p>
                        </div>
                    </div>
                    <div class="mt-5 border-t pt-3 text-sm">
                        <p><strong>Cliente:</strong> ${v.cliente_nome}</p>
                        <p><strong>Entrada:</strong> ${dataEntrada}</p>
                    </div>
                `;
                grid.appendChild(card);
            });

        } catch (error) {
            grid.innerHTML = `<p class="col-span-full text-center text-red-500">${error.message}</p>`;
        }
    };

    // --- INICIALIZAÇÃO ---
    renderizarPatio();
});
