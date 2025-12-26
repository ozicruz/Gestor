document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3002/api';
    const form = document.getElementById('form-nova-conta');
    const listaCorpo = document.getElementById('lista-contas-corpo');

    const carregarContas = async () => {
        try {
            const res = await fetch(`${API_URL}/financeiro/contascaixa`);
            const contas = await res.json();
            
            listaCorpo.innerHTML = '';
            if(contas.length === 0) {
                listaCorpo.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-400">Nenhuma conta cadastrada.</td></tr>';
                return;
            }

            contas.forEach(c => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="p-3 font-medium text-gray-800">${c.Nome}</td>
                    <td class="p-3 text-right text-green-600 font-bold">R$ ${c.Saldo.toFixed(2)}</td>
                    <td class="p-3 text-center">
                        <button onclick="removerConta(${c.id})" class="text-red-500 hover:text-red-700 font-bold" title="Remover">&times;</button>
                    </td>
                `;
                listaCorpo.appendChild(tr);
            });
        } catch (error) {
            console.error("Erro ao carregar contas:", error);
        }
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('conta-nome').value;
        const saldo = document.getElementById('conta-saldo').value;

        try {
            const res = await fetch(`${API_URL}/financeiro/contascaixa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, saldoInicial: saldo })
            });

            if (res.ok) {
                alert("Conta criada!");
                form.reset();
                carregarContas();
            } else {
                alert("Erro ao criar conta.");
            }
        } catch (error) {
            console.error(error);
        }
    });

    window.removerConta = async (id) => {
        if(confirm("Tem certeza? O histórico financeiro pode ser afetado.")) {
            try {
                const res = await fetch(`${API_URL}/financeiro/contascaixa/${id}`, { method: 'DELETE' });
                if(res.ok) carregarContas();
                else alert("Não foi possível remover (talvez seja o caixa principal).");
            } catch (e) { console.error(e); }
        }
    };

    carregarContas();
});