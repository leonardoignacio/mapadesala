// ./apoio/controller_apoio_perfil.js - Informações pessoais do usuário logado (acesso direto ao próprio documento)
// SEGURANÇA: nenhuma função aqui lê ou escreve documentos de outros usuários.
// O documento do usuário é identificado pelo ID (window.usuarioAtual.id), nunca pelo e-mail: o e-mail de login pode mudar.
window.ControllerApoioPerfil = {
    COLECAO_SOLICITACOES: 'solicitacoes_areas',

    _emailAtual() { return (window.usuarioAtual?.email || window.auth?.currentUser?.email || '').toLowerCase(); },

    // Contas Google não têm senha própria no sistema (a senha é gerenciada pelo Google).
    contaComSenha() {
        const provedores = window.auth?.currentUser?.providerData || [];
        return provedores.length === 0 || provedores.some(p => p.providerId === 'password');
    },

    // Relê o próprio documento direto do Firebase (ex.: após um Admin aprovar novas áreas).
    async recarregarMeuUsuario() {
        const id = window.usuarioAtual?.id;
        if (!id) throw new Error('Seu cadastro não foi encontrado.');
        const doc = await window.db.collection('usuarios').doc(id).get();
        if (!doc.exists) throw new Error('Seu cadastro não foi encontrado.');
        const dados = { id: doc.id, ...doc.data() };
        window.Store.meuUsuario = dados;
        Object.assign(window.usuarioAtual, { areas: dados.areas || [], nome: dados.nome, sobrenome: dados.sobrenome, nome_completo: dados.nome_completo || window.usuarioAtual.nome_completo });
        return dados;
    },

    async atualizarNome(nome, sobrenome) {
        nome = (nome || '').trim(); sobrenome = (sobrenome || '').trim();
        if (!nome || !sobrenome) throw new Error('Informe nome e sobrenome.');
        const patch = { nome, sobrenome, nome_completo: `${nome} ${sobrenome}`, atualizado_em: new Date().toISOString() };
        const id = window.usuarioAtual?.id;
        if (!id) throw new Error('Sessão inválida. Entre novamente.');
        await window.db.collection('usuarios').doc(id).update(patch);
        Object.assign(window.usuarioAtual, { nome, sobrenome, nome_completo: patch.nome_completo });
        window.Store.meuUsuario = { ...(window.Store.meuUsuario || {}), id, ...patch };
        return patch;
    },

    // Troca de senha: exige a senha atual (reautenticação) e a confirmação da nova.
    async alterarSenha(senhaAtual, novaSenha, confirmacao) {
        if (!this.contaComSenha()) throw new Error('Esta conta usa o login do Google; altere a senha pela sua conta Google.');
        if (!senhaAtual) throw new Error('Informe a senha atual para confirmar a troca.');
        if (!novaSenha || novaSenha.length < 6) throw new Error('A nova senha deve possuir no mínimo 6 caracteres.');
        if (novaSenha !== confirmacao) throw new Error('A confirmação não confere com a nova senha.');
        const usuario = window.auth.currentUser;
        if (!usuario) throw new Error('Sessão expirada. Entre novamente.');
        const credencial = window.firebase.auth.EmailAuthProvider.credential(usuario.email, senhaAtual);
        await usuario.reauthenticateWithCredential(credencial);
        await usuario.updatePassword(novaSenha);
    },

    // Troca do e-mail de login: reautentica com a senha atual e envia um link de confirmação ao NOVO e-mail. O e-mail só muda
    // depois do clique no link; no próximo acesso o sistema atualiza o cadastro sozinho. Como o cadastro usa o ID (e não o
    // e-mail) como chave, todas as designações e vínculos permanecem.
    async alterarEmail(novoEmail, senhaAtual) {
        if (!this.contaComSenha()) throw new Error('Esta conta usa o login do Google; o e-mail é gerenciado pelo Google.');
        novoEmail = (novoEmail || '').trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(novoEmail)) throw new Error('Informe um e-mail válido.');
        if (novoEmail === this._emailAtual()) throw new Error('O novo e-mail é igual ao atual.');
        if (!senhaAtual) throw new Error('Informe a senha atual para confirmar a troca de e-mail.');
        const usuario = window.auth.currentUser;
        if (!usuario) throw new Error('Sessão expirada. Entre novamente.');
        await usuario.reauthenticateWithCredential(window.firebase.auth.EmailAuthProvider.credential(usuario.email, senhaAtual));
        await usuario.verifyBeforeUpdateEmail(novoEmail);
        return novoEmail;
    },

    // Pedido de habilitação em outras áreas; a decisão é de um Admin (aba "Solicitações de áreas" do Painel Admin).
    async solicitarAreas(areas, justificativa) {
        areas = [...new Set((areas || []).map(a => (a || '').trim()).filter(Boolean))];
        justificativa = (justificativa || '').trim();
        if (!areas.length) throw new Error('Selecione ao menos uma área.');
        if (!justificativa) throw new Error('Explique o motivo da solicitação.');
        const email = this._emailAtual(), minhas = this._minhasSolicitacoesCache || [];
        const chave = a => [...a].map(x => window.Util.semAcento(x)).sort().join('|');
        if (minhas.some(s => s.status === 'Pendente' && chave(s.areas_solicitadas || []) === chave(areas))) {
            throw new Error('Já existe uma solicitação pendente para estas mesmas áreas. Aguarde a avaliação de um Admin.');
        }
        const registro = {
            uid: window.usuarioAtual.uid || window.auth?.currentUser?.uid || '', usuario_id: window.usuarioAtual.id || '',
            email, nome: window.usuarioAtual.nome_completo || window.usuarioAtual.nome || email, cargo: window.usuarioAtual.cargo || '',
            areas_solicitadas: areas, justificativa, status: 'Pendente', criado_em: new Date().toISOString()
        };
        const ref = await window.db.collection(this.COLECAO_SOLICITACOES).add(registro);
        this._minhasSolicitacoesCache = [{ id: ref.id, ...registro }, ...minhas];
        return registro;
    },

    async minhasSolicitacoes() {
        const snap = await window.db.collection(this.COLECAO_SOLICITACOES).where('uid', '==', window.usuarioAtual.uid || window.auth?.currentUser?.uid || '').get();
        const lista = [];
        snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
        lista.sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''));
        this._minhasSolicitacoesCache = lista;
        return lista;
    }
};
