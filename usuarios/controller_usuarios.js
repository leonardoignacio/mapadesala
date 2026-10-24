// ./usuarios/controller_usuarios.js - Regras de Negócio de Usuários e Pré-Cadastro (Otimizado com Store)
window.ControllerUsuarios = {

    async obterUsuarioPorEmail(email) {
        const emailId = (email || "").trim().toLowerCase();
        if (!emailId) return null;

        await window.Store.garantirPronto();
        const emCache = (window.Store.dados.usuarios || []).find(u => (u.id || u.email || "").toLowerCase() === emailId);
        if (emCache) return emCache;

        const doc = await window.db.collection("usuarios").doc(emailId).get();
        if (!doc.exists) return null;
        const dados = { id: doc.id, ...doc.data() };
        window.Store.upsertLocal("usuarios", dados);
        return dados;
    },

    async registrarPreCadastro(dados, userGoogle = null) {
        const emailId = (dados.email || "").trim().toLowerCase();
        const nome = (dados.nome || "").trim();
        const sobrenome = (dados.sobrenome || "").trim();
        const cargoSolicitado = dados.cargo_solicitado || "docente";
        const justificativa = (dados.solicitacao_credenciamento || "").trim();

        if (!emailId || !nome || !sobrenome || !justificativa) {
            throw new Error("Preencha todos os campos obrigatórios do pré-cadastro.");
        }

        window.emProcessoDePreCadastro = true;
        try {
            if (!userGoogle && dados.senha) {
                if (dados.senha.length < 6) {
                    throw new Error("A senha deve possuir no mínimo 6 caracteres.");
                }
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
            if (window.Store?.inicializado) {
                window.Store.upsertLocal("usuarios", { id: emailId, ...novoUsuario });
            }
            return novoUsuario;
        } finally {
            window.emProcessoDePreCadastro = false;
        }
    },

    async salvarPreCadastro(dados, userGoogle = null) {
        return this.registrarPreCadastro(dados, userGoogle);
    }
};