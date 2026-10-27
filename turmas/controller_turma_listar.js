// ./turmas/controller_turma_listar.js - Leitura e Exclusão de Turmas (Otimizado com Store Central)
window.ControllerTurmaListar = {

    _validarPermissaoEdicao() {
        const cargosEdicao = ['root', 'admin', 'tecnico', 'docente'];
        if (!window.usuarioAtual || !cargosEdicao.includes(window.usuarioAtual.cargo)) {
            throw new Error("Perfil Somente Leitura: Você não possui permissão para excluir turmas.");
        }
    },

    async listarTurmas() {
        await window.Store.garantirPronto();
        return [...(window.Store.dados.turmas || [])].sort((a, b) => (a.referencia || "").localeCompare(b.referencia || ""));
    },

    async listarCursosBase() {
        await window.Store.garantirPronto();
        return [...(window.Store.dados.cursos || [])].sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""));
    },

    async listarUCsBase() {
        await window.Store.garantirPronto();
        return [...(window.Store.dados.ucs || [])].sort((a, b) => (a.referencia || "").localeCompare(b.referencia || ""));
    },

    async listarEncontros() {
        await window.Store.garantirPronto();
        return [...(window.Store.dados.encontros || [])];
    },

    async excluirTurma(id) {
        this._validarPermissaoEdicao();
        await window.db.collection("turmas").doc(id).delete();
        window.Store.removerLocal("turmas", id);
    }
};
