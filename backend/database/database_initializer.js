const { db, dbRun, dbAll } = require('./database');

// Função que verifica e adiciona colunas (Migrações)
const runMigrations = async () => {

    // --- Migração 1: Servicos_OS ---
    try {
        const columns = await dbAll("PRAGMA table_info(Servicos_OS);");
        const hasQuantidade = columns.some(col => col.name === 'quantidade');
        if (!hasQuantidade) {
            console.log('MIGRANDO BASE DE DADOS: A adicionar coluna "quantidade" a Servicos_OS...');
            await dbRun('ALTER TABLE Servicos_OS ADD COLUMN quantidade INTEGER NOT NULL DEFAULT 1;');
        }
    } catch (err) {
        if (!err.message.includes('no such table')) console.error('Erro migração Servicos_OS:', err.message);
    }

    // --- Migração 2: Vendas e Servicos_Venda ---
    try {
        const colunasVenda = await dbAll("PRAGMA table_info(Vendas);");
        
        if (!colunasVenda.some(col => col.name === 'desconto_tipo')) await dbRun('ALTER TABLE Vendas ADD COLUMN desconto_tipo TEXT;');
        if (!colunasVenda.some(col => col.name === 'desconto_valor')) await dbRun('ALTER TABLE Vendas ADD COLUMN desconto_valor REAL DEFAULT 0;');
        if (!colunasVenda.some(col => col.name === 'acrescimo_tipo')) await dbRun('ALTER TABLE Vendas ADD COLUMN acrescimo_tipo TEXT;');
        if (!colunasVenda.some(col => col.name === 'acrescimo_valor')) await dbRun('ALTER TABLE Vendas ADD COLUMN acrescimo_valor REAL DEFAULT 0;');
        if (!colunasVenda.some(col => col.name === 'FormaPagamentoID')) await dbRun('ALTER TABLE Vendas ADD COLUMN FormaPagamentoID INTEGER;');
        if (!colunasVenda.some(col => col.name === 'DataVencimento')) await dbRun('ALTER TABLE Vendas ADD COLUMN DataVencimento DATE;');
        if (!colunasVenda.some(col => col.name === 'ContaCaixaID')) await dbRun('ALTER TABLE Vendas ADD COLUMN ContaCaixaID INTEGER;');
        
        // --- NOVO: Coluna para salvar o número de parcelas ---
        if (!colunasVenda.some(col => col.name === 'num_parcelas')) {
            console.log('MIGRANDO: Adicionando coluna num_parcelas em Vendas...');
            await dbRun('ALTER TABLE Vendas ADD COLUMN num_parcelas INTEGER DEFAULT 1;');
        }

        const colunasServicoVenda = await dbAll("PRAGMA table_info(Servicos_Venda);");
        if (!colunasServicoVenda.some(c => c.name === 'quantidade')) {
            await dbRun('ALTER TABLE Servicos_Venda ADD COLUMN quantidade INTEGER NOT NULL DEFAULT 1;');
        }
    } catch (err) {
        if (!err.message.includes('no such table')) console.error('Erro migração Vendas:', err.message);
    }

    // --- Migração 3: FormasPagamento ---
    try {
        const tabelas = await dbAll("SELECT name FROM sqlite_master WHERE type='table' AND name='FormasPagamento';");
        if (tabelas.length > 0) {
            const colunasFP = await dbAll("PRAGMA table_info(FormasPagamento);");
            if (!colunasFP.some(col => col.name === 'aceitaParcelas')) await dbRun('ALTER TABLE FormasPagamento ADD COLUMN aceitaParcelas INTEGER NOT NULL DEFAULT 0;');
            if (!colunasFP.some(col => col.name === 'maxParcelas')) await dbRun('ALTER TABLE FormasPagamento ADD COLUMN maxParcelas INTEGER NOT NULL DEFAULT 1;');
        }
    } catch (err) { console.error('Erro migração FormasPagamento:', err.message); }

    // --- Migração 4 & 5: Produtos ---
    try {
        const colunasProduto = await dbAll("PRAGMA table_info(Produtos);");
        if (!colunasProduto.some(col => col.name === 'valor_custo')) await dbRun('ALTER TABLE Produtos ADD COLUMN valor_custo REAL NOT NULL DEFAULT 0;');
        if (!colunasProduto.some(col => col.name === 'stock_minimo')) await dbRun('ALTER TABLE Produtos ADD COLUMN stock_minimo INTEGER NOT NULL DEFAULT 0;');
    } catch (err) { console.error('Erro migração Produtos:', err.message); }

    // --- MIGRAÇÃO 6: CORREÇÃO DO ERRO 'NO SUCH COLUMN SALDO' ---
    try {
        const colunasConta = await dbAll("PRAGMA table_info(ContasCaixa);");
        const temSaldo = colunasConta.some(col => col.name === 'Saldo');

        if (!temSaldo) {
            await dbRun('ALTER TABLE ContasCaixa ADD COLUMN Saldo REAL DEFAULT 0;');
            await dbRun('UPDATE ContasCaixa SET Saldo = SaldoInicial');
        }
    } catch (err) {
        if (!err.message.includes('no such table')) console.error('Erro migração ContasCaixa (Saldo):', err.message);
    }
};

