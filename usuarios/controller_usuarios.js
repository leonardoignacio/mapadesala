// ./usuarios/controller_usuarios.js - Regras de Negócio de Usuários e Pré-Cadastro (Otimizado com Store)
window.ControllerUsuarios = {

    // O próprio usuário é lido direto do Firebase (e mantido só em memória). A coleção completa "usuarios" existe
    // em memória/cache apenas para Root e Admin; os demais perfis nunca a recebem.
    async obterUsuarioPorEmail(email) {
        const emailId = (email || "").trim().toLowerCase();
        if (!emailId) return null;

        const proprio = window.Store.meuUsuario;
        if (proprio && (proprio.id || proprio.email || "").toLowerCase() === emailId) return proprio;

        if (window.Store._carregaUsuarios()) {
            const emCache = (window.Store.dados.usuarios || []).find(u => (u.id || u.email || "").toLowerCase() === emailId);
            if (emCache) return emCache;
        }

        const doc = await window.db.collection("usuarios").doc(emailId).get();
        if (!doc.exists) return null;
        const dados = { id: doc.id, ...doc.data() };
        if (emailId === (window.auth.currentUser?.email || "").toLowerCase()) window.Store.meuUsuario = dados;
        return dados;
    },

    // jaAutenticado = true quando a pessoa já entrou (ex.: Google) e só falta gravar o pré-cadastro.
    // false => cria primeiro a conta de e-mail/senha no Firebase Auth e depois grava o documento.
    async registrarPreCadastro(dados, jaAutenticado = false) {
        const emailId = (dados.email || "").trim().toLowerCase();
        const nome = (dados.nome || "").trim();
        const sobrenome = (dados.sobrenome || "").trim();
        const cargoSolicitado = dados.cargo_solicitado || "docente";
        const justificativa = (dados.solicitacao_credenciamento || "").trim();

        if (!emailId || !nome || !sobrenome || !justificativa) {
            throw new Error("Preencha todos os campos obrigatórios do pré-cadastro.");
        }

        if (!jaAutenticado) {
            if (!dados.senha || dados.senha.length < 6) throw new Error("A senha deve possuir no mínimo 6 caracteres.");
            if (dados.senha !== dados.confirmar_senha) throw new Error("A confirmação de senha não confere com a senha informada.");
        }

        window.emProcessoDePreCadastro = true;
        try {
            if (!jaAutenticado) {
                await window.auth.createUserWithEmailAndPassword(emailId, dados.senha);
            }

            const novoUsuario = {
                nome: nome,
                sobrenome: sobrenome,
                nome_completo: `${nome} ${sobrenome}`,
                email: emailId,
                cargo_solicitado: cargoSolicitado,
                solicitacao_credenciamento: justificativa,
                cargo: "pendente",
                perfis: [],
                areas: [],
                status: "pendente",
                criado_em: new Date().toISOString()
            };

            await window.db.collection("usuarios").doc(emailId).set(novoUsuario, { merge: true });
            window.Store.meuUsuario = { id: emailId, ...novoUsuario };
            return novoUsuario;
        } finally {
            window.emProcessoDePreCadastro = false;
        }
    },

    async salvarPreCadastro(dados, jaAutenticado = false) {
        return this.registrarPreCadastro(dados, jaAutenticado);
    },

    // O titular atualiza apenas os dados da própria solicitação (cargo/status/perfis só o gestor altera).
    async reenviarSolicitacao(email, dados) {
        const emailId = (email || "").trim().toLowerCase();
        const nome = (dados.nome || "").trim();
        const sobrenome = (dados.sobrenome || "").trim();
        const justificativa = (dados.solicitacao_credenciamento || "").trim();

        if (!emailId) throw new Error("Sessão inválida. Entre novamente no sistema.");
        if (!nome || !sobrenome || !justificativa) throw new Error("Preencha nome, sobrenome e a justificativa da solicitação.");

        const atualizados = {
            nome: nome,
            sobrenome: sobrenome,
            nome_completo: `${nome} ${sobrenome}`,
            cargo_solicitado: dados.cargo_solicitado || "docente",
            solicitacao_credenciamento: justificativa,
            atualizado_em: new Date().toISOString()
        };

        await window.db.collection("usuarios").doc(emailId).update(atualizados);
        window.Store.meuUsuario = { ...(window.Store.meuUsuario || {}), id: emailId, ...atualizados };
        return atualizados;
    },

    // Remove somente o pré-cadastro (documento) do próprio usuário e encerra a sessão.
    // A conta de login permanece: se a pessoa voltar a entrar, o sistema reabre o formulário de pré-cadastro.
    async excluirCadastroProprio(email) {
        const emailId = (email || "").trim().toLowerCase();
        const logado = (window.auth.currentUser?.email || "").toLowerCase();
        if (!emailId || emailId !== logado) throw new Error("Só é possível excluir o próprio cadastro.");

        await window.db.collection("usuarios").doc(emailId).delete();
        window.Store.meuUsuario = null;
        await window.auth.signOut();
    }
};
