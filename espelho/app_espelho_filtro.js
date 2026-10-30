// Filtro de encontros por UC e/ou docente em uma turma (um filtro por vez; oculta as demais turmas do período).
Object.assign(window.AppEspelho, {
    filtroTurma: null,

    _chaveDocenteFiltro(d) { return (d?.id || this._norm(d?.email || d?.nome || '')).toString(); },

    // UC E docente (quando ambos informados); dentro de cada grupo vale qualquer item marcado.
    _encontroPassaFiltro(e, turma) {
        const f = this.filtroTurma;
        if (!f || !turma || f.idTurma !== turma.id) return true;
        if (e.tipo === 'cancelamento') return false;
        const okUC = !f.ucs.size || f.ucs.has(e.id_uc);
        const okDoc = !f.docentes.size || (e.docentes || []).some(d => f.docentes.has(this._chaveDocenteFiltro(d)));
        return okUC && okDoc;
    },

    abrirFiltroTurma(idTurma) {
        const turma = this.turmas.find(t => t.id === idTurma), modal = document.getElementById('modal-filtro-turma');
        if (!turma || !modal) return;
        this.turmaFiltro = turma;
        const excluidos = this._idsSubstituidos();
        const encontros = this.encontros.filter(e => e.id_turma === idTurma && e.tipo !== 'cancelamento' && !excluidos.has(e.id));
        const atual = this.filtroTurma?.idTurma === idTurma ? this.filtroTurma : { ucs: new Set(), docentes: new Set() };

        const ucs = this._ucsOrdenadas(turma).map(u => ({ id: u.id_uc_base || u.id, rotulo: `${u.referencia} — ${u.titulo}`, n: encontros.filter(e => e.id_uc === (u.id_uc_base || u.id)).length })).filter(u => u.n > 0);
        const docs = new Map();
        encontros.forEach(e => (e.docentes || []).forEach(d => {
            const k = this._chaveDocenteFiltro(d); if (!k) return;
            const x = docs.get(k) || { id: k, rotulo: d.nome || d.email || 'Docente', n: 0 }; x.n++; docs.set(k, x);
        }));
        const docentes = [...docs.values()].sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));

        const linha = (classe, item, marcado) => `<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50"><input type="checkbox" class="${classe} h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-700" value="${this._html(item.id)}" ${marcado ? 'checked' : ''}><span class="min-w-0 flex-1 truncate" title="${this._html(item.rotulo)}">${this._html(item.rotulo)}</span><span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">${item.n}</span></label>`;
        const vazio = '<p class="p-3 text-center text-xs text-slate-400">Nenhum encontro lançado nesta turma.</p>';
        document.getElementById('filtro-turma-ucs').innerHTML = ucs.length ? ucs.map(u => linha('filtro-turma-uc', u, atual.ucs.has(u.id))).join('') : vazio;
        document.getElementById('filtro-turma-docentes').innerHTML = docentes.length ? docentes.map(d => linha('filtro-turma-doc', d, atual.docentes.has(d.id))).join('') : vazio;
        document.getElementById('subtitulo-modal-filtro-turma').textContent = `Turma ${turma.referencia}`;
        modal.classList.remove('hidden'); modal.classList.add('flex');
    },

    aplicarFiltroTurma() {
        const turma = this.turmaFiltro; if (!turma) return;
        const ucs = new Set([...document.querySelectorAll('.filtro-turma-uc:checked')].map(c => c.value));
        const docentes = new Set([...document.querySelectorAll('.filtro-turma-doc:checked')].map(c => c.value));
        this.filtroTurma = (ucs.size || docentes.size) ? { idTurma: turma.id, ucs, docentes } : null;
        if (this.filtroTurma) this.periodoMapa = this._grupoPeriodo(turma);
        this.fecharModal('modal-filtro-turma'); this.renderizarMapa(); this._registrarDragDrop();
    },

    limparFiltroTurma() {
        this.filtroTurma = null;
        this.fecharModal('modal-filtro-turma'); this.renderizarMapa(); this._registrarDragDrop();
    }
});
