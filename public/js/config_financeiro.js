document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3002/api';
    const form = document.getElementById('form-nova-conta');
    const listaCorpo = document.getElementById('lista-contas-corpo');

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(val) || 0);

    const carregarContas = async () => {
        try {
            // CORRIGIDO: Rota /financeiro/contascaixa
            const res = await fetch(`${API_URL}/financeiro/contascaixa`);
            if(!res.ok) throw new Error("Erro API");
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
                    <td class="p-3 text-right text-green-600 font-bold">${formatCurrency(c.Saldo)}</td>
                    <td class="p-3 text-center">
                        <button onclick="removerConta(${c.id})" class="text-red-500 hover:text-red-700 font-bold px-2" title="Remover">🗑️</button>
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
        const btn = form.querySelector('button');
        btn.disabled = true; btn.innerText = "...";

        const nome = document.getElementById('conta-nome').value;
        const saldo = document.getElementById('conta-saldo').value;

        try {
            const res = await fetch(`${API_URL}/financeiro/contascaixa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // CORRIGIDO: Envia 'saldo_inicial' para bater com o controller
                body: JSON.stringify({ 
                    nome: nome, 
                    saldo_inicial: parseFloat(saldo) || 0 
                })
            });

            if (res.ok) {
                alert("Conta criada!");
                form.reset();
                carregarContas();
            } else {
                const err = await res.json();
                alert("Erro: " + err.message);
            }
        } catch (error) {
            alert("Erro de conexão.");
        } finally {
            btn.disabled = false; btn.innerText = "+ Cadastrar Conta";
        }
    });

    window.removerConta = async (id) => {
        if(confirm("Tem certeza?")) {
            try {
                const res = await fetch(`${API_URL}/financeiro/contascaixa/${id}`, { method: 'DELETE' });
                if(res.ok) carregarContas();
                else alert("Não foi possível remover.");
            } catch (e) { alert("Erro de conexão."); }
        }
    };

    carregarContas();
});