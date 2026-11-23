// ./docente/app_docente_filtros.js - Filtros compartilhados da Área Docente
(() => {
    const A = window.AppDocente;
    if (!A) return;

    A.filtrosPorAba = {};
    A._tabFiltro = { calendario: 'docente-tab-calendario', escala: 'docente-tab-escala', planejamento: 'docente-tab-planejamento', ferias: 'docente-tab-ferias' };
    A._gruposFiltro = { areas: [], docentes: [], dias: [], periodos: [] };

    A._docentesDisponiveis = function () { return window.ControllerDocente.obterDocentes(); };
    A._idDocenteFiltro = function (d) { return String(d.id || d.email || ''); };
    A._defaultsFiltro = function (tab) {
        const cargo = window.usuarioAtual?.cargo || '', docs = this._docentesDisponiveis();
        const areasExistentes = [...new Set(docs.flatMap(d => this._areasDocente(d)))];
        const areasUsuario = this._areasUsuario();
        const areas = areasUsuario.some(x => this._norm(x) === 'todas') ? areasExistentes : areasExistentes.filter(a => areasUsuario.some(x => this._norm(x) === this._norm(a)));
        let docentes = docs.filter(d => this._areasCompat(areas, this._areasDocente(d))).map(d => this._idDocenteFiltro(d));
        if (!areas.length && !areasUsuario.length) docentes = docs.map(d => this._idDocenteFiltro(d));
        if (cargo === 'docente' && ['docente-tab-calendario', 'docente-tab-planejamento'].includes(tab)) {
            const self = docs.find(d => window.ControllerDocente.corresponde(d, this._proprioDocente()));
            docentes = self ? [this._idDocenteFiltro(self)] : [];
        }
        return { areas, docentes, dias: [1, 2, 3, 4, 5, 6], periodos: ['manha', 'tarde', 'noite'], busca: '', anoAquisitivo: 'todos' };
    };
    A._filtroAba = function (tab = this._tabAtiva()) {
        if (!this.filtrosPorAba[tab]) this.filtrosPorAba[tab] = this._defaultsFiltro(tab);
        return this.filtrosPorAba[tab];
    };
    A._docentesFiltrados = function (tab = this._tabAtiva()) {
        const f = this._filtroAba(tab), cargo = window.usuarioAtual?.cargo || '';
        let docs = this._docentesDisponiveis().filter(d => {
            const id = this._idDocenteFiltro(d), areas = this._areasDocente(d);
            const areaOk = !f.areas.length || areas.some(a => f.areas.some(x => this._norm(x) === this._norm(a)));
            const docenteOk = !f.docentes.length ? false : f.docentes.includes(id);
            const nome = d.nome_completo || [d.nome, d.sobrenome].filter(Boolean).join(' ') || d.email || '';
            const buscaOk = !f.busca || this._norm(`${nome} ${areas.join(' ')}`).includes(this._norm(f.busca));
            return areaOk && docenteOk && buscaOk;
        });
        if (cargo === 'docente' && tab === 'docente-tab-planejamento') docs = docs.filter(d => window.ControllerDocente.corresponde(d, this._proprioDocente()));
        return docs;
    };
    A._filtrosAtivos = function (tab = this._tabAtiva()) {
        const atual = this._filtroAba(tab), padrao = this._defaultsFiltro(tab);
        const iguais = (a, b) => [...a].sort().join('|') === [...b].sort().join('|');
        return !iguais(atual.areas, padrao.areas) || !iguais(atual.docentes, padrao.docentes) || !iguais(atual.dias, padrao.dias) || !iguais(atual.periodos, padrao.periodos) || atual.busca !== padrao.busca || atual.anoAquisitivo !== padrao.anoAquisitivo;
    };
    A._atualizarBotaoFiltro = function () {
        const btn = document.getElementById('docente-btn-filtros'), icon = document.getElementById('docente-icone-filtros');
        if (!btn || !icon) return;
        const ativo = this._filtrosAtivos();
        icon.innerHTML = ativo
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5Z"/><path d="m17 17 5 5m0-5-5 5"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5Z"/></svg>';
        btn.title = ativo ? 'Remover filtros personalizados' : 'Abrir filtros';
        btn.setAttribute('aria-label', btn.title);
        btn.classList.toggle('border-blue-300', ativo); btn.classList.toggle('bg-blue-50', ativo); btn.classList.toggle('text-blue-700', ativo);
    };
    A._renderModalFiltros = function () {
        const box = document.getElementById('docente-filtros-conteudo');
        if (!box) return;
        const tab = this._tabAtiva(), f = this._filtroAba(tab), cargo = window.usuarioAtual?.cargo || '';
        const isFerias = tab === 'docente-tab-ferias', isPlanning = tab === 'docente-tab-planejamento';
        const isDocPlanning = isPlanning && cargo === 'docente';
        const titulos = { 'docente-tab-calendario': 'Calendário', 'docente-tab-escala': 'Escala', 'docente-tab-planejamento': 'Aulas/Planejamento', 'docente-tab-ferias': 'Férias Docente' };
        const subtitulo = document.getElementById('docente-filtros-subtitulo'); if (subtitulo) subtitulo.textContent = `Filtros de ${titulos[tab] || 'visualização'}`;
        const areas = [...new Set(this._docentesDisponiveis().flatMap(d => this._areasDocente(d)))].sort((a,b) => a.localeCompare(b,'pt-BR',{sensitivity:'base'}));
        const docs = this._docentesDisponiveis();
        const acoesTodos = tipo => `<span class="flex gap-1"><button type="button" data-filtro-todos="${tipo}" data-acao="marcar" class="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50">Marcar todos</button><button type="button" data-filtro-todos="${tipo}" data-acao="limpar" class="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50">Desmarcar todos</button></span>`;
        const areaHtml = areas.length ? areas.map(a => `<label class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs"><input type="checkbox" data-filtro="areas" value="${this._esc(a)}" ${f.areas.some(x => this._norm(x) === this._norm(a)) ? 'checked' : ''} class="accent-blue-600"><span>${this._esc(a)}</span></label>`).join('') : '<p class="text-xs text-slate-400">Nenhuma área cadastrada.</p>';
        const docHtml = isDocPlanning ? `<p class="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">Por privacidade, esta aba mostra exclusivamente seus próprios dados.</p>` : docs.map(d => { const id = this._idDocenteFiltro(d), nome = d.nome_completo || [d.nome,d.sobrenome].filter(Boolean).join(' ') || d.email || 'Docente', areasDoc = this._areasDocente(d).join(', ') || 'Sem área vinculada'; return `<label class="flex min-w-0 items-start gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-xs hover:bg-slate-50"><input type="checkbox" data-filtro="docentes" value="${this._esc(id)}" ${f.docentes.includes(id) ? 'checked' : ''} class="mt-0.5 accent-blue-600"><span class="min-w-0"><b class="block truncate text-slate-700">${this._esc(nome)}</b><small class="block truncate text-slate-400">${this._esc(areasDoc)}</small></span></label>`; }).join('');
        const weekdays = window.ViewsDocente.dias.map(d => `<label class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs"><input type="checkbox" data-filtro="dias" value="${d.id}" ${f.dias.includes(d.id) ? 'checked' : ''} class="accent-blue-600"><span>${d.curto}</span></label>`).join('');
        const periods = [['manha','Manhã'],['tarde','Tarde'],['noite','Noite']].map(([id,label]) => `<label class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs"><input type="checkbox" data-filtro="periodos" value="${id}" ${f.periodos.includes(id) ? 'checked' : ''} class="accent-blue-600"><span>${label}</span></label>`).join('');
        const years = [...new Set(window.ControllerDocente.ferias.map(x => String(x.periodo_aquisitivo || '')).filter(x => /^\d{4}$/.test(x)))].sort().reverse();
        const yearHtml = isFerias ? `<label class="block text-xs font-bold text-slate-600">Período aquisitivo<select data-filtro="anoAquisitivo" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="todos" ${f.anoAquisitivo === 'todos' ? 'selected' : ''}>Todos os anos</option>${years.map(y => `<option value="${y}" ${f.anoAquisitivo === y ? 'selected' : ''}>${y}</option>`).join('')}</select></label>` : '';
        box.innerHTML = `${!isDocPlanning ? `<section><div class="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 class="text-xs font-extrabold uppercase tracking-wide text-slate-500">Áreas</h3>${acoesTodos('areas')}</div><div class="flex flex-wrap gap-2">${areaHtml}</div></section><section><div class="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 class="text-xs font-extrabold uppercase tracking-wide text-slate-500">Docentes</h3><div class="flex flex-wrap items-center gap-2">${acoesTodos('docentes')}<input type="search" data-filtro="busca" value="${this._esc(f.busca)}" placeholder="Pesquisar docente/área" class="max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-xs"></div></div><div class="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">${docHtml || '<p class="text-xs text-slate-400">Nenhum docente encontrado.</p>'}</div></section>` : docHtml}${!isFerias ? `<section><div class="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 class="text-xs font-extrabold uppercase tracking-wide text-slate-500">Dias da semana</h3>${acoesTodos('dias')}</div><div class="flex flex-wrap gap-2">${weekdays}</div></section><section><div class="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 class="text-xs font-extrabold uppercase tracking-wide text-slate-500">Períodos</h3>${acoesTodos('periodos')}</div><div class="flex flex-wrap gap-2">${periods}</div></section>` : yearHtml}`;
    };
    A._aplicarFiltroAlterado = async function (el) {
        const tab = this._tabAtiva(), f = this._filtroAba(tab), tipo = el.dataset.filtro;
        if (!tipo) return false;
        if (tipo === 'busca') f.busca = el.value;
        else if (tipo === 'anoAquisitivo') f.anoAquisitivo = el.value;
        else {
            const group = [...document.querySelectorAll(`#docente-filtros-conteudo [data-filtro="${tipo}"]:checked`)].map(x => tipo === 'dias' ? Number(x.value) : x.value);
            f[tipo] = group;
        }
        const tabToRender = tab;
        if (tab === 'docente-tab-escala') {
            this.filtrosEscala = { areas: f.areas, nome: f.busca, dias: f.dias, periodos: f.periodos };
            await this._renderizarEscalas();
        } else if (tab === 'docente-tab-calendario') await this._renderizarCalendario();
        else if (tab === 'docente-tab-planejamento') await this._renderizarPlanejamento();
        else if (tab === 'docente-tab-ferias') await this._renderizarFerias();
        this.docentesSelecionados = this._docentesFiltrados(tabToRender).map(d => this._idDocenteFiltro(d));
        this._atualizarBotaoFiltro();
        return true;
    };

    const renderEscalasOriginal = A._renderizarEscalas.bind(A);
    A._renderizarEscalas = async function () {
        const f = this._filtroAba('docente-tab-escala');
        this.filtrosEscala = { areas: f.areas, nome: f.busca, dias: f.dias, periodos: f.periodos };
        this.docentesSelecionados = this._docentesFiltrados('docente-tab-escala').map(d => this._idDocenteFiltro(d));
        await renderEscalasOriginal(); this._atualizarBotaoFiltro();
    };
    const renderFeriasOriginal = A._renderizarFerias.bind(A);
    A._renderizarFerias = async function () {
        const tab = 'docente-tab-ferias', f = this._filtroAba(tab), prev = this.docentesSelecionados;
        const listaFerias = window.ControllerDocente.ferias;
        if (f.anoAquisitivo !== 'todos') window.ControllerDocente.ferias = listaFerias.filter(x => String(x.periodo_aquisitivo || '') === f.anoAquisitivo);
        this.docentesSelecionados = this._docentesFiltrados(tab).map(d => this._idDocenteFiltro(d));
        try { await renderFeriasOriginal(); }
        finally { window.ControllerDocente.ferias = listaFerias; this.docentesSelecionados = prev; this._atualizarBotaoFiltro(); }
    };
    const renderPlanejamentoOriginal = A._renderizarPlanejamento.bind(A);
    A._renderizarPlanejamento = async function () {
        const prev = this.docentesSelecionados, tab = 'docente-tab-planejamento';
        this.docentesSelecionados = this._docentesFiltrados(tab).map(d => this._idDocenteFiltro(d));
        await renderPlanejamentoOriginal(); this.docentesSelecionados = prev; this._atualizarBotaoFiltro();
    };
    A._semanaEncontros = function () {
        const r = this._semanal(), tab = 'docente-tab-calendario', f = this._filtroAba(tab), docs = this._docentesFiltrados(tab);
        return window.ControllerDashboard.listarEncontros({ inicio: r.inicio, fim: r.fim }).filter(enc => {
            const weekday = this._weekdayISO(enc.data), min = window.ControllerDocente._minutos(enc.h_inicio);
            const periodo = min === null ? null : min < 720 ? 'manha' : min < 1080 ? 'tarde' : 'noite';
            return docs.some(d => this._matchesEncontro(enc, d)) && f.dias.includes(weekday) && (!periodo || f.periodos.includes(periodo));
        });
    };
    const gerarPlanejamentoOriginal = A._gerarPlanejamentoSemana.bind(A);
    A._gerarPlanejamentoSemana = async function (encontros, range, docentes, atividades) {
        const itens = await gerarPlanejamentoOriginal(encontros, range, docentes, atividades), f = this._filtroAba('docente-tab-calendario');
        return itens.filter(x => {
            const weekday = this._weekdayISO(x.data), min = window.ControllerDocente._minutos(x.h_inicio), periodo = min === null ? null : min < 720 ? 'manha' : min < 1080 ? 'tarde' : 'noite';
            return f.dias.includes(weekday) && (!periodo || f.periodos.includes(periodo));
        });
    };
    const calcularPlanejamentoOriginal = A._calcularPlanejamento.bind(A);
    A._calcularPlanejamento = function (docente, range, encontros) {
        const f = this._filtroAba('docente-tab-planejamento'), diaOriginal = this._diaComExpediente, encontrosOriginal = this._meetingsDia;
        this._diaComExpediente = (data, doc) => {
            if (!f.dias.includes(this._weekdayISO(data))) return [];
            const cortes = { manha: [0,720], tarde: [720,1080], noite: [1080,1440] }, aceitos = f.periodos.map(p => cortes[p]).filter(Boolean);
            return diaOriginal.call(this, data, doc).flatMap(([a,b]) => aceitos.map(([lo,hi]) => [Math.max(a,lo), Math.min(b,hi)]).filter(([x,y]) => y > x));
        };
        this._meetingsDia = (lista, doc, data) => encontrosOriginal.call(this, lista, doc, data).filter(e => {
            const min = window.ControllerDocente._minutos(e.h_inicio), p = min === null ? null : min < 720 ? 'manha' : min < 1080 ? 'tarde' : 'noite';
            return !p || f.periodos.includes(p);
        });
        try { return calcularPlanejamentoOriginal(docente, range, encontros); }
        finally { this._diaComExpediente = diaOriginal; this._meetingsDia = encontrosOriginal; }
    };
    const detalhesAtividadesOriginal = A._detalhesAtividades.bind(A);
    A._detalhesAtividades = function (docs, range) {
        const f = this._filtroAba('docente-tab-planejamento'), orig = window.ControllerDocente.atividades;
        window.ControllerDocente.atividades = orig.filter(x => {
            const min = window.ControllerDocente._minutos(x.inicio), p = min === null ? null : min < 720 ? 'manha' : min < 1080 ? 'tarde' : 'noite';
            return f.dias.includes(this._weekdayISO(x.data)) && (!p || f.periodos.includes(p));
        });
        try { return detalhesAtividadesOriginal(docs, range); }
        finally { window.ControllerDocente.atividades = orig; }
    };
    A.cachePlanejamentoMetricas = new Map();
    A.cacheAtividadesPlanejamento = new Map();
    A.mesPlanejamento = A._mesAtual();
    A.mesesPlanejamentoPorDocente = Object.create(null);
    A._mesesSelecionaveis = function () {
        const hoje = new Date(), ano = hoje.getFullYear(), ate = hoje.getMonth() + 1;
        return Array.from({ length: ate }, (_, i) => {
            const mes = i + 1, value = `${ano}-${String(mes).padStart(2,'0')}`;
            return { value, label: new Intl.DateTimeFormat('pt-BR',{month:'long'}).format(new Date(ano,mes-1,1,12)) };
        });
    };
    A._cardResumoPlanejamento = function (doc, range, titulo, encontros, seletorMes = false) {
        const C = window.ControllerDocente, filtro = this._filtroAba('docente-tab-planejamento');
        const docenteId = String(doc.id || doc.uid || doc.email || ''), assinaturaFiltro = `${filtro.dias.join(',')}/${filtro.periodos.join(',')}`;
        const chave = `${docenteId}|${range.inicio}|${range.fim}|${assinaturaFiltro}`;
        let resultado = this.cachePlanejamentoMetricas.get(chave);
        if (!resultado) { resultado = this._calcularPlanejamento(doc, range, encontros); this.cachePlanejamentoMetricas.set(chave, resultado); }
        const periodo = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(range.ano,range.mes-1,1,12));
        const periodoLabel = titulo === 'Média anual' ? `Janeiro a ${periodo}` : periodo;
        const seletor = seletorMes ? `<label class="flex items-center gap-2 text-xs font-semibold text-slate-600"><span class="sr-only">Selecionar mês da média mensal de ${this._esc(doc.nome_completo || doc.nome || doc.email || 'docente')}</span><select data-planejamento-mes="${this._esc(docenteId)}" class="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700">${this._mesesSelecionaveis().map(m => `<option value="${m.value}" ${m.value === range.ano+'-'+String(range.mes).padStart(2,'0') ? 'selected' : ''}>${this._esc(m.label)}</option>`).join('')}</select></label>` : '';
        return `<article class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><header class="mb-3 flex flex-wrap items-start justify-between gap-2"><div><h3 class="text-sm font-extrabold text-slate-800">${titulo}</h3><p class="text-xs capitalize text-slate-500">${this._esc(periodoLabel)} · Carga prevista pela escala vigente</p></div>${seletor}<span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800">${resultado.total ? `${resultado.pctAulas}% em aula` : 'Sem carga prevista'}</span></header><div class="grid grid-cols-1 gap-2 sm:grid-cols-3"><div class="rounded-xl border border-blue-100 bg-blue-50 p-3"><p class="text-[10px] font-bold uppercase tracking-wide text-blue-700">Carga horária prevista</p><p class="mt-1 text-lg font-extrabold text-blue-900">${this._duracaoLabel(resultado.total)}</p><p class="mt-1 text-[10px] font-semibold text-blue-700">Total de horas no período</p></div><div class="rounded-xl border border-indigo-100 bg-indigo-50 p-3"><p class="text-[10px] font-bold uppercase tracking-wide text-indigo-700">Encontros de aula</p><p class="mt-1 text-3xl font-black leading-none text-indigo-900">${resultado.pctAulas}%</p><p class="mt-2 text-xs font-semibold text-indigo-800">${this._duracaoLabel(resultado.aulas)} em aula</p></div><div class="rounded-xl border border-teal-100 bg-teal-50 p-3"><p class="text-[10px] font-bold uppercase tracking-wide text-teal-800">Planejamento / outras atividades</p><p class="mt-1 text-3xl font-black leading-none text-teal-900">${resultado.pctRestante}%</p><p class="mt-2 text-xs font-semibold text-teal-800">${this._duracaoLabel(resultado.restante)} sem alocação em aula</p></div></div><div class="mt-4"><div class="mb-1 flex justify-between text-[10px] font-bold text-slate-500"><span>Aulas · ${resultado.pctAulas}%</span><span>Planejamento / outras atividades · ${resultado.pctRestante}%</span></div><div class="flex h-3 overflow-hidden rounded-full bg-teal-100"><div class="h-full bg-indigo-600" style="width:${Math.min(100,resultado.pctAulas)}%"></div></div></div></article>`;
    };
    A._renderizarPlanejamento = async function () {
        const box = document.getElementById('docente-planejamento-conteudo'); if (!box) return;
        const cargo = window.usuarioAtual?.cargo, C = window.ControllerDocente;
        if (!C.podeVerPlanejamento()) { box.innerHTML = ''; return; }
        const abertos = [...box.querySelectorAll('details[data-plano-docente][open]')].map(x => x.dataset.planoDocente);
        const docs = cargo === 'docente' ? [this._proprioDocente()] : this._docentesFiltrados('docente-tab-planejamento');
        if (!docs.length) { box.innerHTML = this._mensagemSemSelecao(); return; }
        const hoje = new Date(), mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;
        const rangeAno = this._mesBounds(mesAtual);
        rangeAno.inicio = `${rangeAno.ano}-01-01`;
        const atividadesAnteriores = C.atividades;
        box.innerHTML = '<p class="p-5 text-center text-xs text-slate-500">Calculando produção do mês selecionado…</p>';
        try {
            const encontros = window.ControllerDashboard.listarEncontros({ inicio: rangeAno.inicio, fim: rangeAno.fim });
            const cards = [];
            for (let i = 0; i < docs.length; i++) {
                const doc = docs[i], id = String(doc.id || doc.email || i), mesSelecionado = this.mesesPlanejamentoPorDocente[id] || mesAtual;
                const rangeMes = this._mesBounds(mesSelecionado), chaveAtividades = `${window.usuarioAtual?.uid || window.usuarioAtual?.email || cargo}|${rangeMes.inicio}|${rangeMes.fim}`;
                let atividades;
                if (this.cacheAtividadesPlanejamento.has(chaveAtividades)) atividades = this.cacheAtividadesPlanejamento.get(chaveAtividades);
                else {
                    atividades = await C.carregarAtividades(cargo === 'docente' ? doc : null, rangeMes.inicio, rangeMes.fim);
                    atividades = [...atividades]; this.cacheAtividadesPlanejamento.set(chaveAtividades, atividades);
                }
                C.atividades = atividades;
                const mensal = this._cardResumoPlanejamento(doc, rangeMes, 'Média mensal', encontros, true), anual = this._cardResumoPlanejamento(doc, rangeAno, 'Média anual', encontros, false), atividadesHtml = this._detalhesAtividades([doc], rangeMes);
                cards.push(`<details data-plano-docente="${this._esc(id)}" class="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm" ${abertos.includes(id) || (!abertos.length && i === 0) ? 'open' : ''}><summary class="cursor-pointer list-none px-4 py-3 text-sm font-extrabold text-slate-800"><span class="flex flex-wrap items-center justify-between gap-2"><span>${this._esc(doc.nome_completo || doc.nome || doc.email || 'Docente')}</span><span class="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-800">Média mensal e anual</span></span></summary><div class="space-y-3 border-t border-slate-200 p-3 sm:p-4">${mensal}${anual}${atividadesHtml}</div></details>`);
            }
            box.innerHTML = `<div class="mb-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">${cargo === 'docente' ? 'Este quadro é privado e mostra somente seus dados.' : 'Exibição restrita a técnicos/coordenadores e administradores; os dados estão agrupados por docente.'}</div><div class="space-y-3">${cards}</div>`;
        } catch (err) {
            box.innerHTML = `<p class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">${this._esc(err.message || 'Não foi possível calcular o planejamento.')}</p>`;
        } finally { C.atividades = atividadesAnteriores; }
        this._atualizarBotaoFiltro();
    };
    A._invalidarCachePlanejamento = function () { this.cachePlanejamentoMetricas.clear(); this.cacheAtividadesPlanejamento.clear(); };

    const iniciarOriginal = A.iniciarView.bind(A);
    A.iniciarView = async function () {
        await iniciarOriginal();
        this.filtrosPorAba = {};
        Object.values(this._tabFiltro).forEach(tab => this._filtroAba(tab));
        this._atualizarBotaoFiltro();
        await this._renderizarCalendario();
    };
    const clicksOriginal = A.tratarCliques.bind(A);
    A.tratarCliques = async function (e) {
        if (!this._mounted()) return false;
        if (e.target.id === 'docente-modal-filtros') { this._fecharModal('docente-modal-filtros'); return true; }
        const t = e.target.closest('button,summary');
        if (t?.dataset.filtroTodos) {
            const tipo = t.dataset.filtroTodos, marcar = t.dataset.acao === 'marcar';
            document.querySelectorAll(`#docente-filtros-conteudo [data-filtro="${tipo}"]`).forEach(el => { el.checked = marcar; });
            await this._aplicarFiltroAlterado({ dataset: { filtro: tipo } });
            return true;
        }
        if (t?.id === 'docente-btn-filtros') {
            if (this._filtrosAtivos()) {
                this.filtrosPorAba[this._tabAtiva()] = this._defaultsFiltro(this._tabAtiva());
                this._atualizarBotaoFiltro(); await this._renderTabAtiva();
            }
            this._renderModalFiltros(); this._abrirModal('docente-modal-filtros'); return true;
        }
        if (t?.id === 'docente-filtros-limpar') {
            this.filtrosPorAba[this._tabAtiva()] = this._defaultsFiltro(this._tabAtiva());
            this._renderModalFiltros(); this._atualizarBotaoFiltro(); await this._renderTabAtiva(); return true;
        }
        if (t?.classList.contains('docente-modal-fechar') && t.dataset.modal === 'docente-modal-filtros') { this._fecharModal('docente-modal-filtros'); return true; }
        if (t?.id === 'docente-btn-atualizar') this._invalidarCachePlanejamento();
        const handled = await clicksOriginal(e);
        if (handled && t?.matches('.tab-btn[data-target^="docente-tab-"]')) this._atualizarBotaoFiltro();
        return handled;
    };
    const changesOriginal = A.tratarMudancas.bind(A);
    A.tratarMudancas = async function (e) {
        const t = e.target;
        if (this._mounted() && t.matches('[data-planejamento-mes]')) {
            const docenteId = t.dataset.planejamentoMes;
            if (t.value !== this.mesesPlanejamentoPorDocente[docenteId]) { this.mesesPlanejamentoPorDocente[docenteId] = t.value; await this._renderizarPlanejamento(); }
            return true;
        }
        if (this._mounted() && t.closest('#docente-filtros-conteudo') && t.dataset.filtro) return this._aplicarFiltroAlterado(t);
        return changesOriginal(e);
    };
    const atualizarSuaveOriginal = A.atualizarSuave.bind(A);
    A.atualizarSuave = function () { this._invalidarCachePlanejamento(); return atualizarSuaveOriginal(); };
    const submitsOriginal = A.tratarSubmits.bind(A);
    A.tratarSubmits = async function (e) {
        const resultado = await submitsOriginal(e);
        if (e.target?.id === 'docente-form-atividade') this._invalidarCachePlanejamento();
        return resultado;
    };
})();
