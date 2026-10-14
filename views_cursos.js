// views_cursos.js - Interface Visual da View Cursos e UCs
window.ViewsCursos = {
    renderizar() {
        return `
        <div class="px-2 md:px-8 pt-4 pb-6 fade-in flex-1 overflow-hidden flex flex-col w-full relative">
            
            <h1 class="text-xl font-bold mb-3 text-slate-800 w-full lg:w-[90%] mx-auto shrink-0 px-2 md:px-0">Cursos e UCs</h1>
            
            <div class="flex border-b border-slate-200 mb-4 gap-4 lg:gap-6 w-full lg:w-[90%] mx-auto overflow-x-auto shrink-0 px-2 md:px-0">
                <button class="tab-btn active font-bold text-blue-600 border-b-2 border-blue-600 pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-listar-cursos">Listar Cursos/UCs</button>
                <button class="tab-btn font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-add-cursos">Add Cursos/UCs</button>
            </div>

            <!-- CONTEÚDO: ABA LISTAR -->
            <div id="tab-listar-cursos" class="tab-content flex-1 flex flex-col overflow-hidden min-h-0">
                <div class="w-full lg:w-[90%] mx-auto flex-1 flex flex-col overflow-hidden">
                    <div class="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden relative min-h-[50vh]">
                        <div class="overflow-x-auto overflow-y-auto flex-1 w-full bg-white relative">
                            <table class="w-full text-left border-separate border-spacing-0 table-fixed">
                                <thead class="bg-slate-50 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                                    <tr>
                                        <!-- Coluna Ação -->
                                        <th class="px-1 py-2 md:py-4 md:px-2 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[10%] md:w-[7%] text-center border-b border-slate-200 bg-slate-50/95 backdrop-blur">Ação</th>
                                        
                                        <!-- Coluna Sigla -->
                                        <th class="px-1 py-2 md:py-4 md:px-3 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[14%] md:w-[10%] border-b border-slate-200 bg-slate-50/95 backdrop-blur">Sigla</th>

                                        <!-- Coluna Título -->
                                        <th class="px-1 py-2 md:py-4 md:px-4 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[30%] md:w-[35%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Título 
                                                <button id="btn-filter-curso-titulo" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-curso-titulo">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-curso-titulo" class="hidden absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-56 md:w-64 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Pesquisar por Título</p>
                                                <div class="space-y-2">
                                                    <input type="text" id="popover-input-curso-titulo" placeholder="Ex: Técnico em..." class="w-full border border-slate-300 p-2 rounded-lg outline-none focus:border-blue-500">
                                                    <button id="apply-filter-curso-titulo" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Pesquisar</button>
                                                </div>
                                            </div>
                                        </th>

                                        <!-- Coluna Área -->
                                        <th class="px-1 py-2 md:py-4 md:px-4 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[18%] md:w-[20%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Área 
                                                <button id="btn-filter-curso-area" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-curso-area">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-curso-area" class="hidden absolute top-full right-0 md:left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-52 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Selecionar Área</p>
                                                <div class="space-y-2">
                                                    <select id="popover-select-area" class="w-full border border-slate-300 p-2 rounded-lg bg-white outline-none focus:border-blue-500 cursor-pointer">
                                                        <option value="Todos">Todos</option>
                                                    </select>
                                                    <button id="apply-filter-curso-area" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                                </div>
                                            </div>
                                        </th>

                                        <!-- Coluna Tipo -->
                                        <th class="px-1 py-2 md:py-4 md:px-4 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[14%] md:w-[13%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Tipo 
                                                <button id="btn-filter-curso-tipo" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-curso-tipo">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-curso-tipo" class="hidden absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-52 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Selecionar Tipo</p>
                                                <div class="space-y-2">
                                                    <select id="popover-select-tipo" class="w-full border border-slate-300 p-2 rounded-lg bg-white outline-none focus:border-blue-500 cursor-pointer">
                                                        <option value="Todos">Todos</option>
                                                        <option value="Técnico">Técnico</option>
                                                        <option value="Livre">Livre</option>
                                                        <option value="Aprendizagem">Aprendizagem</option>
                                                    </select>
                                                    <button id="apply-filter-curso-tipo" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                                </div>
                                            </div>
                                        </th>

                                        <!-- Coluna CH Total -->
                                        <th class="px-1 py-2 md:py-4 md:px-4 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[14%] md:w-[15%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-end md:justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">CH 
                                                <button id="btn-filter-curso-ch" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-curso-ch">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-curso-ch" class="hidden absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-48 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Filtrar CH Total</p>
                                                <div class="space-y-2">
                                                    <select id="popover-sinal-ch" class="w-full border border-slate-300 p-2 rounded-lg bg-white outline-none focus:border-blue-500 cursor-pointer">
                                                        <option value="=">Igual a</option>
                                                        <option value=">">Maior que</option>
                                                        <option value="<">Menor que</option>
                                                    </select>
                                                    <input type="number" id="popover-input-ch" placeholder="Ex: 1200" class="w-full border border-slate-300 p-2 rounded-lg outline-none focus:border-blue-500">
                                                    <button id="apply-filter-curso-ch" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody id="tabela-cursos" class="bg-white">
                                    <tr><td colspan="6" class="p-8 text-center text-slate-400 text-sm md:text-base">Carregando Cursos e UCs...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CONTEÚDO: ABA ADD -->
            <div id="tab-add-cursos" class="tab-content hidden flex-1 min-h-0 overflow-y-auto pb-6 px-2 md:px-0">
                <div class="w-full lg:w-[90%] mx-auto">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-start">
                        
                        <!-- Lado Esquerdo: Add Cursos + Carga Lote UCs -->
                        <div class="flex flex-col gap-4 lg:gap-6">
                            <!-- Formulário Add Cursos -->
                            <div class="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col relative h-fit">
                                <h2 class="font-bold mb-4 text-slate-800 text-base md:text-lg">Adicionar Curso Base</h2>
                                <form id="form-curso" class="space-y-4">
                                    <!-- Linha com Título e Sigla lado a lado -->
                                    <div class="flex gap-2">
                                        <div class="flex-1">
                                            <label class="block text-xs font-semibold text-slate-500 mb-1">Título do Curso</label>
                                            <input type="text" id="add-curso-titulo" placeholder="Ex: Técnico em Informática" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                                        </div>
                                        <div class="w-24 md:w-28">
                                            <label class="block text-xs font-semibold text-slate-500 mb-1">Sigla</label>
                                            <input type="text" id="add-curso-sigla" placeholder="Ex: TINF" maxlength="4" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base uppercase font-bold text-center" oninput="this.value = this.value.toUpperCase().slice(0, 4)" required>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-500 mb-1">Área do Curso</label>
                                        <div class="flex gap-2">
                                            <input list="add-curso-datalist-area" id="add-curso-area" placeholder="Selecione ou digite a Área..." class="flex-1 border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                                            <datalist id="add-curso-datalist-area"></datalist>
                                            <button type="button" id="btn-open-modal-area" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 rounded-lg transition" title="Cadastrar nova Área">➕</button>
                                            <button type="button" id="btn-open-modal-edit-area" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 rounded-lg transition flex items-center justify-center" title="Listar e Editar Áreas">
                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path></svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-xs font-semibold text-slate-500 mb-1">Tipo de Curso</label>
                                        <select id="add-curso-tipo" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base cursor-pointer" required>
                                            <option value="" disabled selected>Selecione o Tipo...</option>
                                            <option value="Técnico">Técnico</option>
                                            <option value="Livre">Livre</option>
                                            <option value="Aprendizagem">Aprendizagem</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label class="block text-xs font-semibold text-slate-500 mb-1">CH Total do Curso</label>
                                        <input type="text" value="Calculado via UCs automaticamente." class="w-full border border-slate-200 bg-slate-50 text-slate-400 p-2 md:p-3 rounded-lg text-sm md:text-base cursor-not-allowed" disabled>
                                    </div>

                                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 md:py-3 rounded-lg transition shadow-sm text-sm md:text-base mt-2">Salvar Curso</button>
                                </form>
                            </div>

                            <!-- Bloco de Carga em Lote -->
                            <div class="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col relative h-fit">
                                <div class="flex items-center justify-between mb-4">
                                    <div class="flex items-center gap-2">
                                        <h2 class="font-bold text-slate-800 text-base md:text-lg">Carga em Lote de UCs (CSV)</h2>
                                        <button type="button" id="btn-help-lote-ucs" class="w-5 h-5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full text-xs font-bold inline-flex items-center justify-center cursor-pointer transition shadow-sm" title="Ajuda sobre a estrutura do arquivo">?</button>
                                    </div>
                                    <button type="button" id="btn-baixar-modelo-ucs" class="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-3 py-1.5 rounded-lg text-xs transition shadow-sm border border-slate-200 flex items-center gap-1">📥 Modelo CSV</button>
                                </div>
                                
                                <p class="text-xs md:text-sm text-slate-500 mb-4">Importe várias UCs de uma vez. Selecione o curso de destino e o arquivo CSV formatado.</p>
                                
                                <div class="space-y-3">
                                    <select id="add-uc-lote-curso" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base cursor-pointer" required>
                                        <option value="" disabled selected>Vincular a qual Curso?</option>
                                    </select>
                                    <input type="file" id="arquivo-lote-ucs" accept=".csv" class="block w-full text-sm md:text-base text-slate-500 file:mr-2 md:file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-lg">
                                    <button type="button" id="btn-carregar-lote-ucs" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 md:py-3 rounded-lg transition shadow-sm text-sm md:text-base">Confirmar Processamento em Lote</button>
                                </div>
                            </div>
                        </div>

                        <!-- Lado Direito: Formulário Add UCs Manual -->
                        <div class="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col relative h-fit">
                            <h2 class="font-bold mb-4 text-slate-800 text-base md:text-lg">Adicionar UC Manualmente</h2>
                            <form id="form-uc" class="space-y-4">
                                <div>
                                    <label class="block text-xs font-semibold text-slate-500 mb-1">Vincular a qual Curso?</label>
                                    <select id="add-uc-curso" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base cursor-pointer" required>
                                        <option value="" disabled selected>Carregando cursos...</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-xs font-semibold text-slate-500 mb-1">Referência da UC</label>
                                    <div class="flex items-center">
                                        <span class="bg-slate-100 border border-slate-300 border-r-0 px-3 py-2 md:py-3 rounded-l-lg text-slate-600 font-bold text-sm md:text-base">UC-</span>
                                        <input type="number" id="add-uc-ref" list="datalist-uc-ref" placeholder="Ex: 1" class="w-full border border-slate-300 p-2 md:p-3 rounded-r-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                                        <datalist id="datalist-uc-ref">
                                            ${Array.from({length: 16}, (_, i) => `<option value="${i+1}">`).join('')}
                                        </datalist>
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-xs font-semibold text-slate-500 mb-1">Título / Competência</label>
                                    <input type="text" id="add-uc-titulo" placeholder="Ex: Lógica de Programação" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                                </div>

                                <div>
                                    <label class="block text-xs font-semibold text-slate-500 mb-1">Carga Horária (Apenas números)</label>
                                    <input type="number" id="add-uc-ch" placeholder="Ex: 108" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                                </div>

                                <div>
                                    <label class="block text-xs font-semibold text-slate-500 mb-1">Indicadores (Opcional)</label>
                                    <textarea id="add-uc-indicadores" placeholder="Digite os indicadores..." rows="2" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base resize-y"></textarea>
                                </div>

                                <div>
                                    <label class="block text-xs font-semibold text-slate-500 mb-1">Conhecimentos (Opcional)</label>
                                    <textarea id="add-uc-conhecimentos" placeholder="Digite os conhecimentos formativos..." rows="2" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base resize-y"></textarea>
                                </div>

                                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 md:py-3 rounded-lg transition shadow-sm text-sm md:text-base mt-2">Salvar UC</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAIS GLOBAIS DE CURSOS -->

        <!-- Modal Nova Área -->
        <div id="modal-add-area" class="hidden fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative fade-in">
                <button type="button" id="btn-close-modal-area" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-lg focus:outline-none">✕</button>
                <h3 class="font-bold text-base text-slate-800 mb-4">Cadastrar Nova Área</h3>
                <form id="form-area" class="space-y-4">
                    <input type="text" id="add-area-nome" placeholder="Ex: Tecnologia da Informação" class="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition shadow-sm text-sm md:text-base">Salvar Área</button>
                </form>
            </div>
        </div>

        <!-- Modal Editar Áreas -->
        <div id="modal-edit-area" class="hidden fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative fade-in max-h-[90vh] flex flex-col">
                <button type="button" id="btn-close-modal-edit-area" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-lg focus:outline-none">✕</button>
                <h3 class="font-bold text-base text-slate-800 mb-4">Editar Áreas</h3>
                <p class="text-xs text-slate-500 mb-3">Ao editar o nome de uma área, todos os cursos vinculados a ela serão atualizados automaticamente.</p>
                <div id="lista-edit-areas" class="space-y-3 overflow-y-auto pr-2">
                    <!-- Preenchido via JS -->
                </div>
            </div>
        </div>

        <!-- Modal Edição de Curso (Com campo Sigla) -->
        <div id="modal-edit-curso" class="hidden fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative fade-in">
                <button type="button" id="btn-close-modal-edit-curso" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-lg focus:outline-none">✕</button>
                <h3 class="font-bold text-base text-slate-800 mb-4">Editar Curso</h3>
                <form id="form-edit-curso" class="space-y-4">
                    <input type="hidden" id="edit-curso-id">
                    <div class="flex gap-2">
                        <div class="flex-1">
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Título do Curso</label>
                            <input type="text" id="edit-curso-titulo" class="w-full border border-slate-300 p-2 md:p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm" required>
                        </div>
                        <div class="w-24">
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Sigla</label>
                            <input type="text" id="edit-curso-sigla" maxlength="4" class="w-full border border-slate-300 p-2 md:p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm uppercase font-bold text-center" oninput="this.value = this.value.toUpperCase().slice(0, 4)" required>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Área do Curso</label>
                        <input list="edit-curso-datalist-area" id="edit-curso-area" class="w-full border border-slate-300 p-2 md:p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm" required>
                        <datalist id="edit-curso-datalist-area"></datalist>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Tipo de Curso</label>
                        <select id="edit-curso-tipo" class="w-full border border-slate-300 p-2 md:p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm cursor-pointer" required>
                            <option value="Técnico">Técnico</option>
                            <option value="Livre">Livre</option>
                            <option value="Aprendizagem">Aprendizagem</option>
                        </select>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" id="btn-cancel-edit-curso" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg transition text-sm">Cancelar</button>
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition shadow-sm text-sm">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal Detalhes/Edição da UC -->
        <div id="modal-edit-uc" class="hidden fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 md:p-6">
            <div class="bg-white rounded-xl shadow-2xl w-[95%] lg:w-[70%] max-w-5xl h-[90vh] p-4 md:p-8 relative fade-in flex flex-col">
                <button type="button" id="btn-close-modal-uc" class="absolute top-4 right-4 md:top-6 md:right-6 text-slate-400 hover:text-slate-700 font-bold text-xl md:text-2xl focus:outline-none">✕</button>
                <h3 class="font-bold text-lg md:text-xl text-slate-800 mb-4 shrink-0">Detalhes e Edição da UC</h3>
                
                <form id="form-edit-uc" class="flex-1 flex flex-col space-y-4 overflow-y-auto pr-2">
                    <input type="hidden" id="edit-uc-id">
                    <div class="flex flex-col md:flex-row gap-4 shrink-0">
                        <div class="w-full md:w-1/3">
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Ref.</label>
                            <input type="text" id="edit-uc-ref" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base font-bold bg-slate-50" readonly title="A referência da UC não pode ser alterada.">
                        </div>
                        <div class="w-full md:w-2/3">
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Carga Horária (h)</label>
                            <input type="number" id="edit-uc-ch" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                        </div>
                    </div>
                    
                    <div class="shrink-0">
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Título / Competência</label>
                        <input type="text" id="edit-uc-titulo" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                    </div>

                    <div class="flex-1 flex flex-col min-h-[150px]">
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Indicadores</label>
                        <textarea id="edit-uc-indicadores" class="w-full flex-1 border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base resize-y"></textarea>
                    </div>

                    <div class="flex-1 flex flex-col min-h-[150px]">
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Conhecimentos</label>
                        <textarea id="edit-uc-conhecimentos" class="w-full flex-1 border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base resize-y"></textarea>
                    </div>

                    <div class="flex justify-end gap-3 pt-4 shrink-0 border-t border-slate-100 mt-2">
                        <button type="button" id="btn-cancel-edit-uc" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 px-6 rounded-lg transition text-sm md:text-base">Cancelar</button>
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition shadow-sm text-sm md:text-base">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal de Ajuda - Carga em Lote de UCs -->
        <div id="modal-help-lote-ucs" class="hidden fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative fade-in text-slate-700 text-sm mx-4 max-h-[90vh] overflow-y-auto">
                <button type="button" id="btn-close-help-ucs" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-lg focus:outline-none">✕</button>
                <h3 class="font-bold text-base text-slate-800 mb-4">Instruções para Carga de UCs (CSV)</h3>
                
                <p class="text-slate-600 mb-3">Clique em <strong class="text-blue-600">📥 Modelo CSV</strong> para baixar um arquivo pronto com o cabeçalho correto. O sistema exige a primeira linha de cabeçalho idêntica ao modelo.</p>

                <ul class="list-disc list-inside text-slate-600 mb-4 space-y-1">
                    <li><strong>referencia:</strong> Obrigatório (Ex: UC-1, 2, UC-03)</li>
                    <li><strong>titulo:</strong> Obrigatório (Nome da Unidade)</li>
                    <li><strong>carga_horaria:</strong> Obrigatório (Apenas números)</li>
                    <li><strong>indicadores:</strong> Opcional</li>
                    <li><strong>conhecimentos:</strong> Opcional</li>
                </ul>

                <div class="mb-3">
                    <span class="font-semibold text-slate-700 block mb-1">Exemplo Visual da Planilha:</span>
                    <pre class="bg-slate-100 p-3 rounded-lg text-xs font-mono text-slate-800 overflow-x-auto border border-slate-200">referencia;titulo;carga_horaria;indicadores;conhecimentos
UC-1;Lógica de Programação;108;Ind 1, Ind 2;Conh 1, Conh 2
UC-2;Banco de Dados;60;;
3;Desenvolvimento Web;120;Analisa Requisitos;</pre>
                </div>
                
                <p class="text-xs text-slate-500 mt-4 bg-blue-50 p-2 rounded-lg border border-blue-100">
                    <span class="font-bold text-blue-700">Nota inteligente:</span> Se uma UC com a mesma referência já existir no curso selecionado, a linha será ignorada para evitar duplicidade.
                </p>
            </div>
        </div>
        `;
    }
};