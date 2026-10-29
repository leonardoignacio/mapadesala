// ./turmas/app_turma_frm.js - Lógica de Formulários, Cálculos Dinâmicos e Modais de Turmas
window.AppTurmaFrm = {

    podeEditar() {
        const cargosEdicao = ['root', 'admin', 'tecnico', 'docente'];
        return cargosEdicao.includes(window.usuarioAtual?.cargo);
    },

    popularSelectCursos() {
        const cacheCursos = window.AppTurmaListar?.cacheCursos || [];
        const options = '<option value="" disabled selected>Selecione o Curso...</option>' +
            cacheCursos.map(c => '<option value="' + window.Util.esc(c.id) + '">[' + window.Util.esc(c.sigla || '---') + '] ' + window.Util.esc(c.titulo) + '</option>').join('');

        const selectAdd = document.getElementById('add-turma-curso');
        if (selectAdd) selectAdd.innerHTML = options;

        const selectEdit = document.getElementById('edit-turma-curso');
        if (selectEdit) selectEdit.innerHTML = options;
    },

    _formatarCH(valor) {
        const num = parseFloat(valor) || 0;
        const txt = Number.isInteger(num) ? num.toString() : num.toFixed(1).replace('.', ',');
        return `${txt}h`;
    },

    aoMudarPeriodoNoForm(contexto = 'add') {
        const selectPeriodo = document.getElementById(`${contexto}-turma-periodo`);
        const inputHInicio = document.getElementById(`${contexto}-turma-hinicio`);
        const inputHTermino = document.getElementById(`${contexto}-turma-htermino`);
        if (!selectPeriodo || !inputHInicio || !inputHTermino) return;

        if (selectPeriodo.value === 'MANHÃ') {
            inputHInicio.value = '08:00';
            inputHTermino.value = '12:00';
        } else if (selectPeriodo.value === 'TARDE') {
            inputHInicio.value = '13:30';
            inputHTermino.value = '17:30';
        } else if (selectPeriodo.value === 'NOITE') {
            inputHInicio.value = '19:00';
            inputHTermino.value = '22:30';
        }

        this.atualizarCHEncontroNoForm(contexto);
    },

    atualizarCHEncontroNoForm(contexto = 'add') {
        const hInicio = document.getElementById(`${contexto}-turma-hinicio`)?.value;
        const hTermino = document.getElementById(`${contexto}-turma-htermino`)?.value;
        const inputCH = document.getElementById(`${contexto}-turma-chencontro`);
        if (!inputCH) return;

        const ch = window.ControllerTurmaFrm.calcularCHEncontro(hInicio, hTermino);
        inputCH.value = ch > 0 ? this._formatarCH(ch) : "Horário Inválido";
    },

    aoSelecionarCursoNoForm(contexto = 'add') {
        const selectCurso = document.getElementById(`${contexto}-turma-curso`);
        const inputArea = document.getElementById(`${contexto}-turma-area`);
        const inputRef = document.getElementById(`${contexto}-turma-ref`);
        if (!selectCurso) return;

        const cacheCursos = window.AppTurmaListar?.cacheCursos || [];
        const cacheUCsBase = window.AppTurmaListar?.cacheUCsBase || [];
        const curso = cacheCursos.find(c => c.id === selectCurso.value);
        if (!curso) return;

        if (inputArea) inputArea.value = curso.area || "";

        let siglaCurso = (curso.sigla || "").trim().toUpperCase();
        if (!siglaCurso) {
            const textoOpcao = selectCurso.options[selectCurso.selectedIndex]?.text || "";
            const matchSigla = textoOpcao.match(/^\[([^\]]+)\]/);
            if (matchSigla && matchSigla[1] !== '---') {
                siglaCurso = matchSigla[1].trim().toUpperCase();
            }
        }

        if (inputRef && siglaCurso) {
            const valorAtual = inputRef.value.trim().toUpperCase();
            if (!valorAtual || /^[A-Z0-9]+-$/.test(valorAtual)) {
                inputRef.value = `${siglaCurso}-`;
            } else if (valorAtual.includes('-')) {
                const sufixo = valorAtual.split('-').slice(1).join('-');
                inputRef.value = `${siglaCurso}-${sufixo}`;
            } else {
                inputRef.value = `${siglaCurso}-`;
            }
        }

        if (contexto === 'add') {
            this.renderizarUCsNoFormCadastro(curso, cacheUCsBase);
        }
    },

    renderizarUCsNoFormCadastro(curso, cacheUCsBase) {
        const container = document.getElementById('container-add-turma-ucs');
        if (!container || !curso) return;

        const ucsDoCurso = (cacheUCsBase || []).filter(u => u.id_curso === curso.id).sort((a, b) => {
            const numA = parseInt((a.referencia || "").replace(/\D/g, '')) || 0;
            const numB = parseInt((b.referencia || "").replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        if (ucsDoCurso.length === 0) {
            const chCursoLivre = curso.carga_horaria ? ` (${curso.carga_horaria}h)` : '';
            container.innerHTML = `<p class="text-xs md:text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-xl border border-slate-100">Este curso não possui UCs vinculadas${chCursoLivre}.</p>`;
            return;
        }

        container.innerHTML = ucsDoCurso.map((uc, idx) => `
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 item-uc-form-add" data-uc-id="${uc.id}">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-extrabold text-blue-700">${window.Util.esc(uc.referencia)} — ${window.Util.esc(uc.titulo)}</span>
                    <span class="text-xs font-black text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">${uc.carga_horaria}h</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">N_Aula (Código de Aula)</label>
                        <input type="text" id="add-turma-uc-naula-${idx}" placeholder="Ex: 109887" class="w-full border border-slate-300 bg-white p-1.5 rounded-lg text-xs outline-none focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Status Inicial da UC</label>
                        <select id="add-turma-uc-status-${idx}" class="w-full border border-slate-300 bg-white p-1.5 rounded-lg text-xs outline-none focus:border-blue-500 cursor-pointer">
                            <option value="Não Iniciada" selected>Não Iniciada (0%)</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Concluída">Concluída (100%)</option>
                        </select>
                    </div>
                </div>
            </div>
        `).join('');
    },

    abrirModalEditarTurma(idTurma) {
        if (!this.podeEditar()) return;
        const cacheTurmas = window.AppTurmaListar?.cacheTurmas || [];
        const turma = cacheTurmas.find(t => t.id === idTurma);
        if (!turma) return;

        this.popularSelectCursos();

        document.getElementById('edit-turma-id').value = turma.id;
        document.getElementById('edit-turma-curso').value = turma.id_curso;
        document.getElementById('edit-turma-ref').value = turma.referencia || "";
        document.getElementById('edit-turma-oferta').value = turma.oferta || "";
        document.getElementById('edit-turma-area').value = turma.area || "";
        document.getElementById('edit-turma-dinicio').value = turma.d_inicio || "";
        document.getElementById('edit-turma-dtermino').value = turma.d_termino || "";
        document.getElementById('edit-turma-periodo').value = turma.periodo || "NOITE";
        document.getElementById('edit-turma-hinicio').value = turma.h_inicio || "19:00";
        document.getElementById('edit-turma-htermino').value = turma.h_termino || "22:30";
        document.getElementById('edit-turma-status').value = turma.status || "Não Iniciada";

        // Marca os checkboxes dos dias da semana salvos na turma
        const diasSalvos = new Set(Array.isArray(turma.dias_semana) ? turma.dias_semana : []);
        document.querySelectorAll('.chk-dias-semana-edit').forEach(chk => {
            chk.checked = diasSalvos.has(chk.value);
        });

        this.atualizarCHEncontroNoForm('edit');
        document.getElementById('modal-edit-turma')?.classList.remove('hidden');
    },

    abrirModalEditarUCTurma(idTurma, ucIdx) {
        const cacheTurmas = window.AppTurmaListar?.cacheTurmas || [];
        const turma = cacheTurmas.find(t => t.id === idTurma);
        if (!turma || !Array.isArray(turma.ucs) || !turma.ucs[ucIdx]) return;

        const uc = turma.ucs[ucIdx];

        document.getElementById('turma-uc-id-turma').value = turma.id;
        document.getElementById('turma-uc-idx').value = ucIdx;
        document.getElementById('subtitulo-modal-turma-uc').innerText = `Turma: ${turma.referencia} (${turma.curso_titulo}) • Oferta: ${turma.oferta || '---'}`;

        document.getElementById('turma-uc-ref-badge').innerText = uc.referencia || "UC";
        document.getElementById('turma-uc-titulo-texto').innerText = uc.titulo || "";
        document.getElementById('turma-uc-ch-badge').innerText = `CH Total: ${uc.carga_horaria || 0}h`;

        const inputNAula = document.getElementById('turma-uc-naula');
        const selectStatus = document.getElementById('turma-uc-status');
        const inputHoras = document.getElementById('turma-uc-horas');
        const inputProgresso = document.getElementById('turma-uc-progresso');

        inputNAula.value = uc.n_aula || "";
        selectStatus.value = uc.status || "Não Iniciada";
        inputHoras.max = uc.carga_horaria || 0;
        inputHoras.value = uc.horas_ministradas !== undefined ? uc.horas_ministradas : 0;
        inputProgresso.value = `${uc.progresso || 0}%`;

        document.getElementById('turma-uc-indicadores').value = uc.indicadores || "Sem indicadores cadastrados.";
        document.getElementById('turma-uc-conhecimentos').value = uc.conhecimentos || "Sem conhecimentos cadastrados.";

        document.getElementById('modal-edit-turma-uc')?.classList.remove('hidden');
    },

    aoMudarStatusUCNoModal() {
        const idTurma = document.getElementById('turma-uc-id-turma')?.value;
        const ucIdx = parseInt(document.getElementById('turma-uc-idx')?.value, 10);
        const turma = (window.AppTurmaListar?.cacheTurmas || []).find(t => t.id === idTurma);
        if (!turma || !turma.ucs[ucIdx]) return;

        const chTotal = parseFloat(turma.ucs[ucIdx].carga_horaria) || 0;
        const status = document.getElementById('turma-uc-status')?.value;
        const inputHoras = document.getElementById('turma-uc-horas');
        const inputProgresso = document.getElementById('turma-uc-progresso');

        if (status === "Não Iniciada") {
            inputHoras.value = 0;
            inputProgresso.value = "0%";
        } else if (status === "Concluída") {
            inputHoras.value = chTotal;
            inputProgresso.value = "100%";
        } else {
            const horasAtuais = parseFloat(inputHoras.value) || 0;
            const pct = chTotal > 0 ? Math.min(100, Math.round((horasAtuais / chTotal) * 100)) : 0;
            inputProgresso.value = `${pct}%`;
        }
    },

    aoDigitarHorasUCNoModal() {
        const idTurma = document.getElementById('turma-uc-id-turma')?.value;
        const ucIdx = parseInt(document.getElementById('turma-uc-idx')?.value, 10);
        const turma = (window.AppTurmaListar?.cacheTurmas || []).find(t => t.id === idTurma);
        if (!turma || !turma.ucs[ucIdx]) return;

        const chTotal = parseFloat(turma.ucs[ucIdx].carga_horaria) || 0;
        const inputHoras = document.getElementById('turma-uc-horas');
        const selectStatus = document.getElementById('turma-uc-status');
        const inputProgresso = document.getElementById('turma-uc-progresso');

        let horas = parseFloat(inputHoras.value);
        if (isNaN(horas) || horas < 0) horas = 0;
        if (chTotal > 0 && horas > chTotal) {
            horas = chTotal;
            inputHoras.value = chTotal;
        }

        const pct = chTotal > 0 ? Math.min(100, Math.round((horas / chTotal) * 100)) : 0;
        inputProgresso.value = `${pct}%`;

        if (horas === 0) selectStatus.value = "Não Iniciada";
        else if (chTotal > 0 && horas >= chTotal) selectStatus.value = "Concluída";
        else selectStatus.value = "Em Andamento";
    },

    async tratarCliques(e) {
        if (e.target.closest('#btn-close-modal-turma-uc') || e.target.closest('#btn-cancel-modal-turma-uc')) {
            document.getElementById('modal-edit-turma-uc')?.classList.add('hidden');
            return true;
        }

        if (!this.podeEditar()) return false;

        if (e.target.closest('.btn-editar-turma')) {
            const id = e.target.closest('.btn-editar-turma').getAttribute('data-id');
            this.abrirModalEditarTurma(id);
            return true;
        }

        if (e.target.closest('#btn-close-modal-edit-turma') || e.target.closest('#btn-cancel-modal-edit-turma')) {
            document.getElementById('modal-edit-turma')?.classList.add('hidden');
            return true;
        }

        return false;
    },

    async tratarSubmits(e) {
        const ids = ['form-turma', 'form-edit-turma', 'form-edit-turma-uc'];
        if (!ids.includes(e.target.id)) return false;

        e.preventDefault();
        if (!this.podeEditar()) {
            await window.Dialog.alerta("Perfil Somente Leitura: Operação não permitida.");
            return true;
        }

        const cacheCursos = window.AppTurmaListar?.cacheCursos || [];
        const cacheUCsBase = window.AppTurmaListar?.cacheUCsBase || [];
        const cacheTurmas = window.AppTurmaListar?.cacheTurmas || [];

        // 1. Cadastrar Nova Turma
        if (e.target.id === 'form-turma') {
            try {
                const idCurso = document.getElementById('add-turma-curso').value;
                const cursoObj = cacheCursos.find(c => c.id === idCurso);
                if (!cursoObj) throw new Error("Selecione um curso válido.");

                const diasSelecionados = Array.from(document.querySelectorAll('.chk-dias-semana-add:checked')).map(c => c.value);
                if (diasSelecionados.length === 0) {
                    throw new Error("Selecione pelo menos um dia da semana para a turma.");
                }

                const ucsDoCurso = cacheUCsBase.filter(u => u.id_curso === idCurso).sort((a, b) => {
                    const numA = parseInt((a.referencia || "").replace(/\D/g, '')) || 0;
                    const numB = parseInt((b.referencia || "").replace(/\D/g, '')) || 0;
                    return numA - numB;
                });

                const ucsMontadas = ucsDoCurso.map((uc, idx) => {
                    const nAula = document.getElementById(`add-turma-uc-naula-${idx}`)?.value || "";
                    const statusUC = document.getElementById(`add-turma-uc-status-${idx}`)?.value || "Não Iniciada";
                    return {
                        id_uc_base: uc.id,
                        referencia: uc.referencia,
                        titulo: uc.titulo,
                        carga_horaria: parseInt(uc.carga_horaria) || 0,
                        indicadores: uc.indicadores || "",
                        conhecimentos: uc.conhecimentos || "",
                        n_aula: nAula,
                        status: statusUC,
                        horas_ministradas: statusUC === "Concluída" ? (parseInt(uc.carga_horaria) || 0) : 0,
                        progresso: statusUC === "Concluída" ? 100 : 0
                    };
                });

                const dados = {
                    referencia: document.getElementById('add-turma-ref').value,
                    oferta: document.getElementById('add-turma-oferta').value,
                    d_inicio: document.getElementById('add-turma-dinicio').value,
                    d_termino: document.getElementById('add-turma-dtermino').value,
                    periodo: document.getElementById('add-turma-periodo').value,
                    h_inicio: document.getElementById('add-turma-hinicio').value,
                    h_termino: document.getElementById('add-turma-htermino').value,
                    dias_semana: diasSelecionados,
                    status: document.getElementById('add-turma-status').value
                };

                await window.ControllerTurmaFrm.salvarNovaTurma(dados, cursoObj, ucsMontadas);

                await window.Dialog.alerta("Turma cadastrada com sucesso!");
                e.target.reset();
                document.getElementById('add-turma-periodo').value = "NOITE";
                this.aoMudarPeriodoNoForm('add');
                document.querySelectorAll('.chk-dias-semana-add').forEach(c => c.checked = true);
                document.getElementById('container-add-turma-ucs').innerHTML = `<p class="text-sm text-slate-400 text-center py-8">Selecione um curso ao lado para carregar suas Unidades Curriculares.</p>`;

                await window.AppTurmaListar.carregarDadosBase();
                window.AppTurmaListar.popularFiltrosESelects();
                window.AppTurmaListar.renderizarTabelaTurmas();
            } catch (err) {
                await window.Dialog.erro(err);
            }
            return true;
        }

        // 2. Editar Turma Existente
        if (e.target.id === 'form-edit-turma') {
            try {
                const idTurma = document.getElementById('edit-turma-id').value;
                const turmaAtual = cacheTurmas.find(t => t.id === idTurma);
                if (!turmaAtual) throw new Error("Turma não encontrada.");

                const idCursoNovo = document.getElementById('edit-turma-curso').value;
                const cursoObj = cacheCursos.find(c => c.id === idCursoNovo);
                if (!cursoObj) throw new Error("Curso inválido.");

                const diasSelecionados = Array.from(document.querySelectorAll('.chk-dias-semana-edit:checked')).map(c => c.value);
                if (diasSelecionados.length === 0) {
                    throw new Error("Selecione pelo menos um dia da semana para a turma.");
                }

                let ucsDaTurma = turmaAtual.ucs || [];
                if (idCursoNovo !== turmaAtual.id_curso) {
                    const ucsNovoCurso = cacheUCsBase.filter(u => u.id_curso === idCursoNovo);
                    ucsDaTurma = ucsNovoCurso.map(uc => ({
                        id_uc_base: uc.id,
                        referencia: uc.referencia,
                        titulo: uc.titulo,
                        carga_horaria: parseInt(uc.carga_horaria) || 0,
                        indicadores: uc.indicadores || "",
                        conhecimentos: uc.conhecimentos || "",
                        n_aula: "",
                        status: "Não Iniciada",
                        horas_ministradas: 0,
                        progresso: 0
                    }));
                }

                const dados = {
                    referencia: document.getElementById('edit-turma-ref').value,
                    oferta: document.getElementById('edit-turma-oferta').value,
                    d_inicio: document.getElementById('edit-turma-dinicio').value,
                    d_termino: document.getElementById('edit-turma-dtermino').value,
                    periodo: document.getElementById('edit-turma-periodo').value,
                    h_inicio: document.getElementById('edit-turma-hinicio').value,
                    h_termino: document.getElementById('edit-turma-htermino').value,
                    dias_semana: diasSelecionados,
                    status: document.getElementById('edit-turma-status').value
                };

                await window.ControllerTurmaFrm.editarTurma(idTurma, dados, cursoObj, ucsDaTurma);
                document.getElementById('modal-edit-turma')?.classList.add('hidden');

                await window.AppTurmaListar.carregarDadosBase();
                window.AppTurmaListar.popularFiltrosESelects();
                window.AppTurmaListar.renderizarTabelaTurmas();
            } catch (err) {
                await window.Dialog.erro(err);
            }
            return true;
        }

        // 3. Salvar Edição de UC específica dentro da Turma
        if (e.target.id === 'form-edit-turma-uc') {
            try {
                const idTurma = document.getElementById('turma-uc-id-turma').value;
                const ucIdx = parseInt(document.getElementById('turma-uc-idx').value, 10);
                const turmaAtual = cacheTurmas.find(t => t.id === idTurma);
                if (!turmaAtual) throw new Error("Turma não localizada.");

                const cursoObj = cacheCursos.find(c => c.id === turmaAtual.id_curso);
                const novosDadosUC = {
                    n_aula: document.getElementById('turma-uc-naula').value,
                    status: document.getElementById('turma-uc-status').value,
                    horas_ministradas: document.getElementById('turma-uc-horas').value,
                    modoCalculo: 'horas'
                };

                await window.ControllerTurmaFrm.atualizarUCDentroDaTurma(turmaAtual, ucIdx, novosDadosUC, cursoObj);
                document.getElementById('modal-edit-turma-uc')?.classList.add('hidden');

                await window.AppTurmaListar.carregarDadosBase();
                window.AppTurmaListar.renderizarTabelaTurmas();

                document.getElementById(`accordion-turma-${idTurma}`)?.classList.remove('hidden');
            } catch (err) {
                await window.Dialog.erro(err);
            }
            return true;
        }

        return false;
    }
};