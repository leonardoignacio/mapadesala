// ./apoio/views_apoio_alteracoes.js - Filtros e cartões da lista de alterações
Object.assign(window.ViewsApoio, {
    filtrosAlteracoes() {
        const rot = 'block min-w-0 text-[11px] font-bold text-slate-500';
        const campo = 'mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal text-slate-700';
        return `
        <div class="mb-2 shrink-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div class="grid grid-cols-2 items-end gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <label class="${rot}">Situação
                    <select id="apoio-f-situacao" class="${campo}"><option value="Pendente">Pendentes</option><option value="Realizada">Realizadas</option><option value="Todas">Todas</option></select></label>
                <label class="${rot}">Ação
                    <select id="apoio-f-acao" class="${campo}"><option value="">Inserir e excluir</option><option value="Inserir">Somente inserir</option><option value="Excluir">Somente excluir</option></select></label>
                <label class="${rot}">Filtrar data por
                    <select id="apoio-f-tipo-data" class="${campo}"><option value="encontro">Data do encontro</option><option value="alteracao">Data da alteração</option></select></label>
                <label class="${rot}">De<input type="date" id="apoio-f-de" class="${campo}"></label>
                <label class="${rot}">Até<input type="date" id="apoio-f-ate" class="${campo}"></label>
                <label class="${rot}">Realizado por
                    <select id="apoio-f-responsavel" class="${campo}"><option value="">Todos</option></select></label>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-2">
                <details id="apoio-f-areas" class="relative">
                    <summary class="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        <span>Áreas:</span><span id="apoio-f-areas-resumo" class="max-w-[16rem] truncate font-normal text-slate-600"></span><span aria-hidden="true">▾</span></summary>
                    <div class="absolute left-0 z-30 mt-1 w-72 max-w-[85vw] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
                        <p class="mb-2 text-[11px] text-slate-500">Por padrão aparecem só as suas áreas. Marque outras para atender casos emergenciais.</p>
                        <div class="mb-2 flex gap-2">
                            <button type="button" id="apoio-areas-minhas" class="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Minhas áreas</button>
                            <button type="button" id="apoio-areas-todas" class="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Todas as áreas</button>
                        </div>
                        <div id="apoio-areas-lista" class="max-h-56 space-y-0.5 overflow-y-auto"></div>
                    </div>
                </details>
                <button type="button" id="apoio-btn-limpar-filtros" class="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Limpar filtros</button>
                <button type="button" id="apoio-btn-atualizar" class="ml-auto rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">↻ Atualizar</button>
            </div>
        </div>`;
    },

    // Cartão de um item da lista (tudo que vem do banco é escapado).
    cartaoAlteracao(it, { podeAlterar }) {
        const e = window.Util.esc, d = it.dados || {};
        const inserir = it.acao === 'Inserir';
        const cor = inserir ? { faixa: 'border-emerald-300', selo: 'bg-emerald-100 text-emerald-800', texto: 'Inserir no SS e SGO' }
                            : { faixa: 'border-rose-300', selo: 'bg-rose-100 text-rose-800', texto: 'Excluir do SS e SGO' };
        const docentes = (d.docentes || []).map(x => x.nome || x.email).filter(Boolean).join(', ') || '—';
        const dia = window.Util.diaSemana(d.data);
        const numero = it.numero ? `Encontro ${it.numero}${it.total ? `/${it.total}` : ''}` : 'Encontro —';
        const situacaoCls = it.situacao === 'Realizada' ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800';
        const dis = podeAlterar ? '' : 'disabled';
        const flag = (nome) => `<label class="flex items-center gap-1.5 rounded-lg border ${it[nome] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-white'} px-2.5 py-1.5 text-xs font-extrabold ${dis ? 'opacity-70' : 'cursor-pointer hover:bg-slate-50'}"><input type="checkbox" class="apoio-flag h-4 w-4 rounded border-slate-300" data-id="${e(it.id)}" data-flag="${nome}" ${it[nome] ? 'checked' : ''} ${dis}>${nome}</label>`;
        const realizado = it.realizadoEm ? `<span>Lançado por <b>${e(it.realizadoPorNome || it.realizadoPor || '—')}</b> em ${e(window.Util.dataHoraBR(it.realizadoEm))}</span>` : '<span>Ainda não lançado</span>';
        const motivos={'Alterar Docente':'Mudança de docente','Alterar Sala':'Mudança de sala','Alterar Docente e Sala':'Mudança de docente e sala','Redistribuir':'Redistribuição','Inserir':'Nova inserção','Excluir':'Exclusão'};
        const motivo=motivos[it.tipo]||'';
        return `
        <article class="apoio-cartao rounded-xl border-l-4 ${cor.faixa} border border-slate-200 bg-white p-3 shadow-sm" data-id="${e(it.id)}">
            <header class="flex flex-wrap items-center justify-between gap-2">
                <span class="rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase ${cor.selo}">${cor.texto}</span>
                <span class="rounded-md px-2 py-0.5 text-[11px] font-extrabold ${situacaoCls}">${e(it.situacao)}</span>
            </header>
            <h3 class="mt-2 text-sm font-extrabold leading-snug text-slate-800">${e(d.uc_referencia || '')}${d.uc_titulo ? ` · ${e(d.uc_titulo)}` : ''}</h3>
            ${motivo?`<p class="mt-1 text-xs font-bold text-indigo-700">Motivo: ${e(motivo)}</p>`:''}
            <dl class="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                <div><dt class="font-bold text-slate-400">Turma</dt><dd class="font-semibold text-slate-700">${e(it.turmaRef)}</dd></div>
                <div><dt class="font-bold text-slate-400">Oferta</dt><dd class="font-semibold text-slate-700">${e(it.oferta || '—')}</dd></div>
                <div><dt class="font-bold text-slate-400">Encontro</dt><dd class="font-semibold text-slate-700">${e(numero)}</dd></div>
                <div><dt class="font-bold text-slate-400">Data</dt><dd class="font-semibold text-slate-700">${e(window.Util.dataBR(d.data))}${dia ? ` · ${e(dia)}` : ''}</dd></div>
                <div><dt class="font-bold text-slate-400">Horário</dt><dd class="font-semibold text-slate-700">${e(d.h_inicio || '—')} às ${e(d.h_termino || '—')}</dd></div>
                <div><dt class="font-bold text-slate-400">Modalidade</dt><dd class="font-semibold text-slate-700">${e(d.modalidade || '—')}</dd></div>
                <div class="col-span-2"><dt class="font-bold text-slate-400">Docente(s)</dt><dd class="font-semibold text-slate-700">${e(docentes)}</dd></div>
                <div class="col-span-2"><dt class="font-bold text-slate-400">Sala</dt><dd class="font-semibold text-slate-700">${e(d.sala_nome || d.sala_referencia || '—')}</dd></div>
                ${d.descricao ? `<div class="col-span-2"><dt class="font-bold text-slate-400">Observação</dt><dd class="text-slate-700">${e(d.descricao)}</dd></div>` : ''}
            </dl>
            <div class="mt-3 flex flex-wrap items-center gap-2">${flag('SS')}${flag('SGO')}
                ${podeAlterar ? '' : '<span class="text-[11px] font-semibold text-slate-400">Somente leitura</span>'}</div>
            <footer class="mt-3 flex flex-col gap-0.5 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                <span>Alterado por <b>${e(it.criadoPorNome || it.criadoPor || '—')}</b> em ${e(window.Util.dataHoraBR(it.criadoEm))}</span>
                ${realizado}
            </footer>
        </article>`;
    }
});
