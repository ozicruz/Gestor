// backend/database/database_initializer.js
// VERSÃO CORRIGIDA - Migrações Isoladas

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
             console.log('Migração concluída com sucesso!');
         }
     } catch (err) {
         // Ignora erro se a tabela não existir (será criada depois)
         if (!err.message.includes('no such table: Servicos_OS')) {
             console.error('Erro durante a migração Servicos_OS:', err.message);
         }
     }
    
    // --- Migração 2: Vendas e Servicos_Venda ---
    try {
        // Migração para a tabela Vendas
        const colunasVenda = await dbAll("PRAGMA table_info(Vendas);");
        const temDescontoTipo = colunasVenda.some(col => col.name === 'desconto_tipo');
        const temDescontoValor = colunasVenda.some(col => col.name === 'desconto_valor');

        if (!temDescontoTipo) {
            console.log('MIGRANDO: A adicionar coluna "desconto_tipo" a Vendas...');
            await dbRun('ALTER TABLE Vendas ADD COLUMN desconto_tipo TEXT;');
        }
        if (!temDescontoValor) {
            console.log('MIGRANDO: A adicionar coluna "desconto_valor" a Vendas...');
            await dbRun('ALTER TABLE Vendas ADD COLUMN desconto_valor REAL DEFAULT 0;');
        }
const temAcrescimoTipo = colunasVenda.some(col => col.name === 'acrescimo_tipo');
        if (!temAcrescimoTipo) {
            console.log('MIGRANDO: A adicionar coluna "acrescimo_tipo" a Vendas...');
            await dbRun('ALTER TABLE Vendas ADD COLUMN acrescimo_tipo TEXT;');
        }
        
        const temAcrescimoValor = colunasVenda.some(col => col.name === 'acrescimo_valor');
        if (!temAcrescimoValor) {
            console.log('MIGRANDO: A adicionar coluna "acrescimo_valor" a Vendas...');
            await dbRun('ALTER TABLE Vendas ADD COLUMN acrescimo_valor REAL DEFAULT 0;');
        }

        // --- MIGRAÇÃO FINANCEIRA PARA A TABELA VENDAS ---
        const temFormaPagamento = colunasVenda.some(col => col.name === 'FormaPagamentoID');
        if (!temFormaPagamento) {
            console.log('MIGRANDO: A adicionar coluna "FormaPagamentoID" a Vendas...');
            await dbRun('ALTER TABLE Vendas ADD COLUMN FormaPagamentoID INTEGER;');
        }
        
        const temDataVencimento = colunasVenda.some(col => col.name === 'DataVencimento');
        if (!temDataVencimento) {
            console.log('MIGRANDO: A adicionar coluna "DataVencimento" a Vendas...');
            await dbRun('ALTER TABLE Vendas ADD COLUMN DataVencimento DATE;');
        }
        
        // --- MIGRAÇÃO PARA SERVICOS_VENDA ---
        const colunasServicoVenda = await dbAll("PRAGMA table_info(Servicos_Venda);");
        if (!colunasServicoVenda.some(c => c.name === 'quantidade')) {
            console.log('MIGRANDO: A adicionar coluna "quantidade" a Servicos_Venda...');
            await dbRun('ALTER TABLE Servicos_Venda ADD COLUMN quantidade INTEGER NOT NULL DEFAULT 1;');
            console.log('Migração concluída com sucesso!');
        }
    } catch (err) {
        // Ignora erros de "tabela não existe" (serão criadas depois)
        if (!err.message.includes('no such table')) {
            console.error('Erro durante a migração Vendas/Servicos_Venda:', err.message);
        }
    }
    
    // --- Migração 3: FormasPagamento (ISOLADA) ---
