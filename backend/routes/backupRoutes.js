const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');

// IMPORTANTE: Importamos o inicializador para rodar após o restore
// Certifique-se que o caminho '../database/database_initializer' está correto baseada na sua estrutura de pastas
const { initializeDatabase } = require('../database/database_initializer');

// Define o caminho do banco (mesma lógica do database.js)
const dbFolder = path.join(os.homedir(), 'Documents', 'GerenciadorOficina');
const dbPath = path.join(dbFolder, 'database.sqlite');

// --- ROTA DE DOWNLOAD (BACKUP) ---
router.get('/download', (req, res) => {
    try {
        if (fs.existsSync(dbPath)) {
            const dataAtual = new Date().toISOString().split('T')[0];
            res.download(dbPath, `Backup_Oficina_${dataAtual}.sqlite`);
        } else {
            res.status(404).json({ message: "Banco de dados não encontrado para backup." });
        }
    } catch (error) {
        console.error("Erro no backup:", error);
        res.status(500).json({ message: "Erro ao gerar backup." });
    }
});

// --- ROTA DE RESTORE (RESTAURAÇÃO) ---
router.post('/restore', async (req, res) => {
    try {
        // O corpo da requisição é o arquivo binário (graças ao express.raw no server.js)
        const fileBuffer = req.body;

        if (!fileBuffer || fileBuffer.length === 0) {
            return res.status(400).json({ message: "Arquivo inválido ou vazio." });
        }

        // 1. Sobrescreve o banco atual com o arquivo enviado (Backup Antigo)
        fs.writeFileSync(dbPath, fileBuffer);
        console.log("♻️  Arquivo de banco substituído pelo backup.");

        // 2. A MÁGICA: Força a atualização da estrutura imediatamente
        // Isso vai pegar o banco antigo que acabou de ser colado e criar
        // as tabelas 'Usuarios', colunas de juros, etc. que faltam nele.
        console.log("🛠️  Atualizando estrutura do banco restaurado...");
        await initializeDatabase(); 

        console.log("✅ Restauração e Migração concluídas com sucesso!");
        res.status(200).json({ message: "Dados restaurados e atualizados para a versão mais recente com sucesso." });

    } catch (error) {
        console.error("Erro crítico na restauração:", error);
        
        // Se der erro, tentamos rodar o init mesmo assim para não deixar o sistema morto
        try { await initializeDatabase(); } catch(e) {}
        
        res.status(500).json({ message: "Erro ao restaurar banco de dados: " + error.message });
    }
});

module.exports = router;