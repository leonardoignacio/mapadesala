// ./dashboard/controller_dashboard.js - Consultas derivadas para os painéis por perfil
window.ControllerDashboard = {
    _norm(v) { return window.Util.semAcento(v); },
    _dataLocal(d=new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; },
    _addDays(iso, n) { const [y,m,d]=iso.split('-').map(Number),dt=new Date(y,m-1,d);dt.setDate(dt.getDate()+n);return this._dataLocal(dt); },
    _segunda(iso) { const [y,m,d]=iso.split('-').map(Number),dt=new Date(y,m-1,d),dow=dt.getDay();dt.setDate(dt.getDate()-(dow===0?6:dow-1));return this._dataLocal(dt); },
    _turma(enc) { return enc?.turma||(window.Store.dados.turmas||[]).find(t=>t.id===enc.id_turma)||{}; },
    _periodo(enc) {
        const turma=this._turma(enc),p=this._norm(turma.periodo||'');
        if(p.includes('noite')||Number((enc.h_inicio||'').slice(0,2))>=18)return 'Noite';
        if(p.includes('tarde')||Number((enc.h_inicio||'').slice(0,2))>=12)return 'Tarde';
        return 'Manhã';
    },
    _docentesDoEncontro(enc) { return Array.isArray(enc.docentes)?enc.docentes:[]; },
    _docenteCorresponde(enc,user=window.usuarioAtual) {
        const id=user?.id||'',uid=user?.uid||window.auth?.currentUser?.uid||'',email=(user?.email||'').toLowerCase();
        return this._docentesDoEncontro(enc).some(d=>((id&&d.id===id)||(uid&&d.uid===uid)||(email&&(d.email||'').toLowerCase()===email)));
    },
    _areasUsuario() {
        const vals=(window.usuarioAtual?.areas||[]).map(a=>typeof a==='object'&&a?(a.area||a.nome_area||a.nome||''):a).filter(Boolean);
        return vals.some(a=>this._norm(a)==='todas')?[]:vals;
    },
    _areasDisponiveis() { return window.ControllerApoioAlteracoes?.areasDisponiveis?.()||[]; },
    _aplicaAreas(turma,areas) {
        if(!areas||!areas.length)return true;
        const n=[turma.area,turma.curso_area,turma.curso_tipo].filter(Boolean).map(a=>this._norm(a));
        return areas.some(a=>n.includes(this._norm(a)));
    },
    listarEncontros({inicio,fim,docente=false,areas=null}={}) {
        const turmasPorId=new Map((window.Store.dados.turmas||[]).map(t=>[t.id,t])),lista=[];
        for(const e of window.Store.dados.encontros||[]){
            if(e.tipo==='cancelamento'||!e.data||(inicio&&e.data<inicio)||(fim&&e.data>fim))continue;
            if(docente&&!this._docenteCorresponde(e))continue;
            const turma=turmasPorId.get(e.id_turma)||{};if(!this._aplicaAreas(turma,areas))continue;
            lista.push({...e,turma});
        }
        return lista.sort((a,b)=>(a.data||'').localeCompare(b.data||'')||(a.h_inicio||'').localeCompare(b.h_inicio||''));
    },
    listarEncontrosHojeDocente() {
        const hoje=this._dataLocal();return this.listarEncontros({inicio:hoje,fim:hoje,docente:true});
    },
    listarSemanaDocente(deslocamento=0) {
        const inicio=this._addDays(this._segunda(this._dataLocal()),Number(deslocamento||0)*7);
        return {inicio,fim:this._addDays(inicio,5),encontros:this.listarEncontros({inicio,fim:this._addDays(inicio,5),docente:true})};
    },
    listarAgendaDocentes(deslocamento=0,modoAreas='minhas') {
        const inicio=this._addDays(this._segunda(this._dataLocal()),Number(deslocamento||0)*7),areas=modoAreas==='todas'?null:this._areasUsuario();
        return {inicio,fim:this._addDays(inicio,5),encontros:this.listarEncontros({inicio,fim:this._addDays(inicio,5),areas})};
    },
    async listarAlteracoes({modoAreas='minhas',pendentes=false,limite=8}={}) {
        const C=window.ControllerApoioAlteracoes;
        const docs=await C.carregar();docs.forEach(i=>C.enriquecer(i));
        const classificados=C.classificar(docs),areas=modoAreas==='todas'?null:this._areasUsuario();
        let itens=pendentes?classificados.ativos.filter(i=>i.situacao==='Pendente'):classificados.ativos;
        if(areas?.length)itens=itens.filter(i=>areas.some(a=>this._norm(a)===this._norm(i.area)));
        itens.sort((a,b)=>(b.criadoEm||'').localeCompare(a.criadoEm||''));
        return itens.slice(0,limite);
    },
    agruparAlteracoesTurma(itens) {
        const grupos=new Map();
        (itens||[]).forEach(i=>{const key=i.turmaRef||'Turma sem referência';if(!grupos.has(key))grupos.set(key,[]);grupos.get(key).push(i);});
        return [...grupos.entries()].sort((a,b)=>a[0].localeCompare(b[0],'pt-BR'));
    },
    obterAreasDisponiveis() { return this._areasDisponiveis(); },
    formatarSemana(inicio,fim) {
        const partes=iso=>iso.split('-').map(Number),a=partes(inicio),b=partes(fim),meses=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
        if(a[0]===b[0]&&a[1]===b[1])return `${a[2]}–${b[2]} de ${meses[a[1]-1]} de ${a[0]}`;
        return `${window.Util.dataBR(inicio)} – ${window.Util.dataBR(fim)}`;
    }
};
