// ./cursos/controller_curso_frm.js - Regras de Negócio de Cadastro e Edição de Áreas, Cursos e UCs
window.ControllerCursoFrm = {

    _validarPermissaoEdicao() {
        const cargosEdicao = ['root', 'admin', 'tecnico', 'docente'];
        if (!window.usuarioAtual || !cargosEdicao.includes(window.usuarioAtual.cargo)) {
            throw new Error("Perfil Somente Leitura: Você não possui permissão para cadastrar ou editar dados em Cursos e UCs.");
        }
    },

    async salvarArea(nome) {
        this._validarPermissaoEdicao();
        await window.db.collection("areas").add({ nome: nome.trim() });
    },

    async editarArea(id, novoNome) {
        this._validarPermissaoEdicao();
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

    async salvarCurso(titulo, sigla, area, tipo, cargaHorariaManual = null) {
        this._validarPermissaoEdicao();
        const chValida = (tipo === "Livre" && cargaHorariaManual && parseInt(cargaHorariaManual) <= 39)
            ? parseInt(cargaHorariaManual)
            : null;

        await window.db.collection("cursos").add({ 
            titulo: titulo.trim(), 
            sigla: sigla.trim().toUpperCase(),
            area: area.trim(), 
            tipo: tipo,
            carga_horaria: chValida
        });
    },

    async editarCurso(id, dados) {
        this._validarPermissaoEdicao();
        if (dados.sigla) dados.sigla = dados.sigla.trim().toUpperCase();
        if (dados.titulo) dados.titulo = dados.titulo.trim();
        if (dados.area) dados.area = dados.area.trim();
        
        if (dados.tipo === "Livre" && dados.carga_horaria && parseInt(dados.carga_horaria) <= 39) {
            dados.carga_horaria = parseInt(dados.carga_horaria);
        } else {
            dados.carga_horaria = null;
        }

        await window.db.collection("cursos").doc(id).update(dados);
    },

    async salvarUC(idCurso, referencia, titulo, cargaHoraria, indicadores, conhecimentos) {
        this._validarPermissaoEdicao();
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
        this._validarPermissaoEdicao();
        await window.db.collection("ucs").doc(id).update({
            ...dados,
            carga_horaria: parseInt(dados.carga_horaria)
        });
    },

    async carregarUCsLote(idCurso, arrayUCs) {
        this._validarPermissaoEdicao();
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