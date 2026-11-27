// ./admin/views_admin_backup.js - Interface da aba Backup do Painel Admin
window.ViewsAdminBackup = {
    esc(v) { return window.Util.esc(v ?? ''); },
    renderizarColecoes(colecoes) {
        const grupos = [...new Set(colecoes.map(item => item.grupo))];
        return grupos.map(grupo => `<fieldset class="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><legend class="px-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">${this.esc(grupo)}</legend><div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">${colecoes.filter(item => item.grupo === grupo).map(item => `<label class="flex min-w-0 cursor-pointer items-start gap-2 rounded-lg border border-transparent p-2 text-xs text-slate-700 transition hover:border-blue-200 hover:bg-white"><input type="checkbox" class="admin-backup-colecao mt-0.5 h-4 w-4 shrink-0 rounded text-blue-600" value="${this.esc(item.nome)}"><span class="min-w-0"><span class="block break-words font-bold">${this.esc(item.rotulo)}</span><span class="block break-all text-[10px] text-slate-400">${this.esc(item.nome)}</span></span></label>`).join('')}</div></fieldset>`).join('');
    },
    renderizar() {
        return `<section class="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 overflow-y-auto px-2 pb-5 md:px-0" aria-labelledby="admin-backup-titulo">
            <header class="rounded-xl border border-blue-100 bg-blue-50/70 p-4"><h2 id="admin-backup-titulo" class="text-lg font-extrabold text-slate-800">Backup de dados</h2><p class="mt-1 text-xs leading-relaxed text-slate-600">Selecione uma ou mais coleções e o formato dos arquivos. O ZIP é montado no navegador a partir do Firestore e baixado diretamente; nenhuma cópia temporária é gravada no Firebase.</p></header>
            <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900"><b>Atenção:</b> o backup pode conter dados pessoais e operacionais. Armazene o arquivo em local protegido. Coleções restritas pelas regras atuais não são disponibilizadas para este perfil.</div>
            <section class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3"><div><h3 class="text-sm font-extrabold text-slate-800">Coleções para exportação</h3><p class="mt-0.5 text-[10px] text-slate-500">Escolha individualmente ou marque todas as coleções disponíveis.</p></div><label class="flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800"><input id="admin-backup-selecionar-todas" type="checkbox" class="h-4 w-4 rounded text-blue-600">Selecionar todas</label></div>
                <div id="admin-backup-colecoes" class="space-y-3"><p class="p-4 text-center text-xs text-slate-500">Carregando coleções disponíveis…</p></div>
                <div class="mt-4 grid grid-cols-1 items-end gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[minmax(180px,260px)_1fr]">
                    <label class="block text-xs font-bold text-slate-700">Formato dos arquivos<select id="admin-backup-formato" class="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"><option value="json">JSON (.json)</option><option value="csv">CSV (.csv)</option></select></label>
                    <div class="flex flex-col gap-2 sm:items-end"><span id="admin-backup-contagem" class="text-[11px] text-slate-500" aria-live="polite">Nenhuma coleção selecionada</span><button id="admin-backup-exportar" type="button" disabled class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"><span aria-hidden="true">↓</span>Gerar e baixar backup (.zip)</button></div>
                </div>
            </section>
            <div id="admin-backup-status" class="hidden rounded-xl border px-3 py-3 text-xs leading-relaxed" role="status" aria-live="polite"></div>
            <p class="px-1 text-[10px] leading-relaxed text-slate-400">O arquivo contém as coleções de nível superior indicadas; subcoleções Firestore não são enumeradas por esta ferramenta. O CSV mantém objetos e listas como texto JSON em uma célula.</p>
        </section>`;
    }
};
