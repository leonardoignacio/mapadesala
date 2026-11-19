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
        const deltaPorTurma=new Map();
        const somar=(mapa,idTurma,idUC,delta)=>{
            if(!mapa.has(idTurma))mapa.set(idTurma,new Map());
            const ucs=mapa.get(idTurma);ucs.set(idUC,(ucs.get(idUC)||0)+delta);
        };
        for(const par of pares||[]){
            for(const [e,sinal] of [[par?.antes,-1],[par?.depois,1]]){
                const horas=this._horasApuradasEncontro(e);
                if(horas&&e.id_turma&&e.id_uc)somar(deltaPorTurma,e.id_turma,e.id_uc,sinal*horas);
            }
        }
        for(const [idTurma,deltas] of deltaPorTurma){
            for(const [idUC,delta] of deltas)if(Math.abs(delta)<0.0001)deltas.delete(idUC);
            if(!deltas.size)deltaPorTurma.delete(idTurma);
        }
        if(!deltaPorTurma.size)return new Map();

        // Uma única varredura pelos encontros substitui a varredura repetida para cada UC.
        const horasBasePorTurma=new Map();
        for(const encontro of window.Store.dados.encontros||[]){
            if(!encontro?.id_turma||!encontro?.id_uc)continue;
            const horas=this._horasApuradasEncontro(encontro);
            if(horas>0)somar(horasBasePorTurma,encontro.id_turma,encontro.id_uc,horas);
        }

        const patches=new Map(),turmas=window.Store.dados.turmas||[];
        for(const [idTurma,deltas] of deltaPorTurma){
            const turma=turmas.find(t=>t.id===idTurma);if(!turma||!Array.isArray(turma.ucs))continue;
            const horasBaseUC=horasBasePorTurma.get(idTurma)||new Map();
            if(!turma.ucs.length&&this._cursoLivreCurtaDuracao(turma)){
                const carga=Number(String(turma.ch_total_curso??(window.Store.dados.cursos||[]).find(c=>c.id===turma.id_curso)?.carga_horaria??'').replace(',','.'))||0;
                let horasTurma=0;for(const horas of horasBaseUC.values())horasTurma+=horas;
                for(const delta of deltas.values())horasTurma+=delta;
                horasTurma=Math.max(0,Math.round(horasTurma*100)/100);const pct=this._percentualHoras(horasTurma,carga),atualizado_em=new Date().toISOString();
                patches.set(idTurma,{horas_ministradas:horasTurma,horas_apuradas:horasTurma,progresso_turma:pct,progresso_calculado:pct,status:horasTurma<=0?'Não Iniciada':(carga>0&&horasTurma>=carga?'Concluída':'Em Andamento'),atualizado_em});
                continue;
            }
            const ucs=turma.ucs.map(uc=>{
                const id=uc.id_uc_base||uc.id,carga=Number(String(uc.carga_horaria??'').replace(',','.'))||0;
                const horas=Math.max(0,Math.round(((horasBaseUC.get(id)||0)+(deltas.get(id)||0))*100)/100),pct=this._percentualHoras(horas,carga);
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
