// ./apoio/views_apoio_mapa.js - Views do Mapa de Sala
window.ViewsApoioMapa = {
    esc(v) { return window.Util.esc(v ?? ''); },
    mapaSalas() {
        return `<section class="ap-mapa-toolbar mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
            <div class="flex flex-wrap items-center gap-2">
                <button type="button" id="apoio-mapa-anterior" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50" aria-label="Semana anterior">‹ <span class="hidden sm:inline">Semana anterior</span></button>
                <button type="button" id="apoio-mapa-hoje" class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Hoje</button>
                <button type="button" id="apoio-mapa-proxima" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50" aria-label="Próxima semana"><span class="hidden sm:inline">Próxima semana</span> ›</button>
                <button type="button" id="apoio-mapa-atualizar" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Atualizar</button>
            </div>
            <strong id="apoio-mapa-semana-label" class="min-w-[180px] text-center text-sm font-extrabold text-slate-800" aria-live="polite"></strong>
            <span id="apoio-mapa-permissao" class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600"></span>
        </section><div id="apoio-mapa-status" class="mb-2 hidden rounded-lg border px-3 py-2 text-xs" role="status" aria-live="polite"></div>`;
    },
    modalMapaSalas() {
        return `<div id="apoio-modal-mapa-sala" class="hidden fixed inset-0 z-[80] items-center justify-center bg-slate-900/50 p-3 sm:p-5" role="presentation">
            <section class="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="apoio-mapa-modal-titulo">
                <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
                    <div><h2 id="apoio-mapa-modal-titulo" class="text-base font-extrabold text-slate-800">Alterar status da sala</h2><p id="apoio-mapa-modal-contexto" class="mt-1 text-xs text-slate-500"></p></div>
                    <button type="button" class="apoio-mapa-fechar rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar">✕</button>
                </header>
                <form id="apoio-mapa-form" class="min-h-0 overflow-y-auto p-4 sm:p-5">
                    <input type="hidden" id="apoio-mapa-sala-id"><input type="hidden" id="apoio-mapa-data"><input type="hidden" id="apoio-mapa-periodo">
                    <div class="space-y-4">
                        <label class="block text-xs font-bold text-slate-700">Status<select id="apoio-mapa-status-select" required class="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"><option>Disponível</option><option>Manutenção</option><option>Alocada</option></select></label>
                        <label class="block text-xs font-bold text-slate-700">Descrição<textarea id="apoio-mapa-descricao" rows="4" maxlength="500" placeholder="Informe detalhes úteis para a equipe…" class="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"></textarea><span class="mt-1 block text-[10px] font-normal text-slate-500">Obrigatória para o status Alocada; até 500 caracteres.</span></label>
                    </div>
                    <footer class="mt-5 flex shrink-0 justify-end gap-2 border-t border-slate-100 pt-3">
                        <button type="button" class="apoio-mapa-fechar rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                        <button type="submit" class="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700">Salvar status</button>
                    </footer>
                </form>
            </section>
        </div>`;
    },
    renderizarGrade({ dias, inicio, salas, ocupacoes, statuses, podeEditar }) {
        const e = v => this.esc(v), periodos = ['Manhã', 'Tarde', 'Noite'], hoje = window.ControllerDashboard._dataLocal();
        if (!salas.length) return `<div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><p class="font-bold text-slate-700">Nenhuma sala cadastrada</p><p class="mt-1 text-xs text-slate-500">Cadastre as salas em Espelho de Classe → Recursos para exibi-las neste mapa.</p></div>`;
        const diasNome = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const cabecalho = `<div class="ap-mapa-head ap-mapa-corner">Sala / período</div>` + dias.map((dia, i) => {
            const d = new Date(Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8, 10)), 12);
            return `<div class="ap-mapa-head ${dia === hoje ? 'ap-mapa-head-today' : ''}"><span class="ap-mapa-head-label">${diasNome[i]}</span><b class="ap-mapa-head-date">${Number(dia.slice(8, 10))} ${e(new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', ''))}</b></div>`;
        }).join('');
        const rows = periodos.map(periodo => {
            const suffix = this._slug(periodo);
            const cells = dias.map(dia => {
                const cards = salas.map(sala => {
                    const slotKey = window.ControllerApoioMapa.chave(sala.id, dia, periodo);
                    return this._cartaoSala(sala, dia, periodo, ocupacoes.get(slotKey) || [], statuses.get(slotKey) || null, podeEditar);
                }).join('');
                return `<div class="ap-mapa-cell ap-mapa-cell-${suffix}">${cards}</div>`;
            }).join('');
            return `<div class="ap-mapa-period ap-mapa-period-${suffix}">${e(periodo)}</div>${cells}`;
        }).join('');
        return `<div class="ap-mapa-scroll"><div class="ap-mapa-grid">${cabecalho}${rows}</div></div>
            <p class="mt-2 text-[10px] text-slate-500">Semana de ${e(window.Util.dataBR(inicio))} a ${e(window.Util.dataBR(dias[dias.length - 1]))}. Encontros já distribuídos prevalecem sobre status manuais da sala.</p>`;
    },
    _slug(v) { return window.Util.semAcento(v).toLowerCase().replace(/[^a-z0-9]+/g, '-'); },
    _cartaoSala(sala, data, periodo, encontros, status, podeEditar) {
        const e = v => this.esc(v), nome = sala.referencia || sala.nome || 'Sala', salaId = String(sala.id || '');
        if (encontros.length) return renderizarEncontrosSala(encontros, nome, e);
        const estado = status?.status || 'Disponível';
        const cardClass = estado === 'Manutenção' ? 'ap-mapa-sala-card-manutencao' : estado === 'Alocada' ? 'ap-mapa-sala-card-alocada' : 'ap-mapa-sala-card-status';
        const interactive = podeEditar ? `ap-mapa-sala-card-editable" role="button" tabindex="0" aria-label="Duplo clique para alterar o status de ${e(nome)} em ${e(window.Util.dataBR(data))}, ${e(periodo)}" data-sala="${e(salaId)}" data-data="${e(data)}" data-periodo="${e(periodo)}" data-status="${e(estado)}" data-descricao="${e(status?.descricao || '')}` : '';
        return `<article class="ap-mapa-sala-card ${cardClass} ${interactive ? interactive : ''}"><div class="ap-mapa-sala-title">${e(nome)}</div><div class="ap-mapa-sala-status">${e(estado)}</div>${status?.descricao ? `<div class="ap-mapa-sala-desc">${e(status.descricao)}</div>` : ''}</article>`;
    }
};

