// app.js - Núcleo Global da SPA, Autenticação, Menu, Roteador e Responsividade
const EMAIL_SUPERUSUARIO = "leoignacio@gmail.com"; 

window.usuarioAtual = { email: null, cargo: null };

// Inicia colapsado se for mobile (menor que 768px), aberto se for desktop
let isSidebarCollapsed = window.innerWidth < 768; 

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

// ==========================================
// 2. CONTROLE VISUAL (SIDEBAR RESPONSIVA)
// ==========================================
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

    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        if (isSidebarCollapsed) {
            sidebar.className = "fixed inset-y-0 left-0 -translate-x-full w-64 bg-white border-r border-slate-200 flex flex-col justify-between z-50 transition-transform duration-300 shadow-2xl";
        } else {
            sidebar.className = "fixed inset-y-0 left-0 translate-x-0 w-64 bg-white border-r border-slate-200 flex flex-col justify-between z-50 transition-transform duration-300 shadow-2xl";
        }
        texts.forEach(t => t.classList.remove('hidden'));
        if(btnToggleClose) btnToggleClose.classList.remove('hidden');
        if(btnToggleOpen) btnToggleOpen.classList.add('hidden');
        if(btnLogoutIcon) btnLogoutIcon.classList.add('hidden');
        if(btnLogoutText) btnLogoutText.classList.remove('hidden');
        if(footerDiv) footerDiv.classList.remove('items-center', 'px-0');
        links.forEach(l => { l.classList.add('px-4'); l.classList.remove('px-0', 'justify-center'); });
    } else {
        if (isSidebarCollapsed) {
            sidebar.className = "relative w-20 bg-white border-r border-slate-200 flex flex-col justify-between z-30 transition-all duration-300 flex-shrink-0 shadow-sm translate-x-0";
            texts.forEach(t => t.classList.add('hidden'));
            if(btnToggleClose) btnToggleClose.classList.add('hidden');
            if(btnToggleOpen) btnToggleOpen.classList.remove('hidden');
            if(btnLogoutIcon) btnLogoutIcon.classList.remove('hidden');
            if(btnLogoutText) btnLogoutText.classList.add('hidden');
            if(footerDiv) footerDiv.classList.add('items-center', 'px-0');
            links.forEach(l => { l.classList.remove('px-4'); l.classList.add('px-0', 'justify-center'); });
        } else {
            sidebar.className = "relative w-64 bg-white border-r border-slate-200 flex flex-col justify-between z-30 transition-all duration-300 flex-shrink-0 shadow-sm translate-x-0";
            texts.forEach(t => t.classList.remove('hidden'));
            if(btnToggleClose) btnToggleClose.classList.remove('hidden');
            if(btnToggleOpen) btnToggleOpen.classList.add('hidden');
            if(btnLogoutIcon) btnLogoutIcon.classList.add('hidden');
            if(btnLogoutText) btnLogoutText.classList.remove('hidden');
            if(footerDiv) footerDiv.classList.remove('items-center', 'px-0');
            links.forEach(l => { l.classList.add('px-4'); l.classList.remove('px-0', 'justify-center'); });
        }
    }
}

window.addEventListener('resize', () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile && !isSidebarCollapsed) {
        isSidebarCollapsed = true;
        applySidebarState();
    } else if (!isMobile && isSidebarCollapsed) {
        applySidebarState(); 
    }
});

// ==========================================
// 3. ROTEAMENTO
// ==========================================
async function roteador() {
    let hash = window.location.hash || '#/dashboard';
    if(hash === '#/admin' && window.usuarioAtual.cargo !== 'admin') { window.location.hash = '#/dashboard'; return; }

    UI.root.innerHTML = `
        <div class="md:hidden w-full h-14 bg-blue-600 flex items-center justify-between px-4 shadow-md z-40 fixed top-0 left-0 right-0">
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 bg-white rounded flex items-center justify-center text-blue-600 font-bold">IT</div>
                <span class="text-white font-bold text-lg">InovaTech</span>
            </div>
            <button id="btn-mobile-menu" class="text-white hover:text-blue-200 focus:outline-none">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
        </div>
        ${window.Views.sidebar(window.usuarioAtual)}
        <div id="view-content" class="flex-1 bg-slate-50 flex overflow-hidden pt-14 md:pt-0 relative w-full"></div>
    `;
    
    applySidebarState(); 
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

// ==========================================
// 4. DELEGAÇÃO DE EVENTOS GLOBAIS
// ==========================================
document.addEventListener('submit', async (e) => {
    if(window.usuarioAtual.cargo === 'apoio') { e.preventDefault(); return alert("Acesso de Leitura Apenas."); }
    
    if (window.AppCalendario && await window.AppCalendario.tratarSubmits(e)) return;

    if(e.target.id === 'form-curso') { e.preventDefault(); await window.Controller.salvarCurso(document.getElementById('curso-nome').value); alert("Curso salvo!"); roteador(); }
    if(e.target.id === 'form-uc') { e.preventDefault(); await window.Controller.salvarUC(document.getElementById('uc-idcurso').value, document.getElementById('uc-nome').value, document.getElementById('uc-tipo').value, document.getElementById('uc-ch').value); alert("UC salva!"); e.target.reset(); }
    if(e.target.id === 'form-admin') { e.preventDefault(); await window.Controller.salvarPermissao(document.getElementById('admin-email').value, document.getElementById('admin-cargo').value); alert("Permissão inserida!"); e.target.reset(); }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'popover-input-desc') {
        e.preventDefault();
        document.getElementById('apply-filter-desc')?.click();
    }
});

document.addEventListener('click', async (e) => {
    
    // Toggle Menu Mobile
    if (e.target.closest('#btn-mobile-menu')) {
        isSidebarCollapsed = !isSidebarCollapsed;
        applySidebarState();
        return;
    }

    // Toggle Sidebar PC
    if(e.target.closest('#btn-toggle-sidebar') || e.target.closest('#btn-toggle-sidebar-open')) {
        isSidebarCollapsed = !isSidebarCollapsed;
        applySidebarState();
        return;
    }

    // Oculta menu no mobile se clicar em um link
    if (window.innerWidth < 768 && e.target.closest('nav a') && !isSidebarCollapsed) {
        isSidebarCollapsed = true;
        applySidebarState();
    }

    if(e.target.closest('#btn-logout') || e.target.closest('#btn-logout-icon')) { window.auth.signOut(); return; }

    // Delega eventos da view de calendário
    if (window.AppCalendario && await window.AppCalendario.tratarCliques(e)) return;

    // Gerenciador de Abas (Tabs) Global
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