// views_calendario.js - Interface Visual da View Calendário e Exceções
window.ViewsCalendario = {
    renderizar() {
        const anoAtual = new Date().getFullYear();
        const optionsAno = [0, 1, 2, 3].map(offset => {
            const ano = anoAtual + offset;
            return `<option value="${ano}">${ano}</option>`;
        }).join('');

        return `
        <div class="px-2 md:px-8 pt-4 pb-6 fade-in flex-1 overflow-hidden flex flex-col w-full relative">
            
            <h1 class="text-xl font-bold mb-3 text-slate-800 w-full lg:w-[90%] mx-auto shrink-0 px-2 md:px-0">Calendário e Exceções</h1>
            
            <div class="flex border-b border-slate-200 mb-4 gap-4 lg:gap-6 w-full lg:w-[90%] mx-auto overflow-x-auto shrink-0 px-2 md:px-0">
                <button class="tab-btn active font-bold text-blue-600 border-b-2 border-blue-600 pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-listar-calendario">Listar Exceções</button>
                <button class="tab-btn font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-add-calendario">Editar Exceções (Cadastros)</button>
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
                                            <div id="modal-filter-cal-data" class="hidden absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-52 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Pesquisar Data (DD/MM)</p>
                                                <div class="space-y-2">
                                                    <input type="text" id="popover-input-cal-data" placeholder="Ex: 01/05" class="w-full border border-slate-300 p-2 rounded-lg outline-none focus:border-blue-500">
                                                    <button id="apply-filter-cal-data" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Pesquisar</button>
                                                </div>
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
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-semibold"><input type="checkbox" value="Todos" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Todos</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Segunda-feira" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Segunda-feira</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Terça-feira" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Terça-feira</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Quarta-feira" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Quarta-feira</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Quinta-feira" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Quinta-feira</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Sexta-feira" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Sexta-feira</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Sábado" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Sábado</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Domingo" class="popover-dia-cal-chk w-4 h-4 text-blue-600 rounded" checked> Domingo</label>
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

            <!-- CONTEÚDO: ABA ADD -->
            <div id="tab-add-calendario" class="tab-content hidden flex-1 min-h-0 overflow-y-auto pb-6 px-2 md:px-0">
                <div class="w-full lg:w-[90%] mx-auto">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-start">
                        
                        <!-- Lado Esquerdo: Auto Gerador e Carga Lote -->
                        <div class="flex flex-col gap-4 lg:gap-6">
                            
                            <!-- Gerador de Calendário Base -->
                            <div class="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col relative h-fit">
                                <h2 class="font-bold mb-4 text-slate-800 text-base md:text-lg">Gerador de Calendário Base (CSV)</h2>
                                <p class="text-xs md:text-sm text-slate-500 mb-4">Gere um arquivo CSV contendo os feriados nacionais, estaduais (SP) e municipais (Catanduva) e reuniões pedagógicas para o ano selecionado.</p>
                                <div class="flex gap-2">
                                    <select id="select-ano-gerador" class="w-1/3 border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base cursor-pointer">
                                        ${optionsAno}
                                    </select>
                                    <button type="button" id="btn-gerar-csv-base" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 md:py-3 rounded-lg transition shadow-sm text-sm md:text-base">Gerar e Baixar CSV</button>
                                </div>
                            </div>

                            <!-- Carga em Lote (CSV) -->
                            <div class="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col relative h-fit">
                                <div class="flex items-center justify-between mb-4">
                                    <h2 class="font-bold text-slate-800 text-base md:text-lg">Carga em Lote de Exceções</h2>
                                </div>
                                <p class="text-xs md:text-sm text-slate-500 mb-4">Importe o arquivo CSV gerado (após ajustar datas variáveis como Carnaval) ou um modelo próprio contendo <strong>data</strong>, <strong>excecao</strong> e <strong>descricao</strong>.</p>
                                <div class="space-y-3">
                                    <input type="file" id="arquivo-lote-calendario" accept=".csv" class="block w-full text-sm md:text-base text-slate-500 file:mr-2 md:file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-lg">
                                    <button type="button" id="btn-carregar-lote-calendario" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 md:py-3 rounded-lg transition shadow-sm text-sm md:text-base">Confirmar Processamento</button>
                                </div>
                            </div>

                        </div>

                        <!-- Lado Direito: Adicionar Manualmente -->
                        <div class="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col relative h-fit">
                            <h2 class="font-bold mb-4 text-slate-800 text-base md:text-lg">Adicionar Exceção Manual</h2>
                            <form id="form-calendario" class="space-y-4">
                                <div>
                                    <label class="block text-xs font-semibold text-slate-500 mb-1">Data (DD/MM/AAAA)</label>
                                    <input type="date" id="add-cal-data" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-slate-500 mb-1">Tipo de Exceção</label>
                                    <select id="add-cal-tipo" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base cursor-pointer" required>
                                        <option value="" disabled selected>Selecione...</option>
                                        <option value="Feriado">Feriado</option>
                                        <option value="Ponte">Ponte</option>
                                        <option value="Reunião Pedagógica">Reunião Pedagógica</option>
                                        <option value="Domingo">Domingo</option>
                                        <option value="Cancelamento">Cancelamento (Sem Reposição)</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-slate-500 mb-1">Descrição</label>
                                    <input type="text" id="add-cal-desc" placeholder="Ex: Dia do Professor" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                                </div>
                                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 md:py-3 rounded-lg transition shadow-sm text-sm md:text-base mt-2">Salvar Exceção</button>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
        `;
    }
};