// ./apoio/views_apoio.js - Estrutura da tela Apoio Técnico (título, abas e contêineres)
window.ViewsApoio = {
    renderizar(usuario) {
        return `
        <div class="px-2 md:px-8 pt-4 pb-6 fade-in flex-1 overflow-hidden flex flex-col w-full relative">
            <h1 class="text-xl font-bold mb-3 text-slate-800 w-full lg:w-[90%] mx-auto shrink-0 px-2 md:px-0">Apoio Técnico</h1>

            <div class="flex border-b border-slate-200 mb-3 gap-4 lg:gap-6 w-full lg:w-[90%] mx-auto overflow-x-auto shrink-0 px-2 md:px-0">
                <button class="tab-btn active font-bold text-blue-600 border-b-2 border-blue-600 pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-apoio-alteracoes">Alterações recentes</button>
                <button class="tab-btn font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-apoio-perfil">Informações pessoais</button>
            </div>

            <!-- ABA: ALTERAÇÕES RECENTES -->
            <div id="tab-apoio-alteracoes" class="tab-content flex-1 flex flex-col overflow-hidden min-h-0">
                <div class="w-full lg:w-[90%] mx-auto flex-1 flex flex-col overflow-hidden px-2 md:px-0">
                    ${this.filtrosAlteracoes()}
                    <div id="apoio-resumo" class="mb-2 flex shrink-0 flex-wrap items-center gap-2 text-xs text-slate-500" aria-live="polite"></div>
                    <div id="apoio-lista" class="min-h-0 flex-1 overflow-y-auto pb-4"></div>
                </div>
            </div>

            <!-- ABA: INFORMAÇÕES PESSOAIS -->
            <div id="tab-apoio-perfil" class="tab-content hidden flex-1 flex flex-col overflow-y-auto min-h-0">
                <div class="w-full lg:w-[90%] mx-auto px-2 md:px-0">${this.perfil()}</div>
            </div>

            ${this.modalPerfil()}
        </div>`;
    }
};
