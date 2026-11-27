// ./dashboard/app_dashboard.js - Orquestração das abas e ações do Dashboard
window.AppDashboard = {
    semanaDocente:0,semanaTecnica:0,semanaAdmin:0,modoAreas:'minhas',filtrosAgendaTecnica:{docentes:null,turmas:null},agendaTecnicaCache:null,agendaTecnicaAbertas:new Set(),alteracoesCache:null,alteracoesLimite:60,solicitacoesCache:[],solicitacaoProcessando:null,
    async iniciarView() {
        if(window.usuarioAtual?.cargo==='pendente')return;
        this.semanaDocente=0;this.semanaTecnica=0;this.semanaAdmin=0;this.modoAreas=['root','admin'].includes(window.usuarioAtual?.cargo)?'todas':'minhas';this.filtrosAgendaTecnica={docentes:null,turmas:null};this.agendaTecnicaCache=null;this.agendaTecnicaAbertas=new Set();this.alteracoesCache=null;this.alteracoesLimite=60;
        await window.Store.garantirPronto();
        const cargo=window.usuarioAtual?.cargo,admin=['root','admin'].includes(cargo),apoio=cargo==='apoio',docente=cargo==='docente';
        const padrao=admin?'tab-dashboard-admin':apoio?'tab-dashboard-alteracoes':docente||cargo==='tecnico'?'tab-dashboard-agenda':'tab-dashboard-dados';
        const raiz=document.getElementById('dashboard-root');raiz?.querySelectorAll('.tab-btn[data-target^="tab-dashboard-"]').forEach(btn=>{const ativa=btn.dataset.target===padrao;btn.classList.toggle('active',ativa);btn.classList.toggle('font-bold',ativa);btn.classList.toggle('text-blue-600',ativa);btn.classList.toggle('border-blue-600',ativa);btn.classList.toggle('font-medium',!ativa);btn.classList.toggle('text-slate-500',!ativa);btn.classList.toggle('border-transparent',!ativa);});raiz?.querySelectorAll('.tab-content[id^="tab-dashboard-"]').forEach(panel=>panel.classList.toggle('hidden',panel.id!==padrao));
        if(padrao==='tab-dashboard-agenda'){if(docente){await window.Store.garantirPronto();await window.ControllerDocente?.carregarBase();this._renderizarFiltrosCalendarioDocente();await this._renderizarSemanaDocente();}else await this._renderizarAgendaTecnica();}
        if(padrao==='tab-dashboard-alteracoes'){if(apoio)await this._renderizarApoio();else await this._renderizarAlteracoesTecnicas();}
        if(admin)await window.AppAdminCredenciamento?.iniciarView();
        this._atualizarBadgeSolicitacoes().catch(err=>console.warn('[Dashboard] Não foi possível atualizar a contagem de solicitações:',err));
        this._atualizarBadgeAlteracoes().catch(err=>console.warn('[Dashboard] Contagem de alterações indisponível:',err));
    },
    async _atualizarBadgeAlteracoes(){const badge=document.getElementById('dash-alteracoes-pendentes-badge');if(!badge)return;try{const itens=await this._carregarAlteracoes(),n=this._alteracoesPorArea(itens.filter(x=>x.situacao==='Pendente'),this.modoAreas).length;badge.textContent=String(n);badge.classList.toggle('hidden',n<1);badge.title=`${n} alteração(ões) pendente(s)`;}catch(_){badge.classList.add('hidden');}},
    _esc(v) { return window.Util.esc(v); },
    _mostrarStatus(msg,erro=false) { return erro?window.Dialog.erro(msg):window.Util.toast(msg,{tipo:'sucesso'}); },
    async _carregarAlteracoes() {
        if(this.alteracoesCache)return this.alteracoesCache;
        const C=window.ControllerApoioAlteracoes;
        // Reutiliza a mesma consulta econômica da tela Apoio: alterações pendentes de qualquer idade + janela recente.
        const itens=await C.carregar(C.desdePadraoISO());
        const turmas=new Map((window.Store.dados.turmas||[]).map(t=>[t.id,t])),encontros=window.Store.dados.encontros||[],encontrosPorId=new Map(encontros.map(x=>[x.id,x])),posicoes=new Map(),porTurmaUC=new Map();
        // Índice de posição calculado numa passagem, evitando _posicao() (varredura repetida por cartão).
        encontros.filter(x=>x.tipo!=='cancelamento').forEach(enc=>{const k=`${enc.id_turma||''}|${enc.id_uc||''}`;if(!porTurmaUC.has(k))porTurmaUC.set(k,[]);porTurmaUC.get(k).push(enc);});
        porTurmaUC.forEach(lista=>{lista.sort((a,b)=>(a.data||'').localeCompare(b.data||''));lista.forEach((enc,i)=>posicoes.set(enc.id,{numero:i+1,total:lista.length}));});
        for(const i of itens){
            const d=i.dados||{},turma=turmas.get(d.id_turma)||{};i.chave=window.Util.chaveEncontro(d);i.turmaRef=turma.referencia||i.snapshot?.turmaRef||'—';i.oferta=turma.oferta||i.snapshot?.oferta||'';i.area=turma.area||turma.curso_area||i.snapshot?.area||'';i.encontro=null;
            let SS=i.SSreg===true,SGO=i.SGOreg===true;
            if(i.acao==='Inserir'){const enc=encontrosPorId.get(d.id);if(enc&&window.Util.chaveEncontro(enc)===i.chave){i.encontro=enc;SS=enc.SS===true;SGO=enc.SGO===true;}}
            i.SS=SS;i.SGO=SGO;i.situacao=SS&&SGO?'Realizada':'Pendente';
            const pos=i.encontro?posicoes.get(i.encontro.id):null;i.numero=pos?.numero??i.snapshot?.numero??null;i.total=pos?.total??i.snapshot?.total??null;
        }
        this.alteracoesCache=window.ControllerApoioAlteracoes.ordenar(C.classificar(itens).ativos);
        return this.alteracoesCache;
    },
    async _renderizarListaAlteracoesPendentes(idBox) {
        const box=document.getElementById(idBox);if(!box)return;
        try{
            const todos=await this._carregarAlteracoes(),pend=window.ControllerApoioAlteracoes.ordenar(this._alteracoesPorArea(todos.filter(i=>i.situacao==='Pendente'),this.modoAreas));
            const mostrar=pend.slice(0,this.alteracoesLimite),cards=mostrar.map(i=>window.ViewsApoio.cartaoAlteracao(i,{podeAlterar:window.ControllerApoioAlteracoes.podeAlterarFlags()})).join('');
            const mais=pend.length>this.alteracoesLimite?`<div class="col-span-full text-center"><button type="button" id="dash-btn-mais-alteracoes" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Mostrar mais (${pend.length-this.alteracoesLimite} restantes)</button></div>`:'';
            box.innerHTML=pend.length?`<div class="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">${cards}${mais}</div>`:'<div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Nenhuma alteração pendente nas suas áreas.</div>';
            const total=document.getElementById('dash-alteracoes-total');if(total)total.textContent=`${pend.length} pendente(s)`;const badge=document.getElementById('dash-alteracoes-pendentes-badge');if(badge){badge.textContent=String(pend.length);badge.classList.toggle('hidden',pend.length<1);}
        }catch(err){box.innerHTML=`<p class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">${this._esc(err.message||'Não foi possível carregar as alterações.')}</p>`;}
    },
    async _alternarFlagDashboard(input) {
        const C=window.ControllerApoioAlteracoes,item=this.alteracoesCache?.find(i=>i.id===input.dataset.id);if(!item)return;
        const flag=input.dataset.flag,valor=input.checked;if(!C.podeAlterarFlags()){input.checked=!valor;return;}
        if(this._salvandoFlagDashboard){input.checked=!valor;return;}this._salvandoFlagDashboard=true;input.disabled=true;
        try{
            await C.alternarFlag(item,flag,valor);
            const rotulo=`${item.dados?.uc_referencia||'encontro'} de ${window.Util.dataBR(item.dados?.data)}`;
            window.Util.toast(`${flag} ${valor?'marcado':'desmarcado'} — ${rotulo}.`,{grupo:'apoio-flag',acao:{texto:'Desfazer',fn:()=>this._desfazerFlagDashboard(item.id,flag,!valor)}});
        }catch(err){input.checked=!valor;await window.Dialog.erro(err?.code==='permission-denied'?'O Firebase recusou a gravação para este perfil. Confirme se as regras permitem marcar SS/SGO.':err,`Não foi possível ${valor?'marcar':'desmarcar'} ${flag}`);}
        finally{this._salvandoFlagDashboard=false;}
        await this._renderizarListaAlteracoesPendentes(this._idListaAlteracoesAtual());
    },
    async _desfazerFlagDashboard(id,flag,valor) {
        const item=this.alteracoesCache?.find(i=>i.id===id);if(!item)return;
        try{await window.ControllerApoioAlteracoes.alternarFlag(item,flag,valor);await this._renderizarListaAlteracoesPendentes(this._idListaAlteracoesAtual());window.Util.toast(`${flag} restaurado.`,{grupo:'apoio-flag'});}
        catch(err){await window.Dialog.erro(err,'Não foi possível desfazer');}
    },
    _idListaAlteracoesAtual() { return document.getElementById('dash-alteracoes-pendentes')?'dash-alteracoes-pendentes':'dash-apoio-recentes'; },
    _alteracoesPorArea(itens,modo) {
        if(modo==='todas')return itens;
        const areas=window.ControllerDashboard._areasUsuario();
        if(!areas.length)return itens;
        return itens.filter(i=>areas.some(a=>window.Util.semAcento(a)===window.Util.semAcento(i.area)));
    },
    async _renderizarApoio() { await this._renderizarListaAlteracoesPendentes('dash-apoio-recentes'); },
    _horaAgenda(valor) {
        const m=String(valor||'').match(/^(\d{1,2}):(\d{2})$/);
        return m?`${String(Number(m[1])).padStart(2,'0')}:${m[2]}`:'Horário não informado';
    },
    _paletaAgenda(enc) {
        return {border:'#2563eb',soft:'#eff6ff',text:'#1e3a8a'};
    },
    _calendarioDocente(encontros,inicio,{mostrarDocentes=false,mostrarCancelamentos=!mostrarDocentes}={}) {
        const C=window.ControllerDashboard,e=this._esc,dias=Array.from({length:6},(_,i)=>C._addDays(inicio,i)),periodos=['Manhã','Tarde','Noite'];
        const porDia=new Map(dias.map(data=>[data,new Map(periodos.map(periodo=>[periodo,[]]))]));
        (encontros||[]).forEach(enc=>{const dia=porDia.get(enc.data),periodo=C._periodo(enc);if(dia?.has(periodo))dia.get(periodo).push(enc);});
        const avisosDia=new Map(dias.map(data=>[data,[]])),avisosPeriodo=new Map(dias.map(data=>[data,new Map(periodos.map(periodo=>[periodo,[]]))]));
        const periodoNorm=v=>{const n=window.Util.semAcento(v).toLowerCase();return n.includes('manha')?'Manhã':n.includes('tarde')?'Tarde':n.includes('noite')?'Noite':'';};
        const paletaAviso=aviso=>{const n=window.Util.semAcento(`${aviso.rotulo||''} ${aviso.descricao||''}`).toLowerCase();if(/ponte|compens|reuniao|pedagog/.test(n))return{bg:'#fef3c7',border:'#f59e0b',text:'#92400e'};if(/feriado|cancelamento/.test(n))return{bg:'#fee2e2',border:'#ef4444',text:'#991b1b'};return{bg:'#f1f5f9',border:'#94a3b8',text:'#334155'};};
        const adicionarAviso=(data,periodo,aviso)=>{if(periodo&&avisosPeriodo.get(data)?.has(periodo))avisosPeriodo.get(data).get(periodo).push(aviso);else avisosDia.get(data)?.push(aviso);};
        (window.Store.dados.excecoes||[]).forEach(raw=>{
            const data=String(raw.data||raw.id||'');if(!avisosDia.has(data))return;
            const aviso={rotulo:String(raw.excecao||raw.tipo||'Exceção'),descricao:String(raw.descricao||'').trim()},afetados=Array.isArray(raw.periodos)?[...new Set(raw.periodos.map(periodoNorm).filter(Boolean))]:[];
            if(!afetados.length||afetados.length===periodos.length)adicionarAviso(data,'',aviso);else afetados.forEach(periodo=>adicionarAviso(data,periodo,aviso));
        });
        if(mostrarCancelamentos)(window.Store.dados.encontros||[]).filter(enc=>avisosDia.has(enc.data)&&window.Util.semAcento(enc.tipo).toLowerCase()==='cancelamento'&&C._docenteCorresponde(enc)).forEach(enc=>{
            const turma=enc.turma||C._turma(enc),periodo=C._periodo(enc),uc=enc.uc_referencia||'',descricao=[turma.referencia||enc.turma_referencia,uc,enc.descricao].filter(Boolean).join(' · ');
            adicionarAviso(enc.data,periodo,{rotulo:'Cancelamento de encontro',descricao});
        });
        const hoje=C._dataLocal(),nomes=['Seg','Ter','Qua','Qui','Sex','Sáb'],classeDia=data=>data===hoje?'dash-cal-dia-atual':'',classePeriodo=periodo=>`dash-cal-period-${window.Util.semAcento(periodo).toLowerCase()}`;
        const mesDia=data=>new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(Number(data.slice(0,4)),Number(data.slice(5,7))-1,Number(data.slice(8,10)),12)).replace('.','');
        const cabecalho=dias.map((data,i)=>`<div class="dash-cal-header ${classeDia(data)}"><span class="dash-cal-dia-nome">${nomes[i]}</span><span class="dash-cal-dia-numero">${Number(data.slice(8,10))}</span><span class="dash-cal-mes">${mesDia(data)}</span></div>`).join('');
        const avisoCard=(aviso,mobile=false)=>{const pal=paletaAviso(aviso),texto=[aviso.rotulo,aviso.descricao].filter(Boolean).join(' · ');return mobile?`<article class="dash-mobile-exception" style="--exception-bg:${pal.bg};--exception-border:${pal.border};--exception-text:${pal.text}" title="${e(texto)}"><b>${e(aviso.rotulo)}</b>${aviso.descricao?`<span>${e(aviso.descricao)}</span>`:''}</article>`:`<div class="dash-cal-exception-card" style="--exception-bg:${pal.bg};--exception-border:${pal.border};--exception-text:${pal.text}" title="${e(texto)}"><b>${e(aviso.rotulo)}</b>${aviso.descricao?`<span> · ${e(aviso.descricao)}</span>`:''}</div>`;};
        const cartao=(enc,modoMobile=false)=>{
            const turma=enc.turma||{},pal=this._paletaAgenda(enc),ref=e(enc.uc_referencia||'UC'),turmaRef=e(turma.referencia||enc.turma_referencia||'Turma'),oferta=e(turma.oferta||''),salaRaw=enc.sala_referencia||enc.sala_nome||(window.Store.dados.salas||[]).find(x=>x.id===enc.sala_id)?.referencia||enc.sala_id||'',sala=e(salaRaw),docentes=(enc.docentes||[]).map(d=>d.nome_completo||d.nome||d.email).filter(Boolean).join(', '),docenteNome=docentes||'Docente não informado',rotuloTurma=`${turmaRef}${oferta?` · ${oferta}`:''}`,salaHtml=sala?`<span class="dash-cal-event-meta dash-cal-event-sala">Sala ${sala}</span>`:'',docentesHtml=`<span class="dash-cal-event-docente">${e(docenteNome)}</span>`,tituloCompleto=`${ref} · ${rotuloTurma} · ${docenteNome}${salaRaw?` · Sala ${salaRaw}`:''}`;
            if(enc.tipo==='planejamento_docente'){
                const outra=enc.atividade_tipo==='Outra Atividade',descricao=String(enc.atividade_descricao||''),compensacao=outra&&/compensa[cç][aã]o/i.test(descricao),rotulo=outra?'Outra Atividade':'Planejamento',pal=compensacao?{bg:'#fff7ed',border:'#f97316',text:'#9a3412'}:outra?{bg:'#f5f3ff',border:'#8b5cf6',text:'#5b21b6'}:{bg:'#ecfdf5',border:'#22c55e',text:'#166534'},desc=outra?`<span class="dash-cal-planning-description">${e(descricao)}</span>`:'',attrs=`data-data="${e(enc.data||'')}" data-inicio="${e(enc.h_inicio||'')}" data-termino="${e(enc.h_termino||'')}" data-atividade-id="${e(enc.atividade_id||'')}"`,label=`${rotulo} · ${enc.h_inicio||''}–${enc.h_termino||''}`,vars=`--planning-bg:${pal.bg};--planning-border:${pal.border};--planning-text:${pal.text}`,perfil=window.usuarioAtual?.cargo,privilegiado=['tecnico','admin','root'].includes(perfil),nomeDocente=privilegiado&&mostrarDocentes?(enc.docentes||[]).map(d=>d.nome_completo||[d.nome,d.sobrenome].filter(Boolean).join(' ')||d.email).filter(Boolean).join(', '):'',docenteHtml=nomeDocente?`<span class="dash-cal-planning-docente">${e(nomeDocente)}</span>`:'',editavel=perfil==='docente',tag=editavel?'button':'article',attrsHtml=editavel?`type="button" class="docente-btn-atividade text-left" ${attrs}`:'',acaoHtml=editavel?'<span class="dash-cal-planning-action">Alterar atividade</span>':'';
                return `<${tag} class="dash-cal-planning ${modoMobile?'dash-cal-planning-mobile':''}" style="${vars}" ${attrsHtml} title="${e([outra?`${label} · ${descricao}`:label,nomeDocente].filter(Boolean).join(' · '))}"><span class="dash-cal-planning-title">${rotulo}</span>${docenteHtml}<span class="dash-cal-planning-time">${e(enc.h_inicio||'')}–${e(enc.h_termino||'')} · ${e(String(enc.ch_encontro||0))}h</span>${desc}${acaoHtml}</${tag}>`;
            }
            if(modoMobile)return `<article class="dash-mobile-event ${mostrarDocentes?'dash-mobile-event-consolidado':''}" style="--event-bg:${pal.soft};--event-border:${pal.border};--event-text:${pal.text}"><div class="min-w-0"><p class="dash-mobile-event-uc">${ref}</p><p class="dash-mobile-event-turma">${e(rotuloTurma)}</p><p class="dash-mobile-event-docente">${e(docenteNome)}</p>${salaHtml?`<p class="dash-mobile-event-meta dash-mobile-event-sala">Sala ${sala}</p>`:''}</div></article>`;
            return `<article class="dash-cal-event ${mostrarDocentes?'dash-cal-event-consolidado':''}" title="${e(tituloCompleto)}" style="--event-bg:${pal.soft};--event-border:${pal.border};--event-text:${pal.text}"><span class="dash-cal-event-uc">${ref}</span><span class="dash-cal-event-turma">${e(rotuloTurma)}</span>${docentesHtml}${salaHtml}</article>`;
        };
        const linhaAvisos=dias.map((data,di)=>`<div class="dash-cal-exception-cell ${classeDia(data)}" style="grid-column:${di+2};grid-row:2">${avisosDia.get(data).map(a=>avisoCard(a)).join('')}</div>`).join('');
        const desktopRows=periodos.map((periodo,pi)=>{
            const linha=pi+3,classe=classePeriodo(periodo),rotulo=`<div class="dash-cal-period-label ${classe}" style="grid-column:1;grid-row:${linha}">${periodo.toUpperCase()}</div>`;
            const celulas=dias.map((data,di)=>{const eventos=porDia.get(data).get(periodo).slice().sort((a,b)=>(a.h_inicio||'').localeCompare(b.h_inicio||'')),avisos=avisosPeriodo.get(data).get(periodo);return `<div class="dash-cal-period-cell ${classe} ${classeDia(data)} ${pi===periodos.length-1?'dash-cal-final':''}" style="grid-column:${di+2};grid-row:${linha}">${avisos.map(a=>avisoCard(a)).join('')}${eventos.map(enc=>cartao(enc)).join('')}</div>`;}).join('');
            return rotulo+celulas;
        }).join('');
        const desktop=`<div class="dash-cal-desktop"><div class="dash-cal-scroll"><div class="dash-cal-grid"><div class="dash-cal-corner">Período</div>${cabecalho}<div class="dash-cal-period-label dash-cal-exception-label" style="grid-column:1;grid-row:2">AVISOS</div>${linhaAvisos}${desktopRows}</div></div></div>`;
        const aberto=dias.includes(hoje)?hoje:dias[0];
        const mobile=`<div class="dash-cal-mobile">${dias.map((data,i)=>{const atual=porDia.get(data),avisosDiaLista=avisosDia.get(data),avisosPeriodos=periodos.flatMap(periodo=>avisosPeriodo.get(data).get(periodo)),total=periodos.reduce((s,p)=>s+atual.get(p).length,0)+avisosDiaLista.length+avisosPeriodos.length,todosAvisos=[...avisosDiaLista,...avisosPeriodos],badgePal=todosAvisos.length?paletaAviso(todosAvisos[0]):null,badgeAviso=todosAvisos.length?`<span class="dash-mobile-day-alert" style="--exception-bg:${badgePal.bg};--exception-border:${badgePal.border};--exception-text:${badgePal.text}" title="${e(todosAvisos.map(a=>a.rotulo).join(', '))}">${e(todosAvisos.length>1?`${todosAvisos.length} avisos`:todosAvisos[0].rotulo)}</span>`:'',avisosMobile=avisosDiaLista.map(a=>avisoCard(a,true)).join(''),grupos=periodos.map(periodo=>{const eventos=atual.get(periodo),avisos=avisosPeriodo.get(data).get(periodo);if(!eventos.length&&!avisos.length)return'';return `<section class="dash-mobile-period ${classePeriodo(periodo)}"><h4 class="dash-mobile-period-label">${periodo.toUpperCase()}</h4><div class="dash-mobile-period-events">${avisos.map(a=>avisoCard(a,true)).join('')}${eventos.slice().sort((a,b)=>(a.h_inicio||'').localeCompare(b.h_inicio||'')).map(enc=>cartao(enc,true)).join('')}</div></section>`;}).join(''),conteudo=avisosMobile+grupos||'<p class="dash-mobile-empty">Sem encontros ou avisos neste dia.</p>';return `<details data-date="${data}" class="dash-mobile-day ${data===hoje?'dash-mobile-today':''}" ${data===aberto?'open':''}><summary><span><b>${nomes[i]}</b><span>${Number(data.slice(8,10))} ${mesDia(data)}</span></span>${badgeAviso}<span class="dash-mobile-count">${total}</span></summary><div class="dash-mobile-day-content">${conteudo}</div></details>`;}).join('')}</div>`;
        return desktop+mobile;
    },
    async _comporAgendaSemanal(encontros,inicio,docs,atividadesBase=null){
        const A=window.AppDocente,C=window.ControllerDocente,D=window.ControllerDashboard;
        const base=Array.isArray(encontros)?encontros:[],lista=(docs||[]).filter(Boolean);
        if(!A||!C||!lista.length)return base;
        const fim=D._addDays(inicio,5),atividades=atividadesBase||await C.carregarAtividades(window.usuarioAtual?.cargo==='docente'?lista[0]:null,inicio,fim);
        const planos=await A._gerarPlanejamentoSemana(base,{inicio,fim},lista,atividades);
        return [...base,...planos];
    },
    async _agendaComPlanejamento(encontros,inicio,modo='minhas'){
        const cargo=window.usuarioAtual?.cargo;if(!['docente','tecnico','admin','root'].includes(cargo))return encontros;
        const A=window.AppDocente,C=window.ControllerDocente,D=window.ControllerDashboard;if(!A||!C)return encontros;
        let docs;
        if(cargo==='docente')docs=[C.docenteAtual()];
        else{
            const areas=modo==='todas'?[]:D._areasUsuario(),norm=x=>window.Util.semAcento(x||'').toLowerCase();
            docs=C.obterDocentes().filter(d=>!areas.length||A._areasDocente(d).some(a=>areas.some(x=>norm(a)===norm(x))));
            const seleccion=this.filtrosAgendaTecnica?.docentes;if(cargo==='tecnico'&&seleccion!==null&&seleccion!==undefined)docs=docs.filter(d=>seleccion.includes(this._chaveDocenteAgenda(d)));
        }
        return this._comporAgendaSemanal(encontros,inicio,docs);
    },
    async _renderizarSemanaDocente() {
        const D=window.ControllerDashboard,A=window.AppDocente,C=window.ControllerDocente;
        const box=document.getElementById('dash-semana-docente'),agendaBox=document.getElementById('dash-docente-cal-agendas');
        if(!box||!agendaBox||!A||!C)return;
        const data=D.listarSemanaDocente(this.semanaDocente),label=document.getElementById('dash-semana-docente-label');
        if(label)label.textContent=D.formatarSemana(data.inicio,data.fim);
        const abertas=new Set([...agendaBox.querySelectorAll('details[data-docente-agenda][open]')].map(x=>x.dataset.docenteAgenda));
        const painel=document.querySelector('#dashboard-root main'),top=painel?.scrollTop,left=painel?.scrollLeft;
        try{
            await C.carregarBase();
            const filtro=A._filtroAba('docente-tab-calendario'),docs=A._docentesFiltrados('docente-tab-calendario'),self=C.docenteAtual();
            const encontrosTodos=D.listarEncontros({inicio:data.inicio,fim:data.fim}),principal=docs.some(doc=>C.corresponde(doc,self))?docs.filter(doc=>C.corresponde(doc,self)):[self].filter(Boolean);
            const encontros=encontrosTodos.filter(enc=>(enc.docentes||[]).some(pessoa=>principal.some(doc=>C.corresponde(pessoa,doc))));
            const atividades=self?await C.carregarAtividades(self,data.inicio,data.fim):[];
            const itensSemana=self?await this._comporAgendaSemanal(encontros,data.inicio,[self],atividades):encontros;
            box.innerHTML=this._calendarioDocente(itensSemana,data.inicio,{mostrarDocentes:false,mostrarCancelamentos:false});
            const total=document.getElementById('dash-docente-cal-total');if(total)total.textContent=`${encontros.length} encontro(s)`;
            const nome=doc=>doc.nome_completo||[doc.nome,doc.sobrenome].filter(Boolean).join(' ')||doc.email||'Docente';
            const cards=[];
            for (const doc of docs) {
                const id=A._idDocenteFiltro(doc),lista=encontrosTodos.filter(enc=>(enc.docentes||[]).some(pessoa=>C.corresponde(pessoa,doc)));
                // Perfil docente só recebe detalhes de planejamento/atividade do próprio usuário.
                // Para outros docentes, permanece visível somente a grade pública de encontros.
                const propriaAgenda=self&&C.corresponde(doc,self),atividadesDoc=propriaAgenda?atividades:[];
                const agendaIndividual=propriaAgenda?itensSemana:lista;
                const html=this._calendarioDocente(agendaIndividual,data.inicio,{mostrarDocentes:false,mostrarCancelamentos:false});
                cards.push(`<details ${abertas.has(id)?'open':''} data-docente-agenda="${this._esc(id)}" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-extrabold text-slate-800"><span>${this._esc(nome(doc))}</span><span class="text-xs font-semibold text-slate-500">Agenda individual</span></summary><div class="docente-cal-scroll-livre border-t border-slate-200">${html}</div></details>`);
            }
            const cardsHtml=cards.join('');
            agendaBox.innerHTML=cardsHtml||A._mensagemSemSelecao();
            A._atualizarBotaoFiltro?.();
        }catch(err){const msg=`<p class="m-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">${this._esc(err.message||'Não foi possível carregar o calendário.')}</p>`;box.innerHTML=msg;agendaBox.innerHTML=msg;}
        if(painel&&top!==undefined){painel.scrollTop=top;painel.scrollLeft=left;}
    },
    _renderizarFiltrosCalendarioDocente() {
        const A=window.AppDocente;if(!A)return;
        A._filtroAba('docente-tab-calendario');A._renderModalFiltros();A._atualizarBotaoFiltro();
    },
    async _renderizarDestinatariosSolicitacao() {
        const box=document.getElementById('dash-sol-destinatarios');if(!box)return;
        await window.Store.garantirPronto();
        let avisoDiretorio='';
        if(['root','admin'].includes(window.usuarioAtual?.cargo)&&window.ControllerAdminCredenciamento?.sincronizarDiretorio){
            try{await window.ControllerAdminCredenciamento.sincronizarDiretorio();}
            catch(err){
                console.warn('[Dashboard] Sincronização do diretório não concluída:',err);
                if(err?.code==='permission-denied')avisoDiretorio='<p class="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">O perfil Admin/Root não conseguiu sincronizar o diretório. Verifique as regras de leitura de <b>usuarios</b> e gravação em <b>diretorio_solicitacoes_minimo</b>.</p>';
            }
        }
        let todos=window.ControllerDashboardSolicitacoes.listarDestinatarios();
        const uidAtual=window.usuarioAtual?.uid||window.auth?.currentUser?.uid||'';
        const somenteProprio=todos.length===0||(todos.length===1&&todos[0].uid===uidAtual);
        // O login publica o próprio registro antes do snapshot. Se o listener falhou por documentos legados,
        // o estado local parece não vazio; faça uma leitura pontual também nesse caso para recuperar a lista
        // após a limpeza Admin/Root, sem exigir que o usuário saia e entre novamente.
        if(somenteProprio){
            try{
                const snap=await window.db.collection('diretorio_solicitacoes_minimo').get();
                const registros=snap.docs.map(d=>{const x=d.data()||{},permitidas=['uid','nome','cargo','status'],item={id:d.id,uid:String(x.uid||''),nome:String(x.nome||''),cargo:String(x.cargo||''),status:String(x.status||'ativo')};if(Object.keys(x).some(k=>!permitidas.includes(k)))item._normalizarNecessario=true;return item;});
                window.Store.dados.destinatarios=registros;window.Store._salvarCacheNavegador?.();
                todos=window.ControllerDashboardSolicitacoes.listarDestinatarios();
            }catch(err){
                console.warn('[Dashboard] Não foi possível consultar o diretório de destinatários:',err);
                if(err?.code==='permission-denied')avisoDiretorio='<p class="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">A lista individual está bloqueada pelas regras do Firestore. Publique as regras atualizadas para a coleção <b>diretorio_solicitacoes_minimo</b>.</p>';
            }
        }
        const grupos=[{id:'tecnico',nome:'Técnicos',roles:['tecnico']},{id:'docente',nome:'Docentes',roles:['docente']},{id:'apoio',nome:'Apoio',roles:['apoio']},{id:'admin',nome:'Admins',roles:['admin','root']}];
        if(todos.length<=1&&!avisoDiretorio)avisoDiretorio='<p class="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">O diretório mostra apenas o usuário atual. Entre com Root/Admin e abra este modal para sincronizar os destinatários habilitados; depois esta tela tentará recarregar a lista automaticamente.</p>';
        box.innerHTML=avisoDiretorio+grupos.map(g=>{
            const usuarios=todos.filter(u=>g.roles.includes(u.cargo));
            const conteudo=usuarios.length?`<div class="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">${usuarios.map(u=>`<label class="flex min-w-0 items-start gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-xs hover:bg-white"><input type="checkbox" class="dash-sol-destino-usuario mt-0.5 accent-indigo-600" data-grupo="${g.id}" data-perfil="${this._esc(u.cargo)}" value="${this._esc(u.uid)}"><span class="min-w-0"><b class="block truncate text-slate-700">${this._esc(u.nome)}</b></span></label>`).join('')}</div>`:'<p class="text-[11px] text-slate-500">Nenhum destinatário individual disponível neste perfil.</p>';
            return `<div class="rounded-lg border border-slate-200 bg-slate-50"><div class="flex items-center gap-2 px-3 py-2"><details class="min-w-0 flex-1"><summary class="cursor-pointer text-xs font-extrabold text-slate-700">${g.nome}<span class="ml-2 text-[10px] font-medium text-slate-400">${usuarios.length} usuário(s)</span></summary><div class="mt-2 space-y-2 border-t border-slate-200 pt-2">${conteudo}</div></details><label class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-white" title="Enviar para todos de ${g.nome.toLowerCase()}"><input type="checkbox" class="dash-sol-destino-grupo accent-indigo-600" data-grupo="${g.id}" value="${g.id}"><span>Todos</span></label></div></div>`;
        }).join('');
    },
    _abrirModalProcessar(item) {
        this.solicitacaoProcessando=item?.id||null;
        const id=document.getElementById('dash-processar-id'),assunto=document.getElementById('dash-processar-assunto'),resposta=document.getElementById('dash-processar-resposta');
        if(id)id.value=item?.id||'';if(assunto)assunto.textContent=item?.assunto||'';if(resposta)resposta.value='';
        const modal=document.getElementById('dash-modal-processar-solicitacao');modal?.classList.remove('hidden');modal?.classList.add('flex');
    },
    _chaveDocenteAgenda(d) {
        const email=String(d?.email||'').trim().toLowerCase();if(email)return `email:${email}`;
        if(d?.uid)return `uid:${String(d.uid)}`;if(d?.id)return `id:${String(d.id)}`;
        return `nome:${window.Util.semAcento(d?.nome_completo||d?.nome||'Docente não informado').toLowerCase()}`;
    },
    _chaveTurmaAgenda(enc) { const t=enc?.turma||window.ControllerDashboard._turma(enc);return String(enc?.id_turma||t?.id||t?.referencia||enc?.turma_referencia||''); },
    _opcoesAgendaTecnica(encontros) {
        const docentes=new Map(),turmas=new Map(),C=window.ControllerDashboard;
        (encontros||[]).forEach(enc=>{
            (enc.docentes||[]).forEach(d=>{const key=this._chaveDocenteAgenda(d),label=String(d.nome_completo||d.nome||d.email||'Docente não informado').trim();if(!docentes.has(key))docentes.set(key,{key,label});});
            const t=enc.turma||C._turma(enc),key=this._chaveTurmaAgenda(enc);if(key&&!turmas.has(key))turmas.set(key,{key,label:[t.referencia||enc.turma_referencia||'Turma',t.oferta,t.area||t.curso_area].filter(Boolean).join(' · ')});
        });
        const ordenar=(a,b)=>a.label.localeCompare(b.label,'pt-BR',{sensitivity:'base'});
        return{docentes:[...docentes.values()].sort(ordenar),turmas:[...turmas.values()].sort(ordenar)};
    },
    _htmlListaFiltroAgenda(tipo,opcoes) {
        const e=this._esc,state=this.filtrosAgendaTecnica?.[tipo]??null;
        if(!opcoes.length)return '<p class="dash-agenda-filter-empty">Nenhuma opção nesta semana e área.</p>';
        return opcoes.map(o=>`<label class="dash-agenda-filter-option"><input type="checkbox" class="dash-agenda-item-${tipo}" value="${e(o.key)}" ${state===null||state.includes(o.key)?'checked':''}><span>${e(o.label)}</span></label>`).join('');
    },
    _renderizarControlesAgendaTecnica(encontros) {
        const opcoes=this._opcoesAgendaTecnica(encontros),docs=document.getElementById('dash-agenda-filtro-docentes-lista'),turmas=document.getElementById('dash-agenda-filtro-turmas-lista');
        if(docs)docs.innerHTML=this._htmlListaFiltroAgenda('docentes',opcoes.docentes);
        if(turmas)turmas.innerHTML=this._htmlListaFiltroAgenda('turmas',opcoes.turmas);
        const area=document.getElementById('dash-agenda-areas');if(area)area.value=this.modoAreas;
        this._atualizarResumoFiltrosAgendaTecnica();
    },
    _atualizarResumoFiltrosAgendaTecnica() {
        let alterado=this.modoAreas!==(['root','admin'].includes(window.usuarioAtual?.cargo)?'todas':'minhas');
        for(const tipo of ['docentes','turmas']){
            const prefix=`dash-agenda-filtro-${tipo}`,lista=document.getElementById(`${prefix}-lista`),master=document.getElementById(`${prefix}-todos`),resumo=document.getElementById(`${prefix}-resumo`);if(!lista)continue;
            const checks=[...lista.querySelectorAll(`.dash-agenda-item-${tipo}`)],n=checks.filter(x=>x.checked).length;
            if(master){master.checked=checks.length>0&&n===checks.length;master.indeterminate=n>0&&n<checks.length;master.disabled=!checks.length;}
            if(resumo)resumo.textContent=checks.length?(n===checks.length?`Todos (${checks.length})`:`${n}/${checks.length}`):'Nenhum';
            alterado ||= (this.filtrosAgendaTecnica?.[tipo]!=null && n!==checks.length);
        }
        const btn=document.getElementById('dash-agenda-filtros-abrir');if(btn){btn.innerHTML=alterado?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5Z"/><path d="m17 17 5 5m0-5-5 5"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5Z"/></svg>';btn.title=alterado?'Remover filtros personalizados':'Abrir filtros';btn.setAttribute('aria-label',btn.title);btn.classList.toggle('border-blue-300',alterado);btn.classList.toggle('bg-blue-50',alterado);btn.classList.toggle('text-blue-700',alterado);}
    },
    _filtrarAgendaTecnica(encontros) {
        const filtros=this.filtrosAgendaTecnica||{docentes:null,turmas:null};
        return (encontros||[]).filter(enc=>{
            if(filtros.docentes!==null&&!(enc.docentes||[]).some(d=>filtros.docentes.includes(this._chaveDocenteAgenda(d))))return false;
            if(filtros.turmas!==null&&!filtros.turmas.includes(this._chaveTurmaAgenda(enc)))return false;
            return true;
        });
    },
    async _renderizarAgendaTecnica(reconstruirFiltros=true) {
        const chave=`${this.semanaTecnica}|${this.modoAreas}`,data=!reconstruirFiltros&&this.agendaTecnicaCache?.chave===chave?this.agendaTecnicaCache.data:window.ControllerDashboard.listarAgendaDocentes(this.semanaTecnica,this.modoAreas),label=document.getElementById('dash-semana-tecnica-label'),box=document.getElementById('dash-agenda-semanal'),agendaBox=document.getElementById('dash-agenda-individuais'),sel=document.getElementById('dash-agenda-areas');this.agendaTecnicaCache={chave,data};
        if(label)label.textContent=window.ControllerDashboard.formatarSemana(data.inicio,data.fim);if(sel)sel.value=this.modoAreas;
        if(reconstruirFiltros)this._renderizarControlesAgendaTecnica(data.encontros);
        const abertas=new Set([...(agendaBox?.querySelectorAll('details[data-docente-agenda][open]')||[])].map(x=>x.dataset.docenteAgenda));
        const painel=document.querySelector('#dashboard-root main'),top=painel?.scrollTop,left=painel?.scrollLeft;
        try{
            const base=this._filtrarAgendaTecnica(data.encontros),itens=await this._agendaComPlanejamento(base,data.inicio,this.modoAreas);
            if(box)box.innerHTML=this._calendarioDocente(itens,data.inicio,{mostrarDocentes:true,mostrarCancelamentos:false});
            if(agendaBox){
                const C=window.ControllerDocente,docs=(C?.obterDocentes?.()||[]).filter(doc=>base.some(enc=>(enc.docentes||[]).some(p=>C.corresponde(p,doc))));
                const filtered=this.filtrosAgendaTecnica?.docentes;
                const selecionados=filtered===null||filtered===undefined?docs:docs.filter(d=>filtered.includes(this._chaveDocenteAgenda(d)));
                const cards=selecionados.map(doc=>{const id=this._chaveDocenteAgenda(doc),encontros=base.filter(enc=>(enc.docentes||[]).some(p=>C.corresponde(p,doc))),planos=itens.filter(enc=>enc.tipo==='planejamento_docente'&&(enc.docentes||[]).some(p=>C.corresponde(p,doc))),html=this._calendarioDocente([...encontros,...planos],data.inicio,{mostrarDocentes:false,mostrarCancelamentos:false}),nome=doc.nome_completo||doc.nome||doc.email||'Docente';return `<details ${abertas.has(id)?'open':''} data-docente-agenda="${this._esc(id)}" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-extrabold text-slate-800"><span>${this._esc(nome)}</span><span class="text-xs font-semibold text-slate-500">Agenda individual</span></summary><div class="docente-cal-scroll-livre border-t border-slate-200">${html}</div></details>`;}).join('');
                agendaBox.innerHTML=cards||'<p class="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Nenhum docente corresponde aos filtros selecionados.</p>';
            }
        }catch(err){const msg=`<p class="p-4 text-xs text-rose-700">${this._esc(err.message||'Não foi possível carregar o calendário.')}</p>`;if(box)box.innerHTML=msg;if(agendaBox)agendaBox.innerHTML=msg;}
        if(painel&&top!==undefined){painel.scrollTop=top;painel.scrollLeft=left;}
        if(!reconstruirFiltros)this._atualizarResumoFiltrosAgendaTecnica();
    },
    async _renderizarAlteracoesTecnicas() { return this._renderizarListaAlteracoesPendentes('dash-alteracoes-pendentes'); },
    async _renderizarMeusDados() {
        const u=window.usuarioAtual||{};try{await window.ControllerApoioPerfil.recarregarMeuUsuario();}catch(err){console.warn('[Dashboard] Dados do usuário não atualizados:',err);}
        const atual=window.usuarioAtual||{},e=this._esc,linha=(n,v)=>`<div><dt class="text-[11px] font-bold uppercase text-slate-400">${n}</dt><dd class="font-semibold text-slate-800">${e(v||'—')}</dd></div>`;
        const box=document.getElementById('dash-dados-resumo');if(box)box.innerHTML=linha('Nome',atual.nome_completo||`${atual.nome||''} ${atual.sobrenome||''}`.trim())+linha('E-mail',atual.email)+linha('Perfil',window.ViewsDashboard._cargos()[atual.cargo]||atual.cargo)+linha('Autenticação',window.ControllerApoioPerfil.contaComSenha()?'E-mail e senha':'Google');
        const areas=document.getElementById('dash-dados-areas');if(areas){const lista=(atual.areas||[]).map(a=>typeof a==='object'&&a?(a.area||a.nome_area||a.nome||''):a).filter(Boolean);areas.innerHTML=lista.length?lista.map(a=>`<span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">${e(a)}</span>`).join(''):'<span class="text-sm text-slate-400">Nenhuma área vinculada.</span>';}
        // u referencia a identidade previamente autenticada; nenhum dado privilegiado é exposto pelo formulário.
    },
    _abrirModalDados() {
        const u=window.usuarioAtual||{},C=window.ControllerApoioPerfil,put=(id,val)=>{const x=document.getElementById(id);if(x)x.value=val??'';};
        put('dash-dados-nome',u.nome);put('dash-dados-sobrenome',u.sobrenome);put('dash-dados-email',u.email);
        ['dash-dados-senha-atual','dash-dados-senha-nova','dash-dados-senha-confirma'].forEach(id=>put(id,''));
        const comSenha=C.contaComSenha(),email=document.getElementById('dash-dados-email');if(email)email.disabled=!comSenha;
        document.getElementById('dash-dados-senha-bloco')?.classList.toggle('hidden',!comSenha);document.getElementById('dash-dados-email-ajuda')?.classList.toggle('hidden',!comSenha);document.getElementById('dash-dados-google-aviso')?.classList.toggle('hidden',comSenha);
        const m=document.getElementById('dash-modal-dados');m?.classList.remove('hidden');m?.classList.add('flex');
    },
    _fecharModal(id) { const m=document.getElementById(id);m?.classList.add('hidden');m?.classList.remove('flex'); },
    async _abrirModalSolicitacao() { ['dash-sol-area','dash-sol-assunto','dash-sol-mensagem'].forEach(id=>{const x=document.getElementById(id);if(x)x.value='';});const tipo=document.getElementById('dash-sol-tipo');if(tipo)tipo.value='geral';document.getElementById('dash-sol-area-wrap')?.classList.add('hidden');const m=document.getElementById('dash-modal-solicitacao');m?.classList.remove('hidden');m?.classList.add('flex');await this._renderizarDestinatariosSolicitacao(); },
    async _atualizarBadgeSolicitacoes() {
        const badge=document.getElementById('dash-sol-pendentes-badge');if(!badge)return;
        const total=await window.ControllerDashboardSolicitacoes.contarPendentes();
        badge.textContent=String(total);badge.classList.toggle('hidden',total<1);badge.title=`${total} solicitação(ões) pendente(s)`;badge.setAttribute('aria-label',`${total} solicitações pendentes`);
    },
    async _carregarSolicitacoes() {
        const box=document.getElementById('dash-solicitacoes-lista');if(!box)return;
        const args={direcao:document.getElementById('dash-sol-direcao')?.value||'recebidas',status:document.getElementById('dash-sol-status')?.value||'Pendente',de:document.getElementById('dash-sol-de')?.value||'',ate:document.getElementById('dash-sol-ate')?.value||''};
        box.innerHTML='<p class="p-4 text-center text-xs text-slate-500">Carregando solicitações…</p>';
        try{
            this.solicitacoesCache=await window.ControllerDashboardSolicitacoes.listar(args);
            const recebidas=args.direcao==='recebidas';box.innerHTML=this.solicitacoesCache.length?this.solicitacoesCache.map(s=>window.ViewsDashboard.cartaoSolicitacao(s,{recebida:recebidas})).join(''):'<p class="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Nenhuma solicitação para estes filtros.</p>';
            const resumo=document.getElementById('dash-solicitacoes-resumo');if(resumo)resumo.textContent=`${this.solicitacoesCache.length} solicitação(ões) ${recebidas?'recebida(s)':'enviada(s)'}.`;
        }catch(err){box.innerHTML=`<p class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">${this._esc(err.message||'Falha ao carregar solicitações.')}</p>`;}
    },
    async tratarCliques(e) {
        if(window.AppApoio?._tratarCliquesMapaSalas && await window.AppApoio._tratarCliquesMapaSalas(e))return true;
        const t=e.target;
        if(t.closest('#dash-semana-docente-hoje')||t.closest('#dash-docente-cal-hoje')){this.semanaDocente=0;this._renderizarSemanaDocente();return true;}
        if(t.closest('#dash-semana-docente-anterior')){this.semanaDocente--;this._renderizarSemanaDocente();return true;}
        if(t.closest('#dash-semana-docente-proxima')){this.semanaDocente++;this._renderizarSemanaDocente();return true;}
        if(t.closest('#dash-docente-cal-atualizar')){if(window.ControllerDocente){await window.ControllerDocente.carregarBase(true);window.ControllerDocente.atividadesChave='';}await this._renderizarSemanaDocente();return true;}
        if(t.closest('#dash-agenda-atualizar')){this.agendaTecnicaCache=null;await this._renderizarAgendaTecnica(true);return true;}
        if(t.closest('#dash-agenda-imprimir')||t.closest('#dash-docente-cal-imprimir')){document.body.classList.add('print-week-calendar');window.addEventListener('afterprint',()=>document.body.classList.remove('print-week-calendar'),{once:true});window.print();return true;}
        if(t.closest('#dash-agenda-filtros-abrir')){document.getElementById('dash-agenda-filtros-modal')?.classList.remove('hidden');document.getElementById('dash-agenda-filtros-modal')?.classList.add('flex');return true;}
        if(t.closest('.dash-agenda-filtros-fechar')||t.id==='dash-agenda-filtros-modal'){document.getElementById('dash-agenda-filtros-modal')?.classList.add('hidden');document.getElementById('dash-agenda-filtros-modal')?.classList.remove('flex');return true;}
        if(t.closest('#dash-agenda-filtros-limpar')){this.modoAreas=['root','admin'].includes(window.usuarioAtual?.cargo)?'todas':'minhas';this.filtrosAgendaTecnica={docentes:null,turmas:null};this.agendaTecnicaCache=null;this._renderizarAgendaTecnica(true);return true;}
        if(t.closest('#dash-agenda-filtros-imprimir')){document.body.classList.add('print-week-calendar');window.addEventListener('afterprint',()=>document.body.classList.remove('print-week-calendar'),{once:true});window.print();return true;}
        if(t.closest('#dash-semana-tecnica-hoje')){this.semanaTecnica=0;this._renderizarAgendaTecnica();return true;}
        if(t.closest('#dash-semana-tecnica-anterior')){this.semanaTecnica--;this._renderizarAgendaTecnica();return true;}
        if(t.closest('#dash-semana-tecnica-proxima')){this.semanaTecnica++;this._renderizarAgendaTecnica();return true;}
        if(t.closest('#dash-btn-editar-dados')){this._abrirModalDados();return true;}
        if(t.closest('.dash-fechar-modal-dados')||t.id==='dash-modal-dados'){this._fecharModal('dash-modal-dados');return true;}
        if(t.closest('#dash-btn-nova-solicitacao')){this._abrirModalSolicitacao();return true;}
        if(t.closest('.dash-fechar-modal-solicitacao')||t.id==='dash-modal-solicitacao'){this._fecharModal('dash-modal-solicitacao');return true;}
        if(t.closest('.dash-fechar-modal-processar')||t.id==='dash-modal-processar-solicitacao'){this._fecharModal('dash-modal-processar-solicitacao');return true;}
        if(t.closest('#docente-btn-filtros')){const A=window.AppDocente;if(A._filtrosAtivos('docente-tab-calendario'))A.filtrosPorAba['docente-tab-calendario']=A._defaultsFiltro('docente-tab-calendario');this._renderizarFiltrosCalendarioDocente();await this._renderizarSemanaDocente();this._renderizarFiltrosCalendarioDocente();const m=document.getElementById('docente-modal-filtros');m?.classList.remove('hidden');m?.classList.add('flex');return true;}
        if(t.closest('.docente-modal-fechar')&&t.dataset.modal==='docente-modal-filtros'){this._fecharModal('docente-modal-filtros');return true;}
        if(t.closest('#docente-filtros-limpar')){const A=window.AppDocente;A.filtrosPorAba['docente-tab-calendario']=A._defaultsFiltro('docente-tab-calendario');this._renderizarFiltrosCalendarioDocente();await this._renderizarSemanaDocente();return true;}
        if(t.dataset.filtroTodos){const A=window.AppDocente,tipo=t.dataset.filtroTodos,marcar=t.dataset.acao==='marcar';document.querySelectorAll(`#docente-filtros-conteudo [data-filtro="${tipo}"]`).forEach(x=>{x.checked=marcar;});const f=A._filtroAba('docente-tab-calendario');f[tipo]=[...document.querySelectorAll(`#docente-filtros-conteudo [data-filtro="${tipo}"]:checked`)].map(x=>tipo==='dias'?Number(x.value):x.value);if(tipo==='busca')f.busca='';A._atualizarBotaoFiltro();await this._renderizarSemanaDocente();this._renderizarFiltrosCalendarioDocente();return true;}
        if(t.closest('#dash-btn-atualizar')){this.alteracoesCache=null;this.alteracoesLimite=60;await this._renderizarListaAlteracoesPendentes(this._idListaAlteracoesAtual());return true;}
        if(t.closest('#dash-btn-mais-alteracoes')){this.alteracoesLimite+=60;await this._renderizarListaAlteracoesPendentes(this._idListaAlteracoesAtual());return true;}
        if(t.closest('.dash-sol-processar')){const id=t.closest('.dash-sol-processar').dataset.id,item=this.solicitacoesCache.find(x=>x.id===id);this._abrirModalProcessar(item);return true;}
        if(t.closest('.dash-sol-reabrir')){const id=t.closest('.dash-sol-reabrir').dataset.id,ok=await window.Dialog.confirmar('Voltar esta solicitação para pendente?',{titulo:'Reabrir solicitação',textoConfirmar:'Voltar a pendente'});if(!ok)return true;try{const meta=await window.ControllerDashboardSolicitacoes.processar(id,'Pendente');const item=this.solicitacoesCache.find(x=>x.id===id);if(item)Object.assign(item,meta);await this._carregarSolicitacoes();await this._atualizarBadgeSolicitacoes();await window.Util.toast('Solicitação voltou para pendente.',{tipo:'sucesso'});}catch(err){await window.Dialog.erro(err,'Não foi possível atualizar a solicitação');}return true;}
        const tab=t.closest('.tab-btn[data-target]')?.dataset.target;
        if(tab==='tab-dashboard-dados')this._renderizarMeusDados();
        if(tab==='tab-dashboard-solicitacoes'){this._carregarSolicitacoes();this._atualizarBadgeSolicitacoes().catch(err=>console.warn('[Dashboard] Contagem pendente indisponível:',err));}
        if(tab==='tab-dashboard-agenda'){if(window.usuarioAtual?.cargo==='docente')this._renderizarSemanaDocente();else this._renderizarAgendaTecnica();}
        if(tab==='tab-dashboard-admin')window.AppAdminCredenciamento?.iniciarView();
        if(tab==='tab-dashboard-alteracoes'){if(window.usuarioAtual?.cargo==='apoio')this._renderizarApoio();else this._renderizarAlteracoesTecnicas();}
        return false;
    },
    async tratarMudancas(e) {
        if(e.target?.classList?.contains('apoio-flag')){await this._alternarFlagDashboard(e.target);return true;}
        if(e.target?.matches?.('[data-filtro]')&&e.target.closest('#docente-filtros-conteudo')){const A=window.AppDocente,f=A._filtroAba('docente-tab-calendario'),tipo=e.target.dataset.filtro;if(tipo==='busca')f.busca=e.target.value;else if(tipo==='anoAquisitivo')f.anoAquisitivo=e.target.value;else f[tipo]=[...document.querySelectorAll(`#docente-filtros-conteudo [data-filtro="${tipo}"]:checked`)].map(x=>tipo==='dias'?Number(x.value):x.value);A._atualizarBotaoFiltro();await this._renderizarSemanaDocente();return true;}
        if(e.target?.matches?.('.dash-sol-destino-grupo,.dash-sol-destino-usuario')){const grupo=e.target.dataset.grupo;if(e.target.classList.contains('dash-sol-destino-grupo')&&e.target.checked)document.querySelectorAll(`.dash-sol-destino-usuario[data-grupo="${grupo}"]`).forEach(x=>x.checked=false);else if(e.target.classList.contains('dash-sol-destino-usuario')&&e.target.checked){const all=document.querySelector(`.dash-sol-destino-grupo[data-grupo="${grupo}"]`);if(all)all.checked=false;}return true;}
        const id=e.target?.id;
        if(id==='dash-apoio-areas'){this.modoAreas=e.target.value;await this._renderizarApoio();return true;}
        if(id==='dash-agenda-areas'){this.modoAreas=e.target.value;this.filtrosAgendaTecnica={docentes:null,turmas:null};this.agendaTecnicaCache=null;this._renderizarAgendaTecnica(true);return true;}
        if(id==='dash-agenda-filtro-docentes-todos'||id==='dash-agenda-filtro-turmas-todos'){
            const tipo=id.includes('docentes')?'docentes':'turmas',checks=[...document.querySelectorAll(`.dash-agenda-item-${tipo}`)];this.filtrosAgendaTecnica[tipo]=e.target.checked?null:[];checks.forEach(x=>x.checked=e.target.checked);this._renderizarAgendaTecnica(false);return true;
        }
        if(e.target.matches('.dash-agenda-item-docentes,.dash-agenda-item-turmas')){
            const tipo=e.target.classList.contains('dash-agenda-item-docentes')?'docentes':'turmas',checks=[...document.querySelectorAll(`.dash-agenda-item-${tipo}`)],selecionados=checks.filter(x=>x.checked).map(x=>x.value);this.filtrosAgendaTecnica[tipo]=selecionados.length===checks.length?null:selecionados;this._renderizarAgendaTecnica(false);return true;
        }
        if(id==='dash-agenda-filtro-docentes-busca'||id==='dash-agenda-filtro-turmas-busca'){
            const tipo=id.includes('docentes')?'docentes':'turmas',q=window.Util.semAcento(e.target.value).toLowerCase();document.querySelectorAll(`#dash-agenda-filtro-${tipo}-lista .dash-agenda-filter-option`).forEach(x=>{x.hidden=!window.Util.semAcento(x.textContent).toLowerCase().includes(q);});return true;
        }
        if(id==='dash-alteracoes-areas'){this.modoAreas=e.target.value;await this._renderizarAlteracoesTecnicas();return true;}
        if(id==='dash-sol-tipo'){document.getElementById('dash-sol-area-wrap')?.classList.toggle('hidden',e.target.value!=='area');return true;}
        if(['dash-sol-direcao','dash-sol-status','dash-sol-de','dash-sol-ate'].includes(id)){await this._carregarSolicitacoes();return true;}
        return false;
    },
    async tratarSubmits(e) {
        if(e.target.id==='dash-form-solicitacao'){
            e.preventDefault();const form=e.target,btn=form.querySelector('button[type=submit]');if(btn.disabled)return true;btn.disabled=true;
            try{
                const perfilPorGrupo={tecnico:['tecnico'],docente:['docente'],apoio:['apoio'],admin:['admin','root']};
                const grupos=[...form.querySelectorAll('.dash-sol-destino-grupo:checked')].flatMap(x=>perfilPorGrupo[x.value]||[]);
                const usuarios=[...form.querySelectorAll('.dash-sol-destino-usuario:checked')].map(x=>({uid:x.value,perfil:x.dataset.perfil}));
                const solicitud=await window.ControllerDashboardSolicitacoes.criar({perfisDestino:grupos,destinatariosEspecificos:usuarios,tipo:document.getElementById('dash-sol-tipo').value,area:document.getElementById('dash-sol-area').value,assunto:document.getElementById('dash-sol-assunto').value,mensagem:document.getElementById('dash-sol-mensagem').value});
                this._fecharModal('dash-modal-solicitacao');await window.Dialog.sucesso('Solicitação enviada aos destinatários selecionados.');
                if((document.getElementById('dash-sol-direcao')?.value||'recebidas')==='enviadas')await this._carregarSolicitacoes();
                return !!solicitud;
            }catch(err){await window.Dialog.erro(err,'Não foi possível enviar a solicitação');return true;}finally{btn.disabled=false;}
        }
        if(e.target.id==='dash-form-processar-solicitacao'){
            e.preventDefault();const form=e.target,btn=form.querySelector('button[type=submit]');if(btn.disabled)return true;btn.disabled=true;
            try{const id=document.getElementById('dash-processar-id').value,resposta=document.getElementById('dash-processar-resposta').value;await window.ControllerDashboardSolicitacoes.processar(id,'Processada',resposta);this._fecharModal('dash-modal-processar-solicitacao');await this._carregarSolicitacoes();await this._atualizarBadgeSolicitacoes();await window.Util.toast('Solicitação processada e resposta registrada.',{tipo:'sucesso'});}
            catch(err){await window.Dialog.erro(err,'Não foi possível processar a solicitação');}finally{btn.disabled=false;}return true;
        }
        if(e.target.id==='dash-form-dados'){
            e.preventDefault();const form=e.target,btn=form.querySelector('button[type=submit]');if(btn.disabled)return true;btn.disabled=true;
            try{
                const C=window.ControllerApoioPerfil,u=window.usuarioAtual||{},nome=document.getElementById('dash-dados-nome').value.trim(),sobrenome=document.getElementById('dash-dados-sobrenome').value.trim(),senhaAtual=document.getElementById('dash-dados-senha-atual').value;
                if(!nome||!sobrenome)throw new Error('Informe nome e sobrenome.');
                const comSenha=C.contaComSenha(),novoEmail=comSenha?document.getElementById('dash-dados-email').value.trim().toLowerCase():'',querEmail=!!novoEmail&&novoEmail!==String(u.email||'').toLowerCase(),nova=document.getElementById('dash-dados-senha-nova').value,conf=document.getElementById('dash-dados-senha-confirma').value,querSenha=!!nova||!!conf,mudouNome=nome!==(u.nome||'')||sobrenome!==(u.sobrenome||'');
                if((querEmail||querSenha)&&!senhaAtual)throw new Error('Informe a senha atual para confirmar a alteração de acesso.');
                if(querEmail&&!/^\S+@\S+\.\S+$/.test(novoEmail))throw new Error('Informe um e-mail válido.');
                if(querSenha&&nova.length<6)throw new Error('A nova senha deve possuir no mínimo 6 caracteres.');
                if(querSenha&&nova!==conf)throw new Error('A confirmação não confere com a nova senha.');
                if(querEmail)await C.alterarEmail(novoEmail,senhaAtual);
                if(querSenha)await C.alterarSenha(senhaAtual,nova,conf);
                if(mudouNome)await C.atualizarNome(nome,sobrenome);
                await this._renderizarMeusDados();this._fecharModal('dash-modal-dados');
                const msgs=[mudouNome?'Nome atualizado.':'',querSenha?'Senha alterada.':'',querEmail?`Enviamos um link de confirmação para ${novoEmail}; o e-mail muda após a confirmação.`:''].filter(Boolean);
                await window.Dialog.sucesso(msgs.join(' ')||'Nenhuma alteração para salvar.');
            }catch(err){await window.Dialog.erro(err,'Não foi possível salvar seus dados');}finally{btn.disabled=false;}
            return true;
        }
        return false;
    },
    atualizarSuave() {
        if(window.location.hash!=='#/dashboard')return;
        const mapa=document.getElementById('tab-dashboard-mapa-salas');
        if(mapa&&!mapa.classList.contains('hidden')){window.AppApoio?._renderizarMapaSalas(true);return;}
        const cargo=window.usuarioAtual?.cargo;
        if(cargo==='docente'){
            if(document.getElementById('dash-semana-docente'))this._renderizarSemanaDocente();
        }else if(['root','admin'].includes(cargo)){
            const agenda=document.getElementById('tab-dashboard-agenda');if(agenda&&!agenda.classList.contains('hidden'))this._renderizarAgendaTecnica();
        }else if(cargo==='tecnico'&&document.getElementById('dash-agenda-semanal'))this._renderizarAgendaTecnica();
    }
};
