// ./turmas/views_turma_listar.js - Interface Visual de Listagem de Turmas
window.ViewsTurmaListar = {
    renderizar(podeEditar = false) {
        return `
        <div class="px-2 md:px-8 pt-4 pb-6 fade-in flex-1 overflow-hidden flex flex-col w-full relative">
            
            <h1 class="text-xl font-bold mb-3 text-slate-800 w-full lg:w-[90%] mx-auto shrink-0 px-2 md:px-0">Turmas</h1>
            
            <div class="flex border-b border-slate-200 mb-4 gap-4 lg:gap-6 w-full lg:w-[90%] mx-auto overflow-x-auto shrink-0 px-2 md:px-0">
                <button class="tab-btn active font-bold text-blue-600 border-b-2 border-blue-600 pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-listar-turmas">Listar Turmas</button>
                ${podeEditar ? `
                <button class="tab-btn font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-add-turmas">Add Turmas</button>
                ` : ''}
            </div>

            <!-- CONTEÚDO: ABA LISTAR TURMAS -->
            <div id="tab-listar-turmas" class="tab-content flex-1 flex flex-col overflow-hidden min-h-0">
                <div class="w-full lg:w-[90%] mx-auto flex-1 flex flex-col overflow-hidden">
                    <div class="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden relative min-h-[50vh]">
                        <div class="overflow-x-auto overflow-y-auto flex-1 w-full bg-white relative">
                            <table class="w-full text-left border-separate border-spacing-0 table-fixed">
                                <thead class="bg-slate-50 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                                    <tr>
                                        <!-- Coluna Ação -->
                                        <th class="px-1 py-2 md:py-4 md:px-2 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[8%] md:w-[5%] text-center border-b border-slate-200 bg-slate-50/95 backdrop-blur">Ação</th>
                                        
                                        <!-- Coluna Ref / Oferta -->
                                        <th class="px-1 py-2 md:py-4 md:px-3 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[18%] md:w-[15%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Ref/Oferta
                                                <button id="btn-filter-turma-ref" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-turma-ref">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-turma-ref" class="hidden absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-56 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Pesquisar Ref. ou Oferta</p>
                                                <div class="space-y-2">
                                                    <input type="text" id="popover-input-turma-ref" placeholder="Ex: TI-35 ou código SS..." class="w-full border border-slate-300 p-2 rounded-lg outline-none focus:border-blue-500">
                                                    <button id="apply-filter-turma-ref" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Pesquisar</button>
                                                </div>
                                            </div>
                                        </th>

                                        <!-- Coluna Curso / Área -->
                                        <th class="px-1 py-2 md:py-4 md:px-3 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[30%] md:w-[35%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Curso / Área
                                                <button id="btn-filter-turma-area" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-turma-area">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-turma-area" class="hidden absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-60 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Filtrar por Área</p>
                                                <div id="popover-container-turma-areas" class="space-y-1.5 max-h-48 overflow-y-auto pr-1 mb-3">
                                                    <!-- Checkboxes injetados via JS -->
                                                </div>
                                                <button id="apply-filter-turma-area" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                            </div>
                                        </th>

                                        <!-- Coluna Período / Horário -->
                                        <th class="px-1 py-2 md:py-4 md:px-3 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[18%] md:w-[21%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Período
                                                <button id="btn-filter-turma-periodo" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-turma-periodo">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-turma-periodo" class="hidden absolute top-full right-0 md:left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-48 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Selecionar Período</p>
                                                <div class="space-y-1.5 mb-3">
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-semibold"><input type="checkbox" value="Todos" class="popover-periodo-turma-chk w-4 h-4 text-blue-600 rounded" checked> Todos</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="MANHÃ" class="popover-periodo-turma-chk w-4 h-4 text-blue-600 rounded" checked> MANHÃ</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="TARDE" class="popover-periodo-turma-chk w-4 h-4 text-blue-600 rounded" checked> TARDE</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="NOITE" class="popover-periodo-turma-chk w-4 h-4 text-blue-600 rounded" checked> NOITE</label>
                                                </div>
                                                <button id="apply-filter-turma-periodo" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                            </div>
                                        </th>

                                        <!-- Coluna Status -->
                                        <th class="px-1 py-2 md:py-4 md:px-3 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[14%] md:w-[13%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Status
                                                <button id="btn-filter-turma-status" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-turma-status">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-turma-status" class="hidden absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-52 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Selecionar Status</p>
                                                <div class="space-y-1.5 mb-3">
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-semibold"><input type="checkbox" value="Todos" class="popover-status-turma-chk w-4 h-4 text-blue-600 rounded" checked> Todos</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Em Andamento" class="popover-status-turma-chk w-4 h-4 text-blue-600 rounded" checked> Em Andamento</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Não Iniciada" class="popover-status-turma-chk w-4 h-4 text-blue-600 rounded" checked> Não Iniciada</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Concluída" class="popover-status-turma-chk w-4 h-4 text-blue-600 rounded" checked> Concluída</label>
                                                </div>
                                                <button id="apply-filter-turma-status" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                            </div>
                                        </th>

                                        <!-- Coluna Progresso -->
                                        <th class="px-1 py-2 md:py-4 md:px-3 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[12%] md:w-[11%] text-right border-b border-slate-200 bg-slate-50/95 backdrop-blur">
                                            Progresso
                                        </th>
                                    </tr>
                                </thead>
                                <tbody id="tabela-turmas" class="bg-white">
                                    <tr><td colspan="6" class="p-8 text-center text-slate-400 text-sm md:text-base">Carregando Turmas...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CONTEÚDO: ABA ADD TURMAS -->
            ${podeEditar && window.ViewsTurmaFrm ? window.ViewsTurmaFrm.renderizarAbaFrm() : ''}
        </div>

        <!-- MODAIS DE EDIÇÃO DE TURMA E DE UC DA TURMA -->
        ${window.ViewsTurmaFrm ? window.ViewsTurmaFrm.renderizarModais(podeEditar) : ''}
        `;
    }
};