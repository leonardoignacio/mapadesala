// Progresso de horas: cálculo e sincronização das horas apuradas por UC/turma.
Object.assign(window.ControllerEspelho, {
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
});
