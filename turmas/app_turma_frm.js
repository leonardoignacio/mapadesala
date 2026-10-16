// ./turmas/app_turma_frm.js - Lógica de Formulários, Cálculos Dinâmicos e Modais de Turmas
window.AppTurmaFrm = {

    podeEditar() {
        const cargosEdicao = ['root', 'admin', 'tecnico', 'docente'];
        return cargosEdicao.includes(window.usuarioAtual?.cargo);
    },

    popularSelectCursos() {
        const cacheCursos = window.AppTurmaListar?.cacheCursos || [];
        const options = `<option value="" disabled selected>Selecione o Curso...</option>` +
            cacheCursos.map(c => `<option value="${c.id}">[${c.sigla || '---'}] ${c.titulo}</option>`).join('');

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

    // Atualiza o campo CH_Encontro quando H_Inicio ou H_Termino mudam
    atualizarCHEncontroNoForm(contexto = 'add') {
        const hInicio = document.getElementById(`${contexto}-turma-hinicio`)?.value;
        const hTermino = document.getElementById(`${contexto}-turma-htermino`)?.value;
        const inputCH = document.getElementById(`${contexto}-turma-chencontro`);
        if (!inputCH) return;

        const ch = window.ControllerTurmaFrm.calcularCHEncontro(hInicio, hTermino);
        inputCH.value = ch > 0 ? this._formatarCH(ch) : "Horário Inválido";
    },

    // Quando o usuário seleciona um curso no formulário: herda a Área, sugere o prefixo da Referência e lista as UCs do curso
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

        // Sugere o prefixo da referência (ex.: TI-) caso o campo esteja vazio no cadastro
        if (contexto === 'add' && inputRef && !inputRef.value.trim() && curso.sigla) {
            inputRef.value = `${curso.sigla.toUpperCase()}-`;
        }

        if (contexto === 'add') {
            this.renderizarUCsNoFormCadastro(curso.id, cacheUCsBase);
        }
    },

    renderizarUCsNoFormCadastro(idCurso, cacheUCsBase) {
        const container = document.getElementById('container-add-turma-ucs');
        if (!container) return;

        const ucsDoCurso = (cacheUCsBase || []).filter(u => u.id_curso === idCurso).sort((a, b) => {
            const numA = parseInt((a.referencia || "").replace(/\D/g, '')) || 0;
            const numB = parseInt((b.referencia || "").replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        if (ucsDoCurso.length === 0) {
            container.innerHTML = `<p class="text-xs md:text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-xl border border-slate-100">Este curso não possui UCs cadastradas (Ex: Curso Livre de curta duração).</p>`;
            return;
        }

        container.innerHTML = ucsDoCurso.map((uc, idx) => `
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 item-uc-form-add" data-uc-id="${uc.id}">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-extrabold text-blue-700">${uc.referencia} — ${uc.titulo}</span>
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

    // Sincroniza Horas Ministradas e Progresso quando o usuário altera o Status da UC no modal
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

    // Sincroniza o Progresso (%) e o Status quando o usuário digita as Horas Ministradas no modal da UC
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
            alert("Perfil Somente Leitura: Operação não permitida.");
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
                    status: document.getElementById('add-turma-status').value
                };

                await window.ControllerTurmaFrm.salvarNovaTurma(dados, cursoObj, ucsMontadas);

                alert("Turma cadastrada com sucesso!");
                e.target.reset();
                document.getElementById('add-turma-hinicio').value = "19:00";
                document.getElementById('add-turma-htermino').value = "22:30";
                this.atualizarCHEncontroNoForm('add');
                document.getElementById('container-add-turma-ucs').innerHTML = `<p class="text-sm text-slate-400 text-center py-8">Selecione um curso ao lado para carregar suas Unidades Curriculares.</p>`;

                await window.AppTurmaListar.carregarDadosBase();
                window.AppTurmaListar.popularFiltrosESelects();
                window.AppTurmaListar.renderizarTabelaTurmas();
            } catch (err) {
                alert(err.message);
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

                // Se mudou de curso, recria a lista de UCs do novo curso; se manteve, preserva o progresso atual das UCs
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
                    status: document.getElementById('edit-turma-status').value
                };

                await window.ControllerTurmaFrm.editarTurma(idTurma, dados, cursoObj, ucsDaTurma);
                document.getElementById('modal-edit-turma')?.classList.add('hidden');

                await window.AppTurmaListar.carregarDadosBase();
                window.AppTurmaListar.popularFiltrosESelects();
                window.AppTurmaListar.renderizarTabelaTurmas();
            } catch (err) {
                alert(err.message);
            }
            return true;
        }

        // 3. Salvar Edição de UC específica dentro da Turma (N_Aula, Status, Horas Ministradas e Progresso)
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

                // Mantém o acordeon da turma aberto após atualizar a UC para melhor experiência visual
                document.getElementById(`accordion-turma-${idTurma}`)?.classList.remove('hidden');
            } catch (err) {
                alert(err.message);
            }
            return true;
        }

        return false;
    }
};