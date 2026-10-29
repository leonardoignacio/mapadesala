// Barras de progresso por UC (total previsto, distribuídos e faltantes) usadas na distribuição,
// no encontro individual e na edição em lote.
Object.assign(window.AppEspelho, {
    // Três barras: total previsto, já distribuídos e faltam distribuir.
    _htmlBarrasProgresso(total, feitos) {
        const f = Math.min(total, feitos), faltam = Math.max(0, total - f);
        const pct = total ? Math.round(f / total * 100) : 0, pctFalta = total ? 100 - pct : 0;
        const barras = [
            ['Total previsto', total ? 100 : 0, `${total} encontro(s) previstos`, 'bg-slate-400'],
            ['Já distribuídos', pct, `${f} de ${total} · ${pct}%`, 'bg-emerald-500'],
            ['Faltam distribuir', pctFalta, `${faltam} de ${total} · ${pctFalta}%`, 'bg-indigo-500']
        ];
        return barras.map(([rotulo, p, texto, cor]) => `<div><div class="mb-1 flex justify-between gap-2 text-[11px]"><span class="font-semibold text-slate-600">${rotulo}</span><span class="text-slate-500">${texto}</span></div><div class="h-2 overflow-hidden rounded-full bg-slate-200"><div class="h-full ${cor} transition-all duration-300" style="width:${p}%"></div></div></div>`).join('');
    },

    // Situação de uma UC na turma. "ignorarIds" são encontros que serão substituídos; "adicionar" é quantos entram.
    _resumoUC(turma, idUC, ch, { ignorarIds = new Set(), adicionar = 0 } = {}) {
        const uc = (turma?.ucs || []).find(u => (u.id_uc_base || u.id) === idUC);
        if (!uc) return null;
        const total = this._totalEncontrosComCH(uc, turma, ch);
        const atuais = this.encontros.filter(e => e.id_turma === turma.id && e.id_uc === idUC && e.tipo !== 'cancelamento');
        const feitos = atuais.length, projetado = atuais.filter(e => !ignorarIds.has(e.id)).length + adicionar;
        return { uc, total, feitos, projetado, faltamProj: Math.max(0, total - projetado), excede: total > 0 && projetado > total };
    },

    _htmlProjecao(r, rotulo) {
        if (r.projetado === r.feitos) return '';
        const cor = r.excede ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-200 bg-blue-50 text-blue-800';
        const texto = r.excede
            ? `${rotulo}: ${r.projetado} de ${r.total} — ultrapassa o previsto em ${r.projetado - r.total} encontro(s).`
            : `${rotulo}: ${r.projetado} de ${r.total} distribuídos · faltarão ${r.faltamProj}.`;
        return `<p class="rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${cor}">${texto}</p>`;
    },

    _htmlAvisoProgresso(texto) {
        return `<p class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">${texto}</p>`;
    },

    // Encontro individual (adicionar/editar uma data).
    _renderizarProgressoEncontro() {
        const out = document.getElementById('encontro-progresso-uc'), turma = this.turmaEdicao;
        if (!out || !turma) return;
        const cancelamento = document.getElementById('encontro-tipo')?.value === 'cancelamento';
        const idUC = document.getElementById('encontro-uc')?.value || '';
        if (cancelamento) { out.innerHTML = ''; return; }
        if (!idUC) { out.innerHTML = this._htmlAvisoProgresso('Selecione a UC para ver quantos encontros foram distribuídos e quantos faltam.'); return; }
        const ch = Number(document.getElementById('encontro-ch')?.value) || 0;
        const idEnc = document.getElementById('encontro-id')?.value || '';
        const r = this._resumoUC(turma, idUC, ch, { ignorarIds: new Set(idEnc ? [idEnc] : []), adicionar: 1 });
        if (!r) { out.innerHTML = ''; return; }
        if (!r.total) { out.innerHTML = this._htmlAvisoProgresso('Informe um horário válido para calcular o total previsto de encontros desta UC.'); return; }
        out.innerHTML = this._htmlBarrasProgresso(r.total, r.feitos) + this._htmlProjecao(r, 'Ao salvar este encontro');
    },

    // Edição em lote: todos os alvos selecionados passam a pertencer à UC escolhida.
    _renderizarProgressoLote() {
        const out = document.getElementById('lote-progresso-uc');
        const turma = this.turmas.find(t => t.id === this.turmaEdicaoLote);
        if (!out || !turma) return;
        const cancelamento = document.getElementById('lote-tipo')?.value === 'cancelamento';
        const idUC = document.getElementById('lote-uc')?.value || '';
        if (cancelamento) { out.innerHTML = ''; return; }
        if (!idUC) { out.innerHTML = this._htmlAvisoProgresso('Selecione a UC para ver quantos encontros foram distribuídos e quantos faltam.'); return; }
        const alvos = [...this.alvosEdicaoLote.values()].filter(a => a.id_turma === turma.id);
        const ch = Number(document.getElementById('lote-ch')?.value) || 0;
        const r = this._resumoUC(turma, idUC, ch, { ignorarIds: new Set(alvos.filter(a => a.id).map(a => a.id)), adicionar: alvos.length });
        if (!r) { out.innerHTML = ''; return; }
        if (!r.total) { out.innerHTML = this._htmlAvisoProgresso('Informe um horário válido para calcular o total previsto de encontros desta UC.'); return; }
        out.innerHTML = this._htmlBarrasProgresso(r.total, r.feitos) + this._htmlProjecao(r, `Ao aplicar aos ${alvos.length} selecionado(s)`);
    }
});
