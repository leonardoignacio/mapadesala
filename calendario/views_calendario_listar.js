// ./calendario/views_calendario_listar.js - Interface Visual de Listagem do Calendário e Exceções
window.ViewsCalendarioListar = {
    renderizar(podeEditar = false) {
        const anoAtual = new Date().getFullYear();
        const optionsAno = [0, 1, 2, 3].map(offset => {
            const ano = anoAtual + offset;
            return `<option value="${ano}">${ano}</option>`;
        }).join('');

        const mesesNomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const chkMesesHtml = mesesNomes.map((m, i) => {
            const val = String(i + 1).padStart(2, '0');
            return `<label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-medium text-slate-700"><input type="checkbox" value="${val}" class="popover-mes-cal-chk w-4 h-4 text-blue-600 rounded" checked> ${m}</label>`;
        }).join('');

        return `
        <div class="px-2 md:px-8 pt-4 pb-6 fade-in flex-1 overflow-hidden flex flex-col w-full relative">
            
            <h1 class="text-xl font-bold mb-3 text-slate-800 w-full lg:w-[90%] mx-auto shrink-0 px-2 md:px-0">Calendário e Exceções</h1>
            
            <div class="flex border-b border-slate-200 mb-4 gap-4 lg:gap-6 w-full lg:w-[90%] mx-auto overflow-x-auto shrink-0 px-2 md:px-0">
                <button class="tab-btn active font-bold text-blue-600 border-b-2 border-blue-600 pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-listar-calendario">Listar Exceções</button>
                ${podeEditar ? `
                <button class="tab-btn font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-add-calendario">Editar Exceções (Cadastros)</button>
                ` : ''}
            </div>

            <!-- CONTEÚDO: ABA LISTAR -->
            <div id="tab-listar-calendario" class="tab-content flex-1 flex flex-col overflow-hidden min-h-0">
                <div class="w-full lg:w-[90%] mx-auto flex-1 flex flex-col overflow-hidden">
                    <div class="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden relative min-h-[50vh]">
                        <div class="overflow-x-auto overflow-y-auto flex-1 w-full bg-white relative">
                            <table class="w-full text-left border-separate border-spacing-0 table-fixed">
                                <thead class="bg-slate-50 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                                    <tr>
                                        <!-- Coluna Ação -->
                                        <th class="px-1 py-2 md:py-4 md:px-2 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[10%] md:w-[7%] text-center border-b border-slate-200 bg-slate-50/95 backdrop-blur">Ação</th>
                                        
                                        <!-- Coluna DATA -->
                                        <th class="px-1 py-2 md:py-4 md:px-3 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[22%] md:w-[15%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Data 
                                                <button id="btn-filter-cal-data" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-cal-data">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-cal-data" class="hidden absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-56 md:w-64 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Filtrar por Mês e Ano</p>
                                                <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1 mb-3">
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-bold text-slate-700"><input type="checkbox" value="Todos" class="popover-mes-cal-chk w-4 h-4 text-blue-600 rounded" checked> Todos</label>
                                                    ${chkMesesHtml}
                                                </div>
                                                <div class="mb-3 border-t border-slate-100 pt-3">
                                                    <label class="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Ano</label>
                                                    <select id="popover-select-cal-ano" class="w-full border border-slate-300 p-2 rounded-lg bg-white outline-none focus:border-blue-500 cursor-pointer text-slate-700 font-semibold">
                                                        ${optionsAno}
                                                    </select>
                                                </div>
                                                <button id="apply-filter-cal-data" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                            </div>
                                        </th>

                                        <!-- Coluna DIA DA SEMANA -->
                                        <th class="px-1 py-2 md:py-4 md:px-3 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[22%] md:w-[15%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Dia da Semana 
                                                <button id="btn-filter-cal-dia" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-cal-dia">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-cal-dia" class="hidden absolute top-full left-0 md:left-auto md:right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-52 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Filtrar Dia</p>
                                                <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1 mb-3">
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-semibold text-slate-700"><input type="checkbox" value="Todos" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Todos</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-medium text-slate-700"><input type="checkbox" value="Segunda-feira" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Segunda-feira</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-medium text-slate-700"><input type="checkbox" value="Terça-feira" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Terça-feira</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-medium text-slate-700"><input type="checkbox" value="Quarta-feira" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Quarta-feira</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-medium text-slate-700"><input type="checkbox" value="Quinta-feira" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Quinta-feira</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-medium text-slate-700"><input type="checkbox" value="Sexta-feira" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Sexta-feira</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-medium text-slate-700"><input type="checkbox" value="Sábado" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Sábado</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-medium text-slate-700"><input type="checkbox" value="Domingo" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Domingo</label>
                                                </div>
                                                <button id="apply-filter-cal-dia" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                            </div>
                                        </th>

                                        <!-- Coluna TIPO -->
                                        <th class="px-1 py-2 md:py-4 md:px-3 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[16%] md:w-[18%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Tipo 
                                                <button id="btn-filter-cal-tipo" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-cal-tipo">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-cal-tipo" class="hidden absolute top-full left-0 md:left-auto md:right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-52 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Filtrar Tipo</p>
                                                <div id="popover-container-cal-tipos" class="space-y-1.5 max-h-48 overflow-y-auto pr-1 mb-3">
                                                    <!-- Checkboxes injetados dinamicamente via JS -->
                                                </div>
                                                <button id="apply-filter-cal-tipo" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                            </div>
                                        </th>

                                        <!-- Coluna DESCRIÇÃO -->
                                        <th class="px-1 py-2 md:py-4 md:px-4 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[30%] md:w-[45%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Descrição 
                                                <button id="btn-filter-cal-desc" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-cal-desc">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-cal-desc" class="hidden absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-56 md:w-64 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Pesquisar Descrição</p>
                                                <div class="space-y-2">
                                                    <input type="text" id="popover-input-cal-desc" placeholder="Ex: Confraternização..." class="w-full border border-slate-300 p-2 rounded-lg outline-none focus:border-blue-500">
                                                    <button id="apply-filter-cal-desc" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Pesquisar</button>
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody id="tabela-calendario" class="bg-white">
                                    <tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Carregando Calendário...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CONTEÚDO: ABA FORMULÁRIOS (Renderizada apenas se puder editar) -->
            ${podeEditar && window.ViewsCalendarioFrms ? window.ViewsCalendarioFrms.renderizarAbaFrms() : ''}
        </div>
        `;
    }
};