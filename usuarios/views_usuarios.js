// ./usuarios/views_usuarios.js - Interface Visual de Pré-Cadastro e Painel Pendente
window.ViewsUsuarios = {

    renderizarModalPreCadastro() {
        return `
        <!-- Modal de Pré-Cadastro (Fecha apenas no 'X' ou em 'Cancelar') -->
        <div id="modal-pre-cadastro" class="hidden fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 md:p-8 relative fade-in max-h-[92vh] flex flex-col border border-slate-200">
                
                <button type="button" id="btn-close-pre-cadastro" class="absolute top-4 right-4 md:top-6 md:right-6 text-slate-400 hover:text-slate-700 font-bold text-xl focus:outline-none" title="Fechar">✕</button>
                
                <div class="flex items-center gap-3 mb-2 shrink-0">
                    <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">IT</div>
                    <div>
                        <h2 class="font-extrabold text-lg md:text-xl text-slate-800">Solicitação de Credenciamento</h2>
                        <p class="text-xs text-slate-500">Preencha seus dados para solicitar a habilitação do seu perfil</p>
                    </div>
                </div>

                <div id="aviso-google-pre-cadastro" class="hidden bg-blue-50 border border-blue-200 text-blue-800 text-xs p-3 rounded-lg mb-3 mt-2 shrink-0">
                    Autenticado via Google. Complete seu cargo e a solicitação de credenciamento abaixo para enviar seu pedido de acesso.
                </div>

                <form id="form-pre-cadastro" autocomplete="off" class="space-y-4 overflow-y-auto pr-1 mt-3 flex-1">
                    <input type="hidden" id="pre-cad-origem-google" value="false">

                    <!-- Nome e Sobrenome -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Nome *</label>
                            <input type="text" id="pre-cad-nome" placeholder="Ex: João" autocomplete="off" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Sobrenome *</label>
                            <input type="text" id="pre-cad-sobrenome" placeholder="Ex: Silva" autocomplete="off" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                        </div>
                    </div>

                    <!-- E-mail -->
                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase mb-1">E-mail *</label>
                        <input type="email" id="pre-cad-email" placeholder="seu_email@email.com" autocomplete="new-email" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                    </div>

                    <!-- Campos de Senha -->
                    <div id="bloco-senhas-pre-cadastro" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Criar Senha *</label>
                            <input type="password" id="pre-cad-senha" placeholder="Mínimo 6 caracteres" minlength="6" autocomplete="new-password" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Confirmar Senha *</label>
                            <input type="password" id="pre-cad-confirmar-senha" placeholder="Repita a senha" minlength="6" autocomplete="new-password" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                        </div>
                    </div>

                    <!-- Cargo / Função -->
                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Cargo / Função *</label>
                        <select id="pre-cad-cargo" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base bg-white cursor-pointer" required>
                            <option value="" disabled selected>Selecione seu cargo...</option>
                            <option value="docente">Docente</option>
                            <option value="tecnico">Técnico de Área (Coordenação Pedagógica)</option>
                            <option value="apoio">Apoio Administrativo / Escolar</option>
                        </select>
                    </div>

                    <!-- Solicitação de Credenciamento -->
                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Solicitação de Credenciamento e Áreas de Atuação *</label>
                        <textarea 
                            id="pre-cad-solicitacao" 
                            rows="3" 
                            placeholder="Sou a Maria e solicito a habilitação como as áreas de Tecnologia da Informação e Computação Gráfica" 
                            class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base resize-y" 
                            required
                        ></textarea>
                    </div>

                    <!-- Botões de Ação -->
                    <div class="flex justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
                        <button type="button" id="btn-cancel-pre-cadastro" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 px-5 rounded-lg transition text-sm md:text-base">Cancelar</button>
                        <button type="submit" id="btn-submit-pre-cadastro" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition shadow-md text-sm md:text-base">Enviar Solicitação</button>
                    </div>
                </form>
            </div>
        </div>
        `;
    },

    // View exibida exclusivamente no Dashboard quando o usuário logado está com status "pendente"
    renderizarDashboardPendente(usuario) {
        const nome = usuario?.nome || "";
        const sobrenome = usuario?.sobrenome || "";
        const email = usuario?.email || "";
        const cargoSolicitado = usuario?.cargo_solicitado || "docente";
        const solicitacao = usuario?.solicitacao_credenciamento || "";

        return `
        <div class="px-2 md:px-8 pt-4 pb-6 fade-in flex-1 overflow-y-auto flex flex-col w-full relative">
            
            <h1 class="text-xl font-bold mb-3 text-slate-800 w-full lg:w-[90%] mx-auto shrink-0 px-2 md:px-0">Dashboard</h1>
            
            <!-- Aba Home -->
            <div class="flex border-b border-slate-200 mb-6 gap-4 lg:gap-6 w-full lg:w-[90%] mx-auto overflow-x-auto shrink-0 px-2 md:px-0">
                <button class="tab-btn active font-bold text-blue-600 border-b-2 border-blue-600 pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-home-pendente">Home</button>
            </div>

            <!-- Conteúdo da Aba Home -->
            <div id="tab-home-pendente" class="tab-content flex-1 w-full lg:w-[90%] mx-auto px-2 md:px-0">
                <div class="max-w-2xl mx-auto space-y-6 pb-8">
                    
                    <!-- Card de Aviso: Solicitação Enviada / Aguardando Credenciamento -->
                    <div class="bg-amber-50 border border-amber-200 rounded-2xl p-5 md:p-6 shadow-sm flex items-start gap-4">
                        <div class="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xl">
                            ⏳
                        </div>
                        <div class="space-y-1">
                            <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-200/70 text-amber-800">
                                Aguardando o credenciamento
                            </span>
                            <h2 class="text-base md:text-lg font-extrabold text-slate-800">
                                Solicitação de credenciamento enviada!
                            </h2>
                            <p class="text-xs md:text-sm text-slate-600 leading-relaxed">
                                Seu pré-cadastro foi registrado com sucesso e está aguardando análise de um Administrador ou Técnico de Área. Enquanto sua conta não for habilitada, as demais funcionalidades permanecem bloqueadas.
                            </p>
                        </div>
                    </div>

                    <!-- Card com Formulário para Atualizar/Reenviar Solicitação ou Excluir Cadastro -->
                    <div class="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
                        <h3 class="font-bold text-base md:text-lg text-slate-800 mb-1">Dados da sua Solicitação</h3>
                        <p class="text-xs text-slate-500 mb-4">Caso precise corrigir ou complementar alguma informação, edite os campos abaixo e clique em <strong>Reenviar Solicitação</strong>.</p>

                        <form id="form-reenviar-solicitacao" class="space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Nome *</label>
                                    <input type="text" id="reenviar-nome" value="${nome}" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Sobrenome *</label>
                                    <input type="text" id="reenviar-sobrenome" value="${sobrenome}" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base" required>
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">E-mail Cadastrado</label>
                                <input type="email" id="reenviar-email" value="${email}" class="w-full border border-slate-200 bg-slate-100 text-slate-500 p-2.5 rounded-lg text-sm md:text-base cursor-not-allowed outline-none" readonly>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Cargo / Função Solicitada *</label>
                                <select id="reenviar-cargo" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base bg-white cursor-pointer" required>
                                    <option value="docente" ${cargoSolicitado === 'docente' ? 'selected' : ''}>Docente</option>
                                    <option value="tecnico" ${cargoSolicitado === 'tecnico' ? 'selected' : ''}>Técnico de Área (Coordenação Pedagógica)</option>
                                    <option value="apoio" ${cargoSolicitado === 'apoio' ? 'selected' : ''}>Apoio Administrativo / Escolar</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Solicitação de Credenciamento e Áreas de Atuação *</label>
                                <textarea 
                                    id="reenviar-solicitacao" 
                                    rows="4" 
                                    placeholder="Sou a Maria e solicito a habilitação como as áreas de Tecnologia da Informação e Computação Gráfica" 
                                    class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base resize-y" 
                                    required
                                >${solicitacao}</textarea>
                            </div>

                            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    id="btn-excluir-proprio-cadastro" 
                                    class="w-full sm:w-auto bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2.5 px-4 rounded-lg transition text-sm"
                                >
                                    🗑️ Excluir Cadastro e Solicitação
                                </button>

                                <button 
                                    type="submit" 
                                    id="btn-submit-reenviar-solicitacao" 
                                    class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition shadow-md text-sm md:text-base"
                                >
                                    Reenviar Solicitação
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </div>
        `;
    }
};