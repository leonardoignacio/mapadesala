// ./apoio/controller_apoio_alteracoes.js - Regras de negócio da lista de alterações do Apoio Técnico
// Cada registro da coleção "Alterações" é UM item: "Inserir" (lançar no SS/SGO) ou "Excluir" (retirar do SS/SGO).
window.ControllerApoioAlteracoes = {
    COLECAO: 'Alterações',
    CARGOS_PODEM_ALTERAR: ['root', 'admin', 'tecnico', 'apoio'],
    JANELA_PADRAO_DIAS: 30,

    _norm(v) { return window.Util.semAcento(v); },
    _valorArea(a) { return typeof a === 'object' && a ? (a.area || a.nome_area || a.nome || a.referencia || a.tipo || '') : a; },

    // Somente Apoio, Técnico e Admin (e Root) alteram SS/SGO; docentes apenas visualizam.
    podeAlterarFlags() { return this.CARGOS_PODEM_ALTERAR.includes(window.usuarioAtual?.cargo); },

    // Áreas habilitadas do usuário logado (nomes). "todas" libera qualquer área.
    areasDoUsuario() {
        const lista = Array.isArray(window.usuarioAtual?.areas) ? window.usuarioAtual.areas : [];
        return lista.map(a => this._valorArea(a)).filter(Boolean);
    },
    usuarioTemTodasAsAreas() {
        return ['root', 'admin'].includes(window.usuarioAtual?.cargo) || this.areasDoUsuario().some(a => this._norm(a) === 'todas');
    },
    // Áreas existentes no sistema (para o filtro): coleção de áreas + áreas das turmas.
    areasDisponiveis() {
        const nomes = new Map();
        (window.Store.dados.areas || []).forEach(a => { const n = this._valorArea(a.nome || a); if (n) nomes.set(this._norm(n), n); });
        (window.Store.dados.turmas || []).forEach(t => { const n = t.area || t.curso_area; if (n) nomes.set(this._norm(n), n); });
        return [...nomes.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
    // Filtro padrão: somente as áreas em que o usuário está habilitado (ou todas, se for o caso).
    areasPadrao() {
        if (this.usuarioTemTodasAsAreas()) return { todas: true, areas: [] };
        const minhas = this.areasDoUsuario();
        return minhas.length ? { todas: false, areas: minhas } : { todas: true, areas: [] };
    },

    desdePadraoISO() { const d = new Date(); d.setDate(d.getDate() - this.JANELA_PADRAO_DIAS); return d.toISOString(); },

    // Leitura econômica: TODAS as pendentes (qualquer idade) + o que foi criado desde "desdeISO". Duas consultas simples.
    async carregar(desdeISO) {
        const col = window.db.collection(this.COLECAO);
        const [recentes, pendentes] = await Promise.all([
            col.where('criado_em', '>=', desdeISO || this.desdePadraoISO()).get(),
            col.where('status', '==', 'Pendente').get()
        ]);
        const docs = new Map();
        [...recentes.docs || [], ...pendentes.docs || []].forEach(d => docs.set(d.id, d));
        const itens = [];
        docs.forEach(d => itens.push(...this._normalizarDoc(d)));
        return itens;
    },

    // Um documento vira 1 item (v2) ou 2 itens (registros antigos de edição: excluir o anterior + inserir o novo).
    _normalizarDoc(doc) {
        const d = doc.data(), dados = d.dados_encontro;
        if (!dados || dados.tipo === 'cancelamento') return [];
        const base = {
            docId: doc.id, criadoEm: d.criado_em || '', criadoPor: d.criado_por || '', criadoPorNome: d.criado_por_nome || '',
            realizadoEm: d.realizado_em || '', realizadoPor: d.realizado_por || '', realizadoPorNome: d.realizado_por_nome || '',
            tipo: d.tipo_evento || d.tipo || (d.acao || (d.tipo === 'Excluir' ? 'Excluir' : 'Inserir')),
            snapshot: { turmaRef: d.turma_referencia || '', oferta: d.oferta || '', area: d.area || '', numero: d.numero_aula ?? null, total: d.total_aulas ?? null }
        };
        const acao = d.acao || (d.tipo === 'Excluir' ? 'Excluir' : 'Inserir'), itens = [];
        if (!d.acao && d.dados_encontro_anterior && d.tipo !== 'Excluir') {
            itens.push({ ...base, id: `${doc.id}#ex`, virtual: 'ex', acao: 'Excluir', dados: d.dados_encontro_anterior, SSreg: d.SS_ex === true, SGOreg: d.SGO_ex === true });
        }
        itens.push({ ...base, id: doc.id, virtual: null, acao, dados, SSreg: d.SS === true, SGOreg: d.SGO === true });
        return itens;
    },

    _posicao(enc) {
        const lista = (window.Store.dados.encontros || []).filter(e => e.id_turma === enc.id_turma && e.id_uc === enc.id_uc && e.tipo !== 'cancelamento')
            .sort((a, b) => (a.data || '').localeCompare(b.data || ''));
        const i = lista.findIndex(e => e.id === enc.id);
        return i < 0 ? null : { numero: i + 1, total: lista.length };
    },

    // Completa o item com dados atuais (turma, oferta, área, nº do encontro) e o estado REAL de SS/SGO.
    // Para "Inserir", enquanto o encontro existir com os mesmos dados, SS/SGO refletem o próprio encontro (fonte única).
    enriquecer(item) {
        const dados = window.Store.dados, turma = (dados.turmas || []).find(t => t.id === item.dados.id_turma) || null;
        item.chave = window.Util.chaveEncontro(item.dados);
        item.turmaRef = turma?.referencia || item.snapshot.turmaRef || '—';
        item.oferta = turma?.oferta || item.snapshot.oferta || '';
        item.area = (turma && (turma.area || turma.curso_area)) || item.snapshot.area || '';
        let SS = item.SSreg, SGO = item.SGOreg;
        item.encontro = null; item.origemFlags = 'registro';
        if (item.acao === 'Inserir') {
            const enc = (dados.encontros || []).find(e => e.id === item.dados.id);
            if (enc && window.Util.chaveEncontro(enc) === item.chave) { item.encontro = enc; SS = enc.SS === true; SGO = enc.SGO === true; item.origemFlags = 'encontro'; }
        }
        item.SS = SS; item.SGO = SGO;
        item.situacao = (SS && SGO) ? 'Realizada' : 'Pendente';
        const pos = item.encontro ? this._posicao(item.encontro) : null;
        item.numero = pos ? pos.numero : item.snapshot.numero;
        item.total = pos ? pos.total : item.snapshot.total;
        return item;
    },

    // REGRAS: (1) uma exclusão cancela uma inclusão com exatamente os mesmos dados (e vice-versa), ambas pendentes e
    // ainda sem nenhum SS/SGO marcado; (2) alterações pendentes idênticas e repetidas são tratadas como duplicadas.
    // Processa em ordem cronológica, reproduzindo o que aconteceria em tempo real.
    classificar(itens) {
        const ordenados = [...itens].sort((a, b) => (a.criadoEm || '').localeCompare(b.criadoEm || '') || a.id.localeCompare(b.id));
        const abertos = new Map(), anulados = new Map(), duplicados = new Set();
        for (const it of ordenados) {
            const elegivel = it.situacao === 'Pendente' && !it.SS && !it.SGO;
            if (!elegivel) continue;
            const pilha = abertos.get(it.chave) || { Excluir: [], Inserir: [] }; abertos.set(it.chave, pilha);
            const oposto = it.acao === 'Excluir' ? 'Inserir' : 'Excluir';
            if (pilha[oposto].length) { const par = pilha[oposto].shift(); anulados.set(it.id, par.id); anulados.set(par.id, it.id); }
            else if (pilha[it.acao].length) duplicados.add(it.id);
            else pilha[it.acao].push(it);
        }
        const ativos = itens.filter(i => !anulados.has(i.id) && !duplicados.has(i.id));
        return { ativos, anulados: itens.filter(i => anulados.has(i.id)), duplicados: itens.filter(i => duplicados.has(i.id)), paresAnulados: anulados };
    },

    // Apaga do banco os registros anulados/duplicados (somente pendentes, sem SS/SGO marcado). Itens "virtuais" de registros
    // antigos (um documento com dois itens) não são apagados. Retorna o conjunto de docIds removidos.
    async excluirDescartadas(itens) {
        const ids = [...new Set(itens.filter(i => !i.virtual && !i.SSreg && !i.SGOreg && i.situacao === 'Pendente').map(i => i.docId))];
        for (let i = 0; i < ids.length; i += 400) {
            const batch = window.db.batch();
            ids.slice(i, i + 400).forEach(id => batch.delete(window.db.collection(this.COLECAO).doc(id)));
            await batch.commit();
        }
        return new Set(ids);
    },

    // filtros: { situacao:'Pendente'|'Realizada'|'Todas', acao:''|'Inserir'|'Excluir', areasTodas, areas:[nomes],
    //            responsavel:'' , tipoData:'encontro'|'alteracao', de:'AAAA-MM-DD', ate:'AAAA-MM-DD' }
    filtrar(itens, f) {
        const areas = new Set((f.areas || []).map(a => this._norm(a)));
        return itens.filter(it => {
            if (f.situacao && f.situacao !== 'Todas' && it.situacao !== f.situacao) return false;
            if (f.acao && it.acao !== f.acao) return false;
            if (!f.areasTodas && !areas.has(this._norm(it.area))) return false;
            if (f.responsavel && (it.realizadoPor || '') !== f.responsavel) return false;
            const dia = f.tipoData === 'alteracao' ? (it.criadoEm || '').slice(0, 10) : (it.dados.data || '');
            if (f.de && (!dia || dia < f.de)) return false;
            if (f.ate && (!dia || dia > f.ate)) return false;
            return true;
        });
    },

    ordenar(itens) {
        return [...itens].sort((a, b) => (a.situacao === b.situacao ? 0 : (a.situacao === 'Pendente' ? -1 : 1))
            || (a.dados.data || '').localeCompare(b.dados.data || '') || (a.acao === b.acao ? 0 : (a.acao === 'Excluir' ? -1 : 1))
            || (a.dados.h_inicio || '').localeCompare(b.dados.h_inicio || ''));
    },

    responsaveis(itens) {
        const m = new Map();
        itens.forEach(i => { if (i.realizadoPor) m.set(i.realizadoPor, i.realizadoPorNome || i.realizadoPor); });
        return [...m.entries()].map(([email, nome]) => ({ email, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    },

    // Marca/desmarca SS ou SGO. Em "Inserir" com o encontro ainda existente, grava também no encontro (mesmo lote).
    async alternarFlag(item, flag, valor) {
        if (!this.podeAlterarFlags()) throw new Error('Somente Apoio, Técnico ou Admin pode alterar SS e SGO.');
        if (!['SS', 'SGO'].includes(flag)) throw new Error('Marcador inválido.');
        const usuario = window.usuarioAtual || {}, agora = new Date().toISOString(), sufixo = item.virtual === 'ex' ? '_ex' : '';
        const novoSS = flag === 'SS' ? valor : item.SS, novoSGO = flag === 'SGO' ? valor : item.SGO;
        const patch = { [`SS${sufixo}`]: novoSS, [`SGO${sufixo}`]: novoSGO };
        if (!sufixo) patch.status = (novoSS && novoSGO) ? 'Realizada' : 'Pendente';
        const quem = (novoSS || novoSGO)
            ? { realizado_em: agora, realizado_por: usuario.email || '', realizado_por_nome: usuario.nome_completo || usuario.nome || usuario.email || '' }
            : { realizado_em: '', realizado_por: '', realizado_por_nome: '' };
        Object.assign(patch, quem);

        const batch = window.db.batch();
        batch.update(window.db.collection(this.COLECAO).doc(item.docId), patch);
        let encontroAtualizado = null;
        if (item.encontro) {
            encontroAtualizado = { ...item.encontro, [flag]: valor, atualizado_em: agora };
            batch.update(window.db.collection('encontros').doc(item.encontro.id), { [flag]: valor, atualizado_em: agora });
        }
        await batch.commit();

        item.SSreg = novoSS; item.SGOreg = novoSGO;
        item.realizadoEm = quem.realizado_em; item.realizadoPor = quem.realizado_por; item.realizadoPorNome = quem.realizado_por_nome;
        if (encontroAtualizado) window.Store.upsertLocal('encontros', encontroAtualizado);
        this.enriquecer(item);
        return item;
    }
};
