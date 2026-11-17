// ./apoio/views_apoio_perfil.js - Aba "Informações pessoais" e modal de edição
Object.assign(window.ViewsApoio, {
    perfil() {
        return `
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0"><h2 class="text-lg font-extrabold text-slate-800">Minhas informações</h2>
                    <p class="text-xs text-slate-500">Seus dados de acesso e as áreas em que você está habilitado.</p></div>
                <button type="button" id="apoio-btn-editar-perfil" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700">Editar informações</button>
            </div>
            <dl id="apoio-perfil-dados" class="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2"></dl>
            <div class="mt-4"><h3 class="text-xs font-bold uppercase text-slate-500">Áreas habilitadas</h3><div id="apoio-perfil-areas" class="mt-1 flex flex-wrap gap-1.5"></div></div>
            <div class="mt-5"><h3 class="text-xs font-bold uppercase text-slate-500">Solicitações de outras áreas</h3><div id="apoio-perfil-solicitacoes" class="mt-1 space-y-1.5 text-sm"></div></div>
        </div>`;
    },

    modalPerfil() {
        const campo = 'mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal text-slate-800 disabled:bg-slate-100 disabled:text-slate-500';
        const rot = 'block text-xs font-bold text-slate-600';
        return `
        <div id="modal-apoio-perfil" class="hidden fixed inset-0 z-[110] items-center justify-center bg-slate-900/60 p-3" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-apoio-perfil">
            <div class="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <header class="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
                    <h2 id="titulo-modal-apoio-perfil" class="text-base font-extrabold text-slate-800">Editar informações</h2>
                    <button type="button" class="btn-fechar-apoio-perfil flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-400 hover:bg-slate-100" aria-label="Fechar">×</button>
                </header>
                <div class="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
                    <form id="form-apoio-dados" class="space-y-3" autocomplete="off">
                        <h3 class="text-xs font-bold uppercase text-slate-500">Dados de acesso</h3>
                        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label class="${rot}">Nome<input id="apoio-p-nome" type="text" class="${campo}" required></label>
                            <label class="${rot}">Sobrenome<input id="apoio-p-sobrenome" type="text" class="${campo}" required></label>
                        </div>
                        <label class="${rot}">E-mail de login<input id="apoio-p-email" type="email" class="${campo}"></label>
                        <p id="apoio-p-ajuda-email" class="text-[11px] text-slate-500">Para trocar o e-mail, informe também a senha atual. Enviaremos um link de confirmação ao novo endereço; suas designações e vínculos no sistema são mantidos.</p>
                        <div id="apoio-p-bloco-senha" class="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p class="text-xs font-bold text-slate-600">Senha <span class="font-normal text-slate-400">(a senha atual é exigida para trocar a senha ou o e-mail)</span></p>
                            <label class="${rot}">Senha atual<input id="apoio-p-senha-atual" type="password" class="${campo}" autocomplete="current-password"></label>
                            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label class="${rot}">Nova senha<input id="apoio-p-senha-nova" type="password" class="${campo}" minlength="6" autocomplete="new-password"></label>
                                <label class="${rot}">Confirmar nova senha<input id="apoio-p-senha-confirma" type="password" class="${campo}" minlength="6" autocomplete="new-password"></label>
                            </div>
                        </div>
                        <p id="apoio-p-aviso-google" class="hidden rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">Sua conta usa o login do Google: a senha é gerenciada pelo Google.</p>
                        <div class="flex justify-end"><button type="submit" class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Salvar dados</button></div>
                    </form>

                    <form id="form-apoio-areas" class="space-y-3 border-t border-slate-200 pt-4">
                        <h3 class="text-xs font-bold uppercase text-slate-500">Solicitar habilitação em outras áreas</h3>
                        <div id="apoio-p-areas-lista" class="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-slate-200 p-1"></div>
                        <label class="${rot}">Motivo da solicitação<textarea id="apoio-p-areas-motivo" rows="2" class="${campo}" placeholder="Ex.: cobertura de férias da área de ..."></textarea></label>
                        <p class="text-[11px] text-slate-500">A solicitação será avaliada por um Admin; você acompanha o resultado na aba Informações pessoais.</p>
                        <div class="flex justify-end"><button type="submit" class="rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-800">Enviar solicitação</button></div>
                    </form>
                </div>
            </div>
        </div>`;
    }
});
