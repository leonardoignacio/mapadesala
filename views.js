// views.js - Views Globais (Sidebar, Dashboard Padrão e Placeholders)
window.Views = {

    sidebar(user) {
        const cargo = user?.cargo || 'sem_acesso';
        const isPendente = (cargo === 'pendente');
        const isAdminViewAllowed = ['root', 'admin', 'tecnico'].includes(cargo);
        const hashAtual = window.location.hash || '#/dashboard';

        const linkClass = (targetHash) => {
            const ativo = hashAtual === targetHash;
            return ativo
                ? "flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-600 font-bold transition"
                : "flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition";
        };

        return `
        <aside id="main-sidebar" class="relative w-64 bg-white border-r border-slate-200 flex flex-col justify-between z-30 transition-all duration-300 flex-shrink-0 shadow-sm">
            <!-- Topo da Sidebar -->
            <div>
                <div class="h-16 flex items-center justify-between px-4 border-b border-slate-100">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">IT</div>
                        <span class="sidebar-text font-extrabold text-lg text-slate-800 tracking-tight">InovaTech</span>
                    </div>
                    <button id="btn-toggle-sidebar" class="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition focus:outline-none" title="Recolher Menu">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                    </button>
                    <button id="btn-toggle-sidebar-open" class="hidden text-slate-400 hover:text-slate-700 p-1 rounded-lg transition focus:outline-none" title="Expandir Menu">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                    </button>
                </div>

                <!-- Navegação -->
                <nav class="p-3 space-y-1">
                    <a href="#/dashboard" class="${linkClass('#/dashboard')}" title="Dashboard">
                        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                        <span class="sidebar-text text-sm">Dashboard</span>
                    </a>

                    ${!isPendente ? `
                    <a href="#/excecoes" class="${linkClass('#/excecoes')}" title="Calendário / Exceções">
                        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span class="sidebar-text text-sm">Calendário / Exceções</span>
                    </a>

                    <a href="#/cursos" class="${linkClass('#/cursos')}" title="Cursos e UCs">
                        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                        <span class="sidebar-text text-sm">Cursos e UCs</span>
                    </a>

                    <a href="#/turmas" class="${linkClass('#/turmas')}" title="Turmas">
                        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        <span class="sidebar-text text-sm">Turmas</span>
                    </a>

                    <a href="#/docentes" class="${linkClass('#/docentes')}" title="Docentes">
                        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        <span class="sidebar-text text-sm">Docentes</span>
                    </a>

                    <a href="#/espelho" class="${linkClass('#/espelho')}" title="Espelho de Classe">
                        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path></svg>
                        <span class="sidebar-text text-sm">Espelho de Classe</span>
                    </a>

                    ${isAdminViewAllowed ? `
                    <a href="#/admin" class="flex items-center gap-3 px-4 py-3 rounded-xl ${hashAtual === '#/admin' ? 'bg-purple-100 text-purple-700 font-bold' : 'bg-purple-50/60 text-purple-700 hover:bg-purple-100/80 font-semibold'} transition mt-2" title="Painel Admin">
                        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        <span class="sidebar-text text-sm">Painel Admin</span>
                    </a>
                    ` : ''}
                    ` : ''}
                </nav>
            </div>

            <!-- Rodapé da Sidebar (Usuário e Botão Sair) -->
            <div class="p-4 border-t border-slate-200 bg-slate-50 flex flex-col">
                <div class="sidebar-text mb-2 overflow-hidden">
                    <p class="text-xs font-bold text-slate-700 truncate" title="${user?.email || ''}">${user?.email || ''}</p>
                    <p class="text-[10px] font-extrabold uppercase tracking-wider ${isPendente ? 'text-amber-600' : 'text-slate-400'}">${cargo.toUpperCase()}</p>
                </div>
                <button id="btn-logout" class="text-left text-xs font-bold text-red-600 hover:text-red-700 hover:underline transition">
                    Sair do Sistema
                </button>
                <button id="btn-logout-icon" class="hidden text-red-600 hover:text-red-700 p-2 rounded-lg transition" title="Sair do Sistema">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                </button>
            </div>
        </aside>
        `;
    },

    dashboard() {
        if (window.usuarioAtual && window.usuarioAtual.cargo === 'pendente' && window.ViewsUsuarios) {
            return window.ViewsUsuarios.renderizarDashboardPendente(window.usuarioAtual);
        }

        return `
        <div class="p-6 md:p-8 fade-in flex-1 overflow-y-auto">
            <h1 class="text-2xl font-bold text-slate-800 mb-2">Dashboard</h1>
            <p class="text-slate-500 text-sm">Bem-vindo ao painel de gestão pedagógica InovaTech.</p>
        </div>
        `;
    },

    turmas() {
        return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold text-slate-800">Turmas</h1><p class="text-slate-500 mt-2">Módulo em construção.</p></div>`;
    },

    docentes() {
        return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold text-slate-800">Docentes</h1><p class="text-slate-500 mt-2">Módulo em construção.</p></div>`;
    },

    espelho() {
        return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold text-slate-800">Espelho de Classe</h1><p class="text-slate-500 mt-2">Módulo em construção.</p></div>`;
    },

    admin() {
        return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold text-slate-800">Painel Admin</h1><p class="text-slate-500 mt-2">Módulo de Credenciamento em construção.</p></div>`;
    }
};