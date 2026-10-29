// Controller do Mapa (base): coleções, autorização por perfil/área, carga de dados e normalização de encontros.
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
        return !ignoradas.includes(data) && (window.Store.dados.excecoes || []).some(x => (x.data === data || x.id === data) && window.Util.excecaoAplica(x, turma));
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
    _hojeISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;},
});
