// app_calendario.js - Lógica específica da View Calendário e Exceções
let cacheCalendario = [];

let filtrosCalendario = {
    data: "",
    dias: ["Todos"],
    tipos: ["Todos"],
    desc: ""
};

window.AppCalendario = {
    async iniciarView() {
        await this.carregarDadosBase();
        this.popularFiltros();
        this.renderizarTabelaCalendario();
    },

    async carregarDadosBase() {
        const tbody = document.getElementById('tabela-calendario');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Carregando dados...</td></tr>`;
        
        cacheCalendario = await window.ControllerCalendario.listarExcecoes();
    },

    popularFiltros() {
        const tiposSet = new Set(cacheCalendario.map(e => e.excecao));
        const tiposUnicos = Array.from(tiposSet).sort();
        const containerTipos = document.getElementById('popover-container-cal-tipos');
        
        if (containerTipos) {
            const isTodosChecked = filtrosCalendario.tipos.includes("Todos");
            const chks = tiposUnicos.map(t => {
                const isChecked = isTodosChecked || filtrosCalendario.tipos.includes(t);
                return `<label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="${t}" class="popover-tipo-cal-chk w-4 h-4 text-blue-600 rounded" ${isChecked ? 'checked' : ''}> <span class="truncate" title="${t}">${t}</span></label>`;
            }).join('');
            containerTipos.innerHTML = `
                <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-semibold"><input type="checkbox" value="Todos" class="popover-tipo-cal-chk w-4 h-4 text-blue-600 rounded" ${isTodosChecked ? 'checked' : ''}> Todos</label>
                ${chks}
            `;
        }
    },

    atualizarIconesFiltro() {
        const iconData = document.getElementById('icon-filter-cal-data');
        if (iconData) iconData.textContent = (filtrosCalendario.data !== "") ? "✖️" : "🔎";

        const iconDia = document.getElementById('icon-filter-cal-dia');
        if (iconDia) iconDia.textContent = (!filtrosCalendario.dias.includes("Todos")) ? "✖️" : "🔎";

        const iconTipo = document.getElementById('icon-filter-cal-tipo');
        if (iconTipo) iconTipo.textContent = (!filtrosCalendario.tipos.includes("Todos")) ? "✖️" : "🔎";

        const iconDesc = document.getElementById('icon-filter-cal-desc');
        if (iconDesc) iconDesc.textContent = (filtrosCalendario.desc !== "") ? "✖️" : "🔎";
    },

    renderizarTabelaCalendario() {
        const tbody = document.getElementById('tabela-calendario');
        if(!tbody) return;

        this.atualizarIconesFiltro();

        const svgLixeira = `<svg class="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;

        const dadosFiltrados = cacheCalendario.filter(exc => {
            const [ano, mes, dia] = exc.data.split('-');
            const dataBR = `${dia}/${mes}/${ano}`;
            
            const matchData = filtrosCalendario.data === "" || dataBR.includes(filtrosCalendario.data.trim());
            const matchDesc = filtrosCalendario.desc === "" || exc.descricao.toLowerCase().includes(filtrosCalendario.desc.toLowerCase().trim());
            const matchDia = filtrosCalendario.dias.includes("Todos") ? true : filtrosCalendario.dias.includes(exc.dia_semana);
            const matchTipo = filtrosCalendario.tipos.includes("Todos") ? true : filtrosCalendario.tipos.includes(exc.excecao);

            return matchData && matchDesc && matchDia && matchTipo;
        });

        if(dadosFiltrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Nenhum registro encontrado.</td></tr>`;
            return;
        }

        const html = dadosFiltrados.map(exc => {
            const [ano, mes, dia] = exc.data.split('-');
            const dataBR = `${dia}/${mes}/${ano}`;

            let badgeColor = "text-slate-700 md:bg-slate-50 md:border-slate-200";
            const tipoLower = exc.excecao.toLowerCase();
            if (tipoLower.includes("feriado")) badgeColor = "text-rose-700 md:bg-rose-50 md:border-rose-200";
            else if (tipoLower.includes("ponte")) badgeColor = "text-amber-700 md:bg-amber-50 md:border-amber-200";
            else if (tipoLower.includes("domingo")) badgeColor = "text-slate-600 md:bg-slate-100 md:border-slate-200";
            else if (tipoLower.includes("reunião") || tipoLower.includes("reuniao")) badgeColor = "text-indigo-700 md:bg-indigo-50 md:border-indigo-200";
            else if (tipoLower.includes("cancelamento")) badgeColor = "text-orange-700 md:bg-orange-50 md:border-orange-200";

            return `
            <tr class="hover:bg-blue-50/50 hover:shadow-[inset_4px_0_0_0_#3b82f6] transition-all duration-200 cursor-default row-calendario group border-b border-slate-100" data-id="${exc.data}">
                <td class="px-1 py-2 md:py-4 md:px-2 text-center align-middle w-[10%] md:w-[7%] relative z-10">
                    <span class="btn-excluir-cal transform hover:scale-110 transition-transform cursor-pointer inline-block" data-id="${exc.data}" title="Excluir">${svgLixeira}</span>
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 text-[11px] md:text-sm font-black text-slate-700 align-middle whitespace-nowrap w-[22%] md:w-[15%] group-hover:text-blue-700 transition-colors">${dataBR}</td>
                <td class="px-1 py-2 md:py-4 md:px-3 text-[11px] leading-snug md:text-sm font-medium text-slate-500 align-middle whitespace-normal break-words md:whitespace-nowrap w-[22%] md:w-[15%]">${exc.dia_semana}</td>
                <td class="px-1 py-2 md:py-4 md:px-3 align-middle w-[16%] md:w-[18%]"><span class="p-0 border-0 bg-transparent shadow-none md:px-2.5 md:py-1.5 md:rounded-md text-[11px] md:text-xs font-bold md:border md:shadow-sm ${badgeColor} whitespace-normal break-words md:whitespace-nowrap">${exc.excecao}</span></td>
                <td class="px-1 py-2 md:py-4 md:px-4 text-[11px] leading-snug md:text-sm font-medium text-slate-600 align-middle whitespace-normal break-words w-[30%] md:w-[45%] group-hover:text-slate-800 transition-colors">${exc.descricao}</td>
            </tr>
            `;
        }).join('');

        tbody.innerHTML = html;
    },

    fecharPopovers(excetoId = null) {
        ['modal-filter-cal-data', 'modal-filter-cal-dia', 'modal-filter-cal-tipo', 'modal-filter-cal-desc'].forEach(id => {
            if (id !== excetoId) {
                document.getElementById(id)?.classList.add('hidden');
            }
        });
    },

    async tratarCliques(e) {

        // Checkboxes Interruptor (Dia da Semana)
        if (e.target.classList.contains('popover-dia-cal-chk')) {
            const chkTodos = document.querySelector('.popover-dia-cal-chk[value="Todos"]');
            const chkItens = Array.from(document.querySelectorAll('.popover-dia-cal-chk')).filter(chk => chk.value !== "Todos");

            if (e.target.value === "Todos") {
                const isChecked = e.target.checked;
                chkItens.forEach(chk => chk.checked = isChecked);
            } else {
                if (!e.target.checked) {
                    if (chkTodos) chkTodos.checked = false;
                } else {
                    const todosMarcados = chkItens.every(chk => chk.checked);
                    if (chkTodos) chkTodos.checked = todosMarcados;
                }
            }
            return true;
        }

        // Checkboxes Interruptor (Tipo)
        if (e.target.classList.contains('popover-tipo-cal-chk')) {
            const chkTodos = document.querySelector('.popover-tipo-cal-chk[value="Todos"]');
            const chkItens = Array.from(document.querySelectorAll('.popover-tipo-cal-chk')).filter(chk => chk.value !== "Todos");

            if (e.target.value === "Todos") {
                const isChecked = e.target.checked;
                chkItens.forEach(chk => chk.checked = isChecked);
            } else {
                if (!e.target.checked) {
                    if (chkTodos) chkTodos.checked = false;
                } else {
                    const todosMarcados = chkItens.every(chk => chk.checked);
                    if (chkTodos) chkTodos.checked = todosMarcados;
                }
            }
            return true;
        }

        // Excluir
        if (e.target.closest('.btn-excluir-cal')) {
            const id = e.target.closest('.btn-excluir-cal').getAttribute('data-id');
            if(confirm("Confirma exclusão desta exceção no calendário?")) {
                await window.ControllerCalendario.excluirExcecao(id);
                await this.carregarDadosBase();
                this.popularFiltros();
                this.renderizarTabelaCalendario();
            }
            return true;
        }

        // Gerar CSV Base
        if (e.target.closest('#btn-gerar-csv-base')) {
            const ano = document.getElementById('select-ano-gerador').value;
            const csv = window.ControllerCalendario.gerarCalendarioBaseCSV(ano);
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `feriados_pontes_reunioes_${ano}.csv`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            return true;
        }

        // Upload CSV em Lote
        if (e.target.closest('#btn-carregar-lote-calendario')) {
            const fileInput = document.getElementById('arquivo-lote-calendario');
            if (!fileInput.files.length) { alert("Por favor, selecione um arquivo .csv para processar."); return true; }
            const btnConfirma = e.target.closest('#btn-carregar-lote-calendario');
            btnConfirma.innerText = "Processando...";
            btnConfirma.disabled = true;

            const file = fileInput.files[0];
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const linhas = event.target.result.split(/\r\n|\n/);
                    if (linhas.length === 0) throw new Error("Arquivo vazio.");
                    const delimitador = linhas[0].includes(';') ? ';' : ',';
                    const cabecalho = linhas[0].split(delimitador).map(h => h.trim().toLowerCase());
                    
                    const idxData = cabecalho.indexOf('data');
                    const idxExc = cabecalho.indexOf('excecao');
                    const idxDesc = cabecalho.findIndex(h => h.includes('desc'));
                    
                    if (idxData === -1 || idxExc === -1) throw new Error("O CSV precisa obrigatoriamente conter as colunas 'data' e 'excecao'.");

                    let arrayDados = [];
                    for (let i = 1; i < linhas.length; i++) {
                        const linha = linhas[i].trim();
                        if (!linha) continue;
                        const colunas = linha.split(delimitador).map(c => c.trim().replace(/^"(.*)"$/, '$1'));
                        if (!colunas[idxData] && !colunas[idxExc]) continue;
                        arrayDados.push({
                            data: colunas[idxData],
                            excecao: colunas[idxExc],
                            descricao: idxDesc !== -1 ? colunas[idxDesc] : ""
                        });
                    }

                    if(arrayDados.length === 0) throw new Error("Nenhum dado válido encontrado.");

                    const addCount = await window.ControllerCalendario.carregarExcecoesLote(arrayDados);
                    alert(`Processamento concluído! ${addCount} registros inseridos/atualizados.`);
                    await this.carregarDadosBase();
                    this.popularFiltros();
                    this.renderizarTabelaCalendario();
                } catch(err) { 
                    alert("Erro: " + err.message); 
                } finally {
                    btnConfirma.innerText = "Confirmar Processamento";
                    btnConfirma.disabled = false;
                    fileInput.value = "";
                }
            };
            reader.readAsText(file, "UTF-8");
            return true;
        }

        // Filtros (Abrir/Resetar)
        const btnData = e.target.closest('#btn-filter-cal-data');
        if (btnData) {
            if (filtrosCalendario.data !== "") {
                filtrosCalendario.data = "";
                document.getElementById('popover-input-cal-data').value = "";
                this.renderizarTabelaCalendario();
            } else {
                this.fecharPopovers('modal-filter-cal-data');
                const modal = document.getElementById('modal-filter-cal-data');
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) document.getElementById('popover-input-cal-data')?.focus();
            }
            return true;
        }

        const btnDia = e.target.closest('#btn-filter-cal-dia');
        if (btnDia) {
            if (!filtrosCalendario.dias.includes("Todos")) {
                filtrosCalendario.dias = ["Todos"];
                document.querySelectorAll('.popover-dia-cal-chk').forEach(chk => chk.checked = true);
                this.renderizarTabelaCalendario();
            } else {
                this.fecharPopovers('modal-filter-cal-dia');
                document.getElementById('modal-filter-cal-dia').classList.toggle('hidden');
            }
            return true;
        }

        const btnTipo = e.target.closest('#btn-filter-cal-tipo');
        if (btnTipo) {
            if (!filtrosCalendario.tipos.includes("Todos")) {
                filtrosCalendario.tipos = ["Todos"];
                document.querySelectorAll('.popover-tipo-cal-chk').forEach(chk => chk.checked = true);
                this.renderizarTabelaCalendario();
            } else {
                this.fecharPopovers('modal-filter-cal-tipo');
                document.getElementById('modal-filter-cal-tipo').classList.toggle('hidden');
            }
            return true;
        }

        const btnDesc = e.target.closest('#btn-filter-cal-desc');
        if (btnDesc) {
            if (filtrosCalendario.desc !== "") {
                filtrosCalendario.desc = "";
                document.getElementById('popover-input-cal-desc').value = "";
                this.renderizarTabelaCalendario();
            } else {
                this.fecharPopovers('modal-filter-cal-desc');
                const modal = document.getElementById('modal-filter-cal-desc');
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) document.getElementById('popover-input-cal-desc')?.focus();
            }
            return true;
        }

        // Aplicar Filtros
        if (e.target.closest('#apply-filter-cal-data')) {
            filtrosCalendario.data = document.getElementById('popover-input-cal-data').value;
            document.getElementById('modal-filter-cal-data').classList.add('hidden');
            this.renderizarTabelaCalendario();
            return true;
        }
        if (e.target.closest('#apply-filter-cal-dia')) {
            const checkedChks = Array.from(document.querySelectorAll('.popover-dia-cal-chk:checked')).map(chk => chk.value);
            filtrosCalendario.dias = checkedChks.includes("Todos") ? ["Todos"] : checkedChks;
            document.getElementById('modal-filter-cal-dia').classList.add('hidden');
            this.renderizarTabelaCalendario();
            return true;
        }
        if (e.target.closest('#apply-filter-cal-tipo')) {
            const checkedChks = Array.from(document.querySelectorAll('.popover-tipo-cal-chk:checked')).map(chk => chk.value);
            filtrosCalendario.tipos = checkedChks.includes("Todos") ? ["Todos"] : checkedChks;
            document.getElementById('modal-filter-cal-tipo').classList.add('hidden');
            this.renderizarTabelaCalendario();
            return true;
        }
        if (e.target.closest('#apply-filter-cal-desc')) {
            filtrosCalendario.desc = document.getElementById('popover-input-cal-desc').value;
            document.getElementById('modal-filter-cal-desc').classList.add('hidden');
            this.renderizarTabelaCalendario();
            return true;
        }

        if (!e.target.closest('th') && !e.target.closest('.popover-modal')) {
            this.fecharPopovers();
        }

        return false;
    },

    async tratarSubmits(e) {
        if (e.target.id === 'form-calendario') {
            e.preventDefault();
            try {
                const data = document.getElementById('add-cal-data').value;
                const tipo = document.getElementById('add-cal-tipo').value;
                const desc = document.getElementById('add-cal-desc').value;
                
                await window.ControllerCalendario.salvarExcecaoManual(data, tipo, desc);
                alert("Salvo com sucesso!");
                e.target.reset();
                
                await this.carregarDadosBase();
                this.popularFiltros();
                this.renderizarTabelaCalendario();
            } catch(err) { 
                alert(err.message); 
            }
            return true;
        }
        return false;
    }
};