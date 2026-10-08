// app.js - Delegação de Eventos e Roteamento
const EMAIL_SUPERUSUARIO = "leoignacio@gmail.com"; 

let usuarioAtual = { email: null, cargo: null };
let cacheExcecoes = []; 
let isSidebarCollapsed = false; 

const UI = {
    load: document.getElementById('loading-screen'),
    login: document.getElementById('login-screen'),
    root: document.getElementById('app-root')
};

// ==========================================
// 1. AUTENTICAÇÃO E RENDERIZAÇÃO DE MENU
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
            alert("Acesso Negado: Conta não autorizada na Whitelist.");
            window.auth.signOut();
            return;
        }

        UI.load.classList.add('hidden');
        UI.root.classList.remove('hidden');
        roteador(); 
    } else {
        usuarioAtual = { email: null, cargo: null };
        cacheExcecoes = [];
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

// ==========================================
// 2. LÓGICA DA TABELA E FILTROS REATIVOS
// ==========================================
async function atualizarTabelaExcecoes() {
    const tbody = document.getElementById('tabela-excecoes');
    if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500 font-medium text-base">Carregando dados...</td></tr>`;
    
    // Popula o Select de Anos dinamicamente (Ano atual + 3 próximos)
    popularSelectAnos();

    cacheExcecoes = await window.Controller.listarExcecoes();
    renderizarTabelaExcecoes(); 
}

function popularSelectAnos() {
    const selectAno = document.getElementById('filtro-ano');
    if (!selectAno || selectAno.options.length > 1) return; // Evita duplicar se já foi populado

    const anoAtual = new Date().getFullYear();
    for (let i = 0; i < 4; i++) {
        const anoStr = (anoAtual + i).toString();
        const opt = document.createElement('option');
        opt.value = anoStr;
        opt.textContent = anoStr;
        selectAno.appendChild(opt);
    }
}

function renderizarTabelaExcecoes() {
    const tbody = document.getElementById('tabela-excecoes');
    if(!tbody) return;

    const filtroMes = document.getElementById('filtro-mes')?.value || ""; 
    const filtroAno = document.getElementById('filtro-ano')?.value || "";
    const filtroDesc = document.getElementById('filtro-desc')?.value.toLowerCase() || "";

    const checkboxesDias = document.querySelectorAll('.filtro-dia-chk:checked');
    const diasSelecionados = Array.from(checkboxesDias).map(chk => chk.value);

    const dadosFiltrados = cacheExcecoes.filter(item => {
        const [anoItem, mesItem, diaItem] = item.data.split('-');
        
        const matchAno = filtroAno ? (anoItem === filtroAno) : true;
        const matchMes = filtroMes ? (mesItem === filtroMes) : true;
        const matchDesc = filtroDesc ? (item.descricao && item.descricao.toLowerCase().includes(filtroDesc)) : true;
        const matchDia = diasSelecionados.length === 0 ? true : diasSelecionados.includes(item.dia_semana);

        return matchAno && matchMes && matchDesc && matchDia;
    });

    if(dadosFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500 font-medium text-base">Nenhuma exceção encontrada para estes filtros.</td></tr>`;
        return;
    }

    const html = dadosFiltrados.map(item => {
        let badgeColor = "bg-slate-100 text-slate-700";
        if(item.excecao === "Feriado") badgeColor = "bg-red-100 text-red-700";
        else if(item.excecao === "Domingo") badgeColor = "bg-blue-100 text-blue-700";
        else if(item.excecao === "Ponte") badgeColor = "bg-amber-100 text-amber-800";

        const dataBr = item.data.split('-').reverse().join('/');

        // Botão extremamente compacto contendo apenas o ícone SVG puro (sem texto)
        return `
        <tr class="hover:bg-slate-50 transition">
            <td class="px-2 py-2 text-base border-b border-slate-200 align-middle text-center w-[7%]">
                ${usuarioAtual.cargo !== 'apoio' ? `<button class="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition btn-excluir-exc inline-flex items-center justify-center" data-id="${item.data}" title="Excluir"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>` : `<span class="text-slate-300">-</span>`}
            </td>
            <td class="py-2.5 px-4 text-base font-bold text-slate-800 border-b border-slate-200 align-middle w-[15%]">${dataBr}</td>
            <td class="py-2.5 px-4 text-base text-slate-600 border-b border-slate-200 align-middle whitespace-nowrap w-[20%]">${item.dia_semana || "-"}</td>
            <td class="py-2.5 px-4 border-b border-slate-200 align-middle w-[15%]" ><span class="px-2.5 py-1 rounded text-sm font-bold shadow-sm ${badgeColor}">${item.excecao}</span></td>
            <td class="py-2.5 px-4 text-sm text-slate-700 border-b border-slate-200 align-middle whitespace-normal break-words w-[43%]">${item.descricao}</td>
        </tr>
        `;
    }).join('');

    tbody.innerHTML = html;
}

document.addEventListener('input', (e) => {
    if(['filtro-mes', 'filtro-ano', 'filtro-desc'].includes(e.target.id)) {
        renderizarTabelaExcecoes();
    }
});

document.addEventListener('change', (e) => {
    if (e.target.classList.contains('filtro-dia-chk')) {
        const checkboxes = document.querySelectorAll('.filtro-dia-chk:checked');
        const label = document.getElementById('label-dias-selecionados');
        
        if (checkboxes.length === 0) {
            label.textContent = "Nenhum dia selecionado";
        } else if (checkboxes.length === 1) {
            label.textContent = checkboxes[0].value;
        } else if (checkboxes.length === 7) {
            label.textContent = "Todos os dias";
        } else {
            label.textContent = `${checkboxes.length} dias selecionados`;
        }
        
        renderizarTabelaExcecoes();
    }
});

// ==========================================
// 3. ROTEAMENTO
// ==========================================
async function roteador() {
    let hash = window.location.hash || '#/dashboard';
    if(hash === '#/admin' && usuarioAtual.cargo !== 'admin') { window.location.hash = '#/dashboard'; return; }

    UI.root.innerHTML = window.Views.sidebar(usuarioAtual, isSidebarCollapsed) + `<div id="view-content" class="flex-1 bg-slate-50 flex overflow-hidden"></div>`;
    const viewContainer = document.getElementById('view-content');

    switch(hash) {
        case '#/excecoes': 
            viewContainer.innerHTML = window.Views.excecoes(); 
            await atualizarTabelaExcecoes(); 
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
// 4. DELEGAÇÃO DE EVENTOS GERAIS
// ==========================================

document.addEventListener('submit', async (e) => {
    if(usuarioAtual.cargo === 'apoio') { e.preventDefault(); return alert("Acesso de Leitura Apenas."); }

    if(e.target.id === 'form-excecao') {
        e.preventDefault();
        try {
            await window.Controller.salvarExcecaoManual(
                document.getElementById('exc-data').value,
                document.getElementById('exc-tipo').value,
                document.getElementById('exc-desc').value
            );
            alert("Exceção cadastrada com sucesso!");
            e.target.reset();
            atualizarTabelaExcecoes(); 
        } catch (error) { alert(error.message); }
    }
    
    if(e.target.id === 'form-curso') { e.preventDefault(); await window.Controller.salvarCurso(document.getElementById('curso-nome').value); alert("Curso salvo!"); roteador(); }
    if(e.target.id === 'form-uc') { e.preventDefault(); await window.Controller.salvarUC(document.getElementById('uc-idcurso').value, document.getElementById('uc-nome').value, document.getElementById('uc-tipo').value, document.getElementById('uc-ch').value); alert("UC salva!"); e.target.reset(); }
    if(e.target.id === 'form-admin') { e.preventDefault(); await window.Controller.salvarPermissao(document.getElementById('admin-email').value, document.getElementById('admin-cargo').value); alert("Permissão inserida!"); e.target.reset(); }
});

document.addEventListener('click', async (e) => {
    
    const btnDropdown = e.target.closest('#btn-dropdown-dias');
    const menuDropdown = document.getElementById('menu-dropdown-dias');
    
    if (btnDropdown) {
        menuDropdown.classList.toggle('hidden');
    } else if (menuDropdown && !menuDropdown.contains(e.target) && !e.target.classList.contains('filtro-dia-chk')) {
        menuDropdown.classList.add('hidden');
    }

    if(e.target.closest('#btn-toggle-sidebar') || e.target.closest('#btn-toggle-sidebar-open')) {
        isSidebarCollapsed = !isSidebarCollapsed;
        applySidebarState();
        return;
    }

    if(e.target.closest('#btn-logout') || e.target.closest('#btn-logout-icon')) { window.auth.signOut(); return; }

    if(usuarioAtual.cargo === 'apoio' && (e.target.id === 'btn-baixar-domingos' || e.target.id === 'btn-carregar-json' || e.target.closest('.btn-excluir-exc'))) return alert("Permissão Negada.");

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

    const btnExcluir = e.target.closest('.btn-excluir-exc');
    if (btnExcluir) {
        const dataId = btnExcluir.getAttribute('data-id');
        if(confirm(`Excluir a data ${dataId.split('-').reverse().join('/')}?`)) {
            await window.Controller.excluirExcecao(dataId);
            atualizarTabelaExcecoes(); 
        }
    }

    if(e.target.id === 'btn-baixar-domingos') {
        const ano = document.getElementById('ano-domingos').value;
        if(!ano) return alert("Por favor, digite o ano desejado.");
        const domingos = window.Controller.gerarArrayDomingos(ano);
        const blob = new Blob([JSON.stringify(domingos, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `domingos_${ano}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    if(e.target.id === 'btn-carregar-json') {
        const fileInput = document.getElementById('arquivo-json');
        if(!fileInput.files.length) return alert("Escolha um arquivo .json.");

        const btnConfirma = e.target;
        btnConfirma.innerText = "Processando Banco...";
        btnConfirma.disabled = true;

        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const dadosJson = JSON.parse(event.target.result);
                if(!Array.isArray(dadosJson)) throw new Error("Arquivo inválido.");
                const qtdInseridos = await window.Controller.carregarExcecoesLote(dadosJson);
                if(qtdInseridos === 0) alert("Concluído: Nenhuma nova data foi inserida.");
                else { alert(`Sucesso! ${qtdInseridos} inserções.`); atualizarTabelaExcecoes(); }
            } catch(error) { alert("Erro: " + error.message);
            } finally { btnConfirma.innerText = "Confirmar Processamento"; btnConfirma.disabled = false; fileInput.value = ""; }
        };
        reader.readAsText(fileInput.files[0]);
    }
});