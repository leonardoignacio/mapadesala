// ./docente/controller_docente.js - Consultas e regras de negócio da Área Docente
window.ControllerDocente = {
    COLECAO_ESCALAS: 'escalas_docentes',
    COLECAO_FERIAS: 'ferias_docentes',
    COLECAO_ATIVIDADES: 'atividades_docentes',
    cacheUsuario: null,
    escalas: [],
    ferias: [],
    atividades: [],
    baseCarregada: false,
    atividadesChave: '',
    _listenersAtivos: false,
    _listenersDocente: [],
    _erroListener: false,
    _norm(v) { return window.Util.semAcento(v || '').trim().toLowerCase(); },
    _usuarioKey() { return window.auth?.currentUser?.uid || window.usuarioAtual?.uid || window.usuarioAtual?.email || ''; },
    _identidades(docente) {
        return { id: String(docente?.id || docente?.docente_id || ''), uid: String(docente?.uid || docente?.docente_uid || ''), email: String(docente?.email || docente?.docente_email || '').toLowerCase() };
    },
    corresponde(a, b) {
        const x=this._identidades(a),y=this._identidades(b);
        return !!((x.id&&y.id&&x.id===y.id)||(x.uid&&y.uid&&x.uid===y.uid)||(x.email&&y.email&&x.email===y.email));
    },
    docenteAtual() {
        const u=window.usuarioAtual||{};
        return { id:u.id||'', uid:u.uid||this._usuarioKey(), email:u.email||'', nome_completo:u.nome_completo||[u.nome,u.sobrenome].filter(Boolean).join(' '), areas:u.areas||[], cargo:'docente', perfis:['docente'], status:'ativo' };
    },
    _ownerPayload() {
        const u=window.usuarioAtual||{},auth=window.auth?.currentUser||{};
        if(u.cargo!=='docente'||!u.uid||!u.id)throw new Error('Somente o próprio docente pode alterar seus registros.');
        return { docente_uid:u.uid||auth.uid, docente_id:u.id, docente_email:(u.email||auth.email||'').toLowerCase(), docente_nome:u.nome_completo||[u.nome,u.sobrenome].filter(Boolean).join(' ') };
    },
    _removerListenersProprios() {
        const anteriores=new Set(this._listenersDocente||[]);
        anteriores.forEach(unsubscribe=>{try{unsubscribe();}catch(_){}});
        if(Array.isArray(window.Store?.listeners)&&anteriores.size){
            for(let i=window.Store.listeners.length-1;i>=0;i--)if(anteriores.has(window.Store.listeners[i]))window.Store.listeners.splice(i,1);
        }
        this._listenersDocente=[];this._listenersAtivos=false;
    },
    async carregarBase(forcar=false) {
        await window.Store.garantirPronto();
        const key=this._usuarioKey();
        if(this.cacheUsuario!==key){this._removerListenersProprios();this.cacheUsuario=key;this.escalas=[];this.ferias=[];this.atividades=[];this.baseCarregada=false;this.atividadesChave='';this._erroListener=false;}
        const listenersRegistrados=this._listenersDocente.length===2&&this._listenersDocente.every(unsubscribe=>window.Store.listeners.includes(unsubscribe));
        if(this._listenersAtivos&&!forcar&&!this._erroListener&&listenersRegistrados)return {escalas:this.escalas,ferias:this.ferias};
        if(forcar)this.atividadesChave='';
        this._removerListenersProprios();this.baseCarregada=false;
        this._erroListener=false;
        await new Promise(resolve=>{
            let iniciais=0,encerrada=false;
            const pronto=()=>{if(!encerrada&&++iniciais===2){encerrada=true;this.baseCarregada=true;resolve();}};
            const observar=(colecao,aplicar,ordenar)=>{
                let inicial=true;
                const unsubscribe=window.db.collection(colecao).onSnapshot(snap=>{
                    aplicar(snap.docs.map(d=>({id:d.id,...d.data()})).sort(ordenar));
                    if(inicial){inicial=false;pronto();}
                    else if(window.location?.hash==='#/area-docentes'&&typeof window.Store.onUpdateCallback==='function')window.Store.onUpdateCallback(colecao);
                },err=>{
                    this._erroListener=true;
                    console.warn(`[Docente] Não foi possível acompanhar ${colecao}:`,err.message);
                    if(inicial){inicial=false;pronto();}
                });
                this._listenersDocente.push(unsubscribe);window.Store.listeners.push(unsubscribe);
            };
            observar(this.COLECAO_ESCALAS,x=>{this.escalas=x;},(a,b)=>(b.inicio_vigencia||'').localeCompare(a.inicio_vigencia||''));
            observar(this.COLECAO_FERIAS,x=>{this.ferias=x;},(a,b)=>(a.data_inicio||'').localeCompare(b.data_inicio||''));
            this._listenersAtivos=true;
        });
        if(forcar)this.atividadesChave='';
        return {escalas:this.escalas,ferias:this.ferias};
    },
    obterDocentes() {
        const lista=[...(window.Store.dados.docentes||[])],atual=window.usuarioAtual||{};
        if(atual.cargo==='docente'&&!lista.some(d=>this.corresponde(d,this.docenteAtual())))lista.push(this.docenteAtual());
        return lista.filter(d=>d.status==='ativo'||d===this.docenteAtual()).sort((a,b)=>(a.nome_completo||a.nome||a.email||'').localeCompare(b.nome_completo||b.nome||b.email||'','pt-BR'));
    },
    _dataISO(data) {
        const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(data||''));
        if(!m)return false;
        const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);
        return d.getFullYear()===Number(m[1])&&d.getMonth()===Number(m[2])-1&&d.getDate()===Number(m[3]);
    },
    _diaSeguinteISO(iso) { const d=this._horaISO(iso);d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; },
    dataFinalFerias(registro) { return this._dataISO(registro?.data_retorno)?this._ontemISO(registro.data_retorno):''; },
    _minutos(hora) { const m=String(hora||'').match(/^(\d{2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null; },
    _horaISO(iso) { const [y,m,d]=iso.split('-').map(Number);return new Date(y,m-1,d,12); },
    _ontemISO(iso) { const d=this._horaISO(iso);d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; },
    chDia(dia) {
        const entrada=this._minutos(dia?.entrada),saida=this._minutos(dia?.saida);
        if(entrada===null||saida===null||saida<=entrada)return 0;
        const bi=this._minutos(dia?.intervalo_inicio),br=this._minutos(dia?.intervalo_retorno);
        let minutos=saida-entrada;
        if(bi!==null||br!==null){if(bi===null||br===null||br<=bi||bi<=entrada||br>=saida)return 0;minutos-=br-bi;}
        return Math.max(0,minutos);
    },
    totalCH(dias) { return Object.values(dias||{}).reduce((s,d)=>s+this.chDia(d),0); },
    validarDias(dias) {
        let total=0;
        for(let dia=1;dia<=6;dia++){
            const d=dias?.[String(dia)]||{},values=['entrada','intervalo_inicio','intervalo_retorno','saida'].map(k=>d[k]||'');
            if(values.every(v=>!v))continue;
            const entrada=this._minutos(d.entrada),saida=this._minutos(d.saida),bi=this._minutos(d.intervalo_inicio),br=this._minutos(d.intervalo_retorno);
            if(entrada===null||saida===null||saida<=entrada)throw new Error(`Confira os horários de ${['','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][dia]}.`);
            if((bi===null)!==(br===null)||((bi!==null)&&(bi<=entrada||br<=bi||br>=saida)))throw new Error(`O intervalo de ${['','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][dia]} deve ter início e retorno válidos dentro da jornada.`);
            total+=this.chDia(d);
        }
        if(!total)throw new Error('Informe ao menos um dia com horários de trabalho válidos.');
        return total;
    },
    escalasDocente(docente) { return this.escalas.filter(x=>this.corresponde(x,docente)).sort((a,b)=>(b.inicio_vigencia||'').localeCompare(a.inicio_vigencia||'')); },
    feriasDocente(docente) { return this.ferias.filter(x=>this.corresponde(x,docente)).sort((a,b)=>(a.data_inicio||'').localeCompare(b.data_inicio||'')); },
    escalaParaData(docente, data) {
        return this.escalasDocente(docente).filter(x=>x.inicio_vigencia<=data&&(x.final_vigencia==='Atual'||(x.final_vigencia||'')>=data)).sort((a,b)=>(b.inicio_vigencia||'').localeCompare(a.inicio_vigencia||''))[0]||null;
    },
    estaDeFerias(docente,data) { return this.feriasDocente(docente).some(f=>(f.data_inicio||'')<=data&&(f.data_retorno||'')>data); },
    podeEditarProprio(docente) { return window.usuarioAtual?.cargo==='docente'&&this.corresponde(this.docenteAtual(),docente); },
    podeVerPlanejamento() { return ['docente','tecnico','admin','root'].includes(window.usuarioAtual?.cargo); },
    async salvarEscala({inicio_vigencia,dias_semana}) {
        const owner=this._ownerPayload();
        if(!this._dataISO(inicio_vigencia))throw new Error('Informe uma data válida para o início da vigência.');
        const historico=this.escalasDocente(owner);
        if(historico.length&&inicio_vigencia<this._hojeISO())throw new Error('Somente o primeiro cadastro pode ter início de vigência retroativo.');
        const chTotal=this.validarDias(dias_semana),atuais=historico.filter(x=>x.final_vigencia==='Atual');
        if(atuais.some(x=>inicio_vigencia<=(x.inicio_vigencia||'')))throw new Error('A nova escala deve iniciar depois da vigência da escala atual.');
        const agora=new Date().toISOString(),ref=window.db.collection(this.COLECAO_ESCALAS).doc(),batch=window.db.batch();
        atuais.forEach(x=>batch.update(window.db.collection(this.COLECAO_ESCALAS).doc(x.id),{final_vigencia:this._ontemISO(inicio_vigencia),encerrado_em:agora,encerrado_por_email:owner.docente_email}));
        const payload={...owner,dias_semana,inicio_vigencia,final_vigencia:'Atual',ch_semanal_minutos:chTotal,criado_em:agora,criado_por_email:owner.docente_email};
        batch.set(ref,payload);await batch.commit();
        atuais.forEach(x=>{x.final_vigencia=this._ontemISO(inicio_vigencia);x.encerrado_em=agora;x.encerrado_por_email=owner.docente_email;});
        this.escalas.unshift({id:ref.id,...payload});this.escalas.sort((a,b)=>(b.inicio_vigencia||'').localeCompare(a.inicio_vigencia||''));
        return payload;
    },
    _hojeISO() { const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; },
    _diasEntre(inicio,fim) { return Math.max(0,Math.round((this._horaISO(fim)-this._horaISO(inicio))/86400000)); },
    validarFerias(dados,ignorarId='') {
        const {periodo_aquisitivo,data_inicio}=dados||{},data_final=dados?.data_final||(this._dataISO(dados?.data_retorno)?this._ontemISO(dados.data_retorno):'');
        if(!/^\d{4}$/.test(String(periodo_aquisitivo||'')))throw new Error('O período aquisitivo deve conter um ano com quatro dígitos.');
        if(!this._dataISO(data_inicio)||!this._dataISO(data_final)||data_final<data_inicio)throw new Error('A data final deve ser igual ou posterior à data de início.');
        const data_retorno=this._diaSeguinteISO(data_final),owner=this.docenteAtual(),overlap=this.feriasDocente(owner).some(f=>f.id!==ignorarId&&data_inicio<(f.data_retorno||'')&&data_retorno>(f.data_inicio||''));
        if(overlap)throw new Error('Este período se sobrepõe a outro período de férias já cadastrado.');
        return {data_retorno,qtde_dias:this._diasEntre(data_inicio,data_retorno)};
    },
    async salvarFerias(dados,id='') {
        const owner=this._ownerPayload(),validacao=this.validarFerias(dados,id),agora=new Date().toISOString();
        const payload={...owner,periodo_aquisitivo:String(dados.periodo_aquisitivo),data_inicio:dados.data_inicio,data_retorno:validacao.data_retorno,qtde_dias:validacao.qtde_dias,atualizado_em:agora};
        if(id){const atual=this.ferias.find(x=>x.id===id);if(!atual||!this.corresponde(atual,owner))throw new Error('Período de férias não encontrado ou sem permissão.');await window.db.collection(this.COLECAO_FERIAS).doc(id).update(payload);const idx=this.ferias.findIndex(x=>x.id===id);if(idx>=0)this.ferias[idx]={...this.ferias[idx],...payload};}
        else{payload.criado_em=agora;const ref=await window.db.collection(this.COLECAO_FERIAS).add(payload),novo={id:ref.id,...payload},idx=this.ferias.findIndex(x=>x.id===ref.id);if(idx>=0)this.ferias[idx]={...this.ferias[idx],...novo};else this.ferias.push(novo);}
        this.ferias.sort((a,b)=>(a.data_inicio||'').localeCompare(b.data_inicio||''));return payload;
    },
    async excluirFerias(id) {
        const owner=this._ownerPayload(),atual=this.ferias.find(x=>x.id===id);if(!atual||!this.corresponde(atual,owner))throw new Error('Período de férias não encontrado ou sem permissão.');
        await window.db.collection(this.COLECAO_FERIAS).doc(id).delete();this.ferias=this.ferias.filter(x=>x.id!==id);
    },
    async carregarAtividades(docente, inicioMes, fimMes, forcar=false) {
        const role=window.usuarioAtual?.cargo,own=role==='docente',key=own?'self-all':`equipe|${inicioMes}|${fimMes}`;
        const filtrarPeriodo=lista=>lista.filter(x=>x.data>=inicioMes&&x.data<=fimMes);
        if(!forcar&&this.atividadesChave===key)return filtrarPeriodo(this.atividades);
        let query=window.db.collection(this.COLECAO_ATIVIDADES);
        if(own)query=query.where('docente_uid','==',this._usuarioKey());
        else query=query.where('data','>=',inicioMes).where('data','<=',fimMes);
        const snap=await query.get();this.atividades=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.tipo==='Outra Atividade'&&this._dataISO(x.data));
        if(!own)this.atividades=this.atividades.filter(x=>x.data>=inicioMes&&x.data<=fimMes);
        this.atividadesChave=key;return filtrarPeriodo(this.atividades);
    },
    atividadesDoDocente(docente,inicioMes='',fimMes='') { return this.atividades.filter(x=>this.corresponde(x,docente)&&(!inicioMes||x.data>=inicioMes)&&(!fimMes||x.data<=fimMes)); },
    async salvarAtividade({docente,data,inicio,termino,tipo,descricao,registroId=''}) {
        const owner=this._ownerPayload();if(!this.corresponde(owner,docente))throw new Error('Somente o próprio docente pode alterar suas atividades.');
        if(!this._dataISO(data)||this._minutos(inicio)===null||this._minutos(termino)===null||this._minutos(termino)<=this._minutos(inicio))throw new Error('O período informado não é válido.');
        if(!['Planejamento','Outra Atividade'].includes(tipo))throw new Error('Selecione Planejamento ou Outra Atividade.');
        const descricaoFinal=(descricao||'').trim();if(tipo==='Outra Atividade'&&!descricaoFinal)throw new Error('Descreva a Outra Atividade.');
        const existente=this.atividades.find(x=>x.id===registroId)||this.atividades.find(x=>this.corresponde(x,owner)&&x.data===data&&x.inicio===inicio&&x.termino===termino);
        if(tipo==='Planejamento'){
            if(existente){await window.db.collection(this.COLECAO_ATIVIDADES).doc(existente.id).delete();this.atividades=this.atividades.filter(x=>x.id!==existente.id);}
            return null;
        }
        const agora=new Date().toISOString(),payload={...owner,data,inicio,termino,tipo,descricao:descricaoFinal,atualizado_em:agora};
        if(existente){await window.db.collection(this.COLECAO_ATIVIDADES).doc(existente.id).update(payload);Object.assign(existente,payload);}
        else{payload.criado_em=agora;const ref=await window.db.collection(this.COLECAO_ATIVIDADES).add(payload);this.atividades.push({id:ref.id,...payload});}
        return payload;
    }
};
