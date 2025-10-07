// backend/database/database_initializer.js (Versão Corrigida com Migração)
const { db, dbRun, dbAll } = require('./database');

// Função que verifica e adiciona a coluna 'quantidade' se ela não existir
const runMigrations = async () => {
    try {
        const columns = await dbAll("PRAGMA table_info(Servicos_OS);");
        const hasQuantidade = columns.some(col => col.name === 'quantidade');

        if (!hasQuantidade) {
            console.log('MIGRANDO BASE DE DADOS: A adicionar coluna "quantidade" a Servicos_OS...');
            await dbRun('ALTER TABLE Servicos_OS ADD COLUMN quantidade INTEGER NOT NULL DEFAULT 1;');
            console.log('Migração concluída com sucesso!');
        }
    } catch (err) {
        // Ignora o erro se a tabela Servicos_OS ainda não existir, pois ela será criada abaixo
        if (!err.message.includes('no such table: Servicos_OS')) {
            console.error('Erro durante a migração da base de dados:', err.message);
        }
    }
};

// Função que cria todas as tabelas (se não existirem)
const createTables = async () => {
    // Usamos o seu script original, mas garantimos que Servicos_OS tem a coluna 'quantidade'
    const sqlScript = `
        CREATE TABLE IF NOT EXISTS Clientes ( id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, telefone TEXT, email TEXT, endereco TEXT, data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP );
        CREATE TABLE IF NOT EXISTS Veiculos ( id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER NOT NULL, placa TEXT NOT NULL UNIQUE, marca TEXT, modelo TEXT, ano INTEGER, cor TEXT, data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE CASCADE );
        CREATE TABLE IF NOT EXISTS Ordens_Servico ( id INTEGER PRIMARY KEY AUTOINCREMENT, veiculo_id INTEGER NOT NULL, data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP, data_saida DATETIME, problema_relatado TEXT, diagnostico_tecnico TEXT, status TEXT NOT NULL DEFAULT 'Aberta', total REAL DEFAULT 0.00, FOREIGN KEY (veiculo_id) REFERENCES Veiculos(id) ON DELETE RESTRICT );
        CREATE TABLE IF NOT EXISTS Produtos ( id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, descricao TEXT, quantidade_em_estoque INTEGER NOT NULL DEFAULT 0, preco_unitario REAL NOT NULL );
        CREATE TABLE IF NOT EXISTS Servicos ( id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, descricao TEXT, preco REAL NOT NULL );
        CREATE TABLE IF NOT EXISTS Itens_OS ( id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER NOT NULL, produto_id INTEGER NOT NULL, quantidade INTEGER NOT NULL, valor_unitario REAL NOT NULL, FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE CASCADE, FOREIGN KEY (produto_id) REFERENCES Produtos(id) ON DELETE RESTRICT );
        CREATE TABLE IF NOT EXISTS Servicos_OS ( id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER NOT NULL, servico_id INTEGER NOT NULL, valor REAL NOT NULL, quantidade INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE CASCADE, FOREIGN KEY (servico_id) REFERENCES Servicos(id) ON DELETE RESTRICT );
        CREATE TABLE IF NOT EXISTS Vendas ( id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, os_id INTEGER UNIQUE, data DATETIME DEFAULT CURRENT_TIMESTAMP, total REAL NOT NULL, FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE SET NULL, FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE SET NULL );
        CREATE TABLE IF NOT EXISTS Itens_Venda ( id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER NOT NULL, produto_id INTEGER NOT NULL, quantidade INTEGER NOT NULL, valor_unitario REAL NOT NULL, FOREIGN KEY (venda_id) REFERENCES Vendas(id) ON DELETE CASCADE, FOREIGN KEY (produto_id) REFERENCES Produtos(id) ON DELETE RESTRICT );
        CREATE TABLE IF NOT EXISTS Servicos_Venda ( id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER NOT NULL, servico_id INTEGER NOT NULL, valor REAL NOT NULL, FOREIGN KEY (venda_id) REFERENCES Vendas(id) ON DELETE CASCADE, FOREIGN KEY (servico_id) REFERENCES Servicos(id) ON DELETE RESTRICT );
    `;

    try {
        await db.exec(sqlScript); // db.exec não retorna promise, então não usamos await, mas o colocamos dentro de um async para manter a ordem
    } catch(err) {
        console.error("Erro ao criar tabelas:", err.message);
    }
};

const initializeDatabase = async () => {
    // Primeiro, executa as migrações em tabelas existentes
    await runMigrations();
    // Depois, garante que todas as tabelas sejam criadas
    await createTables();
};

module.exports = { initializeDatabase };