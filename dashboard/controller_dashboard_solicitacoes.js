// ./dashboard/controller_dashboard_solicitacoes.js - Solicitações entre perfis no Dashboard
window.ControllerDashboardSolicitacoes = {
    COLECAO: 'solicitacoes',
    PERFIS: ['root', 'admin', 'tecnico', 'docente', 'apoio'],
    _perfisAtuais() {
        const cargo = window.usuarioAtual?.cargo;
        return ['root', 'admin'].includes(cargo) ? this.PERFIS : [cargo].filter(p => this.PERFIS.includes(p));
    },
    _validarDestino(perfis) {
        const alvos = [...new Set((perfis || []).filter(p => this.PERFIS.includes(p)))];
        return alvos;
    },
    listarDestinatarios() {
        const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
        const porUid = new Map(), agregar = (u, id='') => {
            const cargo = norm(u?.cargo), status = norm(u?.status || 'ativo');
            if (!u?.uid || !this.PERFIS.includes(cargo) || status !== 'ativo') return;
            const uid = String(u.uid);
            porUid.set(uid, { uid, id: String(u.id || id || ''), nome: String(u.nome || u.nome_completo || 'Usuário'), cargo });
        };
        (window.Store?.dados?.destinatarios || []).forEach(u => agregar(u, u.id));
        // Root/Admin já leem usuarios pelo Store; usar também essa fonte evita janela vazia
        // enquanto o diretório mínimo sincroniza, sem ampliar acesso dos demais perfis.
        if (['root', 'admin'].includes(window.usuarioAtual?.cargo)) {
            const C = window.ControllerAdminCredenciamento;
            (window.Store?.dados?.usuarios || []).forEach(u => {
                const entrada = C?._entradaDestinatario?.(u);
                if (entrada) agregar({ ...entrada, id: u.id }, u.id);
            });
        }
        return [...porUid.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    },
    async contarPendentes() {
        const uid = window.usuarioAtual?.uid || window.auth?.currentUser?.uid, cargo = window.usuarioAtual?.cargo;
        if (!uid) return 0;
        const consultas = [], col = window.db.collection(this.COLECAO);
        if (['root', 'admin'].includes(cargo)) consultas.push(col.where('perfis_destino', 'array-contains-any', this.PERFIS).get());
        else if (this.PERFIS.includes(cargo)) consultas.push(col.where('perfis_destino', 'array-contains', cargo).get());
        if (uid) consultas.push(col.where('destinatarios_uids', 'array-contains', uid).get());
        const snapshots = await Promise.all(consultas), ids = new Set();
        snapshots.forEach(snap => snap.forEach(doc => {
            const d = doc.data();
            if (d.status === 'Pendente' && d.uid_solicitante !== uid) ids.add(doc.id);
        }));
        return ids.size;
    },
    async listar({ direcao = 'recebidas', status = 'Pendente', de = '', ate = '' } = {}) {
        const col = window.db.collection(this.COLECAO), uid = window.usuarioAtual?.uid || window.auth?.currentUser?.uid;
        if (direcao === 'enviadas' && !uid) return [];
        const toIso = (dia, fim = false) => {
            if (!dia) return '';
            const [y, m, d] = dia.split('-').map(Number), dt = new Date(y, m - 1, d, fim ? 23 : 0, fim ? 59 : 0, fim ? 59 : 0, fim ? 999 : 0);
            return dt.toISOString();
        };
        const desde = toIso(de), ateIso = toIso(ate, true);
        const aplicarFiltros = q => {
            if (status && status !== 'Todas') q = q.where('status', '==', status);
            if (desde) q = q.where('criado_em', '>=', desde);
            if (ateIso) q = q.where('criado_em', '<=', ateIso);
            return q;
        };
        const consultas = [];
        if (direcao === 'enviadas') consultas.push({ normal: () => col.where('uid_solicitante', '==', uid), fallback: () => col.where('uid_solicitante', '==', uid) });
        else {
            const cargo = window.usuarioAtual?.cargo, perfis = this._perfisAtuais();
            if (!perfis.length) return [];
            consultas.push({
                normal: () => ['root', 'admin'].includes(cargo) ? col.where('perfis_destino', 'array-contains-any', perfis) : col.where('perfis_destino', 'array-contains', cargo),
                fallback: () => ['root', 'admin'].includes(cargo) ? col.where('perfis_destino', 'array-contains-any', perfis) : col.where('perfis_destino', 'array-contains', cargo)
            });
            if (uid) consultas.push({ normal: () => col.where('destinatarios_uids', 'array-contains', uid), fallback: () => col.where('destinatarios_uids', 'array-contains', uid) });
        }
        const unicos = new Map();
        for (const consulta of consultas) {
            let snap;
            try { snap = await aplicarFiltros(consulta.normal()).get(); }
            catch (err) {
                if (err?.code !== 'failed-precondition') throw err;
                snap = await consulta.fallback().get();
            }
            snap.forEach(d => unicos.set(d.id, { id: d.id, ...d.data() }));
        }
        return [...unicos.values()].filter(s => (direcao === 'enviadas' || s.uid_solicitante !== uid)
            && (!status || status === 'Todas' || s.status === status)
            && (!de || (s.criado_em || '') >= desde)
            && (!ate || (s.criado_em || '') <= ateIso))
            .sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''));
    },
    async criar({ perfisDestino = [], destinatariosEspecificos = [], tipo = 'geral', area = '', assunto = '', mensagem = '' }) {
        const u = window.usuarioAtual || {}, authUser = window.auth?.currentUser;
        if (!authUser?.uid || !u.id) throw new Error('Sua sessão ou cadastro não está disponível. Entre novamente.');
        const grupos = this._validarDestino(perfisDestino), diret = this.listarDestinatarios(), permitidos = new Map(diret.map(d => [d.uid, d]));
        const selecionados = [...new Map((destinatariosEspecificos || []).map(x => {
            const uid = typeof x === 'string' ? x : x?.uid, alvo = permitidos.get(String(uid || ''));
            if (!alvo) return null;
            return [alvo.uid, alvo];
        }).filter(Boolean)).values()];
        const individuais = selecionados.map(x => x.uid), perfisIndividuais = [...new Set(selecionados.map(x => x.cargo))];
        const gruposValidos = grupos.filter(p => p !== u.cargo || p === 'root' || p === 'admin');
        const gruposFinal = [...new Set(gruposValidos)];
        if (!gruposFinal.length && !individuais.length) throw new Error('Selecione um perfil ou ao menos um usuário destinatário.');
        if (individuais.includes(authUser.uid)) throw new Error('Não é possível enviar uma solicitação para você mesmo.');
        if (individuais.length > 50) throw new Error('Selecione no máximo 50 usuários específicos por solicitação.');
        const tipos = ['area', 'problema', 'geral'];
        if (!tipos.includes(tipo)) throw new Error('Tipo de solicitação inválido.');
        assunto = (assunto || '').trim(); mensagem = (mensagem || '').trim(); area = (area || '').trim();
        if (!assunto) throw new Error('Informe o assunto da solicitação.');
        if (!mensagem) throw new Error('Descreva a solicitação.');
        if (tipo === 'area' && !area) throw new Error('Informe a área relacionada ao pedido.');
        if (assunto.length > 120 || area.length > 100 || mensagem.length > 4000) throw new Error('Um dos campos excede o limite permitido.');
        const doc = {
            uid_solicitante: authUser.uid, id_solicitante: u.id,
            email_solicitante: (authUser.email || u.email || '').toLowerCase(),
            nome_solicitante: u.nome_completo || u.nome || authUser.email || '', cargo_solicitante: u.cargo || '',
            perfis_destino: gruposFinal, perfis_destino_individual: perfisIndividuais, destinatarios_uids: individuais,
            tipo, area, assunto, mensagem, resposta_processamento: '', status: 'Pendente', criado_em: new Date().toISOString(),
            processada_em: '', processada_por_uid: '', processada_por_email: '', processada_por_nome: ''
        };
        const ref = await window.db.collection(this.COLECAO).add(doc);
        return { id: ref.id, ...doc };
    },
    async processar(id, status = 'Processada', resposta = '') {
        if (!id) throw new Error('Solicitação inválida.');
        const authUser = window.auth?.currentUser, u = window.usuarioAtual || {};
        if (!authUser?.uid) throw new Error('Sessão expirada. Entre novamente.');
        if (status === 'Processada') {
            resposta = String(resposta || '').trim();
            if (resposta.length > 2000) throw new Error('A resposta deve ter no máximo 2.000 caracteres.');
            const agora = new Date().toISOString(), meta = {
                status: 'Processada', resposta_processamento: resposta, processada_em: agora,
                processada_por_uid: authUser.uid, processada_por_email: (authUser.email || u.email || '').toLowerCase(),
                processada_por_nome: u.nome_completo || u.nome || authUser.email || ''
            };
            await window.db.collection(this.COLECAO).doc(id).update(meta);
            return meta;
        }
        if (status === 'Pendente') {
            await window.db.collection(this.COLECAO).doc(id).update({ status: 'Pendente' });
            return { status: 'Pendente' };
        }
        throw new Error('Situação de solicitação inválida.');
    }
};
