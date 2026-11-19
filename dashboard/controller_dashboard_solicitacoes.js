// ./dashboard/controller_dashboard_solicitacoes.js - Solicitações entre perfis no Dashboard
window.ControllerDashboardSolicitacoes = {
    COLECAO:'solicitacoes',
    PERFIS:['root','admin','tecnico','docente','apoio'],
    _perfisAtuais() {
        const cargo=window.usuarioAtual?.cargo;
        return ['root','admin'].includes(cargo)?this.PERFIS:[cargo].filter(p=>this.PERFIS.includes(p));
    },
    _validarDestino(perfis) {
        const alvos=[...new Set((perfis||[]).filter(p=>this.PERFIS.includes(p)))];
        if(!alvos.length)throw new Error('Selecione ao menos um perfil destinatário.');
        return alvos;
    },
    async listar({direcao='recebidas',status='Pendente',de='',ate=''}={}) {
        const col=window.db.collection(this.COLECAO),uid=window.usuarioAtual?.uid||window.auth?.currentUser?.uid;
        let query;
        if(direcao==='enviadas'){
            if(!uid)return [];
            query=col.where('uid_solicitante','==',uid);
        }else{
            const cargo=window.usuarioAtual?.cargo,perfis=this._perfisAtuais();if(!perfis.length)return [];
            query=['root','admin'].includes(cargo)?col.where('perfis_destino','array-contains-any',perfis):col.where('perfis_destino','array-contains',cargo);
        }
        if(status&&status!=='Todas')query=query.where('status','==',status);
        const toIso=(dia,fim=false)=>{if(!dia)return '';const [y,m,d]=dia.split('-').map(Number),dt=new Date(y,m-1,d,fim?23:0,fim?59:0,fim?59:0,fim?999:0);return dt.toISOString();};
        const desde=toIso(de),ateIso=toIso(ate,true);
        if(desde)query=query.where('criado_em','>=',desde);
        if(ateIso)query=query.where('criado_em','<=',ateIso);
        let snap;
        try{snap=await query.get();}
        catch(err){
            // Índice composto não publicado ainda: degradar para a consulta por destinatário/remetente
            // e aplicar os filtros em memória, sem impedir o uso da aba.
            if(err?.code!=='failed-precondition')throw err;
            const cargo=window.usuarioAtual?.cargo;
            let fallback=direcao==='enviadas'?col.where('uid_solicitante','==',uid):(['root','admin'].includes(cargo)?col.where('perfis_destino','array-contains-any',this._perfisAtuais()):col.where('perfis_destino','array-contains',cargo));
            snap=await fallback.get();
        }
        const lista=[];snap.forEach(d=>lista.push({id:d.id,...d.data()}));
        return lista.filter(s=>(direcao==='enviadas'||s.uid_solicitante!==uid)&&(!status||status==='Todas'||s.status===status)&&(!de||(s.criado_em||'')>=desde)&&(!ate||((s.criado_em||'')<=ateIso))).sort((a,b)=>(b.criado_em||'').localeCompare(a.criado_em||''));
    },
    async criar({perfisDestino,tipo='geral',area='',assunto='',mensagem=''}) {
        const u=window.usuarioAtual||{},authUser=window.auth?.currentUser;
        if(!authUser?.uid||!u.id)throw new Error('Sua sessão ou cadastro não está disponível. Entre novamente.');
        const destinos=this._validarDestino(perfisDestino),tipos=['area','problema','geral'];
        if(!tipos.includes(tipo))throw new Error('Tipo de solicitação inválido.');
        assunto=(assunto||'').trim();mensagem=(mensagem||'').trim();area=(area||'').trim();
        if(!assunto)throw new Error('Informe o assunto da solicitação.');
        if(!mensagem)throw new Error('Descreva a solicitação.');
        if(tipo==='area'&&!area)throw new Error('Informe a área relacionada ao pedido.');
        if(assunto.length>120||area.length>100||mensagem.length>4000)throw new Error('Um dos campos excede o limite permitido.');
        const doc={uid_solicitante:authUser.uid,id_solicitante:u.id,email_solicitante:(authUser.email||u.email||'').toLowerCase(),nome_solicitante:u.nome_completo||u.nome||authUser.email||'',cargo_solicitante:u.cargo||'',perfis_destino:destinos,tipo,area,assunto,mensagem,status:'Pendente',criado_em:new Date().toISOString(),processada_em:'',processada_por_uid:'',processada_por_email:'',processada_por_nome:''};
        const ref=await window.db.collection(this.COLECAO).add(doc);
        return {id:ref.id,...doc};
    },
    async processar(id,status='Processada') {
        if(!id)throw new Error('Solicitação inválida.');
        const authUser=window.auth?.currentUser,u=window.usuarioAtual||{};
        if(!authUser?.uid)throw new Error('Sessão expirada. Entre novamente.');
        if(status==='Processada'){
            const agora=new Date().toISOString();
            await window.db.collection(this.COLECAO).doc(id).update({status:'Processada',processada_em:agora,processada_por_uid:authUser.uid,processada_por_email:(authUser.email||u.email||'').toLowerCase(),processada_por_nome:u.nome_completo||u.nome||authUser.email||''});
            return {status:'Processada',processada_em:agora,processada_por_uid:authUser.uid,processada_por_email:(authUser.email||u.email||'').toLowerCase(),processada_por_nome:u.nome_completo||u.nome||authUser.email||''};
        }
        if(status==='Pendente'){
            await window.db.collection(this.COLECAO).doc(id).update({status:'Pendente'});
            return {status:'Pendente'};
        }
        throw new Error('Situação de solicitação inválida.');
    }
};
