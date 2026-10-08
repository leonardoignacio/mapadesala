// app.js - Núcleo Global da SPA, Autenticação, Menu e Roteador
const EMAIL_SUPERUSUARIO = "leoignacio@gmail.com"; 

window.usuarioAtual = { email: null, cargo: null };
let isSidebarCollapsed = false; 

const UI = {
    load: document.getElementById('loading-screen'),
    login: document.getElementById('login-screen'),
    root: document.getElementById('app-root')
};

window.auth.onAuthStateChanged(async (user) => {
    if (user) {
        UI.login.classList.add('hidden');
        UI.load.classList.remove('hidden');
        document.getElementById('loading-text').innerText = "Verificando permissões...";
        
        window.usuarioAtual.email = user.email;
        const isSuperUser = (user.email === EMAIL_SUPERUSUARIO);
        window.usuarioAtual.cargo = await window.Controller.obterPerfil(user.email, isSuperUser);

        if (window.usuarioAtual.cargo === 'sem_acesso') {
            alert("Acesso Negado: Conta não autorizada na Whitelist.");
            window.auth.signOut();
            return;
        }

        UI.load.classList.add('hidden');
        UI.root.classList.remove('hidden');
        roteador(); 
    } else {
        window.usuarioAtual = { email: null, cargo: null };
        UI.root.innerHTML = '';
        UI.root.classList.add('hidden');
        UI.load.classList.add('hidden');
        UI.login.classList.remove('hidden');
    }
});

document.getElementById('btn-google-login').onclick = () => window.auth.signInWithPopup(window.googleProvider);
document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    window.auth.signInWithEmailAndPassword(document.getElementById('email-input').value, document.getElementById('password-input').value)
        .catch(err => alert("Erro: " + err.message));
};
document.getElementById('btn-primeiro-acesso').onclick = () => {
    window.auth.createUserWithEmailAndPassword(document.getElementById('email-input').value, document.getElementById('password-input').value)
        .then(() => alert("Senha criada! Aguarde o login..."))
        .catch(err => alert(err.message));
};

function applySidebarState() {
    const sidebar = document.getElementById('main-sidebar');
    if(!sidebar) return;
    
    const texts = sidebar.querySelectorAll('.sidebar-text');
    const btnToggleClose = document.getElementById('btn-toggle-sidebar');
    const btnToggleOpen = document.getElementById('btn-toggle-sidebar-open');
    const btnLogoutIcon = document.getElementById('btn-logout-icon');
    const btnLogoutText = document.getElementById('btn-logout');
    const links = sidebar.querySelectorAll('nav a');
    const footerDiv = sidebar.querySelector('.bg-slate-50');

    if (isSidebarCollapsed) {
        sidebar.classList.replace('w-64', 'w-20');
        texts.forEach(t => t.classList.add('hidden'));
        btnToggleClose.classList.add('hidden');
        btnToggleOpen.classList.remove('hidden');
        if(btnLogoutIcon) btnLogoutIcon.classList.remove('hidden');
        if(btnLogoutText) btnLogoutText.classList.add('hidden');
        footerDiv.classList.add('items-center', 'px-0');
        links.forEach(l => { l.classList.remove('px-4'); l.classList.add('px-0', 'justify-center'); });
    } else {
        sidebar.classList.replace('w-20', 'w-64');
        texts.forEach(t => t.classList.remove('hidden'));
        btnToggleClose.classList.remove('hidden');
        btnToggleOpen.classList.add('hidden');
        if(btnLogoutIcon) btnLogoutIcon.classList.add('hidden');
        if(btnLogoutText) btnLogoutText.classList.remove('hidden');
        footerDiv.classList.remove('items-center', 'px-0');
        links.forEach(l => { l.classList.add('px-4'); l.classList.remove('px-0', 'justify-center'); });
    }
}

async function roteador() {
    let hash = window.location.hash || '#/dashboard';
    if(hash === '#/admin' && window.usuarioAtual.cargo !== 'admin') { window.location.hash = '#/dashboard'; return; }

    UI.root.innerHTML = window.Views.sidebar(window.usuarioAtual, isSidebarCollapsed) + `<div id="view-content" class="flex-1 bg-slate-50 flex overflow-hidden"></div>`;
    const viewContainer = document.getElementById('view-content');

    switch(hash) {
        case '#/excecoes': 
            viewContainer.innerHTML = window.ViewsCalendario.renderizar(); 
            if (window.AppCalendario) await window.AppCalendario.iniciarView();
            break;
        case '#/cursos': viewContainer.innerHTML = await window.Views.cursos(); break;
        case '#/turmas': viewContainer.innerHTML = window.Views.turmas(); break;
        case '#/docentes': viewContainer.innerHTML = window.Views.docentes(); break;
        case '#/espelho': viewContainer.innerHTML = window.Views.espelho(); break;
        case '#/admin': viewContainer.innerHTML = window.Views.admin(); break;
        default: viewContainer.innerHTML = window.Views.dashboard();
    }
}
window.addEventListener('hashchange', roteador);

document.addEventListener('submit', async (e) => {
    if(window.usuarioAtual.cargo === 'apoio') { e.preventDefault(); return alert("Acesso de Leitura Apenas."); }
    
    // Delega submissões da view de calendário para o submódulo
    if (window.AppCalendario && await window.AppCalendario.tratarSubmits(e)) return;

    if(e.target.id === 'form-curso') { e.preventDefault(); await window.Controller.salvarCurso(document.getElementById('curso-nome').value); alert("Curso salvo!"); roteador(); }
    if(e.target.id === 'form-uc') { e.preventDefault(); await window.Controller.salvarUC(document.getElementById('uc-idcurso').value, document.getElementById('uc-nome').value, document.getElementById('uc-tipo').value, document.getElementById('uc-ch').value); alert("UC salva!"); e.target.reset(); }
    if(e.target.id === 'form-admin') { e.preventDefault(); await window.Controller.salvarPermissao(document.getElementById('admin-email').value, document.getElementById('admin-cargo').value); alert("Permissão inserida!"); e.target.reset(); }
});

document.addEventListener('click', async (e) => {
    if(e.target.closest('#btn-toggle-sidebar') || e.target.closest('#btn-toggle-sidebar-open')) {
        isSidebarCollapsed = !isSidebarCollapsed;
        applySidebarState();
        return;
    }

    if(e.target.closest('#btn-logout') || e.target.closest('#btn-logout-icon')) { window.auth.signOut(); return; }

    // Delega cliques da view de calendário para o submódulo
    if (window.AppCalendario && await window.AppCalendario.tratarCliques(e)) return;

    const tabBtn = e.target.closest('.tab-btn');
    if (tabBtn) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('font-bold', 'text-blue-600', 'border-blue-600');
            btn.classList.add('font-medium', 'text-slate-500', 'border-transparent');
        });
        tabBtn.classList.remove('font-medium', 'text-slate-500', 'border-transparent');
        tabBtn.classList.add('font-bold', 'text-blue-600', 'border-blue-600');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(tabBtn.getAttribute('data-target')).classList.remove('hidden');
    }
});