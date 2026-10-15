// ./usuarios/views_usuarios.js - Interface Visual de Pré-Cadastro e Solicitação de Credenciamento
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

                    <!-- Campos de Senha (Ocultados automaticamente se o usuário já autenticou via Google) -->
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

                    <!-- Cargo / Função (Sem a opção de Administrador) -->
                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Cargo / Função *</label>
                        <select id="pre-cad-cargo" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 transition text-sm md:text-base bg-white cursor-pointer" required>
                            <option value="" disabled selected>Selecione seu cargo...</option>
                            <option value="docente">Docente</option>
                            <option value="tecnico">Técnico de Área (Coordenação Pedagógica)</option>
                            <option value="apoio">Apoio Administrativo / Escolar</option>
                        </select>
                    </div>

                    <!-- Solicitação de Credenciamento (Textarea) -->
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
    }
};