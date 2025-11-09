// backend/models/clienteModel.js
const { dbAll, dbRun, dbGet } = require('../database/database');

// --- NOVA FUNÇÃO DE BUSCA ---
const searchByName = (termo) => {
    const sql = `
        SELECT * FROM Clientes
        WHERE nome LIKE ? 
        ORDER BY 
            CASE 
                WHEN nome LIKE ? THEN 1
                ELSE 2 
            END, 
            nome
    `;
    const params = [`%${termo}%`, `${termo}%`];
    return dbAll(sql, params);
};

const findAll = () => {
    // Esta consulta SQL usa a lógica CASE para devolver
    // 'vermelho', 'laranja' ou 'verde' com base na sua sugestão.
    const sql = `
        SELECT 
            c.*, 
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM Lancamentos l
                    WHERE l.ClienteID = c.id AND l.Status = 'PENDENTE' AND l.DataVencimento < DATE('now')
                ) THEN 'vermelho' -- 1. Tem dívida vencida
                
                WHEN EXISTS (
                    SELECT 1 FROM Lancamentos l
                    WHERE l.ClienteID = c.id AND l.Status = 'PENDENTE'
                ) THEN 'laranja' -- 2. Tem dívida (não vencida)
                
                ELSE 'verde' -- 3. Não tem dívidas
                
            END AS statusFinanceiro
        FROM Clientes c
    `;
    return dbAll(sql);
};

    const findById = (id) => {
        // Usamos a mesma consulta 'avançada' para obter o status
        const sql = `
            SELECT 
                c.*, 
                CASE
                    WHEN EXISTS (
                        SELECT 1 FROM Lancamentos l
                        WHERE l.ClienteID = c.id AND l.Status = 'PENDENTE' AND l.DataVencimento < DATE('now')
                    ) THEN 'vermelho'
                    WHEN EXISTS (
                        SELECT 1 FROM Lancamentos l
                        WHERE l.ClienteID = c.id AND l.Status = 'PENDENTE'
                    ) THEN 'laranja'
                    ELSE 'verde'
                END AS statusFinanceiro
            FROM Clientes c
            WHERE c.id = ?
        `;
        return dbGet(sql, [id]); // dbGet (retorna só um)
    };

    const findVendasByClienteId = (clienteId) => {
        const sql = `
            SELECT id, data, total 
            FROM Vendas 
            WHERE cliente_id = ? 
            ORDER BY data DESC
        `;
        return dbAll(sql, [clienteId]);
    };

const create = (cliente) => {
    const { nome, telefone, email, endereco } = cliente;
    return dbRun(
        'INSERT INTO Clientes (nome, telefone, email, endereco) VALUES (?, ?, ?, ?)',
        [nome, telefone, email, endereco]
    );
};

const update = (id, cliente) => {
    const { nome, telefone, email, endereco } = cliente;
    return dbRun(
        'UPDATE Clientes SET nome = ?, telefone = ?, email = ?, endereco = ? WHERE id = ?',
        [nome, telefone, email, endereco, id]
    );
};

// Ao remover um cliente, a base de dados está configurada para remover
// os seus veículos em cascata (ON DELETE CASCADE).
const remove = (id) => {
    return dbRun('DELETE FROM Clientes WHERE id = ?', [id]);
};

module.exports = {
    findAll,
    findById,
    findVendasByClienteId,
    create,
    update,
    remove,
    searchByName // <-- Adicionar a nova função
};