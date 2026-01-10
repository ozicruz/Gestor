const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database/database_initializer');
const { db } = require('./database/database');

initializeDatabase();

// --- IMPORTAÇÕES (Caminhos Corrigidos) ---
const produtoRoutes = require('./routes/produtoRoutes');
const servicoRoutes = require('./routes/servicoRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const veiculoRoutes = require('./routes/veiculoRoutes');
const patioRoutes = require('./routes/patioRoutes');
const vendaRoutes = require('./routes/vendaRoutes');
const ordemServicoRoutes = require('./routes/ordemServicoRoutes');
const financeiroRoutes = require('./routes/financeiroRoutes');
const relatorioRoutes = require('./routes/relatorioRoutes');
const empresaRoutes = require('./routes/empresaRoutes');
const backupRoutes = require('./routes/backupRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');


const app = express();
app.use(cors());
app.use(express.json());

// --- Rota CORRIGIDA para buscar contas (Tabela certa: ContasCaixa) ---
app.get('/api/financeiro/contas', (req, res) => {
    // Busca na tabela correta 'ContasCaixa'
    const sql = `SELECT * FROM ContasCaixa WHERE Ativo = 1 ORDER BY Nome`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            // Se der erro porque a coluna 'Ativo' não existe, tenta buscar tudo sem filtro
            if (err.message.includes('no such column: Ativo')) {
                db.all(`SELECT * FROM ContasCaixa ORDER BY Nome`, [], (err2, rows2) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    res.json(rows2);
                });
                return;
            }
            console.error('Erro ao buscar contas:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});
// ---------------------------------------------------------------------
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// --- CONFIGURAÇÃO DAS ROTAS ---
app.use('/api', produtoRoutes);
app.use('/api', servicoRoutes);
app.use('/api', clienteRoutes);
app.use('/api/veiculos', veiculoRoutes);
app.use('/api', patioRoutes);
app.use('/api/vendas', vendaRoutes);
app.use('/api/os', ordemServicoRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api', empresaRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api', usuarioRoutes);

const startServer = (port) => {
    app.listen(port, () => {
        console.log(`Servidor a rodar na porta ${port}`);
    });
};

module.exports = { startServer, db };

if (require.main === module) {
    startServer(3002);
}