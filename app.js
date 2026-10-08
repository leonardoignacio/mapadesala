// app.js - Delegação de Eventos e Roteamento
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
            alert("Acesso Negado: Conta não autorizada na Whitelist.");
            window.auth.signOut();
            return;
        }

        UI.load.classList.add('hidden');
        UI.root.classList.remove('hidden');
        roteador(); 
    } else {
        usuarioAtual = { email: null, cargo: null };
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
// 2. ROTEAMENTO E RENDERIZAÇÃO
// ==========================================

// Função auxiliar para popular a tabela de Exceções
async function renderizarTabelaExcecoes() {
    const tbody = document.getElementById('tabela-excecoes');
    if(!tbody) return;
    
    const dados = await window.Controller.listarExcecoes();
    
    if(dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500 font-medium">Nenhuma exceção cadastrada.</td></tr>`;
        return;
    }

    const html = dados.map(item => {
        // Estiliza a cor da Badge baseada no tipo
        let badgeColor = "bg-slate-100 text-slate-700";
        if(item.excecao === "Feriado") badgeColor = "bg-red-100 text-red-700";
        else if(item.excecao === "Domingo") badgeColor = "bg-blue-100 text-blue-700";
        else if(item.excecao === "Ponte") badgeColor = "bg-amber-100 text-amber-800";

        // Converte a data YYYY-MM-DD para DD/MM/YYYY
        const dataBr = item.data.split('-').reverse().join('/');

        return `
        <tr class="hover:bg-slate-50 border-b border-slate-50 transition">
            <td class="p-4 text-sm font-semibold text-slate-800">${dataBr}</td>
            <td class="p-4 text-sm text-slate-600">${item.dia_semana || "-"}</td>
            <td class="p-4 text-sm"><span class="px-2 py-1 rounded text-xs font-bold ${badgeColor}">${item.excecao}</span></td>
            <td class="p-4 text-sm text-slate-600">${item.descricao}</td>
            <td class="p-4 text-sm text-right">
                ${usuarioAtual.cargo !== 'apoio' ? `<button class="text-red-500 hover:text-red-700 font-bold text-xs btn-excluir-exc" data-id="${item.data}">Excluir</button>` : `<span class="text-slate-300 text-xs">Leitura</span>`}
            </td>
        </tr>
        `;
    }).join('');

    tbody.innerHTML = html;
}

async function roteador() {
    let hash = window.location.hash || '#/dashboard';
    if(hash === '#/admin' && usuarioAtual.cargo !== 'admin') { window.location.hash = '#/dashboard'; return; }

    UI.root.innerHTML = window.Views.sidebar(usuarioAtual) + `<div id="view-content" class="flex-1 bg-slate-50 flex overflow-y-auto"></div>`;
    const viewContainer = document.getElementById('view-content');

    document.getElementById('btn-logout').onclick = () => window.auth.signOut();

    switch(hash) {
        case '#/excecoes': 
            viewContainer.innerHTML = window.Views.excecoes(); 
            await renderizarTabelaExcecoes(); // Chama a rotina que preenche a tabela ao carregar a View
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
// 3. DELEGAÇÃO DE EVENTOS
// ==========================================

document.addEventListener('submit', async (e) => {
    if(usuarioAtual.cargo === 'apoio') {
        e.preventDefault();
        return alert("Permissão Negada: Usuários de Apoio possuem apenas leitura.");
    }

    if(e.target.id === 'form-excecao') {
        e.preventDefault();
        const data = document.getElementById('exc-data').value;
        const tipo = document.getElementById('exc-tipo').value;
        const desc = document.getElementById('exc-desc').value;
        
        try {
            await window.Controller.salvarExcecaoManual(data, tipo, desc);
            alert("Exceção cadastrada com sucesso!");
            e.target.reset();
            renderizarTabelaExcecoes(); // Atualiza a tabela imediatamente
        } catch (error) {
            alert(error.message); // Exibe o alerta de duplicidade que veio do Controller
        }
    }
    
    // ... [Demais formulários inalterados (curso, uc, admin)]
    if(e.target.id === 'form-curso') { e.preventDefault(); await window.Controller.salvarCurso(document.getElementById('curso-nome').value); alert("Curso salvo!"); roteador(); }
    if(e.target.id === 'form-uc') { e.preventDefault(); await window.Controller.salvarUC(document.getElementById('uc-idcurso').value, document.getElementById('uc-nome').value, document.getElementById('uc-tipo').value, document.getElementById('uc-ch').value); alert("UC salva!"); e.target.reset(); }
    if(e.target.id === 'form-admin') { e.preventDefault(); await window.Controller.salvarPermissao(document.getElementById('admin-email').value, document.getElementById('admin-cargo').value); alert("Permissão inserida!"); e.target.reset(); }
});

document.addEventListener('click', async (e) => {
    // Regra Global de Leitura
    if(usuarioAtual.cargo === 'apoio' && (e.target.id === 'btn-baixar-domingos' || e.target.id === 'btn-carregar-json' || e.target.closest('.btn-excluir-exc'))) {
        return alert("Permissão Negada.");
    }

    // ----------------------------------------------------
    // Lógica das Abas (Tabs) em Calendários
    // ----------------------------------------------------
    const tabBtn = e.target.closest('.tab-btn');
    if (tabBtn) {
        // Remove estado ativo de todas as abas
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('font-bold', 'text-blue-600', 'border-blue-600');
            btn.classList.add('font-medium', 'text-slate-500', 'border-transparent');
        });
        // Ativa a aba clicada
        tabBtn.classList.remove('font-medium', 'text-slate-500', 'border-transparent');
        tabBtn.classList.add('font-bold', 'text-blue-600', 'border-blue-600');

        // Oculta todos os conteúdos e mostra o Alvo
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(tabBtn.getAttribute('data-target')).classList.remove('hidden');
    }

    // ----------------------------------------------------
    // Ação: Excluir Exceção da Tabela
    // ----------------------------------------------------
    const btnExcluir = e.target.closest('.btn-excluir-exc');
    if (btnExcluir) {
        const dataId = btnExcluir.getAttribute('data-id');
        if(confirm(`Tem certeza que deseja excluir a exceção/feriado do dia ${dataId.split('-').reverse().join('/')}?`)) {
            await window.Controller.excluirExcecao(dataId);
            renderizarTabelaExcecoes(); // Recarrega a tabela visualmente
        }
    }

    // ----------------------------------------------------
    // Ação: Baixar JSON de Domingos
    // ----------------------------------------------------
    if(e.target.id === 'btn-baixar-domingos') {
        const ano = document.getElementById('ano-domingos').value;
        if(!ano) return alert("Por favor, digite o ano desejado.");
        
        // Pega o array do Controller
        const domingos = window.Controller.gerarArrayDomingos(ano);
        
        // Converte para String JSON
        const dataStr = JSON.stringify(domingos, null, 2);
        
        // Cria um Blob (Arquivo de dados na memória do navegador)
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        // Cria um link invisível e força o download
        const a = document.createElement('a');
        a.href = url;
        a.download = `domingos_${ano}.json`;
        document.body.appendChild(a);
        a.click();
        
        // Limpa a memória
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ----------------------------------------------------
    // Ação: Importar JSON em Lote
    // ----------------------------------------------------
    if(e.target.id === 'btn-carregar-json') {
        const fileInput = document.getElementById('arquivo-json');
        if(!fileInput.files.length) return alert("Escolha um arquivo .json antes de processar.");

        const btnConfirma = e.target;
        btnConfirma.innerText = "Processando Banco...";
        btnConfirma.disabled = true;

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = async function(event) {
            try {
                const dadosJson = JSON.parse(event.target.result);
                if(!Array.isArray(dadosJson)) throw new Error("O arquivo não é um array/vetor válido.");

                const qtdInseridos = await window.Controller.carregarExcecoesLote(dadosJson);
                
                if(qtdInseridos === 0) {
                    alert("Operação concluída: Todas as datas do arquivo já existiam no banco. Nenhuma duplicidade foi gerada.");
                } else {
                    alert(`Sucesso! ${qtdInseridos} novas exceções/pontes foram inseridas no banco.`);
                    renderizarTabelaExcecoes(); // Atualiza a aba da tabela
                }
            } catch(error) {
                alert("Erro ao processar o arquivo: " + error.message);
            } finally {
                btnConfirma.innerText = "Confirmar Processamento";
                btnConfirma.disabled = false;
                fileInput.value = ""; 
            }
        };
        reader.readAsText(file);
    }
});