// ./espelho/controller_espelho.js - Persistência e regras do Mapa de Aulas
window.ControllerEspelho = {
    colecaoEncontros: 'encontros',

    _areasUsuario() {
        const areas = window.usuarioAtual?.areas || [];
        return Array.isArray(areas) ? areas : [];
    },

    _norm(v) {
        return (v || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    },

    _turmaPermitida(turma) {
        const u = window.usuarioAtual || {};
        if (u.cargo !== 'docente') return true;
        const areas = this._areasUsuario();
        if (areas.some(a => this._norm(typeof a==='object'?(a.area||a.nome_area||a.nome||a.referencia||a.tipo):a)==='todas')) return true;
        const permitidas = new Set(areas.map(a => this._norm(typeof a==='object'?(a.area||a.nome_area||a.nome||a.referencia||a.tipo):a)));
        return [turma?.area, turma?.curso_area, turma?.curso_tipo].some(a => a && permitidas.has(this._norm(typeof a==='object'?(a.area||a.nome_area||a.nome||a.referencia||a.tipo):a)));
    },

    _validarEdicao(turma) {
        if (!['root', 'admin', 'tecnico', 'docente'].includes(window.usuarioAtual?.cargo)) {
            throw new Error('Seu perfil possui acesso somente para leitura.');
        }
        if (!turma || !this._turmaPermitida(turma)) {
            throw new Error('Você não tem permissão para acessar ou alterar esta turma/área.');
        }
    },

    async carregarBase() {
        const [turmas, cursos, usuariosSnap, encontrosSnap, excecoesSnap, salas] = await Promise.all([
            window.ControllerTurmaListar.listarTurmas(),
            window.ControllerTurmaListar.listarCursosBase(),
            window.db.collection('usuarios').get(),
            window.db.collection(this.colecaoEncontros).get(),
            window.db.collection('datas_excecoes').get(),
            window.db.collection('salas_aula').get().catch(() => window.db.collection('salas_laboratorios').get().catch(() => null))
        ]);
        const mapaCursos = new Map(cursos.map(c => [c.id, c]));
        const todasTurmas = turmas.map(t => ({...t, curso_area: mapaCursos.get(t.id_curso)?.area || '', curso_tipo: mapaCursos.get(t.id_curso)?.tipo || ''}));
        const turmasPermitidas = todasTurmas.filter(t => this._turmaPermitida(t));
        const idsPermitidos = new Set(turmasPermitidas.map(t => t.id));
        const todasExcecoes = excecoesSnap.docs.map(d => ({id: d.id, ...d.data()}));
        const encontros = encontrosSnap.docs.map(d => ({id: d.id, ...d.data()})).filter(e => idsPermitidos.has(e.id_turma));
        const usuarios = usuariosSnap.docs.map(d => ({id: d.id, ...d.data()}));
        const todasSalas = salas ? salas.docs.map(d => ({id: d.id, ...d.data()})) : [];
        const ativo = u => u.status === 'ativo';
        const docentes = usuarios.filter(u => ativo(u) && this._norm(u.cargo) === 'docente' && Array.isArray(u.perfis) && u.perfis.some(p => this._norm(p) === 'docente'));
        return {turmas: turmasPermitidas, cursos, encontros, excecoes: todasExcecoes, docentes, salas: todasSalas};
    },

    _buscarTurma(cacheTurmas, idTurma) {
        const turma = (cacheTurmas || []).find(t => t.id === idTurma);
        this._validarEdicao(turma);
        return turma;
    },

    _normalizarEncontro(dados, turma) {
        const uc = (turma.ucs || []).find(u => u.id_uc_base === dados.id_uc || u.id === dados.id_uc || u.referencia === dados.uc_referencia);
        if (!uc && dados.tipo !== 'cancelamento') throw new Error('Selecione uma UC vinculada à turma.');
        if (!dados.data || !/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) throw new Error('Data inválida.');
        const docentes = Array.isArray(dados.docentes) ? dados.docentes : [];
        const hInicio=dados.h_inicio||turma.h_inicio||'',hTermino=dados.h_termino||turma.h_termino||'';
        const chCalculada=window.ControllerTurmaFrm?.calcularCHEncontro(hInicio,hTermino)||0;
        if(dados.tipo!=='cancelamento'&&chCalculada<=0)throw new Error('O horário de término deve ser posterior ao horário de início.');
        return {
            id_turma: turma.id,
            turma_referencia: turma.referencia || '',
            data: dados.data,
            tipo: dados.tipo === 'cancelamento' ? 'cancelamento' : 'aula',
            id_uc: uc?.id_uc_base || uc?.id || '',
            uc_referencia: uc?.referencia || '',
            uc_titulo: uc?.titulo || '',
            uc_carga_horaria: Number(uc?.carga_horaria) || 0,
            h_inicio: hInicio,
            h_termino: hTermino,
            ch_encontro: chCalculada || Number(dados.ch_encontro) || Number(turma.ch_encontro) || 0,
            modalidade: dados.modalidade === 'Remoto' ? 'Remoto' : 'Presencial',
            docentes: docentes.map(d => ({id: d.id, email: d.email, nome: d.nome_completo || `${d.nome || ''} ${d.sobrenome || ''}`.trim() || d.email})),
            sala_id: dados.sala_id || '',
            sala_nome: dados.sala_nome || '',
            SS: dados.SS === true,
            SGO: dados.SGO === true,
            descricao: (dados.descricao || '').trim(),
            atualizado_em: new Date().toISOString()
        };
    },

    async ignorarExcecaoTurma(idTurma, dataExcecao, cacheTurmas) {
        const turma = this._buscarTurma(cacheTurmas, idTurma);
        this._validarEdicao(turma);
        const ignoradas = Array.isArray(turma.excecoes_ignoradas) ? [...turma.excecoes_ignoradas] : [];
        if (!ignoradas.includes(dataExcecao)) {
            ignoradas.push(dataExcecao);
            await window.db.collection('turmas').doc(idTurma).update({ excecoes_ignoradas: ignoradas, atualizado_em: new Date().toISOString() });
            turma.excecoes_ignoradas = ignoradas;
        }
    },

    async salvarEncontro(dados, cacheTurmas, encontroId = null) {
        const turma = this._buscarTurma(cacheTurmas, dados.id_turma);
        const payload = this._normalizarEncontro(dados, turma);
        if (payload.tipo === 'aula') {
            const uc = (turma.ucs || []).find(u => (u.id_uc_base || u.id) === payload.id_uc);
            const chEncontro = Number(payload.ch_encontro) || Number(turma.ch_encontro) || 0;
            const limite = uc && chEncontro > 0 ? Math.ceil((Number(uc.carga_horaria) || 0) / chEncontro) : 0;
            const docsDaTurma = await window.db.collection(this.colecaoEncontros).where('id_turma', '==', turma.id).get();
            const existentes = docsDaTurma.docs.filter(d => d.id !== encontroId && d.data().tipo !== 'cancelamento' && d.data().id_uc === payload.id_uc).length;
            if (limite && existentes >= limite) throw new Error(`Esta UC já atingiu o total de ${limite} encontro(s) previsto(s).`);
            const areaCurso = turma.curso_area || turma.area || turma.curso_tipo;
            const nomeAreaCurso = typeof areaCurso==='object'?(areaCurso.area||areaCurso.nome_area||areaCurso.nome||areaCurso.referencia||areaCurso.tipo):areaCurso;
            const areasTurma = nomeAreaCurso ? [this._norm(nomeAreaCurso)] : [];
            for (const docente of payload.docentes) {
                const snap = await window.db.collection('usuarios').doc(docente.id).get();
                if (!snap.exists) throw new Error('Um dos docentes selecionados não foi encontrado.');
                const u = snap.data(); const perfis = Array.isArray(u.perfis) ? u.perfis : [];
                if (u.status !== 'ativo' || this._norm(u.cargo) !== 'docente' || !perfis.some(p => this._norm(p) === 'docente')) throw new Error('Somente usuários ativos cujo perfil principal é Docente podem ser escalados.');
                const areasDocente = Array.isArray(u.areas) ? u.areas.map(a => this._norm(typeof a==='object'?(a.area||a.nome_area||a.nome||a.referencia||a.tipo):a)) : [];
                if (!areasDocente.includes('todas') && !areasDocente.some(a => areasTurma.includes(a))) throw new Error('O docente selecionado não possui habilitação para a área desta turma.');
            }
        }
        const duplicados = (await window.db.collection(this.colecaoEncontros).where('id_turma', '==', turma.id).where('data', '==', payload.data).get()).docs.filter(d => d.id !== encontroId);
        if (duplicados.length) throw new Error('Esta turma já possui um encontro ou cancelamento nessa data.');
        if (encontroId) await window.db.collection(this.colecaoEncontros).doc(encontroId).update(payload);
        else {
            payload.criado_em = new Date().toISOString();
            await window.db.collection(this.colecaoEncontros).add(payload);
        }
    },

    async moverEncontro(encontro, novaData, cacheTurmas) {
        const turma = this._buscarTurma(cacheTurmas, encontro.id_turma);
        this._validarEdicao(turma);
        if (encontro.tipo === 'cancelamento') throw new Error('Cancelamentos não podem ser arrastados; edite-os pela data original.');
        if ((turma.d_inicio && novaData < turma.d_inicio) || (turma.d_termino && novaData > turma.d_termino)) throw new Error('A nova data precisa estar dentro do período da turma.');
        const ocupada = (await window.db.collection(this.colecaoEncontros).where('id_turma', '==', turma.id).where('data', '==', novaData).get()).docs.some(d => d.id !== encontro.id);
        if (ocupada) throw new Error('A nova data já possui um encontro ou cancelamento desta turma.');
        await window.db.collection(this.colecaoEncontros).doc(encontro.id).update({data: novaData, atualizado_em: new Date().toISOString()});
    },

    async salvarMovimentos(movimentos, cacheTurmas, excecoes = []) {
        if (!Array.isArray(movimentos) || !movimentos.length) return;
        const ids = movimentos.map(m => m.id);
        if (new Set(ids).size !== ids.length) throw new Error('A lista de alterações contém o mesmo encontro mais de uma vez.');
        const snapTodos = await window.db.collection(this.colecaoEncontros).get();
        const docsPorId = new Map(snapTodos.docs.map(d => [d.id, d]));
        const idsMovidos = new Set(ids);
        const ocupadas = new Set(snapTodos.docs.filter(d => !idsMovidos.has(d.id)).map(d => `${d.data().id_turma}|${d.data().data}`));
        const datasExcecao = new Set((excecoes || []).map(x => x.data));
        for (const m of movimentos) {
            const turma = this._buscarTurma(cacheTurmas, m.id_turma);
            const docOriginal = docsPorId.get(m.id);
            if (!docOriginal || docOriginal.data().id_turma !== turma.id || docOriginal.data().tipo === 'cancelamento') throw new Error('Um dos encontros a salvar não é válido para esta turma. Atualize o mapa e tente novamente.');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(m.data)) throw new Error(`Data inválida para o encontro ${m.id}.`);
            if ((turma.d_inicio && m.data < turma.d_inicio) || (turma.d_termino && m.data > turma.d_termino)) throw new Error(`A data ${m.data} está fora do período da turma.`);
            const ignoradas = Array.isArray(turma.excecoes_ignoradas) ? turma.excecoes_ignoradas : [];
            const excAtiva = datasExcecao.has(m.data) && !ignoradas.includes(m.data);
            if (excAtiva) throw new Error(`A data ${m.data} é uma exceção do calendário e não pode receber encontro.`);
            const chave = `${turma.id}|${m.data}`;
            if (ocupadas.has(chave)) throw new Error(`Conflito: ${m.data} da turma ${turma.referencia} já está ocupada por outro encontro.`);
            ocupadas.add(chave);
        }
        for (let i = 0; i < movimentos.length; i += 450) {
            const batch = window.db.batch();
            movimentos.slice(i, i + 450).forEach(m => batch.update(window.db.collection(this.colecaoEncontros).doc(m.id), {data: m.data, SS: false, SGO: false, atualizado_em: new Date().toISOString()}));
            await batch.commit();
        }
    },

    async atualizarFlagsEncontro(encontroId, flags, cacheTurmas) {
        const snap=await window.db.collection(this.colecaoEncontros).doc(encontroId).get();
        if(!snap.exists)throw new Error('O encontro não foi encontrado. Atualize o mapa e tente novamente.');
        const encontro={id:snap.id,...snap.data()},turma=this._buscarTurma(cacheTurmas,encontro.id_turma);
        this._validarEdicao(turma);
        const patch={};
        for(const campo of ['SS','SGO'])if(Object.prototype.hasOwnProperty.call(flags||{},campo))patch[campo]=flags[campo]===true;
        if(!Object.keys(patch).length)throw new Error('Nenhum campo SS/SGO válido foi informado.');
        patch.atualizado_em=new Date().toISOString();
        await window.db.collection(this.colecaoEncontros).doc(encontroId).update(patch);
    },

    async excluirEncontro(encontro, cacheTurmas) {
        const turma = this._buscarTurma(cacheTurmas, encontro.id_turma);
        this._validarEdicao(turma);
        await window.db.collection(this.colecaoEncontros).doc(encontro.id).delete();
    },

    async excluirEncontrosDaUC(idTurma, idUC, cacheTurmas) {
        const turma=this._buscarTurma(cacheTurmas,idTurma);
        this._validarEdicao(turma);
        if(!idUC) throw new Error('Selecione uma UC antes de remover encontros.');
        const todas=idUC==='TODAS';
        const uc=todas?null:(turma.ucs||[]).find(x=>(x.id_uc_base||x.id)===idUC);
        if(!todas&&!uc) throw new Error('A UC selecionada não pertence a esta turma.');
        const snap=await window.db.collection(this.colecaoEncontros).where('id_turma','==',turma.id).get();
        const agora=new Date(),hoje=`${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}-${String(agora.getDate()).padStart(2,'0')}`;
        const docs=snap.docs.filter(d=>{const e=d.data();return e.tipo!=='cancelamento'&&e.data>hoje&&(todas||e.id_uc===idUC);});
        for(let i=0;i<docs.length;i+=450){
            const batch=window.db.batch();
            docs.slice(i,i+450).forEach(d=>batch.delete(window.db.collection(this.colecaoEncontros).doc(d.id)));
            await batch.commit();
        }
        return docs.length;
    },

    async salvarSala(dados) {
        if (!['root','admin','tecnico'].includes(window.usuarioAtual?.cargo)) throw new Error('Seu perfil não pode cadastrar recursos.');
        const referencia=(dados.referencia||'').trim();
        const tipo=dados.tipo==='Laboratório'?'Laboratório':'Comum';
        const cadeiras=Number(dados.numero_cadeiras);
        if(!referencia) throw new Error('Informe a referência da sala.');
        if(!Number.isInteger(cadeiras)||cadeiras<0) throw new Error('O número de cadeiras deve ser um inteiro não negativo.');
        const salaRef=window.db.collection('salas_aula');
        const existente=await salaRef.where('referencia','==',referencia).get();
        if(!existente.empty) throw new Error('Já existe uma sala com esta referência.');
        await salaRef.add({referencia,tipo,numero_cadeiras:cadeiras,observacoes:(dados.observacoes||'').trim(),criado_em:new Date().toISOString(),atualizado_em:new Date().toISOString()});
    },

    async atualizarSala(salaId,dados) {
        if (!['root','admin','tecnico'].includes(window.usuarioAtual?.cargo)) throw new Error('Seu perfil não pode editar recursos.');
        if(!salaId) throw new Error('Sala inválida para edição.');
        const referencia=(dados.referencia||'').trim(),tipo=dados.tipo==='Laboratório'?'Laboratório':'Comum',cadeiras=Number(dados.numero_cadeiras);
        if(!referencia) throw new Error('Informe a referência da sala.');
        if(!Number.isInteger(cadeiras)||cadeiras<0) throw new Error('O número de cadeiras deve ser um inteiro não negativo.');
        const salaRef=window.db.collection('salas_aula'),atual=await salaRef.doc(salaId).get();
        if(!atual.exists) throw new Error('Esta sala não existe mais. Atualize a lista e tente novamente.');
        const duplicada=await salaRef.where('referencia','==',referencia).get();
        if(duplicada.docs.some(d=>d.id!==salaId)) throw new Error('Já existe outra sala com esta referência.');
        await salaRef.doc(salaId).update({referencia,tipo,numero_cadeiras:cadeiras,observacoes:(dados.observacoes||'').trim(),atualizado_em:new Date().toISOString()});
    },

    async excluirSala(salaId) {
        if (!['root','admin','tecnico'].includes(window.usuarioAtual?.cargo)) throw new Error('Seu perfil não pode excluir recursos.');
        if(!salaId) throw new Error('Sala inválida para exclusão.');
        const ref=window.db.collection('salas_aula'),sala=await ref.doc(salaId).get();
        if(!sala.exists) throw new Error('Esta sala não existe mais. Atualize a lista e tente novamente.');
        const usados=await window.db.collection(this.colecaoEncontros).where('sala_id','==',salaId).get();
        if(!usados.empty) throw new Error('Esta sala está vinculada a um ou mais encontros e não pode ser excluída. Remova o vínculo dos encontros antes de tentar novamente.');
        await ref.doc(salaId).delete();
    }
};