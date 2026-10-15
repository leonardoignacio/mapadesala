// controller.js - Controlador Global de Sessão, Perfis e Permissões Base
window.Controller = {

    async obterPerfil(email, isSuperUser = false) {
        const emailId = (email || "").trim().toLowerCase();
        if (!emailId) return "sem_acesso";

        // Superusuário (ROOT) acumula todos os perfis e tem acesso total garantido
        if (isSuperUser) {
            const refRoot = window.db.collection("usuarios").doc(emailId);
            const snapRoot = await refRoot.get();
            const todosPerfis = ["root", "admin", "tecnico", "docente", "apoio"];

            if (!snapRoot.exists) {
                await refRoot.set({
                    nome: "Leonardo",
                    sobrenome: "Ignacio",
                    nome_completo: "Leonardo Ignacio",
                    email: emailId,
                    cargo_solicitado: "root",
                    solicitacao_credenciamento: "Superusuário (ROOT) do Sistema",
                    cargo: "root",
                    perfis: todosPerfis,
                    areas: ["Todas"],
                    status: "ativo",
                    criado_em: new Date().toISOString()
                });
            } else {
                const dataRoot = snapRoot.data();
                if (dataRoot.cargo !== "root" || dataRoot.status !== "ativo") {
                    await refRoot.update({
                        cargo: "root",
                        perfis: todosPerfis,
                        status: "ativo"
                    });
                }
            }
            return "root";
        }

        // 1. Consulta na nova coleção estruturada "usuarios"
        const docUsuario = await window.db.collection("usuarios").doc(emailId).get();
        if (docUsuario.exists) {
            const dados = docUsuario.data();
            if (dados.status === "pendente" || dados.cargo === "pendente") {
                return "pendente";
            }
            if (dados.status === "inativo" || dados.status === "bloqueado") {
                return "sem_acesso";
            }
            return dados.cargo || "apoio";
        }

        // 2. Retrocompatibilidade caso existam registros antigos na coleção "permissoes"
        try {
            const docPerm = await window.db.collection("permissoes").doc(emailId).get();
            if (docPerm.exists) {
                return docPerm.data().cargo || "apoio";
            }
        } catch (_) {}

        return "nao_cadastrado";
    },

    async salvarPermissao(email, cargo) {
        const emailId = (email || "").trim().toLowerCase();
        await window.db.collection("usuarios").doc(emailId).set({
            email: emailId,
            cargo: cargo,
            status: "ativo",
            atualizado_em: new Date().toISOString()
        }, { merge: true });
    }
};