function renderizarEncontrosSala(lista, salaNome, e) {
    return lista.map(enc => {
        const turma = enc.turma || {}, docentes = (enc.docentes || []).map(d => typeof d === 'string' ? d : d.nome_completo || d.nome || d.email).filter(Boolean).join(', ');
        const uc = enc.uc_referencia || enc.uc_titulo || enc.titulo_uc || 'Encontro', turmaNome = turma.referencia || enc.turma_referencia || 'Turma';
        const docenteLabel = docentes || 'Docente não informado';
        return `<article class="ap-mapa-sala-card ap-mapa-sala-card-alocada" aria-label="${e(salaNome)} · ${e(turmaNome)} · ${e(uc)} · ${e(docenteLabel)}"><div class="ap-mapa-meeting-summary" title="${e(salaNome)} · ${e(turmaNome)} · ${e(uc)}"><span class="ap-mapa-meeting-room">${e(salaNome)}</span><span class="ap-mapa-meeting-course"><span class="ap-mapa-meeting-item"><b>${e(turmaNome)}</b></span><i>·</i><span class="ap-mapa-meeting-item"><b>${e(uc)}</b></span></span></div><div class="ap-mapa-meeting-teacher" title="${e(docenteLabel)}">${e(docenteLabel)}</div></article>`;
    }).join('');
}

Object.assign(window.ViewsApoio, {
    mapaSalas() { return window.ViewsApoioMapa.mapaSalas(); },
    modalMapaSalas() { return window.ViewsApoioMapa.modalMapaSalas(); }
});
