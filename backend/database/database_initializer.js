// backend/database/database_initializer.js
const { db } = require('./database');

const initializeDatabase = () => {
    const sqlScript = `
        CREATE TABLE IF NOT EXISTS Clientes ( id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, telefone TEXT, email TEXT, endereco TEXT, data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP );
        CREATE TABLE IF NOT EXISTS Veiculos ( id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER NOT NULL, placa TEXT NOT NULL UNIQUE, marca TEXT, modelo TEXT, ano INTEGER, cor TEXT, data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE CASCADE );
        CREATE TABLE IF NOT EXISTS Ordens_Servico ( id INTEGER PRIMARY KEY AUTOINCREMENT, veiculo_id INTEGER NOT NULL, data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP, data_saida DATETIME, problema_relatado TEXT, diagnostico_tecnico TEXT, status TEXT NOT NULL DEFAULT 'Aberta', total REAL DEFAULT 0.00, FOREIGN KEY (veiculo_id) REFERENCES Veiculos(id) ON DELETE RESTRICT );
        CREATE TABLE IF NOT EXISTS Produtos ( id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, descricao TEXT, quantidade_em_estoque INTEGER NOT NULL DEFAULT 0, preco_unitario REAL NOT NULL );
        CREATE TABLE IF NOT EXISTS Servicos ( id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, descricao TEXT, preco REAL NOT NULL );
        CREATE TABLE IF NOT EXISTS Itens_OS ( id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER NOT NULL, produto_id INTEGER NOT NULL, quantidade INTEGER NOT NULL, valor_unitario REAL NOT NULL, FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE CASCADE, FOREIGN KEY (produto_id) REFERENCES Produtos(id) ON DELETE RESTRICT );
        CREATE TABLE IF NOT EXISTS Servicos_OS ( id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER NOT NULL, servico_id INTEGER NOT NULL, valor REAL NOT NULL, FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE CASCADE, FOREIGN KEY (servico_id) REFERENCES Servicos(id) ON DELETE RESTRICT );
        CREATE TABLE IF NOT EXISTS Vendas ( id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, os_id INTEGER UNIQUE, data DATETIME DEFAULT CURRENT_TIMESTAMP, total REAL NOT NULL, FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE SET NULL, FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE SET NULL );
        CREATE TABLE IF NOT EXISTS Itens_Venda ( id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER NOT NULL, produto_id INTEGER NOT NULL, quantidade INTEGER NOT NULL, valor_unitario REAL NOT NULL, FOREIGN KEY (venda_id) REFERENCES Vendas(id) ON DELETE CASCADE, FOREIGN KEY (produto_id) REFERENCES Produtos(id) ON DELETE RESTRICT );
        CREATE TABLE IF NOT EXISTS Servicos_Venda ( id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER NOT NULL, servico_id INTEGER NOT NULL, valor REAL NOT NULL, FOREIGN KEY (venda_id) REFERENCES Vendas(id) ON DELETE CASCADE, FOREIGN KEY (servico_id) REFERENCES Servicos(id) ON DELETE RESTRICT );
    `;
    db.exec(sqlScript, (err) => {
        if (err) console.error("Erro ao criar tabelas:", err.message);
        else console.log("Tabelas criadas ou já existentes com sucesso.");
    });
};

module.exports = { initializeDatabase };