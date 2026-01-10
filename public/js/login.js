document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-login');
    const msgErro = document.getElementById('msg-erro');
    const API_URL = 'http://localhost:3002/api';

    // Se já estiver logado, vai direto para o menu
    if (localStorage.getItem('usuario_logado')) {
        window.location.href = 'index.html';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const login = document.getElementById('login').value.trim();
        const senha = document.getElementById('senha').value.trim();
        const btn = form.querySelector('button');

        // Feedback visual
        btn.disabled = true;
        btn.innerHTML = 'Verificando...';
        msgErro.classList.add('hidden');

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, senha })
            });

            const data = await response.json();

            if (response.ok && data.sucesso) {
                // SALVA O USUÁRIO NO ARMAZENAMENTO LOCAL
                localStorage.setItem('usuario_logado', JSON.stringify(data.usuario));
                
                // Redireciona para o menu principal
                window.location.href = 'index.html';
            } else {
                throw new Error(data.message || 'Erro de autenticação');
            }

        } catch (error) {
            msgErro.textContent = error.message;
            msgErro.classList.remove('hidden');
            btn.disabled = false;
            btn.innerHTML = 'ENTRAR';
            document.getElementById('senha').value = '';
            document.getElementById('senha').focus();
        }
    });
});