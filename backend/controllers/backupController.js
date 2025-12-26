// backend/controllers/backupController.js
const path = require('path');
const fs = require('fs');
const os = require('os'); // <--- Importante: Módulo para pegar dados do sistema

const realizarBackup = (req, res) => {
    
    // Pega a pasta do usuário atual
    const homeDir = os.homedir(); 

    // Lista de locais possíveis onde o banco de dados pode estar
    const caminhosPossiveis = [
        // 1. Padrão: Na raiz do projeto (relativo a este arquivo)
        path.resolve(__dirname, '../../database.sqlite'),
        
        // 2. Fallback: Na pasta backend
        path.resolve(__dirname, '../database.sqlite'),
        
        // 3. Diretório atual de execução
        path.join(process.cwd(), 'database.sqlite'),
        
        // 4. CAMINHO CORRIGIDO (Dinâmico para qualquer usuário)
        // Isso vai gerar: C:\Users\[NOME_DO_USUARIO]\Documents\GerenciadorOficina\database.sqlite
        path.join(homeDir, 'Documents', 'GerenciadorOficina', 'database.sqlite'),

        // 5. (Opcional) Tenta na pasta de Documentos padrão em inglês, caso o windows esteja em inglês
        path.join(homeDir, 'My Documents', 'GerenciadorOficina', 'database.sqlite')
    ];

    console.log("--- INICIANDO BACKUP ---");
    let dbPath = null;

    // Procura o primeiro caminho que realmente existe
    for (const caminho of caminhosPossiveis) {
        // console.log(`Verificando: ${caminho}`); // Pode descomentar para debug
        if (fs.existsSync(caminho)) {
            dbPath = caminho;
            console.log(`SUCCESS: Banco encontrado em: ${dbPath}`);
            break;
        }
    }

    if (!dbPath) {
        console.error("ERRO: Banco de dados não encontrado em nenhum dos locais.");
        return res.status(404).json({ message: "Arquivo de banco de dados não encontrado." });
    }

    const dataHoje = new Date().toISOString().split('T')[0];
    const nomeArquivo = `Backup_Oficina_${dataHoje}.sqlite`;

    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.setHeader('Content-Type', 'application/x-sqlite3');

    res.download(dbPath, nomeArquivo, (err) => {
        if (err) {
            console.error("Erro no download:", err);
            if (!res.headersSent) res.status(500).send("Erro ao baixar arquivo.");
        }
    });
};
const restaurarBackup = (req, res) => {
    const os = require('os');
    const homeDir = os.homedir();
    
    // Caminho oficial onde o banco deve ficar
    const dbPath = path.join(homeDir, 'Documents', 'GerenciadorOficina', 'database.sqlite');
    
    // Cria a pasta se não existir (segurança)
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    // O arquivo vem no corpo da requisição (req.body) como um Buffer
    // Nota: Precisamos garantir que o express.raw() esteja configurado no server.js para isso funcionar
    const arquivoBuffer = req.body;

    if (!arquivoBuffer || arquivoBuffer.length === 0) {
        return res.status(400).json({ message: "Nenhum arquivo enviado ou arquivo vazio." });
    }

    try {
        // 1. (Opcional) Cria um backup de segurança do atual antes de substituir
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, dbPath + '.temp_bak');
        }

        // 2. Sobrescreve o banco de dados
        fs.writeFileSync(dbPath, arquivoBuffer);
        
        console.log("Banco de dados restaurado com sucesso em:", dbPath);
        res.json({ message: "Backup restaurado! O sistema precisa ser reiniciado." });

    } catch (err) {
        console.error("Erro ao restaurar:", err);
        // Tenta recuperar o backup temporário se algo deu errado
        if (fs.existsSync(dbPath + '.temp_bak')) {
            fs.copyFileSync(dbPath + '.temp_bak', dbPath);
        }
        res.status(500).json({ message: "Erro ao gravar o arquivo de banco de dados." });
    }
};

module.exports = { realizarBackup, restaurarBackup };