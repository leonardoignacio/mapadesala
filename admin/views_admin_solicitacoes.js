// ./admin/views_admin_solicitacoes.js - Aba "Solicitações de áreas" do Painel Admin
window.ViewsAdminSolicitacoes = {
    botaoAba() {
        return `<button class="tab-btn font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent pb-2 transition-colors text-sm md:text-base whitespace-nowrap" data-target="tab-admin-solicitacoes">Solicitações de áreas <span id="badge-solic-areas" class="ml-1 hidden rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white"></span></button>`;
    },

    conteudoAba() {
        return `
            <div id="tab-admin-solicitacoes" class="tab-content hidden flex-1 flex flex-col overflow-hidden min-h-0">
                <div class="w-full lg:w-[90%] mx-auto flex-1 flex flex-col overflow-hidden px-2 md:px-0">
                    <p class="mb-3 shrink-0 text-xs text-slate-500">Pedidos de usuários para atuar em outras áreas. Ao aprovar, as áreas marcadas são somadas às que o usuário já possui.</p>
                    <div id="admin-solic-lista" class="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4"></div>
                </div>
            </div>`;
    },

    cartao(s) {
        const e = window.Util.esc, pendente = s.status === 'Pendente';
        const cor = { Pendente: 'bg-amber-100 text-amber-800', Aprovada: 'bg-emerald-100 text-emerald-800', Recusada: 'bg-rose-100 text-rose-800' }[s.status] || 'bg-slate-100 text-slate-600';
        const areas = (s.areas_solicitadas || []).map(a => pendente
            ? `<label class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700"><input type="checkbox" class="admin-solic-area h-4 w-4 rounded border-slate-300" value="${e(a)}" checked>${e(a)}</label>`
            : `<span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">${e(a)}</span>`).join('');
        const rodape = pendente
            ? `<div class="mt-3 flex flex-wrap items-center gap-2"><input type="text" class="admin-solic-motivo min-w-0 flex-1 rounded-lg border border-slate-300 p-2 text-sm" placeholder="Motivo (opcional, para recusar)" maxlength="200">
                 <button type="button" class="admin-solic-recusar rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50" data-id="${e(s.id)}">Recusar</button>
                 <button type="button" class="admin-solic-aprovar rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700" data-id="${e(s.id)}">Aprovar marcadas</button></div>`
            : `<p class="mt-2 text-xs text-slate-500">${e(s.status)} por <b>${e(s.avaliado_por_nome || s.avaliado_por || '—')}</b> em ${e(window.Util.dataHoraBR(s.avaliado_em))}${s.motivo_recusa ? ` — Motivo: ${e(s.motivo_recusa)}` : ''}</p>`;
        return `
        <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-id="${e(s.id)}">
            <header class="flex flex-wrap items-center justify-between gap-2"><div class="min-w-0"><h3 class="truncate text-sm font-extrabold text-slate-800">${e(s.nome || s.email)}</h3><p class="truncate text-xs text-slate-500">${e(s.email)} · ${e(s.cargo || '')}</p></div>
                <span class="rounded-md px-2 py-0.5 text-[11px] font-extrabold ${cor}">${e(s.status)}</span></header>
            <div class="mt-2 flex flex-wrap gap-1.5">${areas}</div>
            <p class="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><span class="text-[11px] font-bold uppercase text-slate-400">Motivo do pedido</span><br>${e(s.justificativa || '—')}</p>
            <p class="mt-1 text-[11px] text-slate-400">Enviada em ${e(window.Util.dataHoraBR(s.criado_em))}</p>
            ${rodape}
        </article>`;
    }
};
