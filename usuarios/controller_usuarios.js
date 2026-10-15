// ./usuarios/controller_usuarios.js - Regras de Negócio de Pré-Cadastro e Perfis de Usuários
window.ControllerUsuarios = {

    _normalizarEmail(email) {
        return (email || "").trim().toLowerCase();
    },

    async obterUsuarioPorEmail(email) {
        const emailId = this._normalizarEmail(email);
        if (!emailId) return null;

        const doc = await window.db.collection("usuarios").doc(emailId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    },

    // Registra o pré-cadastro público sem exigir privilégio prévio
    async registrarPreCadastro(dados, criarContaAuth = true) {
        const emailNorm = this._normalizarEmail(dados.email);
        const nomeNorm = (dados.nome || "").trim();
        const sobrenomeNorm = (dados.sobrenome || "").trim();
        const cargoSolicitado = (dados.cargo_solicitado || "").trim();
        const solicitacao = (dados.solicitacao_credenciamento || "").trim();

        if (!nomeNorm || !sobrenomeNorm || !emailNorm || !cargoSolicitado || !solicitacao) {
            throw new Error("Preencha todos os campos obrigatórios do pré-cadastro.");
        }

        window.emProcessoDePreCadastro = true;

        try {
            // 1. Cria a conta no Firebase Auth primeiro (ou recupera se o teste anterior criou apenas no Auth)
            if (criarContaAuth) {
                if (!dados.senha || dados.senha.length < 6) {
                    throw new Error("A senha deve possuir no mínimo 6 caracteres.");
                }
                if (dados.senha !== dados.confirmar_senha) {
                    throw new Error("A confirmação de senha não confere.");
                }

                try {
                    await window.auth.createUserWithEmailAndPassword(emailNorm, dados.senha);
                } catch (authErr) {
                    if (authErr.code === "auth/email-already-in-use") {
                        // Se a conta Auth foi criada na tentativa anterior mas falhou ao gravar no Firestore, autentica para concluir o registro
                        try {
                            await window.auth.signInWithEmailAndPassword(emailNorm, dados.senha);
                        } catch (_) {
                            throw new Error("Este e-mail já possui cadastro ativo no autenticador.");
                        }
                    } else {
                        throw new Error("Erro ao criar credencial: " + authErr.message);
                    }
                }
            }

            // 2. Verifica se já existe documento na coleção "usuarios"
            const existente = await this.obterUsuarioPorEmail(emailNorm);
            if (existente) {
                if (existente.status === "pendente") {
                    throw new Error("Este e-mail já possui uma solicitação de credenciamento pendente de aprovação.");
                }
                throw new Error("Este e-mail já está cadastrado e habilitado no sistema.");
            }

            // 3. Grava o pré-cadastro com status "pendente"
            const novoUsuario = {
                nome: nomeNorm,
                sobrenome: sobrenomeNorm,
                nome_completo: `${nomeNorm} ${sobrenomeNorm}`,
                email: emailNorm,
                cargo_solicitado: cargoSolicitado,
                solicitacao_credenciamento: solicitacao,
                cargo: "pendente",
                perfis: [],
                areas: [],
                status: "pendente",
                criado_em: new Date().toISOString()
            };

            await window.db.collection("usuarios").doc(emailNorm).set(novoUsuario);

            return novoUsuario;
        } finally {
            window.emProcessoDePreCadastro = false;
            if (window.auth.currentUser) {
                await window.auth.signOut();
            }
        }
    }
};