// ./cursos/controller_curso_frm.js - Cadastro, Edição e Carga em Lote de Áreas, Cursos e UCs (Otimizado com Store)
window.ControllerCursoFrm = {

    _validarPermissaoEdicao() {
        const cargosEdicao = ['root', 'admin', 'tecnico', 'docente'];
        if (!window.usuarioAtual || !cargosEdicao.includes(window.usuarioAtual.cargo)) {
            throw new Error("Perfil Somente Leitura: Você não possui permissão para cadastrar ou editar.");
        }
    },

    async salvarArea(nomeArea) {
        this._validarPermissaoEdicao();
        await window.Store.garantirPronto();

        const nomeLimpo = (nomeArea || "").trim();
        if (!nomeLimpo) return;

        const jaExiste = (window.Store.dados.areas || []).some(a => (a.nome || "").trim().toLowerCase() === nomeLimpo.toLowerCase());
        if (jaExiste) return;

        const docRef = await window.db.collection("areas").add({ nome: nomeLimpo });
        window.Store.upsertLocal("areas", { id: docRef.id, nome: nomeLimpo });
    },

    async editarArea(idArea, novoNome) {
        this._validarPermissaoEdicao();
        await window.Store.garantirPronto();

        const nomeFormatado = (novoNome || "").trim();
        if (!nomeFormatado) throw new Error("O nome da área não pode ser vazio.");

        const areaAtual = (window.Store.dados.areas || []).find(a => a.id === idArea);
        if (!areaAtual) throw new Error("Área não encontrada.");

        const nomeAntigo = areaAtual.nome;
        if (nomeAntigo === nomeFormatado) return;

        const batch = window.db.batch();
        const areaRef = window.db.collection("areas").doc(idArea);
        batch.update(areaRef, { nome: nomeFormatado });

        // Atualiza os cursos vinculados usando o Store em memória (sem .get())
        const cursosAfetados = (window.Store.dados.cursos || []).filter(c => c.area === nomeAntigo);
        cursosAfetados.forEach(c => {
            batch.update(window.db.collection("cursos").doc(c.id), { area: nomeFormatado });
        });

        await batch.commit();

        window.Store.upsertLocal("areas", { id: idArea, nome: nomeFormatado });
        cursosAfetados.forEach(c => window.Store.upsertLocal("cursos", { ...c, area: nomeFormatado }));
    },

    async salvarCurso(titulo, sigla, area, tipo, cargaHorariaManual = null) {
        this._validarPermissaoEdicao();
        await window.Store.garantirPronto();

        const payload = {
            titulo: titulo.trim(),
            sigla: sigla.trim().toUpperCase().slice(0, 4),
            area: area.trim(),
            tipo: tipo,
            criado_em: new Date().toISOString()
        };

        if (tipo === "Livre" && cargaHorariaManual !== null && cargaHorariaManual !== "") {
            const chNum = parseInt(cargaHorariaManual, 10);
            if (!isNaN(chNum) && chNum > 0 && chNum <= 39) {
                payload.carga_horaria = chNum;
            }
        }

        const docRef = await window.db.collection("cursos").add(payload);
        window.Store.upsertLocal("cursos", { id: docRef.id, ...payload });
    },

    async editarCurso(id, novosDados) {
        this._validarPermissaoEdicao();
        await window.Store.garantirPronto();

        const payload = {
            titulo: novosDados.titulo,
            sigla: (novosDados.sigla || "").trim().toUpperCase().slice(0, 4),
            area: novosDados.area,
            tipo: novosDados.tipo
        };

        if (novosDados.tipo === "Livre" && novosDados.carga_horaria !== null && novosDados.carga_horaria !== "") {
            const chNum = parseInt(novosDados.carga_horaria, 10);
            payload.carga_horaria = (!isNaN(chNum) && chNum > 0 && chNum <= 39) ? chNum : null;
        } else {
            payload.carga_horaria = null;
        }

        await window.db.collection("cursos").doc(id).update(payload);
        window.Store.upsertLocal("cursos", { id, ...payload });
    },

    async salvarUC(idCurso, referencia, titulo, cargaHoraria, indicadores, conhecimentos) {
        this._validarPermissaoEdicao();
        await window.Store.garantirPronto();

        const refPadrao = referencia.trim().toUpperCase();
        const duplicada = (window.Store.dados.ucs || []).some(
            u => u.id_curso === idCurso && (u.referencia || "").trim().toUpperCase() === refPadrao
        );

        if (duplicada) {
            throw new Error(`A referência ${refPadrao} já existe para este curso.`);
        }

        const payload = {
            id_curso: idCurso,
            referencia: refPadrao,
            titulo: titulo.trim(),
            carga_horaria: parseInt(cargaHoraria, 10),
            indicadores: indicadores ? indicadores.trim() : "",
            conhecimentos: conhecimentos ? conhecimentos.trim() : ""
        };

        const docRef = await window.db.collection("ucs").add(payload);
        window.Store.upsertLocal("ucs", { id: docRef.id, ...payload });
    },

    async editarUC(id, novosDados) {
        this._validarPermissaoEdicao();
        await window.Store.garantirPronto();

        const payload = {
            referencia: novosDados.referencia.trim().toUpperCase(),
            titulo: novosDados.titulo.trim(),
            carga_horaria: parseInt(novosDados.carga_horaria, 10),
            indicadores: novosDados.indicadores ? novosDados.indicadores.trim() : "",
            conhecimentos: novosDados.conhecimentos ? novosDados.conhecimentos.trim() : ""
        };

        await window.db.collection("ucs").doc(id).update(payload);
        window.Store.upsertLocal("ucs", { id, ...payload });
    },

    async carregarUCsLote(idCurso, arrayUCs) {
        this._validarPermissaoEdicao();
        await window.Store.garantirPronto();

        const refsExistentes = new Set(
            (window.Store.dados.ucs || [])
                .filter(u => u.id_curso === idCurso)
                .map(u => (u.referencia || "").trim().toUpperCase())
        );

        const batch = window.db.batch();
        const novosLocal = [];
        let contador = 0;

        for (const item of arrayUCs) {
            if (!item.referencia || !item.titulo || !item.carga_horaria) continue;
            let refLimpa = item.referencia.toString().trim().toUpperCase();
            if (!refLimpa.startsWith("UC-")) {
                refLimpa = `UC-${refLimpa.replace(/\D/g, '')}`;
            }

            if (!refsExistentes.has(refLimpa)) {
                const docRef = window.db.collection("ucs").doc();
                const novoItem = {
                    id_curso: idCurso,
                    referencia: refLimpa,
                    titulo: item.titulo.trim(),
                    carga_horaria: parseInt(item.carga_horaria, 10) || 0,
                    indicadores: item.indicadores ? item.indicadores.trim() : "",
                    conhecimentos: item.conhecimentos ? item.conhecimentos.trim() : ""
                };
                batch.set(docRef, novoItem);
                novosLocal.push({ id: docRef.id, ...novoItem });
                refsExistentes.add(refLimpa);
                contador++;
            }
        }

        if (contador > 0) {
            await batch.commit();
            novosLocal.forEach(u => window.Store.upsertLocal("ucs", u));
        }
        return contador;
    }
};