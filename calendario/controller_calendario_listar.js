// ./calendario/controller_calendario_listar.js - Leitura e Exclusão de Exceções do Calendário (Otimizado com Store)
window.ControllerCalendarioListar = {

    async listarExcecoes() {
        await window.Store.garantirPronto();
        // Normaliza registros antigos ou incompletos (sem dia_semana, só com "tipo" ou sem descrição),
        // evitando "undefined" na tabela e erros nos filtros.
        return (window.Store.dados.excecoes || [])
            .map(e => {
                const data = (e.data || e.id || "").toString();
                const excecao = (e.excecao || e.tipo || "Outros").toString();
                return { ...e, data, excecao, descricao: (e.descricao || "").toString(), dia_semana: e.dia_semana || window.Util.diaSemana(data) };
            })
            .filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.data))
            .sort((a, b) => a.data.localeCompare(b.data));
    },

    async excluirExcecao(dataId) {
        const cargosPermitidos = ['root', 'admin'];
        if (!window.usuarioAtual || !cargosPermitidos.includes(window.usuarioAtual.cargo)) {
            throw new Error("Apenas Administradores podem excluir registros do calendário.");
        }
        await window.db.collection("datas_excecoes").doc(dataId).delete();
        window.Store.removerLocal("excecoes", dataId);
    }
};