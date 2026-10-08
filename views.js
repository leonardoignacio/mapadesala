// views.js - Construção de Interfaces (UI)
window.Views = {
    
    sidebar(usuario, isCollapsed = false) {
        const isAdmin = usuario.cargo === 'admin';
        const asideClass = isCollapsed ? 'w-20' : 'w-64';
        const textClass = isCollapsed ? 'hidden' : '';
        const paddingClass = isCollapsed ? 'px-0 justify-center' : 'px-4';

        const icons = {
            dashboard: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`,
            excecoes: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`,
            cursos: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`,
            turmas: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`,
            docentes: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`,
            espelho: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path></svg>`,
            admin: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>`,
            logout: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>`
        };

        return `
        <aside id="main-sidebar" class="${asideClass} bg-white border-r border-slate-200 flex flex-col justify-between z-30 transition-all duration-300 flex-shrink-0 shadow-sm relative">
            <div>
                <div class="h-16 flex items-center justify-between px-4 border-b border-slate-100 overflow-hidden">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold flex-shrink-0">IT</div>
                        <span class="font-bold text-lg sidebar-text ${textClass} whitespace-nowrap">InovaTech</span>
                    </div>
                    <button id="btn-toggle-sidebar" class="text-slate-400 hover:text-blue-600 focus:outline-none flex-shrink-0 ${isCollapsed ? 'hidden' : ''}" title="Ocultar Menu">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                    </button>
                    <button id="btn-toggle-sidebar-open" class="text-slate-400 hover:text-blue-600 focus:outline-none flex-shrink-0 mx-auto ${!isCollapsed ? 'hidden' : ''}" title="Expandir Menu">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                </div>
                <nav class="p-4 space-y-2 text-sm font-medium">
                    <a href="#/dashboard" class="flex items-center gap-3 ${paddingClass} py-3 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors" title="Dashboard">${icons.dashboard} <span class="sidebar-text ${textClass} whitespace-nowrap">Dashboard</span></a>
                    <a href="#/excecoes" class="flex items-center gap-3 ${paddingClass} py-3 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors" title="Calendário / Exceções">${icons.excecoes} <span class="sidebar-text ${textClass} whitespace-nowrap">Calendário / Exceções</span></a>
                    <a href="#/cursos" class="flex items-center gap-3 ${paddingClass} py-3 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors" title="Cursos e UCs">${icons.cursos} <span class="sidebar-text ${textClass} whitespace-nowrap">Cursos e UCs</span></a>
                    <a href="#/turmas" class="flex items-center gap-3 ${paddingClass} py-3 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors" title="Turmas">${icons.turmas} <span class="sidebar-text ${textClass} whitespace-nowrap">Turmas</span></a>
                    <a href="#/docentes" class="flex items-center gap-3 ${paddingClass} py-3 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors" title="Docentes">${icons.docentes} <span class="sidebar-text ${textClass} whitespace-nowrap">Docentes</span></a>
                    <a href="#/espelho" class="flex items-center gap-3 ${paddingClass} py-3 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors" title="Espelho de Classe">${icons.espelho} <span class="sidebar-text ${textClass} whitespace-nowrap">Espelho de Classe</span></a>
                    ${isAdmin ? `<a href="#/admin" class="flex items-center gap-3 ${paddingClass} py-3 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors" title="Painel Admin">${icons.admin} <span class="sidebar-text ${textClass} whitespace-nowrap">Painel Admin</span></a>` : ''}
                </nav>
            </div>
            <div class="p-4 bg-slate-50 border-t border-slate-200 overflow-hidden flex flex-col ${isCollapsed ? 'items-center px-0' : ''}">
                <p class="text-xs font-bold truncate sidebar-text ${textClass}" title="${usuario.email}">${usuario.email}</p>
                <p class="text-xs text-slate-500 uppercase sidebar-text ${textClass} mt-1">${usuario.cargo}</p>
                <button id="btn-logout" class="text-xs text-red-600 font-bold mt-2 hover:underline sidebar-text ${textClass} text-left w-full">Sair do Sistema</button>
                <button id="btn-logout-icon" class="text-red-600 hover:text-red-800 ${!isCollapsed ? 'hidden' : ''}" title="Sair do Sistema">${icons.logout}</button>
            </div>
        </aside>
        `;
    },

    excecoes() {
        return `
        <div class="px-8 pt-4 pb-6 fade-in flex-1 overflow-hidden flex flex-col">
            <!-- Título compactado no topo para maximizar espaço -->
            <h1 class="text-xl font-bold mb-3 text-slate-800 w-[90%] mx-auto">Calendário e Exceções</h1>
            
            <div class="flex border-b border-slate-200 mb-4 gap-6 w-[90%] mx-auto">
                <button class="tab-btn active font-bold text-blue-600 border-b-2 border-blue-600 pb-2 transition-colors text-base" data-target="tab-listar">Listar Exceções</button>
                <button class="tab-btn font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent pb-2 transition-colors text-base" data-target="tab-editar">Editar Exceções (Cadastros)</button>
            </div>

            <!-- CONTEÚDO: ABA LISTAR -->
            <div id="tab-listar" class="tab-content flex-1 flex flex-col overflow-hidden">
                <div class="w-[90%] mx-auto flex-1 flex flex-col overflow-hidden pb-2">
                    
                    <!-- Filtros compactos em altura (p-3) -->
                    <div class="bg-white p-3 rounded-t-xl border-t border-x border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-end">
                        
                        <div class="w-full md:w-1/3">
                            <label class="block text-xs font-bold text-slate-500 mb-1">Filtrar por Mês / Ano</label>
                            <div class="flex gap-2">
                                <select id="filtro-mes" class="w-2/3 border border-slate-300 p-2 rounded-lg outline-none focus:border-blue-500 transition text-sm cursor-pointer bg-white">
                                    <option value="">Todos os Meses</option>
                                    <option value="01">Janeiro</option><option value="02">Fevereiro</option>
                                    <option value="03">Março</option><option value="04">Abril</option>
                                    <option value="05">Maio</option><option value="06">Junho</option>
                                    <option value="07">Julho</option><option value="08">Agosto</option>
                                    <option value="09">Setembro</option><option value="10">Outubro</option>
                                    <option value="11">Novembro</option><option value="12">Dezembro</option>
                                </select>
                                <!-- O select de anos será populado dinamicamente pelo app.js (Ano atual + 3 anos) -->
                                <select id="filtro-ano" class="w-1/3 border border-slate-300 p-2 rounded-lg outline-none focus:border-blue-500 transition text-sm cursor-pointer bg-white">
                                    <option value="">Ano</option>
                                </select>
                            </div>
                        </div>

                        <div class="w-full md:w-1/3 relative">
                            <label class="block text-xs font-bold text-slate-500 mb-1">Dias da Semana (Múltiplos)</label>
                            <button id="btn-dropdown-dias" class="w-full border border-slate-300 p-2 rounded-lg outline-none text-sm cursor-pointer bg-white flex justify-between items-center transition focus:border-blue-500 text-slate-700">
                                <span id="label-dias-selecionados" class="truncate">6 dias selecionados</span>
                                <svg class="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                            
                            <div id="menu-dropdown-dias" class="hidden absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-2 flex flex-col gap-1 max-h-56 overflow-y-auto">
                                <label class="flex items-center gap-3 cursor-pointer text-sm text-slate-700 hover:bg-slate-50 p-2 rounded transition">
                                    <input type="checkbox" value="Domingo" class="filtro-dia-chk w-4 h-4 text-blue-600 rounded cursor-pointer"> Domingo
                                </label>
                                <label class="flex items-center gap-3 cursor-pointer text-sm text-slate-700 hover:bg-slate-50 p-2 rounded transition">
                                    <input type="checkbox" value="Segunda-feira" class="filtro-dia-chk w-4 h-4 text-blue-600 rounded cursor-pointer" checked> Segunda-feira
                                </label>
                                <label class="flex items-center gap-3 cursor-pointer text-sm text-slate-700 hover:bg-slate-50 p-2 rounded transition">
                                    <input type="checkbox" value="Terça-feira" class="filtro-dia-chk w-4 h-4 text-blue-600 rounded cursor-pointer" checked> Terça-feira
                                </label>
                                <label class="flex items-center gap-3 cursor-pointer text-sm text-slate-700 hover:bg-slate-50 p-2 rounded transition">
                                    <input type="checkbox" value="Quarta-feira" class="filtro-dia-chk w-4 h-4 text-blue-600 rounded cursor-pointer" checked> Quarta-feira
                                </label>
                                <label class="flex items-center gap-3 cursor-pointer text-sm text-slate-700 hover:bg-slate-50 p-2 rounded transition">
                                    <input type="checkbox" value="Quinta-feira" class="filtro-dia-chk w-4 h-4 text-blue-600 rounded cursor-pointer" checked> Quinta-feira
                                </label>
                                <label class="flex items-center gap-3 cursor-pointer text-sm text-slate-700 hover:bg-slate-50 p-2 rounded transition">
                                    <input type="checkbox" value="Sexta-feira" class="filtro-dia-chk w-4 h-4 text-blue-600 rounded cursor-pointer" checked> Sexta-feira
                                </label>
                                <label class="flex items-center gap-3 cursor-pointer text-sm text-slate-700 hover:bg-slate-50 p-2 rounded transition">
                                    <input type="checkbox" value="Sábado" class="filtro-dia-chk w-4 h-4 text-blue-600 rounded cursor-pointer" checked> Sábado
                                </label>
                            </div>
                        </div>

                        <div class="w-full md:w-1/3">
                            <label class="block text-xs font-bold text-slate-500 mb-1">Pesquisar Descrição</label>
                            <input type="text" id="filtro-desc" placeholder="Ex: Confraternização..." class="w-full border border-slate-300 p-2 rounded-lg outline-none focus:border-blue-500 transition text-sm">
                        </div>
                    </div>

                    <!-- Tabela com altura mínima garantida de 75% da tela -->
                    <div class="bg-white border border-slate-200 rounded-b-xl shadow-sm flex-1 flex flex-col overflow-hidden relative min-h-[75vh]">
                        <div class="overflow-x-auto overflow-y-auto flex-1 w-full bg-white relative">
                            <table class="w-full min-w-[700px] text-left border-separate border-spacing-0 table-fixed">
                                <thead class="bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                                    <tr>
                                        <!-- Cabeçalho compacto de menor altura (py-3) -->
                                        <th class="py-3 px-2 text-xs font-bold text-slate-600 uppercase tracking-wider w-[7%] text-center bg-slate-100 border-b border-slate-200">Ação</th>
                                        <th class="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider w-[15%] bg-slate-100 border-b border-slate-200">Data</th>
                                        <th class="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider w-[20%] bg-slate-100 border-b border-slate-200">Dia da Semana</th>
                                        <th class="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider w-[15%] bg-slate-100 border-b border-slate-200">Tipo</th>
                                        <th class="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider w-[43%] bg-slate-100 border-b border-slate-200">Descrição</th>
                                    </tr>
                                </thead>
                                <tbody id="tabela-excecoes" class="divide-y divide-slate-100">
                                    <tr><td colspan="5" class="p-8 text-center text-slate-400 text-base">Carregando dados...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CONTEÚDO: ABA EDITAR -->
            <div id="tab-editar" class="tab-content hidden space-y-6 overflow-y-auto pb-6">
                <div class="w-[90%] mx-auto space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                            <h2 class="font-bold mb-2 text-slate-800 text-lg">Exportar Domingos (.json)</h2>
                            <p class="text-base text-slate-500 mb-6">Gere e baixe um arquivo contendo todos os domingos letivos do ano escolhido.</p>
                            <div class="flex gap-4 mt-auto">
                                <input type="number" id="ano-domingos" placeholder="Ex: 2027" class="border border-slate-300 rounded-lg px-4 py-2 w-full outline-none focus:border-blue-500 transition text-base">
                                <button id="btn-baixar-domingos" class="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-900 transition shadow-sm whitespace-nowrap text-base">Baixar JSON</button>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                            <h2 class="font-bold mb-4 text-slate-800 text-lg">Cadastro Manual Único</h2>
                            <form id="form-excecao" class="space-y-4">
                                <input type="date" id="exc-data" class="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 transition text-base" required>
                                <select id="exc-tipo" class="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 transition text-base cursor-pointer" required>
                                    <option value="Feriado">Feriado (Gera pontes automáticas)</option>
                                    <option value="Reunião Pedagógica">Reunião Pedagógica</option>
                                    <option value="Cancelamento">Cancelamento (Outros)</option>
                                </select>
                                <input type="text" id="exc-desc" placeholder="Descrição curta..." class="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 transition text-base" required>
                                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-sm text-base">Salvar Exceção</button>
                            </form>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
                        <h2 class="font-bold mb-2 text-slate-800 text-lg">Carga em Lote (Importar JSON)</h2>
                        <p class="text-base text-slate-500 mb-6">Importe um arquivo .json estruturado. Datas duplicadas serão ignoradas automaticamente.</p>
                        <div class="flex flex-col md:flex-row gap-4 items-center">
                            <div class="flex-1 w-full relative">
                                <input type="file" id="arquivo-json" accept=".json" class="block w-full text-base text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-base file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg">
                            </div>
                            <button id="btn-carregar-json" class="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold whitespace-nowrap transition shadow-sm text-base">
                                Confirmar Processamento
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    async cursos() {
        const cursosList = await window.Controller.listarDocs("cursos");
        const optionsCursos = cursosList.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold mb-6 text-slate-800 w-[90%] mx-auto">Cadastro de Cursos e UCs</h1><div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-[90%] mx-auto"><div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h2 class="font-bold mb-4 text-lg">Adicionar Curso Base</h2><form id="form-curso" class="space-y-4"><input type="text" id="curso-nome" placeholder="Ex: Técnico em Informática" class="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 text-base" required><button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition text-base">Salvar Curso</button></form></div><div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h2 class="font-bold mb-4 text-lg">Adicionar UC ou Curso Livre</h2><form id="form-uc" class="space-y-4"><select id="uc-idcurso" class="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 text-base" required><option value="" disabled selected>Vincular a qual curso?</option>${optionsCursos}</select><input type="text" id="uc-nome" placeholder="Ex: Lógica de Programação" class="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 text-base" required><select id="uc-tipo" class="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 text-base" required><option value="UC">Unidade Curricular (UC)</option><option value="Curso Livre">Curso Livre</option></select><input type="number" id="uc-ch" placeholder="Carga Horária Mínima (Ex: 108)" class="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 text-base" required><button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition text-base">Salvar UC</button></form></div></div></div>`;
    },
    dashboard() { return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold w-[90%] mx-auto">Dashboard Executivo</h1><div class="w-[90%] mx-auto"><button onclick="window.location.hash='#/turmas'" class="mt-4 bg-blue-600 text-white font-bold px-4 py-2 rounded shadow-sm">+ Configurar Nova Turma</button></div></div>`; },
    turmas() { return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold w-[90%] mx-auto">Turmas</h1></div>`; },
    docentes() { return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold w-[90%] mx-auto">Docentes</h1></div>`; },
    espelho() { return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold w-[90%] mx-auto">Espelho de Classe</h1></div>`; },
    admin() { return `<div class="p-8 fade-in flex-1"><h1 class="text-2xl font-bold text-purple-900 mb-6 w-[90%] mx-auto">Painel Admin</h1><form id="form-admin" class="bg-white p-6 rounded-lg border border-slate-200 max-w-md space-y-4 shadow-sm w-[90%] mx-auto"><input type="email" id="admin-email" placeholder="E-mail" class="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-purple-500 text-base" required><select id="admin-cargo" class="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-purple-500 text-base"><option value="docente">Docente</option><option value="apoio">Apoio Técnico</option></select><button type="submit" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition text-base">Conceder Acesso</button></form></div>`; }
};