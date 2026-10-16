// ./cursos/views_curso_listar.js - Interface Visual de Listagem de Cursos e UCs
window.ViewsCursoListar = {
    renderizar(podeEditar = false) {
        return `
        <div class="px-2 md:px-8 pt-4 pb-6 fade-in flex-1 overflow-hidden flex flex-col w-full relative">
            
            <h1 class="text-xl font-bold mb-3 text-slate-800 w-full lg:w-[90%] mx-auto shrink-0 px-2 md:px-0">Cursos e UCs</h1>
            
            <div class="flex border-b border-slate-200 mb-4 gap-4 lg:gap-6 w-full lg:w-[90%] mx-auto overflow-x-auto shrink-0 px-2 md:px-0">
                <button class="tab-btn active font-bold text-blue-600 border-b-2 border-blue-600 pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-listar-cursos">Listar Cursos/UCs</button>
                ${podeEditar ? `
                <button class="tab-btn font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-add-cursos">Add Cursos/UCs</button>
                ` : ''}
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

                                        <!-- Coluna Área (Checkboxes) -->
                                        <th class="px-1 py-2 md:py-4 md:px-4 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[18%] md:w-[20%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Área 
                                                <button id="btn-filter-curso-area" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-curso-area">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-curso-area" class="hidden absolute top-full right-0 md:left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-56 md:w-64 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Selecionar Área</p>
                                                <div id="popover-container-areas" class="space-y-1.5 max-h-48 overflow-y-auto pr-1 mb-3">
                                                    <!-- Checkboxes injetados dinamicamente via JS -->
                                                </div>
                                                <button id="apply-filter-curso-area" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                            </div>
                                        </th>

                                        <!-- Coluna Tipo (Checkboxes) -->
                                        <th class="px-1 py-2 md:py-4 md:px-4 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[14%] md:w-[13%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Tipo 
                                                <button id="btn-filter-curso-tipo" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-curso-tipo">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-curso-tipo" class="hidden absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-52 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Selecionar Tipo</p>
                                                <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1 mb-3">
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-semibold"><input type="checkbox" value="Todos" class="popover-tipo-curso-chk w-4 h-4 text-blue-600 rounded" checked> Todos</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Técnico" class="popover-tipo-curso-chk w-4 h-4 text-blue-600 rounded" checked> Técnico</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Livre" class="popover-tipo-curso-chk w-4 h-4 text-blue-600 rounded" checked> Livre</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Aprendizagem" class="popover-tipo-curso-chk w-4 h-4 text-blue-600 rounded" checked> Aprendizagem</label>
                                                </div>
                                                <button id="apply-filter-curso-tipo" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
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

            <!-- CONTEÚDO: ABA ADD (Renderizada apenas para perfis com permissão de edição) -->
            ${podeEditar && window.ViewsCursoFrm ? window.ViewsCursoFrm.renderizarAbaFrm() : ''}
        </div>

        <!-- MODAIS DE CURSOS E UCs -->
        ${window.ViewsCursoFrm ? window.ViewsCursoFrm.renderizarModais(podeEditar) : ''}
        `;
    }
};