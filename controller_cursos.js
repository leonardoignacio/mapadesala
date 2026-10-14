// controller_cursos.js - Regras de Negócio de Áreas, Cursos e UCs
window.ControllerCursos = {
    
    async listarAreas() {
        const snap = await window.db.collection("areas").orderBy("nome", "asc").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async salvarArea(nome) {
        await window.db.collection("areas").add({ nome: nome.trim() });
    },

    async editarArea(id, novoNome) {
        const docRef = window.db.collection("areas").doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) throw new Error("Área não encontrada no banco de dados.");
        
        const nomeAntigo = docSnap.data().nome;
        const nomeNovoFormatado = novoNome.trim();

        const batch = window.db.batch();
        batch.update(docRef, { nome: nomeNovoFormatado });

        const cursosSnap = await window.db.collection("cursos").where("area", "==", nomeAntigo).get();
        cursosSnap.forEach(cursoDoc => {
            batch.update(cursoDoc.ref, { area: nomeNovoFormatado });
        });

        await batch.commit();
    },

    async listarCursos() {
        const snap = await window.db.collection("cursos").orderBy("titulo", "asc").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async salvarCurso(titulo, sigla, area, tipo) {
        await window.db.collection("cursos").add({ 
            titulo: titulo.trim(), 
            sigla: sigla.trim().toUpperCase(),
            area: area.trim(), 
            tipo: tipo 
        });
    },

    async editarCurso(id, dados) {
        if(dados.sigla) dados.sigla = dados.sigla.trim().toUpperCase();
        if(dados.titulo) dados.titulo = dados.titulo.trim();
        if(dados.area) dados.area = dados.area.trim();
        await window.db.collection("cursos").doc(id).update(dados);
    },

    async excluirCurso(id) {
        await window.db.collection("cursos").doc(id).delete();
        
        const ucsRef = await window.db.collection("ucs").where("id_curso", "==", id).get();
        const batch = window.db.batch();
        ucsRef.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    },

    async listarUCs() {
        const snap = await window.db.collection("ucs").orderBy("referencia", "asc").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async salvarUC(idCurso, referencia, titulo, cargaHoraria, indicadores, conhecimentos) {
        await window.db.collection("ucs").add({
            id_curso: idCurso,
            referencia: referencia.trim(),
            titulo: titulo.trim(),
            carga_horaria: parseInt(cargaHoraria),
            indicadores: indicadores ? indicadores.trim() : "",
            conhecimentos: conhecimentos ? conhecimentos.trim() : ""
        });
    },

    async editarUC(id, dados) {
        await window.db.collection("ucs").doc(id).update({
            ...dados,
            carga_horaria: parseInt(dados.carga_horaria)
        });
    },

    async excluirUC(id) {
        await window.db.collection("ucs").doc(id).delete();
    },

    async carregarUCsLote(idCurso, arrayUCs) {
        const snapExistentes = await window.db.collection("ucs").where("id_curso", "==", idCurso).get();
        const refsExistentes = new Set(snapExistentes.docs.map(doc => doc.data().referencia.toUpperCase().trim()));

        const dadosProcessados = [];
        const refsNoLote = new Set();

        arrayUCs.forEach(item => {
            let refRaw = item.referencia.toString().trim().toUpperCase();
            if (!refRaw.startsWith('UC-')) refRaw = 'UC-' + refRaw.replace(/\D/g, ''); 

            if (refRaw && item.titulo && item.carga_horaria) {
                if (!refsExistentes.has(refRaw) && !refsNoLote.has(refRaw)) {
                    dadosProcessados.push({
                        id_curso: idCurso,
                        referencia: refRaw,
                        titulo: item.titulo.trim(),
                        carga_horaria: parseInt(item.carga_horaria) || 0,
                        indicadores: item.indicadores ? item.indicadores.trim() : "",
                        conhecimentos: item.conhecimentos ? item.conhecimentos.trim() : ""
                    });
                    refsNoLote.add(refRaw);
                }
            }
        });

        if(dadosProcessados.length === 0) return 0;

        const chunks = [];
        for (let i = 0; i < dadosProcessados.length; i += 500) {
            chunks.push(dadosProcessados.slice(i, i + 500));
        }

        for (const chunk of chunks) {
            const batch = window.db.batch();
            chunk.forEach(uc => {
                const ref = window.db.collection("ucs").doc();
                batch.set(ref, uc);
            });
            await batch.commit();
        }

        return dadosProcessados.length;
    }
};