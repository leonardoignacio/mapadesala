// ./usuarios/app_usuarios.js - Controle de Eventos e Fluxo de Pré-Cadastro de Usuários
window.AppUsuarios = {

    injetarModalSeNecessario() {
        if (!document.getElementById('modal-pre-cadastro')) {
            const container = document.getElementById('usuarios-modal-root') || document.body;
            container.insertAdjacentHTML('beforeend', window.ViewsUsuarios.renderizarModalPreCadastro());
        }
    },

    abrirModalPreCadastro(userGoogle = null) {
        this.injetarModalSeNecessario();

        const form = document.getElementById('form-pre-cadastro');
        if (form) form.reset();

        const inputOrigemGoogle = document.getElementById('pre-cad-origem-google');
        const inputNome = document.getElementById('pre-cad-nome');
        const inputSobrenome = document.getElementById('pre-cad-sobrenome');
        const inputEmail = document.getElementById('pre-cad-email');
        const inputSenha = document.getElementById('pre-cad-senha');
        const inputConfSenha = document.getElementById('pre-cad-confirmar-senha');
        const blocoSenhas = document.getElementById('bloco-senhas-pre-cadastro');
        const avisoGoogle = document.getElementById('aviso-google-pre-cadastro');

        if (userGoogle && userGoogle.email) {
            inputOrigemGoogle.value = "true";
            const partesNome = (userGoogle.displayName || "").trim().split(" ");
            inputNome.value = partesNome[0] || "";
            inputSobrenome.value = partesNome.slice(1).join(" ") || "";
            inputEmail.value = userGoogle.email;
            inputEmail.readOnly = true;
            inputEmail.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');

            if (blocoSenhas) blocoSenhas.classList.add('hidden');
            if (inputSenha) inputSenha.required = false;
            if (inputConfSenha) inputConfSenha.required = false;
            if (avisoGoogle) avisoGoogle.classList.remove('hidden');
        } else {
            inputOrigemGoogle.value = "false";
            inputNome.value = "";
            inputSobrenome.value = "";
            inputEmail.value = "";
            inputEmail.readOnly = false;
            inputEmail.classList.remove('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');

            if (blocoSenhas) blocoSenhas.classList.remove('hidden');
            if (inputSenha) {
                inputSenha.value = "";
                inputSenha.required = true;
            }
            if (inputConfSenha) {
                inputConfSenha.value = "";
                inputConfSenha.required = true;
            }
            if (avisoGoogle) avisoGoogle.classList.add('hidden');
        }

        document.getElementById('modal-pre-cadastro')?.classList.remove('hidden');
        setTimeout(() => inputNome?.focus(), 100);
    },

    async fecharModalPreCadastro() {
        const inputOrigemGoogle = document.getElementById('pre-cad-origem-google');
        document.getElementById('modal-pre-cadastro')?.classList.add('hidden');

        if (inputOrigemGoogle && inputOrigemGoogle.value === "true" && window.auth.currentUser) {
            await window.auth.signOut();
        }
    },

    async tratarCliques(e) {
        if (e.target.closest('#btn-primeiro-acesso')) {
            this.abrirModalPreCadastro(null);
            return true;
        }

        if (e.target.closest('#btn-close-pre-cadastro') || e.target.closest('#btn-cancel-pre-cadastro')) {
            await this.fecharModalPreCadastro();
            return true;
        }

        // Botão de excluir o próprio cadastro e solicitação (na aba Home do Dashboard pendente)
        if (e.target.closest('#btn-excluir-proprio-cadastro')) {
            const confirmacao = await window.Dialog.confirmar("Tem certeza que deseja excluir seu pré-cadastro e cancelar sua solicitação de credenciamento?", { perigo: true, titulo: "Excluir pré-cadastro", textoConfirmar: "Excluir cadastro" });
            if (!confirmacao) return true;

            const btn = e.target.closest('#btn-excluir-proprio-cadastro');
            const textoOriginal = btn.innerText;
            btn.innerText = "Excluindo...";
            btn.disabled = true;

            try {
                await window.ControllerUsuarios.excluirCadastroProprio(window.usuarioAtual.email);
                await window.Dialog.sucesso("Seu cadastro e sua solicitação de credenciamento foram excluídos com sucesso.");
            } catch (err) {
                await window.Dialog.erro(err, "Erro ao excluir cadastro");
                btn.innerText = textoOriginal;
                btn.disabled = false;
            }
            return true;
        }

        return false;
    },

    async tratarSubmits(e) {
        // Submit do Modal Inicial de Pré-Cadastro
        if (e.target.id === 'form-pre-cadastro') {
            e.preventDefault();

            const btnSubmit = document.getElementById('btn-submit-pre-cadastro');
            const textoOriginal = btnSubmit ? btnSubmit.innerText : "Enviar Solicitação";
            if (btnSubmit) {
                btnSubmit.innerText = "Enviando...";
                btnSubmit.disabled = true;
            }

            try {
                const isOrigemGoogle = document.getElementById('pre-cad-origem-google').value === "true";
                const dados = {
                    nome: document.getElementById('pre-cad-nome').value,
                    sobrenome: document.getElementById('pre-cad-sobrenome').value,
                    email: document.getElementById('pre-cad-email').value,
                    senha: document.getElementById('pre-cad-senha').value,
                    confirmar_senha: document.getElementById('pre-cad-confirmar-senha').value,
                    cargo_solicitado: document.getElementById('pre-cad-cargo').value,
                    solicitacao_credenciamento: document.getElementById('pre-cad-solicitacao').value
                };

                const novoUsuario = await window.ControllerUsuarios.registrarPreCadastro(dados, isOrigemGoogle);

                document.getElementById('modal-pre-cadastro')?.classList.add('hidden');
                e.target.reset();

                // Atualiza o estado atual e direciona imediatamente para o Dashboard restrito (aba Home)
                window.usuarioAtual = {
                    email: novoUsuario.email,
                    cargo: "pendente",
                    nome: novoUsuario.nome,
                    sobrenome: novoUsuario.sobrenome,
                    nome_completo: novoUsuario.nome_completo,
                    cargo_solicitado: novoUsuario.cargo_solicitado,
                    solicitacao_credenciamento: novoUsuario.solicitacao_credenciamento,
                    perfis: [],
                    areas: []
                };

                document.getElementById('login-screen')?.classList.add('hidden');
                document.getElementById('loading-screen')?.classList.add('hidden');
                document.getElementById('app-root')?.classList.remove('hidden');
                window.location.hash = '#/dashboard';
                if (typeof roteador === 'function') await roteador();
            } catch (err) {
                await window.Dialog.erro(err, "Não foi possível enviar a solicitação");
            } finally {
                if (btnSubmit) {
                    btnSubmit.innerText = textoOriginal;
                    btnSubmit.disabled = false;
                }
            }
            return true;
        }

        // Submit do Formulário de Reenviar Solicitação (na aba Home do Dashboard pendente)
        if (e.target.id === 'form-reenviar-solicitacao') {
            e.preventDefault();

            const btnSubmit = document.getElementById('btn-submit-reenviar-solicitacao');
            const textoOriginal = btnSubmit ? btnSubmit.innerText : "Reenviar Solicitação";
            if (btnSubmit) {
                btnSubmit.innerText = "Reenviando...";
                btnSubmit.disabled = true;
            }

            try {
                const dados = {
                    nome: document.getElementById('reenviar-nome').value,
                    sobrenome: document.getElementById('reenviar-sobrenome').value,
                    cargo_solicitado: document.getElementById('reenviar-cargo').value,
                    solicitacao_credenciamento: document.getElementById('reenviar-solicitacao').value
                };

                const atualizados = await window.ControllerUsuarios.reenviarSolicitacao(window.usuarioAtual.email, dados);

                window.usuarioAtual.nome = atualizados.nome;
                window.usuarioAtual.sobrenome = atualizados.sobrenome;
                window.usuarioAtual.nome_completo = atualizados.nome_completo;
                window.usuarioAtual.cargo_solicitado = atualizados.cargo_solicitado;
                window.usuarioAtual.solicitacao_credenciamento = atualizados.solicitacao_credenciamento;

                await window.Dialog.sucesso("Solicitação de credenciamento atualizada e reenviada com sucesso!");
            } catch (err) {
                await window.Dialog.erro(err, "Erro ao reenviar solicitação");
            } finally {
                if (btnSubmit) {
                    btnSubmit.innerText = textoOriginal;
                    btnSubmit.disabled = false;
                }
            }
            return true;
        }

        return false;
    }
};