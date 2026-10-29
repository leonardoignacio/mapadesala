// ./cursos/app_curso_frm.js - Lógica de Formulários, Modais e Carga em Lote de Cursos e UCs
window.AppCursoFrm = {

    podeEditar() {
        const cargosEdicao = ['root', 'admin', 'tecnico', 'docente'];
        return cargosEdicao.includes(window.usuarioAtual?.cargo);
    },

    popularSelectsFormularios() {
        const cacheAreas = window.AppCursoListar?.cacheAreas || [];
        const cacheCursos = window.AppCursoListar?.cacheCursos || [];

        // Garante que todas as áreas habilitadas no perfil do usuário também estejam disponíveis na lista
        const nomesAreasSet = new Set(cacheAreas.map(a => a.nome));
        const areasPerfil = Array.isArray(window.usuarioAtual?.areas) ? window.usuarioAtual.areas : [];
        areasPerfil.forEach(nomeArea => {
            if (nomeArea && nomeArea !== "Todas") nomesAreasSet.add(nomeArea);
        });
        const listaNomesAreas = Array.from(nomesAreasSet).sort((a, b) => a.localeCompare(b));

        // 1. Popula Datalists (usados por Root, Admin e Técnico)
        const datalistArea = document.getElementById('add-curso-datalist-area');
        if (datalistArea) datalistArea.innerHTML = listaNomesAreas.map(nome => `<option value="${window.Util.esc(nome)}">`).join('');

        const datalistAreaEdit = document.getElementById('edit-curso-datalist-area');
        if (datalistAreaEdit) datalistAreaEdit.innerHTML = listaNomesAreas.map(nome => `<option value="${window.Util.esc(nome)}">`).join('');

        // 2. Popula Selects de Área (usados quando logado como Docente)
        const campoAreaAdd = document.getElementById('add-curso-area');
        if (campoAreaAdd && campoAreaAdd.tagName === 'SELECT') {
            campoAreaAdd.innerHTML = '<option value="" disabled selected>Selecione a Área...</option>' +
                listaNomesAreas.map(nome => `<option value="${window.Util.esc(nome)}">${window.Util.esc(nome)}</option>`).join('');
        }

        const campoAreaEdit = document.getElementById('edit-curso-area');
        if (campoAreaEdit && campoAreaEdit.tagName === 'SELECT') {
            campoAreaEdit.innerHTML = listaNomesAreas.map(nome => `<option value="${window.Util.esc(nome)}">${window.Util.esc(nome)}</option>`).join('');
        }

        // 3. Popula Selects de Cursos (para vincular UCs manual e em lote)
        const selectCursoAddUC = document.getElementById('add-uc-curso');
        const selectCursoLote = document.getElementById('add-uc-lote-curso');
        const optionsCursos = '<option value="" disabled selected>Selecione o Curso...</option>' +
                              cacheCursos.map(c => `<option value="${window.Util.esc(c.id)}">[${window.Util.esc(c.sigla || '---')}] ${window.Util.esc(c.titulo)}</option>`).join('');
        
        if (selectCursoAddUC) selectCursoAddUC.innerHTML = optionsCursos;
        if (selectCursoLote) selectCursoLote.innerHTML = optionsCursos;
    },

    aoMudarTipoCurso(contexto = 'add', valorInicial = '') {
        const selectTipo = document.getElementById(`${contexto}-curso-tipo`);
        const inputCH = document.getElementById(`${contexto}-curso-ch`);
        const hintCH = document.getElementById(`hint-${contexto}-curso-ch`);
        if (!selectTipo || !inputCH) return;

        if (hintCH) hintCH.classList.add('hidden');

        if (selectTipo.value === 'Livre') {
            inputCH.disabled = false;
            inputCH.value = valorInicial !== null && valorInicial !== undefined ? valorInicial : '';
            inputCH.placeholder = "Digite a CH (máx. 39h) ou deixe vazio p/ somar UCs";
            inputCH.className = contexto === 'add'
                ? "w-full border border-slate-300 bg-white text-slate-800 p-2 md:p-3 rounded-lg text-sm md:text-base outline-none focus:border-blue-500 transition"
                : "w-full border border-slate-300 bg-white text-slate-800 p-2 md:p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 transition";
        } else {
            inputCH.disabled = true;
            inputCH.value = '';
            inputCH.placeholder = contexto === 'add' ? "Calculado via UCs automaticamente." : "Soma da ch das UCs - Cálculo automaticamente.";
            inputCH.className = contexto === 'add'
                ? "w-full border border-slate-200 bg-slate-50 text-slate-400 p-2 md:p-3 rounded-lg text-sm md:text-base cursor-not-allowed outline-none transition"
                : "w-full border border-slate-200 bg-slate-50 text-slate-400 p-2 md:p-2.5 rounded-lg text-sm cursor-not-allowed outline-none transition";
        }
    },

    aoDigitarCHCurso(contexto = 'add') {
        const inputCH = document.getElementById(`${contexto}-curso-ch`);
        const hintCH = document.getElementById(`hint-${contexto}-curso-ch`);
        if (!inputCH) return;

        const limpo = inputCH.value.replace(/[^0-9]/g, '');
        if (limpo === '') {
            inputCH.value = '';
            return;
        }

        const numero = parseInt(limpo, 10);
        if (numero >= 40) {
            inputCH.value = '';
            if (hintCH) hintCH.classList.remove('hidden');
        } else if (numero === 0) {
            inputCH.value = '';
        } else {
            inputCH.value = numero.toString();
            if (hintCH) hintCH.classList.add('hidden');
        }
    },

    abrirModalEditarCurso(idCurso) {
        if (!this.podeEditar()) return;
        const cacheCursos = window.AppCursoListar?.cacheCursos || [];
        const curso = cacheCursos.find(c => c.id === idCurso);
        if(!curso) return;

        this.popularSelectsFormularios();

        document.getElementById('edit-curso-id').value = curso.id;
        document.getElementById('edit-curso-titulo').value = curso.titulo;
        document.getElementById('edit-curso-sigla').value = curso.sigla || "";
        
        const campoAreaEdit = document.getElementById('edit-curso-area');
        if (campoAreaEdit) {
            if (campoAreaEdit.tagName === 'SELECT' && !Array.from(campoAreaEdit.options).some(o => o.value === curso.area)) {
                campoAreaEdit.insertAdjacentHTML('beforeend', `<option value="${window.Util.esc(curso.area)}">${window.Util.esc(curso.area)}</option>`);
            }
            campoAreaEdit.value = curso.area;
        }

        document.getElementById('edit-curso-tipo').value = curso.tipo;

        const chInicial = (curso.tipo === "Livre" && curso.carga_horaria && parseInt(curso.carga_horaria) <= 39)
            ? curso.carga_horaria.toString()
            : "";
        this.aoMudarTipoCurso('edit', chInicial);

        document.getElementById('modal-edit-curso')?.classList.remove('hidden');
    },

    abrirModalDetalhesUC(idUC) {
        const cacheUCs = window.AppCursoListar?.cacheUCs || [];
        const uc = cacheUCs.find(u => u.id === idUC);
        if(!uc) return;

        document.getElementById('edit-uc-id').value = uc.id;
        document.getElementById('edit-uc-ref').value = uc.referencia;
        document.getElementById('edit-uc-ch').value = uc.carga_horaria;
        document.getElementById('edit-uc-titulo').value = uc.titulo;
        document.getElementById('edit-uc-indicadores').value = uc.indicadores || "";
        document.getElementById('edit-uc-conhecimentos').value = uc.conhecimentos || "";

        document.getElementById('modal-edit-uc')?.classList.remove('hidden');
    },

    abrirModalEditAreas() {
        if (!this.podeEditar()) return;
        const container = document.getElementById('lista-edit-areas');
        if (!container) return;

        const cacheAreas = window.AppCursoListar?.cacheAreas || [];
        const saveIcon = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>`;

        if (cacheAreas.length === 0) {
            container.innerHTML = `<p class="text-sm text-slate-500">Nenhuma área cadastrada.</p>`;
        } else {
            container.innerHTML = cacheAreas.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(area => `
                <div class="flex items-center gap-2">
                    <input type="text" value="${window.Util.esc(area.nome)}" id="input-area-${area.id}" class="flex-1 border border-slate-300 p-2 md:p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base font-semibold text-slate-700">
                    <button type="button" data-id="${area.id}" class="btn-save-area bg-blue-600 hover:bg-blue-700 text-white p-2 md:p-2.5 rounded-lg transition shadow-sm flex items-center justify-center" title="Salvar Área">
                        ${saveIcon}
                    </button>
                </div>
            `).join('');
        }
        document.getElementById('modal-edit-area')?.classList.remove('hidden');
    },

    async tratarCliques(e) {
        if (e.target.closest('#btn-close-modal-uc') || e.target.closest('#btn-cancel-edit-uc')) {
            document.getElementById('modal-edit-uc')?.classList.add('hidden');
            return true;
        }

        if (!this.podeEditar()) return false;

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

            if (!novoNome.trim()) { await window.Dialog.alerta("O nome da área não pode ser vazio."); return true; }

            const iconeOriginal = btn.innerHTML;
            btn.innerHTML = `<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>`;
            btn.disabled = true;

            try {
                await window.ControllerCursoFrm.editarArea(id, novoNome);
                document.getElementById('modal-edit-area')?.classList.add('hidden');
                
                await window.AppCursoListar.carregarDadosBase();
                window.AppCursoListar.popularFiltrosESelects();
                window.AppCursoListar.renderizarTabelaCursos(); 
            } catch (error) {
                await window.Dialog.erro(error);
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

        if (e.target.closest('#btn-carregar-lote-ucs')) {
            const idCurso = document.getElementById('add-uc-lote-curso').value;
            const fileInput = document.getElementById('arquivo-lote-ucs');

            if (!idCurso) { await window.Dialog.alerta("Por favor, selecione um curso no seletor para vincular as UCs."); return true; }
            if (!fileInput.files.length) { await window.Dialog.alerta("Por favor, selecione um arquivo .csv para processar."); return true; }

            const btnConfirma = e.target.closest('#btn-carregar-lote-ucs');
            btnConfirma.innerText = "Processando Lote...";
            btnConfirma.disabled = true;

            const file = fileInput.files[0];
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const conteudoTexto = event.target.result;
                    const dadosArray = [];

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

                    const qtdInseridos = await window.ControllerCursoFrm.carregarUCsLote(idCurso, dadosArray);
                    
                    if(qtdInseridos === 0) {
                        await window.Dialog.alerta("Concluído: Nenhuma nova UC inserida. Todas as referências enviadas já estão ativas para este Curso.");
                    } else {
                        await window.Dialog.alerta(`Fantástico! ${qtdInseridos} novas UCs foram vinculadas ao curso.`);
                        await window.AppCursoListar.carregarDadosBase();
                        window.AppCursoListar.renderizarTabelaCursos(); 
                    }
                } catch(error) {
                    await window.Dialog.erro(error, "Erro ao ler o CSV");
                } finally {
                    btnConfirma.innerText = "Confirmar Processamento em Lote";
                    btnConfirma.disabled = false;
                    fileInput.value = ""; 
                }
            };

            reader.readAsText(file, "UTF-8");
            return true;
        }

        return false;
    },

    async tratarSubmits(e) {
        const idsFormularios = ['form-curso', 'form-edit-curso', 'form-uc', 'form-area', 'form-edit-uc'];
        if (!idsFormularios.includes(e.target.id)) return false;

        e.preventDefault();
        if (!this.podeEditar()) {
            await window.Dialog.alerta("Perfil Somente Leitura: Operação não permitida.");
            return true;
        }

        const cacheAreas = window.AppCursoListar?.cacheAreas || [];

        if (e.target.id === 'form-curso') {
            try {
                const titulo = document.getElementById('add-curso-titulo').value;
                const sigla = document.getElementById('add-curso-sigla').value;
                const area = document.getElementById('add-curso-area').value;
                const tipo = document.getElementById('add-curso-tipo').value;
                const chManual = document.getElementById('add-curso-ch').value;
                
                await window.ControllerCursoFrm.salvarCurso(titulo, sigla, area, tipo, chManual);
                
                if (!cacheAreas.find(a => a.nome.toLowerCase() === area.toLowerCase().trim())) {
                    await window.ControllerCursoFrm.salvarArea(area);
                }

                await window.Dialog.alerta("Curso cadastrado com sucesso!");
                e.target.reset();
                this.aoMudarTipoCurso('add');
                await window.AppCursoListar.carregarDadosBase();
                window.AppCursoListar.renderizarTabelaCursos();
                window.AppCursoListar.popularFiltrosESelects();
            } catch (error) { await window.Dialog.erro(error); }
            return true;
        }

        if (e.target.id === 'form-edit-curso') {
            try {
                const id = document.getElementById('edit-curso-id').value;
                const titulo = document.getElementById('edit-curso-titulo').value;
                const sigla = document.getElementById('edit-curso-sigla').value;
                const area = document.getElementById('edit-curso-area').value;
                const tipo = document.getElementById('edit-curso-tipo').value;
                const chManual = document.getElementById('edit-curso-ch').value;

                await window.ControllerCursoFrm.editarCurso(id, {
                    titulo: titulo.trim(),
                    sigla: sigla.trim().toUpperCase(),
                    area: area.trim(),
                    tipo: tipo,
                    carga_horaria: chManual
                });

                if (!cacheAreas.find(a => a.nome.toLowerCase() === area.toLowerCase().trim())) {
                    await window.ControllerCursoFrm.salvarArea(area);
                }

                document.getElementById('modal-edit-curso')?.classList.add('hidden');
                
                await window.AppCursoListar.carregarDadosBase();
                window.AppCursoListar.renderizarTabelaCursos();
                window.AppCursoListar.popularFiltrosESelects();
            } catch (error) { await window.Dialog.erro(error); }
            return true;
        }

        if (e.target.id === 'form-uc') {
            try {
                const idCurso = document.getElementById('add-uc-curso').value;
                const refSufixo = document.getElementById('add-uc-ref').value;
                const titulo = document.getElementById('add-uc-titulo').value;
                const ch = document.getElementById('add-uc-ch').value;
                const ind = document.getElementById('add-uc-indicadores').value;
                const con = document.getElementById('add-uc-conhecimentos').value;

                await window.ControllerCursoFrm.salvarUC(idCurso, `UC-${refSufixo}`, titulo, ch, ind, con);
                
                await window.Dialog.alerta("Unidade Curricular cadastrada com sucesso!");
                e.target.reset();
                await window.AppCursoListar.carregarDadosBase();
                window.AppCursoListar.renderizarTabelaCursos();
            } catch (error) { await window.Dialog.erro(error); }
            return true;
        }

        if (e.target.id === 'form-area') {
            try {
                const nomeArea = document.getElementById('add-area-nome').value;
                await window.ControllerCursoFrm.salvarArea(nomeArea);
                
                e.target.reset();
                document.getElementById('modal-add-area')?.classList.add('hidden');
                
                await window.AppCursoListar.carregarDadosBase();
                window.AppCursoListar.popularFiltrosESelects();
            } catch (error) { await window.Dialog.erro(error); }
            return true;
        }

        if (e.target.id === 'form-edit-uc') {
            try {
                const id = document.getElementById('edit-uc-id').value;
                const ref = document.getElementById('edit-uc-ref').value;
                const ch = document.getElementById('edit-uc-ch').value;
                const tit = document.getElementById('edit-uc-titulo').value;
                const ind = document.getElementById('edit-uc-indicadores').value;
                const con = document.getElementById('edit-uc-conhecimentos').value;

                await window.ControllerCursoFrm.editarUC(id, {
                    referencia: ref, carga_horaria: ch, titulo: tit, indicadores: ind, conhecimentos: con
                });

                document.getElementById('modal-edit-uc')?.classList.add('hidden');
                
                await window.AppCursoListar.carregarDadosBase();
                window.AppCursoListar.renderizarTabelaCursos();
            } catch (error) { await window.Dialog.erro(error); }
            return true;
        }

        return false;
    }
};