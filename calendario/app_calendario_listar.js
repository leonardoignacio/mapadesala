// ./calendario/app_calendario_listar.js - Lógica de Listagem e Filtros da View Calendário
window.AppCalendarioListar = {
    cacheCalendario: [],

    filtrosCalendario: {
        meses: ["Todos"],
        ano: new Date().getFullYear().toString(),
        dias: ["Todos"],
        tipos: ["Todos"],
        desc: ""
    },

    podeEditar() {
        return ['root', 'admin'].includes(window.usuarioAtual?.cargo);
    },

    async iniciarView() {
        this.filtrosCalendario.ano = new Date().getFullYear().toString();
        await this.carregarDadosBase();
        this.popularFiltros();
        this.renderizarTabelaCalendario();
    },

    async carregarDadosBase() {
        const tbody = document.getElementById('tabela-calendario');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Carregando dados...</td></tr>`;
        
        this.cacheCalendario = await window.ControllerCalendarioListar.listarExcecoes();
    },

    popularFiltros() {
        const tiposSet = new Set(this.cacheCalendario.map(e => e.excecao));
        const tiposUnicos = Array.from(tiposSet).sort();
        const containerTipos = document.getElementById('popover-container-cal-tipos');
        
        if (containerTipos) {
            const isTodosChecked = this.filtrosCalendario.tipos.includes("Todos");
            const chks = tiposUnicos.map(t => {
                const isChecked = isTodosChecked || this.filtrosCalendario.tipos.includes(t);
                return `<label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-medium text-slate-700"><input type="checkbox" value="${t}" class="popover-tipo-cal-chk w-4 h-4 text-blue-600 rounded" ${isChecked ? 'checked' : ''}> <span class="truncate" title="${t}">${t}</span></label>`;
            }).join('');
            containerTipos.innerHTML = `
                <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-semibold text-slate-700"><input type="checkbox" value="Todos" class="popover-tipo-cal-chk w-4 h-4 text-blue-600 rounded" ${isTodosChecked ? 'checked' : ''}> Todos</label>
                ${chks}
            `;
        }
    },

    atualizarIconesFiltro() {
        const iconData = document.getElementById('icon-filter-cal-data');
        if (iconData) iconData.textContent = (!this.filtrosCalendario.meses.includes("Todos")) ? "✖️" : "🔎";

        const iconDia = document.getElementById('icon-filter-cal-dia');
        if (iconDia) iconDia.textContent = (!this.filtrosCalendario.dias.includes("Todos")) ? "✖️" : "🔎";

        const iconTipo = document.getElementById('icon-filter-cal-tipo');
        if (iconTipo) iconTipo.textContent = (!this.filtrosCalendario.tipos.includes("Todos")) ? "✖️" : "🔎";

        const iconDesc = document.getElementById('icon-filter-cal-desc');
        if (iconDesc) iconDesc.textContent = (this.filtrosCalendario.desc !== "") ? "✖️" : "🔎";
    },

    renderizarTabelaCalendario() {
        const tbody = document.getElementById('tabela-calendario');
        if(!tbody) return;

        this.atualizarIconesFiltro();
        const temPermissaoEdicao = this.podeEditar();

        const svgLixeira = `<svg class="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;

        const dadosFiltrados = this.cacheCalendario.filter(exc => {
            const [ano, mes] = exc.data.split('-');
            
            const matchMes = this.filtrosCalendario.meses.includes("Todos") ? true : this.filtrosCalendario.meses.includes(mes);
            const matchAno = ano === this.filtrosCalendario.ano;
            const matchDia = this.filtrosCalendario.dias.includes("Todos") ? true : this.filtrosCalendario.dias.includes(exc.dia_semana);
            const matchTipo = this.filtrosCalendario.tipos.includes("Todos") ? true : this.filtrosCalendario.tipos.includes(exc.excecao);
            const matchDesc = this.filtrosCalendario.desc === "" || exc.descricao.toLowerCase().includes(this.filtrosCalendario.desc.toLowerCase().trim());

            return matchMes && matchAno && matchDia && matchTipo && matchDesc;
        });

        if(dadosFiltrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Nenhum registro encontrado para este filtro.</td></tr>`;
            return;
        }

        const html = dadosFiltrados.map(exc => {
            const [ano, mes, dia] = exc.data.split('-');
            const dataBR = `${dia}/${mes}/${ano}`;

            let badgeColor = "text-slate-700 md:bg-slate-50 md:border-slate-200";
            const tipoLower = exc.excecao.toLowerCase();
            if (tipoLower.includes("feriado")) badgeColor = "text-rose-700 md:bg-rose-50 md:border-rose-200";
            else if (tipoLower.includes("ponte")) badgeColor = "text-amber-700 md:bg-amber-50 md:border-amber-200";
            else if (tipoLower.includes("domingo")) badgeColor = "text-slate-600 md:bg-slate-100 md:border-slate-200";
            else if (tipoLower.includes("reunião") || tipoLower.includes("reuniao")) badgeColor = "text-indigo-700 md:bg-indigo-50 md:border-indigo-200";
            else if (tipoLower.includes("cancelamento")) badgeColor = "text-orange-700 md:bg-orange-50 md:border-orange-200";

            return `
            <tr class="hover:bg-blue-50/50 hover:shadow-[inset_4px_0_0_0_#3b82f6] transition-all duration-200 cursor-default row-calendario group border-b border-slate-100" data-id="${exc.data}">
                <td class="px-1 py-2 md:py-4 md:px-2 text-center align-middle w-[10%] md:w-[7%] relative z-10">
                    ${temPermissaoEdicao
                        ? `<span class="btn-excluir-cal transform hover:scale-110 transition-transform cursor-pointer inline-block" data-id="${exc.data}" title="Excluir">${svgLixeira}</span>`
                        : `<span class="text-slate-300">-</span>`}
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 text-[11px] md:text-sm font-black text-slate-700 align-middle whitespace-nowrap w-[22%] md:w-[15%] group-hover:text-blue-700 transition-colors">${dataBR}</td>
                <td class="px-1 py-2 md:py-4 md:px-3 text-[11px] leading-snug md:text-sm font-medium text-slate-500 align-middle whitespace-normal break-words md:whitespace-nowrap w-[22%] md:w-[15%]">${exc.dia_semana}</td>
                <td class="px-1 py-2 md:py-4 md:px-3 align-middle w-[16%] md:w-[18%]"><span class="p-0 border-0 bg-transparent shadow-none md:px-2.5 md:py-1.5 md:rounded-md text-[11px] md:text-xs font-bold md:border md:shadow-sm ${badgeColor} whitespace-normal break-words md:whitespace-nowrap">${exc.excecao}</span></td>
                <td class="px-1 py-2 md:py-4 md:px-4 text-[11px] leading-snug md:text-sm font-medium text-slate-600 align-middle whitespace-normal break-words w-[30%] md:w-[45%] group-hover:text-slate-800 transition-colors">${exc.descricao}</td>
            </tr>
            `;
        }).join('');

        tbody.innerHTML = html;
    },

    fecharPopovers(excetoId = null) {
        ['modal-filter-cal-data', 'modal-filter-cal-dia', 'modal-filter-cal-tipo', 'modal-filter-cal-desc'].forEach(id => {
            if (id !== excetoId) {
                document.getElementById(id)?.classList.add('hidden');
            }
        });
    },

    async tratarCliques(e) {
        const configurarInterruptor = (classeChk) => {
            if (e.target.classList.contains(classeChk)) {
                const chkTodos = document.querySelector(`.${classeChk}[value="Todos"]`);
                const chkItens = Array.from(document.querySelectorAll(`.${classeChk}`)).filter(chk => chk.value !== "Todos");
                if (e.target.value === "Todos") {
                    chkItens.forEach(chk => chk.checked = e.target.checked);
                } else {
                    if (!e.target.checked && chkTodos) chkTodos.checked = false;
                    else if (chkTodos) chkTodos.checked = chkItens.every(chk => chk.checked);
                }
                return true;
            }
            return false;
        };

        if (configurarInterruptor('popover-mes-cal-chk')) return true;
        if (configurarInterruptor('popover-dia-cal-chk')) return true;
        if (configurarInterruptor('popover-tipo-cal-chk')) return true;

        // Excluir Exceção
        if (e.target.closest('.btn-excluir-cal')) {
            if (!this.podeEditar()) return true;
            const id = e.target.closest('.btn-excluir-cal').getAttribute('data-id');
            if(confirm("Confirma exclusão desta exceção no calendário?")) {
                await window.ControllerCalendarioListar.excluirExcecao(id);
                await this.carregarDadosBase();
                this.popularFiltros();
                this.renderizarTabelaCalendario();
            }
            return true;
        }

        // Filtros (Abrir / Resetar)
        const btnData = e.target.closest('#btn-filter-cal-data');
        if (btnData) {
            if (!this.filtrosCalendario.meses.includes("Todos")) {
                this.filtrosCalendario.meses = ["Todos"];
                this.filtrosCalendario.ano = new Date().getFullYear().toString();
                document.querySelectorAll('.popover-mes-cal-chk').forEach(chk => chk.checked = true);
                const selectAno = document.getElementById('popover-select-cal-ano');
                if (selectAno) selectAno.value = this.filtrosCalendario.ano;
                this.renderizarTabelaCalendario();
            } else {
                this.fecharPopovers('modal-filter-cal-data');
                const modal = document.getElementById('modal-filter-cal-data');
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) {
                    document.querySelectorAll('.popover-mes-cal-chk').forEach(chk => {
                        chk.checked = this.filtrosCalendario.meses.includes("Todos") ? true : this.filtrosCalendario.meses.includes(chk.value);
                    });
                    const selectAno = document.getElementById('popover-select-cal-ano');
                    if (selectAno) selectAno.value = this.filtrosCalendario.ano;
                }
            }
            return true;
        }

        const btnDia = e.target.closest('#btn-filter-cal-dia');
        if (btnDia) {
            if (!this.filtrosCalendario.dias.includes("Todos")) {
                this.filtrosCalendario.dias = ["Todos"];
                document.querySelectorAll('.popover-dia-cal-chk').forEach(chk => chk.checked = true);
                this.renderizarTabelaCalendario();
            } else {
                this.fecharPopovers('modal-filter-cal-dia');
                const modal = document.getElementById('modal-filter-cal-dia');
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) {
                    document.querySelectorAll('.popover-dia-cal-chk').forEach(chk => {
                        chk.checked = this.filtrosCalendario.dias.includes("Todos") ? true : this.filtrosCalendario.dias.includes(chk.value);
                    });
                }
            }
            return true;
        }

        const btnTipo = e.target.closest('#btn-filter-cal-tipo');
        if (btnTipo) {
            if (!this.filtrosCalendario.tipos.includes("Todos")) {
                this.filtrosCalendario.tipos = ["Todos"];
                document.querySelectorAll('.popover-tipo-cal-chk').forEach(chk => chk.checked = true);
                this.renderizarTabelaCalendario();
            } else {
                this.fecharPopovers('modal-filter-cal-tipo');
                const modal = document.getElementById('modal-filter-cal-tipo');
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) {
                    document.querySelectorAll('.popover-tipo-cal-chk').forEach(chk => {
                        chk.checked = this.filtrosCalendario.tipos.includes("Todos") ? true : this.filtrosCalendario.tipos.includes(chk.value);
                    });
                }
            }
            return true;
        }

        const btnDesc = e.target.closest('#btn-filter-cal-desc');
        if (btnDesc) {
            if (this.filtrosCalendario.desc !== "") {
                this.filtrosCalendario.desc = "";
                document.getElementById('popover-input-cal-desc').value = "";
                this.renderizarTabelaCalendario();
            } else {
                this.fecharPopovers('modal-filter-cal-desc');
                const modal = document.getElementById('modal-filter-cal-desc');
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) document.getElementById('popover-input-cal-desc')?.focus();
            }
            return true;
        }

        // Aplicar Filtros
        if (e.target.closest('#apply-filter-cal-data')) {
            const checkedChks = Array.from(document.querySelectorAll('.popover-mes-cal-chk:checked')).map(chk => chk.value);
            this.filtrosCalendario.meses = checkedChks.includes("Todos") ? ["Todos"] : checkedChks;
            this.filtrosCalendario.ano = document.getElementById('popover-select-cal-ano').value;
            document.getElementById('modal-filter-cal-data').classList.add('hidden');
            this.renderizarTabelaCalendario();
            return true;
        }
        if (e.target.closest('#apply-filter-cal-dia')) {
            const checkedChks = Array.from(document.querySelectorAll('.popover-dia-cal-chk:checked')).map(chk => chk.value);
            this.filtrosCalendario.dias = checkedChks.includes("Todos") ? ["Todos"] : checkedChks;
            document.getElementById('modal-filter-cal-dia').classList.add('hidden');
            this.renderizarTabelaCalendario();
            return true;
        }
        if (e.target.closest('#apply-filter-cal-tipo')) {
            const checkedChks = Array.from(document.querySelectorAll('.popover-tipo-cal-chk:checked')).map(chk => chk.value);
            this.filtrosCalendario.tipos = checkedChks.includes("Todos") ? ["Todos"] : checkedChks;
            document.getElementById('modal-filter-cal-tipo').classList.add('hidden');
            this.renderizarTabelaCalendario();
            return true;
        }
        if (e.target.closest('#apply-filter-cal-desc')) {
            this.filtrosCalendario.desc = document.getElementById('popover-input-cal-desc').value;
            document.getElementById('modal-filter-cal-desc').classList.add('hidden');
            this.renderizarTabelaCalendario();
            return true;
        }

        if (!e.target.closest('th') && !e.target.closest('.popover-modal')) {
            this.fecharPopovers();
        }

        return false;
    }
};