const createTables = async () => {
    const sqlScript = `
        CREATE TABLE IF NOT EXISTS Clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, telefone TEXT, email TEXT, endereco TEXT, data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS Veiculos (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER NOT NULL, placa TEXT NOT NULL UNIQUE, marca TEXT, modelo TEXT, ano INTEGER, cor TEXT, data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS Ordens_Servico (id INTEGER PRIMARY KEY AUTOINCREMENT, veiculo_id INTEGER NOT NULL, data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP, data_saida DATETIME, problema_relatado TEXT, diagnostico_tecnico TEXT, status TEXT NOT NULL DEFAULT 'Aberta', total REAL DEFAULT 0.00, FOREIGN KEY (veiculo_id) REFERENCES Veiculos(id) ON DELETE RESTRICT);
        CREATE TABLE IF NOT EXISTS Produtos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, descricao TEXT, quantidade_em_estoque INTEGER NOT NULL DEFAULT 0, preco_unitario REAL NOT NULL, valor_custo REAL DEFAULT 0, stock_minimo INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS Servicos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, descricao TEXT, preco REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS Itens_OS (id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER NOT NULL, produto_id INTEGER NOT NULL, quantidade INTEGER NOT NULL, valor_unitario REAL NOT NULL, FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE CASCADE, FOREIGN KEY (produto_id) REFERENCES Produtos(id) ON DELETE RESTRICT);
        CREATE TABLE IF NOT EXISTS Servicos_OS (id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER NOT NULL, servico_id INTEGER NOT NULL, valor REAL NOT NULL, quantidade INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE CASCADE, FOREIGN KEY (servico_id) REFERENCES Servicos(id) ON DELETE RESTRICT);
        
        -- TABELAS FINANCEIRAS E VENDAS ATUALIZADAS
        CREATE TABLE IF NOT EXISTS Vendas ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            cliente_id INTEGER, 
            os_id INTEGER UNIQUE, 
            data DATETIME DEFAULT CURRENT_TIMESTAMP, 
            total REAL NOT NULL,
            desconto_tipo TEXT,
            desconto_valor REAL DEFAULT 0,
            acrescimo_tipo TEXT,
            acrescimo_valor REAL DEFAULT 0,
            FormaPagamentoID INTEGER,
            ContaCaixaID INTEGER,
            DataVencimento DATE,
            num_parcelas INTEGER DEFAULT 1, -- NOVA COLUNA
            FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE SET NULL, 
            FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS Itens_Venda (id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER NOT NULL, produto_id INTEGER NOT NULL, quantidade INTEGER NOT NULL, valor_unitario REAL NOT NULL, FOREIGN KEY (venda_id) REFERENCES Vendas(id) ON DELETE CASCADE, FOREIGN KEY (produto_id) REFERENCES Produtos(id) ON DELETE RESTRICT);
        CREATE TABLE IF NOT EXISTS Servicos_Venda (id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER NOT NULL, servico_id INTEGER NOT NULL, valor REAL NOT NULL, quantidade INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (venda_id) REFERENCES Vendas(id) ON DELETE CASCADE, FOREIGN KEY (servico_id) REFERENCES Servicos(id) ON DELETE RESTRICT);

        CREATE TABLE IF NOT EXISTS FormasPagamento (id INTEGER PRIMARY KEY AUTOINCREMENT, Nome TEXT NOT NULL UNIQUE, TipoLancamento TEXT NOT NULL CHECK (TipoLancamento IN ('A_VISTA', 'A_PRAZO')), aceitaParcelas INTEGER DEFAULT 0, maxParcelas INTEGER DEFAULT 1);
        
        CREATE TABLE IF NOT EXISTS ContasCaixa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            Nome TEXT NOT NULL UNIQUE,
            SaldoInicial REAL NOT NULL DEFAULT 0,
            Saldo REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS CategoriasFinanceiras (id INTEGER PRIMARY KEY AUTOINCREMENT, Nome TEXT NOT NULL UNIQUE, Tipo TEXT NOT NULL CHECK (Tipo IN ('RECEITA', 'DESPESA')));
        
        CREATE TABLE IF NOT EXISTS Lancamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            Descricao TEXT NOT NULL,
            Valor REAL NOT NULL,
            Tipo TEXT NOT NULL CHECK (Tipo IN ('RECEITA', 'DESPESA')),
            Status TEXT NOT NULL CHECK (Status IN ('PAGO', 'PENDENTE')),
            DataVencimento DATE NOT NULL,
            DataPagamento DATE,
            ClienteID INTEGER REFERENCES Clientes(id) ON DELETE SET NULL,
            VendaID INTEGER REFERENCES Vendas(id) ON DELETE SET NULL,
            FormaPagamentoID INTEGER REFERENCES FormasPagamento(id) ON DELETE SET NULL,
            CategoriaID INTEGER REFERENCES CategoriasFinanceiras(id) ON DELETE SET NULL,
            ContaCaixaID INTEGER REFERENCES ContasCaixa(id) ON DELETE SET NULL
        );
        
        CREATE TABLE IF NOT EXISTS Empresa (id INTEGER PRIMARY KEY CHECK (id = 1), nome_fantasia TEXT, razao_social TEXT, cnpj_cpf TEXT, endereco TEXT, telefone TEXT, email TEXT);

        -- Tabela de Histórico de Movimentações (Entradas/Saídas/Ajustes)
        CREATE TABLE IF NOT EXISTS MovimentacoesEstoque (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER NOT NULL,
            quantidade INTEGER NOT NULL, -- Positivo = Entrada, Negativo = Saída/Venda
            tipo TEXT NOT NULL, -- 'ENTRADA', 'VENDA', 'AJUSTE', 'OS'
            custo_unitario REAL, -- Custo no momento da movimentação
            observacao TEXT, -- Ex: "Nota Fiscal 123"
            data DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (produto_id) REFERENCES Produtos(id) ON DELETE CASCADE
        );
    `;

    try {
        const statements = sqlScript.split(';').filter(s => s.trim().length > 0);
        for (const statement of statements) {
            await dbRun(statement);
        }
    } catch (err) {
        console.error("Erro ao criar tabelas:", err.message);
    }
};

