// ./calendario/controller_calendario_listar.js - Leitura e Exclusão de Exceções do Calendário
window.ControllerCalendarioListar = {

    async listarExcecoes() {
        const snap = await window.db.collection("datas_excecoes").orderBy("data", "asc").get();
        return snap.docs.map(doc => doc.data());
    },

    async excluirExcecao(dataId) {
        const cargosPermitidos = ['root', 'admin'];
        if (!window.usuarioAtual || !cargosPermitidos.includes(window.usuarioAtual.cargo)) {
            throw new Error("Apenas Administradores podem excluir registros do calendário.");
        }
        await window.db.collection("datas_excecoes").doc(dataId).delete();
    }
};