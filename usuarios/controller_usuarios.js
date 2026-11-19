// ./usuarios/controller_usuarios.js - Regras de Negócio de Usuários e Pré-Cadastro
//
// ESTRUTURA: o documento de usuário NÃO usa mais o e-mail como chave.
//  - usuarios/{id}        id aleatório (cadastros antigos mantêm o id que já possuem, que era o e-mail)
//  - campo "email"        e-mail de login (único; garantido pelo Firebase Authentication)
//  - campo "uid"          identificador estável da conta de login (não muda quando o e-mail muda)
//  - acessos/{uid}        vínculo { usuario_id } entre a conta de login e o documento do usuário
// Todos os relacionamentos (encontros, diretório de docentes, solicitações) usam o ID do usuário, por isso o e-mail
// pode ser alterado sem perder designações.
window.ControllerUsuarios = {

    // Localiza o documento do usuário logado: 1) pelo vínculo "acessos/{uid}"; 2) cadastro antigo, cujo id é o e-mail
    // (vincula automaticamente no primeiro acesso); 3) por "uid" (caso o vínculo ainda não tenha sido gravado).
    // Também mantém o campo "email" sincronizado quando a pessoa troca o e-mail de login.
    async localizarUsuario(authUserInput) {
        const authAtual = window.auth?.currentUser || {};
        const fonte = authUserInput && typeof authUserInput === 'object' ? authUserInput : authAtual;
        const uid = (typeof fonte?.uid === 'string' && fonte.uid) || (typeof authAtual.uid === 'string' && authAtual.uid) || '';
        const candidato = typeof authUserInput === 'string' ? authUserInput
            : (typeof authUserInput?.email === 'string' ? authUserInput.email
                : (Array.isArray(authUserInput?.providerData) ? authUserInput.providerData.find(p => typeof p?.email === 'string')?.email : ''))
                || (typeof authAtual.email === 'string' ? authAtual.email : '');
        const email = typeof candidato === 'string' ? candidato.trim().toLowerCase() : '';
        if (!uid && !email) return null;
        const col = window.db.collection('usuarios');
        let dados = null;

        if (uid) {
            const ponteiro = await window.db.collection('acessos').doc(uid).get();
            if (ponteiro.exists) {
                const doc = await col.doc(ponteiro.data().usuario_id).get();
                if (doc.exists) dados = { id: doc.id, ...doc.data() };
            }
        }
        if (!dados && email) {                                   // cadastro antigo: id = e-mail
            const legado = await col.doc(email).get();
            if (legado.exists && (!legado.data().uid || legado.data().uid === uid)) {
                dados = { id: legado.id, ...legado.data() };
                // O vínculo é uma otimização/estrutura nova: se falhar (ex.: regras ainda não publicadas), o acesso segue pelo
                // cadastro antigo e a vinculação é tentada novamente no próximo login.
                if (uid) { try { await this._vincular(dados, uid, email); } catch (err) { console.warn('[Usuários] Vínculo não gravado (será tentado no próximo acesso):', err); } }
            }
        }
        if (!dados && uid) {                                     // vínculo ausente, mas o documento já tem o uid
            const consulta = await col.where('uid', '==', uid).limit(1).get();
            consulta.forEach(d => { dados = { id: d.id, ...d.data() }; });
            if (dados) { try { await window.db.collection('acessos').doc(uid).set({ usuario_id: dados.id, criado_em: new Date().toISOString() }); } catch (err) { console.warn('[Usuários] Vínculo não gravado:', err); } }
        }
        if (dados && email && (dados.email || '').toLowerCase() !== email) {   // e-mail de login foi trocado
            try {
                await col.doc(dados.id).update({ email, atualizado_em: new Date().toISOString() });
                dados.email = email;
            } catch (err) { console.warn('[Usuários] Não foi possível sincronizar o e-mail:', err); }
        }
        return dados;
    },

    // Grava o vínculo e o uid no cadastro antigo (uma única vez).
    async _vincular(dados, uid, email) {
        await window.db.collection('acessos').doc(uid).set({ usuario_id: dados.id, criado_em: new Date().toISOString() });
        await window.db.collection('usuarios').doc(dados.id).update({ uid, email });
        dados.uid = uid; dados.email = email;
    },

    // Se o vínculo aponta para um cadastro que já não existe (ex.: pré-cadastro excluído), ele é removido para permitir novo cadastro.
    async _limparVinculoOrfao(uid) {
        try {
            const ponteiro = await window.db.collection('acessos').doc(uid).get();
            if (!ponteiro.exists) return;
            const alvo = await window.db.collection('usuarios').doc(ponteiro.data().usuario_id).get();
            if (!alvo.exists) await window.db.collection('acessos').doc(uid).delete();
        } catch (err) { console.warn('[Usuários] Vínculo órfão não removido:', err); }
    },

    // O usuário logado (carregado no login e mantido só em memória).
    obterMeuUsuario() { return window.Store.meuUsuario || null; },

    // jaAutenticado = true quando a pessoa já entrou (ex.: Google) e só falta gravar o pré-cadastro.
    // false => cria primeiro a conta de e-mail/senha no Firebase Auth e depois grava o documento.
    async registrarPreCadastro(dados, jaAutenticado = false) {
        const email = (dados.email || "").trim().toLowerCase();
        const nome = (dados.nome || "").trim();
        const sobrenome = (dados.sobrenome || "").trim();
        const cargoSolicitado = dados.cargo_solicitado || "docente";
        const justificativa = (dados.solicitacao_credenciamento || "").trim();

        if (!email || !nome || !sobrenome || !justificativa) {
            throw new Error("Preencha todos os campos obrigatórios do pré-cadastro.");
        }
        if (!jaAutenticado) {
            if (!dados.senha || dados.senha.length < 6) throw new Error("A senha deve possuir no mínimo 6 caracteres.");
            if (dados.senha !== dados.confirmar_senha) throw new Error("A confirmação de senha não confere com a senha informada.");
        }

        window.emProcessoDePreCadastro = true;
        try {
            if (!jaAutenticado) await window.auth.createUserWithEmailAndPassword(email, dados.senha);
            const uid = window.auth.currentUser?.uid;
            if (!uid) throw new Error("Sessão inválida. Entre novamente e repita o pré-cadastro.");

            await this._limparVinculoOrfao(uid);
            const ref = window.db.collection("usuarios").doc();          // id aleatório
            const novoUsuario = {
                uid, nome, sobrenome, nome_completo: `${nome} ${sobrenome}`, email,
                cargo_solicitado: cargoSolicitado, solicitacao_credenciamento: justificativa,
                cargo: "pendente", perfis: [], areas: [], status: "pendente", criado_em: new Date().toISOString()
            };
            await ref.set(novoUsuario);
            await window.db.collection("acessos").doc(uid).set({ usuario_id: ref.id, criado_em: novoUsuario.criado_em });
            window.Store.meuUsuario = { id: ref.id, ...novoUsuario };
            return novoUsuario;
        } finally {
            window.emProcessoDePreCadastro = false;
        }
    },

    async salvarPreCadastro(dados, jaAutenticado = false) {
        return this.registrarPreCadastro(dados, jaAutenticado);
    },

    // O titular atualiza apenas os dados da própria solicitação (cargo/status/perfis só o gestor altera).
    async reenviarSolicitacao(id, dados) {
        const nome = (dados.nome || "").trim();
        const sobrenome = (dados.sobrenome || "").trim();
        const justificativa = (dados.solicitacao_credenciamento || "").trim();

        if (!id) throw new Error("Sessão inválida. Entre novamente no sistema.");
        if (!nome || !sobrenome || !justificativa) throw new Error("Preencha nome, sobrenome e a justificativa da solicitação.");

        const atualizados = {
            nome, sobrenome, nome_completo: `${nome} ${sobrenome}`,
            cargo_solicitado: dados.cargo_solicitado || "docente",
            solicitacao_credenciamento: justificativa,
            atualizado_em: new Date().toISOString()
        };
        await window.db.collection("usuarios").doc(id).update(atualizados);
        window.Store.meuUsuario = { ...(window.Store.meuUsuario || {}), id, ...atualizados };
        return atualizados;
    },

    // Remove somente o pré-cadastro (documento + vínculo) do próprio usuário e encerra a sessão.
    // A conta de login permanece: se a pessoa voltar a entrar, o sistema reabre o formulário de pré-cadastro.
    async excluirCadastroProprio(id) {
        const meu = window.Store.meuUsuario;
        if (!id || !meu || meu.id !== id) throw new Error("Só é possível excluir o próprio cadastro.");
        await window.db.collection("usuarios").doc(id).delete();
        await this._limparVinculoOrfao(window.auth.currentUser.uid);
        window.Store.meuUsuario = null;
        await window.auth.signOut();
    }
};
