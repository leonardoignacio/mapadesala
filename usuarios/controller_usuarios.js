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

    // Registra o pré-cadastro e mantém o usuário autenticado para acessar a aba Home (Aguardando Credenciamento)
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

            const existente = await this.obterUsuarioPorEmail(emailNorm);
            if (existente) {
                if (existente.status === "pendente") {
                    throw new Error("Este e-mail já possui uma solicitação de credenciamento pendente.");
                }
                throw new Error("Este e-mail já está cadastrado e habilitado no sistema.");
            }

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
        }
    },

    // Permite ao usuário pendente atualizar e reenviar sua solicitação de credenciamento
    async reenviarSolicitacao(email, dados) {
        const emailNorm = this._normalizarEmail(email);
        const nomeNorm = (dados.nome || "").trim();
        const sobrenomeNorm = (dados.sobrenome || "").trim();
        const cargoSolicitado = (dados.cargo_solicitado || "").trim();
        const solicitacao = (dados.solicitacao_credenciamento || "").trim();

        if (!nomeNorm || !sobrenomeNorm || !cargoSolicitado || !solicitacao) {
            throw new Error("Todos os campos são obrigatórios para reenviar a solicitação.");
        }

        const dadosAtualizados = {
            nome: nomeNorm,
            sobrenome: sobrenomeNorm,
            nome_completo: `${nomeNorm} ${sobrenomeNorm}`,
            cargo_solicitado: cargoSolicitado,
            solicitacao_credenciamento: solicitacao,
            status: "pendente",
            atualizado_em: new Date().toISOString()
        };

        await window.db.collection("usuarios").doc(emailNorm).update(dadosAtualizados);
        return dadosAtualizados;
    },

    // Exclui o documento de solicitação no Firestore e remove o cadastro no Firebase Auth
    async excluirCadastroProprio(email) {
        const emailNorm = this._normalizarEmail(email);
        if (!emailNorm) throw new Error("E-mail inválido.");

        // 1. Remove o registro da coleção "usuarios" no Firestore
        await window.db.collection("usuarios").doc(emailNorm).delete();

        // 2. Remove o usuário do Firebase Auth (se a sessão for recente) ou desconecta
        const currentUser = window.auth.currentUser;
        if (currentUser && currentUser.email.toLowerCase() === emailNorm) {
            try {
                await currentUser.delete();
            } catch (_) {
                await window.auth.signOut();
            }
        } else {
            await window.auth.signOut();
        }
    }
};