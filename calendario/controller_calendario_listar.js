// ./calendario/controller_calendario_listar.js - Leitura e Exclusão de Exceções do Calendário (Otimizado com Store)
window.ControllerCalendarioListar = {

    async listarExcecoes() {
        await window.Store.garantirPronto();
        return [...(window.Store.dados.excecoes || [])].sort((a, b) => (a.data || "").localeCompare(b.data || ""));
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