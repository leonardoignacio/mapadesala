// ./espelho/app_espelho_mapa.js - Renderização do Mapa e Lógica de Drag & Drop
Object.assign(window.AppEspelho, {
    
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

    _ucsOrdenadas(turma) { return (Array.isArray(turma.ucs) ? [...turma.ucs] : []).sort((a,b) => (parseInt((a.referencia||'').replace(/\D/g,''),10)||0) - (parseInt((b.referencia||'').replace(/\D/g,''),10)||0)); },
    _totalEncontros(uc, turma) { const ch = Number(uc.carga_horaria) || 0; const chEncontro = Number(turma.ch_encontro) || (window.ControllerTurmaFrm?.calcularCHEncontro(turma.h_inicio,turma.h_termino) || 0); return ch > 0 && chEncontro > 0 ? Math.ceil(ch/chEncontro) : 0; },
    _mapaEncontros() { const m = new Map(); this.encontros.forEach(e => {const staged=this.pendenciasArraste.get(e.id);const moved=staged&&staged.data!==e.data;const item=staged?{...e,data:staged.data??e.data,SS:moved?false:(staged.SS??e.SS),SGO:moved?false:(staged.SGO??e.SGO)}:e;m.set(`${item.id_turma}|${item.data}`,item);}); return m; },
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

    renderizarMapa() {
        const pane=document.getElementById('espelho-painel'); if(!pane)return;
        pane.ondblclick=e=>this.tratarDuploClique(e);
        const scrollTop=pane.scrollTop,scrollLeft=pane.scrollLeft;
        const abertos=new Map([...pane.querySelectorAll('details[data-esp-key]')].map(d=>[d.dataset.espKey,d.open]));
        const anosContainerAntes=document.getElementById('espelho-filtro-anos');
        const anosAbertos=new Map([...(anosContainerAntes?.querySelectorAll('details[data-ano-accordion]')||[])].map(d=>[d.dataset.anoAccordion,d.open]));
        const todasTurmas=this.turmas.filter(t=>this.selecionadas.has(t.id));
        if(!todasTurmas.length){pane.innerHTML='<div class="p-10 text-center text-slate-400">Selecione ao menos uma turma para exibir o mapa.</div>';return;}
        const periodos=[['MANHÃ','Manhã'],['TARDE','Tarde'],['NOITE','Noite'],['SÁBADOS','Sábados']];
        if(!periodos.some(([key])=>key===this.periodoMapa))this.periodoMapa='MANHÃ';
        const turmas=todasTurmas.filter(t=>this._grupoPeriodo(t)===this.periodoMapa);
        const viewportWidth=Math.max(320,Number(pane.clientWidth)||Number(window.innerWidth)||1024);
        const dataColWidth=viewportWidth<480?88:100;
        const turmaColWidth=Math.max(168,Math.floor((viewportWidth-dataColWidth-24)/Math.max(1,turmas.length)));
        const tableMinWidth=Math.max(400,dataColWidth+turmaColWidth*turmas.length);
        const tabs=`<div class="flex w-full flex-nowrap items-center gap-1.5 border-b border-slate-200 bg-white/95 px-1 py-1.5 sm:gap-2 sm:py-2 backdrop-blur" style="width:${tableMinWidth}px;min-width:${tableMinWidth}px"><button type="button" id="btn-configuracoes-turmas" aria-label="Configurações das turmas exibidas" title="Configurações das turmas exibidas" aria-haspopup="dialog" aria-controls="modal-configuracoes-turmas" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 sm:h-9 sm:w-9"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4 sm:h-[18px] sm:w-[18px]" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0-.9 3l-.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z"/></svg></button>${periodos.map(([key,label])=>{const count=todasTurmas.filter(t=>this._grupoPeriodo(t)===key).length;return `<button type="button" class="btn-periodo-mapa whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] sm:px-3 sm:py-2 sm:text-sm font-bold transition ${this.periodoMapa===key?'border-blue-600 bg-blue-600 text-white shadow-sm':'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}" data-periodo="${key}">${label}<span class="ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${this.periodoMapa===key?'bg-white/20':'bg-slate-100'}">${count}</span></button>`;}).join('')}</div>`;
        if(!turmas.length){pane.innerHTML=tabs+'<div class="m-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">Nenhuma turma selecionada para este período.</div>';pane.scrollTop=scrollTop;pane.scrollLeft=scrollLeft;return;}
        const paletteById=new Map(turmas.map(t=>[t.id,this._paletaTurma(t.id)]));
        const mapaE=this._mapaEncontros(),mapaX=this._mapaExcecoes(),datas=[],diasVisiveis=this._diasVisiveisPeriodo();
        turmas.forEach(t=>{if(t.d_inicio&&t.d_termino){const a=new Date(`${t.d_inicio}T12:00:00`),b=new Date(`${t.d_termino}T12:00:00`);if(!Number.isNaN(a.getTime())&&!Number.isNaN(b.getTime()))datas.push(a,b);}});
        this.encontros.filter(e=>turmas.some(t=>t.id===e.id_turma)&&/^\d{4}-\d{2}-\d{2}$/.test(e.data)).forEach(e=>datas.push(new Date(`${e.data}T12:00:00`)));
        if(!datas.length){pane.innerHTML='<div class="p-10 text-center text-slate-400">As turmas selecionadas não possuem período válido.</div>';return;}
        const minY=Math.min(...datas.map(d=>d.getFullYear())),maxY=Math.max(...datas.map(d=>d.getFullYear()));
        const colGroup=`<colgroup><col style="width:${dataColWidth}px">${turmas.map(()=>`<col style="width:${turmaColWidth}px">`).join('')}</colgroup>`;
        const colHead=turmas.map(t=>{
            const pal=paletteById.get(t.id),nomeCurso=(t.curso_titulo||'').trim(),cursoCurto=nomeCurso.length>20?`${nomeCurso.slice(0,19)}…`:nomeCurso;
            const nPend=[...this.pendenciasArraste.values()].filter(m=>m.id_turma===t.id).length;
            const alvosTurma=[...this.alvosEdicaoLote.values()].filter(a=>a.id_turma===t.id);
            const alvosExcluir=alvosTurma.filter(a=>a.id&&this.encontros.some(en=>en.id===a.id&&en.id_turma===t.id&&en.tipo!=='cancelamento'&&en.data>this._hojeISO()));
            
            let actHtml = '';
            if (alvosTurma.length > 0) {
                actHtml += `<button type="button" aria-label="Editar ${alvosTurma.length} selecionado(s) in loco" title="Editar ${alvosTurma.length} selecionado(s) in loco" class="btn-editar-lote flex h-6 w-6 items-center justify-center rounded-md bg-amber-500 text-white hover:bg-amber-600" data-id-turma="${this._html(t.id)}"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/></svg></button>`;
                if (this.podeGerenciarFlags) {
                    actHtml += `<button type="button" aria-label="Gerenciar SS/SGO" title="Gerenciar SS/SGO dos selecionados" class="btn-abrir-modal-flags flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700" data-id-turma="${this._html(t.id)}"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/></svg></button>`;
                }
                if (alvosExcluir.length) {
                    actHtml += `<button type="button" aria-label="Excluir ${alvosExcluir.length} encontro(s) selecionado(s)" title="Excluir ${alvosExcluir.length} encontro(s) selecionado(s)" class="btn-excluir-lote flex h-6 w-6 items-center justify-center rounded-md bg-rose-700 text-white hover:bg-rose-800" data-id-turma="${this._html(t.id)}"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg></button>`;
                }
                actHtml += `<button type="button" aria-label="Limpar ${alvosTurma.length} seleção(ões)" title="Limpar seleção desta turma" class="btn-limpar-selecao-turma flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100" data-id-turma="${this._html(t.id)}"><span aria-hidden="true" class="text-sm leading-none">×</span></button>`;
            } else {
                actHtml += `<button type="button" aria-label="Distribuir encontros" title="Distribuir encontros" class="btn-distribuir-turma flex h-6 w-6 items-center justify-center rounded-md bg-indigo-700 text-white hover:bg-indigo-800" data-id-turma="${this._html(t.id)}"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3m8-3v3M4 9h16M6 13h4m-2-2v4M4 5h16v15H4z"/></svg></button>`;
                if (this.podeGerenciarFlags) {
                    actHtml += `<button type="button" aria-label="Gerenciar SS/SGO da UC" title="Gerenciar marcadores SS/SGO de uma UC inteira" class="btn-abrir-modal-flags flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700" data-id-turma="${this._html(t.id)}"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/></svg></button>`;
                }
                actHtml += `<button type="button" aria-label="Remover encontros futuros de uma UC" title="Remover encontros futuros" class="btn-abrir-modal-remover-uc flex h-6 w-6 items-center justify-center rounded-md bg-rose-600 text-white hover:bg-rose-700" data-id-turma="${this._html(t.id)}"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/></svg></button>`;
            }

            return `<th class="border border-slate-300/70 px-1 py-1 sm:px-2 sm:py-2 text-left align-top" style="border-color:${pal.border};background:${pal.header};color:${pal.text}"><div class="flex items-start justify-between gap-2"><div class="min-w-0"><div class="text-xs font-extrabold sm:text-sm">${this._html(t.referencia)}</div><div class="text-[9px] font-medium leading-tight opacity-80 sm:text-[10px]" style="display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;max-height:2.5em;overflow:hidden;overflow-wrap:anywhere">${this._html(cursoCurto)} · ${this._html(t.periodo||'')}</div></div><div class="flex shrink-0 flex-col items-center gap-1">${nPend?`<div class="flex items-center gap-1"><button type="button" class="btn-salvar-movimentos text-[9px] px-1.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" data-id-turma="${this._html(t.id)}">Salvar Alterações (${nPend})</button><button type="button" aria-label="Descartar alterações de arraste" title="Descartar alterações não salvas" class="btn-descartar-movimentos flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300" data-id-turma="${this._html(t.id)}"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 2.64-6.36L3 8m0-5v5h5M12 8v4l3 2"/></svg></button></div>`:''}${this.editavel?`<div class="flex max-w-[96px] flex-wrap items-center justify-end gap-1">${actHtml}</div>`:''}</div></div></th>`;
        }).join('');
        const mesesSelecionados=this._mesesSelecionados();
        const anosSet=new Set();turmas.forEach(t=>{if(t.d_inicio&&t.d_termino){for(let ano=Number(t.d_inicio.slice(0,4));ano<=Number(t.d_termino.slice(0,4));ano++)anosSet.add(ano);}});this.encontros.filter(e=>turmas.some(t=>t.id===e.id_turma)&&/^\d{4}-\d{2}-\d{2}$/.test(e.data)).forEach(e=>anosSet.add(Number(e.data.slice(0,4))));const anosDisponiveis=[...anosSet].sort((a,b)=>a-b);
        const filtroDias=`<div id="filtro-dias-container" class="relative mt-1"><button id="btn-toggle-filtro-dias" type="button" aria-expanded="${this.filtroDiasAberto}" class="rounded border border-slate-300 bg-white px-1.5 py-1 text-[9px] font-semibold text-slate-600 hover:bg-slate-50">Filtrar dias ▾</button>${this.filtroDiasAberto?`<div class="absolute left-0 top-full z-[80] mt-1 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">${this.dias.map((d,i)=>`<label class="flex items-center gap-2 rounded px-1 py-1 text-[10px] font-medium hover:bg-slate-50"><input type="checkbox" class="espelho-filtro-dia-chk h-3 w-3 rounded text-blue-600" value="${i}" ${diasVisiveis.has(i)?'checked':''}>${d}</label>`).join('')}<button type="button" id="btn-restaurar-filtro-dias" class="mt-1 w-full rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200">Restaurar padrão desta aba</button></div>`:''}</div>`;
        let html=`<div class="sticky top-0 z-[45] bg-white shadow-md" style="width:${tableMinWidth}px;min-width:${tableMinWidth}px">${tabs}<div class="px-px"><table class="border-collapse w-full" style="table-layout:fixed;min-width:${tableMinWidth}px">${colGroup}<thead><tr><th class="sticky left-0 z-40 border-b border-slate-200 bg-slate-100 p-2 text-left text-[10px] uppercase text-slate-800" style="width:${dataColWidth}px">Data${filtroDias}</th>${colHead}</tr></thead></table></div></div>`;
        for(let y=minY;y<=maxY;y++){
            if(!Array.from({length:12},(_,mi)=>`${y}-${String(mi+1).padStart(2,'0')}`).some(k=>mesesSelecionados.has(k)))continue;
            const nAno=this.encontros.filter(e=>turmas.some(t=>t.id===e.id_turma)&&(e.data||'').startsWith(`${y}-`)).length;
            const mesesHtml=this.meses.map((mes,mi)=>{
                const mesKey=`${y}-${String(mi+1).padStart(2,'0')}`;
                if(!mesesSelecionados.has(mesKey))return '';
                const mesAtivo=turmas.some(t=>t.d_inicio&&t.d_termino&&t.d_inicio.slice(0,7)<=mesKey&&t.d_termino.slice(0,7)>=mesKey)||this.encontros.some(e=>turmas.some(t=>t.id===e.id_turma)&&(e.data||'').startsWith(`${mesKey}-`));
                const rows=[],diasMes=new Date(y,mi+1,0).getDate();
                if(mesAtivo)for(let dia=1;dia<=diasMes;dia++){
                    const dt=new Date(y,mi,dia,12),dow=dt.getDay(),iso=`${y}-${String(mi+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
                    let exc=mapaX.get(iso);
                    const domingo=dow===0;if(!diasVisiveis.has(dow))continue;
                    const cells=turmas.map(t=>{
                        const ignoradas = Array.isArray(t.excecoes_ignoradas) ? t.excecoes_ignoradas : [];
                        const hasIgnoredExc = exc && ignoradas.includes(iso);
                        const excForThisClass = hasIgnoredExc ? null : exc;
                        const ativo=!!t.d_inicio&&!!t.d_termino&&iso>=t.d_inicio&&iso<=t.d_termino,e=mapaE.get(`${t.id}|${iso}`),pal=paletteById.get(t.id),palUC=e&&e.tipo!=='cancelamento'?this._paletaUC(e.id_uc,t,pal):pal,exStyle=this._estiloExcecao(excForThisClass),cellStyle=`border-left:2px solid ${pal.border};background:${excForThisClass?exStyle.bg:(domingo?'#fff1f2':(e?palUC.soft:pal.empty))}`;
                        if(e)return `<td class="align-top p-1 sm:p-1.5 border border-slate-300/60 transition-colors hover:brightness-95" style="${cellStyle}">${this._renderizarCartao(e,t,pal)}</td>`;
                        if(!ativo)return `<td class="border border-slate-200/70" style="${cellStyle}"></td>`;
                        if(excForThisClass)return `<td class="align-top p-1 sm:p-1.5 border border-slate-300/60 transition-colors hover:brightness-95" style="border-left:2px solid ${pal.border};background:${exStyle.bg}"><div class="relative min-h-[88px] rounded-lg border p-1.5 sm:p-2 text-[11px] sm:text-xs flex flex-col justify-center" style="border-color:${exStyle.border};background:${exStyle.bg};color:${exStyle.text}">${this.editavel?`<button type="button" class="btn-ignorar-excecao absolute right-1 top-1 z-10 text-[14px] font-bold text-slate-400 hover:text-rose-600 leading-none" data-id-turma="${this._html(t.id)}" data-data="${iso}" title="Ignorar e remover exceção para esta turma">×</button>`:''}<strong>${this._html(excForThisClass.excecao||'Exceção')}</strong><div>${this._html(excForThisClass.descricao||'Data sem aula')}</div></div></td>`;
                        return `<td class="align-top p-1 sm:p-1.5 border border-slate-300/60 transition-colors hover:brightness-95 ${this.editavel?'espelho-dropzone':''}" style="${cellStyle}" data-id-turma="${this._html(t.id)}" data-data="${iso}"><div class="relative min-h-[88px] rounded-lg border border-dashed ${domingo?'border-rose-200 bg-rose-50/70':'border-slate-300 bg-white'} flex flex-col items-center justify-center gap-0.5 p-1 sm:gap-1 sm:p-1.5">${this.editavel?`<input type="checkbox" aria-label="Selecionar data vaga" class="espelho-alvo-chk absolute left-1 top-1 z-20 h-4 w-4 cursor-pointer rounded border-blue-400 bg-white shadow" data-id-turma="${this._html(t.id)}" data-data="${iso}">`:''}<span class="text-[10px] ${domingo?'text-rose-300':'text-slate-400'}">Vazio</span>${this.editavel?`<div class="flex gap-1"><button type="button" class="btn-add-encontro text-[10px] px-1.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100" data-id-turma="${this._html(t.id)}" data-data="${iso}">+ Encontro</button><button type="button" class="btn-add-cancelamento text-[10px] px-1.5 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100" data-id-turma="${this._html(t.id)}" data-data="${iso}">Cancelar</button></div>`:''}</div></td>`;
                    }).join('');
                    const lineBg=domingo?'bg-rose-50':(turmas.some(t=>mapaE.has(`${t.id}|${iso}`))?'bg-white':'bg-slate-50/50');
                    rows.push(`<tr class="${lineBg} hover:brightness-[0.99] border-b border-slate-300/70"><th class="sticky left-0 z-10 ${domingo?'bg-rose-100':'bg-slate-100'} border-b border-slate-200 p-2 text-left" style="width:${dataColWidth}px"><div class="text-sm font-extrabold ${domingo?'text-rose-800':'text-slate-700'}">${String(dia).padStart(2,'0')} ${mes.slice(0,3)}</div><div class="text-[10px] font-medium ${domingo?'text-rose-600':'text-slate-500'}">${this.dias[dow]}</div>${domingo?'<span class="text-[9px] font-extrabold text-rose-600">INÍCIO DA SEMANA</span>':''}${exc?`<span class="mt-1 block text-[9px] font-bold" style="color:${this._estiloExcecao(exc).text}">${this._html(exc.excecao||'EXCEÇÃO')}</span>`:''}</th>${cells}</tr>`);
                }
                const key=`mes-${y}-${mi}`;const aberto=abertos.has(key)?abertos.get(key):mesAtivo;
                return `<details class="rounded-lg sm:rounded-xl border border-slate-200 bg-white mb-1.5 sm:mb-2 espelho-mes" style="width:${tableMinWidth}px;min-width:${tableMinWidth}px" data-esp-key="${key}" ${aberto?'open':''}><summary class="list-none cursor-pointer flex items-center justify-between px-2.5 py-1.5 sm:px-3 sm:py-2.5 bg-slate-50 hover:bg-slate-100"><span class="font-bold text-sm text-slate-700">${mes} <span class="text-xs font-normal text-slate-400">(${rows.length} datas)</span></span><span class="text-slate-400 text-xs">⌄</span></summary><table class="border-collapse w-full" style="table-layout:fixed;min-width:${tableMinWidth}px">${colGroup}<tbody>${rows.join('')||`<tr><td colspan="${turmas.length+1}" class="p-5 text-center text-xs text-slate-400">Sem período de turma neste mês.</td></tr>`}</tbody></table></details>`;
            }).join('');
            const key=`ano-${y}`,aberto=abertos.has(key)?abertos.get(key):nAno>0;
            html+=`<details class="rounded-xl border border-slate-300 bg-white mb-2" style="width:${tableMinWidth}px;min-width:${tableMinWidth}px" data-esp-key="${key}" ${aberto?'open':''}><summary class="list-none cursor-pointer px-4 py-3 bg-slate-100 hover:bg-slate-200 flex justify-between items-center"><span class="font-extrabold text-slate-800">${y}</span><span class="text-xs text-slate-500">${nAno} encontro(s) · 12 meses</span></summary><div class="py-2 md:py-3">${mesesHtml}</div></details>`;
        }
        pane.innerHTML=html; pane.querySelectorAll('.espelho-alvo-chk').forEach(chk=>{const k=`${chk.dataset.idTurma}|${chk.dataset.data}|${chk.dataset.id||''}`;chk.checked=this.alvosEdicaoLote.has(k);}); const anosContainer=document.getElementById('espelho-filtro-anos');if(anosContainer){anosContainer.innerHTML=this._renderizarFiltroAnos(anosDisponiveis);anosContainer.querySelectorAll('details[data-ano-accordion]').forEach(d=>{if(anosAbertos.has(d.dataset.anoAccordion))d.open=anosAbertos.get(d.dataset.anoAccordion);});anosContainer.querySelectorAll('.espelho-filtro-ano-chk').forEach(chk=>{chk.indeterminate=chk.dataset.misto==='true';});}pane.scrollTop=scrollTop; pane.scrollLeft=scrollLeft;
    },

    _registrarResizeMapa() {
        if(this._resizeMapaHandler)return;
        this._lastMapWidth=document.getElementById('espelho-painel')?.clientWidth||0;
        this._resizeMapaHandler=()=>{
            clearTimeout(this._resizeMapaTimer);
            this._resizeMapaTimer=setTimeout(()=>{
                const pane=document.getElementById('espelho-painel');if(!pane)return;
                const width=pane.clientWidth||0;if(Math.abs(width-this._lastMapWidth)<24)return;
                this._lastMapWidth=width;this.renderizarMapa();this._registrarDragDrop();
            },140);
        };
        window.addEventListener('resize',this._resizeMapaHandler,{passive:true});
    },

    _renderizarCartao(e, turma, pal=this._paletaTurma(0)) {
        const aula = e.tipo !== 'cancelamento';
        const palAula=aula?this._paletaUC(e.id_uc,turma,pal):pal;
        const uc = (turma.ucs||[]).find(u => u.id_uc_base === e.id_uc || u.referencia === e.uc_referencia);
        const lista = this.encontros.filter(x => x.id_turma === turma.id && x.tipo !== 'cancelamento' && x.id_uc === e.id_uc).map(x=>({...x,data:this.pendenciasArraste.get(x.id)?.data||x.data})).sort((a,b)=>(a.data||'').localeCompare(b.data||''));
        const indice = Math.max(1, lista.findIndex(x => x.id === e.id)+1), chCartao=Number(e.ch_encontro)||Number(turma.ch_encontro)||0,total = uc ? (uc.carga_horaria&&chCartao?Math.ceil(Number(uc.carga_horaria)/chCartao):this._totalEncontros(uc,turma)) : (e.uc_carga_horaria&&chCartao?Math.ceil(e.uc_carga_horaria/chCartao):0);
        const docenteTxt = (e.docentes||[]).map(d => this._html(d.nome || d.email)).join(' + ') || 'Docente não definido';
        const sala = e.sala_nome ? `<span class="inline-flex items-center rounded-md border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-800"><span class="mr-1 text-teal-600">Sala</span>${this._html(e.sala_nome)}</span>` : '';
        const canRemove=this.editavel&&aula&&e.data>this._hojeISO();
        const className = aula ? 'text-slate-900 hover:brightness-[0.98]' : 'border-rose-200 bg-rose-50 text-rose-900';
        const flags=this.podeGerenciarFlags?`<label class="inline-flex h-8 min-w-[34px] shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md border border-blue-200 bg-white px-1.5 text-[9px] font-extrabold text-blue-800 shadow-sm"><input type="checkbox" class="espelho-flag-encontro h-3 w-3 rounded" data-id="${this._html(e.id)}" data-flag="SS" ${e.SS?'checked':''}>SS</label><label class="inline-flex h-8 min-w-[40px] shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md border border-violet-200 bg-white px-1.5 text-[9px] font-extrabold text-violet-800 shadow-sm"><input type="checkbox" class="espelho-flag-encontro h-3 w-3 rounded" data-id="${this._html(e.id)}" data-flag="SGO" ${e.SGO?'checked':''}>SGO</label>`:`${e.SS?'<span class="inline-flex h-8 items-center rounded-md border border-blue-200 bg-white px-1.5 text-[9px] font-extrabold text-blue-800">SS</span>':''}${e.SGO?'<span class="inline-flex h-8 items-center rounded-md border border-violet-200 bg-white px-1.5 text-[9px] font-extrabold text-violet-800">SGO</span>':''}`;
        const tipoEncontro=this._html(e.modalidade||'Presencial');
        const nomeUC=aula?`${this._html(e.uc_referencia)} · ${this._html(e.uc_titulo)} | ${tipoEncontro}`:'Cancelamento';
        return `<article title="Duplo clique para editar" class="espelho-card relative min-h-[88px] rounded-lg border ${className} p-2 shadow-sm transition-all ${this.editavel?'cursor-grab active:cursor-grabbing':''}" style="${aula?`border-color:${palAula.border};background:${palAula.soft};box-shadow:inset 3px 0 0 ${palAula.border}`:''}" data-encontro-id="${this._html(e.id)}" data-id-turma="${this._html(turma.id)}" data-data="${this._html(e.data)}" data-tipo="${this._html(e.tipo||'aula')}" ${this.editavel && aula ? 'draggable="true"' : ''}>${this.editavel&&aula?`<input type="checkbox" aria-label="Selecionar encontro" class="espelho-alvo-chk absolute left-1 top-1 z-20 h-4 w-4 cursor-pointer rounded border-blue-400 bg-white shadow" data-id-turma="${this._html(turma.id)}" data-data="${this._html(e.data)}" data-id="${this._html(e.id)}">`:''}${aula?`<div class="relative"><strong class="flex min-h-8 w-full items-center justify-center rounded-md border border-white/90 px-2 py-1 pr-6 text-center text-base font-black leading-tight tracking-tight text-slate-950 shadow-sm sm:text-lg" style="background:color-mix(in srgb, ${palAula.header} 72%, white)">${nomeUC}</strong>${canRemove?`<button type="button" class="btn-remover-encontro absolute right-1 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-rose-600 text-sm leading-none" data-id="${this._html(e.id)}" title="Remover">×</button>`:''}</div><div class="mt-1.5 flex flex-wrap items-center gap-1.5"><div class="min-w-0 flex-1 rounded-md border border-white/90 px-2 py-1 text-sm font-extrabold leading-tight text-indigo-950 shadow-sm" style="background:color-mix(in srgb, ${palAula.header} 72%, white)">${docenteTxt}</div><div class="ml-auto flex shrink-0 items-center justify-end gap-1"><span class="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-1.5 text-[9px] font-extrabold leading-tight text-slate-800 shadow-sm">Encontro ${indice}/${total || '—'}</span>${flags}</div></div>${(sala||e.descricao)?`<div class="mt-1.5 flex flex-wrap items-center gap-1">${sala}${e.descricao?`<span class="min-w-0 break-words text-[10px] font-medium text-slate-600">${this._html(e.descricao)}</span>`:''}</div>`:''}`:`<div class="flex min-h-8 items-center justify-center text-center text-base font-black text-rose-900">Cancelamento</div><div class="mt-1 text-xs font-semibold text-rose-800">${this._html(e.descricao || 'Data cancelada para esta turma')}</div>`}</article>`;
    },

    _proximaDataLivre(turma, depoisDe, ignorarIds=new Set()) {
        if(!turma.d_termino) return null;
        const mapa=this._mapaEncontros(), excecoes=this._mapaExcecoes(), dias=new Set(this._diasTurma(turma));
        const d=new Date(`${depoisDe}T12:00:00`);d.setDate(d.getDate()+1);
        const fim=new Date(`${turma.d_termino}T12:00:00`);
        const ignoradas = Array.isArray(turma.excecoes_ignoradas) ? turma.excecoes_ignoradas : [];
        for(;d<=fim;d.setDate(d.getDate()+1)){
            if(!dias.has(d.getDay()))continue;
            const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const excAtiva = excecoes.has(iso) && !ignoradas.includes(iso);
            if(excAtiva)continue;
            const ocupado=mapa.get(`${turma.id}|${iso}`);
            if(!ocupado||ignorarIds.has(ocupado.id))return iso;
        }
        return null;
    },

    _registrarDragDrop() {
        const pane=document.getElementById('espelho-painel'); if(!pane)return;
        pane.ondragstart=e=>{const card=e.target.closest('.espelho-card');if(!card||card.dataset.tipo==='cancelamento')return;if(this.alvosEdicaoLote.size){e.preventDefault();this._mostrarStatus('Limpe a seleção em lote antes de arrastar encontros.',true);return;}this.draggedId=card.dataset.encontroId;this.lastDragTarget='';e.dataTransfer.setData('text/plain',this.draggedId);e.dataTransfer.effectAllowed='move';};
        pane.ondragover=e=>{
            const id=this.draggedId||e.dataTransfer?.getData?.('text/plain');if(!id)return;e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';
            const rect=pane.getBoundingClientRect?.();
            if(rect){const edge=56,step=(distance)=>Math.min(28,Math.max(6,Math.ceil(distance*0.45)));if(e.clientY<rect.top+edge)pane.scrollTop-=step(rect.top+edge-e.clientY);else if(e.clientY>rect.bottom-edge)pane.scrollTop+=step(e.clientY-(rect.bottom-edge));if(e.clientX<rect.left+edge)pane.scrollLeft-=step(rect.left+edge-e.clientX);else if(e.clientX>rect.right-edge)pane.scrollLeft+=step(e.clientX-(rect.right-edge));}
            const target=e.target.closest?.('.espelho-dropzone, .espelho-card');if(!target)return;
            const source=this.encontros.find(x=>x.id===id);if(!source)return;
            const idTurma=target.dataset.idTurma||target.closest('[data-id-turma]')?.dataset.idTurma,newDate=target.dataset.data||target.closest('.espelho-card')?.dataset.data;
            const key=`${idTurma}|${newDate}`;if(this.lastDragTarget===key)return;this.lastDragTarget=key;
            if(idTurma!==source.id_turma||!newDate)return;
            const turma=this.turmas.find(t=>t.id===source.id_turma);if(!turma)return;
            const ignoradas = Array.isArray(turma.excecoes_ignoradas) ? turma.excecoes_ignoradas : [];
            if(this._mapaExcecoes().has(newDate) && !ignoradas.includes(newDate))return;
            const map=this._mapaEncontros(),occupant=map.get(`${turma.id}|${newDate}`),current=this.pendenciasArraste.get(id)?.data||source.data;
            if(current===newDate||occupant?.id===id||occupant?.tipo==='cancelamento')return;
            if(occupant){const next=this._proximaDataLivre(turma,newDate,new Set([id,occupant.id]));if(!next)return;this.pendenciasArraste.set(occupant.id,{id_turma:turma.id,data:next,SS:false,SGO:false});}
            if(newDate===source.data&&!source.SS&&!source.SGO&&!this.pendenciasArraste.has(id))this.pendenciasArraste.delete(id);else this.pendenciasArraste.set(id,{id_turma:turma.id,data:newDate,SS:false,SGO:false});
            pane.querySelectorAll('.espelho-drag-preview').forEach(n=>n.remove());
            const sourceCard=pane.querySelector(`.espelho-card[data-encontro-id="${CSS.escape(id)}"]`);if(sourceCard)sourceCard.classList.add('opacity-30');
            const addPreview=(cardId,date)=>{const original=pane.querySelector(`.espelho-card[data-encontro-id="${CSS.escape(cardId)}"]`);const cell=[...pane.querySelectorAll('td[data-id-turma][data-data]')].find(td=>td.dataset.idTurma===source.id_turma&&td.dataset.data===date);if(!original||!cell)return;const clone=original.cloneNode(true);clone.removeAttribute('draggable');clone.classList.remove('opacity-30');clone.classList.add('espelho-drag-preview','ring-2','ring-indigo-400','shadow-lg');clone.style.pointerEvents='none';clone.querySelectorAll('button').forEach(b=>b.remove());const inner=cell.querySelector('.espelho-drag-preview');inner?.remove();cell.appendChild(clone);};
            const targetCell=target.closest('td');if(targetCell){const clone=sourceCard?.cloneNode(true);if(clone){clone.removeAttribute('draggable');clone.classList.remove('opacity-30');clone.classList.add('espelho-drag-preview','ring-2','ring-indigo-400','shadow-lg');clone.style.pointerEvents='none';clone.querySelectorAll('button').forEach(b=>b.remove());targetCell.appendChild(clone);}}
            for(const [movedId,m] of this.pendenciasArraste){if(movedId===id)continue;const origin=pane.querySelector(`.espelho-card[data-encontro-id="${CSS.escape(movedId)}"]`);origin?.classList.add('opacity-30');addPreview(movedId,m.data);}
        };
        pane.ondragleave=e=>e.target.closest('.espelho-dropzone, .espelho-card')?.classList.remove('ring-2','ring-blue-400');
        pane.ondrop=e=>{if(e.target.closest('.espelho-dropzone,.espelho-card'))e.preventDefault();};
        pane.ondragend=()=>{this.draggedId=null;this.lastDragTarget='';this.renderizarMapa();this._registrarDragDrop();if(this.pendenciasArraste.size)this._mostrarStatus('Encontro(s) reposicionado(s). Use Salvar Alterações no cabeçalho da turma.');};
    }
});