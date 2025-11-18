// backend/server.js
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database/database_initializer');
const { db } = require('./database/database');

initializeDatabase();

// Importa os ficheiros de rotas
const produtoRoutes = require('./routes/produtoRoutes');
const servicoRoutes = require('./routes/servicoRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const patioRoutes = require('./routes/patioRoutes');
const vendaRoutes = require('./routes/vendaRoutes');
const ordemServicoRoutes = require('./routes/ordemServicoRoutes');
const financeiroRoutes = require('./routes/financeiroRoutes');
const relatorioRoutes = require('./routes/relatorioRoutes');
const empresaRoutes = require('./routes/empresaRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Usa as rotas refatoradas
app.use('/api', produtoRoutes);
app.use('/api', servicoRoutes);
app.use('/api', clienteRoutes);
app.use('/api', patioRoutes);
app.use('/api', vendaRoutes);
app.use('/api', ordemServicoRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api', empresaRoutes);

// Função para iniciar o servidor
const startServer = (port) => {
    app.listen(port, () => {
        console.log(`Servidor a rodar na porta ${port}`);
    });
};

module.exports = { startServer, db };

if (require.main === module) {
    startServer(3002);
}