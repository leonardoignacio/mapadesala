// ./admin/views_admin_credenciamento.js - Interface Visual da View Painel Admin (Aba Credenciamento)
window.ViewsAdminCredenciamento = {
    renderizar() {
        return `
        <div class="px-2 md:px-8 pt-4 pb-6 fade-in flex-1 overflow-hidden flex flex-col w-full relative">
            
            <div class="flex flex-col md:flex-row md:items-center justify-between mb-3 w-full lg:w-[90%] mx-auto shrink-0 px-2 md:px-0 gap-2">
                <div>
                    <h1 class="text-xl font-bold text-slate-800">Painel Admin</h1>
                    <p class="text-xs text-slate-500">Gerenciamento de credenciamentos, perfis de acesso e vínculo de áreas</p>
                </div>
                <div id="resumo-credenciamento-badges" class="flex items-center gap-2 flex-wrap">
                    <!-- Contadores dinâmicos preenchidos via JS -->
                </div>
            </div>
            
            <!-- Navegação de Abas do Painel Admin -->
            <div class="flex border-b border-slate-200 mb-4 gap-4 lg:gap-6 w-full lg:w-[90%] mx-auto overflow-x-auto shrink-0 px-2 md:px-0">
                <button class="tab-btn active font-bold text-blue-600 border-b-2 border-blue-600 pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-admin-credenciamento">Credenciamento</button>
            </div>

            <!-- CONTEÚDO: ABA CREDENCIAMENTO -->
            <div id="tab-admin-credenciamento" class="tab-content flex-1 flex flex-col overflow-hidden min-h-0">
                <div class="w-full lg:w-[90%] mx-auto flex-1 flex flex-col overflow-hidden">
                    <div class="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden relative min-h-[50vh]">
                        <div class="overflow-x-auto overflow-y-auto flex-1 w-full bg-white relative">
                            <table class="w-full text-left border-separate border-spacing-0 table-fixed">
                                <thead class="bg-slate-50 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                                    <tr>
                                        <!-- Coluna Ação -->
                                        <th class="px-1 py-2 md:py-4 md:px-2 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[10%] md:w-[7%] text-center border-b border-slate-200 bg-slate-50/95 backdrop-blur">Ação</th>
                                        
                                        <!-- Coluna Status -->
                                        <th class="px-1 py-2 md:py-4 md:px-3 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[16%] md:w-[13%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Status
                                                <button id="btn-filter-cred-status" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-cred-status">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-cred-status" class="hidden absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-52 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Filtrar Status</p>
                                                <div class="space-y-1.5 mb-3">
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-semibold"><input type="checkbox" value="Todos" class="popover-status-cred-chk w-4 h-4 text-blue-600 rounded" checked> Todos</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="pendente" class="popover-status-cred-chk w-4 h-4 text-blue-600 rounded" checked> Pendente</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="ativo" class="popover-status-cred-chk w-4 h-4 text-blue-600 rounded" checked> Ativo</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="bloqueado" class="popover-status-cred-chk w-4 h-4 text-blue-600 rounded" checked> Bloqueado</label>
                                                </div>
                                                <button id="apply-filter-cred-status" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                            </div>
                                        </th>

                                        <!-- Coluna Usuário (Nome e E-mail) -->
                                        <th class="px-1 py-2 md:py-4 md:px-4 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[30%] md:w-[28%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Usuário
                                                <button id="btn-filter-cred-nome" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-cred-nome">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-cred-nome" class="hidden absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-56 md:w-64 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Pesquisar Nome ou E-mail</p>
                                                <div class="space-y-2">
                                                    <input type="text" id="popover-input-cred-nome" placeholder="Digite nome ou e-mail..." class="w-full border border-slate-300 p-2 rounded-lg outline-none focus:border-blue-500">
                                                    <button id="apply-filter-cred-nome" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Pesquisar</button>
                                                </div>
                                            </div>
                                        </th>

                                        <!-- Coluna Perfil / Cargo -->
                                        <th class="px-1 py-2 md:py-4 md:px-3 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[20%] md:w-[18%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Perfil
                                                <button id="btn-filter-cred-cargo" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-cred-cargo">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-cred-cargo" class="hidden absolute top-full right-0 md:left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-52 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Filtrar Perfil</p>
                                                <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1 mb-3">
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-semibold"><input type="checkbox" value="Todos" class="popover-cargo-cred-chk w-4 h-4 text-blue-600 rounded" checked> Todos</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="pendente" class="popover-cargo-cred-chk w-4 h-4 text-blue-600 rounded" checked> Aguardando (Pendente)</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="root" class="popover-cargo-cred-chk w-4 h-4 text-blue-600 rounded" checked> Root</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="admin" class="popover-cargo-cred-chk w-4 h-4 text-blue-600 rounded" checked> Admin</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="tecnico" class="popover-cargo-cred-chk w-4 h-4 text-blue-600 rounded" checked> Técnico de Área</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="docente" class="popover-cargo-cred-chk w-4 h-4 text-blue-600 rounded" checked> Docente</label>
                                                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="apoio" class="popover-cargo-cred-chk w-4 h-4 text-blue-600 rounded" checked> Apoio</label>
                                                </div>
                                                <button id="apply-filter-cred-cargo" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                            </div>
                                        </th>

                                        <!-- Coluna Áreas / Solicitação -->
                                        <th class="px-1 py-2 md:py-4 md:px-4 text-[9px] md:text-[11px] font-extrabold text-slate-500 uppercase tracking-tighter md:tracking-wider w-[24%] md:w-[34%] border-b border-slate-200 bg-slate-50/95 backdrop-blur relative">
                                            <div class="flex items-center justify-between">
                                                <span class="flex items-center gap-0.5 md:gap-1">Áreas / Solicitação
                                                <button id="btn-filter-cred-area" class="text-slate-400 hover:text-blue-600 p-0.5 md:p-1 rounded transition focus:outline-none"><span id="icon-filter-cred-area">🔎</span></button></span>
                                            </div>
                                            <div id="modal-filter-cred-area" class="hidden absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 w-56 md:w-64 text-sm font-normal text-slate-700 popover-modal">
                                                <p class="text-xs font-bold text-slate-500 mb-2">Filtrar por Área Vinculada</p>
                                                <div id="popover-container-cred-areas" class="space-y-1.5 max-h-48 overflow-y-auto pr-1 mb-3">
                                                    <!-- Checkboxes de Áreas injetados via JS -->
                                                </div>
                                                <button id="apply-filter-cred-area" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Aplicar Filtro</button>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody id="tabela-credenciamento" class="bg-white">
                                    <tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Carregando solicitações e usuários...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL DE CREDENCIAMENTO E HABILITAÇÃO DE PERFIL (Fecha apenas no 'X' ou em 'Cancelar') -->
        <div id="modal-credenciar-usuario" class="hidden fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-5 md:p-8 relative fade-in max-h-[92vh] flex flex-col border border-slate-200">
                
                <button type="button" id="btn-close-modal-credenciar" class="absolute top-4 right-4 md:top-6 md:right-6 text-slate-400 hover:text-slate-700 font-bold text-xl focus:outline-none" title="Fechar">✕</button>
                
                <div class="mb-4 shrink-0">
                    <span id="badge-modal-cred-status" class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-1"></span>
                    <h3 class="font-extrabold text-lg md:text-xl text-slate-800">Habilitação e Credenciamento de Usuário</h3>
                    <p class="text-xs text-slate-500">Analise a solicitação do usuário, defina seu perfil de acesso e vincule as áreas correspondentes.</p>
                </div>

                <form id="form-credenciar-usuario" class="space-y-4 overflow-y-auto pr-1 flex-1">
                    <input type="hidden" id="cred-user-email-hidden">

                    <!-- Dados Pessoais e E-mail -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Nome *</label>
                            <input type="text" id="cred-user-nome" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Sobrenome *</label>
                            <input type="text" id="cred-user-sobrenome" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">E-mail</label>
                            <input type="email" id="cred-user-email" class="w-full border border-slate-200 bg-slate-100 text-slate-500 p-2.5 rounded-lg text-sm cursor-not-allowed outline-none" readonly>
                        </div>
                    </div>

                    <!-- Box de Leitura: Solicitação Enviada pelo Usuário no Pré-Cadastro -->
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Solicitação Enviada no Pré-Cadastro</span>
                            <span id="cred-user-cargo-pretendido" class="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md"></span>
                        </div>
                        <p id="cred-user-texto-solicitacao" class="text-xs md:text-sm text-slate-700 italic whitespace-pre-line leading-relaxed"></p>
                    </div>

                    <!-- Seleção de Status e Perfil / Cargo a Habilitar -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Status da Conta *</label>
                            <select id="cred-user-status" onchange="window.AppAdminCredenciamento.aoMudarCargoOuStatusNoModal()" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm bg-white cursor-pointer font-semibold" required>
                                <option value="ativo">✅ Ativo (Credenciado)</option>
                                <option value="pendente">⏳ Pendente (Aguardando Credenciamento)</option>
                                <option value="bloqueado">🚫 Bloqueado (Sem Acesso)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Habilitar com o Perfil *</label>
                            <select id="cred-user-cargo" onchange="window.AppAdminCredenciamento.aoMudarCargoOuStatusNoModal()" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm bg-white cursor-pointer font-bold text-blue-700" required>
                                <!-- Opções populadas dinamicamente conforme autoridade do usuário logado (ROOT, ADMIN ou TÉCNICO) -->
                            </select>
                        </div>
                    </div>

                    <!-- Resumo de Privilégios do Perfil Selecionado -->
                    <div id="cred-info-acumulo-perfis" class="text-xs p-3 rounded-lg border bg-blue-50/60 border-blue-200 text-blue-800">
                        <!-- Texto explicativo atualizado dinamicamente via JS -->
                    </div>

                    <!-- Bloco de Seleção de Áreas (Responsáveis / Atuação / Preferenciais) -->
                    <div id="bloco-selecao-areas-credenciamento" class="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                        <div class="flex items-center justify-between">
                            <div>
                                <label id="label-titulo-areas-cred" class="block text-xs font-extrabold text-slate-700 uppercase">Áreas Vinculadas</label>
                                <p id="subtitulo-areas-cred" class="text-[11px] text-slate-500">Selecione as áreas abaixo:</p>
                            </div>
                            <label class="flex items-center gap-1.5 text-xs font-bold text-blue-600 cursor-pointer hover:underline">
                                <input type="checkbox" id="chk-cred-todas-areas" class="w-4 h-4 text-blue-600 rounded"> Marcar Todas
                            </label>
                        </div>

                        <div id="lista-checkboxes-areas-cred" class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 max-h-44 overflow-y-auto pr-1">
                            <!-- Checkboxes das áreas cadastradas no banco -->
                        </div>
                    </div>

                    <!-- Rodapé do Modal -->
                    <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                        <button type="button" id="btn-cancel-modal-credenciar" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 px-5 rounded-lg transition text-sm">Cancelar</button>
                        <button type="submit" id="btn-salvar-credenciamento" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition shadow-md text-sm">Salvar Credenciamento</button>
                    </div>
                </form>
            </div>
        </div>
        `;
    }
};