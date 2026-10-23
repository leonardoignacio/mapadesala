// ./espelho/views_espelho.js - Interface do Espelho de Classe
window.ViewsEspelho = {
    renderizar(podeEditar = false) {
        const podeGerenciarRecursos = ['root','admin','tecnico'].includes(window.usuarioAtual?.cargo);
        return `
        <section class="px-2 md:px-8 pt-4 pb-6 fade-in flex-1 overflow-hidden flex flex-col w-full relative min-h-0">
            <h1 class="text-xl font-bold mb-3 text-slate-800 w-full lg:w-[96%] mx-auto shrink-0 px-2">Espelho de Classe</h1>
            <div class="flex border-b border-slate-200 mb-3 gap-5 w-full lg:w-[96%] mx-auto overflow-x-auto shrink-0 px-2">
                <button class="tab-btn active font-bold text-blue-600 border-b-2 border-blue-600 pb-2 text-sm md:text-base whitespace-nowrap" data-target="tab-mapa-aulas">Mapa de Aulas</button>
                <button class="tab-btn font-medium text-slate-500 border-b-2 border-transparent pb-2 text-sm md:text-base whitespace-nowrap" data-target="tab-recursos">Recursos</button>
            </div>
            <div id="tab-mapa-aulas" class="tab-content flex-1 flex flex-col overflow-hidden min-h-0 min-w-0 w-full lg:w-[96%] mx-auto">
                <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-3 md:p-4 mb-3 shrink-0">
                    <details id="espelho-filtro-acordeon" class="group">
                        <summary class="list-none cursor-pointer flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"><span class="w-full min-w-0 truncate whitespace-nowrap text-[10px] font-bold text-slate-600 uppercase sm:flex-1 sm:text-xs">Turmas exibidas por área e curso</span><div class="flex w-full min-w-0 items-center gap-2 sm:ml-auto sm:w-auto sm:gap-3"><span id="espelho-contagem-turmas" class="hidden shrink-0 text-[10px] text-slate-500 sm:inline sm:text-[11px]"></span><span class="shrink-0 text-[10px] font-bold text-blue-700 sm:text-xs">Gerenciar turmas</span><label class="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-slate-700 sm:ml-0 sm:gap-2 sm:text-sm" onclick="event.stopPropagation()"><input id="espelho-mostrar-todas" type="checkbox" class="h-4 w-4 rounded text-blue-600"> Exibir todas</label><span class="shrink-0 text-slate-400 transition-transform group-open:rotate-180">⌄</span></div></summary>
                        <div class="flex items-center justify-end mt-2 mb-2"><button id="btn-area-marcar-todas" type="button" class="text-xs font-bold text-blue-700 hover:underline">Marcar todas</button></div>
                        <div id="espelho-filtro-areas" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2"><span class="text-sm text-slate-400">Carregando áreas e cursos…</span></div>
                    </details>
                    ${!podeEditar ? '<div class="mt-3 text-xs text-slate-400">Acesso somente para leitura</div>' : ''}
                </div>
                <div id="espelho-status" class="hidden mb-2 px-3 py-2 rounded-lg text-sm shrink-0" role="status" aria-live="polite"></div>
                <div id="espelho-painel" class="flex-1 min-w-0 overflow-auto overscroll-x-contain touch-pan-x touch-pan-y min-h-0 space-y-3 pb-4"><div class="p-10 text-center text-slate-400">Carregando mapa de aulas…</div></div>
            </div>
            <div id="tab-recursos" class="tab-content hidden flex flex-1 flex-col overflow-y-auto min-h-0 w-full lg:w-[96%] mx-auto">
                <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-6">
                    <h2 class="text-lg font-bold text-slate-800">Recursos · Salas de aula</h2><p class="text-sm text-slate-500 mt-1 mb-4">Cadastre salas comuns e laboratórios para vincular aos encontros.</p>
                    ${podeGerenciarRecursos ? `<form id="form-sala-aula" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"><div><label for="sala-referencia" class="block text-xs font-bold text-slate-500 mb-1">Referência *</label><input id="sala-referencia" required maxlength="80" class="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Ex.: Sala 12"></div><div><label for="sala-tipo" class="block text-xs font-bold text-slate-500 mb-1">Tipo *</label><select id="sala-tipo" class="w-full border border-slate-300 rounded-lg p-2.5"><option value="Comum">Comum</option><option value="Laboratório">Laboratório</option></select></div><div><label for="sala-cadeiras" class="block text-xs font-bold text-slate-500 mb-1">Número de cadeiras *</label><input id="sala-cadeiras" type="number" min="0" step="1" required class="w-full border border-slate-300 rounded-lg p-2.5" placeholder="0"></div><div class="md:col-span-2"><label for="sala-obs" class="block text-xs font-bold text-slate-500 mb-1">Observações</label><textarea id="sala-obs" rows="3" maxlength="1000" class="w-full border border-slate-300 rounded-lg p-2.5 resize-y" placeholder="Recursos, acessibilidade ou observações adicionais"></textarea></div><div class="md:col-span-2 flex justify-end"><button type="submit" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">Cadastrar sala</button></div></form>` : `<p class="text-sm text-slate-500">Apenas perfis de gestão podem cadastrar salas; você pode consultar os recursos disponíveis.</p>`}
                    <div id="espelho-status-recursos" class="hidden mb-3 px-3 py-2 rounded-lg text-sm" role="status" aria-live="polite"></div>
                    <div id="espelho-lista-salas" class="divide-y divide-slate-100"><p class="text-sm text-slate-400">Carregando salas…</p></div>
                </div>
            </div>
            ${this.renderizarModais(podeEditar)}
        </section>`;
    },

    renderizarModais(podeEditar) {
        if (!podeEditar) return '';
        return `
        <div id="modal-encontro" class="hidden fixed inset-0 bg-slate-900/60 z-50 items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-encontro">
            <div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden">
                <header class="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-3"><div><h2 id="titulo-modal-encontro" class="font-extrabold text-lg text-slate-800">Adicionar encontro</h2><p id="subtitulo-modal-encontro" class="text-xs text-slate-500 mt-1"></p></div><button type="button" class="btn-fechar-encontro text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Fechar">×</button></header>
                <form id="form-espelho-encontro" class="flex flex-col min-h-0 flex-1">
                    <div class="overflow-y-auto p-5 space-y-3"><input type="hidden" id="encontro-id"><input type="hidden" id="encontro-turma-id"><input type="hidden" id="encontro-data">
                        <div><label class="block text-xs font-bold text-slate-500 mb-1">Tipo</label><select id="encontro-tipo" class="w-full border border-slate-300 rounded-lg p-2.5"><option value="aula">Encontro (aula)</option><option value="cancelamento">Exceção / cancelamento desta turma</option></select></div>
                        <div id="campos-encontro-aula" class="space-y-3">
                            <div><label class="block text-xs font-bold text-slate-500 mb-1">Unidade Curricular *</label><select id="encontro-uc" class="w-full border border-slate-300 rounded-lg p-2.5" required></select></div>
                            <div><label class="block text-xs font-bold text-slate-500 mb-1">Docente(s) escalado(s)</label><div class="flex items-center gap-2"><button type="button" id="btn-escolher-docentes-encontro" class="px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm font-semibold">Selecionar docentes</button><span id="encontro-docentes-resumo" class="text-xs text-slate-500">Nenhum selecionado</span></div><div id="encontro-docentes" class="hidden"></div><p class="text-[11px] text-slate-400 mt-1">A lista contém docentes ativos habilitados para a área do curso.</p></div>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label class="block text-xs font-bold text-slate-500 mb-1">Início</label><input id="encontro-h-inicio" type="time" class="w-full border border-slate-300 rounded-lg p-2.5" required></div><div><label class="block text-xs font-bold text-slate-500 mb-1">Término</label><input id="encontro-h-termino" type="time" class="w-full border border-slate-300 rounded-lg p-2.5" required></div><div><label class="block text-xs font-bold text-slate-500 mb-1">Carga horária (h)</label><input id="encontro-ch" type="number" min="0.25" step="0.25" readonly class="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50" required></div></div>
                            <div class="flex flex-wrap gap-4"><label class="flex items-center gap-2 text-sm text-slate-700"><input id="encontro-ss" type="checkbox" class="w-4 h-4 rounded text-blue-600"> SS</label><label class="flex items-center gap-2 text-sm text-slate-700"><input id="encontro-sgo" type="checkbox" class="w-4 h-4 rounded text-blue-600"> SGO</label></div>
                            <div><label class="block text-xs font-bold text-slate-500 mb-1">Modalidade</label><select id="encontro-modalidade" class="w-full border border-slate-300 rounded-lg p-2.5"><option value="Presencial">Presencial</option><option value="Remoto">Remoto</option></select></div>
                            <div id="encontro-sala-wrap"><label class="block text-xs font-bold text-slate-500 mb-1">Sala / Laboratório (opcional)</label><select id="encontro-sala" class="w-full border border-slate-300 rounded-lg p-2.5"><option value="">Sem sala definida</option></select></div>
                        </div>
                        <div><label class="block text-xs font-bold text-slate-500 mb-1">Observações</label><textarea id="encontro-descricao" class="w-full border border-slate-300 rounded-lg p-2.5 resize-y" rows="3" maxlength="1000" placeholder="Opcional"></textarea></div>
                    </div>
                    <footer class="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex justify-end gap-2"><button type="button" class="btn-fechar-encontro px-4 py-2 rounded-lg border text-slate-600">Cancelar</button><button class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold" type="submit">Salvar</button></footer>
                </form>
            </div>
        </div>

        <div id="modal-distribuicao" class="hidden fixed inset-0 bg-slate-900/60 z-50 items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-distribuicao">
            <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden">
                <header class="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-3"><div><h2 id="titulo-modal-distribuicao" class="font-extrabold text-lg text-slate-800">Distribuição in loco</h2><p id="subtitulo-distribuicao" class="text-xs text-slate-500 mt-1"></p></div><button type="button" class="btn-fechar-distribuicao text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Fechar">×</button></header>
                <form id="form-distribuicao" class="flex flex-col min-h-0 flex-1"><input type="hidden" id="distribuicao-turma-id">
                    <div class="overflow-y-auto p-5 space-y-4">
                        <section class="rounded-xl border border-blue-200 bg-blue-50/40 p-3"><h3 class="text-xs font-bold uppercase text-slate-600 mb-3">Dados aplicados a todos os encontros</h3><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <label class="text-xs font-bold text-slate-600">Início<input type="time" id="dist-h-inicio" class="mt-1 w-full border rounded-lg p-2.5 text-sm" required></label>
                            <label class="text-xs font-bold text-slate-600">Término<input type="time" id="dist-h-termino" class="mt-1 w-full border rounded-lg p-2.5 text-sm" required></label>
                            <label class="text-xs font-bold text-slate-600">CH calculada (h)<input type="number" id="dist-ch" min="0.25" step="0.25" readonly class="mt-1 w-full border rounded-lg p-2.5 text-sm bg-slate-100" required></label>
                            <label class="text-xs font-bold text-slate-600">Tipo<select id="dist-modalidade" class="mt-1 w-full border rounded-lg p-2.5 text-sm"><option value="Presencial">Presencial</option><option value="Remoto">Remoto</option></select></label>
                            <label id="dist-sala-wrap" class="text-xs font-bold text-slate-600">Sala<select id="dist-sala" class="mt-1 w-full border rounded-lg p-2.5 text-sm"><option value="">Sem sala</option></select></label>
                            <label class="text-xs font-bold text-slate-600 sm:col-span-2 lg:col-span-3">Observações<textarea id="dist-obs" class="mt-1 w-full border rounded-lg p-2.5 text-sm resize-y" rows="2" maxlength="1000" placeholder="Aplicadas a todos os encontros desta distribuição"></textarea></label>
                        </div></section>
                        <section class="rounded-xl border border-slate-200 bg-white p-3"><label for="dist-uc" class="block text-xs font-bold uppercase text-slate-600 mb-1">Unidade Curricular para distribuir</label><select id="dist-uc" class="w-full border border-slate-300 rounded-lg p-2.5 text-sm"></select><p class="text-[11px] text-slate-400 mt-1">A lista mostra apenas UCs com encontros pendentes; “TODAS” distribui o saldo de todas.</p><div id="progresso-distribuicao" class="mt-3 space-y-2" aria-live="polite"></div></section>
                        <section><h3 class="text-xs font-bold uppercase text-slate-600 mb-2">Dias da semana e docentes escalados</h3><div id="distribuicao-dias" class="space-y-2"></div><p class="text-[11px] text-slate-400 mt-2">O sistema ocupa apenas datas sem encontro, cancelamento ou exceção do calendário.</p></section>
                        <div class="flex flex-wrap gap-2 items-center"><button id="btn-baixar-modelo-mapa" type="button" class="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold">Baixar modelo CSV</button><label class="px-3 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm font-semibold cursor-pointer">Importar CSV<input id="input-csv-mapa" type="file" accept=".csv,text/csv" class="hidden"></label><span id="csv-mapa-nome" class="text-xs text-slate-400"></span></div>
                    </div>
                    <footer class="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex justify-end gap-2"><button type="button" class="btn-fechar-distribuicao px-4 py-2 rounded-lg border text-slate-600">Cancelar</button><button type="submit" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">Distribuir encontros</button></footer>
                </form>
            </div>
        </div>

        <div id="modal-remover-uc" class="hidden fixed inset-0 bg-slate-900/60 z-[70] items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-remover-uc">
            <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"><header class="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-3"><div><h2 id="titulo-modal-remover-uc" class="font-extrabold text-lg text-slate-800">Remover encontros in loco</h2><p id="subtitulo-modal-remover-uc" class="mt-1 text-xs text-slate-500"></p></div><button type="button" class="btn-fechar-remocao-uc text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Fechar">×</button></header><div class="overflow-y-auto p-5 space-y-3"><label for="select-remover-uc" class="block text-xs font-bold uppercase text-slate-600">Unidade Curricular</label><select id="select-remover-uc" class="w-full rounded-lg border border-slate-300 p-2.5 text-sm"></select><p id="resumo-remocao-uc" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="status"></p><p class="text-xs text-slate-500">A remoção considera somente encontros com data futura. Encontros passados e os de hoje, além dos cancelamentos, serão preservados.</p></div><footer class="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex justify-end gap-2"><button type="button" class="btn-fechar-remocao-uc px-4 py-2 rounded-lg border text-slate-600">Cancelar</button><button type="button" id="btn-confirmar-remover-uc" class="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold">Remover encontros</button></footer></div>
        </div>

        <div id="modal-docentes-distribuicao" class="hidden fixed inset-0 bg-slate-950/60 z-[60] items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-docentes">
            <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"><header class="sticky top-0 z-10 bg-white border-b px-5 py-4 flex items-center justify-between"><div><h2 id="titulo-modal-docentes" class="font-bold text-lg text-slate-800">Selecionar docentes</h2><p id="subtitulo-modal-docentes" class="text-xs text-slate-500 mt-1"></p></div><button type="button" class="btn-fechar-docentes text-2xl text-slate-400" aria-label="Fechar">×</button></header><div id="lista-docentes-distribuicao" class="overflow-y-auto p-4 space-y-1 flex-1 min-h-0"></div><footer class="sticky bottom-0 bg-white border-t px-5 py-3 flex justify-end gap-2"><button type="button" class="btn-fechar-docentes px-4 py-2 rounded-lg border">Cancelar</button><button type="button" class="btn-aplicar-docentes-dist px-4 py-2 rounded-lg bg-blue-600 text-white font-bold">Salvar seleção</button></footer></div>
        </div>`;
    }
};
