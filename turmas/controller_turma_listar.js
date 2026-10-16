// ./turmas/controller_turma_listar.js - Leitura e Exclusão de Turmas
window.ControllerTurmaListar = {

    _validarPermissaoEdicao() {
        const cargosEdicao = ['root', 'admin', 'tecnico', 'docente'];
        if (!window.usuarioAtual || !cargosEdicao.includes(window.usuarioAtual.cargo)) {
            throw new Error("Perfil Somente Leitura: Você não possui permissão para excluir turmas.");
        }
    },

    async listarTurmas() {
        const snap = await window.db.collection("turmas").orderBy("referencia", "asc").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async listarCursosBase() {
        const snap = await window.db.collection("cursos").orderBy("titulo", "asc").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async listarUCsBase() {
        const snap = await window.db.collection("ucs").orderBy("referencia", "asc").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async excluirTurma(id) {
        this._validarPermissaoEdicao();
        await window.db.collection("turmas").doc(id).delete();
    }
};