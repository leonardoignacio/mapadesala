// ./dialog.js - Caixas de mensagem e confirmação modais (substituem alert() e confirm())
// Uso:
//   await Dialog.sucesso('Salvo com sucesso!');
//   await Dialog.erro(err);                        // aceita Error ou texto
//   await Dialog.aviso('Selecione um curso.');
//   if (await Dialog.confirmar('Excluir?', { perigo: true, textoConfirmar: 'Excluir' })) { ... }
window.Dialog = {
    _fila: [],
    _aberto: false,

    _tipos: {
        sucesso: { titulo: 'Tudo certo', icone: 'bg-emerald-100 text-emerald-600', botao: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300',
            svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>' },
        erro: { titulo: 'Não foi possível concluir', icone: 'bg-rose-100 text-rose-600', botao: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-300',
            svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>' },
        aviso: { titulo: 'Atenção', icone: 'bg-amber-100 text-amber-600', botao: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-300',
            svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>' },
        info: { titulo: 'Informação', icone: 'bg-blue-100 text-blue-600', botao: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300',
            svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>' },
        perigo: { titulo: 'Confirmar exclusão', icone: 'bg-rose-100 text-rose-600', botao: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-300',
            svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>' }
    },

    _inferirTipo(msg) {
        const t = (msg || '').toString().toLowerCase();
        if (/sucesso|conclu[ií]d|salvo|cadastrad|atualizad|exclu[ií]d|enviad|vinculad|removid/.test(t)) return 'sucesso';
        if (/^erro|erro ao|falha|n[aã]o foi poss[ií]vel|negado|inv[aá]lid/.test(t)) return 'erro';
        if (/selecione|preencha|informe|restrito|somente leitura|n[aã]o possui|n[aã]o pode|n[aã]o permitid|obrigat[oó]ri|aguardando/.test(t)) return 'aviso';
        return 'info';
    },

    _textoDe(msgOuErro) {
        if (msgOuErro instanceof Error || (msgOuErro && typeof msgOuErro === 'object' && ('message' in msgOuErro || 'code' in msgOuErro))) {
            return window.Util.mensagemErro(msgOuErro);
        }
        return (msgOuErro ?? '').toString();
    },

    // ---- API pública -------------------------------------------------------
    alerta(mensagem, opcoes = {}) {
        const texto = this._textoDe(mensagem);
        const tipo = opcoes.tipo || this._inferirTipo(texto);
        return this._enfileirar({ modo: 'alerta', texto, tipo, titulo: opcoes.titulo, textoConfirmar: opcoes.textoConfirmar || 'Entendi' });
    },
    sucesso(mensagem, titulo) { return this.alerta(mensagem, { tipo: 'sucesso', titulo }); },
    erro(mensagem, titulo) { return this.alerta(mensagem, { tipo: 'erro', titulo }); },
    aviso(mensagem, titulo) { return this.alerta(mensagem, { tipo: 'aviso', titulo }); },
    info(mensagem, titulo) { return this.alerta(mensagem, { tipo: 'info', titulo }); },

    // Retorna Promise<boolean>.
    confirmar(mensagem, opcoes = {}) {
        const tipo = opcoes.perigo ? 'perigo' : (opcoes.tipo || 'aviso');
        return this._enfileirar({
            modo: 'confirmar', texto: this._textoDe(mensagem), tipo, titulo: opcoes.titulo,
            textoConfirmar: opcoes.textoConfirmar || 'Confirmar', textoCancelar: opcoes.textoCancelar || 'Cancelar'
        });
    },

    // ---- Implementação -----------------------------------------------------
    _enfileirar(cfg) {
        return new Promise(resolve => {
            this._fila.push({ cfg, resolve });
            if (!this._aberto) this._proximo();
        });
    },

    _proximo() {
        const item = this._fila.shift();
        if (!item) { this._aberto = false; return; }
        this._aberto = true;
        this._montar(item);
    },

    _montar({ cfg, resolve }) {
        const visual = this._tipos[cfg.tipo] || this._tipos.info;
        const ehConfirmacao = cfg.modo === 'confirmar';
        const anterior = document.activeElement;

        const overlay = document.createElement('div');
        overlay.setAttribute('role', ehConfirmacao ? 'alertdialog' : 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'app-dialog-titulo');
        overlay.setAttribute('aria-describedby', 'app-dialog-msg');
        overlay.id = 'app-dialog';
        overlay.className = 'fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-slate-900/50';
        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden fade-in" data-dialog-caixa>
                <div class="p-6 flex gap-4">
                    <div class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${visual.icone}">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${visual.svg}</svg>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h3 id="app-dialog-titulo" class="text-base font-extrabold text-slate-800"></h3>
                        <p id="app-dialog-msg" class="mt-1 text-sm leading-relaxed text-slate-600 whitespace-pre-line break-words max-h-[50vh] overflow-y-auto"></p>
                    </div>
                </div>
                <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    ${ehConfirmacao ? '<button type="button" data-dialog-cancelar class="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-slate-300"></button>' : ''}
                    <button type="button" data-dialog-ok class="px-5 py-2.5 rounded-lg text-white text-sm font-bold shadow-sm transition focus:outline-none focus:ring-2 ${visual.botao}"></button>
                </div>
            </div>`;

        // Textos entram via textContent: nunca interpretados como HTML.
        overlay.querySelector('#app-dialog-titulo').textContent = cfg.titulo || visual.titulo;
        overlay.querySelector('#app-dialog-msg').textContent = cfg.texto;
        const btnOk = overlay.querySelector('[data-dialog-ok]');
        const btnCancelar = overlay.querySelector('[data-dialog-cancelar]');
        btnOk.textContent = cfg.textoConfirmar;
        if (btnCancelar) btnCancelar.textContent = cfg.textoCancelar;

        let encerrado = false;
        const encerrar = (resultado) => {
            if (encerrado) return;
            encerrado = true;
            document.removeEventListener('keydown', aoTeclar, true);
            overlay.remove();
            try { if (anterior && typeof anterior.focus === 'function' && document.contains(anterior)) anterior.focus(); } catch (_) {}
            resolve(ehConfirmacao ? resultado : undefined);
            this._proximo();
        };

        const aoTeclar = (ev) => {
            if (ev.key === 'Escape') {
                ev.preventDefault(); ev.stopImmediatePropagation();
                encerrar(false);
            } else if (ev.key === 'Tab') {
                // Mantém o foco preso dentro da caixa de diálogo.
                const focaveis = [btnCancelar, btnOk].filter(Boolean);
                const idx = focaveis.indexOf(document.activeElement);
                ev.preventDefault();
                const prox = ev.shiftKey ? (idx <= 0 ? focaveis.length - 1 : idx - 1) : (idx + 1) % focaveis.length;
                focaveis[prox].focus();
            }
        };
        document.addEventListener('keydown', aoTeclar, true);

        btnOk.addEventListener('click', (ev) => { ev.stopPropagation(); encerrar(true); });
        if (btnCancelar) btnCancelar.addEventListener('click', (ev) => { ev.stopPropagation(); encerrar(false); });
        // Clique fora da caixa = cancelar (para alertas, apenas fecha).
        overlay.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (ev.target === overlay) encerrar(false);
        });

        document.body.appendChild(overlay);
        // Exclusões: foco inicial em "Cancelar" para evitar confirmação acidental com Enter.
        (cfg.tipo === 'perigo' && btnCancelar ? btnCancelar : btnOk).focus();
    }
};
