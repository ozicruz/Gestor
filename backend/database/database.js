
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const fs = require('fs');

// Define a pasta segura para armazenar o banco
const dbFolder = path.join(os.homedir(), 'Documents', 'GerenciadorOficina');

// Garante que a pasta existe
try {
  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
    console.log(`📁 Pasta criada: ${dbFolder}`);
  }
} catch (err) {
  console.error('❌ Erro ao criar pasta do banco:', err.message);
}

// Define o caminho completo do banco
const dbPath = path.join(dbFolder, 'database.sqlite');

// Inicializa o banco
let db;
try {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Erro ao abrir a base de dados:', err.message);
    } else {
      console.log(`✅ Banco de dados conectado em: ${dbPath}`);
      db.run('PRAGMA foreign_keys = ON;', (err) => {
        if (err) console.error('⚠️ Erro ao ativar chaves estrangeiras:', err.message);
      });
    }
  });
} catch (err) {
  console.error('❌ Falha ao inicializar o banco:', err.message);
}

// Funções auxiliares com Promises
const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve({ id: this.lastID, changes: this.changes });
    });
  });

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

module.exports = {
  db,
  dbAll,
  dbRun,
  dbGet,
};