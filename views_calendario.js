// views_calendario.js - Interface Visual da View Calendário e Exceções
window.ViewsCalendario = {
    renderizar() {
        return `
        <div class="px-4 md:px-8 pt-4 pb-6 fade-in flex-1 overflow-hidden flex flex-col w-full">
            <h1 class="text-xl font-bold mb-3 text-slate-800 w-full lg:w-[90%] mx-auto">Calendário e Exceções</h1>
            
            <div class="flex border-b border-slate-200 mb-4 gap-4 lg:gap-6 w-full lg:w-[90%] mx-auto overflow-x-auto">
                <button class="tab-btn active font-bold text-blue-600 border-b-2 border-blue-600 pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-listar">Listar Exceções</button>
                <button class="tab-btn font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-editar">Editar Exceções (Cadastros)</button>
            </div>

            <!-- CONTEÚDO: ABA LISTAR -->
            <div id="tab-listar" class="tab-content flex-1 flex flex-col overflow-hidden">
                <div class="w-full lg:w-[90%] mx-auto flex-1 flex flex-col overflow-hidden">
                    <div class="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden relative min-h-[75vh]">
                        <div class="overflow-x-auto overflow-y-auto flex-1 w-full bg-white relative">
                            <table class="w-full text-left border-separate border-spacing-0 table-fixed min-w-[700px]">
                                <thead class="bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                                    <tr>
                                        <th class="p-2 md:py-3 md:px-2 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider w-[12%] md:w-[7%] text-center bg-slate-100 border-b border-slate-200">Ação</th>
                                        
                                        <th class="p-2 md:py-3 md:px-4 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider w-[22%] md:w-[15%] bg-slate-100 border-b border-slate-200 relative">
                                            <div class="flex items-center justify-between">
                                                <span>Data</span>
                                                <button id="btn-filter-data" class="text-slate-400 hover:text-blue-600 p-1 rounded transition focus:outline-none" title="Filtrar Data"><span id="icon-filter-data">🔎</span></button>
                                            </div>
                                            <div id="modal-filter-data" class="hidden absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-56 md:w-64 text-sm font-normal text-slate-700">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Filtrar por Mês/Ano</p>
                                                <div class="space-y-2">
                                                    <select id="popover-mes" class="w-full border border-slate-300 p-2 rounded-lg text-sm bg-white outline-none focus:border-blue-500">
                                                        <option value="">Todos os Meses</option>
                                                        <option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option><option value="04">Abril</option>
                                                        <option value="05">Maio</option><option value="06">Junho</option><option value="07">Julho</option><option value="08">Agosto</option>
                                                        <option value="09">Setembro</option><option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
                                                    </select>
                                                    <select id="popover-ano" class="w-full border border-slate-300 p-2 rounded-lg text-sm bg-white outline-none focus:border-blue-500">
                                                        <option value="">Todos os Anos</option>
                                                    </select>
                                                    <button id="apply-filter-data" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                                </div>
                                            </div>
                                        </th>

                                        <th class="p-2 md:py-3 md:px-4 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider w-[25%] md:w-[20%] bg-slate-100 border-b border-slate-200 relative">
                                            <div class="flex items-center justify-between">
                                                <span>Dia da Semana</span>
                                                <button id="btn-filter-dia" class="text-slate-400 hover:text-blue-600 p-1 rounded transition focus:outline-none" title="Filtrar Dia da Semana"><span id="icon-filter-dia">🔎</span></button>
                                            </div>
                                            <div id="modal-filter-dia" class="hidden absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-56 md:w-60 text-sm font-normal text-slate-700">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Selecionar Dias</p>
                                                <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Domingo" class="popover-dia-chk w-4 h-4 text-blue-600 rounded"> Domingo</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Segunda-feira" class="popover-dia-chk w-4 h-4 text-blue-600 rounded" checked> Segunda</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Terça-feira" class="popover-dia-chk w-4 h-4 text-blue-600 rounded" checked> Terça</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Quarta-feira" class="popover-dia-chk w-4 h-4 text-blue-600 rounded" checked> Quarta</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Quinta-feira" class="popover-dia-chk w-4 h-4 text-blue-600 rounded" checked> Quinta</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Sexta-feira" class="popover-dia-chk w-4 h-4 text-blue-600 rounded" checked> Sexta</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Sábado" class="popover-dia-chk w-4 h-4 text-blue-600 rounded" checked> Sábado</label>
                                                </div>
                                                <button id="apply-filter-dia" class="w-full mt-3 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                            </div>
                                        </th>

                                        <th class="p-2 md:py-3 md:px-4 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider w-[18%] md:w-[15%] bg-slate-100 border-b border-slate-200 relative">
                                            <div class="flex items-center justify-between">
                                                <span>Tipo</span>
                                                <button id="btn-filter-tipo" class="text-slate-400 hover:text-blue-600 p-1 rounded transition focus:outline-none" title="Filtrar Tipo"><span id="icon-filter-tipo">🔎</span></button>
                                            </div>
                                            <div id="modal-filter-tipo" class="hidden absolute top-full right-0 md:left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-52 text-sm font-normal text-slate-700">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Selecionar Tipos</p>
                                                <div class="space-y-1.5">
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Feriado" class="popover-tipo-chk w-4 h-4 text-blue-600 rounded"> Feriado</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Ponte" class="popover-tipo-chk w-4 h-4 text-blue-600 rounded"> Ponte</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Domingo" class="popover-tipo-chk w-4 h-4 text-blue-600 rounded"> Domingo</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Reunião Pedagógica" class="popover-tipo-chk w-4 h-4 text-blue-600 rounded"> Reunião P.</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="Cancelamento" class="popover-tipo-chk w-4 h-4 text-blue-600 rounded"> Cancela.</label>
                                                </div>
                                                <button id="apply-filter-tipo" class="w-full mt-3 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                            </div>
                                        </th>

                                        <th class="p-2 md:py-3 md:px-4 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider w-[23%] md:w-[43%] bg-slate-100 border-b border-slate-200 relative">
                                            <div class="flex items-center justify-between">
                                                <span>Descrição</span>
                                                <button id="btn-filter-desc" class="text-slate-400 hover:text-blue-600 p-1 rounded transition focus:outline-none" title="Filtrar Descrição"><span id="icon-filter-desc">🔎</span></button>
                                            </div>
                                            <div id="modal-filter-desc" class="hidden absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-56 md:w-64 text-sm font-normal text-slate-700">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Pesquisar por Descrição</p>
                                                <div class="space-y-2">
                                                    <input type="text" id="popover-input-desc" placeholder="Ex: Natal, Páscoa..." class="w-full border border-slate-300 p-2 rounded-lg outline-none focus:border-blue-500">
                                                    <button id="apply-filter-desc" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Pesquisar</button>
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody id="tabela-excecoes" class="divide-y divide-slate-100">
                                    <tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Carregando dados...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CONTEÚDO: ABA EDITAR -->
            <div id="tab-editar" class="tab-content hidden space-y-6 overflow-y-auto pb-6">
                <div class="w-full lg:w-[90%] mx-auto space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                        <div class="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                            <h2 class="font-bold mb-2 text-slate-800 text-base md:text-lg">Exportar Domingos</h2>
                            <p class="text-sm md:text-base text-slate-500 mb-4">Gere e baixe arquivos para o ano letivo.</p>
                            <div class="flex flex-col gap-3 mt-auto">
                                <input type="number" id="ano-domingos" placeholder="Ex: 2027" class="border border-slate-300 rounded-lg px-4 py-2 w-full outline-none focus:border-blue-500 transition text-sm md:text-base">
                                <div class="flex gap-2">
                                    <button id="btn-baixar-domingos" class="flex-1 bg-slate-800 text-white px-2 md:px-4 py-2 rounded-lg font-bold hover:bg-slate-900 transition shadow-sm text-xs md:text-sm whitespace-nowrap">Baixar JSON</button>
                                    <button id="btn-baixar-domingos-csv" class="flex-1 bg-emerald-700 text-white px-2 md:px-4 py-2 rounded-lg font-bold hover:bg-emerald-800 transition shadow-sm text-xs md:text-sm whitespace-nowrap">Baixar CSV</button>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                            <h2 class="font-bold mb-4 text-slate-800 text-base md:text-lg">Cadastro Manual Único</h2>
                            <form id="form-excecao" class="space-y-3 md:space-y-4">
                                <input type="date" id="exc-data" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                                <select id="exc-tipo" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base cursor-pointer" required>
                                    <option value="Feriado">Feriado (Gera pontes automáticas)</option>
                                    <option value="Reunião Pedagógica">Reunião Pedagógica</option>
                                    <option value="Cancelamento">Cancelamento (Outros)</option>
                                </select>
                                <input type="text" id="exc-desc" placeholder="Descrição curta..." class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 md:py-3 rounded-lg transition shadow-sm text-sm md:text-base">Salvar Exceção</button>
                            </form>
                        </div>
                    </div>

                    <div class="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
                        <div class="flex items-center gap-2 mb-2">
                            <h2 class="font-bold text-slate-800 text-base md:text-lg">Carga em Lote (Importar JSON ou CSV)</h2>
                            <button id="btn-help-lote" class="w-5 h-5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full text-xs font-bold inline-flex items-center justify-center cursor-pointer transition shadow-sm" title="Ajuda sobre a estrutura do arquivo">?</button>
                        </div>
                        <p class="text-sm md:text-base text-slate-500 mb-4 md:mb-6">Importe arquivos estruturados (.json ou .csv). O sistema converte automaticamente e ignora duplicadas.</p>
                        <div class="flex flex-col md:flex-row gap-4 items-center">
                            <div class="flex-1 w-full relative">
                                <input type="file" id="arquivo-json" accept=".json, .csv" class="block w-full text-sm md:text-base text-slate-500 file:mr-2 md:file:mr-4 file:py-2 md:file:py-3 file:px-4 md:file:px-6 file:rounded-lg file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg">
                            </div>
                            <button id="btn-carregar-json" class="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold whitespace-nowrap transition shadow-sm text-sm md:text-base">
                                Confirmar Processamento
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Ajuda - Carga em Lote -->
        <div id="modal-help-lote" class="hidden fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative fade-in text-slate-700 text-sm mx-4">
                <button id="btn-close-help" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-lg focus:outline-none">✕</button>
                <h3 class="font-bold text-base text-slate-800 mb-3">Instruções de Importação em Lote</h3>
                <p class="text-slate-600 mb-3">O sistema aceita arquivos nos formatos <strong>.csv</strong> e <strong>.json</strong>. Veja abaixo a estrutura esperada:</p>
                
                <div class="mb-3">
                    <span class="font-semibold text-slate-700 block mb-1">Formato CSV (Separado por ponto e vírgula ou vírgula):</span>
                    <pre class="bg-slate-100 p-2.5 rounded-lg text-xs font-mono text-slate-800 overflow-x-auto">data;excecao;descricao\n2026-01-01;Feriado;Confraternização Universal\n01/05/2026;Feriado;Dia do Trabalho</pre>
                </div>

                <div class="mb-4">
                    <span class="font-semibold text-slate-700 block mb-1">Formato JSON (Array de objetos):</span>
                    <pre class="bg-slate-100 p-2.5 rounded-lg text-xs font-mono text-slate-800 overflow-x-auto">[\n  {\n    "data": "2026-01-01",\n    "excecao": "Feriado",\n    "descricao": "Confraternização Universal"\n  }\n]</pre>
                </div>
                
                <p class="text-xs text-slate-500">Nota: O campo <strong>excecao</strong> aceita valores como Feriado, Reunião Pedagógica ou Cancelamento. Datas duplicadas são ignoradas automaticamente.</p>
            </div>
        </div>
        `;
    }
};