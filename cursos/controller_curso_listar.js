// ./cursos/controller_curso_listar.js - Leitura e Exclusão de Áreas, Cursos e UCs
window.ControllerCursoListar = {

    _validarPermissaoEdicao() {
        const cargosEdicao = ['root', 'admin', 'tecnico', 'docente'];
        if (!window.usuarioAtual || !cargosEdicao.includes(window.usuarioAtual.cargo)) {
            throw new Error("Perfil Somente Leitura: Você não possui permissão para excluir Cursos ou UCs.");
        }
    },

    async listarAreas() {
        const snap = await window.db.collection("areas").orderBy("nome", "asc").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async listarCursos() {
        const snap = await window.db.collection("cursos").orderBy("titulo", "asc").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async listarUCs() {
        const snap = await window.db.collection("ucs").orderBy("referencia", "asc").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async excluirCurso(id) {
        this._validarPermissaoEdicao();
        await window.db.collection("cursos").doc(id).delete();
        
        const ucsRef = await window.db.collection("ucs").where("id_curso", "==", id).get();
        const batch = window.db.batch();
        ucsRef.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    },

    async excluirUC(id) {
        this._validarPermissaoEdicao();
        await window.db.collection("ucs").doc(id).delete();
    }
};