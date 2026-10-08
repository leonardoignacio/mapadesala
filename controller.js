// controller.js - Global (Permissões e Entidades Básicas)
window.Controller = {
    async obterPerfil(email, isSuperUser) {
        if (isSuperUser) return 'admin';
        try {
            const doc = await window.db.collection("usuarios_permissoes").doc(email).get();
            return doc.exists ? doc.data().cargo : 'sem_acesso';
        } catch (e) { return 'sem_acesso'; }
    },

    async salvarPermissao(email, cargo) {
        await window.db.collection("usuarios_permissoes").doc(email).set({ cargo, data: new Date() });
    },

    async salvarCurso(nome) { 
        await window.db.collection("cursos").add({ nome }); 
    },

    async salvarUC(idCurso, nome, descricao, cargaHoraria) {
        await window.db.collection("ucs").add({ 
            id_curso: idCurso, 
            nome: nome, 
            descricao: descricao, 
            carga_horaria_minima: parseInt(cargaHoraria) 
        });
    },

    async listarDocs(colecao) {
        const snap = await window.db.collection(colecao).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
};