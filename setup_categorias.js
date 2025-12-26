const sqlite3 = require('sqlite3').verbose();

// Caminho absoluto para o seu banco de dados (com barras duplas)
const dbPath = 'C:\\Users\\ozile\\Documents\\GerenciadorOficina\\database.sqlite';

console.log(`Tentando conectar ao banco em: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

const categoriasPadrao = [
    // DESPESAS
    { nome: 'Despesa Fixa (Aluguel/Luz/Água)', tipo: 'DESPESA' },
    { nome: 'Despesa com Pessoal (Salários)', tipo: 'DESPESA' },
    { nome: 'Fornecedores (Peças/Estoque)', tipo: 'DESPESA' },
    { nome: 'Impostos e Taxas', tipo: 'DESPESA' },
    { nome: 'Manutenção da Oficina', tipo: 'DESPESA' },
    { nome: 'Marketing e Publicidade', tipo: 'DESPESA' },
    { nome: 'Outras Despesas', tipo: 'DESPESA' },
    // RECEITAS
    { nome: 'Venda de Produtos', tipo: 'RECEITA' },
    { nome: 'Prestação de Serviços', tipo: 'RECEITA' }
];

db.serialize(() => {
    console.log("Iniciando cadastro de categorias...");
    
    // Cria a tabela se não existir
    db.run(`CREATE TABLE IF NOT EXISTS Categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        Nome TEXT NOT NULL,
        Tipo TEXT NOT NULL
    )`);

    const stmt = db.prepare("INSERT INTO Categorias (Nome, Tipo) VALUES (?, ?)");
    
    categoriasPadrao.forEach(cat => {
        stmt.run(cat.nome, cat.tipo, (err) => {
            if (err) console.log(`[!] Erro ou já existe: ${cat.nome}`);
            else console.log(`[OK] Criado: ${cat.nome}`);
        });
    });

    stmt.finalize();
    // Pequeno delay para garantir a gravação
    setTimeout(() => {
        console.log("Processo finalizado.");
        db.close();
    }, 1000);
});