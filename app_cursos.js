// app_cursos.js - Lógica específica da View Cursos e UCs
let cacheCursos = [];
let cacheUCs = [];
let cacheAreas = [];

let filtrosCursos = {
    titulo: "",
    area: "Todos",
    tipo: "Todos",
    ch_sinal: "=",
    ch_valor: ""
};

window.AppCursos = {
    async iniciarView() {
        await this.carregarDadosBase();
        this.renderizarTabelaCursos();
        this.popularSelectsEFormularios();
    },

    async carregarDadosBase() {
        const tbody = document.getElementById('tabela-cursos');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 text-sm md:text-base">Carregando dados...</td></tr>`;
        
        [cacheCursos, cacheUCs, cacheAreas] = await Promise.all([
            window.ControllerCursos.listarCursos(),
            window.ControllerCursos.listarUCs(),
            window.ControllerCursos.listarAreas()
        ]);
    },

    popularSelectsEFormularios() {
        const popoverArea = document.getElementById('popover-select-area');
        if (popoverArea) {
            popoverArea.innerHTML = `<option value="Todos">Todos</option>` + 
                cacheAreas.map(a => `<option value="${a.nome}">${a.nome}</option>`).join('');
            popoverArea.value = filtrosCursos.area;
        }

        const popoverTipo = document.getElementById('popover-select-tipo');
        if (popoverTipo) popoverTipo.value = filtrosCursos.tipo;

        const datalistArea = document.getElementById('add-curso-datalist-area');
        if (datalistArea) datalistArea.innerHTML = cacheAreas.map(a => `<option value="${a.nome}">`).join('');

        const datalistAreaEdit = document.getElementById('edit-curso-datalist-area');
        if (datalistAreaEdit) datalistAreaEdit.innerHTML = cacheAreas.map(a => `<option value="${a.nome}">`).join('');

        const selectCursoAddUC = document.getElementById('add-uc-curso');
        const selectCursoLote = document.getElementById('add-uc-lote-curso');
        const optionsCursos = `<option value="" disabled selected>Selecione o Curso...</option>` +
                              cacheCursos.map(c => `<option value="${c.id}">[${c.sigla || '---'}] ${c.titulo}</option>`).join('');
        
        if (selectCursoAddUC) selectCursoAddUC.innerHTML = optionsCursos;
        if (selectCursoLote) selectCursoLote.innerHTML = optionsCursos;
    },

    atualizarIconesFiltro() {
        const iconTitulo = document.getElementById('icon-filter-curso-titulo');
        if (iconTitulo) iconTitulo.textContent = (filtrosCursos.titulo !== "") ? "✖️" : "🔎";

        const iconArea = document.getElementById('icon-filter-curso-area');
        if (iconArea) iconArea.textContent = (filtrosCursos.area !== "Todos") ? "✖️" : "🔎";

        const iconTipo = document.getElementById('icon-filter-curso-tipo');
        if (iconTipo) iconTipo.textContent = (filtrosCursos.tipo !== "Todos") ? "✖️" : "🔎";

        const iconCh = document.getElementById('icon-filter-curso-ch');
        if (iconCh) iconCh.textContent = (filtrosCursos.ch_valor !== "") ? "✖️" : "🔎";
    },

    calcularCHTotal(cursoId) {
        return cacheUCs
            .filter(uc => uc.id_curso === cursoId)
            .reduce((total, uc) => total + (parseInt(uc.carga_horaria) || 0), 0);
    },

    renderizarTabelaCursos() {
        const tbody = document.getElementById('tabela-cursos');
        if(!tbody) return;

        this.atualizarIconesFiltro();

        const svgLixeira = `<svg class="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
        const svgLapis = `<svg class="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

        const dadosFiltrados = cacheCursos.filter(curso => {
            const chTotal = this.calcularCHTotal(curso.id);
            
            const matchTitulo = filtrosCursos.titulo === "" || curso.titulo.toLowerCase().includes(filtrosCursos.titulo.toLowerCase().trim()) || (curso.sigla && curso.sigla.toLowerCase().includes(filtrosCursos.titulo.toLowerCase().trim()));
            const matchArea = filtrosCursos.area === "Todos" || curso.area === filtrosCursos.area;
            const matchTipo = filtrosCursos.tipo === "Todos" || curso.tipo === filtrosCursos.tipo;
            
            let matchCH = true;
            if (filtrosCursos.ch_valor !== "") {
                const filterVal = parseInt(filtrosCursos.ch_valor);
                if (filtrosCursos.ch_sinal === "=") matchCH = chTotal === filterVal;
                else if (filtrosCursos.ch_sinal === ">") matchCH = chTotal > filterVal;
                else if (filtrosCursos.ch_sinal === "<") matchCH = chTotal < filterVal;
            }

            return matchTitulo && matchArea && matchTipo && matchCH;
        });

        if(dadosFiltrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 text-sm md:text-base">Nenhum curso encontrado para estes filtros.</td></tr>`;
            return;
        }

        const html = dadosFiltrados.map(curso => {
            const chTotal = this.calcularCHTotal(curso.id);
            const ucsDoCurso = cacheUCs.filter(uc => uc.id_curso === curso.id).sort((a,b) => {
                const numA = parseInt(a.referencia.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.referencia.replace(/\D/g, '')) || 0;
                return numA - numB;
            });

            let badgeColor = "bg-slate-50 text-slate-700 border-slate-200";
            if (curso.tipo === "Técnico") badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
            else if (curso.tipo === "Livre") badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
            else if (curso.tipo === "Aprendizagem") badgeColor = "bg-purple-50 text-purple-700 border-purple-200";

            let htmlUCs = "";
            if(ucsDoCurso.length === 0) {
                htmlUCs = `<tr><td colspan="4" class="py-4 text-center text-slate-400 text-xs md:text-sm">Nenhuma UC vinculada a este curso.</td></tr>`;
            } else {
                htmlUCs = ucsDoCurso.map(uc => `
                    <tr class="hover:bg-blue-50/50 transition-colors duration-200 cursor-pointer row-uc group/uc border-b border-slate-100 last:border-0" data-id="${uc.id}">
                        <td class="p-3 w-[15%] md:w-[8%] text-center flex items-center justify-center relative z-10">
                            <span class="btn-excluir-uc transform hover:scale-110 transition-transform" data-id="${uc.id}" title="Excluir UC">${svgLixeira}</span>
                        </td>
                        <td class="p-3 w-[20%] text-xs md:text-sm font-bold text-slate-500 whitespace-normal break-words group-hover/uc:text-blue-600 transition-colors">${uc.referencia}</td>
                        <td class="p-3 w-[50%] text-xs md:text-sm font-medium text-slate-600 whitespace-normal break-words group-hover/uc:text-slate-800 transition-colors">${uc.titulo}</td>
                        <td class="p-3 w-[15%] text-xs md:text-sm font-bold text-blue-600 whitespace-normal break-words text-right group-hover/uc:text-blue-700 transition-colors">${uc.carga_horaria}h</td>
                    </tr>
                `).join('');
            }

            return `
            <tr class="hover:bg-blue-50/50 hover:shadow-[inset_4px_0_0_0_#3b82f6] transition-all duration-200 cursor-pointer row-curso group border-b border-slate-100" data-curso-id="${curso.id}">
                <td class="p-2 md:py-4 md:px-2 text-center align-middle w-[12%] md:w-[7%] relative z-10">
                    ${window.usuarioAtual && window.usuarioAtual.cargo !== 'apoio' ? `
                    <div class="flex items-center justify-center gap-2">
                        <span class="btn-editar-curso transform hover:scale-110 transition-transform" data-id="${curso.id}" title="Editar Curso">${svgLapis}</span>
                        <span class="btn-excluir-curso transform hover:scale-110 transition-transform" data-id="${curso.id}" title="Excluir Curso">${svgLixeira}</span>
                    </div>` : `<span class="text-slate-300">-</span>`}
                </td>
                <td class="p-2 md:py-4 md:px-3 text-xs md:text-sm font-black text-blue-600 align-middle whitespace-nowrap">${curso.sigla || '---'}</td>
                <td class="p-2 md:py-4 md:px-4 text-xs md:text-base font-bold text-slate-800 align-middle whitespace-normal break-words w-[35%] md:w-[35%] group-hover:text-blue-700 transition-colors">${curso.titulo}</td>
                <td class="p-2 md:py-4 md:px-4 text-xs md:text-sm font-medium text-slate-500 align-middle whitespace-normal break-words w-[20%] md:w-[20%]">${curso.area}</td>
                <td class="p-2 md:py-4 md:px-4 align-middle w-[10%] md:w-[13%]"><span class="px-2.5 py-1.5 rounded-md text-[10px] md:text-xs font-bold border shadow-sm ${badgeColor} whitespace-nowrap">${curso.tipo}</span></td>
                <td class="p-2 md:py-4 md:px-4 text-xs md:text-base font-black text-slate-700 align-middle whitespace-normal break-words w-[13%] md:w-[15%] text-right group-hover:text-blue-600 transition-colors">${chTotal}h</td>
            </tr>
            <tr class="hidden row-ucs bg-slate-50 shadow-inner" id="accordion-${curso.id}">
                <td colspan="6" class="p-0 border-b-2 border-blue-100">
                    <div class="p-4 md:p-5 pl-4 md:pl-12 border-l-4 border-blue-400 bg-gradient-to-r from-blue-50/50 to-transparent">
                        <div class="flex items-center gap-2 mb-3">
                            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            <p class="text-xs md:text-sm font-bold text-blue-800 uppercase tracking-wider">Unidades Curriculares Vinculadas</p>
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
        ['modal-filter-curso-titulo', 'modal-filter-curso-area', 'modal-filter-curso-tipo', 'modal-filter-curso-ch'].forEach(id => {
            if (id !== excetoId) {
                document.getElementById(id)?.classList.add('hidden');
            }
        });
    },

    abrirModalEditarCurso(idCurso) {
        const curso = cacheCursos.find(c => c.id === idCurso);
        if(!curso) return;

        document.getElementById('edit-curso-id').value = curso.id;
        document.getElementById('edit-curso-titulo').value = curso.titulo;
        document.getElementById('edit-curso-sigla').value = curso.sigla || "";
        document.getElementById('edit-curso-area').value = curso.area;
        document.getElementById('edit-curso-tipo').value = curso.tipo;

        document.getElementById('modal-edit-curso').classList.remove('hidden');
    },

    abrirModalDetalhesUC(idUC) {
        const uc = cacheUCs.find(u => u.id === idUC);
        if(!uc) return;

        document.getElementById('edit-uc-id').value = uc.id;
        document.getElementById('edit-uc-ref').value = uc.referencia;
        document.getElementById('edit-uc-ch').value = uc.carga_horaria;
        document.getElementById('edit-uc-titulo').value = uc.titulo;
        document.getElementById('edit-uc-indicadores').value = uc.indicadores || "";
        document.getElementById('edit-uc-conhecimentos').value = uc.conhecimentos || "";

        document.getElementById('modal-edit-uc').classList.remove('hidden');
    },

    abrirModalEditAreas() {
        const container = document.getElementById('lista-edit-areas');
        if (!container) return;

        const saveIcon = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>`;

        if (cacheAreas.length === 0) {
            container.innerHTML = `<p class="text-sm text-slate-500">Nenhuma área cadastrada.</p>`;
        } else {
            container.innerHTML = cacheAreas.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(area => `
                <div class="flex items-center gap-2">
                    <input type="text" value="${area.nome}" id="input-area-${area.id}" class="flex-1 border border-slate-300 p-2 md:p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base font-semibold text-slate-700">
                    <button type="button" data-id="${area.id}" class="btn-save-area bg-blue-600 hover:bg-blue-700 text-white p-2 md:p-2.5 rounded-lg transition shadow-sm flex items-center justify-center" title="Salvar Área">
                        ${saveIcon}
                    </button>
                </div>
            `).join('');
        }
        document.getElementById('modal-edit-area').classList.remove('hidden');
    },

    async tratarCliques(e) {
        
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
            this.abrirModalDetalhesUC(id);
            return true;
        }

        if (e.target.closest('#btn-open-modal-area')) {
            document.getElementById('modal-add-area')?.classList.remove('hidden');
            setTimeout(() => document.getElementById('add-area-nome')?.focus(), 100);
            return true;
        }
        if (e.target.closest('#btn-close-modal-area')) {
            document.getElementById('modal-add-area')?.classList.add('hidden');
            return true;
        }
        if (e.target.closest('#btn-open-modal-edit-area')) {
            this.abrirModalEditAreas();
            return true;
        }
        if (e.target.closest('#btn-close-modal-edit-area')) {
            document.getElementById('modal-edit-area')?.classList.add('hidden');
            return true;
        }

        if (e.target.closest('.btn-save-area')) {
            const btn = e.target.closest('.btn-save-area');
            const id = btn.getAttribute('data-id');
            const input = document.getElementById(`input-area-${id}`);
            const novoNome = input.value;

            if (!novoNome.trim()) { alert("O nome da área não pode ser vazio."); return true; }

            const iconeOriginal = btn.innerHTML;
            btn.innerHTML = `<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>`;
            btn.disabled = true;

            try {
                await window.ControllerCursos.editarArea(id, novoNome);
                document.getElementById('modal-edit-area')?.classList.add('hidden');
                
                await this.carregarDadosBase();
                this.popularSelectsEFormularios();
                this.renderizarTabelaCursos(); 
            } catch (error) {
                alert(error.message);
                btn.innerHTML = iconeOriginal;
                btn.disabled = false;
            }
            return true;
        }
        
        if (e.target.closest('.btn-editar-curso')) {
            const id = e.target.closest('.btn-editar-curso').getAttribute('data-id');
            this.abrirModalEditarCurso(id);
            return true;
        }
        if (e.target.closest('#btn-close-modal-edit-curso') || e.target.closest('#btn-cancel-edit-curso')) {
            document.getElementById('modal-edit-curso')?.classList.add('hidden');
            return true;
        }

        if (e.target.closest('#btn-close-modal-uc') || e.target.closest('#btn-cancel-edit-uc')) {
            document.getElementById('modal-edit-uc')?.classList.add('hidden');
            return true;
        }
        if (e.target.closest('#btn-help-lote-ucs')) {
            document.getElementById('modal-help-lote-ucs')?.classList.remove('hidden');
            return true;
        }
        if (e.target.closest('#btn-close-help-ucs')) {
            document.getElementById('modal-help-lote-ucs')?.classList.add('hidden');
            return true;
        }

        if (e.target.closest('#btn-baixar-modelo-ucs')) {
            const csvContent = "referencia;titulo;carga_horaria;indicadores;conhecimentos\n";
            const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `modelo_importacao_ucs.csv`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            return true;
        }

        if (e.target.closest('.btn-excluir-curso')) {
            const id = e.target.closest('.btn-excluir-curso').getAttribute('data-id');
            if(confirm("ATENÇÃO: Excluir este curso também excluirá TODAS as UCs vinculadas a ele. Confirma?")) {
                await window.ControllerCursos.excluirCurso(id);
                await this.carregarDadosBase();
                this.renderizarTabelaCursos();
                this.popularSelectsEFormularios();
            }
            return true;
        }
        if (e.target.closest('.btn-excluir-uc')) {
            const id = e.target.closest('.btn-excluir-uc').getAttribute('data-id');
            if(confirm("Confirma exclusão desta UC?")) {
                await window.ControllerCursos.excluirUC(id);
                await this.carregarDadosBase();
                this.renderizarTabelaCursos();
            }
            return true;
        }

        if (e.target.closest('#btn-carregar-lote-ucs')) {
            const idCurso = document.getElementById('add-uc-lote-curso').value;
            const fileInput = document.getElementById('arquivo-lote-ucs');

            if (!idCurso) { alert("Por favor, selecione um curso no seletor para vincular as UCs."); return true; }
            if (!fileInput.files.length) { alert("Por favor, selecione um arquivo .csv para processar."); return true; }

            const btnConfirma = e.target.closest('#btn-carregar-lote-ucs');
            btnConfirma.innerText = "Processando Lote...";
            btnConfirma.disabled = true;

            const file = fileInput.files[0];
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const conteudoTexto = event.target.result;
                    let dadosArray = [];

                    const linhas = conteudoTexto.split(/\r\n|\n/);
                    if (linhas.length === 0) throw new Error("Arquivo CSV vazio.");

                    const primeiraLinha = linhas[0];
                    const delimitador = primeiraLinha.includes(';') ? ';' : ',';
                    const cabecalho = primeiraLinha.split(delimitador).map(h => h.trim().toLowerCase());
                    
                    const idxRef = cabecalho.findIndex(h => h.includes('referencia') || h.includes('referência'));
                    const idxTit = cabecalho.findIndex(h => h.includes('titulo') || h.includes('título') || h.includes('competência') || h.includes('competencia'));
                    const idxCh = cabecalho.findIndex(h => h.includes('carga horaria') || h.includes('carga_horaria') || h.includes('carga') || h.includes('ch'));
                    const idxInd = cabecalho.findIndex(h => h.includes('indicadores'));
                    const idxCon = cabecalho.findIndex(h => h.includes('conhecimentos'));

                    if (idxRef === -1 || idxTit === -1 || idxCh === -1) {
                        throw new Error("O CSV precisa obrigatoriamente conter as colunas 'referencia', 'titulo' e 'carga_horaria'.");
                    }

                    for (let i = 1; i < linhas.length; i++) {
                        const linha = linhas[i].trim();
                        if (!linha) continue;
                        const colunas = linha.split(delimitador).map(c => c.trim().replace(/^"(.*)"$/, '$1'));
                        
                        if (!colunas[idxRef] || colunas[idxRef].trim() === "") continue;

                        dadosArray.push({
                            referencia: colunas[idxRef],
                            titulo: colunas[idxTit],
                            carga_horaria: colunas[idxCh],
                            indicadores: (idxInd !== -1 && colunas[idxInd]) ? colunas[idxInd] : "",
                            conhecimentos: (idxCon !== -1 && colunas[idxCon]) ? colunas[idxCon] : ""
                        });
                    }

                    if(dadosArray.length === 0) throw new Error("Nenhum dado válido encontrado no arquivo.");

                    const qtdInseridos = await window.ControllerCursos.carregarUCsLote(idCurso, dadosArray);
                    
                    if(qtdInseridos === 0) {
                        alert("Concluído: Nenhuma nova UC inserida. Todas as referências enviadas já estão ativas para este Curso.");
                    } else {
                        alert(`Fantástico! ${qtdInseridos} novas UCs foram vinculadas ao curso.`);
                        await this.carregarDadosBase();
                        this.renderizarTabelaCursos(); 
                    }
                } catch(error) {
                    alert("Erro ao ler o CSV: " + error.message);
                } finally {
                    btnConfirma.innerText = "Confirmar Processamento";
                    btnConfirma.disabled = false;
                    fileInput.value = ""; 
                }
            };

            reader.readAsText(file, "UTF-8");
            return true;
        }

        const toggleFilter = (btnId, prop, defValue, modalId, focusId) => {
            const btn = e.target.closest(`#${btnId}`);
            if (btn) {
                if (filtrosCursos[prop] !== defValue) {
                    filtrosCursos[prop] = defValue;
                    if(prop === 'ch_valor') filtrosCursos['ch_sinal'] = '=';
                    this.renderizarTabelaCursos();
                } else {
                    this.fecharPopovers(modalId);
                    const modal = document.getElementById(modalId);
                    modal.classList.toggle('hidden');
                    if (!modal.classList.contains('hidden')) document.getElementById(focusId)?.focus();
                }
                return true;
            }
            return false;
        };

        if (toggleFilter('btn-filter-curso-titulo', 'titulo', '', 'modal-filter-curso-titulo', 'popover-input-curso-titulo')) return true;
        if (toggleFilter('btn-filter-curso-area', 'area', 'Todos', 'modal-filter-curso-area', 'popover-select-area')) return true;
        if (toggleFilter('btn-filter-curso-tipo', 'tipo', 'Todos', 'modal-filter-curso-tipo', 'popover-select-tipo')) return true;
        if (toggleFilter('btn-filter-curso-ch', 'ch_valor', '', 'modal-filter-curso-ch', 'popover-input-ch')) return true;

        if (e.target.closest('#apply-filter-curso-titulo')) {
            filtrosCursos.titulo = document.getElementById('popover-input-curso-titulo').value;
            document.getElementById('modal-filter-curso-titulo').classList.add('hidden');
            this.renderizarTabelaCursos();
            return true;
        }
        if (e.target.closest('#apply-filter-curso-area')) {
            filtrosCursos.area = document.getElementById('popover-select-area').value;
            document.getElementById('modal-filter-curso-area').classList.add('hidden');
            this.renderizarTabelaCursos();
            return true;
        }
        if (e.target.closest('#apply-filter-curso-tipo')) {
            filtrosCursos.tipo = document.getElementById('popover-select-tipo').value;
            document.getElementById('modal-filter-curso-tipo').classList.add('hidden');
            this.renderizarTabelaCursos();
            return true;
        }
        if (e.target.closest('#apply-filter-curso-ch')) {
            filtrosCursos.ch_sinal = document.getElementById('popover-sinal-ch').value;
            filtrosCursos.ch_valor = document.getElementById('popover-input-ch').value;
            document.getElementById('modal-filter-curso-ch').classList.add('hidden');
            this.renderizarTabelaCursos();
            return true;
        }

        if (!e.target.closest('th') && !e.target.closest('.popover-modal')) {
            this.fecharPopovers();
        }

        return false;
    },

    async tratarSubmits(e) {
        
        // Add Curso Base
        if (e.target.id === 'form-curso') {
            e.preventDefault();
            try {
                const titulo = document.getElementById('add-curso-titulo').value;
                const sigla = document.getElementById('add-curso-sigla').value;
                const area = document.getElementById('add-curso-area').value;
                const tipo = document.getElementById('add-curso-tipo').value;
                
                await window.ControllerCursos.salvarCurso(titulo, sigla, area, tipo);
                
                if (!cacheAreas.find(a => a.nome.toLowerCase() === area.toLowerCase().trim())) {
                    await window.ControllerCursos.salvarArea(area);
                }

                alert("Curso cadastrado com sucesso!");
                e.target.reset();
                await this.carregarDadosBase();
                this.renderizarTabelaCursos();
                this.popularSelectsEFormularios();
            } catch (error) { alert(error.message); }
            return true;
        }

        // Editar Curso Base (Modal)
        if (e.target.id === 'form-edit-curso') {
            e.preventDefault();
            try {
                const id = document.getElementById('edit-curso-id').value;
                const titulo = document.getElementById('edit-curso-titulo').value;
                const sigla = document.getElementById('edit-curso-sigla').value;
                const area = document.getElementById('edit-curso-area').value;
                const tipo = document.getElementById('edit-curso-tipo').value;

                await window.ControllerCursos.editarCurso(id, {
                    titulo: titulo.trim(), sigla: sigla.trim().toUpperCase(), area: area.trim(), tipo: tipo
                });

                if (!cacheAreas.find(a => a.nome.toLowerCase() === area.toLowerCase().trim())) {
                    await window.ControllerCursos.salvarArea(area);
                }

                document.getElementById('modal-edit-curso').classList.add('hidden');
                
                await this.carregarDadosBase();
                this.renderizarTabelaCursos();
                this.popularSelectsEFormularios();
            } catch (error) { alert(error.message); }
            return true;
        }

        // Add UC Manual
        if (e.target.id === 'form-uc') {
            e.preventDefault();
            try {
                const idCurso = document.getElementById('add-uc-curso').value;
                const refSufixo = document.getElementById('add-uc-ref').value;
                const titulo = document.getElementById('add-uc-titulo').value;
                const ch = document.getElementById('add-uc-ch').value;
                const ind = document.getElementById('add-uc-indicadores').value;
                const con = document.getElementById('add-uc-conhecimentos').value;

                await window.ControllerCursos.salvarUC(idCurso, `UC-${refSufixo}`, titulo, ch, ind, con);
                
                alert("Unidade Curricular cadastrada com sucesso!");
                e.target.reset();
                await this.carregarDadosBase();
                this.renderizarTabelaCursos();
            } catch (error) { alert(error.message); }
            return true;
        }

        // Add Nova Área Modal
        if (e.target.id === 'form-area') {
            e.preventDefault();
            try {
                const nomeArea = document.getElementById('add-area-nome').value;
                await window.ControllerCursos.salvarArea(nomeArea);
                
                e.target.reset();
                document.getElementById('modal-add-area').classList.add('hidden');
                
                await this.carregarDadosBase();
                this.popularSelectsEFormularios();
            } catch (error) { alert(error.message); }
            return true;
        }

        // Editar UC Modal
        if (e.target.id === 'form-edit-uc') {
            e.preventDefault();
            try {
                const id = document.getElementById('edit-uc-id').value;
                const ref = document.getElementById('edit-uc-ref').value;
                const ch = document.getElementById('edit-uc-ch').value;
                const tit = document.getElementById('edit-uc-titulo').value;
                const ind = document.getElementById('edit-uc-indicadores').value;
                const con = document.getElementById('edit-uc-conhecimentos').value;

                await window.ControllerCursos.editarUC(id, {
                    referencia: ref, carga_horaria: ch, titulo: tit, indicadores: ind, conhecimentos: con
                });

                document.getElementById('modal-edit-uc').classList.add('hidden');
                
                await this.carregarDadosBase();
                this.renderizarTabelaCursos();
            } catch (error) { alert(error.message); }
            return true;
        }

        return false;
    }
};