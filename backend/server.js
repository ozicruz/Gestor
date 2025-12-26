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

const app = express();
app.use(cors());
app.use(express.json());
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

const startServer = (port) => {
    app.listen(port, () => {
        console.log(`Servidor a rodar na porta ${port}`);
    });
};

module.exports = { startServer, db };

if (require.main === module) {
    startServer(3002);
}