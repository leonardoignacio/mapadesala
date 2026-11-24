// ./docente/app_docente.js - Orquestração da Área Docente
window.AppDocente = {
    semana:0,
    docentesSelecionados:[],
    docenteMap:new Map(),
    atividadesMes:[],
    filtrosEscala:null,
    _esc(v){return window.Util.esc(v??'');},
    _mounted(){return !!document.getElementById('docente-root');},
    _norm(v){return window.Util.semAcento(v||'').trim().toLowerCase();},
    _mesAtual(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;},
    _mesBounds(mes=this._mesAtual()){const [y,m]=mes.split('-').map(Number),fim=new Date(y,m,0,12);return {inicio:`${y}-${String(m).padStart(2,'0')}-01`,fim:`${y}-${String(m).padStart(2,'0')}-${String(fim.getDate()).padStart(2,'0')}`,ano:y,mes:m};},
    _duracaoLabel(minutos){const n=Math.max(0,Math.round(Number(minutos)||0)),h=Math.floor(n/60),m=n%60;return m?`${h}h ${String(m).padStart(2,'0')}min`:`${h}h`;},
    _percent(n,total){return total>0?Math.round((n/total)*1000)/10:0;},
    _valorArea(a){return typeof a==='object'&&a?(a.area||a.nome_area||a.nome||''):a;},
    _areasDocente(d){const x=Array.isArray(d?.areas)?d.areas:[d?.area||d?.curso_area||''];return x.map(a=>this._valorArea(a)).filter(Boolean);},
    _areasUsuario(){return (window.usuarioAtual?.areas||[]).map(a=>this._valorArea(a)).filter(Boolean);},
    _areasCompat(a,b){return a.some(x=>b.some(y=>this._norm(x)===this._norm(y)));},
    _identidade(d){return {id:String(d?.id||''),uid:String(d?.uid||''),email:String(d?.email||'').toLowerCase()};},
    _mesmoDocente(a,b){return window.ControllerDocente.corresponde(a,b);},
    _proprioDocente(){return window.ControllerDocente.docenteAtual();},
    async iniciarView(){
        if(!this._mounted())return;
        await window.Store.garantirPronto();
        await window.ControllerDocente.carregarBase();
        this.semana=0;this.atividadesMes=[];this.filtrosEscala=null;
        this.docenteMap=new Map(window.ControllerDocente.obterDocentes().map(d=>[String(d.id||d.email),d]));
        this.docentesSelecionados=this._selecaoPadrao();
        this._renderFiltro();
        await this._renderizarCalendario();
    },
    _selecaoPadrao(){
        const docs=window.ControllerDocente.obterDocentes(),u=window.usuarioAtual||{},areas=this._areasUsuario();
        if(areas.some(a=>this._norm(a)==='todas'))return docs.map(d=>String(d.id||d.email));
        const selecionados=docs.filter(d=>this._areasCompat(areas,this._areasDocente(d))).map(d=>String(d.id||d.email));
        if(u.cargo==='docente'){const self=String(u.id||u.email);if(!selecionados.includes(self))selecionados.push(self);}
        return selecionados;
    },
    _atualizarVisibilidadeFiltro(){
        const filtro=document.getElementById('docente-filtro');
        if(filtro)filtro.classList.toggle('hidden',window.usuarioAtual?.cargo==='docente'&&this._tabAtiva()==='docente-tab-calendario');
    },
    _renderFiltro(){
        const box=document.getElementById('docente-filtro-lista');if(!box)return;
        const docs=window.ControllerDocente.obterDocentes();this.docenteMap=new Map(docs.map(d=>[String(d.id||d.email),d]));
        box.innerHTML=docs.length?docs.map(d=>{const key=String(d.id||d.email),areas=this._areasDocente(d).join(', ')||'Sem área vinculada',nome=d.nome_completo||[d.nome,d.sobrenome].filter(Boolean).join(' ')||d.email||'Docente';return `<label class="docente-filtro-item flex min-w-0 items-start gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-xs hover:bg-slate-50" data-texto="${this._esc(`${nome} ${areas}`)}"><input type="checkbox" class="docente-filtro-check mt-0.5 h-4 w-4 shrink-0 accent-blue-600" value="${this._esc(key)}" ${this.docentesSelecionados.includes(key)?'checked':''}><span class="min-w-0"><b class="block truncate text-slate-700">${this._esc(nome)}</b><small class="block truncate text-slate-400">${this._esc(areas)}</small></span></label>`;}).join(''):'<p class="text-xs text-slate-400">Nenhum docente ativo encontrado.</p>';
        this._atualizarResumoFiltro();this._atualizarVisibilidadeFiltro();
    },
    _atualizarResumoFiltro(){const x=document.getElementById('docente-filtro-resumo');if(x)x.textContent=`${this.docentesSelecionados.length} selecionado(s)`;},
    _docentesSelecionados(){return this.docentesSelecionados.map(k=>this.docenteMap.get(k)).filter(Boolean);},
    _tabAtiva(){return document.querySelector('#docente-root .tab-content:not(.hidden)')?.id||'docente-tab-calendario';},
    async _renderTabAtiva(){const id=this._tabAtiva();if(id==='docente-tab-calendario')return this._renderizarCalendario();if(id==='docente-tab-escala')return this._renderizarEscalas();if(id==='docente-tab-planejamento')return this._renderizarPlanejamento();if(id==='docente-tab-ferias')return this._renderizarFerias();},
    _fecharModal(id){const m=document.getElementById(id);m?.classList.add('hidden');m?.classList.remove('flex');},
    _abrirModal(id){const m=document.getElementById(id);m?.classList.remove('hidden');m?.classList.add('flex');},
    _semanal(){const C=window.ControllerDashboard,inicio=C._addDays(C._segunda(C._dataLocal()),this.semana*7);return {inicio,fim:C._addDays(inicio,5)};},
    _matchesEncontro(enc,docente){return (enc.docentes||[]).some(d=>this._mesmoDocente(d,docente));},
    _semanaEncontros(){const r=this._semanal(),docs=window.usuarioAtual?.cargo==='docente'?[this._proprioDocente()]:this._docentesSelecionados();return window.ControllerDashboard.listarEncontros({inicio:r.inicio,fim:r.fim}).filter(enc=>docs.some(d=>this._matchesEncontro(enc,d)));},
    _weekdayISO(iso){const [y,m,d]=iso.split('-').map(Number),day=new Date(y,m-1,d,12).getDay();return day===0?7:day;},
    _formatDate(iso){return window.Util.dataBR(iso);},
    _periodoHora(hora){const min=window.ControllerDocente._minutos(hora);return min===null?'Manhã':min<720?'Manhã':min<1080?'Tarde':'Noite';},
    _janelasEscala(dia){
        const C=window.ControllerDocente,entrada=C._minutos(dia?.entrada),saida=C._minutos(dia?.saida);if(entrada===null||saida===null||saida<=entrada)return [];
        const bi=C._minutos(dia?.intervalo_inicio),br=C._minutos(dia?.intervalo_retorno),janelas=bi!==null&&br!==null?[[entrada,bi],[br,saida]]:[[entrada,saida]];
        return janelas.filter(x=>x[1]>x[0]);
    },
    _normalizaPeriodosExcecao(ex){
        if(!Array.isArray(ex?.periodos)||!ex.periodos.length)return null;
        return new Set(ex.periodos.map(x=>this._norm(x)).map(x=>x.includes('manha')?'manha':x.includes('tarde')?'tarde':x.includes('noite')?'noite':'').filter(Boolean));
    },
    _janelasTrabalho(docente,data){
        const C=window.ControllerDocente;if(C.estaDeFerias(docente,data))return [];
        const escala=C.escalaParaData(docente,data),dia=escala?.dias_semana?.[String(this._weekdayISO(data))];if(!dia)return [];
        let parts=this._janelasEscala(dia).flatMap(([a,b])=>{const cuts=[a,b,...[720,1080].filter(x=>x>a&&x<b)].sort((x,y)=>x-y);return cuts.slice(0,-1).map((x,i)=>[x,cuts[i+1]]);});
        const excecoes=(window.Store.dados.excecoes||[]).filter(x=>(x.data||x.id)===data);
        if(excecoes.some(x=>this._normalizaPeriodosExcecao(x)===null))return [];
        const bloqueados=new Set(excecoes.flatMap(x=>[...(this._normalizaPeriodosExcecao(x)||[])]));
        if(bloqueados.size)parts=parts.filter(([a,b])=>{const mid=(a+b)/2,p=mid<720?'manha':mid<1080?'tarde':'noite';return !bloqueados.has(p);});
        return parts;
    },
    _mergeIntervals(intervals){
        const sorted=intervals.filter(x=>x&&x[1]>x[0]).sort((a,b)=>a[0]-b[0]),out=[];
        for(const it of sorted){const last=out[out.length-1];if(last&&it[0]<=last[1])last[1]=Math.max(last[1],it[1]);else out.push([...it]);}
        return out;
    },
    _subtrair(base,ocupados){
        const merged=this._mergeIntervals(ocupados),out=[];
        for(const [a,b] of base){let inicio=a;for(const [x,y] of merged){if(y<=inicio||x>=b)continue;if(x>inicio)out.push([inicio,Math.min(x,b)]);inicio=Math.max(inicio,y);if(inicio>=b)break;}if(inicio<b)out.push([inicio,b]);}
        return out.filter(x=>x[1]>x[0]);
    },
    _meetingsDia(encontros,docente,data){return encontros.filter(e=>e.data===data&&this._matchesEncontro(e,docente));},
    _intervalosAula(encontros,docente,data){
        const C=window.ControllerDocente;return this._meetingsDia(encontros,docente,data).map(e=>{const a=C._minutos(e.h_inicio),b=C._minutos(e.h_termino);return a!==null&&b!==null&&b>a?[a,b]:null;}).filter(Boolean);
    },
    async _atividadesProprias(){
        if(window.usuarioAtual?.cargo!=='docente')return [];
        const range=this._mesBounds(this._mesAtual());
        try{return await window.ControllerDocente.carregarAtividades(this._proprioDocente(),range.inicio,range.fim);}catch(err){console.warn('[Docente] Não foi possível carregar suas atividades:',err);return [];}
    },
    async _gerarPlanejamentoSemana(encontros,range=this._semanal(),docentes=null,atividadesBase=null){
        const C=window.ControllerDocente,lista=docentes||[this._proprioDocente()];if(!lista.length)return[];
        await C.carregarBase();
        const atividades=atividadesBase||await C.carregarAtividades(lista[0],range.inicio,range.fim),itens=[];
        const formatarHora=minutos=>`${String(Math.floor(minutos/60)).padStart(2,'0')}:${String(minutos%60).padStart(2,'0')}`;
        for(const docente of lista){
            const atividadesDocente=atividades.filter(x=>C.corresponde(x,docente)&&x.tipo==='Outra Atividade'&&x.data>=range.inicio&&x.data<=range.fim);
            const ocupadasPorAtividade=new Map();
            for(const atividade of atividadesDocente){
                const inicio=C._minutos(atividade.inicio||atividade.h_inicio),termino=C._minutos(atividade.termino||atividade.h_termino);
                if(!C._dataISO(atividade.data)||inicio===null||termino===null||termino<=inicio)continue;
                const horaInicio=formatarHora(inicio),horaTermino=formatarHora(termino),periodo=this._periodoHora(horaInicio);
                itens.push({id:`atividade:${atividade.id||`${docente.uid||docente.id||docente.email}:${atividade.data}:${horaInicio}:${horaTermino}`}`,tipo:'planejamento_docente',data:atividade.data,h_inicio:horaInicio,h_termino:horaTermino,ch_encontro:(termino-inicio)/60,uc_referencia:'Outra Atividade',uc_titulo:'',turma:{periodo},docentes:[docente],atividade_tipo:'Outra Atividade',atividade_descricao:atividade.descricao||'',atividade_id:atividade.id||'',turma_referencia:'',id_turma:'',id_uc:''});
                if(!ocupadasPorAtividade.has(atividade.data))ocupadasPorAtividade.set(atividade.data,[]);
                ocupadasPorAtividade.get(atividade.data).push([inicio,termino]);
            }
            for(let offset=0;offset<6;offset++){
                const data=window.ControllerDashboard._addDays(range.inicio,offset),janelas=this._janelasTrabalho(docente,data);if(!janelas.length)continue;
                const ocupados=[...this._intervalosAula(encontros,docente,data),...(ocupadasPorAtividade.get(data)||[])],livres=this._subtrair(janelas,ocupados);
                livres.forEach(([a,b])=>{
                    const inicio=formatarHora(a),termino=formatarHora(b),periodo=this._periodoHora(inicio);
                    itens.push({id:`plan:${docente.uid||docente.id||docente.email}:${data}:${inicio}:${termino}`,tipo:'planejamento_docente',data,h_inicio:inicio,h_termino:termino,ch_encontro:(b-a)/60,uc_referencia:'Planejamento',uc_titulo:'',turma:{periodo},docentes:[docente],atividade_tipo:'Planejamento',atividade_descricao:'',atividade_id:'',turma_referencia:'',id_turma:'',id_uc:''});
                });
            }
        }
        return itens;
    },
    async _renderizarCalendario(){
        const box=document.getElementById('docente-cal-conteudo');if(!box)return;
        const C=window.ControllerDashboard,CD=window.ControllerDocente,r=this._semanal(),label=document.getElementById('docente-cal-semana');if(label)label.textContent=C.formatarSemana(r.inicio,r.fim);
        try{
            await CD.carregarBase();
            const cargo=window.usuarioAtual?.cargo,privilegiado=['tecnico','admin','root'].includes(cargo),selecionados=this._docentesFiltrados?this._docentesFiltrados('docente-tab-calendario'):[];
            let encontros=this._semanaEncontros(),docsPlanejamento=[];
            if(cargo==='docente')docsPlanejamento=[this._proprioDocente()];
            else if(privilegiado)docsPlanejamento=selecionados;
            if(docsPlanejamento.length){
                const atividades=await CD.carregarAtividades(privilegiado?null:this._proprioDocente(),r.inicio,r.fim);
                encontros=[...encontros,...await this._gerarPlanejamentoSemana(encontros,r,docsPlanejamento,atividades)];
            }
            const propria=cargo==='docente',html=window.AppDashboard?window.AppDashboard._calendarioDocente(encontros,r.inicio,{mostrarDocentes:privilegiado,mostrarCancelamentos:propria}):'<p class="p-4 text-sm text-slate-500">Calendário indisponível.</p>';
            box.innerHTML=html;
        }catch(err){box.innerHTML=`<p class="m-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">${this._esc(err.message||'Não foi possível carregar o calendário.')}</p>`;}
    },
    _renderizarFiltrosEscala(docs){
        const areas=[...new Set(docs.flatMap(d=>this._areasDocente(d)))].sort((a,b)=>a.localeCompare(b,'pt-BR',{sensitivity:'base'})),proprias=this._areasUsuario();
        if(!this.filtrosEscala)this.filtrosEscala={areas:areas.filter(a=>proprias.some(p=>this._norm(a)===this._norm(p))),nome:'',dias:[1,2,3,4,5,6],periodos:['manha','tarde','noite']};
        if(!this.filtrosEscala.areas.length&&!proprias.length)this.filtrosEscala.areas=[...areas];
        const f=this.filtrosEscala,areaBox=document.getElementById('docente-escala-filtro-areas'),diasBox=document.getElementById('docente-escala-filtro-dias'),periodosBox=document.getElementById('docente-escala-filtro-periodos'),nome=document.getElementById('docente-escala-filtro-nome');
        if(areaBox)areaBox.innerHTML=areas.length?areas.map(a=>`<label class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] text-slate-700"><input type="checkbox" class="docente-escala-area accent-blue-600" value="${this._esc(a)}" ${f.areas.some(x=>this._norm(x)===this._norm(a))?'checked':''}><span>${this._esc(a)}</span></label>`).join(''):'<span class="text-xs text-slate-400">Nenhuma área cadastrada.</span>';
        if(diasBox)diasBox.innerHTML=window.ViewsDocente.dias.map(d=>`<label class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] text-slate-700"><input type="checkbox" class="docente-escala-dia accent-blue-600" value="${d.id}" ${f.dias.includes(d.id)?'checked':''}><span>${d.curto}</span></label>`).join('');
        if(periodosBox)periodosBox.innerHTML=[['manha','Manhã'],['tarde','Tarde'],['noite','Noite']].map(([id,label])=>`<label class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] text-slate-700"><input type="checkbox" class="docente-escala-periodo accent-blue-600" value="${id}" ${f.periodos.includes(id)?'checked':''}><span>${label}</span></label>`).join('');
        if(nome&&nome.value!==f.nome)nome.value=f.nome;
    },
    _renderTabelaEscala(registro){
        const C=window.ControllerDocente,dias=window.ViewsDocente.dias,d=registro?.dias_semana||{},f=this.filtrosEscala||{dias:[1,2,3,4,5,6],periodos:['manha','tarde','noite']},faixas={manha:[0,720],tarde:[720,1080],noite:[1080,1440]};
        const rows=dias.filter(x=>f.dias.includes(x.id)).filter(x=>{const item=d[String(x.id)]||{},a=C._minutos(item.entrada),b=C._minutos(item.saida);return a!==null&&b!==null&&f.periodos.some(p=>{const faixa=faixas[p];return faixa&&a<faixa[1]&&b>faixa[0];});}).map(x=>{const item=d[String(x.id)]||{},min=C.chDia(item);return `<tr class="border-t border-slate-100"><th class="whitespace-nowrap p-2 text-left font-bold text-slate-700">${x.curto}</th><td class="p-2 tabular-nums">${this._esc(item.entrada||'—')}</td><td class="p-2 tabular-nums">${this._esc(item.intervalo_inicio||'—')}</td><td class="p-2 tabular-nums">${this._esc(item.intervalo_retorno||'—')}</td><td class="p-2 tabular-nums">${this._esc(item.saida||'—')}</td><td class="p-2 text-right font-bold tabular-nums text-blue-700">${this._duracaoLabel(min)}</td></tr>`;}).join('');
        const linhas=rows||'<tr><td colspan="6" class="p-4 text-center text-xs text-slate-400">Nenhum dia corresponde aos filtros de dias e período selecionados.</td></tr>';
        return `<div class="overflow-x-auto rounded-xl border border-slate-200"><table class="min-w-[650px] w-full border-collapse text-xs"><thead class="bg-slate-100 text-slate-600"><tr><th class="p-2 text-left">Dia</th><th class="p-2 text-left">Entrada</th><th class="p-2 text-left">Intervalo (início)</th><th class="p-2 text-left">Intervalo (retorno)</th><th class="p-2 text-left">Saída</th><th class="p-2 text-right">CH diária</th></tr></thead><tbody>${linhas}</tbody><tfoot class="border-t-2 border-slate-200 bg-blue-50"><tr><th colspan="5" class="p-2 text-right font-extrabold text-slate-700">CH Total</th><td class="p-2 text-right font-extrabold tabular-nums text-blue-800">${this._duracaoLabel(C.totalCH(d))}</td></tr></tfoot></table></div>`;
    },
    async _renderizarEscalas(){
        const box=document.getElementById('docente-escala-conteudo');if(!box)return;
        const C=window.ControllerDocente,self=this._proprioDocente(),todos=C.obterDocentes();this._renderizarFiltrosEscala(todos);const f=this.filtrosEscala,selecionados=todos.filter(d=>this._areasDocente(d).some(a=>f.areas.some(x=>this._norm(a)===this._norm(x)))&&this._norm(d.nome_completo||[d.nome,d.sobrenome].filter(Boolean).join(' ')||d.email||'').includes(this._norm(f.nome))).sort((a,b)=>{
            const aProprio=C.corresponde(a,self),bProprio=C.corresponde(b,self);
            if(aProprio!==bProprio)return aProprio?-1:1;
            return (a.nome_completo||a.nome||a.email||'').localeCompare(b.nome_completo||b.nome||b.email||'','pt-BR',{sensitivity:'base'});
        });
        if(!selecionados.length){box.innerHTML=this._mensagemSemSelecao();return;}
        const cards=selecionados.map(doc=>{
            const historico=C.escalasDocente(doc),hoje=C._hojeISO(),vigente=historico.find(x=>x.final_vigencia==='Atual'&&x.inicio_vigencia<=hoje)||null,proxima=historico.find(x=>x.inicio_vigencia>hoje)||null,editavel=C.podeEditarProprio(doc),nome=doc.nome_completo||doc.nome||doc.email||'Docente';
            const editar=editavel?`<button type="button" class="docente-btn-nova-escala rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700" data-docente="${this._esc(doc.id||doc.email)}">＋ Nova escala</button>`:'';
            const blocoAtual=vigente?`<div class="mt-3"><div class="mb-2 flex flex-wrap items-center gap-2"><h3 class="text-xs font-extrabold uppercase tracking-wide text-slate-500">${proxima?'Escala vigente até a próxima vigência':'Escala vigente'}</h3><span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">${this._esc(vigente.inicio_vigencia)} — ${vigente.final_vigencia==='Atual'?'Atual':this._esc(vigente.final_vigencia)}</span></div>${this._renderTabelaEscala(vigente)}</div>`:'<p class="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">Nenhuma escala vigente cadastrada.</p>';
            const listHistorico=historico.length?`<details class="mt-3 rounded-xl border border-slate-200 bg-slate-50"><summary class="cursor-pointer px-3 py-2 text-xs font-bold text-slate-600">Histórico de escalas (${historico.length})</summary><div class="space-y-3 border-t border-slate-200 p-3">${historico.map(x=>`<article><div class="mb-2 flex flex-wrap items-center justify-between gap-2"><b class="text-[11px] text-slate-700">${this._esc(x.inicio_vigencia)} até ${x.final_vigencia==='Atual'?'Atual':this._esc(x.final_vigencia||'—')}</b>${x.id===proxima?.id?'<span class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">Próxima vigência</span>':''}</div>${this._renderTabelaEscala(x)}</article>`).join('')}</div></details>`:'';
            return `<article class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><header class="flex flex-wrap items-center justify-between gap-2"><div><h2 class="text-sm font-extrabold text-slate-800">${this._esc(nome)}</h2><p class="text-[11px] text-slate-500">${this._esc(this._areasDocente(doc).join(', ')||'Sem área vinculada')}</p></div>${editar}</header>${blocoAtual}${listHistorico}</article>`;
        }).join('');
        const temProprio=selecionados.some(d=>C.podeEditarProprio(d));
        box.innerHTML=`${temProprio?'<p class="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">Somente o próprio docente pode cadastrar uma nova versão da sua escala. Cada versão é mantida no histórico, com início e fim de vigência.</p>':''}${cards}`;
    },
    async _renderizarFerias(){
        const box=document.getElementById('docente-ferias-conteudo');if(!box)return;
        const C=window.ControllerDocente,self=this._proprioDocente(),selecionados=this._docentesSelecionados().sort((a,b)=>{
            const aProprio=C.corresponde(a,self),bProprio=C.corresponde(b,self);
            if(aProprio!==bProprio)return aProprio?-1:1;
            return (a.nome_completo||a.nome||a.email||'').localeCompare(b.nome_completo||b.nome||b.email||'','pt-BR',{sensitivity:'base'});
        });
        if(!selecionados.length){box.innerHTML=this._mensagemSemSelecao();return;}
        const cards=selecionados.map(doc=>{const lista=C.feriasDocente(doc),proprio=C.podeEditarProprio(doc),nome=doc.nome_completo||doc.nome||doc.email||'Docente',rows=lista.map(f=>`<tr class="border-t border-slate-100"><td class="p-2 font-semibold text-slate-700">${this._esc(f.periodo_aquisitivo)}</td><td class="whitespace-nowrap p-2">${this._esc(this._formatDate(f.data_inicio))}</td><td class="whitespace-nowrap p-2">${this._esc(this._formatDate(C.dataFinalFerias(f)))}</td><td class="p-2 text-right font-bold tabular-nums">${Number(f.qtde_dias)||C._diasEntre(f.data_inicio,f.data_retorno)}</td>${proprio?`<td class="whitespace-nowrap p-2 text-right"><button type="button" class="docente-btn-editar-ferias mr-2 rounded-md border border-blue-200 px-2 py-1 text-[10px] font-bold text-blue-700" data-id="${this._esc(f.id)}">Editar</button><button type="button" class="docente-btn-excluir-ferias rounded-md border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-700" data-id="${this._esc(f.id)}">Excluir</button></td>`:''}</tr>`).join(''),colspan=proprio?5:4;
            return `<article class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><header class="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 class="text-sm font-extrabold text-slate-800">${this._esc(nome)}</h2><p class="text-[11px] text-slate-500">${lista.length} período(s) cadastrado(s)</p></div>${proprio?'<button type="button" class="docente-btn-nova-ferias rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">＋ Novo período</button>':''}</header><div class="overflow-x-auto rounded-xl border border-slate-200"><table class="min-w-[520px] w-full text-left text-xs"><thead class="bg-slate-100 text-slate-600"><tr><th class="p-2">Período aquisitivo</th><th class="p-2">Data início</th><th class="p-2">Data final</th><th class="p-2 text-right">Qtde dias</th>${proprio?'<th class="p-2 text-right">Ações</th>':''}</tr></thead><tbody>${rows||`<tr><td colspan="${colspan}" class="p-6 text-center text-slate-400">Nenhum período cadastrado.</td></tr>`}</tbody></table></div></article>`;
        }).join('');
        const temProprio=selecionados.some(d=>C.podeEditarProprio(d));
        box.innerHTML=`${temProprio?'<p class="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">Você pode cadastrar, editar ou remover os seus períodos. A Data Final é o último dia incluído nas férias; o retorno ocorre no próximo dia letivo.</p>':''}${cards}`;
    },
    _mensagemSemSelecao(){return '<div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Selecione ao menos um docente no filtro acima para exibir os dados.</div>';},
    _diaComExpediente(data,docente){return this._janelasTrabalho(docente,data);},
    _calcularPlanejamento(docente,range,encontros){
        const C=window.ControllerDocente,dtInicio=C._horaISO(range.inicio),dtFim=C._horaISO(range.fim),limite=range.fim;
        let total=0,aulas=0;
        for(const data=new Date(dtInicio);this._iso(data)<=limite;data.setDate(data.getDate()+1)){
            const iso=this._iso(data),janelas=this._diaComExpediente(iso,docente);if(!janelas.length)continue;
            const workMinutes=janelas.reduce((s,[a,b])=>s+b-a,0);total+=workMinutes;
            const intervalos=this._intervalosAula(encontros,docente,iso),valid=this._mergeIntervals(intervalos),ocupadas=[];
            for(const [a,b] of janelas)for(const [x,y] of valid){const lo=Math.max(a,x),hi=Math.min(b,y);if(hi>lo)ocupadas.push([lo,hi]);}
            let aula=ocupadas.length?this._mergeIntervals(ocupadas).reduce((s,[a,b])=>s+b-a,0):0;
            const semHora=this._meetingsDia(encontros,docente,iso).filter(e=>!e.h_inicio||!e.h_termino).reduce((s,e)=>s+(Number(e.ch_encontro)||0)*60,0);
            aula=Math.min(workMinutes,aula+semHora);
            aulas+=Math.min(workMinutes,aula);
        }
        return {total,aulas,restante:Math.max(0,total-aulas),pctAulas:this._percent(Math.min(total,aulas),total),pctRestante:this._percent(Math.max(0,total-aulas),total)};
    },
    _iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;},
    _cardResumoPlanejamento(doc,range,encontros,titulo){
        const r=this._calcularPlanejamento(doc,range,encontros),nome=doc.nome_completo||doc.nome||doc.email||'Docente';
        const periodo=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(range.ano,range.mes-1,1,12));
        const periodoLabel=titulo==='Média anual'?`Janeiro a ${periodo}`:periodo;
        return `<article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><header class="mb-3 flex flex-wrap items-start justify-between gap-2"><div><h2 class="text-sm font-extrabold text-slate-800">${this._esc(nome)}</h2><p class="text-xs capitalize text-slate-500">${titulo} · ${this._esc(periodoLabel)} · Carga prevista pela escala vigente</p></div><span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800">${r.total?`${r.pctAulas}% em aula`:'Sem carga prevista'}</span></header><div class="grid grid-cols-1 gap-2 sm:grid-cols-3"><div class="rounded-xl border border-blue-100 bg-blue-50 p-3"><p class="text-[10px] font-bold uppercase tracking-wide text-blue-700">Carga horária prevista</p><p class="mt-1 text-lg font-extrabold text-blue-900">${this._duracaoLabel(r.total)}</p><p class="mt-1 text-[10px] font-semibold text-blue-700">Total de horas no período</p></div><div class="rounded-xl border border-indigo-100 bg-indigo-50 p-3"><p class="text-[10px] font-bold uppercase tracking-wide text-indigo-700">Encontros de aula</p><p class="mt-1 text-3xl font-black leading-none text-indigo-900">${r.pctAulas}%</p><p class="mt-2 text-xs font-semibold text-indigo-800">${this._duracaoLabel(r.aulas)} em aula</p></div><div class="rounded-xl border border-teal-100 bg-teal-50 p-3"><p class="text-[10px] font-bold uppercase tracking-wide text-teal-800">Planejamento / outras atividades</p><p class="mt-1 text-3xl font-black leading-none text-teal-900">${r.pctRestante}%</p><p class="mt-2 text-xs font-semibold text-teal-800">${this._duracaoLabel(r.restante)} sem alocação em aula</p></div></div><div class="mt-4"><div class="mb-1 flex justify-between text-[10px] font-bold text-slate-500"><span>Aulas · ${r.pctAulas}%</span><span>Planejamento / outras atividades · ${r.pctRestante}%</span></div><div class="flex h-3 overflow-hidden rounded-full bg-teal-100"><div class="h-full bg-indigo-600" style="width:${Math.min(100,r.pctAulas)}%"></div></div></div></article>`;
    },
    _detalhesAtividades(docs,range){
        const C=window.ControllerDocente,lista=C.atividades.filter(x=>x.data>=range.inicio&&x.data<=range.fim&&docs.some(d=>C.corresponde(x,d))).sort((a,b)=>(a.data||'').localeCompare(b.data||'')||(a.inicio||'').localeCompare(b.inicio||''));
        if(!lista.length)return '';
        return `<section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 class="text-sm font-extrabold text-slate-800">Outras Atividades registradas no mês</h2><div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">${lista.map(x=>{const docente=docs.find(d=>C.corresponde(x,d)),nome=docente?.nome_completo||docente?.nome||docente?.email||'Docente';return `<article class="rounded-xl border border-teal-100 bg-teal-50 p-3"><div class="flex flex-wrap justify-between gap-1 text-[11px] font-extrabold text-teal-900"><span>${this._esc(this._formatDate(x.data))} · ${this._esc(x.inicio)}–${this._esc(x.termino)}</span><span>${this._esc(nome)}</span></div><p class="mt-1 whitespace-pre-wrap break-words text-xs text-slate-700">${this._esc(x.descricao)}</p></article>`;}).join('')}</div></section>`;
    },
    async _renderizarPlanejamento(){
        const box=document.getElementById('docente-planejamento-conteudo');if(!box)return;
        const role=window.usuarioAtual?.cargo,C=window.ControllerDocente,range=this._mesBounds();
        if(!C.podeVerPlanejamento()){box.innerHTML='';return;}
        const docs=role==='docente'?[this._proprioDocente()]:this._docentesSelecionados();if(!docs.length){box.innerHTML=this._mensagemSemSelecao();return;}
        box.innerHTML='<p class="p-5 text-center text-xs text-slate-500">Calculando carga horária do mês…</p>';
        try{
            this.atividadesMes=await C.carregarAtividades(role==='docente'?docs[0]:null,range.inicio,range.fim);
            const anual={...range,inicio:`${range.ano}-01-01`},encontros=window.ControllerDashboard.listarEncontros({inicio:anual.inicio,fim:range.fim});
            const resumo=(periodo,titulo)=>`<section class="space-y-3"><h2 class="text-base font-extrabold text-slate-800">${titulo}</h2>${docs.map(doc=>this._cardResumoPlanejamento(doc,periodo,encontros,titulo)).join('')}</section>`;
            box.innerHTML=`<div class="mb-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">${role==='docente'?'Este quadro é privado e mostra somente seus dados.':'Exibição restrita a técnicos/coordenadores e administradores; selecione os docentes no filtro acima.'}</div>${resumo(range,'Média mensal')}${resumo(anual,'Média anual')}${this._detalhesAtividades(docs,range)}`;
        }catch(err){box.innerHTML=`<p class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">${this._esc(err.message||'Não foi possível calcular o planejamento do mês.')}</p>`;}
    },
    _recalcularEscalaModal(){
        const C=window.ControllerDocente;let total=0;
        for(let d=1;d<=6;d++){
            const get=k=>document.getElementById(`docente-escala-${k}-${d}`)?.value||'',mins=C.chDia({entrada:get('entrada'),intervalo_inicio:get('intervalo_inicio'),intervalo_retorno:get('intervalo_retorno'),saida:get('saida')});total+=mins;
            const cell=document.getElementById(`docente-escala-ch-${d}`);if(cell)cell.textContent=this._duracaoLabel(mins);
        }
        const el=document.getElementById('docente-escala-total');if(el)el.textContent=this._duracaoLabel(total);
    },
    _abrirModalEscala(){
        const C=window.ControllerDocente,doc=C.docenteAtual(),historico=C.escalasDocente(doc),base=historico.find(x=>x.final_vigencia==='Atual')||historico[0],input=document.getElementById('docente-escala-vigencia');
        const hoje=C._hojeISO();let minimo='';
        if(historico.length){minimo=hoje;if(base&&base.inicio_vigencia>=hoje){const seguinte=this._diaSeguinte(base.inicio_vigencia);if(seguinte>minimo)minimo=seguinte;}}
        if(input){if(minimo)input.min=minimo;else input.removeAttribute('min');input.value=minimo||hoje;}
        for(let d=1;d<=6;d++)for(const k of ['entrada','intervalo_inicio','intervalo_retorno','saida']){const el=document.getElementById(`docente-escala-${k}-${d}`);if(el)el.value=base?.dias_semana?.[String(d)]?.[k]||'';}
        this._recalcularEscalaModal();this._abrirModal('docente-modal-escala');
    },
    _diaSeguinte(iso){const [y,m,d]=iso.split('-').map(Number),x=new Date(y,m-1,d,12);x.setDate(x.getDate()+1);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;},
    _abrirModalFerias(registro=null){
        const C=window.ControllerDocente;document.getElementById('docente-ferias-id').value=registro?.id||'';document.getElementById('docente-ferias-aquisitivo').value=registro?.periodo_aquisitivo||String(new Date().getFullYear());document.getElementById('docente-ferias-inicio').value=registro?.data_inicio||'';document.getElementById('docente-ferias-final').value=registro?C.dataFinalFerias(registro):'';document.getElementById('docente-ferias-titulo').textContent=registro?'Editar período de férias':'Novo período de férias';this._previewFerias();this._abrirModal('docente-modal-ferias');
    },
    _previewFerias(){
        const a=document.getElementById('docente-ferias-inicio')?.value,b=document.getElementById('docente-ferias-final')?.value,el=document.getElementById('docente-ferias-dias-preview');if(!el)return;
        const C=window.ControllerDocente,n=a&&b&&b>=a?C._diasEntre(a,C._diaSeguinteISO(b)):null;el.textContent=n===null?'Quantidade: informe uma data final igual ou posterior à data de início.':`Quantidade: ${n} dia(s)`;
    },
    _abrirModalAtividade(btn){
        const date=btn.dataset.data||'',inicio=btn.dataset.inicio||'',termino=btn.dataset.termino||'',id=btn.dataset.atividadeId||'',record=window.ControllerDocente.atividades.find(x=>x.id===id),tipo=record?.tipo||'Planejamento';
        document.getElementById('docente-atividade-data').value=date;document.getElementById('docente-atividade-inicio').value=inicio;document.getElementById('docente-atividade-termino').value=termino;document.getElementById('docente-atividade-id').value=id;document.getElementById('docente-atividade-tipo').value=tipo;document.getElementById('docente-atividade-descricao').value=record?.descricao||'';document.getElementById('docente-atividade-periodo').textContent=`${this._formatDate(date)} · ${inicio}–${termino}`;document.getElementById('docente-atividade-titulo').textContent=tipo==='Outra Atividade'?'Editar Outra Atividade':'Alterar classificação do horário';document.getElementById('docente-atividade-desc-wrap').classList.toggle('hidden',tipo!=='Outra Atividade');this._abrirModal('docente-modal-atividade');
    },
    _salvarNoBotao(btn,promise){if(btn){btn.disabled=true;btn.dataset.loading='true';}return promise.finally(()=>{if(btn){btn.disabled=false;delete btn.dataset.loading;}});},
    atualizarSuave(){if(!this._mounted())return;this._renderFiltro();this._renderTabAtiva()?.catch(err=>console.warn('[Docente] Atualização suave não concluída:',err));},
    async tratarCliques(e){
        if(!this._mounted())return false;
        if(['docente-modal-escala','docente-modal-ferias','docente-modal-atividade'].includes(e.target.id)){this._fecharModal(e.target.id);return true;}
        const t=e.target.closest('button,summary');if(!t)return false;
        if(t.matches('.tab-btn[data-target^="docente-tab-"]')){
            const tab=t.dataset.target,root=document.getElementById('docente-root');
            root.querySelectorAll('.tab-btn').forEach(b=>{const ativa=b===t;b.classList.toggle('active',ativa);b.classList.toggle('font-bold',ativa);b.classList.toggle('text-blue-600',ativa);b.classList.toggle('border-blue-600',ativa);b.classList.toggle('font-medium',!ativa);b.classList.toggle('text-slate-500',!ativa);b.classList.toggle('border-transparent',!ativa);});
            root.querySelectorAll('.tab-content').forEach(p=>p.classList.toggle('hidden',p.id!==tab));this._atualizarVisibilidadeFiltro();await this._renderTabAtiva();return true;
        }
        if(t.id==='docente-cal-anterior'){this.semana--;await this._renderizarCalendario();return true;}
        if(t.id==='docente-cal-proxima'){this.semana++;await this._renderizarCalendario();return true;}
        if(t.id==='docente-cal-hoje'){this.semana=0;await this._renderizarCalendario();return true;}
        if(t.id==='docente-btn-atualizar'){await window.ControllerDocente.carregarBase(true);window.ControllerDocente.atividadesChave='';await this._renderFiltro();await this._renderTabAtiva();window.Util.toast('Dados atualizados.',{tipo:'sucesso'});return true;}
        if(t.id==='docente-filtro-todos'||t.id==='docente-filtro-limpar'){this.docentesSelecionados=t.id.endsWith('todos')?window.ControllerDocente.obterDocentes().map(d=>String(d.id||d.email)):[];this._renderFiltro();await this._renderTabAtiva();return true;}
        if(t.classList.contains('docente-btn-nova-escala')){if(window.ControllerDocente.podeEditarProprio(this._proprioDocente()))this._abrirModalEscala();return true;}
        if(t.classList.contains('docente-btn-nova-ferias')){this._abrirModalFerias();return true;}
        if(t.classList.contains('docente-btn-editar-ferias')){const item=window.ControllerDocente.ferias.find(x=>x.id===t.dataset.id);if(item&&window.ControllerDocente.podeEditarProprio(item))this._abrirModalFerias(item);return true;}
        if(t.classList.contains('docente-btn-excluir-ferias')){const item=window.ControllerDocente.ferias.find(x=>x.id===t.dataset.id);if(!item||!window.ControllerDocente.podeEditarProprio(item))return true;const ok=await window.Dialog.confirmar('Deseja remover este período de férias?',{titulo:'Excluir férias',textoConfirmar:'Excluir'});if(!ok)return true;try{await window.ControllerDocente.excluirFerias(item.id);await this._renderizarFerias();await window.Dialog.sucesso('Período de férias removido.');}catch(err){await window.Dialog.erro(err,'Não foi possível excluir o período');}return true;}
        if(t.classList.contains('docente-btn-atividade')){if(window.usuarioAtual?.cargo==='docente')this._abrirModalAtividade(t);return true;}
        if(t.classList.contains('docente-modal-fechar')||t.id==='docente-modal-escala'||t.id==='docente-modal-ferias'||t.id==='docente-modal-atividade'){this._fecharModal(t.dataset.modal||t.id);return true;}
        return false;
    },
    async tratarMudancas(e){
        if(!this._mounted())return false;const t=e.target;
        if(t.id==='docente-escala-filtro-nome'){if(this.filtrosEscala)this.filtrosEscala.nome=t.value;await this._renderizarEscalas();return true;}
        if(t.matches('.docente-escala-area,.docente-escala-dia,.docente-escala-periodo')){
            if(!this.filtrosEscala)this.filtrosEscala={areas:[],nome:'',dias:[1,2,3,4,5,6],periodos:['manha','tarde','noite']};
            const f=this.filtrosEscala;
            if(t.classList.contains('docente-escala-area'))f.areas=[...document.querySelectorAll('.docente-escala-area:checked')].map(x=>x.value);
            if(t.classList.contains('docente-escala-dia'))f.dias=[...document.querySelectorAll('.docente-escala-dia:checked')].map(x=>Number(x.value));
            if(t.classList.contains('docente-escala-periodo'))f.periodos=[...document.querySelectorAll('.docente-escala-periodo:checked')].map(x=>x.value);
            await this._renderizarEscalas();return true;
        }
        if(t.classList.contains('docente-filtro-check')){const key=t.value;this.docentesSelecionados=t.checked?[...new Set([...this.docentesSelecionados,key])]:this.docentesSelecionados.filter(x=>x!==key);this._atualizarResumoFiltro();await this._renderTabAtiva();return true;}
        if(t.id==='docente-filtro-busca'){const q=this._norm(t.value);document.querySelectorAll('#docente-filtro-lista .docente-filtro-item').forEach(x=>x.hidden=!this._norm(x.dataset.texto).includes(q));return true;}
        if(t.classList.contains('docente-horario')){this._recalcularEscalaModal();return true;}
        if(t.id==='docente-ferias-inicio'||t.id==='docente-ferias-final'){this._previewFerias();return true;}
        if(t.id==='docente-atividade-tipo'){document.getElementById('docente-atividade-desc-wrap')?.classList.toggle('hidden',t.value!=='Outra Atividade');return true;}
        return false;
    },
    async tratarSubmits(e){
        if(!this._mounted())return false;
        if(e.target.id==='docente-form-escala'){
            const form=e.target,btn=form.querySelector('button[type="submit"]');try{
                const dias={};for(let d=1;d<=6;d++)dias[String(d)]={entrada:document.getElementById(`docente-escala-entrada-${d}`).value,intervalo_inicio:document.getElementById(`docente-escala-intervalo_inicio-${d}`).value,intervalo_retorno:document.getElementById(`docente-escala-intervalo_retorno-${d}`).value,saida:document.getElementById(`docente-escala-saida-${d}`).value};
                await this._salvarNoBotao(btn,window.ControllerDocente.salvarEscala({inicio_vigencia:document.getElementById('docente-escala-vigencia').value,dias_semana:dias}));this._fecharModal('docente-modal-escala');await this._renderizarEscalas();await window.Dialog.sucesso('Nova escala salva e histórico atualizado.');
            }catch(err){await window.Dialog.erro(err,'Não foi possível salvar a escala.');}return true;
        }
        if(e.target.id==='docente-form-ferias'){
            const form=e.target,btn=form.querySelector('button[type="submit"]'),id=document.getElementById('docente-ferias-id').value;try{
                await this._salvarNoBotao(btn,window.ControllerDocente.salvarFerias({periodo_aquisitivo:document.getElementById('docente-ferias-aquisitivo').value.trim(),data_inicio:document.getElementById('docente-ferias-inicio').value,data_final:document.getElementById('docente-ferias-final').value},id));this._fecharModal('docente-modal-ferias');await this._renderizarFerias();await window.Dialog.sucesso('Período de férias salvo.');
            }catch(err){await window.Dialog.erro(err,'Não foi possível salvar as férias.');}return true;
        }
        if(e.target.id==='docente-form-atividade'){
            const form=e.target,btn=form.querySelector('button[type="submit"]');try{
                await this._salvarNoBotao(btn,window.ControllerDocente.salvarAtividade({docente:this._proprioDocente(),data:document.getElementById('docente-atividade-data').value,inicio:document.getElementById('docente-atividade-inicio').value,termino:document.getElementById('docente-atividade-termino').value,tipo:document.getElementById('docente-atividade-tipo').value,descricao:document.getElementById('docente-atividade-descricao').value,registroId:document.getElementById('docente-atividade-id').value}));this._fecharModal('docente-modal-atividade');await this._renderizarCalendario();const pl=document.getElementById('docente-planejamento-conteudo');if(pl)await this._renderizarPlanejamento();await window.Dialog.sucesso('Atividade do calendário atualizada.');
            }catch(err){await window.Dialog.erro(err,'Não foi possível salvar a atividade.');}return true;
        }
        return false;
    }
};
