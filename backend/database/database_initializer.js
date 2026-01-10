const { db, dbRun, dbAll, dbGet } = require('./database');

// --- 1. CRIAÇÃO DE TABELAS ---
const createTables = async () => {
    console.log('📦 Verificando estrutura do banco de dados...');

    // Array com as queries para facilitar manutenção e leitura
    const tables = [
        `CREATE TABLE IF NOT EXISTS Clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            nome TEXT NOT NULL, 
            telefone TEXT, 
            email TEXT, 
            endereco TEXT, 
            data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS Veiculos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            cliente_id INTEGER NOT NULL, 
            placa TEXT NOT NULL UNIQUE, 
            marca TEXT, 
            modelo TEXT, 
            ano INTEGER, 
            cor TEXT, 
            data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP, 
            FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS Usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            login TEXT NOT NULL UNIQUE,
            senha TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            permissoes TEXT,
            email TEXT,
            telefone TEXT,
            cargo TEXT,
            data_admissao DATE,
            status TEXT DEFAULT 'ATIVO',
            salario REAL DEFAULT 0,
            comissao_percentual REAL DEFAULT 0,
            comissao_produto REAL DEFAULT 0,
            comissao_servico REAL DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS Ordens_Servico (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            veiculo_id INTEGER NOT NULL, 
            data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP, 
            data_saida DATETIME, 
            problema_relatado TEXT, 
            diagnostico_tecnico TEXT, 
            status TEXT NOT NULL DEFAULT 'Aberta', 
            total REAL DEFAULT 0.00, 
            venda_gerada_id INTEGER REFERENCES Vendas(id) ON DELETE SET NULL, 
            mecanico_id INTEGER REFERENCES Usuarios(id) ON DELETE SET NULL, 
            FOREIGN KEY (veiculo_id) REFERENCES Veiculos(id) ON DELETE RESTRICT
        )`,
        `CREATE TABLE IF NOT EXISTS Produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            nome TEXT NOT NULL, 
            descricao TEXT, 
            quantidade_em_estoque INTEGER NOT NULL DEFAULT 0, 
            preco_unitario REAL NOT NULL, 
            valor_custo REAL DEFAULT 0, 
            stock_minimo INTEGER DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS Servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            nome TEXT NOT NULL, 
            descricao TEXT, 
            preco REAL NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS Itens_OS (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            os_id INTEGER NOT NULL, 
            produto_id INTEGER NOT NULL, 
            quantidade INTEGER NOT NULL, 
            valor_unitario REAL NOT NULL, 
            FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE CASCADE, 
            FOREIGN KEY (produto_id) REFERENCES Produtos(id) ON DELETE RESTRICT
        )`,
        `CREATE TABLE IF NOT EXISTS Servicos_OS (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            os_id INTEGER NOT NULL, 
            servico_id INTEGER NOT NULL, 
            valor REAL NOT NULL, 
            quantidade INTEGER NOT NULL DEFAULT 1, 
            FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE CASCADE, 
            FOREIGN KEY (servico_id) REFERENCES Servicos(id) ON DELETE RESTRICT
        )`,
        `CREATE TABLE IF NOT EXISTS Vendas ( 
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
            num_parcelas INTEGER DEFAULT 1,
            vendedor_id INTEGER REFERENCES Usuarios(id) ON DELETE SET NULL,
            FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE SET NULL, 
            FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE SET NULL
        )`,
        `CREATE TABLE IF NOT EXISTS Itens_Venda (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            venda_id INTEGER NOT NULL, 
            produto_id INTEGER NOT NULL, 
            quantidade INTEGER NOT NULL, 
            valor_unitario REAL NOT NULL, 
            FOREIGN KEY (venda_id) REFERENCES Vendas(id) ON DELETE CASCADE, 
            FOREIGN KEY (produto_id) REFERENCES Produtos(id) ON DELETE RESTRICT
        )`,
        `CREATE TABLE IF NOT EXISTS Servicos_Venda (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            venda_id INTEGER NOT NULL, 
            servico_id INTEGER NOT NULL, 
            valor REAL NOT NULL, 
            quantidade INTEGER NOT NULL DEFAULT 1, 
            FOREIGN KEY (venda_id) REFERENCES Vendas(id) ON DELETE CASCADE, 
            FOREIGN KEY (servico_id) REFERENCES Servicos(id) ON DELETE RESTRICT
        )`,
        `CREATE TABLE IF NOT EXISTS FormasPagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            Nome TEXT NOT NULL UNIQUE, 
            TipoLancamento TEXT NOT NULL CHECK (TipoLancamento IN ('A_VISTA', 'A_PRAZO')), 
            aceitaParcelas INTEGER DEFAULT 0, 
            maxParcelas INTEGER DEFAULT 1
        )`,
        `CREATE TABLE IF NOT EXISTS ContasCaixa (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            Nome TEXT NOT NULL UNIQUE, 
            SaldoInicial REAL NOT NULL DEFAULT 0, 
            Saldo REAL NOT NULL DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS CategoriasFinanceiras (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            Nome TEXT NOT NULL UNIQUE, 
            Tipo TEXT NOT NULL CHECK (Tipo IN ('RECEITA', 'DESPESA'))
        )`,
        `CREATE TABLE IF NOT EXISTS Lancamentos (
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
            ContaCaixaID INTEGER REFERENCES ContasCaixa(id) ON DELETE SET NULL,
            usuario_id INTEGER REFERENCES Usuarios(id) ON DELETE SET NULL
        )`,
        `CREATE TABLE IF NOT EXISTS Empresa (
            id INTEGER PRIMARY KEY CHECK (id = 1), 
            nome_fantasia TEXT, 
            razao_social TEXT, 
            cnpj_cpf TEXT, 
            endereco TEXT, 
            telefone TEXT, 
            email TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS MovimentacoesEstoque (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            produto_id INTEGER NOT NULL, 
            quantidade INTEGER NOT NULL, 
            tipo TEXT NOT NULL, 
            custo_unitario REAL, 
            observacao TEXT, 
            data DATETIME DEFAULT CURRENT_TIMESTAMP, 
            FOREIGN KEY (produto_id) REFERENCES Produtos(id) ON DELETE CASCADE
        )`
    ];

    // Executa cada criação de tabela individualmente para identificar erros específicos
    for (const query of tables) {
        try {
            await dbRun(query);
        } catch (err) {
            console.error(`❌ Erro ao criar tabela: ${err.message}`);
            console.error(`Query problemática: ${query}`);
        }
    }

    // Criação do Admin Padrão
    try {
        const adminExiste = await dbGet("SELECT id FROM Usuarios WHERE login = 'admin'");
        if (!adminExiste) {
            await dbRun(`INSERT INTO Usuarios (nome, login, senha, is_admin, permissoes, status) VALUES (?, ?, ?, ?, ?, ?)`, 
            ['Gerente Geral', 'admin', 'admin', 1, '["tudo"]', 'ATIVO']);
            console.log("👤 Usuário 'admin' criado com sucesso.");
        }
    } catch (err) {
        // Se a tabela Usuarios falhou ao ser criada acima, este erro será capturado aqui
        console.error("⚠️ Erro ao verificar/criar admin:", err.message);
    }
};

