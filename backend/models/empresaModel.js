// backend/models/empresaModel.js
const { dbGet, dbRun } = require('../database/database');

/**
 * Busca os dados da empresa. 
 * Como só existe uma linha (id = 1), usamos dbGet.
 */
const find = () => {
    // Busca sempre a primeira (e única) linha
    return dbGet('SELECT * FROM Empresa WHERE id = 1');
};

/**
 * Atualiza os dados da empresa.
 */
const update = (empresa) => {
    const { nome_fantasia, razao_social, cnpj_cpf, endereco, telefone, email } = empresa;

    return dbRun(
        `UPDATE Empresa SET 
            nome_fantasia = ?, 
            razao_social = ?, 
            cnpj_cpf = ?, 
            endereco = ?, 
            telefone = ?, 
            email = ?
        WHERE id = 1`, // Atualiza sempre a única linha
        [nome_fantasia, razao_social, cnpj_cpf, endereco, telefone, email]
    );
};

module.exports = {
    find,
    update
};