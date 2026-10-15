// ./usuarios/app_usuarios.js - Controle de Eventos e Fluxo de Pré-Cadastro de Usuários
window.AppUsuarios = {

    injetarModalSeNecessario() {
        if (!document.getElementById('modal-pre-cadastro')) {
            const container = document.getElementById('usuarios-modal-root') || document.body;
            container.insertAdjacentHTML('beforeend', window.ViewsUsuarios.renderizarModalPreCadastro());
        }
    },

    // Abre o modal para pré-cadastro (pelo link da tela de login ou após autenticação Google sem perfil)
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

        // Se o usuário havia autenticado com o Google e cancelou o pré-cadastro, encerra a sessão pendente
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

        return false;
    },

    async tratarSubmits(e) {
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

                await window.ControllerUsuarios.registrarPreCadastro(dados, !isOrigemGoogle);

                document.getElementById('modal-pre-cadastro')?.classList.add('hidden');
                e.target.reset();

                alert("Pré-cadastro enviado com sucesso! Sua solicitação de credenciamento será analisada por um Administrador ou Técnico de Área.");
            } catch (err) {
                alert(err.message);
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