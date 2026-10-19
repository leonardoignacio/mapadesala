// ./cursos/app_curso_listar.js - Lógica de Listagem, Acordeon e Filtros de Cursos e UCs
window.AppCursoListar = {
    cacheCursos: [],
    cacheUCs: [],
    cacheAreas: [],

    filtrosCursos: {
        titulo: "",
        areas: ["Todos"],
        tipos: ["Todos"],
        ch_sinal: "=",
        ch_valor: ""
    },

    _norm(str) {
        return (str || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    },

    podeEditar() {
        const cargosEdicao = ['root', 'admin', 'tecnico', 'docente'];
        return cargosEdicao.includes(window.usuarioAtual?.cargo);
    },

    obterAreasUsuario() {
        const areas = window.usuarioAtual?.areas || [];
        return Array.isArray(areas) ? areas.filter(a => a && a !== "Todas") : [];
    },

    // Verifica se um curso pertence a uma lista de áreas (comparando tanto o atributo 'area' quanto o atributo 'tipo', ex.: Aprendizagem)
    _cursoCorrespondeAsAreas(curso, listaAreas) {
        if (!curso || !Array.isArray(listaAreas)) return false;
        if (listaAreas.includes("Todas") || listaAreas.includes("Todos")) return true;

        const areaCursoNorm = this._norm(curso.area);
        const tipoCursoNorm = this._norm(curso.tipo);

        return listaAreas.some(a => {
            const areaAlvoNorm = this._norm(a);
            return areaAlvoNorm !== "" && (areaAlvoNorm === areaCursoNorm || areaAlvoNorm === tipoCursoNorm);
        });
    },

    configurarFiltroAreasPadrao() {
        const cargo = window.usuarioAtual?.cargo;
        const areasUser = this.obterAreasUsuario();

        if (cargo === 'apoio' && areasUser.length > 0) {
            this.filtrosCursos.areas = [...areasUser];
        } else {
            this.filtrosCursos.areas = ["Todos"];
        }
    },

    async iniciarView() {
        this.configurarFiltroAreasPadrao();
        await this.carregarDadosBase();
        this.popularFiltrosESelects();
        this.renderizarTabelaCursos();
    },

    async carregarDadosBase() {
        const tbody = document.getElementById('tabela-cursos');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400 text-sm md:text-base">Carregando dados...</td></tr>';
        
        const [todosCursos, todasUCs, todasAreas] = await Promise.all([
            window.ControllerCursoListar.listarCursos(),
            window.ControllerCursoListar.listarUCs(),
            window.ControllerCursoListar.listarAreas()
        ]);

        const cargo = window.usuarioAtual?.cargo;
        const areasUser = this.obterAreasUsuario();
        const possuiAcessoGlobal = (window.usuarioAtual?.areas || []).includes("Todas");

        if (cargo === 'docente' && !possuiAcessoGlobal) {
            const setNormDocente = new Set(areasUser.map(a => this._norm(a)));

            // Filtra os cursos habilitados para o Docente (por Área ou Tipo, ex.: Aprendizagem)
            this.cacheCursos = todosCursos.filter(c => this._cursoCorrespondeAsAreas(c, areasUser));

            // Garante que cacheAreas tenha todas as áreas habilitadas do Docente + áreas dos cursos permitidos
            const mapaAreas = new Map();
            todasAreas.forEach(a => {
                if (setNormDocente.has(this._norm(a.nome))) mapaAreas.set(this._norm(a.nome), a);
            });
            areasUser.forEach(nomeArea => {
                const chave = this._norm(nomeArea);
                if (chave && !mapaAreas.has(chave)) mapaAreas.set(chave, { id: chave, nome: nomeArea });
            });
            this.cacheCursos.forEach(c => {
                const chave = this._norm(c.area);
                if (chave && !mapaAreas.has(chave)) mapaAreas.set(chave, { id: chave, nome: c.area });
            });

            this.cacheAreas = Array.from(mapaAreas.values()).sort((a, b) => a.nome.localeCompare(b.nome));

            const idsCursosPermitidos = new Set(this.cacheCursos.map(c => c.id));
            this.cacheUCs = todasUCs.filter(u => idsCursosPermitidos.has(u.id_curso));
        } else {
            // Para Apoio, Técnico, Admin e Root: garante também que qualquer área presente nos cursos ou no perfil conste nas opções de filtro
            const mapaAreas = new Map();
            todasAreas.forEach(a => mapaAreas.set(this._norm(a.nome), a));
            todosCursos.forEach(c => {
                const chave = this._norm(c.area);
                if (chave && !mapaAreas.has(chave)) mapaAreas.set(chave, { id: chave, nome: c.area });
            });

            // Se for APOIO e estiver com filtro inicial ativo, sincroniza o nome real da área dos cursos (caso Aprendizagem esteja em c.tipo)
            if (cargo === 'apoio' && !this.filtrosCursos.areas.includes("Todos")) {
                const areasExpandidas = new Set(this.filtrosCursos.areas);
                todosCursos.forEach(c => {
                    if (this._cursoCorrespondeAsAreas(c, areasUser) && c.area) {
                        areasExpandidas.add(c.area);
                    }
                });
                this.filtrosCursos.areas = Array.from(areasExpandidas);
            }

            this.cacheAreas = Array.from(mapaAreas.values()).sort((a, b) => a.nome.localeCompare(b.nome));
            this.cacheCursos = todosCursos;
            this.cacheUCs = todasUCs;
        }
    },

    popularFiltrosESelects() {
        const containerAreas = document.getElementById('popover-container-areas');
        if (containerAreas) {
            const isTodosChecked = this.filtrosCursos.areas.includes("Todos");
            const attrTodos = isTodosChecked ? 'checked' : '';
            const normSelecionadas = new Set(this.filtrosCursos.areas.map(a => this._norm(a)));

            const chksAreas = this.cacheAreas.map(a => {
                const isChecked = isTodosChecked || normSelecionadas.has(this._norm(a.nome));
                const attrItem = isChecked ? 'checked' : '';
                return '<label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="' + a.nome + '" class="popover-area-curso-chk w-4 h-4 text-blue-600 rounded" ' + attrItem + '> <span class="truncate" title="' + a.nome + '">' + a.nome + '</span></label>';
            }).join('');
            
            containerAreas.innerHTML = 
                '<label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-semibold"><input type="checkbox" value="Todos" class="popover-area-curso-chk w-4 h-4 text-blue-600 rounded" ' + attrTodos + '> Todos</label>' +
                chksAreas;
        }

        if (this.podeEditar() && window.AppCursoFrm) {
            window.AppCursoFrm.popularSelectsFormularios();
        }
    },

    atualizarIconesFiltro() {
        const iconTitulo = document.getElementById('icon-filter-curso-titulo');
        if (iconTitulo) {
            const ativo = this.filtrosCursos.titulo !== "";
            iconTitulo.textContent = ativo ? "✖️" : "🔎";
            iconTitulo.parentElement.title = ativo ? "Remover Filtro de Título" : "Filtrar Título";
        }

        const iconArea = document.getElementById('icon-filter-curso-area');
        if (iconArea) {
            const ativo = !this.filtrosCursos.areas.includes("Todos");
            iconArea.textContent = ativo ? "✖️" : "🔎";
            iconArea.parentElement.title = ativo ? "Filtrar / Mostrar Áreas" : "Filtrar Área";
        }

        const iconTipo = document.getElementById('icon-filter-curso-tipo');
        if (iconTipo) {
            const ativo = !this.filtrosCursos.tipos.includes("Todos");
            iconTipo.textContent = ativo ? "✖️" : "🔎";
            iconTipo.parentElement.title = ativo ? "Remover Filtro de Tipo" : "Filtrar Tipo";
        }

        const iconCh = document.getElementById('icon-filter-curso-ch');
        if (iconCh) {
            const ativo = this.filtrosCursos.ch_valor !== "";
            iconCh.textContent = ativo ? "✖️" : "🔎";
            iconCh.parentElement.title = ativo ? "Remover Filtro de CH" : "Filtrar CH";
        }
    },

    calcularCHTotal(cursoId) {
        const somaUCs = this.cacheUCs
            .filter(uc => uc.id_curso === cursoId)
            .reduce((total, uc) => total + (parseInt(uc.carga_horaria) || 0), 0);

        if (somaUCs > 0) return somaUCs;

        const curso = this.cacheCursos.find(c => c.id === cursoId);
        if (curso && curso.tipo === "Livre" && curso.carga_horaria && parseInt(curso.carga_horaria) <= 39) {
            return parseInt(curso.carga_horaria);
        }

        return 0;
    },

    renderizarTabelaCursos() {
        const tbody = document.getElementById('tabela-cursos');
        if(!tbody) return;

        this.atualizarIconesFiltro();
        const temPermissaoEdicao = this.podeEditar();

        const svgLixeira = '<svg class="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
        const svgLapis = '<svg class="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';

        const dadosFiltrados = this.cacheCursos.filter(curso => {
            const chTotal = this.calcularCHTotal(curso.id);
            
            const matchTitulo = this.filtrosCursos.titulo === "" || curso.titulo.toLowerCase().includes(this.filtrosCursos.titulo.toLowerCase().trim()) || (curso.sigla && curso.sigla.toLowerCase().includes(this.filtrosCursos.titulo.toLowerCase().trim()));
            const matchArea = this._cursoCorrespondeAsAreas(curso, this.filtrosCursos.areas);
            const matchTipo = this.filtrosCursos.tipos.includes("Todos") ? true : this.filtrosCursos.tipos.includes(curso.tipo);
            
            let matchCH = true;
            if (this.filtrosCursos.ch_valor !== "") {
                const filterVal = parseInt(this.filtrosCursos.ch_valor);
                if (this.filtrosCursos.ch_sinal === "=") matchCH = chTotal === filterVal;
                else if (this.filtrosCursos.ch_sinal === ">") matchCH = chTotal > filterVal;
                else if (this.filtrosCursos.ch_sinal === "<") matchCH = chTotal < filterVal;
            }

            return matchTitulo && matchArea && matchTipo && matchCH;
        });

        if(dadosFiltrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400 text-sm md:text-base">Nenhum curso encontrado para estes filtros.</td></tr>';
            return;
        }

        const html = dadosFiltrados.map(curso => {
            const chTotal = this.calcularCHTotal(curso.id);
            const ucsDoCurso = this.cacheUCs.filter(uc => uc.id_curso === curso.id).sort((a,b) => {
                const numA = parseInt(a.referencia.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.referencia.replace(/\D/g, '')) || 0;
                return numA - numB;
            });

            let badgeColor = "text-slate-700 md:bg-slate-50 md:border-slate-200";
            if (curso.tipo === "Técnico") badgeColor = "text-blue-700 md:bg-blue-50 md:border-blue-200";
            else if (curso.tipo === "Livre") badgeColor = "text-emerald-700 md:bg-emerald-50 md:border-emerald-200";
            else if (curso.tipo === "Aprendizagem") badgeColor = "text-purple-700 md:bg-purple-50 md:border-purple-200";

            let htmlUCs = "";
            if(ucsDoCurso.length === 0) {
                const msgSemUC = (curso.tipo === "Livre" && curso.carga_horaria && parseInt(curso.carga_horaria) <= 39)
                    ? `Curso Livre de curta duração (${curso.carga_horaria}h) — não possui UCs vinculadas.`
                    : `Nenhuma UC vinculada a este curso.`;
                htmlUCs = `<tr><td colspan="4" class="py-4 text-center text-slate-400 text-xs md:text-sm">${msgSemUC}</td></tr>`;
            } else {
                const tooltipUC = temPermissaoEdicao
                    ? 'Clique para visualizar ou editar detalhes da UC'
                    : 'Clique para visualizar os detalhes da UC (Somente Leitura)';

                htmlUCs = ucsDoCurso.map(uc => {
                    const acaoUC = temPermissaoEdicao
                        ? `<span class="btn-excluir-uc transform hover:scale-110 transition-transform" data-id="${uc.id}" title="Excluir UC">${svgLixeira}</span>`
                        : `<span class="text-slate-300">-</span>`;

                    return `
                    <tr class="hover:bg-blue-50/50 transition-colors duration-200 cursor-pointer row-uc group/uc border-b border-slate-100 last:border-0" data-id="${uc.id}" title="${tooltipUC}">
                        <td class="px-1.5 py-2 md:p-3 w-[12%] md:w-[8%] text-center flex items-center justify-center relative z-10">
                            ${acaoUC}
                        </td>
                        <td class="px-1.5 py-2 md:p-3 w-[20%] text-[11px] md:text-sm font-bold text-slate-500 whitespace-normal break-words group-hover/uc:text-blue-600 transition-colors">${uc.referencia}</td>
                        <td class="px-1.5 py-2 md:p-3 w-[53%] md:w-[57%] text-[11px] leading-snug md:text-sm font-medium text-slate-600 whitespace-normal break-words group-hover/uc:text-slate-800 transition-colors">${uc.titulo}</td>
                        <td class="px-1.5 py-2 md:p-3 w-[15%] text-[11px] md:text-sm font-bold text-blue-600 whitespace-nowrap text-right group-hover/uc:text-blue-700 transition-colors">${uc.carga_horaria}h</td>
                    </tr>
                    `;
                }).join('');
            }

            const htmlAcaoCurso = temPermissaoEdicao
                ? `<div class="flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2">
                        <span class="btn-editar-curso transform hover:scale-110 transition-transform" data-id="${curso.id}" title="Editar Curso">${svgLapis}</span>
                        <span class="btn-excluir-curso transform hover:scale-110 transition-transform" data-id="${curso.id}" title="Excluir Curso">${svgLixeira}</span>
                   </div>`
                : `<span class="text-slate-300">-</span>`;

            return `
            <tr class="hover:bg-blue-50/50 hover:shadow-[inset_4px_0_0_0_#3b82f6] transition-all duration-200 cursor-pointer row-curso group border-b border-slate-100" data-curso-id="${curso.id}">
                <td class="px-1 py-2 md:py-4 md:px-2 text-center align-middle w-[10%] md:w-[7%] relative z-10">
                    ${htmlAcaoCurso}
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 text-[11px] md:text-sm font-black text-blue-600 align-middle whitespace-normal break-words md:whitespace-nowrap w-[14%] md:w-[10%]">${curso.sigla || '---'}</td>
                <td class="px-1 py-2 md:py-4 md:px-4 text-[11px] leading-snug md:text-base font-bold text-slate-800 align-middle whitespace-normal break-words w-[30%] md:w-[35%] group-hover:text-blue-700 transition-colors">${curso.titulo}</td>
                <td class="px-1 py-2 md:py-4 md:px-4 text-[11px] leading-snug md:text-sm font-medium text-slate-500 align-middle whitespace-normal break-words w-[18%] md:w-[20%]">${curso.area}</td>
                <td class="px-1 py-2 text-center md:py-4 md:px-4 align-middle w-[14%] md:w-[13%]"><span class="p-0 text-center border-0 bg-transparent shadow-none md:px-2.5 md:py-1.5 md:rounded-md text-[11px] md:text-xs font-bold md:border md:shadow-sm ${badgeColor} whitespace-normal break-words md:whitespace-nowrap">${curso.tipo}</span></td>
                <td class="px-1 py-2 md:py-4 md:px-4 text-[11px] md:text-base font-black text-slate-700 align-middle whitespace-nowrap w-[14%] md:w-[15%] text-right group-hover:text-blue-600 transition-colors">${chTotal}h</td>
            </tr>
            <tr class="hidden row-ucs bg-slate-50 shadow-inner" id="accordion-${curso.id}">
                <td colspan="6" class="p-0 border-b-2 border-blue-100">
                    <div class="p-3 md:p-5 pl-3 md:pl-12 border-l-4 border-blue-400 bg-gradient-to-r from-blue-50/50 to-transparent">
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
        ['modal-filter-curso-titulo', 'modal-filter-curso-area', 'modal-filter-curso-tipo', 'modal-filter-curso-ch'].forEach(id => {
            if (id !== excetoId) {
                document.getElementById(id)?.classList.add('hidden');
            }
        });
    },

    async tratarCliques(e) {
        if (e.target.classList.contains('popover-area-curso-chk')) {
            const chkTodos = document.querySelector('.popover-area-curso-chk[value="Todos"]');
            const chkItens = Array.from(document.querySelectorAll('.popover-area-curso-chk')).filter(chk => chk.value !== "Todos");

            if (e.target.value === "Todos") {
                chkItens.forEach(chk => chk.checked = e.target.checked);
            } else {
                if (!e.target.checked && chkTodos) chkTodos.checked = false;
                else if (chkTodos) chkTodos.checked = chkItens.every(chk => chk.checked);
            }
            return true;
        }

        if (e.target.classList.contains('popover-tipo-curso-chk')) {
            const chkTodos = document.querySelector('.popover-tipo-curso-chk[value="Todos"]');
            const chkItens = Array.from(document.querySelectorAll('.popover-tipo-curso-chk')).filter(chk => chk.value !== "Todos");

            if (e.target.value === "Todos") {
                chkItens.forEach(chk => chk.checked = e.target.checked);
            } else {
                if (!e.target.checked && chkTodos) chkTodos.checked = false;
                else if (chkTodos) chkTodos.checked = chkItens.every(chk => chk.checked);
            }
            return true;
        }

        const rowCurso = e.target.closest('.row-curso');
        if (rowCurso && !e.target.closest('.btn-editar-curso') && !e.target.closest('.btn-excluir-curso')) {
            const cursoId = rowCurso.getAttribute('data-curso-id');
            const accordionRow = document.getElementById(`accordion-${cursoId}`);
            if (accordionRow) accordionRow.classList.toggle('hidden');
            return true;
        }

        const rowUc = e.target.closest('.row-uc');
        if (rowUc && !e.target.closest('.btn-excluir-uc')) {
            const id = rowUc.getAttribute('data-id');
            if (window.AppCursoFrm) window.AppCursoFrm.abrirModalDetalhesUC(id);
            return true;
        }

        if (e.target.closest('.btn-excluir-curso')) {
            if (!this.podeEditar()) return true;
            const id = e.target.closest('.btn-excluir-curso').getAttribute('data-id');
            if(confirm("ATENÇÃO: Excluir este curso também excluirá TODAS as UCs vinculadas a ele. Confirma?")) {
                await window.ControllerCursoListar.excluirCurso(id);
                await this.carregarDadosBase();
                this.renderizarTabelaCursos();
                this.popularFiltrosESelects();
            }
            return true;
        }

        if (e.target.closest('.btn-excluir-uc')) {
            if (!this.podeEditar()) return true;
            const id = e.target.closest('.btn-excluir-uc').getAttribute('data-id');
            if(confirm("Confirma exclusão desta UC?")) {
                await window.ControllerCursoListar.excluirUC(id);
                await this.carregarDadosBase();
                this.renderizarTabelaCursos();
            }
            return true;
        }

        const btnTitulo = e.target.closest('#btn-filter-curso-titulo');
        if (btnTitulo) {
            if (this.filtrosCursos.titulo !== "") {
                this.filtrosCursos.titulo = "";
                const inputTit = document.getElementById('popover-input-curso-titulo');
                if (inputTit) inputTit.value = "";
                this.renderizarTabelaCursos();
            } else {
                this.fecharPopovers('modal-filter-curso-titulo');
                const modal = document.getElementById('modal-filter-curso-titulo');
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) document.getElementById('popover-input-curso-titulo')?.focus();
            }
            return true;
        }

        const btnArea = e.target.closest('#btn-filter-curso-area');
        if (btnArea) {
            this.fecharPopovers('modal-filter-curso-area');
            const modal = document.getElementById('modal-filter-curso-area');
            modal.classList.toggle('hidden');
            if (!modal.classList.contains('hidden')) {
                const isTodos = this.filtrosCursos.areas.includes("Todos");
                const normSelecionadas = new Set(this.filtrosCursos.areas.map(a => this._norm(a)));
                document.querySelectorAll('.popover-area-curso-chk').forEach(chk => {
                    if (chk.value === "Todos") chk.checked = isTodos;
                    else chk.checked = isTodos ? true : normSelecionadas.has(this._norm(chk.value));
                });
            }
            return true;
        }

        const btnTipo = e.target.closest('#btn-filter-curso-tipo');
        if (btnTipo) {
            const ativo = !this.filtrosCursos.tipos.includes("Todos");
            if (ativo) {
                this.filtrosCursos.tipos = ["Todos"];
                document.querySelectorAll('.popover-tipo-curso-chk').forEach(chk => chk.checked = true);
                this.renderizarTabelaCursos();
            } else {
                this.fecharPopovers('modal-filter-curso-tipo');
                const modal = document.getElementById('modal-filter-curso-tipo');
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) {
                    document.querySelectorAll('.popover-tipo-curso-chk').forEach(chk => {
                        chk.checked = this.filtrosCursos.tipos.includes("Todos") ? true : this.filtrosCursos.tipos.includes(chk.value);
                    });
                }
            }
            return true;
        }

        const btnCh = e.target.closest('#btn-filter-curso-ch');
        if (btnCh) {
            if (this.filtrosCursos.ch_valor !== "") {
                this.filtrosCursos.ch_valor = "";
                this.filtrosCursos.ch_sinal = "=";
                const inputCh = document.getElementById('popover-input-ch');
                if (inputCh) inputCh.value = "";
                this.renderizarTabelaCursos();
            } else {
                this.fecharPopovers('modal-filter-curso-ch');
                const modal = document.getElementById('modal-filter-curso-ch');
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) document.getElementById('popover-input-ch')?.focus();
            }
            return true;
        }

        if (e.target.closest('#apply-filter-curso-titulo')) {
            this.filtrosCursos.titulo = document.getElementById('popover-input-curso-titulo').value;
            document.getElementById('modal-filter-curso-titulo').classList.add('hidden');
            this.renderizarTabelaCursos();
            return true;
        }

        if (e.target.closest('#apply-filter-curso-area')) {
            const checkedChks = Array.from(document.querySelectorAll('.popover-area-curso-chk:checked')).map(chk => chk.value);
            this.filtrosCursos.areas = checkedChks.includes("Todos") ? ["Todos"] : checkedChks;
            document.getElementById('modal-filter-curso-area').classList.add('hidden');
            this.renderizarTabelaCursos();
            return true;
        }

        if (e.target.closest('#apply-filter-curso-tipo')) {
            const checkedChks = Array.from(document.querySelectorAll('.popover-tipo-curso-chk:checked')).map(chk => chk.value);
            this.filtrosCursos.tipos = checkedChks.includes("Todos") ? ["Todos"] : checkedChks;
            document.getElementById('modal-filter-curso-tipo').classList.add('hidden');
            this.renderizarTabelaCursos();
            return true;
        }

        if (e.target.closest('#apply-filter-curso-ch')) {
            this.filtrosCursos.ch_sinal = document.getElementById('popover-sinal-ch').value;
            this.filtrosCursos.ch_valor = document.getElementById('popover-input-ch').value;
            document.getElementById('modal-filter-curso-ch').classList.add('hidden');
            this.renderizarTabelaCursos();
            return true;
        }

        if (!e.target.closest('th') && !e.target.closest('.popover-modal')) {
            this.fecharPopovers();
        }

        return false;
    }
};