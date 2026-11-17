// ./admin/controller_admin_solicitacoes.js - Avaliação (Admin/Root) das solicitações de habilitação em outras áreas
window.ControllerAdminSolicitacoes = {
    COLECAO: 'solicitacoes_areas',

    _validarPermissao() {
        if (!['root', 'admin'].includes(window.usuarioAtual?.cargo)) throw new Error('Somente Admin ou Root avaliam solicitações de áreas.');
    },
    _norm(v) { return window.Util.semAcento(v); },

    // Pendentes primeiro (mais antigas antes); depois as avaliadas, das mais recentes para as mais antigas.
    async listar() {
        this._validarPermissao();
        const snap = await window.db.collection(this.COLECAO).get();
        const lista = [];
        snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
        return lista.sort((a, b) => {
            if ((a.status === 'Pendente') !== (b.status === 'Pendente')) return a.status === 'Pendente' ? -1 : 1;
            return a.status === 'Pendente' ? (a.criado_em || '').localeCompare(b.criado_em || '') : (b.avaliado_em || b.criado_em || '').localeCompare(a.avaliado_em || a.criado_em || '');
        });
    },

    // Aprova as áreas escolhidas: soma às áreas do usuário (sem apagar as atuais) e fecha a solicitação no mesmo lote.
    async aprovar(solicitacao, areasAprovadas) {
        this._validarPermissao();
        if (solicitacao.status !== 'Pendente') throw new Error('Esta solicitação já foi avaliada.');
        await window.Store.garantirPronto();
        const usuario = (window.Store.dados.usuarios || []).find(u => (solicitacao.usuario_id && u.id === solicitacao.usuario_id) || (u.email || '').toLowerCase() === (solicitacao.email || '').toLowerCase());
        if (!usuario) throw new Error('O usuário desta solicitação não foi encontrado.');
        if (!window.ControllerAdminCredenciamento.podeGerenciarUsuario(window.usuarioAtual.cargo, usuario)) throw new Error('Você não possui autoridade hierárquica para alterar este usuário.');
        const aprovadas = (areasAprovadas || []).filter(a => (solicitacao.areas_solicitadas || []).includes(a));
        if (!aprovadas.length) throw new Error('Marque ao menos uma área para aprovar (ou use "Recusar").');

        const atuais = Array.isArray(usuario.areas) ? usuario.areas : [], novas = [...atuais];
        aprovadas.forEach(a => { if (!novas.some(x => this._norm(typeof x === 'object' ? x.area || x.nome : x) === this._norm(a))) novas.push(a); });
        const agora = new Date().toISOString(), patch = { areas: novas, atualizado_em: agora };
        const avaliador = window.usuarioAtual;
        const refSolic = window.db.collection(this.COLECAO).doc(solicitacao.id);
        await window.ControllerAdminCredenciamento._gravarUsuarioEDiretorio(usuario.id, patch, { ...usuario, ...patch }, [
            b => b.update(refSolic, { status: 'Aprovada', areas_aprovadas: aprovadas, avaliado_por: avaliador.email, avaliado_por_nome: avaliador.nome_completo || avaliador.nome || avaliador.email, avaliado_em: agora })
        ]);
        return aprovadas;
    },

    async recusar(solicitacao, motivo) {
        this._validarPermissao();
        if (solicitacao.status !== 'Pendente') throw new Error('Esta solicitação já foi avaliada.');
        const avaliador = window.usuarioAtual, agora = new Date().toISOString();
        await window.db.collection(this.COLECAO).doc(solicitacao.id).update({
            status: 'Recusada', motivo_recusa: (motivo || '').trim(), avaliado_por: avaliador.email,
            avaliado_por_nome: avaliador.nome_completo || avaliador.nome || avaliador.email, avaliado_em: agora
        });
    }
};
