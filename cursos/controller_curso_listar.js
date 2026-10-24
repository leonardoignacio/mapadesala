// ./cursos/controller_curso_listar.js - Leitura e Exclusão de Áreas, Cursos e UCs (Otimizado com Store Central)
window.ControllerCursoListar = {

    _validarPermissaoEdicao() {
        const cargosEdicao = ['root', 'admin', 'tecnico', 'docente'];
        if (!window.usuarioAtual || !cargosEdicao.includes(window.usuarioAtual.cargo)) {
            throw new Error("Perfil Somente Leitura: Você não possui permissão para excluir Cursos ou UCs.");
        }
    },

    async listarAreas() {
        await window.Store.garantirPronto();
        return [...(window.Store.dados.areas || [])].sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    },

    async listarCursos() {
        await window.Store.garantirPronto();
        return [...(window.Store.dados.cursos || [])].sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""));
    },

    async listarUCs() {
        await window.Store.garantirPronto();
        return [...(window.Store.dados.ucs || [])].sort((a, b) => (a.referencia || "").localeCompare(b.referencia || ""));
    },

    async excluirCurso(id) {
        this._validarPermissaoEdicao();
        await window.Store.garantirPronto();

        await window.db.collection("cursos").doc(id).delete();
        window.Store.removerLocal("cursos", id);

        // Localiza as UCs vinculadas em memória sem gastar leituras .get()
        const ucsVinculadas = (window.Store.dados.ucs || []).filter(u => u.id_curso === id);
        if (ucsVinculadas.length > 0) {
            const batch = window.db.batch();
            ucsVinculadas.forEach(uc => {
                batch.delete(window.db.collection("ucs").doc(uc.id));
            });
            await batch.commit();
            ucsVinculadas.forEach(uc => window.Store.removerLocal("ucs", uc.id));
        }
    },

    async excluirUC(id) {
        this._validarPermissaoEdicao();
        await window.db.collection("ucs").doc(id).delete();
        window.Store.removerLocal("ucs", id);
    }
};