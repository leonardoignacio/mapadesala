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
        for(let d=0;d<7;d++){
            const data=window.ControllerDashboard._addDays(inicio,d),dia=window.Util.diaSemana(data),lista=encontros.filter(e=>e.data===data);
            html.push(`<section class="rounded-xl border border-slate-200 bg-slate-50 p-3"><div class="mb-2 flex items-center justify-between"><h3 class="text-xs font-extrabold text-slate-700">${dia}</h3><span class="text-[10px] text-slate-500">${window.Util.dataBR(data)}</span></div>${lista.length?`<div class="space-y-2">${lista.map(e=>V.cartaoEncontro(e)).join('')}</div>`:'<p class="text-[11px] text-slate-400">Sem encontros.</p>'}</section>`);
        }
        return `<div class="grid grid-cols-1 gap-2 xl:grid-cols-2">${html.join('')}</div>`;
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
    _renderizarSemanaDocente() {
        const data=window.ControllerDashboard.listarSemanaDocente(this.semanaDocente),label=document.getElementById('dash-semana-docente-label'),box=document.getElementById('dash-semana-docente');
        if(label)label.textContent=window.ControllerDashboard.formatarSemana(data.inicio,data.fim);
        if(box)box.innerHTML=this._agruparSemana(data.encontros,data.inicio);
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
            const hoje=document.getElementById('dash-docente-hoje');if(hoje)hoje.innerHTML=this._faixaPeriodo(window.ControllerDashboard.listarEncontrosHojeDocente());
            if(document.getElementById('dash-semana-docente'))this._renderizarSemanaDocente();
        }else if(['root','admin'].includes(cargo)){
            const hoje=window.ControllerDashboard._dataLocal(),encontros=window.ControllerDashboard.listarEncontros({inicio:hoje,fim:hoje}),el=document.getElementById('dash-admin-docentes');if(el)el.innerHTML=encontros.length?this._faixaPeriodo(encontros,5):'<p class="text-xs text-slate-500">Sem encontros hoje.</p>';
        }else if(cargo==='tecnico'&&document.getElementById('dash-agenda-semanal'))this._renderizarAgendaTecnica();
    }
};
