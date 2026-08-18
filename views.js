// views.js
window.Views = {
    // Menu Lateral unificado
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

    // Nova View: Exceções do Calendário
    excecoes() {
        return `
        <div class="p-8 fade-in flex-1">
            <h1 class="text-2xl font-bold mb-6">Calendário e Exceções</h1>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Gerador Automático -->
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 class="font-bold mb-2">Gerador de Domingos</h2>
                    <p class="text-sm text-slate-500 mb-4">Popule o banco de dados com todos os domingos do ano letivo.</p>
                    <div class="flex gap-2">
                        <input type="number" id="ano-domingos" placeholder="Ex: 2026" class="border border-slate-300 rounded px-3 py-2 w-32 outline-none">
                        <button id="btn-gerar-domingos" class="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900">Gerar</button>
                    </div>
                </div>

                <!-- Cadastro Manual -->
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 class="font-bold mb-4">Cadastro Manual (Feriados/Cancelamentos)</h2>
                    <form id="form-excecao" class="space-y-3">
                        <input type="date" id="exc-data" class="w-full border p-2 rounded" required>
                        <select id="exc-tipo" class="w-full border p-2 rounded" required>
                            <option value="Feriado">Feriado</option>
                            <option value="Reunião Pedagógica">Reunião Pedagógica</option>
                            <option value="Cancelamento">Cancelamento (Outros)</option>
                        </select>
                        <input type="text" id="exc-desc" placeholder="Descrição curta..." class="w-full border p-2 rounded" required>
                        <button type="submit" class="w-full bg-blue-600 text-white font-bold py-2 rounded">Salvar Exceção</button>
                    </form>
                </div>
            </div>
        </div>
        `;
    },

    // Nova View: Cursos e UCs
    async cursos() {
        // Carrega cursos para popular o select de UCs
        const cursosList = await window.Controller.listarDocs("cursos");
        const optionsCursos = cursosList.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

        return `
        <div class="p-8 fade-in flex-1">
            <h1 class="text-2xl font-bold mb-6">Cadastro de Cursos e UCs</h1>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Cadastro de Curso -->
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 class="font-bold mb-4">Adicionar Curso Base</h2>
                    <form id="form-curso" class="space-y-3">
                        <input type="text" id="curso-nome" placeholder="Ex: Técnico em Informática" class="w-full border p-2 rounded" required>
                        <button type="submit" class="w-full bg-blue-600 text-white font-bold py-2 rounded">Salvar Curso</button>
                    </form>
                </div>

                <!-- Cadastro de UC / Curso Livre -->
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 class="font-bold mb-4">Adicionar UC ou Curso Livre</h2>
                    <form id="form-uc" class="space-y-3">
                        <select id="uc-idcurso" class="w-full border p-2 rounded" required>
                            <option value="" disabled selected>Vincular a qual curso?</option>
                            ${optionsCursos}
                        </select>
                        <input type="text" id="uc-nome" placeholder="Ex: Lógica de Programação" class="w-full border p-2 rounded" required>
                        <select id="uc-tipo" class="w-full border p-2 rounded" required>
                            <option value="UC">Unidade Curricular (UC)</option>
                            <option value="Curso Livre">Curso Livre</option>
                        </select>
                        <input type="number" id="uc-ch" placeholder="Carga Horária Mínima (Ex: 108)" class="w-full border p-2 rounded" required>
                        <button type="submit" class="w-full bg-blue-600 text-white font-bold py-2 rounded">Salvar UC</button>
                    </form>
                </div>
            </div>
        </div>
        `;
    },

    // Views placeholders para Turmas, Docentes e Admin
    dashboard() { return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold">Dashboard Executivo</h1><button onclick="window.location.hash='#/turmas'" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded">+ Configurar Nova Turma</button></div>`; },
    turmas() { return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold">Turmas (Em construção baseada nas UCs)</h1></div>`; },
    docentes() { return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold">Docentes</h1></div>`; },
    espelho() { return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold">Espelho de Classe (Calendário)</h1></div>`; },
    
    admin() {
        return `
        <div class="p-8 fade-in flex-1">
            <h1 class="text-2xl font-bold text-purple-900 mb-6">Painel Admin</h1>
            <form id="form-admin" class="bg-white p-6 rounded-lg border max-w-md space-y-3">
                <input type="email" id="admin-email" placeholder="E-mail" class="w-full border p-2 rounded" required>
                <select id="admin-cargo" class="w-full border p-2 rounded">
                    <option value="docente">Docente</option>
                    <option value="apoio">Apoio Técnico</option>
                </select>
                <button type="submit" class="w-full bg-purple-600 text-white font-bold py-2 rounded">Conceder Acesso</button>
            </form>
        </div>
        `;
    }
};