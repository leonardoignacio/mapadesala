// Cálculos de apoio do mapa: contagens, totais de encontros, períodos, meses visíveis e paletas de cores.
Object.assign(window.AppEspelho, {
    _hojeISO() { const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; },
    _contagemEncontrosUC(turmaId,ucId) { return this.encontros.filter(x=>x.id_turma===turmaId&&x.id_uc===ucId&&x.tipo!=='cancelamento').length; },
    _contagemFuturaUC(turmaId,ucId) { const hoje=this._hojeISO();return this.encontros.filter(x=>x.id_turma===turmaId&&x.tipo!=='cancelamento'&&x.data>hoje&&(ucId==='TODAS'||x.id_uc===ucId)).length; },
    _totalEncontrosComCH(uc,turma,ch) { const carga=Number(uc?.carga_horaria)||0;if(!(Number(ch)>0))return 0;return carga>0?Math.ceil(carga/Number(ch)):this._totalEncontros(uc,turma); },
    _ucsPendentes(turma,ch) { return this._ucsOrdenadas(turma).map(uc=>{const id=uc.id_uc_base||uc.id,total=this._totalEncontrosComCH(uc,turma,ch),distribuidos=this.encontros.filter(e=>e.id_turma===turma.id&&e.id_uc===id&&e.tipo!=='cancelamento').length;return{uc,id,total,distribuidos,faltam:Math.max(0,total-distribuidos)};}).filter(x=>x.faltam>0); },
    _ucsOrdenadas(turma) { return (Array.isArray(turma.ucs) ? [...turma.ucs] : []).sort((a,b) => (parseInt((a.referencia||'').replace(/\D/g,''),10)||0) - (parseInt((b.referencia||'').replace(/\D/g,''),10)||0)); },
    _totalEncontros(uc, turma) { const ch = Number(uc.carga_horaria) || 0; const chEncontro = Number(turma.ch_encontro) || (window.ControllerTurmaFrm?.calcularCHEncontro(turma.h_inicio,turma.h_termino) || 0); return ch > 0 && chEncontro > 0 ? Math.ceil(ch/chEncontro) : 0; },
    // Encontros que serão excluídos ao salvar porque foram sobrepostos por outro encontro arrastado.
    _idsSubstituidos() { const ids=new Set(); this.pendenciasArraste.forEach(m=>{if(m.substitui)ids.add(m.substitui);}); return ids; },
    _mapaEncontros() {
        const m=new Map(),excluidos=this._idsSubstituidos();
        this.encontros.forEach(e=>{
            if(excluidos.has(e.id))return;
            const staged=this.pendenciasArraste.get(e.id),moved=staged&&staged.data!==e.data;
            const item=staged?{...e,data:staged.data??e.data,SS:moved?false:(staged.SS??e.SS),SGO:moved?false:(staged.SGO??e.SGO),_substitui:staged.substitui?(this.encontros.find(x=>x.id===staged.substitui)||null):null}:e;
            m.set(`${item.id_turma}|${item.data}`,item);
        });
        return m;
    },
    _mapaExcecoes() { return new Map(this.excecoes.map(e => [e.data,e])); },
    _diasTurma(t) { const map = {'Seg':1,'Ter':2,'Qua':3,'Qui':4,'Sex':5,'Sáb':6,'Sab':6,'Dom':0}; return (t.dias_semana || []).map(d => map[d] ?? map[d.slice(0,3)]).filter(Number.isInteger); },
    _grupoPeriodo(t) { const dias=this._diasTurma(t); if(dias.includes(6)) return 'SÁBADOS'; const p=this._norm(t.periodo||''); if(p.includes('manha')) return 'MANHÃ'; if(p.includes('tarde')) return 'TARDE'; if(p.includes('noite')) return 'NOITE'; return 'MANHÃ'; },
    _diasVisiveisPeriodo() { if(!this.filtrosDiasPorPeriodo.has(this.periodoMapa))this.filtrosDiasPorPeriodo.set(this.periodoMapa,new Set(this.periodoMapa==='SÁBADOS'?[6]:[0,1,2,3,4,5]));return this.filtrosDiasPorPeriodo.get(this.periodoMapa); },
    _mesesSelecionados() {
        if(!this.mesesVisiveis){this.mesesVisiveis=new Set();const d=new Date();d.setDate(1);for(let i=0;i<=6;i++){this.mesesVisiveis.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);d.setMonth(d.getMonth()+1);}}
        return this.mesesVisiveis;
    },
    _alternarMesFiltro(mesKey,ativo) { const set=this._mesesSelecionados();ativo?set.add(mesKey):set.delete(mesKey); },
    _paletaTurma(id) { const palettes=[
        {border:'#2563eb',soft:'#eff6ff',empty:'#f8fbff',header:'#dbeafe',text:'#1e3a8a'},
        {border:'#0f766e',soft:'#f0fdfa',empty:'#f8fefd',header:'#ccfbf1',text:'#134e4a'},
        {border:'#7c3aed',soft:'#f5f3ff',empty:'#fbfaff',header:'#ede9fe',text:'#4c1d95'},
        {border:'#047857',soft:'#ecfdf5',empty:'#f7fefb',header:'#d1fae5',text:'#064e3b'},
        {border:'#0369a1',soft:'#f0f9ff',empty:'#f9fdff',header:'#e0f2fe',text:'#0c4a6e'},
        {border:'#4f46e5',soft:'#eef2ff',empty:'#f8f9ff',header:'#e0e7ff',text:'#312e81'},
        {border:'#334155',soft:'#f1f5f9',empty:'#fafbfd',header:'#e2e8f0',text:'#1e293b'},
        {border:'#0891b2',soft:'#ecfeff',empty:'#f7feff',header:'#cffafe',text:'#164e63'}
    ];const str=String(id||'');let hash=0;for(let i=0;i<str.length;i++)hash=(hash*31+str.charCodeAt(i))>>>0;return palettes[hash%palettes.length]; },
    _paletaUC(idUC,turma,fallback=this._paletaTurma(idUC)) {
        const palettes=[
            {border:'#1d4ed8',soft:'#eff6ff',header:'#dbeafe',text:'#1e3a8a'},
            {border:'#0f766e',soft:'#f0fdfa',header:'#ccfbf1',text:'#134e4a'},
            {border:'#7c3aed',soft:'#f5f3ff',header:'#ede9fe',text:'#4c1d95'},
            {border:'#047857',soft:'#ecfdf5',header:'#d1fae5',text:'#064e3b'},
            {border:'#0369a1',soft:'#f0f9ff',header:'#e0f2fe',text:'#0c4a6e'},
            {border:'#4f46e5',soft:'#eef2ff',header:'#e0e7ff',text:'#312e81'},
            {border:'#334155',soft:'#f1f5f9',header:'#e2e8f0',text:'#1e293b'},
            {border:'#0891b2',soft:'#ecfeff',header:'#cffafe',text:'#164e63'}
        ];
        const ucs=this._ucsOrdenadas(turma),idx=ucs.findIndex(u=>(u.id_uc_base||u.id)===idUC);
        return idx>=0?palettes[idx%palettes.length]:fallback;
    },
    _estiloExcecao(exc) { const tipo=this._norm(`${exc?.excecao||''} ${exc?.tipo||''}`); if(/feriado|cancelamento|domingo/.test(tipo))return {bg:'#fee2e2',border:'#ef4444',text:'#991b1b'}; if(/ponte|compensacao|reuniao|pedagog/.test(tipo))return {bg:'#fef3c7',border:'#f59e0b',text:'#92400e'}; return {bg:'#e2e8f0',border:'#94a3b8',text:'#334155'}; },
    _escaparAttr(v) { return this._html(v).replace(/`/g,'&#96;'); },
    _docentesDaTurma(turma) {
        const valorArea=a=>typeof a==='object'&&a?(a.area||a.nome_area||a.nome||a.referencia||a.tipo||''):a;
        const areasCurso=[turma.curso_area,turma.area,turma.curso_tipo].map(a=>this._norm(valorArea(a))).filter(Boolean);
        const user=window.usuarioAtual||{}, areasUsuario=(user.areas||[]).map(a=>this._norm(typeof a==='object'?(a.area||a.nome_area||a.nome||a.referencia||a.tipo):a));
        return this.docentes.filter(d=>{
            const perfilDocente=this._norm(d.cargo)==='docente'&&Array.isArray(d.perfis)&&d.perfis.some(p=>this._norm(p)==='docente');
            const areasDoc=(Array.isArray(d.areas)?d.areas:[]).map(a=>this._norm(typeof a==='object'?(a.area||a.nome_area||a.nome||a.referencia||a.tipo):a));
            const compativel=areasDoc.includes('todas')||areasDoc.some(a=>areasCurso.includes(a));
            return d.status==='ativo'&&perfilDocente&&compativel&&(user.cargo!=='docente'||areasUsuario.includes('todas')||areasCurso.some(a=>areasUsuario.includes(a)));
        });
    },
});
