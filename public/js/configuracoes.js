document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';

    // --- ELEMENTOS DO DOM ---
    const form = document.getElementById('form-configuracoes');
    const feedbackAlert = document.getElementById('feedback-alert');

    // Inputs do formulário (Ids batendo com o HTML novo)
    const inputNomeFantasia = document.getElementById('config-nome-fantasia');
    const inputRazaoSocial = document.getElementById('config-razao-social');
    const inputCnpjCpf = document.getElementById('config-cnpj-cpf');
    const inputEndereco = document.getElementById('config-endereco');
    const inputTelefone = document.getElementById('config-telefone');
    const inputEmail = document.getElementById('config-email');

    // Botões de Backup
    const btnBackup = document.getElementById('btn-backup');
    const btnRestore = document.getElementById('btn-restore');
    const inputRestore = document.getElementById('input-restore');

    // --- FUNÇÃO AUXILIAR DE ALERTA ---
    const showAlert = (message, isSuccess = true) => {
        if (!feedbackAlert) return;
        feedbackAlert.textContent = message;
        // Classes do Tailwind para sucesso (verde) ou erro (vermelho)
        feedbackAlert.className = `p-4 mb-6 rounded-lg font-bold text-center shadow-sm ${
            isSuccess ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`;
        feedbackAlert.classList.remove('hidden');
        
        // Some após 4 segundos
        setTimeout(() => { 
            feedbackAlert.classList.add('hidden'); 
        }, 4000);
    };

    // --- 1. CARREGAR DADOS DA EMPRESA ---
    const carregarDadosEmpresa = async () => {
        try {
            const response = await fetch(`${API_URL}/empresa`);
            if (!response.ok) throw new Error('Não foi possível carregar os dados.');
            
            const empresa = await response.json();

            // Preenche os campos se houver dados
            inputNomeFantasia.value = empresa.nome_fantasia || '';
            inputRazaoSocial.value = empresa.razao_social || '';
            inputCnpjCpf.value = empresa.cnpj_cpf || '';
            inputEndereco.value = empresa.endereco || '';
            inputTelefone.value = empresa.telefone || '';
            inputEmail.value = empresa.email || '';

        } catch (error) {
            console.warn("Aviso: " + error.message);
            // Não exibimos alert de erro no carregamento inicial para não assustar se for o primeiro acesso
        }
    };

    // --- 2. SALVAR DADOS (SUBMIT) ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSalvar = form.querySelector('button[type="submit"]');
        const textoOriginal = btnSalvar.innerText;
        btnSalvar.innerText = "Salvando...";
        btnSalvar.disabled = true;

        const dadosEmpresa = {
            nome_fantasia: inputNomeFantasia.value,
            razao_social: inputRazaoSocial.value,
            cnpj_cpf: inputCnpjCpf.value,
            endereco: inputEndereco.value,
            telefone: inputTelefone.value,
            email: inputEmail.value
        };

        try {
            // Tenta criar ou atualizar (PUT é mais comum para update total)
            const response = await fetch(`${API_URL}/empresa`, {
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosEmpresa)
            });

            if (!response.ok) throw new Error('Erro ao salvar configurações.');

            showAlert('Dados da empresa salvos com sucesso!', true);

        } catch (error) {
            console.error(error);
            showAlert('Erro ao salvar: Verifique se o servidor está rodando.', false);
        } finally {
            btnSalvar.innerText = textoOriginal;
            btnSalvar.disabled = false;
        }
    });

    // --- 3. LÓGICA DE BACKUP (DOWNLOAD) ---
    if (btnBackup) {
        btnBackup.addEventListener('click', () => {
            // Cria um link invisível para forçar o download do arquivo .sqlite
            const link = document.createElement('a');
            link.href = `${API_URL}/backup/download`;
            link.download = `Backup_Oficina_${new Date().toISOString().split('T')[0]}.sqlite`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showAlert('Backup iniciado! Verifique seus downloads.', true);
        });
    }

    // --- 4. LÓGICA DE RESTAURAR (UPLOAD) ---
    if (btnRestore && inputRestore) {
        // Passo A: Clicar no botão aciona o input de arquivo escondido
        btnRestore.addEventListener('click', () => {
            if (confirm("ATENÇÃO PERIGO ⚠️\n\nIsso irá APAGAR todos os dados atuais (clientes, vendas, financeiro) e substituir pelo arquivo que você enviar.\n\nTem certeza absoluta?")) {
                inputRestore.click();
            }
        });

        // Passo B: Quando o arquivo é selecionado
        inputRestore.addEventListener('change', async () => {
            const file = inputRestore.files[0];
            if (!file) return;

            const btnTextoOriginal = btnRestore.innerText;
            btnRestore.innerText = "⏳ Restaurando...";
            btnRestore.disabled = true;

            try {
                const response = await fetch(`${API_URL}/backup/restore`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream' // Envia como binário
                    },
                    body: file
                });

                if (!response.ok) throw new Error("Falha na restauração.");

                alert("Sucesso! O sistema foi restaurado.\nA página será recarregada agora.");
                window.location.reload(); 

            } catch (error) {
                console.error(error);
                showAlert("Erro crítico ao restaurar backup.", false);
                btnRestore.innerText = btnTextoOriginal;
                btnRestore.disabled = false;
            }
        });
    }

    // Inicializa
    carregarDadosEmpresa();
});