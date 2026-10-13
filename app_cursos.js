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
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Carregando dados...</td></tr>`;
        
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
        if (datalistArea) {
            datalistArea.innerHTML = cacheAreas.map(a => `<option value="${a.nome}">`).join('');
        }

        // Renderiza o select de cursos nas duas áreas (Manual e Lote)
        const selectCursoAddUC = document.getElementById('add-uc-curso');
        const selectCursoLote = document.getElementById('add-uc-lote-curso');
        const optionsCursos = `<option value="" disabled selected>Selecione o Curso...</option>` +
                              cacheCursos.map(c => `<option value="${c.id}">${c.titulo}</option>`).join('');
        
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

        const svgLixeira = `<svg class="w-4 h-4 md:w-4 md:h-4 text-slate-400 hover:text-red-600 transition cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
        const svgLapis = `<svg class="w-4 h-4 md:w-4 md:h-4 text-slate-400 hover:text-blue-600 transition cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
        const svgFolha = `<svg class="w-4 h-4 md:w-4 md:h-4 text-slate-400 hover:text-purple-600 transition cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;

        const dadosFiltrados = cacheCursos.filter(curso => {
            const chTotal = this.calcularCHTotal(curso.id);
            
            const matchTitulo = filtrosCursos.titulo === "" || curso.titulo.toLowerCase().includes(filtrosCursos.titulo.toLowerCase().trim());
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
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Nenhum curso encontrado para estes filtros.</td></tr>`;
            return;
        }

        const html = dadosFiltrados.map(curso => {
            const chTotal = this.calcularCHTotal(curso.id);
            const ucsDoCurso = cacheUCs.filter(uc => uc.id_curso === curso.id).sort((a,b) => {
                const numA = parseInt(a.referencia.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.referencia.replace(/\D/g, '')) || 0;
                return numA - numB;
            });

            let htmlUCs = "";
            if(ucsDoCurso.length === 0) {
                htmlUCs = `<tr><td colspan="4" class="py-4 text-center text-slate-400 text-xs md:text-sm">Nenhuma UC vinculada a este curso.</td></tr>`;
            } else {
                htmlUCs = ucsDoCurso.map(uc => `
                    <tr class="hover:bg-slate-100 transition border-b border-slate-100 last:border-0">
                        <td class="p-2 w-[15%] md:w-[8%] text-center flex items-center justify-center gap-2">
                            <span class="btn-excluir-uc" data-id="${uc.id}" title="Excluir UC">${svgLixeira}</span>
                            <span class="btn-detalhes-uc" data-id="${uc.id}" title="Detalhes / Editar UC">${svgFolha}</span>
                        </td>
                        <td class="p-2 w-[20%] text-xs md:text-sm font-semibold text-slate-700 whitespace-normal break-words">${uc.referencia}</td>
                        <td class="p-2 w-[50%] text-xs md:text-sm text-slate-600 whitespace-normal break-words">${uc.titulo}</td>
                        <td class="p-2 w-[15%] text-xs md:text-sm font-bold text-slate-700 whitespace-normal break-words text-right">${uc.carga_horaria}h</td>
                    </tr>
                `).join('');
            }

            return `
            <tr class="hover:bg-blue-50 transition cursor-pointer row-curso group" data-curso-id="${curso.id}">
                <td class="p-2 md:py-3 md:px-2 text-center align-middle w-[15%] md:w-[8%]">
                    ${window.usuarioAtual && window.usuarioAtual.cargo !== 'apoio' ? `
                    <div class="flex items-center justify-center gap-2">
                        <span class="btn-editar-curso" data-id="${curso.id}" title="Editar Curso">${svgLapis}</span>
                        <span class="btn-excluir-curso" data-id="${curso.id}" title="Excluir Curso">${svgLixeira}</span>
                    </div>` : `<span class="text-slate-300">-</span>`}
                </td>
                <td class="p-2 md:py-3 md:px-4 text-xs md:text-base font-bold text-slate-800 border-b border-slate-200 align-middle whitespace-normal break-words w-[35%] md:w-[42%] group-hover:text-blue-700 transition-colors">${curso.titulo}</td>
                <td class="p-2 md:py-3 md:px-4 text-xs md:text-base text-slate-600 border-b border-slate-200 align-middle whitespace-normal break-words w-[20%] md:w-[20%]">${curso.area}</td>
                <td class="p-2 md:py-3 md:px-4 border-b border-slate-200 align-middle w-[15%] md:w-[15%]"><span class="px-2 py-1 rounded text-[10px] md:text-xs font-bold shadow-sm bg-slate-200 text-slate-700 whitespace-nowrap">${curso.tipo}</span></td>
                <td class="p-2 md:py-3 md:px-4 text-xs md:text-base font-bold text-slate-700 border-b border-slate-200 align-middle whitespace-normal break-words w-[15%] md:w-[15%] text-right">${chTotal}h</td>
            </tr>
            <tr class="hidden row-ucs bg-slate-50 border-b-2 border-slate-200" id="accordion-${curso.id}">
                <td colspan="5" class="p-0">
                    <div class="p-4 pl-8 border-l-4 border-blue-500 bg-slate-50">
                        <p class="text-xs font-bold text-slate-500 uppercase mb-2">Unidades Curriculares Vinculadas</p>
                        <table class="w-full text-left table-fixed bg-white rounded-lg shadow-sm border border-slate-200">
                            <tbody>${htmlUCs}</tbody>
                        </table>
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

    async tratarCliques(e) {
        
        const rowCurso = e.target.closest('.row-curso');
        if (rowCurso && !e.target.closest('.btn-editar-curso') && !e.target.closest('.btn-excluir-curso')) {
            const cursoId = rowCurso.getAttribute('data-curso-id');
            const accordionRow = document.getElementById(`accordion-${cursoId}`);
            if (accordionRow) accordionRow.classList.toggle('hidden');
            return true;
        }

        // --- Modais ---
        if (e.target.closest('#btn-open-modal-area')) {
            document.getElementById('modal-add-area')?.classList.remove('hidden');
            setTimeout(() => document.getElementById('add-area-nome')?.focus(), 100);
            return true;
        }
        if (e.target.closest('#btn-close-modal-area')) {
            document.getElementById('modal-add-area')?.classList.add('hidden');
            return true;
        }
        if (e.target.closest('#btn-close-modal-uc') || e.target.closest('#btn-cancel-edit-uc')) {
            document.getElementById('modal-edit-uc')?.classList.add('hidden');
            return true;
        }
        if (e.target.closest('.btn-detalhes-uc')) {
            const id = e.target.closest('.btn-detalhes-uc').getAttribute('data-id');
            this.abrirModalDetalhesUC(id);
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

        // CSV Template Download
        if (e.target.closest('#btn-baixar-modelo-ucs')) {
            const csvContent = "referencia;titulo;carga_horaria;indicadores;conhecimentos\n";
            const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `modelo_importacao_ucs.csv`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            return true;
        }

        // --- Ações: Excluir ---
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

        // --- Carga em Lote ---
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

        // --- Filtros ---
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
        if (e.target.id === 'form-curso') {
            e.preventDefault();
            try {
                const titulo = document.getElementById('add-curso-titulo').value;
                const area = document.getElementById('add-curso-area').value;
                const tipo = document.getElementById('add-curso-tipo').value;
                
                await window.ControllerCursos.salvarCurso(titulo, area, tipo);
                
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

        if (e.target.id === 'form-area') {
            e.preventDefault();
            try {
                const nomeArea = document.getElementById('add-area-nome').value;
                await window.ControllerCursos.salvarArea(nomeArea);
                
                alert("Nova área registrada!");
                e.target.reset();
                document.getElementById('modal-add-area').classList.add('hidden');
                
                await this.carregarDadosBase();
                this.popularSelectsEFormularios();
            } catch (error) { alert(error.message); }
            return true;
        }

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

                alert("UC atualizada com sucesso!");
                document.getElementById('modal-edit-uc').classList.add('hidden');
                
                await this.carregarDadosBase();
                this.renderizarTabelaCursos();
            } catch (error) { alert(error.message); }
            return true;
        }

        return false;
    }
};