const sqlite3 = require('sqlite3').verbose();
// Ajuste o caminho conforme o seu setup_categorias.js
const dbPath = 'C:\\Users\\ozile\\Documents\\GerenciadorOficina\\database.sqlite';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Limpando dados financeiros de teste...");
    
    // Apaga todos os lançamentos
    db.run("DELETE FROM Lancamentos", (err) => {
        if(err) console.error(err);
        else console.log("Tabela Lancamentos limpa!");
    });

    // Zera os saldos das contas caixa
    db.run("UPDATE ContasCaixa SET Saldo = SaldoInicial", (err) => {
        if(err) console.error(err);
        else console.log("Saldos resetados para o valor inicial!");
    });
});

setTimeout(() => db.close(), 1000);