// ./apoio/app_apoio_alteracoes.js - Lista de alterações: carga, filtros, renderização e marcação de SS/SGO
Object.assign(window.AppApoio, {
    _preencherFiltros() {
        const f = this.filtros, set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        set('apoio-f-situacao', f.situacao); set('apoio-f-acao', f.acao); set('apoio-f-tipo-data', f.tipoData);
        set('apoio-f-de', f.de); set('apoio-f-ate', f.ate); set('apoio-f-responsavel', f.responsavel);
        this._renderizarAreas();
    },

    _renderizarAreas() {
        const C = window.ControllerApoioAlteracoes, f = this.filtros, e = window.Util.esc;
        const minhas = new Set(C.areasDoUsuario().map(a => C._norm(a)));
        const todas = C.areasDisponiveis();
        C.areasDoUsuario().forEach(a => { if (!todas.some(x => C._norm(x) === C._norm(a)) && C._norm(a) !== 'todas') todas.push(a); });
        const marcadas = new Set(f.areas.map(a => C._norm(a)));
        const lista = document.getElementById('apoio-areas-lista');
        if (lista) lista.innerHTML = todas.length ? todas.map(a => {
            const ativa = f.areasTodas || marcadas.has(C._norm(a));
            return `<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50"><input type="checkbox" class="apoio-area-chk h-4 w-4 rounded border-slate-300" value="${e(a)}" ${ativa ? 'checked' : ''}><span class="min-w-0 flex-1 truncate">${e(a)}</span>${minhas.has(C._norm(a)) ? '<span class="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">minha</span>' : ''}</label>`;
        }).join('') : '<p class="p-2 text-xs text-slate-400">Nenhuma área cadastrada.</p>';
        const resumo = document.getElementById('apoio-f-areas-resumo');
        if (resumo) resumo.textContent = f.areasTodas ? 'Todas' : (f.areas.length ? f.areas.join(', ') : 'Nenhuma');
    },

    _lerFiltros() {
        const v = id => document.getElementById(id)?.value ?? '';
        Object.assign(this.filtros, { situacao: v('apoio-f-situacao') || 'Pendente', acao: v('apoio-f-acao'), tipoData: v('apoio-f-tipo-data') || 'encontro', de: v('apoio-f-de'), ate: v('apoio-f-ate'), responsavel: v('apoio-f-responsavel') });
    },

    async carregarAlteracoes() {
        const C = window.ControllerApoioAlteracoes, lista = document.getElementById('apoio-lista');
        if (lista) lista.innerHTML = '<p class="p-6 text-center text-sm text-slate-400">Carregando alterações…</p>';
        try {
            let desde = C.desdePadraoISO();
            if (this.filtros.tipoData === 'alteracao' && this.filtros.de) { const d = new Date(`${this.filtros.de}T00:00:00`); if (d.toISOString() < desde) desde = d.toISOString(); }
            this.itens = await C.carregar(desde); this.carregadoDesde = desde;
            this.limite = 60; this.recalcular();
            await this._excluirDescartadas();
        } catch (err) {
            if (lista) lista.innerHTML = '<p class="p-6 text-center text-sm text-rose-600">Não foi possível carregar as alterações.</p>';
            await window.Dialog.erro(err, 'Erro ao carregar alterações');
        }
    },

    recalcular() {
        const C = window.ControllerApoioAlteracoes;
        this.itens.forEach(i => C.enriquecer(i));
        this.classe = C.classificar(this.itens);
        // opções de "Realizado por" a partir do que foi carregado
        const sel = document.getElementById('apoio-f-responsavel');
        if (sel) {
            const atual = this.filtros.responsavel, e = window.Util.esc;
            sel.innerHTML = '<option value="">Todos</option>' + C.responsaveis(this.itens).map(r => `<option value="${e(r.email)}">${e(r.nome)}</option>`).join('');
            sel.value = atual;
        }
        this.renderizarLista();
    },

    // Alterações anuladas (exclusão + inclusão idênticas) e duplicadas não têm utilidade: são APAGADAS do banco, sem ficarem
    // no histórico. Só quem pode marcar SS/SGO faz a limpeza (o servidor só permite apagar itens pendentes e sem marcação).
    async _excluirDescartadas() {
        const C = window.ControllerApoioAlteracoes;
        if (!C.podeAlterarFlags() || !this.classe) return;
        const descartadas = [...this.classe.anulados, ...this.classe.duplicados];
        if (!descartadas.length) return;
        try {
            const removidos = await C.excluirDescartadas(descartadas);
            if (removidos.size) { this.itens = this.itens.filter(i => !removidos.has(i.docId) || i.virtual); this.recalcular(); }
        } catch (err) { console.warn('[Apoio] Limpeza de alterações anuladas/duplicadas não concluída:', err); }
    },

    renderizarLista() {
        const C = window.ControllerApoioAlteracoes, f = this.filtros, e = window.Util.esc;
        const lista = document.getElementById('apoio-lista'), resumo = document.getElementById('apoio-resumo');
        if (!lista || !this.classe) return;
        const podeAlterar = C.podeAlterarFlags();
        const base = C.filtrar(this.classe.ativos, { ...f, situacao: 'Todas' });
        const pend = base.filter(i => i.situacao === 'Pendente').length, real = base.length - pend;
        const visiveis = C.ordenar(C.filtrar(this.classe.ativos, f));
        if (resumo) resumo.innerHTML = `<span class="rounded-full bg-amber-100 px-2.5 py-1 font-bold text-amber-800">${pend} pendente(s)</span><span class="rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">${real} realizada(s)</span>`
            + (podeAlterar ? '' : '<span class="font-semibold text-slate-400">Somente leitura: apenas Apoio, Técnico e Admin marcam SS/SGO.</span>');
        if (!visiveis.length) {
            lista.innerHTML = `<div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">${f.situacao === 'Pendente' ? 'Nenhuma alteração pendente para os filtros escolhidos. 🎉' : 'Nenhuma alteração encontrada para os filtros escolhidos.'}</div>`;
            return;
        }
        const mostrar = visiveis.slice(0, this.limite);
        const html = mostrar.map(i => window.ViewsApoio.cartaoAlteracao(i, { podeAlterar })).join('');
        const mais = visiveis.length > this.limite ? `<div class="col-span-full text-center"><button type="button" id="apoio-mostrar-mais" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Mostrar mais (${visiveis.length - this.limite} restantes)</button></div>` : '';
        lista.innerHTML = `<div class="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">${html}${mais}</div>`;
    },

    async _cliquesAlteracoes(e) {
        const t = e.target;
        if (t.closest('#apoio-btn-atualizar')) { this._lerFiltros(); await this.carregarAlteracoes(); window.Util.toast('Lista atualizada.', { grupo: 'apoio-lista', duracao: 1800 }); return true; }
        if (t.closest('#apoio-btn-limpar-filtros')) { const padrao = window.ControllerApoioAlteracoes.areasPadrao(); this.filtros = { situacao: 'Pendente', acao: '', tipoData: 'encontro', de: '', ate: '', responsavel: '', areasTodas: padrao.todas, areas: [...padrao.areas] }; this._preencherFiltros(); this.renderizarLista(); return true; }
        if (t.closest('#apoio-areas-minhas')) { const padrao = window.ControllerApoioAlteracoes.areasPadrao(); this.filtros.areasTodas = padrao.todas; this.filtros.areas = [...padrao.areas]; this._renderizarAreas(); this.renderizarLista(); return true; }
        if (t.closest('#apoio-areas-todas')) { this.filtros.areasTodas = true; this.filtros.areas = []; this._renderizarAreas(); this.renderizarLista(); return true; }
        if (t.closest('#apoio-mostrar-mais')) { this.limite += 60; this.renderizarLista(); return true; }
        return false;
    },

    async _mudancasAlteracoes(e) {
        const t = e.target;
        if (t.classList?.contains('apoio-flag')) { await this._alternarFlag(t); return true; }
        if (t.classList?.contains('apoio-area-chk')) {
            const todas = [...document.querySelectorAll('.apoio-area-chk')], marcadas = todas.filter(c => c.checked).map(c => c.value);
            this.filtros.areasTodas = marcadas.length === todas.length; this.filtros.areas = this.filtros.areasTodas ? [] : marcadas;
            this._renderizarAreas(); this.renderizarLista(); return true;
        }
        if (t.id && t.id.startsWith('apoio-f-')) {
            const antes = this.filtros.tipoData + this.filtros.de;
            this._lerFiltros();
            // Pediu uma data de alteração anterior à janela carregada: busca novamente com o novo início.
            if (this.filtros.tipoData + this.filtros.de !== antes && this.filtros.tipoData === 'alteracao' && this.filtros.de && new Date(`${this.filtros.de}T00:00:00`).toISOString() < (this.carregadoDesde || '')) await this.carregarAlteracoes();
            else { this.limite = 60; this.renderizarLista(); }
            return true;
        }
        return false;
    },

    // SS/SGO: grava na hora; em caso de falha a caixa volta ao estado anterior e o motivo é explicado.
    async _alternarFlag(input) {
        const C = window.ControllerApoioAlteracoes, item = this.itens.find(i => i.id === input.dataset.id);
        if (!item) return;
        const flag = input.dataset.flag, valor = input.checked;
        if (this._salvandoFlag) { input.checked = !valor; return; }
        this._salvandoFlag = true; input.disabled = true;
        try {
            await C.alternarFlag(item, flag, valor);
            const rotulo = `${item.dados.uc_referencia || 'encontro'} de ${window.Util.dataBR(item.dados.data)}`;
            window.Util.toast(`${flag} ${valor ? 'marcado' : 'desmarcado'} — ${rotulo}.`, { grupo: 'apoio-flag', acao: { texto: 'Desfazer', fn: () => this._desfazerFlag(item.id, flag, !valor) } });
        } catch (err) {
            input.checked = !valor;
            await window.Dialog.erro(err?.code === 'permission-denied' ? 'O Firebase recusou a gravação para o seu usuário. Confirme com um Admin se as regras do Firestore mais recentes estão publicadas e se o seu cargo permite marcar SS/SGO.' : err, `Não foi possível ${valor ? 'marcar' : 'desmarcar'} ${flag}`);
        } finally { this._salvandoFlag = false; }
        this.recalcular();
    },

    async _desfazerFlag(id, flag, valor) {
        const item = this.itens.find(i => i.id === id); if (!item) return;
        try { await window.ControllerApoioAlteracoes.alternarFlag(item, flag, valor); window.Util.toast(`${flag} restaurado.`, { grupo: 'apoio-flag' }); this.recalcular(); }
        catch (err) { await window.Dialog.erro(err, 'Não foi possível desfazer'); }
    }
});
