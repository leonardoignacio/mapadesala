// Views do Mapa de Aulas e estrutura principal da seção Espelho.
window.ViewsEspelho = {
};
// Templates de mapa, configurações e edição de encontros.
Object.assign(window.ViewsEspelho, {
    renderizar(podeEditar = false) {
        const podeGerenciarRecursos = ['root','admin','tecnico'].includes(window.usuarioAtual?.cargo);
        const podeGerenciarFlagsLote = ['apoio','admin'].includes(window.usuarioAtual?.cargo);
        return `
        <section class="px-1.5 sm:px-2 md:px-8 pt-2 sm:pt-4 pb-3 sm:pb-6 fade-in flex-1 overflow-hidden flex flex-col w-full relative min-h-0">
            
            <div class="flex border-b border-slate-200 mb-2 sm:mb-3 gap-5 w-full lg:w-[96%] mx-auto overflow-x-auto shrink-0 px-1 sm:px-2">
                <button class="tab-btn active font-bold text-blue-600 border-b-2 border-blue-600 pb-2 text-sm md:text-base whitespace-nowrap" data-target="tab-mapa-aulas">Mapa de Aulas</button>
                <button class="tab-btn font-medium text-slate-500 border-b-2 border-transparent pb-2 text-sm md:text-base whitespace-nowrap" data-target="tab-recursos">Recursos</button>
            </div>
            <div id="tab-mapa-aulas" class="tab-content flex-1 flex flex-col overflow-hidden min-h-0 min-w-0 w-full lg:w-[96%] mx-auto">
                <div id="espelho-status" class="hidden mb-2 px-3 py-2 rounded-lg text-sm shrink-0" role="status" aria-live="polite"></div>
                <div id="espelho-painel" class="flex-1 min-w-0 overflow-auto overscroll-x-contain touch-pan-x touch-pan-y min-h-0 space-y-2 sm:space-y-3 pb-2 sm:pb-4"><div class="p-10 text-center text-slate-400">Carregando mapa de aulas…</div></div>
            </div>
            ${this.renderizarAbaRecursos(podeGerenciarRecursos)}
            ${this.renderizarModalSala(podeGerenciarRecursos)}
            ${this.renderizarModalConfiguracoesTurmas()}
            ${this.renderizarModalFiltroTurma()}
            ${podeGerenciarFlagsLote ? this.renderizarModalFlagsLote() : ''}
            ${podeEditar ? this.renderizarModalEdicaoLote() : ''}
            ${this.renderizarModais(podeEditar)}
        </section>`;
    },
});
