// ./apoio/app_apoio_mapa.js - Agenda semanal de salas e alteração de estados operacionais
(() => {
    const A = window.AppApoio;
    if (!A) return;
    A.semanaMapaSalas = 0;
    A._cacheMapaSalas = null;

    A._intervaloMapaSalas = function () {
        const D = window.ControllerDashboard, inicio = D._addDays(D._segunda(D._dataLocal()), this.semanaMapaSalas * 7);
        return { inicio, fim: D._addDays(inicio, 5), dias: Array.from({ length: 6 }, (_, i) => D._addDays(inicio, i)) };
    };
    A._renderizarMapaSalas = async function (forcar = false) {
        const box = document.getElementById('apoio-mapa-salas-conteudo');
        if (!box) return;
        const D = window.ControllerDashboard, C = window.ControllerApoioMapa, r = this._intervaloMapaSalas(),
            label = document.getElementById('apoio-mapa-semana-label');
        if (label) label.textContent = D.formatarSemana(r.inicio, r.fim);
        box.innerHTML = '<div class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Carregando mapa de salas…</div>';
        try {
            await window.Store.garantirPronto();
            const salas = [...(window.Store.dados.salas || [])].sort((a, b) => (a.referencia || a.nome || '').localeCompare(b.referencia || b.nome || '', 'pt-BR', { sensitivity: 'base' }));
            const [statuses] = await Promise.all([C.carregar(r.inicio, r.fim, forcar)]);
            const ocupacoes = C.mapearOcupacoes(salas, window.Store.dados.encontros || [], r.inicio, r.fim);
            box.innerHTML = window.ViewsApoioMapa.renderizarGrade({ dias: r.dias, inicio: r.inicio, salas, ocupacoes, statuses, podeEditar: C.podeEditar() });
        } catch (err) {
            box.innerHTML = `<div class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">${window.Util.esc(err.message || 'Não foi possível carregar o mapa de salas.')}</div>`;
        }
    };
    A._abrirModalMapaSala = function (botao) {
        const modal = document.getElementById('apoio-modal-mapa-sala'), sala = (window.Store.dados.salas || []).find(x => String(x.id) === String(botao.dataset.sala));
        if (!modal || !sala) return;
        document.getElementById('apoio-mapa-sala-id').value = sala.id;
        document.getElementById('apoio-mapa-data').value = botao.dataset.data || '';
        document.getElementById('apoio-mapa-periodo').value = botao.dataset.periodo || '';
        document.getElementById('apoio-mapa-status-select').value = botao.dataset.status || 'Disponível';
        document.getElementById('apoio-mapa-descricao').value = botao.dataset.descricao || '';
        document.getElementById('apoio-mapa-modal-contexto').textContent = `${sala.referencia || sala.nome || 'Sala'} · ${window.Util.dataBR(botao.dataset.data)} · ${botao.dataset.periodo}`;
        this._atualizarAjudaMapaSala();
        modal.classList.remove('hidden'); modal.classList.add('flex');
        document.getElementById('apoio-mapa-status-select')?.focus({ preventScroll: true });
    };
    A._fecharModalMapaSala = function () {
        const modal = document.getElementById('apoio-modal-mapa-sala');
        modal?.classList.add('hidden'); modal?.classList.remove('flex');
    };
    A._atualizarAjudaMapaSala = function () {
        const alocada = document.getElementById('apoio-mapa-status-select')?.value === 'Alocada', campo = document.getElementById('apoio-mapa-descricao');
        if (campo) { campo.required = alocada; campo.disabled = document.getElementById('apoio-mapa-status-select')?.value === 'Disponível'; if (campo.disabled) campo.value = ''; }
    };
    A._mostrarStatusMapaSala = function (mensagem, erro = false) {
        const el = document.getElementById('apoio-mapa-status'); if (!el) return;
        el.textContent = mensagem;
        el.className = `mb-2 rounded-lg border px-3 py-2 text-xs ${erro ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`;
        clearTimeout(this._mapaStatusTimer); this._mapaStatusTimer = setTimeout(() => el.classList.add('hidden'), 8000);
    };
    A._salvarStatusMapaSala = async function (event) {
        event.preventDefault();
        const form = event.currentTarget, btn = form.querySelector('button[type="submit"]');
        if (btn?.disabled) return true;
        if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
        try {
            const salaId = document.getElementById('apoio-mapa-sala-id').value, sala = (window.Store.dados.salas || []).find(x => String(x.id) === String(salaId));
            if (!sala) throw new Error('A sala não está mais cadastrada. Atualize a tela.');
            await window.ControllerApoioMapa.salvar({
                sala_id: salaId, sala_referencia: sala.referencia || sala.nome || '',
                data: document.getElementById('apoio-mapa-data').value,
                periodo: document.getElementById('apoio-mapa-periodo').value,
                status: document.getElementById('apoio-mapa-status-select').value,
                descricao: document.getElementById('apoio-mapa-descricao').value
            });
            this._fecharModalMapaSala();
            await this._renderizarMapaSalas(true);
            this._mostrarStatusMapaSala('Status da sala atualizado.');
        } catch (err) {
            this._mostrarStatusMapaSala(err.message || 'Não foi possível salvar o status da sala.', true);
        } finally { if (btn?.isConnected) { btn.disabled = false; btn.textContent = 'Salvar status'; } }
        return true;
    };
    A._tratarCliquesMapaSalas = async function (event) {
        const t = event.target, btn = t.closest('button');
        if (t.closest('.tab-btn[data-target="tab-apoio-mapa-salas"], .tab-btn[data-target="tab-dashboard-mapa-salas"]')) { await this._renderizarMapaSalas(); return false; }
        if (!btn) {
            if (t.id === 'apoio-modal-mapa-sala') { this._fecharModalMapaSala(); return true; }
            return false;
        }
        if (btn.id === 'apoio-mapa-anterior') { this.semanaMapaSalas--; await this._renderizarMapaSalas(true); return true; }
        if (btn.id === 'apoio-mapa-proxima') { this.semanaMapaSalas++; await this._renderizarMapaSalas(true); return true; }
        if (btn.id === 'apoio-mapa-hoje') { this.semanaMapaSalas = 0; await this._renderizarMapaSalas(true); return true; }
        if (btn.id === 'apoio-mapa-atualizar') { await this._renderizarMapaSalas(true); return true; }
        if (btn.id === 'apoio-mapa-imprimir') { document.body.classList.add('print-room-map'); window.addEventListener('afterprint',()=>document.body.classList.remove('print-room-map'),{once:true}); window.print(); return true; }
        if (btn.classList.contains('apoio-mapa-fechar')) { this._fecharModalMapaSala(); return true; }
        return false;
    };

    const tratarCliquesAnterior = A.tratarCliques.bind(A);
    A.tratarCliques = async function (event) {
        if (await this._tratarCliquesMapaSalas(event)) return true;
        if (!this._montada()) return false;
        return tratarCliquesAnterior(event);
    };
    const tratarSubmitsAnterior = A.tratarSubmits.bind(A);
    A.tratarSubmits = async function (event) {
        if (event.target?.id === 'apoio-mapa-form') return this._salvarStatusMapaSala(event);
        return tratarSubmitsAnterior(event);
    };
    const tratarMudancasAnterior = A.tratarMudancas.bind(A);
    A.tratarMudancas = async function (event) {
        if (event.target?.id === 'apoio-mapa-status-select') { this._atualizarAjudaMapaSala(); return true; }
        return tratarMudancasAnterior(event);
    };
    const atualizarSuaveAnterior = A.atualizarSuave.bind(A);
    A.atualizarSuave = function () {
        const painel = document.getElementById('tab-apoio-mapa-salas');
        if (painel && !painel.classList.contains('hidden')) { this._renderizarMapaSalas(true); return; }
        return atualizarSuaveAnterior();
    };

    const abrirCartaoMapa = event => {
        const card = event.target.closest('.ap-mapa-sala-card-editable');
        if (!card || !window.ControllerApoioMapa.podeEditar()) return;
        event.preventDefault();
        A._abrirModalMapaSala(card);
    };
    document.addEventListener('dblclick', abrirCartaoMapa);
    document.addEventListener('keydown', event => {
        if (!['Enter', ' '].includes(event.key) || !event.target.matches('.ap-mapa-sala-card-editable')) return;
        event.preventDefault();
        if (window.ControllerApoioMapa.podeEditar()) A._abrirModalMapaSala(event.target);
    });
})();
