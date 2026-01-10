document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3002/api';
    let listaUsuarios = [];
    let usuarioEditando = null;
    let filtroAtual = 'todos';

    // Referências DOM
    const modal = document.getElementById('modal-usuario');
    const modalFolha = document.getElementById('modal-folha');
    const form = document.getElementById('form-usuario');
    const formFolha = document.getElementById('form-folha');
    const tbody = document.getElementById('lista-usuarios');
    const checkAdmin = document.getElementById('is_admin');
    const areaPermissoes = document.getElementById('area-permissoes');

    // --- Helpers ---
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    const safeNumber = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        return parseFloat(val.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
    };
    const getInitials = (name) => {
        if (!name) return 'U';
        const names = name.split(' ');
        let initials = names[0].substring(0, 1).toUpperCase();
        if (names.length > 1) initials += names[names.length - 1].substring(0, 1).toUpperCase();
        return initials;
    };
    const getAvatarColor = (name) => {
        const colors = ['bg-red-100 text-red-600', 'bg-green-100 text-green-600', 'bg-blue-100 text-blue-600', 'bg-yellow-100 text-yellow-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600'];
        let hash = 0;
        if (name) for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    // --- Filtros ---
    window.filtrarStatus = (status) => {
        filtroAtual = status;
        atualizarBotoesFiltro();
        renderizar();
    };

    const atualizarBotoesFiltro = () => {
        const botoes = { 'todos': document.getElementById('btn-todos'), 'ativos': document.getElementById('btn-ativos'), 'ferias': document.getElementById('btn-ferias') };
        const classeAtivo = ['bg-white', 'text-slate-800', 'font-bold', 'shadow-sm'];
        const classeInativo = ['text-slate-500', 'hover:text-slate-700', 'bg-transparent', 'shadow-none'];
        Object.keys(botoes).forEach(chave => {
            const btn = botoes[chave];
            if (!btn) return;
            if (chave === filtroAtual) { btn.classList.add(...classeAtivo); btn.classList.remove('bg-transparent', 'text-slate-500', 'shadow-none'); } 
            else { btn.classList.add(...classeInativo); btn.classList.remove('bg-white', 'text-slate-800', 'font-bold', 'shadow-sm'); }
        });
    };

    // --- Core ---
    const carregarUsuarios = async () => {
        try {
            const res = await fetch(`${API_URL}/usuarios`);
            listaUsuarios = await res.json();
            calcularKPIs();
            renderizar();
        } catch(e) { console.error(e); }
    };

    const renderizar = () => {
        tbody.innerHTML = '';
        const termo = document.getElementById('busca') ? document.getElementById('busca').value.toLowerCase() : '';
        const filtrados = listaUsuarios.filter(u => {
            const matchTexto = u.nome.toLowerCase().includes(termo) || (u.cargo && u.cargo.toLowerCase().includes(termo)) || (u.email && u.email.toLowerCase().includes(termo));
            let matchStatus = true;
            if (filtroAtual === 'ativos') matchStatus = (u.status === 'ATIVO');
            else if (filtroAtual === 'ferias') matchStatus = (u.status === 'FERIAS');
            return matchTexto && matchStatus;
        });

        if (filtrados.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">Nenhum colaborador encontrado.</td></tr>`; return; }

        filtrados.forEach(u => {
            const avatarColor = getAvatarColor(u.nome);
            const iniciais = getInitials(u.nome);
            const cargo = u.cargo || '<span class="italic text-gray-400">Não definido</span>';
            const email = u.email || '<span class="text-gray-300 text-xs">Sem email</span>';
            let statusBadge = u.status === 'ATIVO' ? '<span class="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">Ativo</span>' : u.status === 'FERIAS' ? '<span class="bg-yellow-50 text-yellow-800 px-2 py-1 rounded text-xs">Férias</span>' : '<span class="bg-gray-50 text-gray-600 px-2 py-1 rounded text-xs">Off</span>';
            const dataAdmissao = u.data_admissao ? new Date(u.data_admissao).toLocaleDateString('pt-BR') : '-';

            // VISUALIZAÇÃO DE COMISSÃO HÍBRIDA
            let infoComissao = '';
            if(u.comissao_produto > 0) infoComissao += `<div class="text-xs text-blue-600 font-bold">Prod: ${u.comissao_produto}%</div>`;
            if(u.comissao_servico > 0) infoComissao += `<div class="text-xs text-purple-600 font-bold">Serv: ${u.comissao_servico}%</div>`;
            if(!infoComissao) infoComissao = '<span class="text-xs text-gray-400">Sem comissão</span>';

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 border-b border-gray-100 last:border-0">
                    <td class="p-4"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${avatarColor}">${iniciais}</div><div><div class="font-semibold text-slate-800">${u.nome}</div><div class="text-xs text-slate-500">${email}</div></div></div></td>
                    <td class="p-4"><div class="text-sm font-medium">${cargo}</div><div class="mt-1">${statusBadge}</div></td>
                    <td class="p-4 text-sm text-slate-600">${dataAdmissao}</td>
                    <td class="p-4 text-right">
                        <div class="font-medium text-slate-700">${formatCurrency(u.salario)}</div>
                        <div class="flex flex-col items-end gap-0.5 mt-1">${infoComissao}</div>
                    </td>
                    <td class="p-4 text-center">${u.is_admin ? '<span class="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded">ADMIN</span>' : '<span class="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">USER</span>'}</td>
                    <td class="p-4 text-right"><div class="flex justify-end gap-2"><button onclick="editarUsuario(${u.id})" class="p-2 text-blue-600 hover:bg-blue-100 rounded">✏️</button><button onclick="excluirUsuario(${u.id})" class="p-2 text-red-600 hover:bg-red-100 rounded">🗑️</button></div></td>
                </tr>`;
        });
    };

    const calcularKPIs = () => {
        if (!listaUsuarios.length) return;
        const ativos = listaUsuarios.filter(u => u.status !== 'DESLIGADO');
        const custoTotal = ativos.reduce((acc, curr) => acc + (curr.salario || 0), 0);
        document.getElementById('kpi-total').innerText = ativos.length;
        document.getElementById('kpi-custo').innerText = formatCurrency(custoTotal);
        document.getElementById('kpi-media').innerText = formatCurrency(ativos.length ? custoTotal/ativos.length : 0);
        document.getElementById('kpi-admins').innerText = ativos.filter(u => u.is_admin).length;
    };

    // --- Modal Usuario ---
    checkAdmin.addEventListener('change', () => {
        if(checkAdmin.checked) { areaPermissoes.classList.add('opacity-50', 'pointer-events-none'); document.querySelectorAll('input[name="perm"]').forEach(c => c.checked = true); } 
        else { areaPermissoes.classList.remove('opacity-50', 'pointer-events-none'); }
    });
    window.filtrarTabela = renderizar;
    window.abrirModalUsuario = () => { usuarioEditando = null; form.reset(); document.getElementById('titulo-modal').textContent = "Novo Colaborador"; document.getElementById('usuario-id').value = ''; checkAdmin.checked = false; modal.classList.remove('hidden'); };
    window.fecharModal = () => modal.classList.add('hidden');
    
    window.editarUsuario = (id) => {
        const u = listaUsuarios.find(x => x.id === id);
        if(!u) return;
        usuarioEditando = u.id;
        document.getElementById('usuario-id').value = u.id;
        document.getElementById('nome').value = u.nome;
        document.getElementById('cargo').value = u.cargo || '';
        document.getElementById('email').value = u.email || '';
        document.getElementById('telefone').value = u.telefone || '';
        document.getElementById('status').value = u.status || 'ATIVO';
        document.getElementById('data_admissao').value = u.data_admissao ? u.data_admissao.split('T')[0] : '';
        document.getElementById('salario').value = u.salario || '';
        // Novos campos
        document.getElementById('comissao_produto').value = u.comissao_produto || '';
        document.getElementById('comissao_servico').value = u.comissao_servico || '';
        
        document.getElementById('login').value = u.login;
        document.getElementById('is_admin').checked = !!u.is_admin;
        document.querySelectorAll('input[name="perm"]').forEach(chk => chk.checked = (u.permissoes||[]).includes(chk.value));
        document.getElementById('titulo-modal').textContent = `Editar: ${u.nome}`;
        checkAdmin.dispatchEvent(new Event('change'));
        modal.classList.remove('hidden');
    };

    window.excluirUsuario = async (id) => { if(confirm("Tem certeza?")) { await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' }); carregarUsuarios(); } };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const perms = [];
        if(!checkAdmin.checked) document.querySelectorAll('input[name="perm"]:checked').forEach(chk => perms.push(chk.value)); else perms.push('tudo');
        const dados = {
            nome: document.getElementById('nome').value, cargo: document.getElementById('cargo').value, email: document.getElementById('email').value, telefone: document.getElementById('telefone').value, status: document.getElementById('status').value, data_admissao: document.getElementById('data_admissao').value,
            salario: safeNumber(document.getElementById('salario').value), 
            comissao_produto: parseFloat(document.getElementById('comissao_produto').value) || 0,
            comissao_servico: parseFloat(document.getElementById('comissao_servico').value) || 0,
            login: document.getElementById('login').value, senha: document.getElementById('senha').value, is_admin: checkAdmin.checked, permissoes: perms
        };
        const url = usuarioEditando ? `${API_URL}/usuarios/${usuarioEditando}` : `${API_URL}/usuarios`;
        await fetch(url, { method: usuarioEditando ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
        fecharModal(); carregarUsuarios();
    });

    // --- NOVA LÓGICA: FOLHA DE PAGAMENTO SEMANAL/MENSAL ---
    // --- LÓGICA DE FOLHA COM PREVIEW ---
    
    window.abrirModalFolha = async () => {
        // Reseta o modal
        document.getElementById('area-preview-folha').classList.add('hidden');
        document.getElementById('area-confirmacao-folha').classList.add('hidden');
        document.getElementById('tbody-preview-folha').innerHTML = '';
        
        try {
            const res = await fetch(`${API_URL}/financeiro/contas`);
            const contas = await res.json();
            const select = document.getElementById('folha_conta_id');
            select.innerHTML = '<option value="">-- Selecione o Caixa --</option>';
            contas.forEach(c => select.innerHTML += `<option value="${c.id}">${c.Nome} (Saldo: ${formatCurrency(c.Saldo)})</option>`);
            
            const hoje = new Date();
            const semanaPassada = new Date(); 
            semanaPassada.setDate(hoje.getDate() - 7);

            document.getElementById('data_inicio_folha').value = semanaPassada.toISOString().split('T')[0];
            document.getElementById('data_fim_folha').value = hoje.toISOString().split('T')[0];
            document.getElementById('data_pagamento').value = hoje.toISOString().split('T')[0];
            
            modalFolha.classList.remove('hidden');
        } catch(e) { alert("Erro ao carregar contas."); }
    };

    window.fecharModalFolha = () => modalFolha.classList.add('hidden');

    // BOTÃO SIMULAR
    document.getElementById('btn-simular-folha').addEventListener('click', async () => {
        const dI = document.getElementById('data_inicio_folha').value;
        const dF = document.getElementById('data_fim_folha').value;
        if(!dI || !dF) return alert("Selecione as datas.");

        try {
            const res = await fetch(`${API_URL}/usuarios/gerar-folha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data_inicio: dI, data_fim: dF, preview: true })
            });
            const data = await res.json();
            
            const tbody = document.getElementById('tbody-preview-folha');
            tbody.innerHTML = '';
            
            if(data.resumo.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Nenhum valor a pagar neste período.</td></tr>';
            } else {
                data.resumo.forEach(r => {
                    const comissaoTotal = r.comissao_prod + r.comissao_serv;
                    const tooltip = `Prod: ${formatCurrency(r.vendas_prod)} (${formatCurrency(r.comissao_prod)})\nServ: ${formatCurrency(r.vendas_serv)} (${formatCurrency(r.comissao_serv)})`;
                    
                    tbody.innerHTML += `
                        <tr class="border-b">
                            <td class="p-3 font-medium">${r.nome}</td>
                            <td class="p-3 text-right text-gray-600">${formatCurrency(r.fixo)}</td>
                            <td class="p-3 text-right text-blue-600 cursor-help" title="${tooltip}">${formatCurrency(comissaoTotal)}</td>
                            <td class="p-3 text-right font-bold text-green-700">${formatCurrency(r.total)}</td>
                        </tr>
                    `;
                });
            }
            
            document.getElementById('total-preview-folha').textContent = formatCurrency(data.total_geral);
            document.getElementById('area-preview-folha').classList.remove('hidden');
            
            if(data.total_geral > 0) {
                document.getElementById('area-confirmacao-folha').classList.remove('hidden');
            }

        } catch(e) { alert("Erro ao simular."); }
    });

    // BOTÃO CONFIRMAR
    formFolha.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            data_inicio: document.getElementById('data_inicio_folha').value,
            data_fim: document.getElementById('data_fim_folha').value,
            data_pagamento: document.getElementById('data_pagamento').value,
            conta_caixa_id: document.getElementById('folha_conta_id').value,
            status_lancamento: document.getElementById('status_lancamento').value,
            preview: false // Agora é pra valer
        };

        if(payload.status_lancamento === 'PAGO' && !payload.conta_caixa_id) return alert("Selecione a Conta de Saída.");

        try {
            const res = await fetch(`${API_URL}/usuarios/gerar-folha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if(res.ok) { alert(data.message); fecharModalFolha(); }
            else alert("Erro: " + data.message);
        } catch(e) { alert("Erro de conexão."); } 
    });

    carregarUsuarios();
});