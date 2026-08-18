// controller.js
window.Controller = {
    // Permissões
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

    // Módulo de Exceções
    async gerarDomingos(ano) {
        const anoInt = parseInt(ano);
        let dataAtual = new Date(anoInt, 0, 1);
        const batch = window.db.batch(); // Gravação em lote para não onerar o banco

        while (dataAtual.getFullYear() === anoInt) {
            if (dataAtual.getDay() === 0) { // 0 = Domingo
                // Ajusta fuso para evitar que 00:00 vire sábado às 21:00
                const dataFormatada = new Date(dataAtual.getTime() - (dataAtual.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                const ref = window.db.collection("datas_excecoes").doc(dataFormatada);
                batch.set(ref, { data: dataFormatada, excecao: "Domingo", descricao: "Descanso Automático" });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        await batch.commit();
    },

    async salvarExcecaoManual(data, excecao, descricao) {
        await window.db.collection("datas_excecoes").doc(data).set({ data, excecao, descricao });
    },

    // Módulos de Entidades Básicas
    async salvarCurso(nome) {
        await window.db.collection("cursos").add({ nome });
    },

    async salvarUC(idCurso, nome, descricao, cargaHoraria) {
        await window.db.collection("ucs").add({
            id_curso: idCurso,
            nome: nome,
            descricao: descricao, // UC ou Curso Livre
            carga_horaria_minima: parseInt(cargaHoraria)
        });
    },

    // Leituras Genéricas
    async listarDocs(colecao) {
        const snap = await window.db.collection(colecao).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
};