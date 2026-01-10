// atualizar_banco_v2.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database/database.sqlite'); // Verifique se o caminho bate com o seu

console.log("--- ATUALIZANDO BANCO DE DADOS (USUÁRIOS E COMISSÕES) ---");

const comandos = [
    // Adiciona colunas que faltam na tabela de Usuários
    "ALTER TABLE Usuarios ADD COLUMN comissao_produto REAL DEFAULT 0",
    "ALTER TABLE Usuarios ADD COLUMN comissao_servico REAL DEFAULT 0",
    "ALTER TABLE Usuarios ADD COLUMN email TEXT",
    "ALTER TABLE Usuarios ADD COLUMN telefone TEXT",
    "ALTER TABLE Usuarios ADD COLUMN data_admissao TEXT",
    "ALTER TABLE Usuarios ADD COLUMN cargo TEXT",
    "ALTER TABLE Usuarios ADD COLUMN salario REAL DEFAULT 0"
];

const executar = (index) => {
    if (index >= comandos.length) {
        console.log("✅ Atualização concluída! Pode fechar e reiniciar o sistema.");
        db.close();
        return;
    }
    const sql = comandos[index];
    db.run(sql, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error(`❌ Erro em: ${sql} ->`, err.message);
        } else {
            console.log(`👍 Sucesso (ou já existia): ${sql}`);
        }
        executar(index + 1);
    });
};

executar(0);