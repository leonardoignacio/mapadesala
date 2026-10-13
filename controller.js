// controller.js - Regras de Negócio Globais
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

    async listarDocs(colecao) {
        const snap = await window.db.collection(colecao).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
};