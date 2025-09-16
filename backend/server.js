// backend/server.js
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database/database_initializer');

// A ÚNICA MUDANÇA CRÍTICA É NESTA LINHA:
const { db, dbAll, dbGet, dbRun } = require('./database/database'); 

// Chama a função para criar as tabelas se não existirem
initializeDatabase();

// Importa os ficheiros de rotas
const produtoRoutes = require('./routes/produtoRoutes');
const servicoRoutes = require('./routes/servicoRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const patioRoutes = require('./routes/patioRoutes');
const vendaRoutes = require('./routes/vendaRoutes');
const ordemServicoRoutes = require('./routes/ordemServicoRoutes');

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


// Função para iniciar o servidor
const startServer = (port) => {
    app.listen(port, () => {
        console.log(`Servidor a rodar na porta ${port}`);
    });
};

// Agora a exportação funciona, pois 'db' foi importado corretamente.
module.exports = { startServer, db };

// Esta verificação garante que o servidor só inicia automaticamente
// quando executamos "node backend/server.js" diretamente.
// Ele não vai iniciar quando o ficheiro for importado pelo main.js.
if (require.main === module) {
    startServer(3002);
}
// A chave '}' extra foi removida do final.