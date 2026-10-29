// ./admin/app_admin_credenciamento.js - Lógica e Eventos da Aba Credenciamento (Painel Admin)
let cacheUsuariosCred = [];
let cacheAreasCred = [];

let filtrosCredenciamento = {
    status: ["Todos"],
    nome: "",
    cargos: ["Todos"],
    areas: ["Todos"]
};

window.AppAdminCredenciamento = {

    async iniciarView() {
        await this.carregarDadosBase();
        this.popularFiltrosAreas();
        this.renderizarResumoBadges();
        this.renderizarTabelaCredenciamento();
    },

    async carregarDadosBase() {
        const tbody = document.getElementById('tabela-credenciamento');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Carregando solicitações e usuários...</td></tr>`;

        [cacheUsuariosCred, cacheAreasCred] = await Promise.all([
            window.ControllerAdminCredenciamento.listarUsuarios(),
            window.ControllerAdminCredenciamento.listarAreasCadastradas()
        ]);
    },

    popularFiltrosAreas() {
        const container = document.getElementById('popover-container-cred-areas');
        if (!container) return;

        const isTodosChecked = filtrosCredenciamento.areas.includes("Todos");
        const chks = cacheAreasCred.map(a => {
            const isChecked = isTodosChecked || filtrosCredenciamento.areas.includes(a.nome);
            return `<label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="${window.Util.esc(a.nome)}" class="popover-area-cred-chk w-4 h-4 text-blue-600 rounded" ${isChecked ? 'checked' : ''}> <span class="truncate" title="${window.Util.esc(a.nome)}">${window.Util.esc(a.nome)}</span></label>`;
        }).join('');

        container.innerHTML = `
            <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-semibold"><input type="checkbox" value="Todos" class="popover-area-cred-chk w-4 h-4 text-blue-600 rounded" ${isTodosChecked ? 'checked' : ''}> Todos</label>
            ${chks}
        `;
    },

    renderizarResumoBadges() {
        const container = document.getElementById('resumo-credenciamento-badges');
        if (!container) return;

        const totalPendentes = cacheUsuariosCred.filter(u => u.status === 'pendente' || u.cargo === 'pendente').length;
        const totalAtivos = cacheUsuariosCred.filter(u => u.status === 'ativo' && u.cargo !== 'pendente').length;

        container.innerHTML = `
            <span class="px-3 py-1 rounded-full text-xs font-extrabold border ${totalPendentes > 0 ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse' : 'bg-slate-100 text-slate-500 border-slate-200'}">
                ⏳ ${totalPendentes} Pendente(s)
            </span>
            <span class="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✅ ${totalAtivos} Ativo(s)
            </span>
        `;
    },

    atualizarIconesFiltro() {
        const iconStatus = document.getElementById('icon-filter-cred-status');
        if (iconStatus) iconStatus.textContent = (!filtrosCredenciamento.status.includes("Todos")) ? "✖️" : "🔎";

        const iconNome = document.getElementById('icon-filter-cred-nome');
        if (iconNome) iconNome.textContent = (filtrosCredenciamento.nome !== "") ? "✖️" : "🔎";

        const iconCargo = document.getElementById('icon-filter-cred-cargo');
        if (iconCargo) iconCargo.textContent = (!filtrosCredenciamento.cargos.includes("Todos")) ? "✖️" : "🔎";

        const iconArea = document.getElementById('icon-filter-cred-area');
        if (iconArea) iconArea.textContent = (!filtrosCredenciamento.areas.includes("Todos")) ? "✖️" : "🔎";
    },

    _formatarRotuloCargo(cargo) {
        const mapa = {
            root: "ROOT",
            admin: "ADMIN",
            tecnico: "TÉCNICO DE ÁREA",
            docente: "DOCENTE",
            apoio: "APOIO",
            pendente: "AGUARDANDO"
        };
        return mapa[cargo] || (cargo || "AGUARDANDO").toUpperCase();
    },

    renderizarTabelaCredenciamento() {
        const tbody = document.getElementById('tabela-credenciamento');
        if (!tbody) return;

        this.atualizarIconesFiltro();

        const svgLixeira = `<svg class="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
        const svgCredenciar = `<svg class="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>`;

        const cargoLogado = window.usuarioAtual?.cargo || 'sem_acesso';

        const dadosFiltrados = cacheUsuariosCred.filter(u => {
            const statusEfetivo = (u.cargo === 'pendente' || u.status === 'pendente') ? 'pendente' : (u.status || 'ativo');
            const cargoEfetivo = u.cargo || 'pendente';
            const termoNome = filtrosCredenciamento.nome.toLowerCase().trim();

            const matchStatus = filtrosCredenciamento.status.includes("Todos") || filtrosCredenciamento.status.includes(statusEfetivo);
            const matchNome = termoNome === "" || 
                (u.nome_completo && u.nome_completo.toLowerCase().includes(termoNome)) || 
                (u.email && u.email.toLowerCase().includes(termoNome));
            const matchCargo = filtrosCredenciamento.cargos.includes("Todos") || filtrosCredenciamento.cargos.includes(cargoEfetivo);

            let matchArea = true;
            if (!filtrosCredenciamento.areas.includes("Todos")) {
                const areasUser = Array.isArray(u.areas) ? u.areas : [];
                matchArea = areasUser.includes("Todas") || areasUser.some(a => filtrosCredenciamento.areas.includes(a));
            }

            return matchStatus && matchNome && matchCargo && matchArea;
        });

        if (dadosFiltrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Nenhum usuário encontrado para estes filtros.</td></tr>`;
            return;
        }

        const html = dadosFiltrados.map(u => {
            const isPendente = (u.status === 'pendente' || u.cargo === 'pendente');
            const statusEfetivo = isPendente ? 'pendente' : (u.status || 'ativo');
            const podeGerenciar = window.ControllerAdminCredenciamento.podeGerenciarUsuario(cargoLogado, u);

            // Cores semânticas de Status
            let statusBadge = "text-emerald-700 md:bg-emerald-50 md:border-emerald-200";
            let statusTexto = "Ativo";
            if (statusEfetivo === 'pendente') {
                statusBadge = "text-amber-700 md:bg-amber-50 md:border-amber-300";
                statusTexto = "Pendente";
            } else if (statusEfetivo === 'bloqueado') {
                statusBadge = "text-red-700 md:bg-red-50 md:border-red-200";
                statusTexto = "Bloqueado";
            }

            // Cores semânticas de Cargo / Perfil
            let cargoBadge = "text-slate-700 md:bg-slate-100 md:border-slate-200";
            if (u.cargo === 'root') cargoBadge = "text-purple-800 md:bg-purple-100 md:border-purple-300";
            else if (u.cargo === 'admin') cargoBadge = "text-indigo-700 md:bg-indigo-50 md:border-indigo-200";
            else if (u.cargo === 'tecnico') cargoBadge = "text-blue-700 md:bg-blue-50 md:border-blue-200";
            else if (u.cargo === 'docente') cargoBadge = "text-emerald-700 md:bg-emerald-50 md:border-emerald-200";
            else if (u.cargo === 'apoio') cargoBadge = "text-teal-700 md:bg-teal-50 md:border-teal-200";
            else if (isPendente) cargoBadge = "text-amber-700 md:bg-amber-50/70 md:border-amber-200";

            const rotuloCargo = isPendente
                ? `Solicita: ${this._formatarRotuloCargo(u.cargo_solicitado)}`
                : this._formatarRotuloCargo(u.cargo);

            // Resumo de Áreas ou Solicitação
            const areasList = Array.isArray(u.areas) && u.areas.length > 0 ? u.areas.join(", ") : null;
            const textoColunaAreas = isPendente
                ? `<span class="italic text-amber-800">"${window.Util.esc(u.solicitacao_credenciamento || 'Sem descrição')}"</span>`
                : (areasList
                    ? `<span class="font-semibold text-slate-700">${window.Util.esc(areasList)}</span>`
                    : `<span class="text-slate-400">Nenhuma área específica</span>`);

            return `
            <tr class="${isPendente ? 'bg-amber-50/20' : ''} hover:bg-blue-50/50 hover:shadow-[inset_4px_0_0_0_#3b82f6] transition-all duration-200 ${podeGerenciar ? 'cursor-pointer row-cred-usuario' : 'cursor-default'} group border-b border-slate-100" data-email="${window.Util.esc(u.email)}">
                <td class="px-1 py-2 md:py-4 md:px-2 text-center align-middle w-[10%] md:w-[7%] relative z-10">
                    ${podeGerenciar ? `
                    <div class="flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2">
                        <span class="btn-abrir-credenciamento transform hover:scale-110 transition-transform" data-email="${window.Util.esc(u.email)}" title="Credenciar / Editar Perfil">${svgCredenciar}</span>${u.cargo !== 'root' ? `<span class="btn-excluir-cred-usuario transform hover:scale-110 transition-transform" data-email="${window.Util.esc(u.email)}" title="Excluir Usuário">${svgLixeira}</span>` : ''}
                    </div>` : `<span class="text-slate-300 text-xs" title="Nível hierárquico superior">🔒</span>`}
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 align-middle w-[16%] md:w-[13%]">
                    <span class="p-0 border-0 bg-transparent shadow-none md:px-2.5 md:py-1 md:rounded-full text-[11px] md:text-xs font-extrabold md:border ${statusBadge} whitespace-nowrap">${statusTexto}</span>
                </td>
                <td class="px-1 py-2 md:py-4 md:px-4 align-middle w-[30%] md:w-[28%] whitespace-normal break-words">
                    <p class="text-[11px] md:text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors leading-snug">${window.Util.esc(u.nome_completo || 'Sem Nome')}</p>
                    <p class="text-[10px] md:text-xs text-slate-500 truncate">${window.Util.esc(u.email)}</p>
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 align-middle w-[20%] md:w-[18%]">
                    <span class="p-0 border-0 bg-transparent shadow-none md:px-2.5 md:py-1.5 md:rounded-md text-[10px] md:text-xs font-bold md:border md:shadow-sm ${cargoBadge} whitespace-normal break-words md:whitespace-nowrap">${rotuloCargo}</span>
                </td>
                <td class="px-1 py-2 md:py-4 md:px-4 text-[11px] leading-snug md:text-xs text-slate-600 align-middle whitespace-normal break-words w-[24%] md:w-[34%]">
                    ${textoColunaAreas}
                </td>
            </tr>
            `;
        }).join('');

        tbody.innerHTML = html;
    },

    abrirModalCredenciamento(emailAlvo) {
        const usuarioAlvo = cacheUsuariosCred.find(u => u.email === emailAlvo);
        if (!usuarioAlvo) return;

        const cargoLogado = window.usuarioAtual?.cargo || 'sem_acesso';
        if (!window.ControllerAdminCredenciamento.podeGerenciarUsuario(cargoLogado, usuarioAlvo)) {
            window.Dialog.aviso("Você não possui autoridade hierárquica para alterar este perfil.");
            return;
        }

        document.getElementById('cred-user-email-hidden').value = usuarioAlvo.email;
        document.getElementById('cred-user-nome').value = usuarioAlvo.nome || "";
        document.getElementById('cred-user-sobrenome').value = usuarioAlvo.sobrenome || "";
        document.getElementById('cred-user-email').value = usuarioAlvo.email || "";

        // Preenche o box da solicitação original
        const rotuloPretendido = this._formatarRotuloCargo(usuarioAlvo.cargo_solicitado || 'docente');
        document.getElementById('cred-user-cargo-pretendido').innerText = `Cargo Pretendido: ${rotuloPretendido}`;
        document.getElementById('cred-user-texto-solicitacao').innerText = usuarioAlvo.solicitacao_credenciamento || "Nenhuma mensagem de solicitação informada.";

        // Badge de status no topo do modal
        const isPendente = (usuarioAlvo.status === 'pendente' || usuarioAlvo.cargo === 'pendente');
        const badgeModal = document.getElementById('badge-modal-cred-status');
        if (isPendente) {
            badgeModal.className = "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-1 bg-amber-100 text-amber-800";
            badgeModal.innerText = "⏳ Solicitação Pendente — Pronta para Habilitação";
        } else {
            badgeModal.className = "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-1 bg-emerald-100 text-emerald-800";
            badgeModal.innerText = `✅ Usuário Cadastrado (${this._formatarRotuloCargo(usuarioAlvo.cargo)})`;
        }

        // Popula select de Cargos permitidos para quem está logado
        const selectCargo = document.getElementById('cred-user-cargo');
        if (usuarioAlvo.cargo === 'root') {
            selectCargo.innerHTML = `<option value="root" selected>ROOT (Superusuário do Sistema)</option>`;
            selectCargo.disabled = true;
        } else {
            selectCargo.disabled = false;
            const opcoesPermitidas = window.ControllerAdminCredenciamento.obterCargosPermitidosParaAtribuicao(cargoLogado);
            const cargoSugerido = isPendente
                ? (opcoesPermitidas.some(o => o.valor === usuarioAlvo.cargo_solicitado) ? usuarioAlvo.cargo_solicitado : opcoesPermitidas[0]?.valor)
                : usuarioAlvo.cargo;

            selectCargo.innerHTML = opcoesPermitidas.map(op => 
                `<option value="${op.valor}" ${op.valor === cargoSugerido ? 'selected' : ''}>${op.rotulo}</option>`
            ).join('');
        }

        // Se o usuário estava pendente, já sugere "ativo" no select de Status para agilizar a aprovação em 1 clique
        const selectStatus = document.getElementById('cred-user-status');
        selectStatus.value = isPendente ? 'ativo' : (usuarioAlvo.status || 'ativo');

        // Renderiza os checkboxes de áreas com as áreas atuais do usuário marcadas
        this.renderizarCheckboxesAreasNoModal(usuarioAlvo.areas || []);
        this.aoMudarCargoOuStatusNoModal();

        document.getElementById('modal-credenciar-usuario')?.classList.remove('hidden');
    },

    renderizarCheckboxesAreasNoModal(areasMarcadas = []) {
        const container = document.getElementById('lista-checkboxes-areas-cred');
        const chkTodas = document.getElementById('chk-cred-todas-areas');
        if (!container) return;

        if (cacheAreasCred.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-400 col-span-2">Nenhuma área cadastrada na view Cursos/UCs ainda.</p>`;
            if (chkTodas) chkTodas.checked = false;
            return;
        }

        const possuiTodas = areasMarcadas.includes("Todas");
        container.innerHTML = cacheAreasCred.map(a => {
            const checked = possuiTodas || areasMarcadas.includes(a.nome);
            return `
            <label class="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-blue-50/40 cursor-pointer transition text-xs md:text-sm font-medium text-slate-700">
                <input type="checkbox" value="${window.Util.esc(a.nome)}" class="chk-area-cred-modal w-4 h-4 text-blue-600 rounded" ${checked ? 'checked' : ''}>
                <span class="truncate" title="${window.Util.esc(a.nome)}">${window.Util.esc(a.nome)}</span>
            </label>
            `;
        }).join('');

        const todosItens = Array.from(document.querySelectorAll('.chk-area-cred-modal'));
        if (chkTodas) {
            chkTodas.checked = todosItens.length > 0 && todosItens.every(c => c.checked);
        }
    },

    // Atualiza os textos explicativos e o rótulo de Áreas de acordo com o Perfil selecionado (ADMIN, TÉCNICO, DOCENTE ou APOIO)
    aoMudarCargoOuStatusNoModal() {
        const cargo = document.getElementById('cred-user-cargo')?.value;
        const status = document.getElementById('cred-user-status')?.value;
        const infoBox = document.getElementById('cred-info-acumulo-perfis');
        const blocoAreas = document.getElementById('bloco-selecao-areas-credenciamento');
        const labelAreas = document.getElementById('label-titulo-areas-cred');
        const subAreas = document.getElementById('subtitulo-areas-cred');

        if (!infoBox || !blocoAreas) return;

        if (status === 'pendente') {
            infoBox.className = "text-xs p-3 rounded-lg border bg-amber-50 border-amber-200 text-amber-800";
            infoBox.innerHTML = "⚠️ Com o status <strong>Pendente</strong>, o usuário permanecerá restrito apenas à aba Home do Dashboard aguardando habilitação.";
            blocoAreas.classList.add('hidden');
            return;
        }

        if (status === 'bloqueado') {
            infoBox.className = "text-xs p-3 rounded-lg border bg-red-50 border-red-200 text-red-800";
            infoBox.innerHTML = "🚫 Com o status <strong>Bloqueado</strong>, o usuário terá seu login impedido no sistema.";
            blocoAreas.classList.add('hidden');
            return;
        }

        infoBox.className = "text-xs p-3 rounded-lg border bg-blue-50/60 border-blue-200 text-blue-800";

        if (cargo === 'root' || cargo === 'admin') {
            infoBox.innerHTML = "🛡️ <strong>Perfil Administrativo Global:</strong> Acumula todos os perfis operacionais, inclui funções administrativas e possui acesso irrestrito a todas as áreas.";
            blocoAreas.classList.add('hidden');
        } else if (cargo === 'tecnico') {
            infoBox.innerHTML = "🎓 <strong>Técnico de Área (Coordenação Pedagógica):</strong> Possui acesso aos dados de todas as áreas e privilégio para habilitar <em>Docentes</em> e <em>Apoio</em>.";
            blocoAreas.classList.remove('hidden');
            labelAreas.innerText = "Áreas sob Responsabilidade (Técnico de Área)";
            subAreas.innerText = "Selecione as áreas pelas quais este Técnico de Área é responsável direto:";
        } else if (cargo === 'docente') {
            infoBox.innerHTML = "👨‍🏫 <strong>Perfil Docente:</strong> Habilitado para atuação pedagógica nas turmas e cursos vinculados às suas áreas de atuação.";
            blocoAreas.classList.remove('hidden');
            labelAreas.innerText = "Áreas de Atuação (Docente)";
            subAreas.innerText = "Selecione as áreas tecnológicas em que este docente atua:";
        } else if (cargo === 'apoio') {
            infoBox.innerHTML = "📋 <strong>Perfil de Apoio:</strong> Poderá visualizar dados de todas as áreas (leitura), destacando suas áreas preferenciais.";
            blocoAreas.classList.remove('hidden');
            labelAreas.innerText = "Áreas Preferenciais (Apoio)";
            subAreas.innerText = "Selecione as áreas preferenciais de acompanhamento deste usuário de apoio:";
        }
    },

    fecharPopovers(excetoId = null) {
        ['modal-filter-cred-status', 'modal-filter-cred-nome', 'modal-filter-cred-cargo', 'modal-filter-cred-area'].forEach(id => {
            if (id !== excetoId) {
                document.getElementById(id)?.classList.add('hidden');
            }
        });
    },

    async tratarCliques(e) {

        // Interruptor "Marcar Todas" dentro do Modal de Credenciamento
        if (e.target.id === 'chk-cred-todas-areas') {
            const marcado = e.target.checked;
            document.querySelectorAll('.chk-area-cred-modal').forEach(chk => chk.checked = marcado);
            return true;
        }
        if (e.target.classList.contains('chk-area-cred-modal')) {
            const chkTodas = document.getElementById('chk-cred-todas-areas');
            const todos = Array.from(document.querySelectorAll('.chk-area-cred-modal'));
            if (chkTodas) chkTodas.checked = todos.length > 0 && todos.every(c => c.checked);
            return true;
        }

        // Interruptores "Todos" dos Popovers de Filtro da Tabela
        const configurarInterruptorPopover = (classeChk) => {
            if (e.target.classList.contains(classeChk)) {
                const chkTodos = document.querySelector(`.${classeChk}[value="Todos"]`);
                const chkItens = Array.from(document.querySelectorAll(`.${classeChk}`)).filter(c => c.value !== "Todos");
                if (e.target.value === "Todos") {
                    chkItens.forEach(c => c.checked = e.target.checked);
                } else {
                    if (!e.target.checked && chkTodos) chkTodos.checked = false;
                    else if (chkTodos) chkTodos.checked = chkItens.every(c => c.checked);
                }
                return true;
            }
            return false;
        };

        if (configurarInterruptorPopover('popover-status-cred-chk')) return true;
        if (configurarInterruptorPopover('popover-cargo-cred-chk')) return true;
        if (configurarInterruptorPopover('popover-area-cred-chk')) return true;

        // Fechar Modal de Credenciamento (apenas no X ou Cancelar)
        if (e.target.closest('#btn-close-modal-credenciar') || e.target.closest('#btn-cancel-modal-credenciar')) {
            document.getElementById('modal-credenciar-usuario')?.classList.add('hidden');
            return true;
        }

        // Excluir Usuário
        if (e.target.closest('.btn-excluir-cred-usuario')) {
            const email = e.target.closest('.btn-excluir-cred-usuario').getAttribute('data-email');
            if (await window.Dialog.confirmar(`Confirma a exclusão do registro e credenciamento de "${email}"?\nEsta ação não pode ser desfeita.`, { perigo: true, titulo: "Excluir usuário", textoConfirmar: "Excluir usuário" })) {
                try {
                    await window.ControllerAdminCredenciamento.excluirUsuario(email, window.usuarioAtual);
                    await this.carregarDadosBase();
                    this.renderizarResumoBadges();
                    this.renderizarTabelaCredenciamento();
                } catch (err) {
                    await window.Dialog.erro(err, "Não foi possível excluir o usuário");
                }
            }
            return true;
        }

        // Abrir Modal de Credenciamento ao clicar no ícone ou na linha do usuário
        if (e.target.closest('.btn-abrir-credenciamento')) {
            const email = e.target.closest('.btn-abrir-credenciamento').getAttribute('data-email');
            this.abrirModalCredenciamento(email);
            return true;
        }

        const rowUsuario = e.target.closest('.row-cred-usuario');
        if (rowUsuario && !e.target.closest('.btn-excluir-cred-usuario')) {
            const email = rowUsuario.getAttribute('data-email');
            this.abrirModalCredenciamento(email);
            return true;
        }

        // Botões de Abrir/Resetar Filtros no Cabeçalho
        const btnStatus = e.target.closest('#btn-filter-cred-status');
        if (btnStatus) {
            if (!filtrosCredenciamento.status.includes("Todos")) {
                filtrosCredenciamento.status = ["Todos"];
                document.querySelectorAll('.popover-status-cred-chk').forEach(c => c.checked = true);
                this.renderizarTabelaCredenciamento();
            } else {
                this.fecharPopovers('modal-filter-cred-status');
                document.getElementById('modal-filter-cred-status')?.classList.toggle('hidden');
            }
            return true;
        }

        const btnNome = e.target.closest('#btn-filter-cred-nome');
        if (btnNome) {
            if (filtrosCredenciamento.nome !== "") {
                filtrosCredenciamento.nome = "";
                const inp = document.getElementById('popover-input-cred-nome');
                if (inp) inp.value = "";
                this.renderizarTabelaCredenciamento();
            } else {
                this.fecharPopovers('modal-filter-cred-nome');
                const modal = document.getElementById('modal-filter-cred-nome');
                modal?.classList.toggle('hidden');
                if (modal && !modal.classList.contains('hidden')) document.getElementById('popover-input-cred-nome')?.focus();
            }
            return true;
        }

        const btnCargo = e.target.closest('#btn-filter-cred-cargo');
        if (btnCargo) {
            if (!filtrosCredenciamento.cargos.includes("Todos")) {
                filtrosCredenciamento.cargos = ["Todos"];
                document.querySelectorAll('.popover-cargo-cred-chk').forEach(c => c.checked = true);
                this.renderizarTabelaCredenciamento();
            } else {
                this.fecharPopovers('modal-filter-cred-cargo');
                document.getElementById('modal-filter-cred-cargo')?.classList.toggle('hidden');
            }
            return true;
        }

        const btnArea = e.target.closest('#btn-filter-cred-area');
        if (btnArea) {
            if (!filtrosCredenciamento.areas.includes("Todos")) {
                filtrosCredenciamento.areas = ["Todos"];
                document.querySelectorAll('.popover-area-cred-chk').forEach(c => c.checked = true);
                this.renderizarTabelaCredenciamento();
            } else {
                this.fecharPopovers('modal-filter-cred-area');
                document.getElementById('modal-filter-cred-area')?.classList.toggle('hidden');
            }
            return true;
        }

        // Aplicar Filtros dos Popovers
        if (e.target.closest('#apply-filter-cred-status')) {
            const marcados = Array.from(document.querySelectorAll('.popover-status-cred-chk:checked')).map(c => c.value);
            filtrosCredenciamento.status = marcados.includes("Todos") ? ["Todos"] : marcados;
            document.getElementById('modal-filter-cred-status')?.classList.add('hidden');
            this.renderizarTabelaCredenciamento();
            return true;
        }

        if (e.target.closest('#apply-filter-cred-nome')) {
            filtrosCredenciamento.nome = document.getElementById('popover-input-cred-nome')?.value || "";
            document.getElementById('modal-filter-cred-nome')?.classList.add('hidden');
            this.renderizarTabelaCredenciamento();
            return true;
        }

        if (e.target.closest('#apply-filter-cred-cargo')) {
            const marcados = Array.from(document.querySelectorAll('.popover-cargo-cred-chk:checked')).map(c => c.value);
            filtrosCredenciamento.cargos = marcados.includes("Todos") ? ["Todos"] : marcados;
            document.getElementById('modal-filter-cred-cargo')?.classList.add('hidden');
            this.renderizarTabelaCredenciamento();
            return true;
        }

        if (e.target.closest('#apply-filter-cred-area')) {
            const marcados = Array.from(document.querySelectorAll('.popover-area-cred-chk:checked')).map(c => c.value);
            filtrosCredenciamento.areas = marcados.includes("Todos") ? ["Todos"] : marcados;
            document.getElementById('modal-filter-cred-area')?.classList.add('hidden');
            this.renderizarTabelaCredenciamento();
            return true;
        }

        if (!e.target.closest('th') && !e.target.closest('.popover-modal')) {
            this.fecharPopovers();
        }

        return false;
    },

    async tratarSubmits(e) {
        if (e.target.id === 'form-credenciar-usuario') {
            e.preventDefault();

            const btn = document.getElementById('btn-salvar-credenciamento');
            const textoOriginal = btn ? btn.innerText : "Salvar Credenciamento";
            if (btn) {
                btn.innerText = "Salvando...";
                btn.disabled = true;
            }

            try {
                const emailAlvo = document.getElementById('cred-user-email-hidden').value;
                const nome = document.getElementById('cred-user-nome').value;
                const sobrenome = document.getElementById('cred-user-sobrenome').value;
                const status = document.getElementById('cred-user-status').value;
                const cargo = document.getElementById('cred-user-cargo').value;
                const areasMarcadas = Array.from(document.querySelectorAll('.chk-area-cred-modal:checked')).map(c => c.value);

                await window.ControllerAdminCredenciamento.salvarCredenciamentoUsuario(
                    emailAlvo,
                    { nome, sobrenome, status, cargo, areas: areasMarcadas },
                    window.usuarioAtual
                );

                document.getElementById('modal-credenciar-usuario')?.classList.add('hidden');
                await this.carregarDadosBase();
                this.renderizarResumoBadges();
                this.renderizarTabelaCredenciamento();
            } catch (err) {
                await window.Dialog.erro(err, "Erro ao salvar credenciamento");
            } finally {
                if (btn) {
                    btn.innerText = textoOriginal;
                    btn.disabled = false;
                }
            }
            return true;
        }

        return false;
    }
};