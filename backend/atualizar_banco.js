// backend/atualizar_banco.js
const { db } = require('./database/database');

console.log("--- INICIANDO ATUALIZAÇÃO DO BANCO DE DADOS (FASE 2) ---");

const comandos = [
    // Comandos da Fase 1 (Vendas)
    "ALTER TABLE Vendas ADD COLUMN forma_pagamento TEXT DEFAULT 'Dinheiro'",
    "ALTER TABLE Vendas ADD COLUMN desconto REAL DEFAULT 0",
    "ALTER TABLE Vendas ADD COLUMN acrescimo REAL DEFAULT 0",
    "ALTER TABLE Vendas ADD COLUMN status TEXT DEFAULT 'Finalizada'",
    
    // --- NOVO COMANDO (Fase 2) ---
    // Adiciona subtotal na tabela de itens para corrigir o erro atual
    "ALTER TABLE Itens_Venda ADD COLUMN subtotal REAL DEFAULT 0"
];

const executarComando = (index) => {
    if (index >= comandos.length) {
        console.log("--- TODAS AS ATUALIZAÇÕES CONCLUÍDAS! ---");
        console.log("Pode reiniciar o servidor (npm start).");
        return; 
    }

    const sql = comandos[index];
    
    db.run(sql, function(err) {
        if (err) {
            if (err.message.includes('duplicate column')) {
                console.log(`[OK] Coluna já existe: ${sql}`);
            } else {
                console.error(`[ERRO] Falha ao executar: ${sql}`);
                console.error(`Detalhe: ${err.message}`);
            }
        } else {
            console.log(`[SUCESSO] Coluna criada: ${sql}`);
        }
        
        executarComando(index + 1);
    });
};

executarComando(0);