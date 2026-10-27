// Controller do Mapa: validações de agenda, persistência, autorização e auditoria de encontros.
window.ControllerEspelho = {
    colecaoEncontros: 'encontros',
    colecaoExcecoes: 'datas_excecoes',
};
// Operações e regras de negócio do Mapa de Aulas.
Object.assign(window.ControllerEspelho, {
    _norm(v) { return (v || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(); },
    _areasUsuario() { return Array.isArray(window.usuarioAtual?.areas) ? window.usuarioAtual.areas : []; },
    _valorArea(a) { return typeof a === 'object' && a ? (a.area || a.nome_area || a.nome || a.referencia || a.tipo || '') : a; },
    _turmaPermitida(turma) {
        if (!turma) return false;
        if (window.usuarioAtual?.cargo !== 'docente') return true;
        const areas = this._areasUsuario().map(a => this._norm(this._valorArea(a)));
        if (areas.includes('todas')) return true;
        return [turma.area, turma.curso_area, turma.curso_tipo].some(a => a && areas.includes(this._norm(this._valorArea(a))));
    },
    _podeDistribuir() { return ['root', 'admin', 'tecnico', 'docente'].includes(window.usuarioAtual?.cargo); },
    _podeGerenciarFlags() { return ['root', 'admin', 'tecnico', 'apoio'].includes(window.usuarioAtual?.cargo); },
    _validarEdicao(turma) {
        if (!this._podeDistribuir()) throw new Error('Seu perfil possui acesso somente para leitura.');
        if (!turma || !this._turmaPermitida(turma)) throw new Error('Você não tem permissão para acessar ou alterar esta turma/área.');
    },
    _validarFlags() { if (!this._podeGerenciarFlags()) throw new Error('Seu perfil não pode atualizar SS/SGO.'); },
    _buscarTurma(cacheTurmas, idTurma) {
        const lista = Array.isArray(cacheTurmas) && cacheTurmas.length ? cacheTurmas : (window.Store?.dados?.turmas || []);
        const turma = lista.find(t => t.id === idTurma);
        this._validarEdicao(turma);
        return turma;
    },
    async carregarBase() {
        await window.Store.garantirPronto();
        const cursos = [...(window.Store.dados.cursos || [])].sort((a,b)=>(a.titulo||'').localeCompare(b.titulo||''));
        const mapaCursos = new Map(cursos.map(c => [c.id, c]));
        const todasTurmas = [...(window.Store.dados.turmas || [])].map(t => ({...t, curso_area: mapaCursos.get(t.id_curso)?.area || t.curso_area || '', curso_tipo: mapaCursos.get(t.id_curso)?.tipo || t.curso_tipo || ''}));
        const turmas = todasTurmas.filter(t => this._turmaPermitida(t));
        const ids = new Set(turmas.map(t => t.id));
        const docentes = (window.Store.dados.usuarios || []).filter(u => u.status === 'ativo' && this._norm(u.cargo) === 'docente' && Array.isArray(u.perfis) && u.perfis.some(p => this._norm(p) === 'docente'));
        return { turmas: turmas.sort((a,b)=>(a.referencia||'').localeCompare(b.referencia||'')), cursos, encontros: (window.Store.dados.encontros||[]).filter(e=>ids.has(e.id_turma)), excecoes: [...(window.Store.dados.excecoes||[])], docentes, salas: [...(window.Store.dados.salas||[])] };
    },
    _dataValida(data) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) return false;
        const [y,m,d]=data.split('-').map(Number),date=new Date(y,m-1,d,12);
        return date.getFullYear()===y && date.getMonth()===m-1 && date.getDate()===d;
    },
    _excecaoAtiva(data, turma) {
        const ignoradas = Array.isArray(turma?.excecoes_ignoradas) ? turma.excecoes_ignoradas : [];
        return !ignoradas.includes(data) && (window.Store.dados.excecoes || []).some(x => x.data === data || x.id === data);
    },
    _normalizarEncontro(dados, turma) {
        const uc = (turma.ucs || []).find(u => u.id_uc_base === dados.id_uc || u.id === dados.id_uc || u.referencia === dados.uc_referencia);
        const tipo = dados.tipo === 'cancelamento' ? 'cancelamento' : 'aula';
        if (tipo === 'aula' && !uc) throw new Error('Selecione uma UC vinculada à turma.');
        if (!this._dataValida(dados.data)) throw new Error('Data inválida.');
        const h_inicio = dados.h_inicio || turma.h_inicio || '';
        const h_termino = dados.h_termino || turma.h_termino || '';
        const hi = this._horaMinutos(h_inicio), hf = this._horaMinutos(h_termino);
        const ch = hi !== null && hf !== null && hf > hi ? (window.ControllerTurmaFrm?.calcularCHEncontro(h_inicio, h_termino) || (hf-hi)/60) : 0;
        if (tipo === 'aula' && (!h_inicio || !h_termino || hi === null || hf === null || hf <= hi || ch <= 0)) throw new Error('O horário final deve ser posterior ao horário inicial.');
        const docentes = Array.isArray(dados.docentes) ? dados.docentes : [];
        return {
            id_turma: turma.id, turma_referencia: turma.referencia || '', data: dados.data, tipo,
            id_uc: uc?.id_uc_base || uc?.id || '', uc_referencia: uc?.referencia || '', uc_titulo: uc?.titulo || '', uc_carga_horaria: Number(uc?.carga_horaria) || 0,
            h_inicio, h_termino, ch_encontro: ch, modalidade: dados.modalidade === 'Remoto' ? 'Remoto' : 'Presencial',
            docentes: docentes.map(d => ({ id: d.id, email: d.email || '', nome: d.nome_completo || `${d.nome || ''} ${d.sobrenome || ''}`.trim() || d.email || '' })),
            sala_id: dados.modalidade === 'Remoto' ? '' : (dados.sala_id || ''), sala_nome: dados.modalidade === 'Remoto' ? '' : (dados.sala_nome || ''),
            SS: dados.SS === true, SGO: dados.SGO === true, descricao: (dados.descricao || '').trim(), atualizado_em: new Date().toISOString()
        };
    },
    _validarDocentes(encontro, turma) {
        if (encontro.tipo === 'cancelamento') return;
        if (!encontro.docentes?.length) throw new Error('Selecione ao menos um docente.');
        const areaTurma = [turma.curso_area, turma.area, turma.curso_tipo].map(a => this._norm(this._valorArea(a))).filter(Boolean);
        for (const escalado of encontro.docentes) {
            const usuario = (window.Store.dados.usuarios || []).find(u => u.id === escalado.id || this._norm(u.email) === this._norm(escalado.email));
            if (!usuario || usuario.status !== 'ativo' || this._norm(usuario.cargo) !== 'docente' || !Array.isArray(usuario.perfis) || !usuario.perfis.some(p => this._norm(p) === 'docente')) throw new Error('Somente usuários ativos cujo perfil principal é Docente podem ser escalados.');
            const areas = (usuario.areas || []).map(a => this._norm(this._valorArea(a)));
            if (!areas.includes('todas') && !areas.some(a => areaTurma.includes(a))) throw new Error(`${usuario.nome_completo || usuario.email} não possui habilitação para a área desta turma.`);
        }
    },
    _horaMinutos(hora) { const m = /^(\d{1,2}):(\d{2})$/.exec(hora || ''); if(!m)return null;const h=Number(m[1]),min=Number(m[2]);return h<=23&&min<=59?h*60+min:null; },
    _conflitoDocente(a,b) {
        if (!a || !b || a.tipo === 'cancelamento' || b.tipo === 'cancelamento') return false;
        const ids = new Set((a.docentes||[]).flatMap(d => [d.id,this._norm(d.email)].filter(Boolean)));
        if (!(b.docentes||[]).some(d => ids.has(d.id) || ids.has(this._norm(d.email)))) return false;
        if (a.data === b.data) {
            const ai=this._horaMinutos(a.h_inicio), af=this._horaMinutos(a.h_termino), bi=this._horaMinutos(b.h_inicio), bf=this._horaMinutos(b.h_termino);
            if ([ai,af,bi,bf].some(x=>x===null) || ai >= bf || bi >= af) return false;
            return !(a.sala_id && b.sala_id && a.sala_id === b.sala_id);
        }
        const cedo=a.data < b.data ? a : b, tarde=cedo===a ? b : a;
        if ((Date.parse(`${tarde.data}T00:00:00Z`)-Date.parse(`${cedo.data}T00:00:00Z`))/86400000 !== 1) return false;
        const fim=this._horaMinutos(cedo.h_termino), inicio=this._horaMinutos(tarde.h_inicio);
        return fim !== null && inicio !== null && fim >= 18*60 && inicio < 12*60 && (24*60 - fim + inicio) <= 11.5*60;
    },
    _validarConflitos(candidatos, excluidos = new Set()) {
        const existentes=(window.Store.dados.encontros||[]).filter(e=>!excluidos.has(e.id));
        const vistos=[...existentes];
        for (const e of candidatos) {
            for (const outro of vistos) if (this._conflitoDocente(e,outro)) throw new Error(`Conflito de agenda docente: ${e.data} e ${outro.data} (${outro.h_inicio || 'horário não informado'}–${outro.h_termino || 'horário não informado'}).`);
            vistos.push(e);
        }
    },
    _validarDatasETurmas(registros, cacheTurmas, idsExcluidos = new Set()) {
        const chaves = new Set();
        for (const e of registros) {
            const turma=this._buscarTurma(cacheTurmas,e.id_turma);
            if ((turma.d_inicio && e.data < turma.d_inicio) || (turma.d_termino && e.data > turma.d_termino)) throw new Error(`A data ${e.data} está fora do período da turma ${turma.referencia}.`);
            if (e.tipo !== 'cancelamento' && this._excecaoAtiva(e.data,turma)) throw new Error(`A data ${e.data} está bloqueada por exceção do calendário.`);
            const key=`${e.id_turma}|${e.data}`;
            if (chaves.has(key)) throw new Error(`A turma possui mais de um encontro na data ${e.data}.`);
            chaves.add(key);
            this._validarDocentes(e,turma);
        }
        const outros=(window.Store.dados.encontros||[]).filter(e=>!idsExcluidos.has(e.id));
        for (const e of registros) if (outros.some(o=>o.id_turma===e.id_turma && o.data===e.data)) throw new Error(`A turma já possui encontro ou cancelamento em ${e.data}.`);
    },
    _validarLimiteUC(registros, idsExcluidos = new Set()) {
        const existentes=(window.Store.dados.encontros||[]).filter(e=>!idsExcluidos.has(e.id) && e.tipo!=='cancelamento');
        const adicionados=new Map();
        for (const r of registros.filter(x=>x.tipo!=='cancelamento')) {
            const key=`${r.id_turma}|${r.id_uc}`; adicionados.set(key,(adicionados.get(key)||0)+1);
        }
        for (const [key,n] of adicionados) {
            const [idTurma,idUC]=key.split('|'), turma=(window.Store.dados.turmas||[]).find(t=>t.id===idTurma);
            const uc=(turma?.ucs||[]).find(u=>(u.id_uc_base||u.id)===idUC), ch=Number(registros.find(r=>r.id_turma===idTurma&&r.id_uc===idUC)?.ch_encontro)||Number(turma?.ch_encontro)||0;
            const total=uc && ch>0 ? Math.ceil((Number(uc.carga_horaria)||0)/ch) : 0;
            const count=existentes.filter(e=>e.id_turma===idTurma&&e.id_uc===idUC).length;
            if(total && count+n>total) throw new Error(`A UC ${uc.referencia || ''} ultrapassaria o total previsto de ${total} encontro(s).`);
        }
    },
    _logAlteracao(encontro, tipo, anterior = null) {
        const usuario=window.usuarioAtual||{};
        return { dados_encontro:{...encontro}, ...(anterior?{dados_encontro_anterior:{...anterior}}:{}), tipo, SS:anterior?.SS===true, SGO:anterior?.SGO===true, status:'Pendente', criado_em:new Date().toISOString(), criado_por:usuario.email||usuario.nome_completo||'' };
    },
    _tipoAlteracao(anterior, atual) {
        const ids=x=>(x?.docentes||[]).map(d=>d.id||this._norm(d.email)).sort().join('|');
        return anterior && ids(anterior)!==ids(atual) ? 'Alterar Docente' : 'Redistribuir';
    },
    async _commitGrupos(grupos) {
        let batch=window.db.batch(), count=0;
        for (const ops of grupos) {
            if (ops.length > 450) throw new Error('Lote de gravação excede o limite seguro.');
            if (count && count+ops.length>450) { await batch.commit(); batch=window.db.batch(); count=0; }
            ops.forEach(fn=>fn(batch)); count+=ops.length;
        }
        if (count) await batch.commit();
    },
    _docRefEncontro(id) { return window.db.collection(this.colecaoEncontros).doc(id); },
    _horasApuradasEncontro(encontro) {
        if(!encontro||encontro.tipo==='cancelamento'||typeof encontro.data!=='string'||encontro.data>=this._hojeISO())return 0;
        const n=Number(String(encontro.ch_encontro??encontro.carga_horaria??'').replace(',','.'));
        if(Number.isFinite(n)&&n>0)return n;
        const inicio=this._horaMinutos(encontro.h_inicio),fim=this._horaMinutos(encontro.h_termino);
        return inicio!==null&&fim!==null&&fim>inicio?(fim-inicio)/60:0;
    },
    _percentualHoras(horas,carga) { return carga>0?Math.min(100,Math.max(0,Math.round(horas/carga*100))):0; },
    _calcularPatchesHoras(pares) {
        const deltaPorUC=new Map();
        for(const par of pares||[]){
            for(const [e,sinal] of [[par?.antes,-1],[par?.depois,1]]){
                const horas=this._horasApuradasEncontro(e);if(!horas||!e.id_turma||!e.id_uc)continue;
                const key=`${e.id_turma}|${e.id_uc}`;deltaPorUC.set(key,(deltaPorUC.get(key)||0)+sinal*horas);
            }
        }
        const porTurma=new Map();
        for(const [key,delta] of deltaPorUC){if(Math.abs(delta)<0.0001)continue;const [idTurma,idUC]=key.split('|');if(!porTurma.has(idTurma))porTurma.set(idTurma,new Map());porTurma.get(idTurma).set(idUC,delta);}
        const patches=new Map(),turmas=window.Store.dados.turmas||[],encontros=window.Store.dados.encontros||[];
        for(const [idTurma,deltas] of porTurma){
            const turma=turmas.find(t=>t.id===idTurma);if(!turma||!Array.isArray(turma.ucs))continue;
            const ucs=turma.ucs.map(uc=>{
                const id=uc.id_uc_base||uc.id,carga=Number(String(uc.carga_horaria??'').replace(',','.'))||0;
                const horasBase=encontros.filter(e=>e&&e.id_turma===idTurma&&e.id_uc===id&&this._horasApuradasEncontro(e)>0).reduce((soma,e)=>soma+this._horasApuradasEncontro(e),0);
                const horas=Math.max(0,Math.round((horasBase+(deltas.get(id)||0))*100)/100),pct=this._percentualHoras(horas,carga);
                return{...uc,horas_ministradas:horas,horas_apuradas:horas,progresso:pct,progresso_calculado:pct,status:horas<=0?'Não Iniciada':(carga>0&&horas>=carga?'Concluída':'Em Andamento')};
            });
            const horasTurma=ucs.reduce((sum,uc)=>sum+(Number(uc.horas_ministradas)||0),0),cargaTurma=ucs.reduce((sum,uc)=>sum+(Number(String(uc.carga_horaria??'').replace(',','.'))||0),0)||Number(turma.ch_total_curso)||0,pctTurma=this._percentualHoras(horasTurma,cargaTurma),atualizado_em=new Date().toISOString();
            patches.set(idTurma,{ucs,horas_ministradas:horasTurma,horas_apuradas:horasTurma,progresso_turma:pctTurma,progresso_calculado:pctTurma,status:horasTurma<=0?'Não Iniciada':(cargaTurma>0&&horasTurma>=cargaTurma?'Concluída':'Em Andamento'),atualizado_em});
        }
        return patches;
    },
    _anexarPatchesHoras(grupos,pares) {
        const patches=this._calcularPatchesHoras(pares);if(patches.size)grupos.push([...patches].map(([id,payload])=>batch=>batch.update(window.db.collection('turmas').doc(id),payload)));return patches;
    },
    _sincronizarPatchesHoras(patches) {
        for(const [id,payload] of patches||[]){const atual=(window.Store.dados.turmas||[]).find(t=>t.id===id);if(atual)window.Store.upsertLocal('turmas',{...atual,...payload});}
    },
    async ignorarExcecaoTurma(idTurma, dataExcecao, cacheTurmas) {
        await window.Store.garantirPronto(); const turma=this._buscarTurma(cacheTurmas,idTurma);
        const ignoradas=Array.isArray(turma.excecoes_ignoradas)?[...turma.excecoes_ignoradas]:[];
        if (!ignoradas.includes(dataExcecao)) { ignoradas.push(dataExcecao); const atualizado_em=new Date().toISOString(); await window.db.collection('turmas').doc(idTurma).update({excecoes_ignoradas:ignoradas,atualizado_em}); window.Store.upsertLocal('turmas',{...turma,excecoes_ignoradas:ignoradas,atualizado_em}); }
    },
    async salvarEncontrosLote(registros, cacheTurmas) {
        await window.Store.garantirPronto(); if (!Array.isArray(registros)||!registros.length) throw new Error('Não há encontros para gravar.');
        const preparados=registros.map(r=>{const t=this._buscarTurma(cacheTurmas,r.id_turma);const p=this._normalizarEncontro(r,t);p.SS=false;p.SGO=false;p.criado_em=new Date().toISOString();return p;});
        this._validarDatasETurmas(preparados,cacheTurmas);this._validarLimiteUC(preparados);this._validarConflitos(preparados);
        const refs=preparados.map(()=>window.db.collection(this.colecaoEncontros).doc()), grupos=[];
        for(let i=0;i<preparados.length;i++){const p=preparados[i],ref=refs[i],logRef=window.db.collection('Alterações').doc();grupos.push([b=>b.set(ref,p),b=>b.set(logRef,this._logAlteracao({...p,id:ref.id},'Redistribuir'))]);}
        const patchesHoras=this._anexarPatchesHoras(grupos,preparados.map(depois=>({antes:null,depois})));await this._commitGrupos(grupos);this._sincronizarPatchesHoras(patchesHoras);preparados.forEach((p,i)=>window.Store.upsertLocal('encontros',{id:refs[i].id,...p}));return preparados.length;
    },
    async salvarEdicaoEmLote(alvos, payload, cacheTurmas) {
        await window.Store.garantirPronto();if(!Array.isArray(alvos)||!alvos.length)throw new Error('Selecione ao menos uma data ou encontro.');
        const encontrados=window.Store.dados.encontros||[], antigos=[], preparados=[];
        for(const a of alvos){const t=this._buscarTurma(cacheTurmas,a.id_turma);const old=a.id?encontrados.find(e=>e.id===a.id):null;if(a.id&&(!old||old.id_turma!==a.id_turma))throw new Error('Um dos encontros selecionados não foi encontrado para esta turma.');if(old&&old.data!==a.data)throw new Error('A data do encontro selecionado mudou; atualize o mapa.');const p=this._normalizarEncontro({...payload,id_turma:a.id_turma,data:a.data},t);p.SS=false;p.SGO=false;if(!old)p.criado_em=new Date().toISOString();antigos.push(old);preparados.push(p);}
        const ids=new Set(antigos.filter(Boolean).map(e=>e.id));this._validarDatasETurmas(preparados,cacheTurmas,ids);this._validarLimiteUC(preparados,ids);this._validarConflitos(preparados,ids);
        const grupos=[],refs=[];
        for(let i=0;i<preparados.length;i++){const p=preparados[i],old=antigos[i],ref=old?this._docRefEncontro(old.id):window.db.collection(this.colecaoEncontros).doc();refs.push(ref);const full={...p,...(old?.criado_em?{criado_em:old.criado_em}:{})};const logRef=window.db.collection('Alterações').doc(),tipo=this._tipoAlteracao(old,full);grupos.push([b=>old?b.update(ref,p):b.set(ref,p),b=>b.set(logRef,this._logAlteracao({...full,id:ref.id},tipo,old))]);preparados[i]=full;}
        const patchesHoras=this._anexarPatchesHoras(grupos,preparados.map((depois,i)=>({antes:antigos[i],depois})));await this._commitGrupos(grupos);this._sincronizarPatchesHoras(patchesHoras);preparados.forEach((p,i)=>window.Store.upsertLocal('encontros',{...p,id:refs[i].id}));return preparados.length;
    },
    async salvarEncontro(dados, cacheTurmas, encontroId=null) {
        await window.Store.garantirPronto();const turma=this._buscarTurma(cacheTurmas,dados.id_turma),old=encontroId?(window.Store.dados.encontros||[]).find(e=>e.id===encontroId):null;if(encontroId&&(!old||old.id_turma!==turma.id))throw new Error('Encontro não encontrado para esta turma.');
        const p=this._normalizarEncontro(dados,turma);p.SS=false;p.SGO=false;const ids=new Set(old?[old.id]:[]);this._validarDatasETurmas([p],cacheTurmas,ids);this._validarLimiteUC([p],ids);this._validarConflitos([p],ids);
        const ref=old?this._docRefEncontro(old.id):window.db.collection(this.colecaoEncontros).doc();p.atualizado_em=new Date().toISOString();if(!old)p.criado_em=p.atualizado_em;const logRef=window.db.collection('Alterações').doc(),batch=window.db.batch();if(old)batch.update(ref,p);else batch.set(ref,p);batch.set(logRef,this._logAlteracao({...p,id:ref.id},this._tipoAlteracao(old,p),old));const patchesHoras=this._calcularPatchesHoras([{antes:old,depois:p}]);for(const [idTurma,patch] of patchesHoras)batch.update(window.db.collection('turmas').doc(idTurma),patch);await batch.commit();this._sincronizarPatchesHoras(patchesHoras);window.Store.upsertLocal('encontros',{...p,id:ref.id});
    },
    async salvarMovimentos(movimentos, cacheTurmas, excecoes=[]) {
        await window.Store.garantirPronto();if(!Array.isArray(movimentos)||!movimentos.length)return;
        const store=window.Store.dados.encontros||[],porId=new Map(store.map(e=>[e.id,e])),ids=new Set(movimentos.map(m=>m.id));if(ids.size!==movimentos.length)throw new Error('Encontro duplicado na operação.');
        const preparados=[],antigos=[],mudancasAgenda=[];
        for(const m of movimentos){const old=porId.get(m.id);if(!old)throw new Error('Encontro não encontrado.');const move=m.data&&m.data!==old.data;if(move){const turma=this._buscarTurma(cacheTurmas,old.id_turma);this._validarEdicao(turma);if(old.tipo==='cancelamento')throw new Error('Cancelamentos não podem ser movidos.');if(!this._dataValida(m.data))throw new Error('Data inválida.');if((turma.d_inicio&&m.data<turma.d_inicio)||(turma.d_termino&&m.data>turma.d_termino))throw new Error('Data fora do período da turma.');if(this._excecaoAtiva(m.data,turma))throw new Error(`A data ${m.data} está bloqueada por exceção.`);const p={...old,data:m.data,SS:false,SGO:false,atualizado_em:new Date().toISOString()};preparados.push(p);mudancasAgenda.push(true);}else{this._validarFlags();const p={...old};if(Object.prototype.hasOwnProperty.call(m,'SS'))p.SS=m.SS===true;if(Object.prototype.hasOwnProperty.call(m,'SGO'))p.SGO=m.SGO===true;p.atualizado_em=new Date().toISOString();preparados.push(p);mudancasAgenda.push(false);}antigos.push(old);}
        const candidatos=preparados.filter((_,i)=>mudancasAgenda[i]);if(candidatos.length){const chaves=new Set();for(const p of candidatos){const k=`${p.id_turma}|${p.data}`;if(chaves.has(k)||store.some(e=>!ids.has(e.id)&&`${e.id_turma}|${e.data}`===k))throw new Error(`Data da turma já ocupada: ${p.data}.`);chaves.add(k);this._validarDocentes(p,(window.Store.dados.turmas||[]).find(t=>t.id===p.id_turma));}this._validarConflitos(candidatos,ids);}
        const grupos=[];for(let i=0;i<preparados.length;i++){const p=preparados[i],old=antigos[i];if(!mudancasAgenda[i]&&p.SS===old.SS&&p.SGO===old.SGO)continue;const ref=this._docRefEncontro(old.id),patch=mudancasAgenda[i]?{data:p.data,SS:false,SGO:false,atualizado_em:p.atualizado_em}:{SS:p.SS,SGO:p.SGO,atualizado_em:p.atualizado_em};if(mudancasAgenda[i]){const logRef=window.db.collection('Alterações').doc();grupos.push([b=>b.update(ref,patch),b=>b.set(logRef,this._logAlteracao(p,'Redistribuir',old))]);}else grupos.push([b=>b.update(ref,patch)]);}
        const patchesHoras=this._anexarPatchesHoras(grupos,preparados.map((depois,i)=>mudancasAgenda[i]?({antes:antigos[i],depois}):null).filter(Boolean));await this._commitGrupos(grupos);this._sincronizarPatchesHoras(patchesHoras);preparados.forEach(p=>window.Store.upsertLocal('encontros',p));
    },
    async moverEncontro(encontro,novaData,cacheTurmas){return this.salvarMovimentos([{id:encontro.id,id_turma:encontro.id_turma,data:novaData}],cacheTurmas);},
    async atualizarFlagsEncontro(encontroId, flags) {
        await window.Store.garantirPronto();this._validarFlags();const encontro=(window.Store.dados.encontros||[]).find(e=>e.id===encontroId);if(!encontro)throw new Error('Encontro não encontrado.');const patch={};for(const key of ['SS','SGO'])if(Object.prototype.hasOwnProperty.call(flags||{},key))patch[key]=flags[key]===true;if(!Object.keys(patch).length)throw new Error('Nenhum campo SS/SGO válido foi informado.');patch.atualizado_em=new Date().toISOString();await this._docRefEncontro(encontroId).update(patch);window.Store.upsertLocal('encontros',{...encontro,...patch});
    },
    async atualizarFlagsEncontrosLote(idTurma, ids, flags) {
        await window.Store.garantirPronto();
        if(!['apoio','admin'].includes(window.usuarioAtual?.cargo))throw new Error('Somente Apoio Técnico ou Admin pode aplicar SS/SGO em lote.');
        if(!(window.Store.dados.turmas||[]).some(t=>t.id===idTurma))throw new Error('Turma não encontrada ou sem acesso.');
        const patch={};for(const key of ['SS','SGO'])if(Object.prototype.hasOwnProperty.call(flags||{},key)){if(typeof flags[key]!=='boolean')throw new Error(`Valor inválido para ${key}.`);patch[key]=flags[key];}
        if(!Object.keys(patch).length)throw new Error('Escolha ativar ou desativar SS ou SGO.');
        const idsUnicos=[...new Set(Array.isArray(ids)?ids:[])];if(!idsUnicos.length)throw new Error('Não há encontros selecionados para atualizar.');
        const todos=window.Store.dados.encontros||[],porId=new Map(todos.map(e=>[e.id,e]));
        const encontros=idsUnicos.map(id=>porId.get(id));
        if(encontros.some(e=>!e||e.id_turma!==idTurma||e.tipo==='cancelamento'))throw new Error('Um encontro alvo não está mais disponível; atualize o mapa e tente novamente.');
        const atualizado_em=new Date().toISOString(),alterados=encontros.filter(e=>Object.entries(patch).some(([k,v])=>e[k]!==v)).map(e=>({...e,...patch,atualizado_em}));
        if(!alterados.length)return [];
        const grupos=alterados.map(e=>[batch=>batch.update(this._docRefEncontro(e.id),{...patch,atualizado_em})]);
        await this._commitGrupos(grupos);alterados.forEach(e=>window.Store.upsertLocal('encontros',e));return alterados;
    },
    _hojeISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;},
    async excluirEncontro(encontro,cacheTurmas){
        await window.Store.garantirPronto();const turma=this._buscarTurma(cacheTurmas,encontro.id_turma);this._validarEdicao(turma);const atual=(window.Store.dados.encontros||[]).find(e=>e.id===encontro.id);if(!atual)throw new Error('Encontro não encontrado.');if(atual.tipo==='cancelamento'||atual.data<=this._hojeISO())throw new Error('Só é permitido excluir encontros futuros; cancelamentos, hoje e datas passadas são preservados.');const logRef=window.db.collection('Alterações').doc(),batch=window.db.batch();batch.set(logRef,this._logAlteracao(atual,'Excluir',atual));batch.delete(this._docRefEncontro(atual.id));const patchesHoras=this._calcularPatchesHoras([{antes:atual,depois:null}]);for(const [idTurma,patch] of patchesHoras)batch.update(window.db.collection('turmas').doc(idTurma),patch);await batch.commit();this._sincronizarPatchesHoras(patchesHoras);window.Store.removerLocal('encontros',atual.id);
    },
    async excluirEncontrosSelecionados(alvos,cacheTurmas){
        await window.Store.garantirPronto();if(!Array.isArray(alvos)||!alvos.length)throw new Error('Não há encontros selecionados para excluir.');
        const encontros=window.Store.dados.encontros||[],vistos=new Set(),docs=[];
        for(const alvo of alvos){if(!alvo.id||vistos.has(alvo.id))continue;vistos.add(alvo.id);const atual=encontros.find(e=>e.id===alvo.id);if(!atual||atual.id_turma!==alvo.id_turma||atual.data!==alvo.data)throw new Error('Um encontro selecionado mudou ou não está mais disponível; atualize o mapa.');this._buscarTurma(cacheTurmas,atual.id_turma);if(atual.tipo==='cancelamento'||atual.data<=this._hojeISO())throw new Error('A exclusão em lote considera somente encontros de datas futuras; cancelamentos, hoje e datas passadas são preservados.');docs.push(atual);}
        if(!docs.length)throw new Error('Selecione ao menos um encontro existente em data futura.');
        const grupos=docs.map(encontro=>{const logRef=window.db.collection('Alterações').doc();return[b=>b.set(logRef,this._logAlteracao(encontro,'Excluir',encontro)),b=>b.delete(this._docRefEncontro(encontro.id))];});
        const patchesHoras=this._anexarPatchesHoras(grupos,docs.map(antes=>({antes,depois:null})));await this._commitGrupos(grupos);this._sincronizarPatchesHoras(patchesHoras);docs.forEach(encontro=>window.Store.removerLocal('encontros',encontro.id));return docs.length;
    },
    async excluirEncontrosDaUC(idTurma,idUC,cacheTurmas){
        await window.Store.garantirPronto();const turma=this._buscarTurma(cacheTurmas,idTurma);if(!idUC)throw new Error('Selecione uma UC antes de remover encontros.');const todas=idUC==='TODAS',uc=(turma.ucs||[]).find(x=>(x.id_uc_base||x.id)===idUC);if(!todas&&!uc)throw new Error('A UC selecionada não pertence a esta turma.');const docs=(window.Store.dados.encontros||[]).filter(e=>e.id_turma===turma.id&&e.tipo!=='cancelamento'&&e.data>this._hojeISO()&&(todas||e.id_uc===idUC));const grupos=docs.map(d=>{const logRef=window.db.collection('Alterações').doc();return[b=>b.set(logRef,this._logAlteracao(d,'Excluir',d)),b=>b.delete(this._docRefEncontro(d.id))];});const patchesHoras=this._anexarPatchesHoras(grupos,docs.map(antes=>({antes,depois:null})));await this._commitGrupos(grupos);this._sincronizarPatchesHoras(patchesHoras);docs.forEach(d=>window.Store.removerLocal('encontros',d.id));return docs.length;
    },
    _diaSemanaNumero(valor){if(Number.isInteger(valor))return valor;const v=this._norm(valor);if(/^[0-6]$/.test(v))return Number(v);const mapa={'domingo':0,'dom':0,'segunda':1,'segunda-feira':1,'seg':1,'terca':2,'terca-feira':2,'ter':2,'quarta':3,'quarta-feira':3,'qua':3,'quinta':4,'quinta-feira':4,'qui':4,'sexta':5,'sexta-feira':5,'sex':5,'sabado':6,'sabado-feira':6,'sab':6};return mapa[v]??mapa[v.slice(0,3)]??null;},
    async salvarExcecoesComReagendamento(excecoes, removerDatas=[]) {
        await window.Store.garantirPronto();if(!['root','admin'].includes(window.usuarioAtual?.cargo))throw new Error('Somente root ou admin podem alterar o calendário.');if(!Array.isArray(excecoes))throw new Error('Exceções inválidas.');
        const novas=excecoes.map(x=>({data:(x.data||'').trim(),tipo:(x.tipo||'').trim(),excecao:(x.excecao||'').trim(),descricao:(x.descricao||'').trim()}));const datas=new Set();for(const x of novas){if(!this._dataValida(x.data)||!x.tipo||!x.excecao)throw new Error('Informe data, tipo e descrição válidos para a exceção.');if(datas.has(x.data))throw new Error(`A data ${x.data} aparece mais de uma vez.`);datas.add(x.data);}
        const remover=new Set(removerDatas||[]),atuais=window.Store.dados.excecoes||[];for(const x of novas)if(atuais.some(e=>(e.data||e.id)===x.data&&!remover.has(x.data)))throw new Error(`Já existe exceção em ${x.data}.`);
        const turmas=window.Store.dados.turmas||[],lista=window.Store.dados.encontros||[];const afetados=lista.filter(e=>datas.has(e.data)&&e.tipo!=='cancelamento'&&!((turmas.find(t=>t.id===e.id_turma)?.excecoes_ignoradas)||[]).includes(e.data)).sort((a,b)=>a.data.localeCompare(b.data));const afetadosIds=new Set(afetados.map(e=>e.id));const reservadas=new Set(lista.filter(e=>!afetadosIds.has(e.id)).map(e=>`${e.id_turma}|${e.data}`));const movimentos=[],planejados=[];
        for(const e of afetados){const turma=turmas.find(t=>t.id===e.id_turma);if(!turma)throw new Error(`Turma ausente para encontro ${e.id}.`);let inicio=new Date(`${e.data}T12:00:00`),limite=new Date(`${turma.d_termino||e.data}T12:00:00`);limite.setDate(limite.getDate()+370);let slot=null;for(let d=new Date(inicio);d<=limite;d.setDate(d.getDate()+1)){if(d<=inicio)continue;const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;if(datas.has(iso)||atuais.some(x=>(x.data||x.id)===iso&&!remover.has(iso))||reservadas.has(`${turma.id}|${iso}`))continue;const dias=(turma.dias_semana||[]).map(x=>this._diaSemanaNumero(x)).filter(x=>x!==null);if(dias.length&&!dias.includes(d.getDay()))continue;const candidato={...e,data:iso,SS:false,SGO:false};try{this._validarConflitos([...planejados,candidato],afetadosIds);slot=iso;break;}catch(err){if(!/Conflito de agenda docente/.test(err.message))throw err;}}
            if(!slot)throw new Error(`Não foi encontrada data livre para reagendar ${e.uc_referencia||''} da turma ${turma.referencia}, após ${e.data}.`);reservadas.add(`${turma.id}|${slot}`);const mov={...e,data:slot,SS:false,SGO:false,atualizado_em:new Date().toISOString()};movimentos.push({antes:e,depois:mov});planejados.push(mov);}
        const grupos=[];for(const x of novas){const ref=window.db.collection(this.colecaoExcecoes).doc(x.data);grupos.push([b=>b.set(ref,x)]);}for(const data of remover){if(!datas.has(data))grupos.push([b=>b.delete(window.db.collection(this.colecaoExcecoes).doc(data))]);}for(const {antes,depois} of movimentos){const logRef=window.db.collection('Alterações').doc();grupos.push([b=>b.update(this._docRefEncontro(antes.id),{data:depois.data,SS:false,SGO:false,atualizado_em:depois.atualizado_em}),b=>b.set(logRef,this._logAlteracao(depois,'Redistribuir',antes))]);}
        const patchesHoras=this._anexarPatchesHoras(grupos,movimentos.map(({antes,depois})=>({antes,depois})));await this._commitGrupos(grupos);this._sincronizarPatchesHoras(patchesHoras);for(const x of remover)if(!datas.has(x))window.Store.removerLocal('excecoes',x);for(const x of novas)window.Store.upsertLocal('excecoes',{id:x.data,...x});for(const {depois} of movimentos)window.Store.upsertLocal('encontros',depois);return movimentos.length;
    },
});
