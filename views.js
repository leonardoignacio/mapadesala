// views.js - Construção de Interfaces (UI)
window.Views = {
    
    sidebar(usuario) {
        const isAdmin = usuario.cargo === 'admin';
        return `
        <aside class="w-64 bg-white border-r border-slate-200 flex flex-col justify-between z-20">
            <div>
                <div class="h-16 flex items-center px-6 border-b border-slate-100">
                    <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold mr-3">IT</div>
                    <span class="font-bold text-lg">InovaTech</span>
                </div>
                <nav class="p-4 space-y-1 text-sm font-medium">
                    <a href="#/dashboard" class="block px-4 py-3 hover:bg-slate-50 text-slate-700 rounded-lg">Dashboard</a>
                    <a href="#/excecoes" class="block px-4 py-3 hover:bg-slate-50 text-slate-700 rounded-lg">Calendário / Exceções</a>
                    <a href="#/cursos" class="block px-4 py-3 hover:bg-slate-50 text-slate-700 rounded-lg">Cursos e UCs</a>
                    <a href="#/turmas" class="block px-4 py-3 hover:bg-slate-50 text-slate-700 rounded-lg">Turmas</a>
                    <a href="#/docentes" class="block px-4 py-3 hover:bg-slate-50 text-slate-700 rounded-lg">Docentes</a>
                    <a href="#/espelho" class="block px-4 py-3 hover:bg-slate-50 text-slate-700 rounded-lg">Espelho de Classe</a>
                    ${isAdmin ? `<a href="#/admin" class="block px-4 py-3 text-purple-600 bg-purple-50 rounded-lg">Painel Admin</a>` : ''}
                </nav>
            </div>
            <div class="p-4 bg-slate-50 border-t border-slate-200">
                <p class="text-xs font-bold truncate">${usuario.email}</p>
                <p class="text-xs text-slate-500 uppercase">${usuario.cargo}</p>
                <button id="btn-logout" class="text-xs text-red-600 font-bold mt-2 hover:underline">Sair</button>
            </div>
        </aside>
        `;
    },

    excecoes() {
        return `
        <div class="p-8 fade-in flex-1 overflow-y-auto flex flex-col">
            <h1 class="text-2xl font-bold mb-6 text-slate-800">Calendário e Exceções</h1>
            
            <!-- Navegação de Abas -->
            <div class="flex border-b border-slate-200 mb-6 gap-6">
                <button class="tab-btn active font-bold text-blue-600 border-b-2 border-blue-600 pb-3 transition-colors" data-target="tab-listar">
                    Listar Exceções
                </button>
                <button class="tab-btn font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent pb-3 transition-colors" data-target="tab-editar">
                    Editar Exceções (Cadastros)
                </button>
            </div>

            <!-- CONTEÚDO: ABA LISTAR -->
            <div id="tab-listar" class="tab-content flex-1">
                <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full max-h-[75vh]">
                    
                    <!-- Barra de Filtros -->
                    <div class="p-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                        <span class="font-bold text-slate-600 text-sm hidden md:block">Filtros:</span>
                        <input type="date" id="filtro-data" class="w-full md:w-auto border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 text-sm shadow-sm transition">
                        
                        <select id="filtro-dia" class="w-full md:w-auto border border-slate-300 p-2.5 rounded-lg outline-none focus:border-blue-500 text-sm shadow-sm transition">
                            <option value="">Qualquer dia da semana</option>
                            <option value="Domingo">Domingo</option>
                            <option value="Segunda-feira">Segunda-feira</option>
                            <option value="Terça-feira">Terça-feira</option>
                            <option value="Quarta-feira">Quarta-feira</