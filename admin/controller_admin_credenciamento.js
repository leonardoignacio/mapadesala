// ./admin/controller_admin_credenciamento.js - Regras de Negócio da Aba Credenciamento (Otimizado com Store)
window.ControllerAdminCredenciamento = {

    _destinatariosSyncPromise: null,
    _destinatariosSyncAt: 0,
    _destinatariosSyncResult: null,

    hierarquiaCargos: {
        root: 5, admin: 4, tecnico: 3, docente: 2, apoio: 1, pendente: 0
    },

    // ---- Diretório público de docentes ------------------------------------------------------------
    // Perfis sem acesso à coleção "usuarios" (técnico, docente, apoio) obtêm a lista de docentes aqui. O diretório guarda
    // somente o necessário para escalar docentes (nome, áreas e status), sem justificativas, datas de auditoria etc.
    COLECAO_DIRETORIO: 'diretorio_docentes',
    COLECAO_DESTINATARIOS: 'diretorio_solicitacoes_minimo',

    _norm(v) { return (v || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(); },

    // Retorna o registro do diretório ou null quando o usuário não deve constar (não é docente ativo).
    _entradaDiretorio(u) {
        if (!u) return null;
        const perfis = Array.isArray(u.perfis) ? u.perfis : [];
        if (u.status !== 'ativo' || this._norm(u.cargo) !== 'docente' || !perfis.some(p => this._norm(p) === 'docente')) return null;
        const email = (u.email || '').toLowerCase();
        if (!u.id || !email) return null;   // o registro do diretório usa o MESMO id do usuário (não o e-mail)
        return { email, nome: u.nome || '', sobrenome: u.sobrenome || '', nome_completo: u.nome_completo || `${u.nome || ''} ${u.sobrenome || ''}`.trim(),
                 cargo: 'docente', perfis, areas: Array.isArray(u.areas) ? u.areas : [], status: 'ativo' };
    },

    _entradaDestinatario(u) {
        const perfisValidos = ['root', 'admin', 'tecnico', 'docente', 'apoio'];
        if (!u || !u.id || !u.uid) return null;
        const cargo = this._norm(u.cargo), status = this._norm(u.status || 'ativo');
        if (!perfisValidos.includes(cargo) || status !== 'ativo') return null;
        const nome = u.nome_completo || u.nome || 'Usuário';
        return { uid: String(u.uid), nome: String(nome), cargo, status: 'ativo' };
    },
    _destinatarioIgual(a, b) {
        const chaves = Object.keys(a || {}).filter(k => k !== 'id').sort();
        return chaves.join('|') === ['cargo','nome','status','uid'].join('|')
            && ['uid','nome','cargo','status'].every(k => (a?.[k] || '') === (b?.[k] || ''));
    },
    async publicarMeuDestinatario() {
        const cargos = ['root','admin','tecnico','docente','apoio'];
        const atual = window.Store?.meuUsuario || window.ControllerUsuarios?.obterMeuUsuario?.() || {};
        const uid = window.auth?.currentUser?.uid || window.usuarioAtual?.uid;
        const usuarioId = atual.id || window.usuarioAtual?.id;
        if (!uid || !usuarioId || !cargos.includes(this._norm(window.usuarioAtual?.cargo)) || window.usuarioAtual?.cargo === 'pendente') return false;
        const entrada = this._entradaDestinatario({ ...atual, id: usuarioId, uid, cargo: window.usuarioAtual?.cargo, status: 'ativo' });
        if (!entrada) return false;
        const ref = window.db.collection(this.COLECAO_DESTINATARIOS).doc(usuarioId);
        const snap = await ref.get();
        if (!snap.exists || !this._destinatarioIgual(snap.data(), entrada)) await ref.set(entrada);
        window.Store.upsertLocal('destinatarios', { id: usuarioId, ...entrada });
        return true;
    },

    _diretorioIgual(a, b) {
        return ['email', 'nome', 'sobrenome', 'nome_completo', 'cargo', 'status'].every(k => (a[k] || '') === (b[k] || ''))
            && JSON.stringify(a.perfis || []) === JSON.stringify(b.perfis || [])
            && JSON.stringify(a.areas || []) === JSON.stringify(b.areas || []);
    },

    // Grava o usuário e o respectivo registro do diretório no mesmo lote (ambos ou nenhum).
    async _gravarUsuarioEDiretorio(emailId, patch, usuarioAtualizado, opsExtras = []) {
        const entrada = this._entradaDiretorio(usuarioAtualizado);
        const refDir = window.db.collection(this.COLECAO_DIRETORIO).doc(emailId);
        const refDest = window.db.collection(this.COLECAO_DESTINATARIOS).doc(emailId);
        const destino = this._entradaDestinatario(usuarioAtualizado);
        const batch = window.db.batch();
        batch.update(window.db.collection("usuarios").doc(emailId), patch);
        if (entrada) batch.set(refDir, entrada); else batch.delete(refDir);
        if (destino) batch.set(refDest, destino); else batch.delete(refDest);
        opsExtras.forEach(op => op(batch));   // ex.: fechar uma solicitação no mesmo lote
        await batch.commit();
        window.Store.upsertLocal("usuarios", usuarioAtualizado);
        if (entrada) window.Store.upsertLocal("diretorio", { id: emailId, ...entrada });
        else window.Store.removerLocal("diretorio", emailId);
        if (destino) window.Store.upsertLocal("destinatarios", { id: emailId, ...destino });
        else window.Store.removerLocal("destinatarios", emailId);
    },

    // Deixa o diretório igual ao esperado a partir de "usuarios" (cria, atualiza e remove sobras). Só Root/Admin.
    // Reconsulta o diretório remoto porque o cache pode conter só o registro próprio ou uma projeção antiga.
    // O formato mínimo precisa ser aplicado a TODOS os documentos antes que a equipe possa usar list().
    async sincronizarDiretorio() {
        await window.Store.garantirPronto();
        if (!window.Store._carregaUsuarios()) return { gravados: 0, removidos: 0 };
        if (this._destinatariosSyncPromise) return this._destinatariosSyncPromise;
        if (this._destinatariosSyncAt && Date.now() - this._destinatariosSyncAt < 5 * 60 * 1000) return this._destinatariosSyncResult;
        this._destinatariosSyncPromise = this._sincronizarDiretorioCompleto();
        try {
            const resultado = await this._destinatariosSyncPromise;
            this._destinatariosSyncAt = Date.now();
            this._destinatariosSyncResult = resultado;
            return resultado;
        } finally {
            this._destinatariosSyncPromise = null;
        }
    },

    async _sincronizarDiretorioCompleto() {
        const esperado = new Map(), esperadoDest = new Map(), atualizadosUid = new Map();
        // A migração pode remover documentos obsoletos; portanto, nunca derive a lista esperada de cache
        // possivelmente parcial. Root/Admin fazem uma leitura atual da coleção protegida e usam-na como fonte.
        const remotoUsuarios = await window.db.collection('usuarios').get();
        let usuarios = remotoUsuarios.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.Store.dados.usuarios = usuarios;
        // Migração única para contas legadas: recupera UID pelo vínculo acessos/{uid}, em uma leitura agrupada.
        const legados = usuarios.filter(u => !u.uid && u.id && this._entradaDestinatario({ ...u, uid: '__temporario__' }));
        if (legados.length) {
            try {
                const snap = await window.db.collection('acessos').get(), uidPorUsuario = new Map();
                snap.forEach(doc => { const usuarioId = doc.data()?.usuario_id; if (usuarioId) uidPorUsuario.set(String(usuarioId), doc.id); });
                usuarios = usuarios.map(u => {
                    const uid = !u.uid ? uidPorUsuario.get(String(u.id)) : null;
                    if (!uid) return u;
                    atualizadosUid.set(u.id, uid);
                    return { ...u, uid };
                });
            } catch (err) { console.warn('[Destinatários] Não foi possível recuperar vínculos UID legados:', err); }
        }
        usuarios.forEach(u => {
            const e = this._entradaDiretorio(u), d = this._entradaDestinatario(u);
            if (e) esperado.set(u.id, e);
            if (d) esperadoDest.set(u.id, d);
        });
        // Leitura remota obrigatória para detectar documentos legados mesmo quando o Store tem cache parcial.
        // Root/Admin podem ler esses documentos e regravá-los sem campos sensíveis.
        const snapDest = await window.db.collection(this.COLECAO_DESTINATARIOS).get();
        const registrosRemotos = snapDest.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.Store.dados.destinatarios = window.Store._sanitizarDestinatarios
            ? window.Store._sanitizarDestinatarios(registrosRemotos) : registrosRemotos;
        const atual = new Map((window.Store.dados.diretorio || []).map(d => [d.id, d]));
        const atualDest = new Map((window.Store.dados.destinatarios || []).map(d => [d.id, d]));
        const ops = [];
        esperado.forEach((e, id) => { const a = atual.get(id); if (!a || !this._diretorioIgual(a, e)) ops.push({ tipo: 'set', id, dados: e, colecao: this.COLECAO_DIRETORIO, local: 'diretorio' }); });
        atual.forEach((_, id) => { if (!esperado.has(id)) ops.push({ tipo: 'delete', id, colecao: this.COLECAO_DIRETORIO, local: 'diretorio' }); });
        esperadoDest.forEach((e, id) => { const a = atualDest.get(id); if (!a || !this._destinatarioIgual(a, e)) ops.push({ tipo: 'set', id, dados: e, colecao: this.COLECAO_DESTINATARIOS, local: 'destinatarios' }); });
        atualDest.forEach((_, id) => { if (!esperadoDest.has(id)) ops.push({ tipo: 'delete', id, colecao: this.COLECAO_DESTINATARIOS, local: 'destinatarios' }); });
        atualizadosUid.forEach((uid, id) => ops.push({ tipo: 'uid', id, uid }));
        if (!ops.length) return { gravados: 0, removidos: 0 };
        for (let i = 0; i < ops.length; i += 400) {
            const batch = window.db.batch();
            ops.slice(i, i + 400).forEach(o => {
                if (o.tipo === 'uid') batch.update(window.db.collection('usuarios').doc(o.id), { uid: o.uid });
                else {
                    const ref = window.db.collection(o.colecao).doc(o.id);
                    if (o.tipo === 'set') batch.set(ref, o.dados); else batch.delete(ref);
                }
            });
            await batch.commit();
        }
        ops.forEach(o => {
            if (o.tipo === 'uid') {
                const u = usuarios.find(x => x.id === o.id);
                if (u) window.Store.upsertLocal('usuarios', { ...u, uid: o.uid });
            } else if (o.tipo === 'set') window.Store.upsertLocal(o.local, { id: o.id, ...o.dados });
            else window.Store.removerLocal(o.local, o.id);
        });
        return { gravados: ops.filter(o => o.tipo === 'set').length, removidos: ops.filter(o => o.tipo === 'delete').length, uidsRecuperados: atualizadosUid.size };
    },

    async listarUsuarios() {
        await window.Store.garantirPronto();
        const lista = [...(window.Store.dados.usuarios || [])];

        return lista.sort((a, b) => {
            const aPend = (a.status === 'pendente' || a.cargo === 'pendente') ? 0 : 1;
            const bPend = (b.status === 'pendente' || b.cargo === 'pendente') ? 0 : 1;
            if (aPend !== bPend) return aPend - bPend;
            return (a.nome_completo || a.email || "").localeCompare(b.nome_completo || b.email || "");
        });
    },

    async listarAreasCadastradas() {
        await window.Store.garantirPronto();
        return [...(window.Store.dados.areas || [])].sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    },

    obterCargosPermitidosParaAtribuicao(cargoLogado) {
        if (cargoLogado === 'root') {
            return [
                { valor: 'admin', rotulo: 'Administrador (Acumula todos os perfis)' },
                { valor: 'tecnico', rotulo: 'Técnico de Área (Coordenação Pedagógica)' },
                { valor: 'docente', rotulo: 'Docente' },
                { valor: 'apoio', rotulo: 'Apoio Administrativo / Escolar' }
            ];
        }
        if (cargoLogado === 'admin') {
            return [
                { valor: 'tecnico', rotulo: 'Técnico de Área (Coordenação Pedagógica)' },
                { valor: 'docente', rotulo: 'Docente' },
                { valor: 'apoio', rotulo: 'Apoio Administrativo / Escolar' }
            ];
        }
        return [];
    },

    podeGerenciarUsuario(cargoLogado, usuarioAlvo) {
        if (!usuarioAlvo) return false;
        const cargoAlvo = usuarioAlvo.cargo || 'pendente';

        if (cargoAlvo === 'root') return cargoLogado === 'root';
        if (cargoLogado === 'root') return true;
        if (cargoLogado === 'admin') {
            return ['tecnico', 'docente', 'apoio', 'pendente'].includes(cargoAlvo);
        }
        return false;
    },

    _calcularPerfisAcumulados(cargo) {
        switch (cargo) {
            case 'root': return ['root', 'admin', 'tecnico', 'docente', 'apoio'];
            case 'admin': return ['admin', 'tecnico', 'docente', 'apoio'];
            case 'tecnico': return ['tecnico', 'docente', 'apoio'];
            case 'docente': return ['docente'];
            case 'apoio': return ['apoio'];
            default: return [];
        }
    },

    // idAlvo: id do documento do usuário (cadastros antigos: o e-mail; novos: código aleatório). Não é alterado nem normalizado.
    async salvarCredenciamentoUsuario(idAlvo, dadosCredenciamento, usuarioLogado) {
        await window.Store.garantirPronto();
        const emailId = (idAlvo || "").trim();
        if (!emailId) throw new Error("Usuário inválido.");

        const docRef = window.db.collection("usuarios").doc(emailId);
        let usuarioAlvo = (window.Store.dados.usuarios || []).find(u => u.id === emailId);

        if (!usuarioAlvo) {
            const docSnap = await docRef.get();
            if (!docSnap.exists) throw new Error("Usuário não encontrado no banco de dados.");
            usuarioAlvo = { id: docSnap.id, ...docSnap.data() };
        }

        const cargoLogado = usuarioLogado?.cargo || 'sem_acesso';
        if (!this.podeGerenciarUsuario(cargoLogado, usuarioAlvo)) {
            throw new Error("Você não possui privilégio hierárquico para alterar este usuário.");
        }

        const novoCargo = dadosCredenciamento.cargo;
        const novoStatus = dadosCredenciamento.status || 'ativo';

        if (novoStatus === 'pendente') {
            const patchPendente = {
                nome: dadosCredenciamento.nome.trim(),
                sobrenome: dadosCredenciamento.sobrenome.trim(),
                nome_completo: `${dadosCredenciamento.nome.trim()} ${dadosCredenciamento.sobrenome.trim()}`,
                cargo: 'pendente',
                status: 'pendente',
                perfis: [],
                areas: dadosCredenciamento.areas || [],
                atualizado_em: new Date().toISOString(),
                credenciado_por: usuarioLogado.email
            };
            await this._gravarUsuarioEDiretorio(emailId, patchPendente, { ...usuarioAlvo, id: emailId, ...patchPendente });
            return;
        }

        if (usuarioAlvo.cargo !== 'root') {
            const permitidos = this.obterCargosPermitidosParaAtribuicao(cargoLogado).map(c => c.valor);
            if (!permitidos.includes(novoCargo)) {
                throw new Error(`Seu perfil (${cargoLogado.toUpperCase()}) não tem permissão para promover usuários ao perfil ${novoCargo.toUpperCase()}.`);
            }
        }

        const cargoFinal = usuarioAlvo.cargo === 'root' ? 'root' : novoCargo;
        const perfisAcumulados = this._calcularPerfisAcumulados(cargoFinal);
        const areasSelecionadas = (cargoFinal === 'root' || cargoFinal === 'admin')
            ? ['Todas']
            : (dadosCredenciamento.areas || []);

        const payload = {
            nome: dadosCredenciamento.nome.trim(),
            sobrenome: dadosCredenciamento.sobrenome.trim(),
            nome_completo: `${dadosCredenciamento.nome.trim()} ${dadosCredenciamento.sobrenome.trim()}`,
            cargo: cargoFinal,
            perfis: perfisAcumulados,
            areas: areasSelecionadas,
            tipo_vinculo_area: cargoFinal === 'tecnico'
                ? 'responsavel'
                : (cargoFinal === 'docente' ? 'atuacao' : (cargoFinal === 'apoio' ? 'preferencial' : 'global')),
            status: novoStatus,
            credenciado_por: usuarioLogado.email,
            credenciado_em: new Date().toISOString()
        };

        await this._gravarUsuarioEDiretorio(emailId, payload, { ...usuarioAlvo, id: emailId, ...payload });
    },

    async excluirUsuario(idAlvo, usuarioLogado) {
        await window.Store.garantirPronto();
        const emailId = (idAlvo || "").trim();
        const docRef = window.db.collection("usuarios").doc(emailId);
        const usuarioAlvo = (window.Store.dados.usuarios || []).find(u => u.id === emailId);
        if (!usuarioAlvo) return;

        if (usuarioAlvo.cargo === 'root') {
            throw new Error("A conta ROOT do sistema não pode ser excluída.");
        }

        if (!this.podeGerenciarUsuario(usuarioLogado?.cargo, usuarioAlvo)) {
            throw new Error("Você não possui permissão para excluir um usuário deste nível hierárquico.");
        }

        const batch = window.db.batch();
        batch.delete(docRef);
        batch.delete(window.db.collection(this.COLECAO_DIRETORIO).doc(emailId));
        await batch.commit();
        window.Store.removerLocal("usuarios", emailId);
        window.Store.removerLocal("diretorio", emailId);
    }
};
