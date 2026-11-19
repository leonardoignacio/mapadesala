// ./dashboard/app_dashboard.js - Orquestração das abas e ações do Dashboard
window.AppDashboard = {
    semanaDocente:0,semanaTecnica:0,semanaAdmin:0,modoAreas:'minhas',alteracoesCache:null,solicitacoesCache:[],
    async iniciarView() {
        if(window.usuarioAtual?.cargo==='pendente')return;
        this.semanaDocente=0;this.semanaTecnica=0;this.semanaAdmin=0;this.modoAreas='minhas';this.alteracoesCache=null;
        await window.Store.garantirPronto();
        await this._renderizarPrincipal();
    },
    _esc(v) { return window.Util.esc(v); },
    _mostrarStatus(msg,erro=false) { return erro?window.Dialog.erro(msg):window.Util.toast(msg,{tipo:'sucesso'}); },
    _faixaPeriodo(encontros,alvo) {
        const V=window.ViewsDashboard;
        return ['Manhã','Tarde','Noite'].map(p=>{const lista=encontros.filter(e=>window.ControllerDashboard._periodo(e)===p);return lista.length?`<section class="mb-3"><h3 class="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">${p}</h3><div class="grid grid-cols-1 gap-2 lg:grid-cols-2">${lista.slice(0,alvo||100).map(e=>V.cartaoEncontro(e)).join('')}</div></section>`:'';}).join('')||'<p class="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">Nenhum encontro encontrado.</p>';
    },
    _agruparSemana(encontros,inicio) {
        const V=window.ViewsDashboard,html=[];
        for(let d=0;d<6;d++){
            const data=window.ControllerDashboard._addDays(inicio,d),dia=window.Util.diaSemana(data),lista=encontros.filter(e=>e.data===data);
            html.push(`<section class="rounded-xl border border-slate-200 bg-slate-50 p-3"><div class="mb-2 flex items-center justify-between"><h3 class="text-xs font-extrabold text-slate-700">${dia}</h3><span class="text-[10px] text-slate-500">${window.Util.dataBR(data)}</span></div>${lista.length?`<div class="space-y-2">${lista.map(e=>V.cartaoEncontro(e)).join('')}</div>`:'<p class="text-[11px] text-slate-400">Sem encontros.</p>'}</section>`);
        }
        return `<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">${html.join('')}</div>`;
    },
    async _carregarAlteracoes() {
        if(this.alteracoesCache)return this.alteracoesCache;
        const C=window.ControllerApoioAlteracoes,cargo=window.usuarioAtual?.cargo;
        let itens;
        if(cargo==='apoio'||cargo==='tecnico'){
            const col=window.db.collection(C.COLECAO),consulta=cargo==='tecnico'?col.where('status','==','Pendente').get():col.where('criado_em','>=',C.desdePadraoISO()).get();
            const snap=await consulta;itens=[];snap.forEach(d=>itens.push(...C._normalizarDoc(d)));
        }else itens=await C.carregar();
        // Apoio lê apenas a janela recente; Técnico lê apenas pendências; Admin precisa dos dois conjuntos.
        // O cartão Dashboard não precisa do número de encontro; evita o _posicao do módulo Apoio,
        // que varre os encontros novamente para cada alteração exibida.
        const turmas=new Map((window.Store.dados.turmas||[]).map(t=>[t.id,t])),encontros=new Map((window.Store.dados.encontros||[]).map(x=>[x.id,x]));
        for(const i of itens){
            const d=i.dados||{},turma=turmas.get(d.id_turma)||{};i.chave=window.Util.chaveEncontro(d);i.turmaRef=turma.referencia||i.snapshot?.turmaRef||'—';i.oferta=turma.oferta||i.snapshot?.oferta||'';i.area=turma.area||turma.curso_area||i.snapshot?.area||'';
            let SS=i.SSreg===true,SGO=i.SGOreg===true;
            if(i.acao==='Inserir'){const enc=encontros.get(d.id);if(enc&&window.Util.chaveEncontro(enc)===i.chave){SS=enc.SS===true;SGO=enc.SGO===true;}}
            i.SS=SS;i.SGO=SGO;i.situacao=SS&&SGO?'Realizada':'Pendente';
        }
        this.alteracoesCache=C.classificar(itens).ativos.sort((a,b)=>(b.criadoEm||'').localeCompare(a.criadoEm||''));
        return this.alteracoesCache;
    },
    _alteracoesPorArea(itens,modo) {
        if(modo==='todas')return itens;
        const areas=window.ControllerDashboard._areasUsuario();
        if(!areas.length)return itens;
        return itens.filter(i=>areas.some(a=>window.Util.semAcento(a)===window.Util.semAcento(i.area)));
    },
    async _renderizarPrincipal() {
        const cargo=window.usuarioAtual?.cargo;
        if(cargo==='docente'){
            const hoje=window.ControllerDashboard.listarEncontrosHojeDocente(),el=document.getElementById('dash-docente-hoje');if(el)el.innerHTML=this._faixaPeriodo(hoje);
            this._renderizarSemanaDocente();
        }else if(cargo==='apoio'){
            await this._renderizarApoio();
        }else if(['root','admin'].includes(cargo)){
            const hoje=window.ControllerDashboard._dataLocal(),encontros=window.ControllerDashboard.listarEncontros({inicio:hoje,fim:hoje});const el=document.getElementById('dash-admin-docentes');if(el)el.innerHTML=encontros.length?this._faixaPeriodo(encontros,5):'<p class="text-xs text-slate-500">Sem encontros hoje.</p>';
            const semana=window.ControllerDashboard.listarAgendaDocentes(this.semanaAdmin,'todas'),semLabel=document.getElementById('dash-admin-semana-label'),semBox=document.getElementById('dash-admin-agenda-semanal');if(semLabel)semLabel.textContent=window.ControllerDashboard.formatarSemana(semana.inicio,semana.fim);if(semBox)semBox.innerHTML=this._agruparSemana(semana.encontros,semana.inicio);
            const itens=await this._carregarAlteracoes(),ap=this._alteracoesPorArea(itens,'todas');const apoio=document.getElementById('dash-admin-apoio');if(apoio)apoio.innerHTML=window.ViewsDashboard.blocoAlteracoes(ap.slice(0,4));
            const pend=ap.filter(i=>i.situacao==='Pendente'),porArea=new Map();pend.forEach(i=>{const area=i.area||'Sem área';porArea.set(area,(porArea.get(area)||0)+1);});const tec=document.getElementById('dash-admin-tecnico');if(tec)tec.innerHTML=porArea.size?[...porArea].sort((a,b)=>a[0].localeCompare(b[0],'pt-BR')).map(([a,n])=>`<div class="flex justify-between border-b border-slate-100 py-1.5 text-xs"><span>${this._esc(a)}</span><b>${n}</b></div>`).join(''):'<p class="text-xs text-slate-500">Nenhuma pendência.</p>';
        }else if(cargo==='tecnico'){
            const main=document.getElementById('tab-dashboard-principal');if(main&&!main.querySelector('[data-tecnico-principal]'))main.querySelector('section')?.setAttribute('data-tecnico-principal','true');
        }
    },
    async _renderizarApoio() {
        const itens=await this._carregarAlteracoes(),el=document.getElementById('dash-apoio-recentes');
        if(el)el.innerHTML=window.ViewsDashboard.blocoAlteracoes(this._alteracoesPorArea(itens,this.modoAreas).slice(0,8));
        const sel=document.getElementById('dash-apoio-areas');if(sel)sel.value=this.modoAreas;
    },
    _renderizarSemanaAdmin() {
        const data=window.ControllerDashboard.listarAgendaDocentes(this.semanaAdmin,'todas'),label=document.getElementById('dash-admin-semana-label'),box=document.getElementById('dash-admin-agenda-semanal');
        if(label)label.textContent=window.ControllerDashboard.formatarSemana(data.inicio,data.fim);if(box)box.innerHTML=this._agruparSemana(data.encontros,data.inicio);
    },
    _horaAgenda(valor) {
        const m=String(valor||'').match(/^(\d{1,2}):(\d{2})$/);
        return m?`${String(Number(m[1])).padStart(2,'0')}:${m[2]}`:'Horário não informado';
    },
    _paletaAgenda(enc) {
        const esp=window.AppEspelho;
        try { if(esp?._paletaUC)return esp._paletaUC(enc.id_uc,enc.turma,esp._paletaTurma?.(enc.id_uc)); } catch(_) {}
        const paletas=[
            {border:'#1d4ed8',soft:'#eff6ff',text:'#1e3a8a'},
            {border:'#0f766e',soft:'#f0fdfa',text:'#134e4a'},
            {border:'#7c3aed',soft:'#f5f3ff',text:'#4c1d95'},
            {border:'#047857',soft:'#ecfdf5',text:'#064e3b'},
            {border:'#0369a1',soft:'#f0f9ff',text:'#0c4a6e'},
            {border:'#4f46e5',soft:'#eef2ff',text:'#312e81'},
            {border:'#334155',soft:'#f1f5f9',text:'#1e293b'},
            {border:'#0891b2',soft:'#ecfeff',text:'#164e63'}
        ];
        const id=String(enc.id_uc||enc.uc_referencia||enc.id||'');let hash=0;for(let i=0;i<id.length;i++)hash=(hash*31+id.charCodeAt(i))>>>0;return paletas[hash%paletas.length];
    },
    _calendarioDocente(encontros,inicio) {
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
        (window.Store.dados.encontros||[]).filter(enc=>avisosDia.has(enc.data)&&window.Util.semAcento(enc.tipo)==='cancelamento'&&C._docenteCorresponde(enc)).forEach(enc=>{
            const turma=enc.turma||C._turma(enc),periodo=C._periodo(enc),uc=[enc.uc_referencia,enc.uc_titulo].filter(Boolean).join(' · '),horario=enc.h_inicio?`${enc.h_inicio}${enc.h_termino?`–${enc.h_termino}`:''}`:'',descricao=[turma.referencia||enc.turma_referencia,uc,horario,enc.descricao].filter(Boolean).join(' · ');
            adicionarAviso(enc.data,periodo,{rotulo:'Cancelamento de encontro',descricao});
        });
        const hoje=C._dataLocal(),nomes=['Seg','Ter','Qua','Qui','Sex','Sáb'],classeDia=data=>data===hoje?'dash-cal-dia-atual':'',classePeriodo=periodo=>`dash-cal-period-${window.Util.semAcento(periodo).toLowerCase()}`;
        const mesDia=data=>new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(Number(data.slice(0,4)),Number(data.slice(5,7))-1,Number(data.slice(8,10)),12)).replace('.','');
        const cabecalho=dias.map((data,i)=>`<div class="dash-cal-header ${classeDia(data)}"><span class="dash-cal-dia-nome">${nomes[i]}</span><span class="dash-cal-dia-numero">${Number(data.slice(8,10))}</span><span class="dash-cal-mes">${mesDia(data)}</span></div>`).join('');
        const avisoCard=(aviso,mobile=false)=>{const pal=paletaAviso(aviso),texto=[aviso.rotulo,aviso.descricao].filter(Boolean).join(' · ');return mobile?`<article class="dash-mobile-exception" style="--exception-bg:${pal.bg};--exception-border:${pal.border};--exception-text:${pal.text}" title="${e(texto)}"><b>${e(aviso.rotulo)}</b>${aviso.descricao?`<span>${e(aviso.descricao)}</span>`:''}</article>`:`<div class="dash-cal-exception-card" style="--exception-bg:${pal.bg};--exception-border:${pal.border};--exception-text:${pal.text}" title="${e(texto)}"><b>${e(aviso.rotulo)}</b>${aviso.descricao?`<span> · ${e(aviso.descricao)}</span>`:''}</div>`;};
        const cartao=(enc,modoMobile=false)=>{
            const turma=enc.turma||{},pal=this._paletaAgenda(enc),ref=e(enc.uc_referencia||'UC'),titulo=e(enc.uc_titulo||''),turmaRef=e(turma.referencia||'Turma'),oferta=e(turma.oferta||''),sala=e(enc.sala_referencia||''),inicioHora=this._horaAgenda(enc.h_inicio),fimHora=enc.h_termino?this._horaAgenda(enc.h_termino):'';
            const tituloCompleto=`${ref}${titulo?` · ${titulo}`:''} · ${turmaRef}${oferta?` · ${oferta}`:''}`,hora=`${inicioHora}${fimHora?`–${fimHora}`:''}`,metadados=`${turmaRef}${oferta?` · ${oferta}`:''}${sala?` · Sala ${sala}`:''}`;
            if(modoMobile)return `<article class="dash-mobile-event" style="--event-bg:${pal.soft};--event-border:${pal.border};--event-text:${pal.text}"><span class="dash-mobile-event-time">${e(hora)}</span><div class="min-w-0"><p class="dash-mobile-event-uc">${ref}${titulo?` · ${titulo}`:''}</p><p class="dash-mobile-event-meta">${e(metadados)}</p></div></article>`;
            return `<article class="dash-cal-event" title="${e(tituloCompleto)}" style="--event-bg:${pal.soft};--event-border:${pal.border};--event-text:${pal.text}"><span class="dash-cal-event-time">${e(hora)}</span><span class="dash-cal-event-uc">${ref}${titulo?` · ${titulo}`:''}</span><span class="dash-cal-event-meta">${e(metadados)}</span></article>`;
        };
        const linhaAvisos=dias.map((data,di)=>`<div class="dash-cal-exception-cell ${classeDia(data)}" style="grid-column:${di+2};grid-row:2">${avisosDia.get(data).map(a=>avisoCard(a)).join('')}</div>`).join('');
        const desktopRows=periodos.map((periodo,pi)=>{
            const linha=pi+3,classe=classePeriodo(periodo),rotulo=`<div class="dash-cal-period-label ${classe}" style="grid-column:1;grid-row:${linha}">${periodo.toUpperCase()}</div>`;
            const celulas=dias.map((data,di)=>{const eventos=porDia.get(data).get(periodo).slice().sort((a,b)=>(a.h_inicio||'').localeCompare(b.h_inicio||'')),avisos=avisosPeriodo.get(data).get(periodo);return `<div class="dash-cal-period-cell ${classe} ${classeDia(data)} ${pi===periodos.length-1?'dash-cal-final':''}" style="grid-column:${di+2};grid-row:${linha}">${avisos.map(a=>avisoCard(a)).join('')}${eventos.map(enc=>cartao(enc)).join('')}</div>`;}).join('');
            return rotulo+celulas;
        }).join('');
        const desktop=`<div class="dash-cal-desktop"><div class="dash-cal-scroll"><div class="dash-cal-grid"><div class="dash-cal-corner">Período</div>${cabecalho}<div class="dash-cal-period-label dash-cal-exception-label" style="grid-column:1;grid-row:2">AVISOS</div>${linhaAvisos}${desktopRows}</div></div></div>`;
        const aberto=dias.includes(hoje)?hoje:dias[0];
        const mobile=`<div class="dash-cal-mobile">${dias.map((data,i)=>{const atual=porDia.get(data),avisosDiaLista=avisosDia.get(data),avisosPeriodos=periodos.flatMap(periodo=>avisosPeriodo.get(data).get(periodo)),total=periodos.reduce((s,p)=>s+atual.get(p).length,0)+avisosDiaLista.length+avisosPeriodos.length,todosAvisos=[...avisosDiaLista,...avisosPeriodos],badgePal=todosAvisos.length?paletaAviso(todosAvisos[0]):null,badgeAviso=todosAvisos.length?`<span class="dash-mobile-day-alert" style="--exception-bg:${badgePal.bg};--exception-border:${badgePal.border};--exception-text:${badgePal.text}" title="${e(todosAvisos.map(a=>a.rotulo).join(', '))}">${e(todosAvisos.length>1?`${todosAvisos.length} avisos`:todosAvisos[0].rotulo)}</span>`:'',avisosMobile=avisosDiaLista.map(a=>avisoCard(a,true)).join(''),grupos=periodos.map(periodo=>{const eventos=atual.get(periodo),avisos=avisosPeriodo.get(data).get(periodo);if(!eventos.length&&!avisos.length)return'';return `<section class="dash-mobile-period ${classePeriodo(periodo)}"><h4 class="dash-mobile-period-label">${periodo.toUpperCase()}</h4><div class="dash-mobile-period-events">${avisos.map(a=>avisoCard(a,true)).join('')}${eventos.slice().sort((a,b)=>(a.h_inicio||'').localeCompare(b.h_inicio||'')).map(enc=>cartao(enc,true)).join('')}</div></section>`;}).join(''),conteudo=avisosMobile+grupos||'<p class="dash-mobile-empty">Sem encontros ou avisos neste dia.</p>';return `<details class="dash-mobile-day ${data===hoje?'dash-mobile-today':''}" ${data===aberto?'open':''}><summary><span><b>${nomes[i]}</b><span>${Number(data.slice(8,10))} ${mesDia(data)}</span></span>${badgeAviso}<span class="dash-mobile-count">${total}</span></summary><div class="dash-mobile-day-content">${conteudo}</div></details>`;}).join('')}</div>`;
        return desktop+mobile;
    },
    _renderizarSemanaDocente() {
        const data=window.ControllerDashboard.listarSemanaDocente(this.semanaDocente),label=document.getElementById('dash-semana-docente-label'),box=document.getElementById('dash-semana-docente');
        if(label)label.textContent=window.ControllerDashboard.formatarSemana(data.inicio,data.fim);
        if(box)box.innerHTML=this._calendarioDocente(data.encontros,data.inicio);
    },
    _renderizarAgendaTecnica() {
        const hoje=window.ControllerDashboard._dataLocal(),areas=this.modoAreas==='todas'?null:window.ControllerDashboard._areasUsuario(),hojeBox=document.getElementById('dash-agenda-hoje');if(hojeBox)hojeBox.innerHTML=this._faixaPeriodo(window.ControllerDashboard.listarEncontros({inicio:hoje,fim:hoje,areas}));
        const data=window.ControllerDashboard.listarAgendaDocentes(this.semanaTecnica,this.modoAreas),label=document.getElementById('dash-semana-tecnica-label'),box=document.getElementById('dash-agenda-semanal');
        if(label)label.textContent=window.ControllerDashboard.formatarSemana(data.inicio,data.fim);
        if(box)box.innerHTML=this._agruparSemana(data.encontros,data.inicio);
        const sel=document.getElementById('dash-agenda-areas');if(sel)sel.value=this.modoAreas;
    },
    async _renderizarAlteracoesTecnicas() {
        const box=document.getElementById('dash-alteracoes-pendentes');if(!box)return;
        try{
            const itens=await this._carregarAlteracoes(),pend=this._alteracoesPorArea(itens.filter(i=>i.situacao==='Pendente'),this.modoAreas),grupos=window.ControllerDashboard.agruparAlteracoesTurma(pend);
            box.innerHTML=grupos.length?grupos.map(([turma,lista])=>`<section class="rounded-xl border border-slate-200 bg-slate-50 p-3"><div class="mb-2 flex items-center justify-between"><h3 class="text-sm font-extrabold text-slate-800">${this._esc(turma)}</h3><span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">${lista.length} pendente(s)</span></div>${window.ViewsDashboard.blocoAlteracoes(lista)}</section>`).join(''):'<p class="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Nenhuma alteração pendente nas áreas selecionadas.</p>';
            const sel=document.getElementById('dash-alteracoes-areas');if(sel)sel.value=this.modoAreas;
        }catch(err){box.innerHTML=`<p class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">${this._esc(err.message||'Não foi possível carregar as alterações.')}</p>`;}
    },
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
    _abrirModalSolicitacao() { ['dash-sol-area','dash-sol-assunto','dash-sol-mensagem'].forEach(id=>{const x=document.getElementById(id);if(x)x.value='';});document.querySelectorAll('.dash-sol-destino').forEach(x=>x.checked=false);const tipo=document.getElementById('dash-sol-tipo');if(tipo)tipo.value='geral';document.getElementById('dash-sol-area-wrap')?.classList.add('hidden');const m=document.getElementById('dash-modal-solicitacao');m?.classList.remove('hidden');m?.classList.add('flex'); },
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
        const t=e.target;
        if(t.closest('#dash-semana-docente-hoje')){this.semanaDocente=0;this._renderizarSemanaDocente();return true;}
        if(t.closest('#dash-semana-docente-anterior')){this.semanaDocente--;this._renderizarSemanaDocente();return true;}
        if(t.closest('#dash-semana-docente-proxima')){this.semanaDocente++;this._renderizarSemanaDocente();return true;}
        if(t.closest('#dash-semana-tecnica-anterior')){this.semanaTecnica--;this._renderizarAgendaTecnica();return true;}
        if(t.closest('#dash-semana-tecnica-proxima')){this.semanaTecnica++;this._renderizarAgendaTecnica();return true;}
        if(t.closest('#dash-admin-semana-anterior')){this.semanaAdmin--;this._renderizarSemanaAdmin();return true;}
        if(t.closest('#dash-admin-semana-proxima')){this.semanaAdmin++;this._renderizarSemanaAdmin();return true;}
        if(t.closest('#dash-btn-editar-dados')){this._abrirModalDados();return true;}
        if(t.closest('.dash-fechar-modal-dados')||t.id==='dash-modal-dados'){this._fecharModal('dash-modal-dados');return true;}
        if(t.closest('#dash-btn-nova-solicitacao')){this._abrirModalSolicitacao();return true;}
        if(t.closest('.dash-fechar-modal-solicitacao')||t.id==='dash-modal-solicitacao'){this._fecharModal('dash-modal-solicitacao');return true;}
        if(t.closest('#dash-btn-atualizar')){this.alteracoesCache=null;await this._renderizarPrincipal();await this._renderizarAlteracoesTecnicas();return true;}
        if(t.closest('.dash-sol-processar')||t.closest('.dash-sol-reabrir')){
            const btn=t.closest('.dash-sol-processar,.dash-sol-reabrir'),id=btn.dataset.id,novo=btn.classList.contains('dash-sol-processar')?'Processada':'Pendente';
            const ok=await window.Dialog.confirmar(novo==='Processada'?'Confirmar que esta solicitação foi processada?':'Voltar esta solicitação para pendente?',{titulo:novo==='Processada'?'Confirmar processamento':'Reabrir solicitação',textoConfirmar:novo==='Processada'?'Processada':'Voltar a pendente'});if(!ok)return true;
            try{const meta=await window.ControllerDashboardSolicitacoes.processar(id,novo);const item=this.solicitacoesCache.find(x=>x.id===id);if(item)Object.assign(item,meta);await this._carregarSolicitacoes();await window.Util.toast(novo==='Processada'?'Solicitação marcada como processada.':'Solicitação voltou para pendente.',{tipo:'sucesso'});}catch(err){await window.Dialog.erro(err,'Não foi possível atualizar a solicitação');}return true;
        }
        const tab=t.closest('.tab-btn[data-target]')?.dataset.target;
        if(tab==='tab-dashboard-dados')this._renderizarMeusDados();
        if(tab==='tab-dashboard-solicitacoes')this._carregarSolicitacoes();
        if(tab==='tab-dashboard-agenda')this._renderizarAgendaTecnica();
        if(tab==='tab-dashboard-alteracoes')this._renderizarAlteracoesTecnicas();
        return false;
    },
    async tratarMudancas(e) {
        const id=e.target?.id;
        if(id==='dash-apoio-areas'){this.modoAreas=e.target.value;await this._renderizarApoio();return true;}
        if(id==='dash-agenda-areas'){this.modoAreas=e.target.value;this._renderizarAgendaTecnica();return true;}
        if(id==='dash-alteracoes-areas'){this.modoAreas=e.target.value;await this._renderizarAlteracoesTecnicas();return true;}
        if(id==='dash-sol-tipo'){document.getElementById('dash-sol-area-wrap')?.classList.toggle('hidden',e.target.value!=='area');return true;}
        if(['dash-sol-direcao','dash-sol-status','dash-sol-de','dash-sol-ate'].includes(id)){await this._carregarSolicitacoes();return true;}
        return false;
    },
    async tratarSubmits(e) {
        if(e.target.id==='dash-form-solicitacao'){
            e.preventDefault();const form=e.target,btn=form.querySelector('button[type=submit]');if(btn.disabled)return true;btn.disabled=true;
            try{
                const destinos=[...form.querySelectorAll('.dash-sol-destino:checked')].map(x=>x.value);
                const solicitud=await window.ControllerDashboardSolicitacoes.criar({perfisDestino:destinos,tipo:document.getElementById('dash-sol-tipo').value,area:document.getElementById('dash-sol-area').value,assunto:document.getElementById('dash-sol-assunto').value,mensagem:document.getElementById('dash-sol-mensagem').value});
                this._fecharModal('dash-modal-solicitacao');await window.Dialog.sucesso('Solicitação enviada aos perfis selecionados.');
                if((document.getElementById('dash-sol-direcao')?.value||'recebidas')==='enviadas')await this._carregarSolicitacoes();
                return !!solicitud;
            }catch(err){await window.Dialog.erro(err,'Não foi possível enviar a solicitação');return true;}finally{btn.disabled=false;}
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
        const cargo=window.usuarioAtual?.cargo;
        if(cargo==='docente'){
            if(document.getElementById('dash-semana-docente'))this._renderizarSemanaDocente();
        }else if(['root','admin'].includes(cargo)){
            const hoje=window.ControllerDashboard._dataLocal(),encontros=window.ControllerDashboard.listarEncontros({inicio:hoje,fim:hoje}),el=document.getElementById('dash-admin-docentes');if(el)el.innerHTML=encontros.length?this._faixaPeriodo(encontros,5):'<p class="text-xs text-slate-500">Sem encontros hoje.</p>';
        }else if(cargo==='tecnico'&&document.getElementById('dash-agenda-semanal'))this._renderizarAgendaTecnica();
    }
};
