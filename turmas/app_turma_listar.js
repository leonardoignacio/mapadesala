// ./turmas/app_turma_listar.js - Lógica de Listagem, Acordeon de UCs e Filtros de Turmas
window.AppTurmaListar = {
    cacheTurmas: [],
    cacheCursos: [],
    cacheUCsBase: [],

    filtrosTurmas: {
        ref: "",
        areas: ["Todos"],
        periodos: ["Todos"],
        status: ["Todos"]
    },

    podeEditar() {
        const cargosEdicao = ['root', 'admin', 'tecnico', 'docente'];
        return cargosEdicao.includes(window.usuarioAtual?.cargo);
    },

    async iniciarView() {
        await this.carregarDadosBase();
        this.popularFiltrosESelects();
        this.renderizarTabelaTurmas();
    },

    async carregarDadosBase() {
        const tbody = document.getElementById('tabela-turmas');
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 text-sm md:text-base">Carregando dados...</td></tr>`;

        [this.cacheTurmas, this.cacheCursos, this.cacheUCsBase] = await Promise.all([
            window.ControllerTurmaListar.listarTurmas(),
            window.ControllerTurmaListar.listarCursosBase(),
            window.ControllerTurmaListar.listarUCsBase()
        ]);
    },

    popularFiltrosESelects() {
        const areasSet = new Set();
        this.cacheCursos.forEach(c => { if (c.area) areasSet.add(c.area); });
        this.cacheTurmas.forEach(t => { if (t.area) areasSet.add(t.area); });
        const areasUnicas = Array.from(areasSet).sort((a, b) => a.localeCompare(b));

        const containerAreas = document.getElementById('popover-container-turma-areas');
        if (containerAreas) {
            const isTodosChecked = this.filtrosTurmas.areas.includes("Todos");
            const chks = areasUnicas.map(nomeArea => {
                const isChecked = isTodosChecked || this.filtrosTurmas.areas.includes(nomeArea);
                return `<label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="${nomeArea}" class="popover-area-turma-chk w-4 h-4 text-blue-600 rounded" ${isChecked ? 'checked' : ''}> <span class="truncate" title="${nomeArea}">${nomeArea}</span></label>`;
            }).join('');

            containerAreas.innerHTML = `
                <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-semibold"><input type="checkbox" value="Todos" class="popover-area-turma-chk w-4 h-4 text-blue-600 rounded" ${isTodosChecked ? 'checked' : ''}> Todos</label>
                ${chks}
            `;
        }

        if (this.podeEditar() && window.AppTurmaFrm) {
            window.AppTurmaFrm.popularSelectCursos();
        }
    },

    atualizarIconesFiltro() {
        const iconRef = document.getElementById('icon-filter-turma-ref');
        if (iconRef) iconRef.textContent = (this.filtrosTurmas.ref !== "") ? "✖️" : "🔎";

        const iconArea = document.getElementById('icon-filter-turma-area');
        if (iconArea) iconArea.textContent = (!this.filtrosTurmas.areas.includes("Todos")) ? "✖️" : "🔎";

        const iconPeriodo = document.getElementById('icon-filter-turma-periodo');
        if (iconPeriodo) iconPeriodo.textContent = (!this.filtrosTurmas.periodos.includes("Todos")) ? "✖️" : "🔎";

        const iconStatus = document.getElementById('icon-filter-turma-status');
        if (iconStatus) iconStatus.textContent = (!this.filtrosTurmas.status.includes("Todos")) ? "✖️" : "🔎";
    },

    _formatarDataBR(dataISO) {
        if (!dataISO || !dataISO.includes('-')) return "---";
        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    },

    _formatarNumeroBR(valor) {
        const num = parseFloat(valor) || 0;
        return Number.isInteger(num) ? num.toString() : num.toFixed(1).replace('.', ',');
    },

    renderizarTabelaTurmas() {
        const tbody = document.getElementById('tabela-turmas');
        if (!tbody) return;

        this.atualizarIconesFiltro();
        const temPermissaoEdicao = this.podeEditar();

        const svgLixeira = `<svg class="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
        const svgLapis = `<svg class="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

        const termoRef = this.filtrosTurmas.ref.toLowerCase().trim();

        const dadosFiltrados = this.cacheTurmas.filter(t => {
            const matchRef = termoRef === "" ||
                (t.referencia && t.referencia.toLowerCase().includes(termoRef)) ||
                (t.oferta && t.oferta.toLowerCase().includes(termoRef)) ||
                (t.curso_titulo && t.curso_titulo.toLowerCase().includes(termoRef));

            const matchArea = this.filtrosTurmas.areas.includes("Todos") || this.filtrosTurmas.areas.includes(t.area);
            const matchPeriodo = this.filtrosTurmas.periodos.includes("Todos") || this.filtrosTurmas.periodos.includes(t.periodo);
            const matchStatus = this.filtrosTurmas.status.includes("Todos") || this.filtrosTurmas.status.includes(t.status);

            return matchRef && matchArea && matchPeriodo && matchStatus;
        });

        if (dadosFiltrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 text-sm md:text-base">Nenhuma turma encontrada para estes filtros.</td></tr>`;
            return;
        }

        const html = dadosFiltrados.map(turma => {
            const ucsDaTurma = Array.isArray(turma.ucs) ? turma.ucs.slice().sort((a, b) => {
                const numA = parseInt((a.referencia || "").replace(/\D/g, '')) || 0;
                const numB = parseInt((b.referencia || "").replace(/\D/g, '')) || 0;
                return numA - numB;
            }) : [];

            const progTurma = Math.min(100, Math.max(0, parseInt(turma.progresso_turma) || 0));

            // Badge de Status da Turma
            let badgeStatus = "text-slate-600 md:bg-slate-100 md:border-slate-200";
            if (turma.status === "Em Andamento") badgeStatus = "text-blue-700 md:bg-blue-50 md:border-blue-200";
            else if (turma.status === "Concluída") badgeStatus = "text-emerald-700 md:bg-emerald-50 md:border-emerald-200";
            else if (turma.status === "Não Iniciada") badgeStatus = "text-amber-700 md:bg-amber-50 md:border-amber-200";

            // Badge de Período
            let badgePeriodo = "text-slate-700 md:bg-slate-50 md:border-slate-200";
            if (turma.periodo === "MANHÃ") badgePeriodo = "text-sky-700 md:bg-sky-50 md:border-sky-200";
            else if (turma.periodo === "TARDE") badgePeriodo = "text-orange-700 md:bg-orange-50 md:border-orange-200";
            else if (turma.periodo === "NOITE") badgePeriodo = "text-indigo-700 md:bg-indigo-50 md:border-indigo-200";

            let htmlUCs = "";
            if (ucsDaTurma.length === 0) {
                htmlUCs = `<tr><td colspan="5" class="py-4 text-center text-slate-400 text-xs md:text-sm">Curso de curta duração ou sem UCs vinculadas.</td></tr>`;
            } else {
                htmlUCs = ucsDaTurma.map((uc, idx) => {
                    const progUC = Math.min(100, Math.max(0, parseInt(uc.progresso) || 0));
                    let ucStatusBadge = "text-amber-700 md:bg-amber-50 md:border-amber-200";
                    if (uc.status === "Em Andamento") ucStatusBadge = "text-blue-700 md:bg-blue-50 md:border-blue-200";
                    else if (uc.status === "Concluída") ucStatusBadge = "text-emerald-700 md:bg-emerald-50 md:border-emerald-200";

                    return `
                    <tr class="hover:bg-blue-50/50 transition-colors duration-200 cursor-pointer row-turma-uc group/uc border-b border-slate-100 last:border-0" data-turma-id="${turma.id}" data-uc-idx="${idx}" title="${temPermissaoEdicao ? 'Clique para editar Nº Aula, Status e Progresso desta UC' : 'Clique para ver detalhes da UC'}">
                        <td class="px-1.5 py-2 md:p-3 w-[16%] md:w-[12%] text-[11px] md:text-xs font-bold text-slate-600 whitespace-normal break-words group-hover/uc:text-blue-600">
                            ${uc.referencia}
                        </td>
                        <td class="px-1.5 py-2 md:p-3 w-[34%] md:w-[38%] text-[11px] leading-snug md:text-sm font-medium text-slate-700 whitespace-normal break-words">
                            ${uc.titulo}
                        </td>
                        <td class="px-1.5 py-2 md:p-3 w-[18%] md:w-[16%] text-[10px] md:text-xs font-semibold text-slate-500 whitespace-normal break-words">
                            Aula: <span class="text-slate-800 font-bold">${uc.n_aula || '---'}</span>
                        </td>
                        <td class="px-1.5 py-2 md:p-3 w-[17%] md:w-[16%] text-center">
                            <span class="p-0 border-0 bg-transparent md:px-2 md:py-1 md:rounded-md text-[10px] md:text-xs font-bold md:border ${ucStatusBadge} whitespace-normal break-words md:whitespace-nowrap">${uc.status || 'Não Iniciada'}</span>
                        </td>
                        <td class="px-1.5 py-2 md:p-3 w-[15%] md:w-[18%] text-right">
                            <div class="flex flex-col items-end gap-1">
                                <span class="text-[10px] md:text-xs font-extrabold text-blue-600">${progUC}% <span class="text-slate-400 font-normal">(${this._formatarNumeroBR(uc.horas_ministradas || 0)}/${uc.carga_horaria}h)</span></span>
                                <div class="w-full max-w-[90px] bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div class="bg-blue-600 h-full rounded-full transition-all" style="width: ${progUC}%"></div>
                                </div>
                            </div>
                        </td>
                    </tr>
                    `;
                }).join('');
            }

            return `
            <tr class="hover:bg-blue-50/50 hover:shadow-[inset_4px_0_0_0_#3b82f6] transition-all duration-200 cursor-pointer row-turma group border-b border-slate-100" data-turma-id="${turma.id}">
                <td class="px-1 py-2 md:py-4 md:px-2 text-center align-middle w-[9%] md:w-[6%] relative z-10">
                    ${temPermissaoEdicao ? `
                    <div class="flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2">
                        <span class="btn-editar-turma transform hover:scale-110 transition-transform" data-id="${turma.id}" title="Editar Turma">${svgLapis}</span>
                        <span class="btn-excluir-turma transform hover:scale-110 transition-transform" data-id="${turma.id}" title="Excluir Turma">${svgLixeira}</span>
                    </div>` : `<span class="text-slate-300">-</span>`}
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 align-middle w-[15%] md:w-[12%] whitespace-normal break-words">
                    <p class="text-[11px] md:text-sm font-black text-blue-600 leading-tight">${turma.referencia}</p>
                    <p class="text-[9px] md:text-xs font-semibold text-slate-400">Of: ${turma.oferta || '---'}</p>
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 align-middle w-[26%] md:w-[27%] whitespace-normal break-words">
                    <p class="text-[11px] leading-snug md:text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">${turma.curso_titulo}</p>
                    <p class="text-[10px] md:text-xs font-medium text-slate-500">${turma.area}</p>
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 align-middle w-[18%] md:w-[18%] whitespace-normal break-words">
                    <span class="p-0 border-0 bg-transparent shadow-none md:px-2 md:py-0.5 md:rounded text-[10px] md:text-xs font-extrabold md:border ${badgePeriodo}">${turma.periodo}</span>
                    <p class="text-[9px] md:text-xs text-slate-500 font-medium mt-0.5">${turma.h_inicio} - ${turma.h_termino} <span class="font-bold text-slate-700">(${this._formatarNumeroBR(turma.ch_encontro)}h)</span></p>
                </td>
                <td class="hidden md:table-cell md:py-4 md:px-3 align-middle md:w-[15%] text-xs text-slate-600">
                    <p><span class="font-semibold text-slate-400">Início:</span> ${this._formatarDataBR(turma.d_inicio)}</p>
                    <p><span class="font-semibold text-slate-400">Prev.:</span> ${this._formatarDataBR(turma.d_termino)}</p>
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 align-middle w-[17%] md:w-[12%] text-center md:text-left">
                    <span class="p-0 border-0 bg-transparent shadow-none md:px-2.5 md:py-1.5 md:rounded-md text-[10px] md:text-xs font-bold md:border md:shadow-sm ${badgeStatus} whitespace-normal break-words md:whitespace-nowrap">${turma.status}</span>
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 align-middle w-[15%] md:w-[10%] text-right">
                    <div class="flex flex-col items-end gap-1">
                        <span class="text-[11px] md:text-sm font-black text-slate-700 group-hover:text-blue-600">${progTurma}%</span>
                        <div class="w-full max-w-[75px] bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div class="bg-blue-600 h-full rounded-full transition-all" style="width: ${progTurma}%"></div>
                        </div>
                    </div>
                </td>
            </tr>
            <tr class="hidden row-turma-ucs bg-slate-50 shadow-inner" id="accordion-turma-${turma.id}">
                <td colspan="7" class="p-0 border-b-2 border-blue-100">
                    <div class="p-3 md:p-5 pl-3 md:pl-12 border-l-4 border-blue-400 bg-gradient-to-r from-blue-50/50 to-transparent">
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-2 text-[10px] md:text-xs text-slate-500">
                            <span class="font-bold text-blue-800 uppercase tracking-wider">Unidades Curriculares da Turma (${turma.referencia})</span>
                            <span>Início: <strong>${this._formatarDataBR(turma.d_inicio)}</strong> • Término Previsto: <strong>${this._formatarDataBR(turma.d_termino)}</strong> • CH Curso: <strong>${turma.ch_total_curso || 0}h</strong></span>
                        </div>
                        <div class="bg-white rounded-xl shadow-sm border border-blue-100/50 overflow-hidden">
                            <table class="w-full text-left table-fixed">
                                <tbody class="divide-y divide-slate-50">${htmlUCs}</tbody>
                            </table>
                        </div>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

        tbody.innerHTML = html;
    },

    fecharPopovers(excetoId = null) {
        ['modal-filter-turma-ref', 'modal-filter-turma-area', 'modal-filter-turma-periodo', 'modal-filter-turma-status'].forEach(id => {
            if (id !== excetoId) {
                document.getElementById(id)?.classList.add('hidden');
            }
        });
    },

    async tratarCliques(e) {
        const configurarInterruptor = (classeChk) => {
            if (e.target.classList.contains(classeChk)) {
                const chkTodos = document.querySelector(`.${classeChk}[value="Todos"]`);
                const chkItens = Array.from(document.querySelectorAll(`.${classeChk}`)).filter(c => c.value !== "Todos");
                if (e.target.value === "Todos") {
                    chkItens.forEach(c => c.checked = e.target.checked);
                } else {
                    if (!e.target.checked && chkTodos) chkTodos.checked = false;
                    else if (chkTodos) chkTodos.checked = chkItens.every(c => c.checked);
                }
                return true;
            }
            return false;
        };

        if (configurarInterruptor('popover-area-turma-chk')) return true;
        if (configurarInterruptor('popover-periodo-turma-chk')) return true;
        if (configurarInterruptor('popover-status-turma-chk')) return true;

        // Acordeon da Turma
        const rowTurma = e.target.closest('.row-turma');
        if (rowTurma && !e.target.closest('.btn-editar-turma') && !e.target.closest('.btn-excluir-turma')) {
            const turmaId = rowTurma.getAttribute('data-turma-id');
            const acc = document.getElementById(`accordion-turma-${turmaId}`);
            if (acc) acc.classList.toggle('hidden');
            return true;
        }

        // Clique em uma UC dentro do acordeon da Turma
        const rowTurmaUc = e.target.closest('.row-turma-uc');
        if (rowTurmaUc) {
            const turmaId = rowTurmaUc.getAttribute('data-turma-id');
            const ucIdx = parseInt(rowTurmaUc.getAttribute('data-uc-idx'), 10);
            if (window.AppTurmaFrm) window.AppTurmaFrm.abrirModalEditarUCTurma(turmaId, ucIdx);
            return true;
        }

        // Excluir Turma
        if (e.target.closest('.btn-excluir-turma')) {
            if (!this.podeEditar()) return true;
            const id = e.target.closest('.btn-excluir-turma').getAttribute('data-id');
            if (confirm("ATENÇÃO: Confirma a exclusão desta Turma e do histórico de progresso de suas UCs?")) {
                await window.ControllerTurmaListar.excluirTurma(id);
                await this.carregarDadosBase();
                this.popularFiltrosESelects();
                this.renderizarTabelaTurmas();
            }
            return true;
        }

        // Filtros (Abrir / Resetar)
        const btnRef = e.target.closest('#btn-filter-turma-ref');
        if (btnRef) {
            if (this.filtrosTurmas.ref !== "") {
                this.filtrosTurmas.ref = "";
                const inp = document.getElementById('popover-input-turma-ref');
                if (inp) inp.value = "";
                this.renderizarTabelaTurmas();
            } else {
                this.fecharPopovers('modal-filter-turma-ref');
                const modal = document.getElementById('modal-filter-turma-ref');
                modal?.classList.toggle('hidden');
                if (modal && !modal.classList.contains('hidden')) document.getElementById('popover-input-turma-ref')?.focus();
            }
            return true;
        }

        const btnArea = e.target.closest('#btn-filter-turma-area');
        if (btnArea) {
            if (!this.filtrosTurmas.areas.includes("Todos")) {
                this.filtrosTurmas.areas = ["Todos"];
                document.querySelectorAll('.popover-area-turma-chk').forEach(c => c.checked = true);
                this.renderizarTabelaTurmas();
            } else {
                this.fecharPopovers('modal-filter-turma-area');
                document.getElementById('modal-filter-turma-area')?.classList.toggle('hidden');
            }
            return true;
        }

        const btnPeriodo = e.target.closest('#btn-filter-turma-periodo');
        if (btnPeriodo) {
            if (!this.filtrosTurmas.periodos.includes("Todos")) {
                this.filtrosTurmas.periodos = ["Todos"];
                document.querySelectorAll('.popover-periodo-turma-chk').forEach(c => c.checked = true);
                this.renderizarTabelaTurmas();
            } else {
                this.fecharPopovers('modal-filter-turma-periodo');
                document.getElementById('modal-filter-turma-periodo')?.classList.toggle('hidden');
            }
            return true;
        }

        const btnStatus = e.target.closest('#btn-filter-turma-status');
        if (btnStatus) {
            if (!this.filtrosTurmas.status.includes("Todos")) {
                this.filtrosTurmas.status = ["Todos"];
                document.querySelectorAll('.popover-status-turma-chk').forEach(c => c.checked = true);
                this.renderizarTabelaTurmas();
            } else {
                this.fecharPopovers('modal-filter-turma-status');
                document.getElementById('modal-filter-turma-status')?.classList.toggle('hidden');
            }
            return true;
        }

        // Aplicar Filtros
        if (e.target.closest('#apply-filter-turma-ref')) {
            this.filtrosTurmas.ref = document.getElementById('popover-input-turma-ref')?.value || "";
            document.getElementById('modal-filter-turma-ref')?.classList.add('hidden');
            this.renderizarTabelaTurmas();
            return true;
        }
        if (e.target.closest('#apply-filter-turma-area')) {
            const marcados = Array.from(document.querySelectorAll('.popover-area-turma-chk:checked')).map(c => c.value);
            this.filtrosTurmas.areas = marcados.includes("Todos") ? ["Todos"] : marcados;
            document.getElementById('modal-filter-turma-area')?.classList.add('hidden');
            this.renderizarTabelaTurmas();
            return true;
        }
        if (e.target.closest('#apply-filter-turma-periodo')) {
            const marcados = Array.from(document.querySelectorAll('.popover-periodo-turma-chk:checked')).map(c => c.value);
            this.filtrosTurmas.periodos = marcados.includes("Todos") ? ["Todos"] : marcados;
            document.getElementById('modal-filter-turma-periodo')?.classList.add('hidden');
            this.renderizarTabelaTurmas();
            return true;
        }
        if (e.target.closest('#apply-filter-turma-status')) {
            const marcados = Array.from(document.querySelectorAll('.popover-status-turma-chk:checked')).map(c => c.value);
            this.filtrosTurmas.status = marcados.includes("Todos") ? ["Todos"] : marcados;
            document.getElementById('modal-filter-turma-status')?.classList.add('hidden');
            this.renderizarTabelaTurmas();
            return true;
        }

        if (!e.target.closest('th') && !e.target.closest('.popover-modal')) {
            this.fecharPopovers();
        }

        return false;
    }
};