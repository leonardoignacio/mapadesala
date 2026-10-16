// ./turmas/views_turma_frm.js - Formulários e Modais de Cadastro e Edição de Turmas e UCs da Turma
window.ViewsTurmaFrm = {

    renderizarAbaFrm() {
        return `
        <!-- CONTEÚDO: ABA ADD TURMAS -->
        <div id="tab-add-turmas" class="tab-content hidden flex-1 min-h-0 overflow-y-auto pb-6 px-2 md:px-0">
            <div class="w-full lg:w-[90%] mx-auto">
                <form id="form-turma" class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
                    
                    <!-- Coluna Esquerda (Dados Gerais da Turma - 6 colunas) -->
                    <div class="lg:col-span-6 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h2 class="font-bold text-slate-800 text-base md:text-lg border-b border-slate-100 pb-2">Dados da Nova Turma</h2>

                        <!-- Curso Vinculado -->
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Curso *</label>
                            <select id="add-turma-curso" onchange="window.AppTurmaFrm.aoSelecionarCursoNoForm('add')" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base cursor-pointer bg-white" required>
                                <option value="" disabled selected>Selecione o Curso...</option>
                            </select>
                        </div>

                        <!-- Referência, Oferta SS e Área Herdada -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Referência *</label>
                                <input type="text" id="add-turma-ref" placeholder="Ex: TI-35" oninput="this.value = this.value.toUpperCase()" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base font-bold uppercase" required>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Oferta (Código SS) *</label>
                                <input type="text" id="add-turma-oferta" placeholder="Ex: 2026105" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Área (Herdada)</label>
                                <input type="text" id="add-turma-area" placeholder="Selecione o curso..." class="w-full border border-slate-200 bg-slate-50 text-slate-500 p-2 md:p-3 rounded-lg text-sm md:text-base cursor-not-allowed outline-none" readonly>
                            </div>
                        </div>

                        <!-- Datas: D_Inicio e D_Termino (Estimativa) -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Data de Início (D_Inicio) *</label>
                                <input type="date" id="add-turma-dinicio" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Previsão de Término (D_Termino) *</label>
                                <input type="date" id="add-turma-dtermino" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                            </div>
                        </div>

                        <!-- Período, H_Inicio, H_Termino e CH_Encontro -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div class="col-span-2 sm:col-span-1">
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Período *</label>
                                <select id="add-turma-periodo" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base bg-white cursor-pointer" required>
                                    <option value="MANHÃ">MANHÃ</option>
                                    <option value="TARDE">TARDE</option>
                                    <option value="NOITE" selected>NOITE</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">H_Inicio *</label>
                                <input type="time" id="add-turma-hinicio" value="19:00" onchange="window.AppTurmaFrm.atualizarCHEncontroNoForm('add')" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">H_Termino *</label>
                                <input type="time" id="add-turma-htermino" value="22:30" onchange="window.AppTurmaFrm.atualizarCHEncontroNoForm('add')" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label class="block text-xs font-semibold text-slate-500 mb-1">CH_Encontro</label>
                                <input type="text" id="add-turma-chencontro" value="3,5h" class="w-full border border-slate-200 bg-blue-50/60 text-blue-700 font-extrabold p-2 md:p-3 rounded-lg text-sm md:text-base text-center cursor-not-allowed outline-none" readonly>
                            </div>
                        </div>

                        <!-- Status da Turma e Progresso_Turma -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Status da Turma *</label>
                                <select id="add-turma-status" class="w-full border border-slate-300 p-2 md:p-3 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base bg-white cursor-pointer" required>
                                    <option value="Não Iniciada" selected>Não Iniciada</option>
                                    <option value="Em Andamento">Em Andamento</option>
                                    <option value="Concluída">Concluída</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Progresso_Turma (% CH Curso)</label>
                                <input type="text" id="add-turma-progresso-preview" value="0% (Calculado via UCs)" class="w-full border border-slate-200 bg-slate-50 text-slate-500 font-bold p-2 md:p-3 rounded-lg text-sm md:text-base cursor-not-allowed outline-none" readonly>
                            </div>
                        </div>

                        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 md:py-3 rounded-lg transition shadow-sm text-sm md:text-base mt-2">
                            Salvar Turma
                        </button>
                    </div>

                    <!-- Coluna Direita (UCs herdadas do Curso para preenchimento opcional de N_Aula e Status - 6 colunas) -->
                    <div class="lg:col-span-6 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                            <div>
                                <h2 class="font-bold text-slate-800 text-base md:text-lg">UCs Vinculadas ao Curso</h2>
                                <p class="text-xs text-slate-500">Defina o código <strong>N_Aula</strong> e o <strong>Status</strong> inicial de cada UC (você também poderá editá-los depois).</p>
                            </div>
                        </div>

                        <div id="container-add-turma-ucs" class="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                            <p class="text-sm text-slate-400 text-center py-8">Selecione um curso ao lado para carregar suas Unidades Curriculares.</p>
                        </div>
                    </div>

                </form>
            </div>
        </div>
        `;
    },

    renderizarModais(podeEditar = false) {
        return `
        <!-- MODAIS DO MÓDULO DE TURMAS (Fecham exclusivamente no 'X' ou em 'Cancelar') -->

        ${podeEditar ? `
        <!-- Modal Editar Dados Gerais da Turma -->
        <div id="modal-edit-turma" class="hidden fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-5 md:p-8 relative fade-in max-h-[92vh] flex flex-col border border-slate-200">
                <button type="button" id="btn-close-modal-edit-turma" class="absolute top-4 right-4 md:top-6 md:right-6 text-slate-400 hover:text-slate-700 font-bold text-xl focus:outline-none">✕</button>
                <h3 class="font-extrabold text-lg md:text-xl text-slate-800 mb-4 shrink-0">Editar Turma</h3>

                <form id="form-edit-turma" class="space-y-4 overflow-y-auto pr-1 flex-1">
                    <input type="hidden" id="edit-turma-id">

                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Curso Vinculado *</label>
                        <select id="edit-turma-curso" onchange="window.AppTurmaFrm.aoSelecionarCursoNoForm('edit')" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm bg-white cursor-pointer" required>
                        </select>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Referência *</label>
                            <input type="text" id="edit-turma-ref" oninput="this.value = this.value.toUpperCase()" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm font-bold uppercase" required>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Oferta (Código SS) *</label>
                            <input type="text" id="edit-turma-oferta" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm" required>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Área (Herdada)</label>
                            <input type="text" id="edit-turma-area" class="w-full border border-slate-200 bg-slate-50 text-slate-500 p-2.5 rounded-lg text-sm cursor-not-allowed outline-none" readonly>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Data de Início (D_Inicio) *</label>
                            <input type="date" id="edit-turma-dinicio" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm" required>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Previsão de Término (D_Termino) *</label>
                            <input type="date" id="edit-turma-dtermino" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm" required>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div class="col-span-2 sm:col-span-1">
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Período *</label>
                            <select id="edit-turma-periodo" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm bg-white cursor-pointer" required>
                                <option value="MANHÃ">MANHÃ</option>
                                <option value="TARDE">TARDE</option>
                                <option value="NOITE">NOITE</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">H_Inicio *</label>
                            <input type="time" id="edit-turma-hinicio" onchange="window.AppTurmaFrm.atualizarCHEncontroNoForm('edit')" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm" required>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">H_Termino *</label>
                            <input type="time" id="edit-turma-htermino" onchange="window.AppTurmaFrm.atualizarCHEncontroNoForm('edit')" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm" required>
                        </div>
                        <div class="col-span-2 sm:col-span-1">
                            <label class="block text-xs font-semibold text-slate-500 mb-1">CH_Encontro</label>
                            <input type="text" id="edit-turma-chencontro" class="w-full border border-slate-200 bg-blue-50/60 text-blue-700 font-extrabold p-2.5 rounded-lg text-sm text-center cursor-not-allowed outline-none" readonly>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Status da Turma *</label>
                        <select id="edit-turma-status" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm bg-white cursor-pointer" required>
                            <option value="Não Iniciada">Não Iniciada</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Concluída">Concluída</option>
                        </select>
                    </div>

                    <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                        <button type="button" id="btn-cancel-modal-edit-turma" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-5 rounded-lg transition text-sm">Cancelar</button>
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-sm text-sm">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
        ` : ''}

        <!-- Modal de Detalhes e Gestão da UC dentro da Turma (N_Aula, Status, Horas Ministradas e Progresso) -->
        <div id="modal-edit-turma-uc" class="hidden fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-5 md:p-8 relative fade-in max-h-[92vh] flex flex-col border border-slate-200">
                <button type="button" id="btn-close-modal-turma-uc" class="absolute top-4 right-4 md:top-6 md:right-6 text-slate-400 hover:text-slate-700 font-bold text-xl focus:outline-none">✕</button>
                <h3 class="font-extrabold text-lg md:text-xl text-slate-800 mb-1 shrink-0">
                    ${podeEditar ? 'Gerenciar UC da Turma' : 'Detalhes da UC na Turma (Somente Leitura)'}
                </h3>
                <p id="subtitulo-modal-turma-uc" class="text-xs text-slate-500 mb-4 shrink-0"></p>

                <form id="form-edit-turma-uc" class="space-y-4 overflow-y-auto pr-1 flex-1">
                    <input type="hidden" id="turma-uc-id-turma">
                    <input type="hidden" id="turma-uc-idx">

                    <!-- Cabeçalho de Identificação da UC -->
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                        <div>
                            <span id="turma-uc-ref-badge" class="text-xs font-extrabold text-blue-600 uppercase"></span>
                            <h4 id="turma-uc-titulo-texto" class="text-sm md:text-base font-bold text-slate-800"></h4>
                        </div>
                        <span id="turma-uc-ch-badge" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-extrabold text-slate-700 shrink-0"></span>
                    </div>

                    <!-- Campos Específicos da UC na Turma: N_Aula, Status, Horas Ministradas e Progresso -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">N_Aula (Código de Aula)</label>
                            <input type="text" id="turma-uc-naula" placeholder="Ex: 109887" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm font-bold ${!podeEditar ? 'bg-slate-50 text-slate-600' : ''}" ${!podeEditar ? 'readonly' : ''}>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Status da UC *</label>
                            <select id="turma-uc-status" onchange="window.AppTurmaFrm.aoMudarStatusUCNoModal()" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm bg-white cursor-pointer font-semibold" ${!podeEditar ? 'disabled' : 'required'}>
                                <option value="Não Iniciada">Não Iniciada</option>
                                <option value="Em Andamento">Em Andamento</option>
                                <option value="Concluída">Concluída</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Horas de Aulas Ministradas (h)</label>
                            <input type="number" step="0.5" min="0" id="turma-uc-horas" oninput="window.AppTurmaFrm.aoDigitarHorasUCNoModal()" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm font-bold ${!podeEditar ? 'bg-slate-50 text-slate-600' : ''}" ${!podeEditar ? 'readonly' : ''}>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Progresso Calculado (%)</label>
                            <input type="text" id="turma-uc-progresso" class="w-full border border-slate-200 bg-blue-50/60 text-blue-700 font-extrabold p-2.5 rounded-lg text-sm text-center cursor-not-allowed outline-none" readonly>
                        </div>
                    </div>

                    <!-- Atributos Pedagógicos Herdadas da UC (Indicadores e Conhecimentos) -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Indicadores da UC</label>
                        <textarea id="turma-uc-indicadores" rows="3" class="w-full border border-slate-200 bg-slate-50 text-slate-600 p-2.5 rounded-lg text-xs md:text-sm resize-y outline-none" readonly></textarea>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Conhecimentos da UC</label>
                        <textarea id="turma-uc-conhecimentos" rows="3" class="w-full border border-slate-200 bg-slate-50 text-slate-600 p-2.5 rounded-lg text-xs md:text-sm resize-y outline-none" readonly></textarea>
                    </div>

                    <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                        <button type="button" id="btn-cancel-modal-turma-uc" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-5 rounded-lg transition text-sm">
                            ${podeEditar ? 'Cancelar' : 'Fechar'}
                        </button>
                        ${podeEditar ? `
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-sm text-sm">Salvar UC da Turma</button>
                        ` : ''}
                    </div>
                </form>
            </div>
        </div>
        `;
    }
};