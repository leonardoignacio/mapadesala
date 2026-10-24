// ./turmas/controller_turma_frm.js - Regras de Negócio de Cadastro, Cálculos e Edição de Turmas (Otimizado com Store)
window.ControllerTurmaFrm = {

    _validarPermissaoEdicao() {
        const cargosEdicao = ['root', 'admin', 'tecnico', 'docente'];
        if (!window.usuarioAtual || !cargosEdicao.includes(window.usuarioAtual.cargo)) {
            throw new Error("Perfil Somente Leitura: Você não possui permissão para cadastrar ou editar turmas.");
        }
    },

    calcularCHEncontro(hInicio, hTermino) {
        if (!hInicio || !hTermino || !hInicio.includes(':') || !hTermino.includes(':')) return 0;

        const [h1, m1] = hInicio.split(':').map(Number);
        const [h2, m2] = hTermino.split(':').map(Number);

        const minInicio = (h1 * 60) + m1;
        const minTermino = (h2 * 60) + m2;
        const diffMinutos = minTermino - minInicio;

        if (diffMinutos <= 0) return 0;
        return Math.round((diffMinutos / 60) * 100) / 100;
    },

    normalizarUCTurma(uc, modo = 'status') {
        const chTotal = parseFloat(uc.carga_horaria) || 0;
        let status = uc.status || "Não Iniciada";
        let horasMinistradas = parseFloat(uc.horas_ministradas) || 0;

        if (modo === 'status') {
            if (status === "Não Iniciada") {
                horasMinistradas = 0;
            } else if (status === "Concluída") {
                horasMinistradas = chTotal;
            } else if (status === "Em Andamento") {
                if (horasMinistradas >= chTotal && chTotal > 0) {
                    horasMinistradas = chTotal;
                }
            }
        } else if (modo === 'horas') {
            if (horasMinistradas <= 0) {
                horasMinistradas = 0;
                status = "Não Iniciada";
            } else if (chTotal > 0 && horasMinistradas >= chTotal) {
                horasMinistradas = chTotal;
                status = "Concluída";
            } else {
                status = "Em Andamento";
            }
        }

        const progresso = chTotal > 0
            ? Math.min(100, Math.max(0, Math.round((horasMinistradas / chTotal) * 100)))
            : (status === "Concluída" ? 100 : 0);

        return {
            ...uc,
            n_aula: (uc.n_aula || "").toString().trim(),
            status: status,
            horas_ministradas: horasMinistradas,
            progresso: progresso
        };
    },

    calcularMetricasTurma(cursoObj, ucsNormalizadas, statusTurma) {
        const somaCHUCs = (ucsNormalizadas || []).reduce((acc, u) => acc + (parseFloat(u.carga_horaria) || 0), 0);
        const chTotalCurso = somaCHUCs > 0
            ? somaCHUCs
            : (parseFloat(cursoObj?.carga_horaria) || 0);

        const somaHorasMinistradas = (ucsNormalizadas || []).reduce((acc, u) => acc + (parseFloat(u.horas_ministradas) || 0), 0);

        let progressoTurma = 0;
        if (somaCHUCs > 0) {
            progressoTurma = Math.min(100, Math.max(0, Math.round((somaHorasMinistradas / somaCHUCs) * 100)));
        } else {
            if (statusTurma === "Concluída") progressoTurma = 100;
            else if (statusTurma === "Não Iniciada") progressoTurma = 0;
        }

        return { chTotalCurso, progressoTurma };
    },

    async salvarNovaTurma(dados, cursoObj, ucsDaTurma) {
        this._validarPermissaoEdicao();
        await window.Store.garantirPronto();

        if (!Array.isArray(dados.dias_semana) || dados.dias_semana.length === 0) {
            throw new Error("Selecione pelo menos um dia da semana para a turma.");
        }

        const chEncontro = this.calcularCHEncontro(dados.h_inicio, dados.h_termino);
        if (chEncontro <= 0) {
            throw new Error("O Horário de Término deve ser posterior ao Horário de Início.");
        }

        const ucsNormalizadas = (ucsDaTurma || []).map(uc => this.normalizarUCTurma(uc, 'status'));
        const { chTotalCurso, progressoTurma } = this.calcularMetricasTurma(cursoObj, ucsNormalizadas, dados.status);

        const novaTurma = {
            referencia: dados.referencia.trim().toUpperCase(),
            id_curso: cursoObj.id,
            curso_titulo: cursoObj.titulo,
            curso_sigla: cursoObj.sigla || "",
            area: cursoObj.area,
            oferta: dados.oferta.trim(),
            d_inicio: dados.d_inicio,
            d_termino: dados.d_termino,
            periodo: dados.periodo,
            h_inicio: dados.h_inicio,
            h_termino: dados.h_termino,
            dias_semana: dados.dias_semana,
            ch_encontro: chEncontro,
            ucs: ucsNormalizadas,
            ch_total_curso: chTotalCurso,
            progresso_turma: progressoTurma,
            status: dados.status || "Não Iniciada",
            criado_em: new Date().toISOString()
        };

        const docRef = await window.db.collection("turmas").add(novaTurma);
        const turmaComId = { id: docRef.id, ...novaTurma };
        window.Store.upsertLocal("turmas", turmaComId);
        return turmaComId;
    },

    async editarTurma(idTurma, dados, cursoObj, ucsDaTurma) {
        this._validarPermissaoEdicao();
        await window.Store.garantirPronto();

        if (!Array.isArray(dados.dias_semana) || dados.dias_semana.length === 0) {
            throw new Error("Selecione pelo menos um dia da semana para a turma.");
        }

        const chEncontro = this.calcularCHEncontro(dados.h_inicio, dados.h_termino);
        if (chEncontro <= 0) {
            throw new Error("O Horário de Término deve ser posterior ao Horário de Início.");
        }

        const ucsNormalizadas = (ucsDaTurma || []).map(uc => this.normalizarUCTurma(uc, 'horas'));
        const { chTotalCurso, progressoTurma } = this.calcularMetricasTurma(cursoObj, ucsNormalizadas, dados.status);

        const payload = {
            referencia: dados.referencia.trim().toUpperCase(),
            id_curso: cursoObj.id,
            curso_titulo: cursoObj.titulo,
            curso_sigla: cursoObj.sigla || "",
            area: cursoObj.area,
            oferta: dados.oferta.trim(),
            d_inicio: dados.d_inicio,
            d_termino: dados.d_termino,
            periodo: dados.periodo,
            h_inicio: dados.h_inicio,
            h_termino: dados.h_termino,
            dias_semana: dados.dias_semana,
            ch_encontro: chEncontro,
            ucs: ucsNormalizadas,
            ch_total_curso: chTotalCurso,
            progresso_turma: progressoTurma,
            status: dados.status,
            atualizado_em: new Date().toISOString()
        };

        await window.db.collection("turmas").doc(idTurma).update(payload);
        window.Store.upsertLocal("turmas", { id: idTurma, ...payload });
    },

    async atualizarUCDentroDaTurma(turmaObj, ucIdx, novosDadosUC, cursoObj) {
        this._validarPermissaoEdicao();
        await window.Store.garantirPronto();

        const ucsCopia = Array.isArray(turmaObj.ucs) ? [...turmaObj.ucs] : [];
        if (!ucsCopia[ucIdx]) throw new Error("Unidade Curricular não localizada nesta turma.");

        const ucAtualizada = this.normalizarUCTurma({
            ...ucsCopia[ucIdx],
            n_aula: novosDadosUC.n_aula,
            status: novosDadosUC.status,
            horas_ministradas: novosDadosUC.horas_ministradas
        }, novosDadosUC.modoCalculo || 'horas');

        ucsCopia[ucIdx] = ucAtualizada;

        let novoStatusTurma = turmaObj.status;
        if (ucsCopia.length > 0) {
            const todasConcluidas = ucsCopia.every(u => u.status === "Concluída");
            const todasNaoIniciadas = ucsCopia.every(u => u.status === "Não Iniciada" && (parseFloat(u.horas_ministradas) || 0) === 0);
            if (todasConcluidas) novoStatusTurma = "Concluída";
            else if (todasNaoIniciadas) novoStatusTurma = "Não Iniciada";
            else novoStatusTurma = "Em Andamento";
        }

        const { chTotalCurso, progressoTurma } = this.calcularMetricasTurma(cursoObj || { carga_horaria: turmaObj.ch_total_curso }, ucsCopia, novoStatusTurma);

        const patch = {
            ucs: ucsCopia,
            ch_total_curso: chTotalCurso,
            progresso_turma: progressoTurma,
            status: novoStatusTurma,
            atualizado_em: new Date().toISOString()
        };

        await window.db.collection("turmas").doc(turmaObj.id).update(patch);
        window.Store.upsertLocal("turmas", { ...turmaObj, ...patch });
    }
};