const seedInitialData = async () => {
    try {
        console.log('🌱 Verificando dados iniciais...');
        await dbRun("INSERT OR IGNORE INTO FormasPagamento (Nome, TipoLancamento) VALUES ('Dinheiro', 'A_VISTA');");
        await dbRun("INSERT OR IGNORE INTO FormasPagamento (Nome, TipoLancamento) VALUES ('Cartão de Débito', 'A_VISTA');");
        await dbRun("INSERT OR IGNORE INTO FormasPagamento (Nome, TipoLancamento) VALUES ('Cartão de Crédito', 'A_VISTA');");
        await dbRun("INSERT OR IGNORE INTO FormasPagamento (Nome, TipoLancamento) VALUES ('Pix', 'A_VISTA');");
        await dbRun("INSERT OR IGNORE INTO FormasPagamento (Nome, TipoLancamento) VALUES ('Fiado (A Prazo)', 'A_PRAZO');");

        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Venda de Produtos', 'RECEITA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Venda de Serviços', 'RECEITA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Aluguel', 'DESPESA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Salários', 'DESPESA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Fornecedores', 'DESPESA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Outras Receitas', 'RECEITA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Outras Despesas', 'DESPESA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Taxas de Cartão', 'DESPESA');");

        await dbRun("INSERT OR IGNORE INTO ContasCaixa (Nome, SaldoInicial, Saldo) VALUES ('Caixa Principal', 0.0, 0.0);");
        await dbRun("UPDATE FormasPagamento SET aceitaParcelas = 1, maxParcelas = 12 WHERE Nome = 'Cartão de Crédito';");
        await dbRun("INSERT OR IGNORE INTO Empresa (id, nome_fantasia) VALUES (1, 'Nome da Sua Empresa Aqui');");

        console.log('🌱 Sementeira concluída.');
    } catch (err) {
        console.warn('Aviso ao semear:', err.message);
    }
};

const initializeDatabase = async () => {
    await createTables();
    await runMigrations();
    await seedInitialData();
};

module.exports = { initializeDatabase };