try {
        console.log('MIGRANDO: A verificar colunas de parcelamento em FormasPagamento...');
        const tabelas = await dbAll("SELECT name FROM sqlite_master WHERE type='table' AND name='FormasPagamento';");
        
        if (tabelas.length > 0) { // Só corre se a tabela FormasPagamento existir
            const colunasFP = await dbAll("PRAGMA table_info(FormasPagamento);");

            const temAceitaParcelas = colunasFP.some(col => col.name === 'aceitaParcelas');
            if (!temAceitaParcelas) {
                console.log('MIGRANDO: A adicionar coluna "aceitaParcelas" a FormasPagamento...');
                await dbRun('ALTER TABLE FormasPagamento ADD COLUMN aceitaParcelas INTEGER NOT NULL DEFAULT 0;');
            }

            const temMaxParcelas = colunasFP.some(col => col.name === 'maxParcelas');
            if (!temMaxParcelas) {
                console.log('MIGRANDO: A adicionar coluna "maxParcelas" a FormasPagamento...');
                await dbRun('ALTER TABLE FormasPagamento ADD COLUMN maxParcelas INTEGER NOT NULL DEFAULT 1;');
            }
        } else {
            console.log('MIGRANDO: Tabela FormasPagamento ainda não existe, a pular migração de parcelas.');
        }
    } catch (err) {
        console.error('Erro durante a migração FormasPagamento:', err.message);
    }

    // --- ADICIONE ESTE NOVO BLOCO AQUI (MIGRAÇÃO 4) ---
    try {
        console.log('MIGRANDO: A verificar coluna de custo em Produtos...');
        const colunasProduto = await dbAll("PRAGMA table_info(Produtos);");

        const temValorCusto = colunasProduto.some(col => col.name === 'valor_custo');
        if (!temValorCusto) {
            console.log('MIGRANDO: A adicionar coluna "valor_custo" a Produtos...');
            await dbRun('ALTER TABLE Produtos ADD COLUMN valor_custo REAL NOT NULL DEFAULT 0;');
        }
    } catch (err) {
        console.error('Erro durante a migração Produtos (custo):', err.message);
    }

    // --- (MIGRAÇÃO 5) ---
    try {
        console.log('MIGRANDO: A verificar coluna de stock_minimo em Produtos...');
        const colunasProduto = await dbAll("PRAGMA table_info(Produtos);");

        const temStockMinimo = colunasProduto.some(col => col.name === 'stock_minimo');
        if (!temStockMinimo) {
            console.log('MIGRANDO: A adicionar coluna "stock_minimo" a Produtos...');
            // Adiciona a coluna com um valor padrão de 0
            await dbRun('ALTER TABLE Produtos ADD COLUMN stock_minimo INTEGER NOT NULL DEFAULT 0;');
        }
    } catch (err) {
        console.error('Erro durante a migração Produtos (stock_minimo):', err.message);
    }
};

// --- (O resto do seu ficheiro 'createTables' e 'seedInitialData' fica igual) ---
// (Vou colar o resto por si para garantir)

// Função que cria todas as tabelas (se não existirem)
const createTables = async () => {
    // Script SQL limpo, sem caracteres especiais
    const sqlScript = `
        CREATE TABLE IF NOT EXISTS Clientes ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            nome TEXT NOT NULL, 
            telefone TEXT, 
            email TEXT, 
            endereco TEXT, 
            data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP 
        );
        CREATE TABLE IF NOT EXISTS Veiculos ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            cliente_id INTEGER NOT NULL, 
            placa TEXT NOT NULL UNIQUE, 
            marca TEXT, 
            modelo TEXT, 
            ano INTEGER, 
            cor TEXT, 
            data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP, 
            FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE CASCADE 
        );
        CREATE TABLE IF NOT EXISTS Ordens_Servico ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            veiculo_id INTEGER NOT NULL, 
            data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP, 
            data_saida DATETIME, 
            problema_relatado TEXT, 
            diagnostico_tecnico TEXT, 
            status TEXT NOT NULL DEFAULT 'Aberta', 
            total REAL DEFAULT 0.00, 
            FOREIGN KEY (veiculo_id) REFERENCES Veiculos(id) ON DELETE RESTRICT 
        );
        CREATE TABLE IF NOT EXISTS Produtos ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            nome TEXT NOT NULL, 
            descricao TEXT, 
            quantidade_em_estoque INTEGER NOT NULL DEFAULT 0, 
            preco_unitario REAL NOT NULL 
        );
        CREATE TABLE IF NOT EXISTS Servicos ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            nome TEXT NOT NULL, 
            descricao TEXT, 
            preco REAL NOT NULL 
        );
        CREATE TABLE IF NOT EXISTS Itens_OS ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            os_id INTEGER NOT NULL, 
            produto_id INTEGER NOT NULL, 
            quantidade INTEGER NOT NULL, 
            valor_unitario REAL NOT NULL, 
            FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE CASCADE, 
            FOREIGN KEY (produto_id) REFERENCES Produtos(id) ON DELETE RESTRICT 
        );
        CREATE TABLE IF NOT EXISTS Servicos_OS ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            os_id INTEGER NOT NULL, 
            servico_id INTEGER NOT NULL, 
            valor REAL NOT NULL, 
            quantidade INTEGER NOT NULL DEFAULT 1, 
            FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE CASCADE, 
            FOREIGN KEY (servico_id) REFERENCES Servicos(id) ON DELETE RESTRICT 
        );
        CREATE TABLE IF NOT EXISTS Vendas ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            cliente_id INTEGER, 
            os_id INTEGER UNIQUE, 
            data DATETIME DEFAULT CURRENT_TIMESTAMP, 
            total REAL NOT NULL,
            desconto_tipo TEXT,
            desconto_valor REAL DEFAULT 0,
            FormaPagamentoID INTEGER,
            DataVencimento DATE,
            FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE SET NULL, 
            FOREIGN KEY (os_id) REFERENCES Ordens_Servico(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS Itens_Venda ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            venda_id INTEGER NOT NULL, 
            produto_id INTEGER NOT NULL, 
            quantidade INTEGER NOT NULL, 
            valor_unitario REAL NOT NULL, 
            FOREIGN KEY (venda_id) REFERENCES Vendas(id) ON DELETE CASCADE, 
            FOREIGN KEY (produto_id) REFERENCES Produtos(id) ON DELETE RESTRICT 
        );
        CREATE TABLE IF NOT EXISTS Servicos_Venda ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            venda_id INTEGER NOT NULL, 
            servico_id INTEGER NOT NULL, 
            valor REAL NOT NULL, 
            quantidade INTEGER NOT NULL DEFAULT 1, 
            FOREIGN KEY (venda_id) REFERENCES Vendas(id) ON DELETE CASCADE, 
            FOREIGN KEY (servico_id) REFERENCES Servicos(id) ON DELETE RESTRICT 
        );

        /* --- NOVO: TABELAS FINANCEIRAS --- */

        CREATE TABLE IF NOT EXISTS FormasPagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            Nome TEXT NOT NULL UNIQUE,
            TipoLancamento TEXT NOT NULL CHECK (TipoLancamento IN ('A_VISTA', 'A_PRAZO'))
        );

        CREATE TABLE IF NOT EXISTS ContasCaixa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            Nome TEXT NOT NULL UNIQUE,
            SaldoInicial REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS CategoriasFinanceiras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            Nome TEXT NOT NULL UNIQUE,
            Tipo TEXT NOT NULL CHECK (Tipo IN ('RECEITA', 'DESPESA'))
        );

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
    `;

    try {
        // Corre o script statement por statement para evitar erros com 'db.exec'
        const statements = sqlScript.split(';').filter(s => s.trim().length > 0);
        for (const statement of statements) {
            await dbRun(statement);
        }
    } catch(err) {
        console.error("Erro ao criar tabelas:", err.message);
    }
};

