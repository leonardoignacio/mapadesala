// ./calendario/views_calendario_frms.js - Formulários de Cadastro e Carga em Lote de Exceções do Calendário
window.ViewsCalendarioFrms = {
    renderizarAbaFrms() {
        const anoAtual = new Date().getFullYear();
        const optionsAno = [0, 1, 2, 3].map(offset => {
            const ano = anoAtual + offset;
            return `<option value="${ano}">${ano}</option>`;
        }).join('');

        return `
        <!-- CONTEÚDO: ABA ADD -->
        <div id="tab-add-calendario" class="tab-content hidden flex-1 min-h-0 overflow-y-auto pb-6 px-2 md:px-0">
            <div class="w-full lg:w-[90%] mx-auto">
                <div class="grid grid-cols-1 gap-4 lg:gap-6 items-start">
                    
                        <!-- Carga em Lote (CSV) -->
                        <div class="bg-white p-4 md:p-6 my-4 rounded-xl border border-slate-200 shadow-sm flex flex-col relative h-fit">
                            <!-- Lado Esquerdo: Auto Gerador e Carga Lote -->
                    <div class="flex flex-col gap-4 lg:gap-6">
                        
                        <!-- Gerador de Calendário Base -->
                        <div class="flex w-full items-center gap-4">
                            <input  id="select-ano-gerador"  list="lista-anos-gerador"  type="text"  value="${new Date().getFullYear()}"  onfocus="this.value = ''"  onblur="if (this.value.trim() === '') this.value = new Date().getFullYear()"  class="flex-1 min-w-0 border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base cursor-pointer">

                            <datalist id="lista-anos-gerador">
                                ${optionsAno}
                            </datalist>
                            <button type="button"   id="btn-gerar-csv-base"   class="flex-1 min-w-0 bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 md:py-3 rounded-lg transition shadow-sm text-sm md:text-base">Baixar CSV</button>
                        </div>
                        </div> 
                        
                        <div class="flex items-center justify-between mb-4">
                                <h2 class="font-bold text-slate-800 text-base md:text-lg">Carga em Lote de Exceções</h2>
                            </div>
                            <p class="text-xs md:text-sm text-slate-500 mb-4">Importe o arquivo CSV gerado (após ajustar datas variáveis como Carnaval) ou um modelo próprio contendo <strong>data</strong>, <strong>excecao</strong> e <strong>descricao</strong>.</p>
                            <div class="space-y-3">
                              <div class="flex w-full items-center gap-4">
                                    <input
                                        type="file"
                                        id="arquivo-lote-calendario"
                                        accept=".csv"
                                        class="flex-1 min-w-0 w-0 text-sm md:text-base text-slate-500 file:mr-2 md:file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-lg"
                                    >

                                    <button
                                        type="button"
                                        id="btn-carregar-lote-calendario"
                                        class="flex-1 min-w-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 md:py-3 rounded-lg transition shadow-sm text-sm md:text-base"
                                    >
                                        Confirmar Processamento
                                    </button>
                                </div>
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
        `;
    }
};