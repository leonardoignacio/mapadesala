// app.js

// O E-mail do Admin conforme solicitado
const EMAIL_SUPERUSUARIO = "leoignacio@gmail.com"; 

let usuarioAtual = { email: null, cargo: null };

const UI = {
    load: document.getElementById('loading-screen'),
    login: document.getElementById('login-screen'),
    root: document.getElementById('app-root')
};

// ==========================================
// 1. AUTENTICAÇÃO
// ==========================================
window.auth.onAuthStateChanged(async (user) => {
    if (user) {
        UI.login.classList.add('hidden');
        UI.load.classList.remove('hidden');
        document.getElementById('loading-text').innerText = "Verificando permissões...";
        
        usuarioAtual.email = user.email;
        const isSuperUser = (user.email === EMAIL_SUPERUSUARIO);
        usuarioAtual.cargo = await window.Controller.obterPerfil(user.email, isSuperUser);

        if (usuarioAtual.cargo === 'sem_acesso') {
            alert("Acesso Negado: Conta não autorizada.");
            window.auth.signOut();
            return;
        }

        UI.load.classList.add('hidden');
        UI.root.classList.remove('hidden');
        roteador(); // Inicia a SPA
    } else {
        usuarioAtual = { email: null, cargo: null };
        UI.root.innerHTML = '';
        UI.root.classList.add('hidden');
        UI.load.classList.add('hidden');
        UI.login.classList.remove('hidden');
    }
});

// Eventos de Login
document.getElementById('btn-google-login').onclick = () => window.auth.signInWithPopup(window.googleProvider);
document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    window.auth.signInWithEmailAndPassword(document.getElementById('email-input').value, document.getElementById('password-input').value)
        .catch(err => alert("Erro: " + err.message));
};
document.getElementById('btn-primeiro-acesso').onclick = () => {
    window.auth.createUserWithEmailAndPassword(document.getElementById('email-input').value, document.getElementById('password-input').value)
        .then(() => alert("Senha criada! Aguarde..."))
        .catch(err => alert(err.message));
};

// ==========================================
// 2. ROTEAMENTO E EVENT DELEGATION
// ==========================================
async function roteador() {
    let hash = window.location.hash || '#/dashboard';
    
    // Bloqueia rota admin
    if(hash === '#/admin' && usuarioAtual.cargo !== 'admin') {
        window.location.hash = '#/dashboard'; return;
    }

    // Desenha o Shell (Sidebar + Container)
    UI.root.innerHTML = window.Views.sidebar(usuarioAtual) + `<div id="view-content" class="flex-1 bg-slate-50 flex overflow-y-auto"></div>`;
    const viewContainer = document.getElementById('view-content');

    document.getElementById('btn-logout').onclick = () => window.auth.signOut();

    // Injeta a View específica
    switch(hash) {
        case '#/excecoes': viewContainer.innerHTML = window.Views.excecoes(); break;
        case '#/cursos': viewContainer.innerHTML = await window.Views.cursos(); break;
        case '#/turmas': viewContainer.innerHTML = window.Views.turmas(); break;
        case '#/docentes': viewContainer.innerHTML = window.Views.docentes(); break;
        case '#/espelho': viewContainer.innerHTML = window.Views.espelho(); break;
        case '#/admin': viewContainer.innerHTML = window.Views.admin(); break;
        default: viewContainer.innerHTML = window.Views.dashboard();
    }
}
window.addEventListener('hashchange', roteador);

// Delegação Global de Eventos (Trata todos os submits de formulários dinâmicos)
document.addEventListener('submit', async (e) => {
    if(usuarioAtual.cargo === 'apoio') {
        e.preventDefault();
        return alert("Permissão Negada: Usuários de Apoio possuem apenas leitura.");
    }

    // Formulário: Domingos e Exceções
    if(e.target.id === 'form-excecao') {
        e.preventDefault();
        const data = document.getElementById('exc-data').value;
        const tipo = document.getElementById('exc-tipo').value;
        const desc = document.getElementById('exc-desc').value;
        await window.Controller.salvarExcecaoManual(data, tipo, desc);
        alert("Exceção cadastrada!");
        e.target.reset();
    }
    // Formulário: Curso
    if(e.target.id === 'form-curso') {
        e.preventDefault();
        await window.Controller.salvarCurso(document.getElementById('curso-nome').value);
        alert("Curso salvo!");
        roteador(); // Atualiza a tela para o select de UCs pegar o novo curso
    }
    // Formulário: UC
    if(e.target.id === 'form-uc') {
        e.preventDefault();
        await window.Controller.salvarUC(
            document.getElementById('uc-idcurso').value,
            document.getElementById('uc-nome').value,
            document.getElementById('uc-tipo').value,
            document.getElementById('uc-ch').value
        );
        alert("UC / Curso Livre salvo!");
        e.target.reset();
    }
    // Formulário: Admin
    if(e.target.id === 'form-admin') {
        e.preventDefault();
        await window.Controller.salvarPermissao(
            document.getElementById('admin-email').value,
            document.getElementById('admin-cargo').value
        );
        alert("Permissão concedida!");
        e.target.reset();
    }
});

// Botão gerador de domingos
document.addEventListener('click', async (e) => {
    if(e.target.id === 'btn-gerar-domingos') {
        const ano = document.getElementById('ano-domingos').value;
        if(!ano) return alert("Digite o ano.");
        e.target.innerText = "Gerando...";
        await window.Controller.gerarDomingos(ano);
        alert("Todos os domingos de " + ano + " foram bloqueados no calendário!");
        e.target.innerText = "Gerar";
    }
});