// --- FUNÇÃO PARA SEMEAR DADOS INICIAIS ---
const seedInitialData = async () => {
    try {
        console.log('🌱 A semear dados iniciais (se necessário)...');
        
        // Formas de Pagamento
        await dbRun("INSERT OR IGNORE INTO FormasPagamento (Nome, TipoLancamento) VALUES ('Dinheiro', 'A_VISTA');");
        await dbRun("INSERT OR IGNORE INTO FormasPagamento (Nome, TipoLancamento) VALUES ('Cartão de Débito', 'A_VISTA');");
        await dbRun("INSERT OR IGNORE INTO FormasPagamento (Nome, TipoLancamento) VALUES ('Cartão de Crédito', 'A_VISTA');");
        await dbRun("INSERT OR IGNORE INTO FormasPagamento (Nome, TipoLancamento) VALUES ('Pix', 'A_VISTA');");
        await dbRun("INSERT OR IGNORE INTO FormasPagamento (Nome, TipoLancamento) VALUES ('Fiado (A Prazo)', 'A_PRAZO');");

        // Categorias
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Venda de Produtos', 'RECEITA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Venda de Serviços', 'RECEITA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Aluguel', 'DESPESA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Salários', 'DESPESA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Fornecedores', 'DESPESA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Outras Receitas', 'RECEITA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Outras Despesas', 'DESPESA');");
        await dbRun("INSERT OR IGNORE INTO CategoriasFinanceiras (Nome, Tipo) VALUES ('Taxas de Cartão', 'DESPESA');");
        

        // Conta Caixa Padrão
        await dbRun("INSERT OR IGNORE INTO ContasCaixa (Nome, SaldoInicial) VALUES ('Caixa Principal', 0.0);");
        
        // O UPDATE que você adicionou
        await dbRun("UPDATE FormasPagamento SET aceitaParcelas = 1, maxParcelas = 12 WHERE Nome = 'Cartão de Crédito';");
        
        console.log('🌱 Sementeira concluída.');
    } catch (err) {
        console.warn('Aviso ao semear dados (pode ser normal se os dados já existem):', err.message);
    }
};


const initializeDatabase = async () => {
    // A ordem é crucial:
    // 1. Criar tabelas
    await createTables();
    // 2. Executar migrações (alterar tabelas)
    await runMigrations();
    // 3. Semear dados iniciais
    await seedInitialData();
};

module.exports = { initializeDatabase };