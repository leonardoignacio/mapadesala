// ./espelho/app_espelho.js - Interações do Mapa de Aulas
window.AppEspelho = {
    turmas: [], cursos: [], encontros: [], excecoes: [], docentes: [], salas: [], selecionadas: new Set(), turmaDistribuicao: null, csvRows: [], editavel: false, pendenciasArraste: new Map(), gruposFiltro: [], docentesPorDia: new Map(), docentesEncontroIds: new Set(), docentesModalDraft: new Set(), docentesModalContext: null, turmaEdicao: null, periodoMapa: 'MANHÃ', filtrosDiasPorPeriodo: new Map(), filtroDiasAberto: false, filtroAnosAberto: false, mesesVisiveis: null, turmaRemocao: null, _filtroOutsideHandler: null, _resizeMapaHandler: null, _resizeMapaTimer: null, _lastMapWidth: 0,
    meses: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
    dias: ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'],
    _html(s) { return (s ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
    _dataBR(iso) { const [y,m,d] = (iso || '').split('-'); return y ? `${d}/${m}/${y}` : iso; },
    _norm(s) { return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase(); },
    _podeEditar() { return ['root','admin','tecnico','docente'].includes(window.usuarioAtual?.cargo); },

    async iniciarView() {
        this.editavel = this._podeEditar();
        const pane = document.getElementById('espelho-painel');
        try {
            const base = await window.ControllerEspelho.carregarBase();
            this.turmas = base.turmas; this.cursos = base.cursos || []; this.encontros = base.encontros; this.excecoes = base.excecoes; this.docentes = base.docentes; this.salas = base.salas;
            this.selecionadas = new Set(this.turmas.map(t => t.id));
            this._renderizarFiltros(); this._renderizarSalas(); this.renderizarMapa(); this._registrarDragDrop(); this._registrarFechamentoFiltroDias(); this._registrarResizeMapa();
        } catch (err) {
            if (pane) pane.innerHTML = `<div class="m-4 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700">Não foi possível carregar o mapa: ${this._html(err.message)}<br><span class="text-xs">Verifique as regras de leitura das coleções turmas, cursos, usuarios, encontros e datas_excecoes.</span></div>`;
        }
    },

    _registrarFechamentoFiltroDias() {
        if(this._filtroOutsideHandler)return;
        this._filtroOutsideHandler=e=>{
            if(!this.filtroDiasAberto&&!this.filtroAnosAberto)return;
            const caminho=e.composedPath?.()||[];
            if(caminho.some(node=>['filtro-dias-container','filtro-anos-container'].includes(node?.id))||e.target?.closest?.('#filtro-dias-container, #filtro-anos-container'))return;
            setTimeout(()=>{
                if(!this.filtroDiasAberto&&!this.filtroAnosAberto)return;
                this.filtroDiasAberto=false;this.filtroAnosAberto=false;
                if(document.getElementById('espelho-painel')){this.renderizarMapa();this._registrarDragDrop();}
            },0);
        };
        document.addEventListener('click',this._filtroOutsideHandler);
    },
    _hojeISO() { const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; },
    _contagemEncontrosUC(turmaId,ucId) { return this.encontros.filter(x=>x.id_turma===turmaId&&x.id_uc===ucId&&x.tipo!=='cancelamento').length; },
    _contagemFuturaUC(turmaId,ucId) { const hoje=this._hojeISO();return this.encontros.filter(x=>x.id_turma===turmaId&&x.tipo!=='cancelamento'&&x.data>hoje&&(ucId==='TODAS'||x.id_uc===ucId)).length; },
    _totalEncontrosComCH(uc,turma,ch) { const carga=Number(uc?.carga_horaria)||0;if(!(Number(ch)>0))return 0;return carga>0?Math.ceil(carga/Number(ch)):this._totalEncontros(uc,turma); },
    _ucsPendentes(turma,ch) { return this._ucsOrdenadas(turma).map(uc=>{const id=uc.id_uc_base||uc.id,total=this._totalEncontrosComCH(uc,turma,ch),distribuidos=this.encontros.filter(e=>e.id_turma===turma.id&&e.id_uc===id&&e.tipo!=='cancelamento').length;return{uc,id,total,distribuidos,faltam:Math.max(0,total-distribuidos)};}).filter(x=>x.faltam>0); },
    _popularUcsDistribuicao(preferida=null) {
        const turma=this.turmaDistribuicao,select=document.getElementById('dist-uc');if(!turma||!select)return;
        const ch=Number(document.getElementById('dist-ch')?.value)||0,pendentes=this._ucsPendentes(turma,ch);
        const opts=pendentes.map(x=>`<option value="${this._html(x.id)}">${this._html(x.uc.referencia)} — ${this._html(x.uc.titulo)} (${x.faltam} pendente(s))</option>`);
        opts.push(`<option value="TODAS" ${pendentes.length?'':'disabled'}>TODAS — distribuir todas as UCs pendentes</option>`);
        if(!pendentes.length)opts.unshift('<option value="" disabled selected>Nenhuma UC pendente de distribuição</option>');
        select.innerHTML=opts.join('');
        select.value=preferida==='TODAS'&&pendentes.length?'TODAS':(pendentes.some(x=>x.id===preferida)?preferida:(pendentes[0]?.id||''));
        this._renderizarProgressoDistribuicao();
    },
    _renderizarProgressoDistribuicao() {
        const out=document.getElementById('progresso-distribuicao'),turma=this.turmaDistribuicao;if(!out||!turma)return;
        const ch=Number(document.getElementById('dist-ch')?.value)||0,value=document.getElementById('dist-uc')?.value||'',ucs=value==='TODAS'?this._ucsOrdenadas(turma):this._ucsOrdenadas(turma).filter(u=>(u.id_uc_base||u.id)===value);
        let total=0,distribuidos=0;for(const uc of ucs){const id=uc.id_uc_base||uc.id;total+=this._totalEncontrosComCH(uc,turma,ch);distribuidos+=this.encontros.filter(e=>e.id_turma===turma.id&&e.id_uc===id&&e.tipo!=='cancelamento').length;}
        const feitos=Math.min(total,distribuidos),faltam=Math.max(0,total-feitos),pct=total?Math.round(feitos/total*100):0,pctFalta=total?100-pct:0;
        const bars=[['Total previsto',total?100:0,`${total} encontro(s) previstos`,'bg-slate-400'],['Já distribuídos',pct,`${feitos} de ${total} · ${pct}%`,'bg-emerald-500'],['Faltam distribuir',pctFalta,`${faltam} de ${total} · ${pctFalta}%`,'bg-indigo-500']];
        out.innerHTML=bars.map(([label,p,text,color])=>`<div><div class="mb-1 flex justify-between gap-2 text-[11px]"><span class="font-semibold text-slate-600">${label}</span><span class="text-slate-500">${text}</span></div><div class="h-2 overflow-hidden rounded-full bg-slate-200"><div class="h-full ${color} transition-all duration-300" style="width:${p}%"></div></div></div>`).join('');
    },
    _atualizarResumoRemocaoUC() {
        const select=document.getElementById('select-remover-uc'),out=document.getElementById('resumo-remocao-uc'),btn=document.getElementById('btn-confirmar-remover-uc');
        const todas=select?.value==='TODAS',uc=(this.turmaRemocao?.ucs||[]).find(x=>(x.id_uc_base||x.id)===select?.value),n=select?.value?this._contagemFuturaUC(this.turmaRemocao?.id,select.value):0;
        if(out)out.textContent=n?`${n} encontro(s) futuro(s) ${todas?'de todas as UCs':`da UC ${uc?.referencia||'selecionada'}`} serão removidos. Datas passadas (e hoje) serão preservadas.`:'Não há encontros futuros para remover. Datas passadas (e hoje) serão preservadas.';
        if(btn)btn.disabled=!n;
    },
    abrirModalRemocaoUC(idTurma) {
        const turma=this.turmas.find(t=>t.id===idTurma);if(!turma)return;
        if([...this.pendenciasArraste.values()].some(m=>m.id_turma===idTurma)){this._mostrarStatus('Salve as alterações pendentes desta turma antes de remover encontros.',true);return;}
        this.turmaRemocao=turma;
        const select=document.getElementById('select-remover-uc');
        document.getElementById('subtitulo-modal-remover-uc').textContent=`${turma.referencia} · ${turma.curso_titulo||''}`;
        const ucs=this._ucsOrdenadas(turma).filter(u=>this._contagemEncontrosUC(turma.id,u.id_uc_base||u.id)>0),futuros=this._contagemFuturaUC(turma.id,'TODAS');
        const opts=ucs.map(u=>{const id=u.id_uc_base||u.id,n=this._contagemFuturaUC(turma.id,id),total=this._contagemEncontrosUC(turma.id,id);return `<option value="${this._html(id)}">${this._html(u.referencia)} — ${this._html(u.titulo)} (${n} futuro(s) de ${total})</option>`;});
        if(futuros)opts.push(`<option value="TODAS">TODAS — remover todos os futuros (${futuros})</option>`);
        select.innerHTML=opts.join('')||'<option value="">Nenhuma UC distribuída</option>';
        const disponivel=ucs.find(u=>this._contagemFuturaUC(turma.id,u.id_uc_base||u.id)>0)||ucs[0];if(disponivel)select.value=disponivel.id_uc_base||disponivel.id;else if(futuros)select.value='TODAS';
        this._atualizarResumoRemocaoUC();const modal=document.getElementById('modal-remover-uc');modal.classList.remove('hidden');modal.classList.add('flex');
    },
    async confirmarRemocaoUC() {
        const turma=this.turmaRemocao,select=document.getElementById('select-remover-uc'),ucId=select?.value,btn=document.getElementById('btn-confirmar-remover-uc');
        if(!turma||!ucId||!this._contagemFuturaUC(turma.id,ucId))return;
        const uc=ucId==='TODAS'?null:(turma.ucs||[]).find(x=>(x.id_uc_base||x.id)===ucId),hoje=this._hojeISO();
        if(btn){btn.disabled=true;btn.textContent='Removendo…';}
        try{const removidos=await window.ControllerEspelho.excluirEncontrosDaUC(turma.id,ucId,this.turmas);this.encontros=this.encontros.filter(x=>!(x.id_turma===turma.id&&x.tipo!=='cancelamento'&&x.data>hoje&&(ucId==='TODAS'||x.id_uc===ucId)));this.fecharModal('modal-remover-uc');this.renderizarMapa();this._registrarDragDrop();this._mostrarStatus(`${removidos} encontro(s) futuro(s) removido(s)${uc?` da UC ${uc.referencia}`:' de todas as UCs'}.`);}
        catch(err){const out=document.getElementById('resumo-remocao-uc');if(out){out.textContent=`Não foi possível remover os encontros: ${err.message}`;out.className='rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800';}this._mostrarStatus(`Não foi possível remover os encontros: ${err.message}`,true);}
        finally{if(btn){btn.disabled=false;btn.textContent='Remover encontros';}}
    },
    _renderizarFiltros() {
        const c = document.getElementById('espelho-filtro-areas'); if (!c) return;
        if (!this.turmas.length) { c.innerHTML = '<span class="text-sm text-slate-400">Nenhum curso/turma disponível para suas áreas.</span>'; return; }
        const grupos = new Map();
        this.turmas.forEach(t => {
            const area = t.area || t.curso_area || t.curso_tipo || 'Sem área informada';
            if (!grupos.has(area)) grupos.set(area,new Map());
            const cursos = grupos.get(area); const chave = t.id_curso || t.curso_titulo || 'curso-sem-identificacao';
            if (!cursos.has(chave)) cursos.set(chave,{nome:t.curso_titulo||'Curso sem título',turmas:[]});
            cursos.get(chave).turmas.push(t);
        });
        this.gruposFiltro=[];
        c.innerHTML=[...grupos.entries()].map(([area,cursos],ai)=>{
            const cursoArr=[...cursos.entries()].map(([key,value])=>({key,nome:value.nome,turmas:value.turmas}));this.gruposFiltro.push({area,cursos:cursoArr});
            const idsArea=[...cursos.values()].flatMap(x=>x.turmas.map(t=>t.id));
            const todosArea=idsArea.every(id=>this.selecionadas.has(id));
            const cursoHtml=cursoArr.map((curso,ci)=>`<div class="rounded-lg border border-slate-100 p-2"><label class="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" class="espelho-course-chk rounded text-blue-600" data-area-index="${ai}" data-course-index="${ci}" ${curso.turmas.every(t=>this.selecionadas.has(t.id))?'checked':''}>${this._html(curso.nome)} <span class="font-normal text-slate-400">(${curso.turmas.length} turma(s))</span></label><div class="flex flex-wrap gap-1.5 mt-1.5 pl-6">${curso.turmas.map(t=>`<label class="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-semibold cursor-pointer hover:bg-blue-50"><input type="checkbox" class="espelho-turma-chk rounded text-blue-600" value="${this._html(t.id)}" ${this.selecionadas.has(t.id)?'checked':''}>${this._html(t.referencia||'Turma')}</label>`).join('')}</div></div>`).join('');
            return `<section class="border border-slate-200 rounded-lg bg-slate-50/60 overflow-hidden"><div class="flex items-center gap-2 p-2.5 text-sm font-bold text-slate-700"><input type="checkbox" aria-label="Selecionar área ${this._html(area)}" class="espelho-area-chk rounded text-blue-600" data-area-index="${ai}" ${todosArea?'checked':''}><span class="flex-1">${this._html(area)}</span><span class="text-[10px] font-normal text-slate-400">${idsArea.length} turma(s)</span><button type="button" class="btn-area-marcar-todas text-[10px] font-bold text-blue-700 hover:underline" data-area-index="${ai}">Marcar todas</button></div><div class="p-2 space-y-2 border-t border-slate-200">${cursoHtml}</div></section>`;
        }).join('');
        this._renderizarTurmasSelecionadas();
    },

    _renderizarTurmasSelecionadas() {
        const arr=this.turmas.filter(t=>this.selecionadas.has(t.id));
        const label=document.getElementById('espelho-contagem-turmas');if(label)label.textContent=`${arr.length} de ${this.turmas.length} turmas selecionadas`;
        const all=document.getElementById('espelho-mostrar-todas');if(all)all.checked=this.turmas.length>0&&arr.length===this.turmas.length;
    },

    _renderizarSalas() {
        const el=document.getElementById('espelho-lista-salas');if(!el)return;
        if(!this.salas.length){el.innerHTML='<p class="py-4 text-sm text-slate-400">Nenhuma sala cadastrada.</p>';return;}
        el.innerHTML=this.salas.map(s=>`<div class="py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"><span class="font-bold text-sm text-slate-800">${this._html(s.referencia||s.nome||'Sala')}</span><span class="px-2 py-0.5 w-fit rounded-full text-[10px] font-bold ${s.tipo==='Laboratório'?'bg-violet-50 text-violet-700':'bg-sky-50 text-sky-700'}">${this._html(s.tipo||'Comum')}</span><span class="text-xs text-slate-500">${Number(s.numero_cadeiras)||0} cadeiras</span>${s.observacoes?`<span class="text-xs text-slate-500 sm:ml-auto">${this._html(s.observacoes)}</span>`:''}</div>`).join('');
    },

    _docentesDaTurma(turma) {
        const areaCurso=turma.curso_area||turma.area||turma.curso_tipo;const areasCurso=areaCurso?[this._norm(typeof areaCurso==='object'?(areaCurso.nome||areaCurso.area||areaCurso.referencia):areaCurso)]:[];
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
    _mapaEncontros() { const m = new Map(); this.encontros.forEach(e => {const staged=this.pendenciasArraste.get(e.id);const item=staged?{...e,data:staged.data,SS:false,SGO:false}:e;m.set(`${item.id_turma}|${item.data}`,item);}); return m; },
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
        const todasTurmas=this.turmas.filter(t=>this.selecionadas.has(t.id));
        if(!todasTurmas.length){pane.innerHTML='<div class="p-10 text-center text-slate-400">Selecione ao menos uma turma para exibir o mapa.</div>';return;}
        const periodos=[['MANHÃ','Manhã'],['TARDE','Tarde'],['NOITE','Noite'],['SÁBADOS','Sábados']];
        if(!periodos.some(([key])=>key===this.periodoMapa))this.periodoMapa='MANHÃ';
        const tabs=`<div class="flex flex-wrap gap-2 border-b border-slate-200 bg-white/95 px-1 py-2 backdrop-blur">${periodos.map(([key,label])=>{const count=todasTurmas.filter(t=>this._grupoPeriodo(t)===key).length;return `<button type="button" class="btn-periodo-mapa whitespace-nowrap rounded-lg border px-3 py-2 text-xs sm:text-sm font-bold transition ${this.periodoMapa===key?'border-blue-600 bg-blue-600 text-white shadow-sm':'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}" data-periodo="${key}">${label}<span class="ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${this.periodoMapa===key?'bg-white/20':'bg-slate-100'}">${count}</span></button>`;}).join('')}</div>`;
        const turmas=todasTurmas.filter(t=>this._grupoPeriodo(t)===this.periodoMapa);
        if(!turmas.length){pane.innerHTML=tabs+'<div class="m-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">Nenhuma turma selecionada para este período.</div>';pane.scrollTop=scrollTop;pane.scrollLeft=scrollLeft;return;}
        const paletteById=new Map(turmas.map(t=>[t.id,this._paletaTurma(t.id)]));
        const mapaE=this._mapaEncontros(),mapaX=this._mapaExcecoes(),datas=[],diasVisiveis=this._diasVisiveisPeriodo();
        turmas.forEach(t=>{if(t.d_inicio&&t.d_termino){const a=new Date(`${t.d_inicio}T12:00:00`),b=new Date(`${t.d_termino}T12:00:00`);if(!Number.isNaN(a.getTime())&&!Number.isNaN(b.getTime()))datas.push(a,b);}});
        this.encontros.filter(e=>turmas.some(t=>t.id===e.id_turma)&&/^\d{4}-\d{2}-\d{2}$/.test(e.data)).forEach(e=>datas.push(new Date(`${e.data}T12:00:00`)));
        if(!datas.length){pane.innerHTML='<div class="p-10 text-center text-slate-400">As turmas selecionadas não possuem período válido.</div>';return;}
        const minY=Math.min(...datas.map(d=>d.getFullYear())),maxY=Math.max(...datas.map(d=>d.getFullYear()));
        const viewportWidth=Math.max(320,Number(pane.clientWidth)||Number(window.innerWidth)||1024);
        const dataColWidth=viewportWidth<480?88:100;
        const turmaColWidth=Math.max(168,Math.floor((viewportWidth-dataColWidth-24)/turmas.length));
        const tableMinWidth=dataColWidth+turmaColWidth*turmas.length;
        const colGroup=`<colgroup><col style="width:${dataColWidth}px">${turmas.map(()=>`<col style="width:${turmaColWidth}px">`).join('')}</colgroup>`;
        const colHead=turmas.map(t=>{const pal=paletteById.get(t.id);const nPend=[...this.pendenciasArraste.values()].filter(m=>m.id_turma===t.id).length;return `<th class="border border-slate-300/70 px-2 py-2 text-left align-top" style="border-color:${pal.border};background:${pal.header};color:${pal.text}"><div class="flex items-start justify-between gap-2"><div class="min-w-0"><div class="text-sm font-extrabold">${this._html(t.referencia)}</div><div class="text-[10px] font-medium opacity-80 break-words">${this._html(t.curso_titulo||'')} · ${this._html(t.periodo||'')}</div></div><div class="flex shrink-0 flex-col items-center gap-1">${nPend?`<div class="flex items-center gap-1"><button type="button" class="btn-salvar-movimentos text-[9px] px-1.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" data-id-turma="${this._html(t.id)}">Salvar (${nPend})</button><button type="button" aria-label="Descartar alterações de arraste" title="Descartar alterações não salvas" class="btn-descartar-movimentos flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300" data-id-turma="${this._html(t.id)}"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 2.64-6.36L3 8m0-5v5h5M12 8v4l3 2"/></svg></button></div>`:''}${this.editavel?`<div class="flex flex-col items-center gap-1"><button type="button" aria-label="Distribuir encontros" title="Distribuir encontros" class="btn-distribuir-turma flex h-6 w-6 items-center justify-center rounded-md bg-indigo-700 text-white hover:bg-indigo-800" data-id-turma="${this._html(t.id)}"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3m8-3v3M4 9h16M6 13h4m-2-2v4M4 5h16v15H4z"/></svg></button><button type="button" aria-label="Remover encontros futuros de uma UC" title="Remover encontros futuros" class="btn-abrir-modal-remover-uc flex h-6 w-6 items-center justify-center rounded-md bg-rose-600 text-white hover:bg-rose-700" data-id-turma="${this._html(t.id)}"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/></svg></button></div>`:''}</div></div></th>`;}).join('');
        const mesesSelecionados=this._mesesSelecionados();
        const anosSet=new Set();turmas.forEach(t=>{if(t.d_inicio&&t.d_termino){for(let ano=Number(t.d_inicio.slice(0,4));ano<=Number(t.d_termino.slice(0,4));ano++)anosSet.add(ano);}});this.encontros.filter(e=>turmas.some(t=>t.id===e.id_turma)&&/^\d{4}-\d{2}-\d{2}$/.test(e.data)).forEach(e=>anosSet.add(Number(e.data.slice(0,4))));const anosDisponiveis=[...anosSet].sort((a,b)=>a-b);
        const filtroAnos=`<div id="filtro-anos-container" class="relative mt-1"><button id="btn-toggle-filtro-anos" type="button" aria-expanded="${this.filtroAnosAberto}" class="rounded border border-slate-300 bg-white px-1.5 py-1 text-[9px] font-semibold text-slate-600 hover:bg-slate-50">ANOS ▾</button>${this.filtroAnosAberto?`<div class="absolute left-0 top-full z-[81] mt-1 max-h-[60vh] w-64 overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl">${anosDisponiveis.map(ano=>{const mesesAno=Array.from({length:12},(_,mi)=>`${ano}-${String(mi+1).padStart(2,'0')}`),todos=mesesAno.every(k=>mesesSelecionados.has(k)),algum=mesesAno.some(k=>mesesSelecionados.has(k));return `<details class="border-b border-slate-100 py-1" ${algum?'open':''}><summary class="list-none flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50"><input type="checkbox" class="espelho-filtro-ano-chk h-3.5 w-3.5 rounded text-blue-600" onclick="event.stopPropagation()" data-ano="${ano}" data-misto="${algum&&!todos}" ${todos?'checked':''}><span class="text-xs font-bold text-slate-700">${ano}</span><span class="ml-auto text-[10px] text-slate-400">12 meses</span></summary><div class="grid grid-cols-2 gap-x-2 pl-5">${this.meses.map((m,mi)=>{const key=mesesAno[mi];return `<label class="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50"><input type="checkbox" class="espelho-filtro-mes-chk h-3 w-3 rounded text-blue-600" data-mes="${key}" ${mesesSelecionados.has(key)?'checked':''}>${m}</label>`;}).join('')}</div></details>`;}).join('')}<button type="button" id="btn-restaurar-filtro-anos" class="mt-2 w-full rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200">Restaurar padrão (atual + 6 meses)</button></div>`:''}</div>`;
        const filtroDias=`<div class="flex items-center gap-1"><div id="filtro-dias-container" class="relative mt-1"><button id="btn-toggle-filtro-dias" type="button" aria-expanded="${this.filtroDiasAberto}" class="rounded border border-slate-300 bg-white px-1.5 py-1 text-[9px] font-semibold text-slate-600 hover:bg-slate-50">Filtrar dias ▾</button>${this.filtroDiasAberto?`<div class="absolute left-0 top-full z-[80] mt-1 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">${this.dias.map((d,i)=>`<label class="flex items-center gap-2 rounded px-1 py-1 text-[10px] font-medium hover:bg-slate-50"><input type="checkbox" class="espelho-filtro-dia-chk h-3 w-3 rounded text-blue-600" value="${i}" ${diasVisiveis.has(i)?'checked':''}>${d}</label>`).join('')}<button type="button" id="btn-restaurar-filtro-dias" class="mt-1 w-full rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200">Restaurar padrão desta aba</button></div>`:''}</div>${filtroAnos}</div>`;
        let html=`<div class="sticky top-0 z-[45] bg-white shadow-md">${tabs}<div class="px-px"><table class="border-collapse w-full" style="table-layout:fixed;min-width:${tableMinWidth}px">${colGroup}<thead><tr><th class="sticky left-0 z-40 border-b border-slate-200 bg-slate-100 p-2 text-left text-[10px] uppercase text-slate-800" style="width:${dataColWidth}px">Data${filtroDias}</th>${colHead}</tr></thead></table></div></div>`;
        for(let y=minY;y<=maxY;y++){
            if(!Array.from({length:12},(_,mi)=>`${y}-${String(mi+1).padStart(2,'0')}`).some(k=>mesesSelecionados.has(k)))continue;
            const nAno=this.encontros.filter(e=>turmas.some(t=>t.id===e.id_turma)&&(e.data||'').startsWith(`${y}-`)).length;
            const mesesHtml=this.meses.map((mes,mi)=>{
                const mesKey=`${y}-${String(mi+1).padStart(2,'0')}`;
                if(!mesesSelecionados.has(mesKey))return '';
                const mesAtivo=turmas.some(t=>t.d_inicio&&t.d_termino&&t.d_inicio.slice(0,7)<=mesKey&&t.d_termino.slice(0,7)>=mesKey)||this.encontros.some(e=>turmas.some(t=>t.id===e.id_turma)&&(e.data||'').startsWith(`${mesKey}-`));
                const rows=[],diasMes=new Date(y,mi+1,0).getDate();
                if(mesAtivo)for(let dia=1;dia<=diasMes;dia++){
                    const dt=new Date(y,mi,dia,12),dow=dt.getDay(),iso=`${y}-${String(mi+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`,exc=mapaX.get(iso),domingo=dow===0;if(!diasVisiveis.has(dow))continue;
                    const cells=turmas.map(t=>{
                        const ativo=!!t.d_inicio&&!!t.d_termino&&iso>=t.d_inicio&&iso<=t.d_termino,e=mapaE.get(`${t.id}|${iso}`),pal=paletteById.get(t.id),palUC=e&&e.tipo!=='cancelamento'?this._paletaUC(e.id_uc,t,pal):pal,exStyle=this._estiloExcecao(exc),cellStyle=`border-left:2px solid ${pal.border};background:${exc?exStyle.bg:(domingo?'#fff1f2':(e?palUC.soft:pal.empty))}`;
                        if(e)return `<td class="align-top p-1.5 border border-slate-300/60 transition-colors hover:brightness-95" style="${cellStyle}">${this._renderizarCartao(e,t,pal)}</td>`;
                        if(!ativo)return `<td class="border border-slate-200/70" style="${cellStyle}"></td>`;
                        if(exc)return `<td class="align-top p-1.5 border border-slate-300/60 transition-colors hover:brightness-95" style="border-left:2px solid ${pal.border};background:${exStyle.bg}"><div class="min-h-[88px] rounded-lg border p-2 text-xs flex flex-col justify-center" style="border-color:${exStyle.border};background:${exStyle.bg};color:${exStyle.text}"><strong>${this._html(exc.excecao||'Exceção')}</strong><div>${this._html(exc.descricao||'Data sem aula')}</div></div></td>`;
                        return `<td class="align-top p-1.5 border border-slate-300/60 transition-colors hover:brightness-95 ${this.editavel?'espelho-dropzone':''}" style="${cellStyle}" data-id-turma="${this._html(t.id)}" data-data="${iso}"><div class="min-h-[88px] rounded-lg border border-dashed ${domingo?'border-rose-200 bg-rose-50/70':'border-slate-300 bg-white'} flex flex-col items-center justify-center gap-1 p-1.5"><span class="text-[10px] ${domingo?'text-rose-300':'text-slate-400'}">Vazio</span>${this.editavel?`<div class="flex gap-1"><button type="button" class="btn-add-encontro text-[10px] px-1.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100" data-id-turma="${this._html(t.id)}" data-data="${iso}">+ Encontro</button><button type="button" class="btn-add-cancelamento text-[10px] px-1.5 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100" data-id-turma="${this._html(t.id)}" data-data="${iso}">Cancelar</button></div>`:''}</div></td>`;
                    }).join('');
                    const lineBg=domingo?'bg-rose-50':(turmas.some(t=>mapaE.has(`${t.id}|${iso}`))?'bg-white':'bg-slate-50/50');
                    rows.push(`<tr class="${lineBg} hover:brightness-[0.99] border-b border-slate-300/70"><th class="sticky left-0 z-10 ${domingo?'bg-rose-100':'bg-slate-100'} border-b border-slate-200 p-2 text-left" style="width:${dataColWidth}px"><div class="text-sm font-extrabold ${domingo?'text-rose-800':'text-slate-700'}">${String(dia).padStart(2,'0')} ${mes.slice(0,3)}</div><div class="text-[10px] font-medium ${domingo?'text-rose-600':'text-slate-500'}">${this.dias[dow]}</div>${domingo?'<span class="text-[9px] font-extrabold text-rose-600">INÍCIO DA SEMANA</span>':''}${exc?`<span class="mt-1 block text-[9px] font-bold" style="color:${this._estiloExcecao(exc).text}">${this._html(exc.excecao||'EXCEÇÃO')}</span>`:''}</th>${cells}</tr>`);
                }
                const key=`mes-${y}-${mi}`;const aberto=abertos.has(key)?abertos.get(key):mesAtivo;
                return `<details class="rounded-xl border border-slate-200 bg-white mb-2 espelho-mes" data-esp-key="${key}" ${aberto?'open':''}><summary class="list-none cursor-pointer flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100"><span class="font-bold text-sm text-slate-700">${mes} <span class="text-xs font-normal text-slate-400">(${rows.length} datas)</span></span><span class="text-slate-400 text-xs">⌄</span></summary><table class="border-collapse w-full" style="table-layout:fixed;min-width:${tableMinWidth}px">${colGroup}<tbody>${rows.join('')||`<tr><td colspan="${turmas.length+1}" class="p-5 text-center text-xs text-slate-400">Sem período de turma neste mês.</td></tr>`}</tbody></table></details>`;
            }).join('');
            const key=`ano-${y}`,aberto=abertos.has(key)?abertos.get(key):nAno>0;
            html+=`<details class="rounded-xl border border-slate-300 bg-white mb-2" data-esp-key="${key}" ${aberto?'open':''}><summary class="list-none cursor-pointer px-4 py-3 bg-slate-100 hover:bg-slate-200 flex justify-between items-center"><span class="font-extrabold text-slate-800">${y}</span><span class="text-xs text-slate-500">${nAno} encontro(s) · 12 meses</span></summary><div class="py-2 md:py-3">${mesesHtml}</div></details>`;
        }
        pane.innerHTML=html; pane.querySelectorAll('.espelho-filtro-ano-chk').forEach(chk=>{chk.indeterminate=chk.dataset.misto==='true';}); pane.scrollTop=scrollTop; pane.scrollLeft=scrollLeft;
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
        const className = aula ? 'text-slate-900 hover:brightness-[0.98]' : 'border-rose-200 bg-rose-50 text-rose-900';
        const flags=this.editavel?`<label class="inline-flex h-8 min-w-[34px] shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md border border-blue-200 bg-white px-1.5 text-[9px] font-extrabold text-blue-800 shadow-sm"><input type="checkbox" class="espelho-flag-encontro h-3 w-3 rounded" data-id="${this._html(e.id)}" data-flag="SS" ${e.SS?'checked':''}>SS</label><label class="inline-flex h-8 min-w-[40px] shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md border border-violet-200 bg-white px-1.5 text-[9px] font-extrabold text-violet-800 shadow-sm"><input type="checkbox" class="espelho-flag-encontro h-3 w-3 rounded" data-id="${this._html(e.id)}" data-flag="SGO" ${e.SGO?'checked':''}>SGO</label>`:`${e.SS?'<span class="inline-flex h-8 items-center rounded-md border border-blue-200 bg-white px-1.5 text-[9px] font-extrabold text-blue-800">SS</span>':''}${e.SGO?'<span class="inline-flex h-8 items-center rounded-md border border-violet-200 bg-white px-1.5 text-[9px] font-extrabold text-violet-800">SGO</span>':''}`;
        const tipoEncontro=this._html(e.modalidade||'Presencial');
        const nomeUC=aula?`${this._html(e.uc_referencia)} · ${this._html(e.uc_titulo)} | ${tipoEncontro}`:'Cancelamento';
        return `<article title="Duplo clique para editar" class="espelho-card relative min-h-[88px] rounded-lg border ${className} p-2 shadow-sm transition-all ${this.editavel?'cursor-grab active:cursor-grabbing':''}" style="${aula?`border-color:${palAula.border};background:${palAula.soft};box-shadow:inset 3px 0 0 ${palAula.border}`:''}" data-encontro-id="${this._html(e.id)}" data-id-turma="${this._html(turma.id)}" data-data="${this._html(e.data)}" data-tipo="${this._html(e.tipo||'aula')}" ${this.editavel && aula ? 'draggable="true"' : ''}>${aula?`<div class="relative"><strong class="flex min-h-8 w-full items-center justify-center rounded-md border border-white/90 px-2 py-1 pr-6 text-center text-base font-black leading-tight tracking-tight text-slate-950 shadow-sm sm:text-lg" style="background:color-mix(in srgb, ${palAula.header} 72%, white)">${nomeUC}</strong>${this.editavel?`<button type="button" class="btn-remover-encontro absolute right-1 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-rose-600 text-sm leading-none" data-id="${this._html(e.id)}" title="Remover">×</button>`:''}</div><div class="mt-1.5 flex flex-wrap items-center gap-1.5"><div class="min-w-0 flex-1 rounded-md border border-white/90 px-2 py-1 text-sm font-extrabold leading-tight text-indigo-950 shadow-sm" style="background:color-mix(in srgb, ${palAula.header} 72%, white)">${docenteTxt}</div><div class="ml-auto flex shrink-0 items-center justify-end gap-1"><span class="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-1.5 text-[9px] font-extrabold leading-tight text-slate-800 shadow-sm">Encontro ${indice}/${total || '—'}</span>${flags}</div></div>${(sala||e.descricao)?`<div class="mt-1.5 flex flex-wrap items-center gap-1">${sala}${e.descricao?`<span class="min-w-0 break-words text-[10px] font-medium text-slate-600">${this._html(e.descricao)}</span>`:''}</div>`:''}`:`<div class="flex min-h-8 items-center justify-center text-center text-base font-black text-rose-900">Cancelamento${this.editavel?`<button type="button" class="btn-remover-encontro absolute right-1 top-1 z-10 text-slate-400 hover:text-rose-600 text-sm leading-none" data-id="${this._html(e.id)}" title="Remover">×</button>`:''}</div><div class="mt-1 text-xs font-semibold text-rose-800">${this._html(e.descricao || 'Data cancelada para esta turma')}</div>`}</article>`;
    },

    _mostrarStatus(texto, erro=false) { const el=document.getElementById('espelho-status'); if (!el) return; el.textContent=texto; el.className=`mb-2 px-3 py-2 rounded-lg text-sm shrink-0 ${erro?'bg-rose-50 text-rose-700 border border-rose-200':'bg-emerald-50 text-emerald-700 border border-emerald-200'}`; setTimeout(()=>el.classList.add('hidden'),6000); },

    abrirModal(idTurma,data,tipo='aula',encontro=null) {
        const t=this.turmas.find(x=>x.id===idTurma);if(!t)return;this.turmaEdicao=t;
        const modal=document.getElementById('modal-encontro');modal.classList.remove('hidden');modal.classList.add('flex');
        const form=document.getElementById('form-espelho-encontro');form.reset();
        document.getElementById('encontro-id').value=encontro?.id||'';document.getElementById('encontro-turma-id').value=idTurma;document.getElementById('encontro-data').value=data;
        document.getElementById('titulo-modal-encontro').textContent=encontro?'Editar encontro':'Adicionar encontro';document.getElementById('subtitulo-modal-encontro').textContent=`${t.referencia} · ${this._dataBR(data)}`;
        document.getElementById('encontro-tipo').value=encontro?.tipo||tipo;
        const ucEl=document.getElementById('encontro-uc');ucEl.innerHTML='<option value="">Selecione a UC...</option>'+this._ucsOrdenadas(t).map(u=>`<option value="${this._html(u.id_uc_base||u.id)}">${this._html(u.referencia)} — ${this._html(u.titulo)} (${this._html(u.carga_horaria)}h)</option>`).join('');if(encontro?.id_uc)ucEl.value=encontro.id_uc;
        this.docentesEncontroIds=new Set((encontro?.docentes||[]).map(d=>d.id));
        const docentes=this._criarDocentesSelecionados();document.getElementById('encontro-docentes-resumo').textContent=docentes.length?docentes.map(d=>d.nome_completo).join(', '):'Nenhum selecionado';
        const sala=document.getElementById('encontro-sala');sala.innerHTML='<option value="">Sem sala definida</option>'+this.salas.map(x=>`<option value="${this._html(x.id)}">${this._html(x.referencia||x.nome||x.id)} · ${this._html(x.tipo||'')}</option>`).join('');if(encontro?.sala_id)sala.value=encontro.sala_id;
        document.getElementById('encontro-modalidade').value=encontro?.modalidade||'Presencial';document.getElementById('encontro-sala-wrap').classList.toggle('hidden',(encontro?.modalidade||'Presencial')==='Remoto');
        const chTurma=window.ControllerTurmaFrm?.calcularCHEncontro(t.h_inicio,t.h_termino)||Number(t.ch_encontro)||0;
        document.getElementById('encontro-h-inicio').value=encontro?.h_inicio||t.h_inicio||'';document.getElementById('encontro-h-termino').value=encontro?.h_termino||t.h_termino||'';document.getElementById('encontro-ch').value=encontro?.ch_encontro??chTurma;
        document.getElementById('encontro-ss').checked=!!encontro?.SS;document.getElementById('encontro-sgo').checked=!!encontro?.SGO;document.getElementById('encontro-descricao').value=encontro?.descricao||'';this._alternarCamposTipo();
    },
    _alternarCamposTipo() { const cancel=document.getElementById('encontro-tipo')?.value==='cancelamento'; document.getElementById('campos-encontro-aula')?.classList.toggle('hidden',cancel); document.getElementById('encontro-uc')?.toggleAttribute('required',!cancel); ['encontro-h-inicio','encontro-h-termino','encontro-ch'].forEach(id=>document.getElementById(id)?.toggleAttribute('required',!cancel)); },
    fecharModal(id) { const m=document.getElementById(id); if(m){m.classList.add('hidden');m.classList.remove('flex');} },

    abrirDistribuicao(idTurma) {
        const t=this.turmas.find(x=>x.id===idTurma); if(!t)return;
        this.turmaDistribuicao=t;this.csvRows=[];this.docentesPorDia=new Map();
        const hid=document.getElementById('distribuicao-turma-id');if(hid)hid.value=t.id;
        document.getElementById('subtitulo-distribuicao').textContent=`${t.referencia} · ${t.curso_titulo||''} · ${t.d_inicio?this._dataBR(t.d_inicio):''} a ${t.d_termino?this._dataBR(t.d_termino):''}`;
        const hIni=document.getElementById('dist-h-inicio'),hFim=document.getElementById('dist-h-termino');
        if(hIni)hIni.value=t.h_inicio||'';if(hFim)hFim.value=t.h_termino||'';
        const ch=window.ControllerTurmaFrm?.calcularCHEncontro(t.h_inicio,t.h_termino)||Number(t.ch_encontro)||'';
        document.getElementById('dist-ch').value=ch;
        this._popularUcsDistribuicao();
        document.getElementById('dist-modalidade').value='Presencial';
        const sala=document.getElementById('dist-sala');sala.innerHTML='<option value="">Sem sala</option>'+this.salas.map(x=>`<option value="${this._html(x.id)}">${this._html(x.referencia||x.nome||x.id)} · ${this._html(x.tipo||'')}</option>`).join('');
        sala.value=t.sala_id||'';document.getElementById('dist-obs').value='';document.getElementById('dist-sala-wrap').classList.remove('hidden');sala.disabled=false;
        const map={'Seg':1,'Ter':2,'Qua':3,'Qui':4,'Sex':5,'Sáb':6,'Sab':6,'Dom':0};
        document.getElementById('distribuicao-dias').innerHTML=(t.dias_semana||['Seg','Ter','Qua','Qui','Sex','Sáb']).map(d=>{
            const n=map[d]??map[d.slice(0,3)];
            return `<fieldset class="rounded-xl border border-slate-200 bg-slate-50 p-3" data-dist-row="${n}"><legend class="px-1"><label class="flex items-center gap-2 text-sm font-bold"><input class="dist-dia-chk rounded text-blue-600" type="checkbox" value="${n}"> ${this._html(d)}</label></legend><div class="flex flex-col sm:flex-row sm:items-center gap-2"><button type="button" class="btn-dist-docentes shrink-0 px-3 py-2 rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 text-sm font-semibold" data-dia="${n}">Selecionar docentes</button><span class="dist-docentes-resumo text-xs text-slate-500" data-dia="${n}">Nenhum docente selecionado</span></div></fieldset>`;
        }).join('');
        const f=document.getElementById('input-csv-mapa');if(f)f.value='';document.getElementById('csv-mapa-nome').textContent='';
        const modal=document.getElementById('modal-distribuicao');modal.classList.remove('hidden');modal.classList.add('flex');
    },

    abrirModalDocentes(contexto,dia=null) {
        const turma=contexto==='encontro'?this.turmaEdicao:this.turmaDistribuicao;if(!turma)return;
        this.docentesModalContext={contexto,dia};
        const selecionados=contexto==='encontro'?this.docentesEncontroIds:(this.docentesPorDia.get(Number(dia))||new Set());
        this.docentesModalDraft=new Set(selecionados);
        document.getElementById('subtitulo-modal-docentes').textContent=contexto==='encontro'?'Encontro atual':`${this.dias[Number(dia)]||'Dia'} · Distribuição in loco`;
        const lista=this._docentesDaTurma(turma);
        document.getElementById('lista-docentes-distribuicao').innerHTML=lista.length?lista.map(d=>`<label class="flex items-center gap-3 rounded-lg p-2 hover:bg-blue-50 cursor-pointer"><input type="checkbox" class="modal-docente-chk w-4 h-4 rounded text-blue-600" value="${this._html(d.id)}" ${this.docentesModalDraft.has(d.id)?'checked':''}><span class="text-sm text-slate-700">${this._html(d.nome_completo||`${d.nome||''} ${d.sobrenome||''}`.trim()||d.email)}</span><span class="ml-auto text-xs text-slate-400">${this._html(d.email||'')}</span></label>`).join(''):'<p class="p-3 text-sm text-amber-700 bg-amber-50 rounded-lg">Nenhum usuário com cargo principal Docente, ativo e habilitado para a área deste curso.</p>';
        const modal=document.getElementById('modal-docentes-distribuicao');modal.classList.remove('hidden');modal.classList.add('flex');
    },

    aplicarDocentesModal() {
        if(!this.docentesModalContext)return;
        const ids=new Set([...document.querySelectorAll('.modal-docente-chk:checked')].map(x=>x.value));
        const {contexto,dia}=this.docentesModalContext;
        if(contexto==='encontro'){
            this.docentesEncontroIds=ids;
            const nomes=[...ids].map(id=>this.docentes.find(d=>d.id===id)?.nome_completo).filter(Boolean);
            document.getElementById('encontro-docentes-resumo').textContent=nomes.length?nomes.join(', '):'Nenhum selecionado';
        }else{
            this.docentesPorDia.set(Number(dia),ids);
            const diaChk=[...document.querySelectorAll('.dist-dia-chk')].find(x=>Number(x.value)===Number(dia));if(diaChk)diaChk.checked=ids.size>0;
            const nomes=[...ids].map(id=>{const d=this.docentes.find(x=>x.id===id);return d?.nome_completo||`${d?.nome||''} ${d?.sobrenome||''}`.trim()||d?.email;}).filter(Boolean);
            const resumo=[...document.querySelectorAll('.dist-docentes-resumo')].find(el=>el.dataset.dia===String(dia));if(resumo)resumo.textContent=nomes.length?nomes.join(' · '):'Nenhum docente selecionado';
        }
        this.fecharModal('modal-docentes-distribuicao');this.docentesModalContext=null;
    },

    _criarDocentesSelecionados(ids=this.docentesEncontroIds) {
        return [...ids].map(id=>{const d=this.docentes.find(x=>x.id===id);return d?{id:d.id,email:d.email,nome_completo:d.nome_completo||`${d.nome||''} ${d.sobrenome||''}`.trim()}:null;}).filter(Boolean);
    },

    async _distribuir(turmaId,plano=null) {
        const turma=this.turmas.find(t=>t.id===turmaId);if(!turma)throw new Error('Turma não encontrada.');
        const inicio=document.getElementById('dist-h-inicio').value,termino=document.getElementById('dist-h-termino').value;
        const ch=window.ControllerTurmaFrm?.calcularCHEncontro(inicio,termino)||0;
        if(!inicio||!termino||termino<=inicio||ch<=0)throw new Error('Informe horários válidos; o término deve ser posterior ao início.');
        const modalidade=document.getElementById('dist-modalidade').value||'Presencial',salaId=modalidade==='Remoto'?'':document.getElementById('dist-sala').value;
        const sala=this.salas.find(x=>x.id===salaId),descricao=document.getElementById('dist-obs').value.trim();
        const mapaE=this._mapaEncontros(),mapaX=this._mapaExcecoes();
        const diasSelecionados=new Set([...document.querySelectorAll('.dist-dia-chk:checked')].map(x=>Number(x.value)));
        const ucValue=document.getElementById('dist-uc')?.value||'';if(!ucValue)throw new Error('Não há UCs pendentes para distribuir.');
        const start=new Date(`${turma.d_inicio}T12:00:00`),end=new Date(`${turma.d_termino}T12:00:00`);if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))throw new Error('A turma precisa ter período de início e término válidos.');
        const dataPool=[];for(const d=new Date(start);d<=end;d.setDate(d.getDate()+1)){const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;if(!mapaE.has(`${turma.id}|${iso}`)&&!mapaX.has(iso)&&diasSelecionados.has(d.getDay()))dataPool.push({iso,dow:d.getDay()});}
        const todasUcs=this._ucsOrdenadas(turma),ucs=ucValue==='TODAS'?todasUcs:todasUcs.filter(u=>(u.id_uc_base||u.id)===ucValue),registros=[],totalEncontros=uc=>Number(uc.carga_horaria)>0?Math.ceil(Number(uc.carga_horaria)/ch):this._totalEncontros(uc,turma);
        const docentesPara=(dia,row=null)=>{
            const ids=row?.docentes?.length?row.docentes.map(email=>this._docentesDaTurma(turma).find(d=>this._norm(d.email)===this._norm(email))?.id).filter(Boolean):[...(this.docentesPorDia.get(Number(dia))||[])];
            const docs=this._criarDocentesSelecionados(new Set(ids));if(!docs.length)throw new Error(`Selecione ao menos um docente habilitado para ${this.dias[Number(dia)]||'a linha do CSV'}.`);return docs;
        };
        if(plano){
            for(const row of plano){
                if(!/^\d{4}-\d{2}-\d{2}$/.test(row.data))throw new Error(`Data inválida no CSV: ${row.data}`);
                if((turma.d_inicio&&row.data<turma.d_inicio)||(turma.d_termino&&row.data>turma.d_termino))throw new Error(`A data ${row.data} está fora do período da turma.`);
                if(!diasSelecionados.has(new Date(`${row.data}T12:00:00`).getDay()))throw new Error(`A data ${row.data} não corresponde a um dia da semana selecionado.`);
                if(registros.some(r=>r.data===row.data))throw new Error(`O CSV contém mais de um encontro para ${row.data}; distribua no máximo um encontro por turma/dia.`);
                if(mapaE.has(`${turma.id}|${row.data}`)||mapaX.has(row.data))continue;
                const uc=ucs.find(u=>this._norm(u.referencia)===this._norm(row.uc_referencia));if(!uc){if(ucValue!=='TODAS')throw new Error(`A UC ${row.uc_referencia} não corresponde à UC selecionada.`);continue;}
                const usados=this.encontros.filter(e=>e.id_turma===turma.id&&e.id_uc===(uc.id_uc_base||uc.id)&&e.tipo!=='cancelamento').length+registros.filter(e=>e.id_uc===(uc.id_uc_base||uc.id)).length;if(usados>=totalEncontros(uc))continue;
                const day=new Date(`${row.data}T12:00:00`).getDay(),docs=docentesPara(day,row),rowSala=this.salas.find(s=>this._norm(s.referencia||s.nome)===this._norm(row.sala));
                registros.push({id_turma:turma.id,data:row.data,tipo:'aula',id_uc:uc.id_uc_base||uc.id,uc_referencia:uc.referencia,docentes:docs,h_inicio:inicio,h_termino:termino,ch_encontro:ch,modalidade,sala_id:salaId,sala_nome:sala?.referencia||sala?.nome||'',descricao:descricao||row.observacoes||''});
            }
        }else{
            const regras=new Map();document.querySelectorAll('.dist-dia-chk:checked').forEach(chk=>{const ids=this.docentesPorDia.get(Number(chk.value))||new Set();if(!ids.size)throw new Error(`Selecione ao menos um docente para ${this.dias[Number(chk.value)]}.`);regras.set(Number(chk.value),this._criarDocentesSelecionados(ids));});
            if(!regras.size)throw new Error('Selecione ao menos um dia da semana.');
            for(const uc of ucs){let pend=Math.max(0,totalEncontros(uc)-this.encontros.filter(e=>e.id_turma===turma.id&&e.id_uc===(uc.id_uc_base||uc.id)&&e.tipo!=='cancelamento').length);if(!pend)continue;
                for(const slot of dataPool){if(!pend)break;if(registros.some(r=>r.data===slot.iso))continue;const docentes=regras.get(slot.dow);if(!docentes)continue;registros.push({id_turma:turma.id,data:slot.iso,tipo:'aula',id_uc:uc.id_uc_base||uc.id,uc_referencia:uc.referencia,docentes,h_inicio:inicio,h_termino:termino,ch_encontro:ch,modalidade,sala_id:salaId,sala_nome:sala?.referencia||sala?.nome||'',descricao});pend--;}
            }
        }
        if(!registros.length)throw new Error('Não há encontros pendentes ou lacunas compatíveis para distribuir.');
        for(const r of registros)await window.ControllerEspelho.salvarEncontro(r,this.turmas);
        this._mostrarStatus(`${registros.length} encontro(s) distribuído(s).`);await this.iniciarView();
    },

    _baixarCSV() { const csv='data;referencia_uc;docentes_email\n2026-03-02;UC-01;docente@escola.org\n';const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='modelo-distribuicao-encontros.csv';a.click();URL.revokeObjectURL(a.href); },
    async _lerCSV(file) { const text=await file.text();const lines=text.replace(/^\ufeff/,'').split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)throw new Error('O CSV não contém linhas de dados.');const sep=lines[0].includes(';')?';':',';const hdr=lines.shift().split(sep).map(x=>this._norm(x.trim()));const ix={data:hdr.indexOf('data'),uc:hdr.indexOf('referencia_uc'),doc:hdr.indexOf('docentes_email'),sala:hdr.indexOf('sala'),obs:hdr.indexOf('observacoes')};if(ix.data<0||ix.uc<0)throw new Error('O cabeçalho deve conter data e referencia_uc.');this.csvRows=lines.map(l=>{const c=l.split(sep).map(x=>x.trim());return{data:c[ix.data],uc_referencia:c[ix.uc],docentes:ix.doc>=0&&c[ix.doc]?c[ix.doc].split(/[|,]/).map(x=>x.trim()).filter(Boolean):[],sala:ix.sala>=0?c[ix.sala]:'',observacoes:ix.obs>=0?c[ix.obs]:''};}).filter(r=>r.data&&r.uc_referencia);document.getElementById('csv-mapa-nome').textContent=`${this.csvRows.length} linha(s) carregada(s)`;},

    _proximaDataLivre(turma, depoisDe, ignorarIds=new Set()) {
        if(!turma.d_termino) return null;
        const mapa=this._mapaEncontros(), excecoes=this._mapaExcecoes(), dias=new Set(this._diasTurma(turma));
        const d=new Date(`${depoisDe}T12:00:00`);d.setDate(d.getDate()+1);
        const fim=new Date(`${turma.d_termino}T12:00:00`);
        for(;d<=fim;d.setDate(d.getDate()+1)){
            if(!dias.has(d.getDay()))continue;
            const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            if(excecoes.has(iso))continue;
            const ocupado=mapa.get(`${turma.id}|${iso}`);
            if(!ocupado||ignorarIds.has(ocupado.id))return iso;
        }
        return null;
    },

    _registrarDragDrop() {
        const pane=document.getElementById('espelho-painel'); if(!pane)return;
        pane.ondragstart=e=>{const card=e.target.closest('.espelho-card');if(!card||card.dataset.tipo==='cancelamento')return;this.draggedId=card.dataset.encontroId;this.lastDragTarget='';e.dataTransfer.setData('text/plain',this.draggedId);e.dataTransfer.effectAllowed='move';};
        pane.ondragover=e=>{
            const id=this.draggedId||e.dataTransfer?.getData?.('text/plain');if(!id)return;e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';
            const rect=pane.getBoundingClientRect?.();
            if(rect){const edge=56,step=(distance)=>Math.min(28,Math.max(6,Math.ceil(distance*0.45)));if(e.clientY<rect.top+edge)pane.scrollTop-=step(rect.top+edge-e.clientY);else if(e.clientY>rect.bottom-edge)pane.scrollTop+=step(e.clientY-(rect.bottom-edge));if(e.clientX<rect.left+edge)pane.scrollLeft-=step(rect.left+edge-e.clientX);else if(e.clientX>rect.right-edge)pane.scrollLeft+=step(e.clientX-(rect.right-edge));}
            const target=e.target.closest?.('.espelho-dropzone, .espelho-card');if(!target)return;
            const source=this.encontros.find(x=>x.id===id);if(!source)return;
            const idTurma=target.dataset.idTurma||target.closest('[data-id-turma]')?.dataset.idTurma,newDate=target.dataset.data||target.closest('.espelho-card')?.dataset.data;
            const key=`${idTurma}|${newDate}`;if(this.lastDragTarget===key)return;this.lastDragTarget=key;
            if(idTurma!==source.id_turma||!newDate||this._mapaExcecoes().has(newDate))return;
            const turma=this.turmas.find(t=>t.id===source.id_turma);if(!turma)return;
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
    },

    async _salvarFlagEncontro(input) {
        const encontro=this.encontros.find(x=>x.id===input.dataset.id);if(!encontro)return false;
        const flag=input.dataset.flag;if(!['SS','SGO'].includes(flag))return false;
        if(this.pendenciasArraste.has(encontro.id)){input.checked=false;this._mostrarStatus('Salve ou descarte primeiro a movimentação pendente deste encontro.',true);return false;}
        const novoValor=!!input.checked;
        if(typeof confirm==='function'&&!confirm(`Salvar a opção ${flag} como ${novoValor?'ativada':'desativada'} neste encontro?`)){input.checked=!!encontro[flag];return false;}
        input.disabled=true;
        try{
            await window.ControllerEspelho.atualizarFlagsEncontro(encontro.id,{[flag]:novoValor},this.turmas);
            this.encontros=this.encontros.map(x=>x.id===encontro.id?{...x,[flag]:novoValor}:x);
            this._mostrarStatus(`Alteração ${flag} salva.`);this.renderizarMapa();this._registrarDragDrop();return true;
        }catch(err){input.checked=!!encontro[flag];this._mostrarStatus(err?.message||'Não foi possível salvar a alteração.',true);return false;}
        finally{input.disabled=false;}
    },

    _descartarMovimentosTurma(turmaId) {
        const moves=[...this.pendenciasArraste.entries()].filter(([,m])=>m.id_turma===turmaId);
        if(!moves.length){this._mostrarStatus('Não há alterações pendentes para descartar.',true);return false;}
        if(typeof confirm==='function'&&!confirm(`Descartar ${moves.length} alteração(ões) não salva(s) desta turma?`))return false;
        moves.forEach(([id])=>this.pendenciasArraste.delete(id));
        this.renderizarMapa();this._registrarDragDrop();
        this._mostrarStatus(`${moves.length} alteração(ões) de arraste descartada(s).`);
        return true;
    },

    async tratarCliques(e) {
        const t=e.target;
        if(t.closest('.btn-periodo-mapa')){this.periodoMapa=t.closest('.btn-periodo-mapa').dataset.periodo;this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('#btn-toggle-filtro-dias')){this.filtroDiasAberto=!this.filtroDiasAberto;this.filtroAnosAberto=false;this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('#btn-toggle-filtro-anos')){this.filtroAnosAberto=!this.filtroAnosAberto;this.filtroDiasAberto=false;this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('#btn-restaurar-filtro-anos')){this.mesesVisiveis=null;this.filtroAnosAberto=true;this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('#btn-restaurar-filtro-dias')){this.filtrosDiasPorPeriodo.set(this.periodoMapa,new Set(this.periodoMapa==='SÁBADOS'?[6]:[0,1,2,3,4,5]));this.filtroDiasAberto=true;this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('.btn-abrir-modal-remover-uc')){this.abrirModalRemocaoUC(t.closest('.btn-abrir-modal-remover-uc').dataset.idTurma);return true;}
        if(t.closest('#btn-confirmar-remover-uc')){await this.confirmarRemocaoUC();return true;}
        if(t.closest('.btn-fechar-remocao-uc')||t.id==='modal-remover-uc'){this.fecharModal('modal-remover-uc');return true;}
        if(t.closest('#btn-escolher-docentes-encontro')){this.abrirModalDocentes('encontro');return true;}
        if(t.closest('.btn-dist-docentes')){this.abrirModalDocentes('dia',t.closest('.btn-dist-docentes').dataset.dia);return true;}
        if(t.closest('.btn-aplicar-docentes-dist')){this.aplicarDocentesModal();return true;}
        if(t.closest('.btn-fechar-docentes')){if(this.docentesModalContext?.contexto==='dia'){const dia=Number(this.docentesModalContext.dia),chk=[...document.querySelectorAll('.dist-dia-chk')].find(x=>Number(x.value)===dia);if(chk)chk.checked=!!this.docentesPorDia.get(dia)?.size;}this.fecharModal('modal-docentes-distribuicao');this.docentesModalContext=null;return true;}
        if(t.closest('#btn-area-marcar-todas')){this.selecionadas=new Set(this.turmas.map(x=>x.id));this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('.btn-area-marcar-todas')){const idx=Number(t.closest('.btn-area-marcar-todas').dataset.areaIndex);const g=this.gruposFiltro[idx];(g?.cursos||[]).flatMap(c=>c.turmas).forEach(x=>this.selecionadas.add(x.id));this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('.btn-descartar-movimentos')){this._descartarMovimentosTurma(t.closest('.btn-descartar-movimentos').dataset.idTurma);return true;}
        if(t.closest('.btn-salvar-movimentos')){
            const btn=t.closest('.btn-salvar-movimentos'),turmaId=btn.dataset.idTurma;
            const moves=[...this.pendenciasArraste.entries()].filter(([,m])=>m.id_turma===turmaId).map(([id,m])=>({id,...m}));
            if(!moves.length){this._mostrarStatus('Não há alterações pendentes para esta turma.',true);return true;}
            if(btn.dataset.saving==='1')return true;
            btn.dataset.saving='1';btn.disabled=true;btn.textContent='Salvando…';btn.classList.add('opacity-60','cursor-wait');
            try{
                await window.ControllerEspelho.salvarMovimentos(moves,this.turmas,this.excecoes);
                const datas=new Map(moves.map(m=>[m.id,m.data]));
                this.encontros=this.encontros.map(en=>datas.has(en.id)?{...en,data:datas.get(en.id),SS:false,SGO:false}:en);
                moves.forEach(m=>this.pendenciasArraste.delete(m.id));
                this._mostrarStatus(`${moves.length} alteração(ões) salva(s) para a turma.`);
                this.renderizarMapa();this._registrarDragDrop();
            }catch(err){
                this._mostrarStatus(`Não foi possível salvar: ${err?.message||'erro desconhecido'}`,true);
                btn.dataset.saving='0';btn.disabled=false;btn.textContent=`Salvar Alterações (${moves.length})`;btn.classList.remove('opacity-60','cursor-wait');
            }
            return true;
        }
        if(t.closest('.btn-add-encontro')){const b=t.closest('.btn-add-encontro');this.abrirModal(b.dataset.idTurma,b.dataset.data);return true;}
        if(t.closest('.btn-add-cancelamento')){const b=t.closest('.btn-add-cancelamento');this.abrirModal(b.dataset.idTurma,b.dataset.data,'cancelamento');return true;}
        if(t.closest('.btn-distribuir-turma')){const id=t.closest('.btn-distribuir-turma').dataset.idTurma;if([...this.pendenciasArraste.values()].some(m=>m.id_turma===id)){this._mostrarStatus('Salve as alterações de arraste antes de iniciar outra distribuição.',true);return true;}this.abrirDistribuicao(id);return true;}
        if(t.closest('.btn-remover-encontro')){const id=t.closest('.btn-remover-encontro').dataset.id;if(this.pendenciasArraste.has(id)){this._mostrarStatus('Salve as alterações de arraste antes de remover este encontro.',true);return true;}const ecard=this.encontros.find(x=>x.id===id);if(ecard&&confirm('Remover este encontro/cancelamento?'))try{await window.ControllerEspelho.excluirEncontro(ecard,this.turmas);await this.iniciarView();}catch(err){this._mostrarStatus(err.message,true);}return true;}
        if(t.closest('.btn-fechar-encontro')){this.fecharModal('modal-encontro');return true;}
        if(t.closest('.btn-fechar-distribuicao')){this.fecharModal('modal-distribuicao');return true;}
        if(t.closest('#btn-baixar-modelo-mapa')){this._baixarCSV();return true;}
        return false;
    },

    tratarDuploClique(e) {
        if(e.target.closest('.btn-remover-encontro'))return true;
        if(e.target.closest('.espelho-flag-encontro'))return true;
        const card=e.target.closest('.espelho-card');
        if(card){if(!this.editavel)return false;const id=card.dataset.encontroId,encontro=this.encontros.find(x=>x.id===id);if(!encontro)return false;if(this.pendenciasArraste.has(id)){this._mostrarStatus('Salve as alterações de arraste antes de editar este encontro.',true);return true;}this.abrirModal(encontro.id_turma,card.dataset.data||encontro.data,encontro.tipo||'aula',{...encontro,data:card.dataset.data||encontro.data});return true;}
        const row=e.target.closest('#espelho-painel tbody tr');if(!row)return false;
        this._linhaSelecionada?.classList.remove('ring-2','ring-inset','ring-indigo-400');
        if(this._linhaSelecionada===row){this._linhaSelecionada=null;return true;}
        this._linhaSelecionada=row;row.classList.add('ring-2','ring-inset','ring-indigo-400');return true;
    },

    async tratarSubmits(e) {
        if(e.target.id==='form-espelho-encontro') {e.preventDefault();const form=e.target,btn=form.querySelector('button[type=submit]');if(btn?.dataset.saving==='1')return true;if(btn){btn.dataset.saving='1';btn.disabled=true;btn.textContent='Salvando…';}try{const id=document.getElementById('encontro-id').value;const docs=this._criarDocentesSelecionados();const tipo=document.getElementById('encontro-tipo').value;if(tipo==='aula'&&!docs.length)throw new Error('Selecione ao menos um docente habilitado para o curso.');const sala=document.getElementById('encontro-sala');const horaInicio=document.getElementById('encontro-h-inicio').value,horaFim=document.getElementById('encontro-h-termino').value,ch=window.ControllerTurmaFrm?.calcularCHEncontro(horaInicio,horaFim)||0;if(tipo!=='cancelamento'&&ch<=0)throw new Error('O horário final deve ser posterior ao horário inicial.');const salaDoc=this.salas.find(s=>s.id===sala.value);const payload={id_turma:document.getElementById('encontro-turma-id').value,data:document.getElementById('encontro-data').value,tipo,id_uc:document.getElementById('encontro-uc').value,docentes:docs,sala_id:sala.value,sala_nome:salaDoc?.referencia||salaDoc?.nome||'',modalidade:document.getElementById('encontro-modalidade').value,h_inicio:horaInicio,h_termino:horaFim,ch_encontro:ch,SS:document.getElementById('encontro-ss').checked,SGO:document.getElementById('encontro-sgo').checked,descricao:document.getElementById('encontro-descricao').value};await window.ControllerEspelho.salvarEncontro(payload,this.turmas,id||null);this.fecharModal('modal-encontro');this._mostrarStatus('Registro salvo.');await this.iniciarView();}catch(err){this._mostrarStatus(err.message,true);}finally{if(btn?.isConnected){btn.dataset.saving='0';btn.disabled=false;btn.textContent='Salvar';}}return true;}
        if(e.target.id==='form-sala-aula'){e.preventDefault();const status=document.getElementById('espelho-status-recursos');try{await window.ControllerEspelho.salvarSala({referencia:document.getElementById('sala-referencia').value,tipo:document.getElementById('sala-tipo').value,numero_cadeiras:document.getElementById('sala-cadeiras').value,observacoes:document.getElementById('sala-obs').value});e.target.reset();await this.iniciarView();document.getElementById('tab-recursos')?.classList.remove('hidden');document.getElementById('tab-mapa-aulas')?.classList.add('hidden');document.querySelectorAll('.tab-btn').forEach(b=>{const active=b.dataset.target==='tab-recursos';b.classList.toggle('font-bold',active);b.classList.toggle('text-blue-600',active);b.classList.toggle('border-blue-600',active);b.classList.toggle('text-slate-500',!active);b.classList.toggle('border-transparent',!active);});if(status){status.textContent='Sala cadastrada com sucesso.';status.className='mb-3 px-3 py-2 rounded-lg text-sm bg-emerald-50 text-emerald-700 border border-emerald-200';}}catch(err){if(status){status.textContent=err.message;status.className='mb-3 px-3 py-2 rounded-lg text-sm bg-rose-50 text-rose-700 border border-rose-200';}}return true;}
        if(e.target.id==='form-distribuicao'){e.preventDefault();const form=e.target,btn=form.querySelector('button[type=submit]');if(btn?.dataset.saving==='1')return true;if(btn){btn.dataset.saving='1';btn.disabled=true;btn.textContent='Distribuindo…';}try{const id=document.getElementById('distribuicao-turma-id').value;await this._distribuir(id,this.csvRows.length?this.csvRows:null);this.fecharModal('modal-distribuicao');}catch(err){this._mostrarStatus(err.message,true);}finally{if(btn?.isConnected){btn.dataset.saving='0';btn.disabled=false;btn.textContent='Distribuir encontros';}}return true;}
        return false;
    },

    async tratarMudancas(e) {
        if(e.target.matches('.espelho-filtro-dia-chk')){const set=this._diasVisiveisPeriodo(),dia=Number(e.target.value);e.target.checked?set.add(dia):set.delete(dia);this.filtroDiasAberto=true;this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-filtro-mes-chk')){this._alternarMesFiltro(e.target.dataset.mes,e.target.checked);this.filtroAnosAberto=true;this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-filtro-ano-chk')){const ano=Number(e.target.dataset.ano);for(let mi=0;mi<12;mi++)this._alternarMesFiltro(`${ano}-${String(mi+1).padStart(2,'0')}`,e.target.checked);this.filtroAnosAberto=true;this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-flag-encontro')){await this._salvarFlagEncontro(e.target);return true;}
        if(e.target.id==='select-remover-uc'){this._atualizarResumoRemocaoUC();return true;}
        if(e.target.id==='dist-uc'){this._renderizarProgressoDistribuicao();return true;}
        if(e.target.matches('.modal-docente-chk')){e.target.checked?this.docentesModalDraft.add(e.target.value):this.docentesModalDraft.delete(e.target.value);if(this.docentesModalContext?.contexto==='dia'){const dia=Number(this.docentesModalContext.dia),chk=[...document.querySelectorAll('.dist-dia-chk')].find(x=>Number(x.value)===dia);if(chk)chk.checked=this.docentesModalDraft.size>0;}return true;}
        if(['dist-h-inicio','dist-h-termino'].includes(e.target.id)){const a=document.getElementById('dist-h-inicio').value,b=document.getElementById('dist-h-termino').value,field=document.getElementById('dist-ch');field.value=a&&b&&b>a?(window.ControllerTurmaFrm?.calcularCHEncontro(a,b)||''):'';const atual=document.getElementById('dist-uc')?.value;this._popularUcsDistribuicao(atual);return true;}
        if(e.target.id==='dist-modalidade'){const remoto=e.target.value==='Remoto',wrap=document.getElementById('dist-sala-wrap'),sala=document.getElementById('dist-sala');wrap.classList.toggle('hidden',remoto);if(remoto)sala.value='';return true;}
        if(e.target.id==='encontro-tipo'){this._alternarCamposTipo();return true;}
        if(e.target.id==='encontro-modalidade'){const remoto=e.target.value==='Remoto';document.getElementById('encontro-sala-wrap')?.classList.toggle('hidden',remoto);if(remoto)document.getElementById('encontro-sala').value='';return true;}
        if(['encontro-h-inicio','encontro-h-termino'].includes(e.target.id)){const a=document.getElementById('encontro-h-inicio').value,b=document.getElementById('encontro-h-termino').value;if(a&&b&&b>a)document.getElementById('encontro-ch').value=window.ControllerTurmaFrm?.calcularCHEncontro(a,b)||'';return true;}
        if(e.target.id==='input-csv-mapa'&&e.target.files?.[0]){try{await this._lerCSV(e.target.files[0]);}catch(err){this._mostrarStatus(err.message,true);}return true;}
        if(e.target.matches('.espelho-turma-chk')){e.target.checked?this.selecionadas.add(e.target.value):this.selecionadas.delete(e.target.value);this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-course-chk')){const g=this.gruposFiltro[Number(e.target.dataset.areaIndex)],c=g?.cursos[Number(e.target.dataset.courseIndex)];(c?.turmas||[]).forEach(t=>e.target.checked?this.selecionadas.add(t.id):this.selecionadas.delete(t.id));this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-area-chk')){const g=this.gruposFiltro[Number(e.target.dataset.areaIndex)];(g?.cursos||[]).flatMap(c=>c.turmas).forEach(t=>e.target.checked?this.selecionadas.add(t.id):this.selecionadas.delete(t.id));this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.id==='espelho-mostrar-todas'){this.selecionadas=e.target.checked?new Set(this.turmas.map(t=>t.id)):new Set();this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        return false;
    }
};
