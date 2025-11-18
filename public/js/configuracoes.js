// public/js/configuracoes.js

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:3002/api';

    // --- ELEMENTOS DO DOM ---
    const form = document.getElementById('form-configuracoes');
    const feedbackAlert = document.getElementById('feedback-alert');

    // Inputs do formulário
    const inputNomeFantasia = document.getElementById('config-nome-fantasia');
    const inputRazaoSocial = document.getElementById('config-razao-social');
    const inputCnpjCpf = document.getElementById('config-cnpj-cpf');
    const inputEndereco = document.getElementById('config-endereco');
    const inputTelefone = document.getElementById('config-telefone');
    const inputEmail = document.getElementById('config-email');

    // --- FUNÇÃO AUXILIAR ---
    const showAlert = (message, isSuccess = true) => {
        if (!feedbackAlert) return;
        feedbackAlert.textContent = message;
        feedbackAlert.className = `feedback-alert p-4 mb-4 text-sm rounded-lg ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
        feedbackAlert.style.display = 'block';
        setTimeout(() => { feedbackAlert.style.display = 'none'; }, 4000);
    };

    // --- 1. FUNÇÃO DE CARREGAMENTO (GET) ---
    // (Busca os dados da empresa na API e preenche o formulário)
    const carregarDadosEmpresa = async () => {
        try {
            const response = await fetch(`${API_URL}/empresa`);
            if (!response.ok) {
                throw new Error('Erro ao buscar dados da empresa.');
            }
            const empresa = await response.json();

            // Preenche o formulário com os dados
            inputNomeFantasia.value = empresa.nome_fantasia || '';
            inputRazaoSocial.value = empresa.razao_social || '';
            inputCnpjCpf.value = empresa.cnpj_cpf || '';
            inputEndereco.value = empresa.endereco || '';
            inputTelefone.value = empresa.telefone || '';
            inputEmail.value = empresa.email || '';

        } catch (error) {
            showAlert(error.message, false);
        }
    };

    // --- 2. FUNÇÃO DE SUBMISSÃO (PUT) ---
    // (Envia os dados do formulário para a API para salvar)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Pega os dados do formulário
        const dadosEmpresa = {
            nome_fantasia: inputNomeFantasia.value,
            razao_social: inputRazaoSocial.value,
            cnpj_cpf: inputCnpjCpf.value,
            endereco: inputEndereco.value,
            telefone: inputTelefone.value,
            email: inputEmail.value
        };

        try {
            const response = await fetch(`${API_URL}/empresa`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosEmpresa)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message);
            }

            showAlert('Dados da empresa salvos com sucesso!', true);

        } catch (error) {
            showAlert(error.message, false);
        }
    });

    // --- 3. INICIALIZAÇÃO ---
    // (Chama a função de carregamento assim que a página abre)
    carregarDadosEmpresa();
});