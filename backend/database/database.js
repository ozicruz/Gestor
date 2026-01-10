const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

// --- CONFIGURAÇÃO DO CAMINHO DO BANCO ---
let dbPath;

// Para o seu desenvolvimento, vamos usar o caminho FIXO onde seus dados estão.
// Quando for gerar o EXE para o cliente, trocaremos isso.
const caminhoDev = 'C:\\Users\\ozile\\Documents\\GerenciadorOficina\\database.sqlite';

// Verificação simples: Se estiver rodando pelo Electron (desenvolvimento) usa o seu caminho.
if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    dbPath = caminhoDev;
} else {
    // PRODUÇÃO (EXE FINAL): Usa a pasta de dados do usuário do Windows (AppData)
    // Isso garante que o cliente não perca dados ao atualizar o programa
    dbPath = path.join(app.getPath('userData'), 'database.sqlite');
}

console.log(`🔌 Tentando conectar ao banco em: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro crítico ao conectar:', err.message);
    } else {
        console.log('✅ Banco conectado com sucesso.');
        // Só roda as atualizações se o banco conectou bem
        rodarAtualizacoesAutomaticas();
    }
});

// --- FUNÇÃO DE AUTO-ATUALIZAÇÃO (MIGRATIONS) ---
function rodarAtualizacoesAutomaticas() {
    console.log("🔄 Verificando necessidade de atualizações no banco...");

    const atualizacoes = [
        // FASE 1: Colunas de Vendas
        "ALTER TABLE Vendas ADD COLUMN forma_pagamento TEXT DEFAULT 'Dinheiro'",
        "ALTER TABLE Vendas ADD COLUMN desconto REAL DEFAULT 0",
        "ALTER TABLE Vendas ADD COLUMN acrescimo REAL DEFAULT 0",
        "ALTER TABLE Vendas ADD COLUMN status TEXT DEFAULT 'Finalizada'",
        "ALTER TABLE Itens_Venda ADD COLUMN subtotal REAL DEFAULT 0",

        // FASE 2: Colunas de Usuários
        "ALTER TABLE Usuarios ADD COLUMN comissao_produto REAL DEFAULT 0",
        "ALTER TABLE Usuarios ADD COLUMN comissao_servico REAL DEFAULT 0",
        "ALTER TABLE Usuarios ADD COLUMN email TEXT",
        "ALTER TABLE Usuarios ADD COLUMN telefone TEXT",
        "ALTER TABLE Usuarios ADD COLUMN data_admissao TEXT",
        "ALTER TABLE Usuarios ADD COLUMN cargo TEXT",
        "ALTER TABLE Usuarios ADD COLUMN salario REAL DEFAULT 0"
    ];

    db.serialize(() => {
        atualizacoes.forEach(sql => {
            db.run(sql, (err) => {
                // Ignora erro se a coluna já existe
                if (err && !err.message.includes('duplicate column')) {
                    // Ignora erro se a tabela ainda não existe (no caso de banco zerado sendo criado agora)
                    if (!err.message.includes('no such table')) {
                         console.error(`⚠️ Aviso na migração: ${err.message}`);
                    }
                }
            });
        });
    });
}

// Funções Helpers (Promisified)
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = { db, dbRun, dbGet, dbAll };