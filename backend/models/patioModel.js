const { dbAll } = require('../database/database');

const findAllActive = () => {
    const sql = `
        SELECT 
            os.id, 
            os.status, 
            os.data_entrada, 
            v.placa, 
            v.marca, 
            v.modelo, 
            c.nome as cliente_nome 
        FROM Ordens_Servico os
        JOIN Veiculos v ON os.veiculo_id = v.id
        JOIN Clientes c ON v.cliente_id = c.id
        WHERE os.status NOT IN ('Entregue', 'Cancelada') 
        ORDER BY os.data_entrada ASC`;

    return dbAll(sql);
};

module.exports = {
    findAllActive
};