// --- 2. MIGRAÇÕES ---
const runMigrations = async () => {
    console.log('🔄 Verificando migrações...');

    try {
        const columns = await dbAll("PRAGMA table_info(Servicos_OS);");
        if (!columns.some(col => col.name === 'quantidade')) {
            await dbRun('ALTER TABLE Servicos_OS ADD COLUMN quantidade INTEGER NOT NULL DEFAULT 1;');
        }
    } catch (err) { console.error('Erro Migração 1:', err.message); }

    try {
        const colunasVenda = await dbAll("PRAGMA table_info(Vendas);");
        if (!colunasVenda.some(col => col.name === 'desconto_tipo')) await dbRun('ALTER TABLE Vendas ADD COLUMN desconto_tipo TEXT;');
        if (!colunasVenda.some(col => col.name === 'desconto_valor')) await dbRun('ALTER TABLE Vendas ADD COLUMN desconto_valor REAL DEFAULT 0;');
        if (!colunasVenda.some(col => col.name === 'acrescimo_tipo')) await dbRun('ALTER TABLE Vendas ADD COLUMN acrescimo_tipo TEXT;');
        if (!colunasVenda.some(col => col.name === 'acrescimo_valor')) await dbRun('ALTER TABLE Vendas ADD COLUMN acrescimo_valor REAL DEFAULT 0;');
        if (!colunasVenda.some(col => col.name === 'FormaPagamentoID')) await dbRun('ALTER TABLE Vendas ADD COLUMN FormaPagamentoID INTEGER;');
        if (!colunasVenda.some(col => col.name === 'DataVencimento')) await dbRun('ALTER TABLE Vendas ADD COLUMN DataVencimento DATE;');
        if (!colunasVenda.some(col => col.name === 'ContaCaixaID')) await dbRun('ALTER TABLE Vendas ADD COLUMN ContaCaixaID INTEGER;');
        if (!colunasVenda.some(col => col.name === 'num_parcelas')) await dbRun('ALTER TABLE Vendas ADD COLUMN num_parcelas INTEGER DEFAULT 1;');
        if (!colunasVenda.some(col => col.name === 'vendedor_id')) await dbRun('ALTER TABLE Vendas ADD COLUMN vendedor_id INTEGER REFERENCES Usuarios(id) ON DELETE SET NULL;');
        
        const colunasServicoVenda = await dbAll("PRAGMA table_info(Servicos_Venda);");
        if (!colunasServicoVenda.some(c => c.name === 'quantidade')) await dbRun('ALTER TABLE Servicos_Venda ADD COLUMN quantidade INTEGER NOT NULL DEFAULT 1;');
    } catch (err) { console.error('Erro Migração 2:', err.message); }

    try {
        const tabelas = await dbAll("SELECT name FROM sqlite_master WHERE type='table' AND name='FormasPagamento';");
        if (tabelas.length > 0) {
            const colunasFP = await dbAll("PRAGMA table_info(FormasPagamento);");
            if (!colunasFP.some(col => col.name === 'aceitaParcelas')) await dbRun('ALTER TABLE FormasPagamento ADD COLUMN aceitaParcelas INTEGER NOT NULL DEFAULT 0;');
            if (!colunasFP.some(col => col.name === 'maxParcelas')) await dbRun('ALTER TABLE FormasPagamento ADD COLUMN maxParcelas INTEGER NOT NULL DEFAULT 1;');
        }
    } catch (err) { console.error('Erro Migração 3:', err.message); }

    try {
        const colunasProduto = await dbAll("PRAGMA table_info(Produtos);");
        if (!colunasProduto.some(col => col.name === 'valor_custo')) await dbRun('ALTER TABLE Produtos ADD COLUMN valor_custo REAL NOT NULL DEFAULT 0;');
        if (!colunasProduto.some(col => col.name === 'stock_minimo')) await dbRun('ALTER TABLE Produtos ADD COLUMN stock_minimo INTEGER NOT NULL DEFAULT 0;');
    } catch (err) { console.error('Erro Migração 4:', err.message); }

    try {
        const colunasConta = await dbAll("PRAGMA table_info(ContasCaixa);");
        if (!colunasConta.some(col => col.name === 'Saldo')) {
            await dbRun('ALTER TABLE ContasCaixa ADD COLUMN Saldo REAL DEFAULT 0;');
            await dbRun('UPDATE ContasCaixa SET Saldo = SaldoInicial');
        }
    } catch (err) { console.error('Erro Migração 5:', err.message); }

    try {
        const colunasOS = await dbAll("PRAGMA table_info(Ordens_Servico);");
        if (!colunasOS.some(col => col.name === 'mecanico_id')) {
            await dbRun('ALTER TABLE Ordens_Servico ADD COLUMN mecanico_id INTEGER REFERENCES Usuarios(id) ON DELETE SET NULL;');
        }
        if (!colunasOS.some(col => col.name === 'venda_gerada_id')) {
            await dbRun('ALTER TABLE Ordens_Servico ADD COLUMN venda_gerada_id INTEGER REFERENCES Vendas(id) ON DELETE SET NULL;');
        }
    } catch (err) { console.error('Erro Migração 6/7:', err.message); }

    try {
        const colunasUser = await dbAll("PRAGMA table_info(Usuarios);");
        // Verifica se a tabela existe antes de tentar alterar (Evita erro se o backup não tiver a tabela)
        if (colunasUser.length > 0) {
            if (!colunasUser.some(col => col.name === 'email')) await dbRun('ALTER TABLE Usuarios ADD COLUMN email TEXT;');
            if (!colunasUser.some(col => col.name === 'telefone')) await dbRun('ALTER TABLE Usuarios ADD COLUMN telefone TEXT;');
            if (!colunasUser.some(col => col.name === 'cargo')) await dbRun('ALTER TABLE Usuarios ADD COLUMN cargo TEXT;');
            if (!colunasUser.some(col => col.name === 'data_admissao')) await dbRun('ALTER TABLE Usuarios ADD COLUMN data_admissao DATE;');
            if (!colunasUser.some(col => col.name === 'status')) await dbRun("ALTER TABLE Usuarios ADD COLUMN status TEXT DEFAULT 'ATIVO';");
            if (!colunasUser.some(col => col.name === 'salario')) await dbRun('ALTER TABLE Usuarios ADD COLUMN salario REAL DEFAULT 0;');
            if (!colunasUser.some(col => col.name === 'comissao_percentual')) await dbRun('ALTER TABLE Usuarios ADD COLUMN comissao_percentual REAL DEFAULT 0;');
            if (!colunasUser.some(col => col.name === 'comissao_produto')) await dbRun('ALTER TABLE Usuarios ADD COLUMN comissao_produto REAL DEFAULT 0;');
            if (!colunasUser.some(col => col.name === 'comissao_servico')) await dbRun('ALTER TABLE Usuarios ADD COLUMN comissao_servico REAL DEFAULT 0;');
        }
    } catch (err) { console.error('Erro Migração RH/Comissões:', err.message); }

    try {
        const colunasLanc = await dbAll("PRAGMA table_info(Lancamentos);");
        if (!colunasLanc.some(col => col.name === 'usuario_id')) {
            await dbRun('ALTER TABLE Lancamentos ADD COLUMN usuario_id INTEGER REFERENCES Usuarios(id) ON DELETE SET NULL;');
        }
    } catch (err) { console.error('Erro Migração Audit:', err.message); }

    console.log('✅ Migrações concluídas.');
};

// --- 3. SEED (DADOS INICIAIS) ---
const seedInitialData = async () => {
    try {
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
        
        // Atualiza configurações padrão
        await dbRun("UPDATE FormasPagamento SET aceitaParcelas = 1, maxParcelas = 12 WHERE Nome = 'Cartão de Crédito';");
        
        await dbRun("INSERT OR IGNORE INTO Empresa (id, nome_fantasia) VALUES (1, 'Nome da Sua Empresa Aqui');");
    } catch (err) { console.warn('Aviso ao semear dados:', err.message); }
};

const initializeDatabase = async () => {
    // Ordem correta: Criar Tabelas -> Rodar Migrações (colunas novas) -> Inserir Dados Básicos
    await createTables();
    await runMigrations();
    await seedInitialData();
};

module.exports = { initializeDatabase };