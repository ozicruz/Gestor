// backend/controllers/servicoOSController.js
const { dbRun, dbGet } = require('../database/database');
const OrdemServico = require('../models/ordemServicoModel');

const adicionarServico = async (req, res) => {
    const { os_id } = req.params;
    // CORREÇÃO: Receber o valor_unitario que vem do frontend
    const { servico_id, quantidade, valor_unitario } = req.body; 

    try {
        // 1. Busca o preço original do serviço (para segurança)
        const servico = await dbGet('SELECT * FROM Servicos WHERE id = ?', [servico_id]);
        if (!servico) {
            return res.status(404).json({ message: 'Serviço não encontrado.' });
        }

        // 2. LÓGICA DO PREÇO:
        // Se o frontend mandou um valor (manual), usa ele. 
        // Se não mandou (undefined ou null), usa o preço do cadastro (servico.valor).
        const valorFinal = (valor_unitario !== undefined && valor_unitario !== null) 
                           ? parseFloat(valor_unitario) 
                           : servico.valor;

        // 3. Insere na tabela de ligação (Servicos_OS)
        await dbRun(
            'INSERT INTO Servicos_OS (os_id, servico_id, quantidade, valor) VALUES (?, ?, ?, ?)',
            [os_id, servico_id, quantidade, valorFinal]
        );

        // 4. Recalcula o total da OS
        await OrdemServico.recalculateTotal(os_id);

        res.status(201).json({ message: 'Serviço adicionado à OS com sucesso.' });

    } catch (err) {
        console.error('Erro ao adicionar serviço:', err);
        res.status(500).json({ message: 'Erro ao adicionar serviço.', error: err.message });
    }
};

const removerServico = async (req, res) => {
    const { servico_os_id } = req.params;

    try {
        // 1. Descobre qual é a OS antes de apagar (para recalcular o total depois)
        const registro = await dbGet('SELECT os_id FROM Servicos_OS WHERE id = ?', [servico_os_id]);
        if (!registro) {
            return res.status(404).json({ message: 'Serviço não encontrado na OS.' });
        }

        // 2. Remove o serviço
        await dbRun('DELETE FROM Servicos_OS WHERE id = ?', [servico_os_id]);

        // 3. Recalcula o total
        await OrdemServico.recalculateTotal(registro.os_id);

        res.json({ message: 'Serviço removido com sucesso.' });

    } catch (err) {
        res.status(500).json({ message: 'Erro ao remover serviço.', error: err.message });
    }
};

module.exports = {
    adicionarServico,
    removerServico
};