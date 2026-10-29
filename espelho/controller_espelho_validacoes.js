// Validações de agenda: docentes, conflitos de horário/interjornada, datas, turmas e limite de encontros por UC.
Object.assign(window.ControllerEspelho, {
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
});
