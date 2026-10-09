// app_calendario.js - Lógica específica da View Calendário e Exceções
let cacheExcecoes = [];
const dataAtualObj = new Date();
const anoCorrente = dataAtualObj.getFullYear().toString();
const mesCorrente = (dataAtualObj.getMonth() + 1).toString().padStart(2, '0');

let filtrosEstado = {
    data: { mes: mesCorrente, ano: anoCorrente },
    dias: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"],
    tipo: [],
    desc: ""
};

window.AppCalendario = {
    async iniciarView() {
        await this.atualizarTabelaExcecoes();
    },

    async atualizarTabelaExcecoes() {
        const tbody = document.getElementById('tabela-excecoes');
        if(!tbody) return;
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500 font-medium text-sm md:text-base">Carregando dados...</td></tr>`;
        
        this.popularSelectAnosPopover();
        cacheExcecoes = await window.ControllerCalendario.listarExcecoes();
        this.renderizarTabelaExcecoes();
    },

    popularSelectAnosPopover() {
        const selectAno = document.getElementById('popover-ano');
        const selectMes = document.getElementById('popover-mes');
        
        if (selectAno && selectAno.options.length <= 1) {
            const anoAtualInt = new Date().getFullYear();
            for (let i = 0; i < 4; i++) {
                const anoStr = (anoAtualInt + i).toString();
                const opt = document.createElement('option');
                opt.value = anoStr;
                opt.textContent = anoStr;
                selectAno.appendChild(opt);
            }
        }

        if (selectAno) selectAno.value = filtrosEstado.data.ano;
        if (selectMes) selectMes.value = filtrosEstado.data.mes;
    },

    atualizarIconesFiltro() {
        const iconData = document.getElementById('icon-filter-data');
        if (iconData) {
            const ativo = (filtrosEstado.data.mes !== "" || filtrosEstado.data.ano !== "");
            iconData.textContent = ativo ? "✖️" : "🔎";
            iconData.parentElement.title = ativo ? "Remover Filtro de Data" : "Filtrar Data";
        }

        const iconDia = document.getElementById('icon-filter-dia');
        if (iconDia) {
            const ativo = filtrosEstado.dias.length < 7;
            iconDia.textContent = ativo ? "✖️" : "🔎";
            iconDia.parentElement.title = ativo ? "Remover Filtro de Dias" : "Filtrar Dias da Semana";
        }

        const iconTipo = document.getElementById('icon-filter-tipo');
        if (iconTipo) {
            const ativo = filtrosEstado.tipo.length > 0;
            iconTipo.textContent = ativo ? "✖️" : "🔎";
            iconTipo.parentElement.title = ativo ? "Remover Filtro de Tipo" : "Filtrar Tipo";
        }

        const iconDesc = document.getElementById('icon-filter-desc');
        if (iconDesc) {
            const ativo = filtrosEstado.desc !== "";
            iconDesc.textContent = ativo ? "✖️" : "🔎";
            iconDesc.parentElement.title = ativo ? "Remover Filtro de Descrição" : "Filtrar Descrição";
        }
    },

    renderizarTabelaExcecoes() {
        const tbody = document.getElementById('tabela-excecoes');
        if(!tbody) return;

        this.atualizarIconesFiltro();

        const dadosFiltrados = cacheExcecoes.filter(item => {
            const [anoItem, mesItem, diaItem] = item.data.split('-');
            
            const matchAno = filtrosEstado.data.ano ? (anoItem === filtrosEstado.data.ano) : true;
            const matchMes = filtrosEstado.data.mes ? (mesItem === filtrosEstado.data.mes) : true;
            const matchDia = filtrosEstado.dias.length === 0 ? true : filtrosEstado.dias.includes(item.dia_semana);
            const matchTipo = filtrosEstado.tipo.length === 0 ? true : filtrosEstado.tipo.some(t => t.toLowerCase() === (item.excecao || "").toLowerCase());
            const matchDesc = filtrosEstado.desc ? (item.descricao && item.descricao.toLowerCase().includes(filtrosEstado.desc.toLowerCase().trim())) : true;

            return matchAno && matchMes && matchDia && matchTipo && matchDesc;
        });

        if(dadosFiltrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Nenhuma exceção encontrada para estes filtros.</td></tr>`;
            return;
        }

        const html = dadosFiltrados.map(item => {
            let badgeColor = "bg-slate-100 text-slate-700";
            const excLower = (item.excecao || "").toLowerCase();
            if(excLower.includes('feriado')) badgeColor = "bg-red-100 text-red-700";
            else if(excLower.includes('domingo')) badgeColor = "bg-blue-100 text-blue-700";
            else if(excLower.includes('ponte')) badgeColor = "bg-amber-100 text-amber-800";

            const dataBr = item.data.split('-').reverse().join('/');

            return `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-1 md:px-2 md:py-2 text-sm md:text-base border-b border-slate-200 align-middle text-center w-[12%] md:w-[7%]">
                    ${window.usuarioAtual && window.usuarioAtual.cargo !== 'apoio' ? `<button class="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 md:p-1.5 rounded-md transition btn-excluir-exc inline-flex items-center justify-center" data-id="${item.data}" title="Excluir"><svg class="w-4 h-4 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>` : `<span class="text-slate-300">-</span>`}
                </td>
                <td class="p-2 md:py-2.5 md:px-4 text-xs md:text-base font-bold text-slate-800 border-b border-slate-200 align-middle whitespace-normal break-words w-[22%] md:w-[15%]">${dataBr}</td>
                <td class="p-2 md:py-2.5 md:px-4 text-xs md:text-base text-slate-600 border-b border-slate-200 align-middle whitespace-normal break-words w-[25%] md:w-[20%]">${item.dia_semana || "-"}</td>
                <td class="p-2 md:py-2.5 md:px-4 border-b border-slate-200 align-middle w-[18%] md:w-[15%]"><span class="px-1.5 py-0.5 md:px-2.5 md:py-1 rounded text-[10px] md:text-sm font-bold shadow-sm ${badgeColor} whitespace-nowrap">${item.excecao}</span></td>
                <td class="p-2 md:py-2.5 md:px-4 text-xs md:text-sm text-slate-700 border-b border-slate-200 align-middle whitespace-normal break-words w-[23%] md:w-[43%]">${item.descricao}</td>
            </tr>
            `;
        }).join('');

        tbody.innerHTML = html;
    },

    fecharTodosModais(excetoId = null) {
        ['modal-filter-data', 'modal-filter-dia', 'modal-filter-tipo', 'modal-filter-desc', 'modal-help-lote'].forEach(id => {
            if (id !== excetoId) {
                document.getElementById(id)?.classList.add('hidden');
            }
        });
    },

    async tratarCliques(e) {
        if (e.target.closest('#btn-help-lote')) {
            this.fecharTodosModais('modal-help-lote');
            document.getElementById('modal-help-lote')?.classList.remove('hidden');
            return true;
        }
        if (e.target.closest('#btn-close-help') || e.target.id === 'modal-help-lote') {
            document.getElementById('modal-help-lote')?.classList.add('hidden');
            return true;
        }

        const btnData = e.target.closest('#btn-filter-data');
        if (btnData) {
            const ativo = (filtrosEstado.data.mes !== "" || filtrosEstado.data.ano !== "");
            if (ativo) {
                filtrosEstado.data = { mes: "", ano: "" };
                this.renderizarTabelaExcecoes();
            } else {
                this.fecharTodosModais('modal-filter-data');
                const modal = document.getElementById('modal-filter-data');
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) {
                    this.popularSelectAnosPopover();
                    document.getElementById('popover-mes')?.focus();
                }
            }
            return true;
        }

        const btnDia = e.target.closest('#btn-filter-dia');
        if (btnDia) {
            const ativo = filtrosEstado.dias.length < 7;
            if (ativo) {
                filtrosEstado.dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
                document.querySelectorAll('.popover-dia-chk').forEach(chk => chk.checked = true);
                this.renderizarTabelaExcecoes();
            } else {
                this.fecharTodosModais('modal-filter-dia');
                const modal = document.getElementById('modal-filter-dia');
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) {
                    document.querySelector('.popover-dia-chk')?.focus();
                }
            }
            return true;
        }

        const btnTipo = e.target.closest('#btn-filter-tipo');
        if (btnTipo) {
            const ativo = filtrosEstado.tipo.length > 0;
            if (ativo) {
                filtrosEstado.tipo = [];
                document.querySelectorAll('.popover-tipo-chk').forEach(chk => chk.checked = false);
                this.renderizarTabelaExcecoes();
            } else {
                this.fecharTodosModais('modal-filter-tipo');
                const modal = document.getElementById('modal-filter-tipo');
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) {
                    document.querySelector('.popover-tipo-chk')?.focus();
                }
            }
            return true;
        }

        const btnDesc = e.target.closest('#btn-filter-desc');
        if (btnDesc) {
            const ativo = filtrosEstado.desc !== "";
            if (ativo) {
                filtrosEstado.desc = "";
                const inputDesc = document.getElementById('popover-input-desc');
                if (inputDesc) inputDesc.value = "";
                this.renderizarTabelaExcecoes();
            } else {
                this.fecharTodosModais('modal-filter-desc');
                const modal = document.getElementById('modal-filter-desc');
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) {
                    const inputDesc = document.getElementById('popover-input-desc');
                    if (inputDesc) {
                        inputDesc.value = filtrosEstado.desc;
                        inputDesc.focus();
                    }
                }
            }
            return true;
        }

        if (e.target.closest('#apply-filter-data')) {
            filtrosEstado.data.mes = document.getElementById('popover-mes').value;
            filtrosEstado.data.ano = document.getElementById('popover-ano').value;
            document.getElementById('modal-filter-data').classList.add('hidden');
            this.renderizarTabelaExcecoes();
            return true;
        }

        if (e.target.closest('#apply-filter-dia')) {
            const checked = document.querySelectorAll('.popover-dia-chk:checked');
            filtrosEstado.dias = Array.from(checked).map(chk => chk.value);
            document.getElementById('modal-filter-dia').classList.add('hidden');
            this.renderizarTabelaExcecoes();
            return true;
        }

        if (e.target.closest('#apply-filter-tipo')) {
            const checked = document.querySelectorAll('.popover-tipo-chk:checked');
            filtrosEstado.tipo = Array.from(checked).map(chk => chk.value);
            document.getElementById('modal-filter-tipo').classList.add('hidden');
            this.renderizarTabelaExcecoes();
            return true;
        }

        if (e.target.closest('#apply-filter-desc')) {
            filtrosEstado.desc = document.getElementById('popover-input-desc').value;
            document.getElementById('modal-filter-desc').classList.add('hidden');
            this.renderizarTabelaExcecoes();
            return true;
        }

        if (e.target.closest('#btn-baixar-domingos')) {
            const ano = document.getElementById('ano-domingos').value;
            if(!ano) { alert("Por favor, digite o ano desejado."); return true; }
            const domingos = window.ControllerCalendario.gerarArrayDomingos(ano);
            const blob = new Blob([JSON.stringify(domingos, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `domingos_${ano}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            return true;
        }

        if (e.target.closest('#btn-baixar-domingos-csv')) {
            const ano = document.getElementById('ano-domingos').value;
            if(!ano) { alert("Por favor, digite o ano desejado."); return true; }
            const domingos = window.ControllerCalendario.gerarArrayDomingos(ano);
            
            let csvContent = "data;excecao;descricao\n";
            domingos.forEach(d => { csvContent += `${d.data};${d.excecao};${d.descricao}\n`; });

            const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `domingos_${ano}.csv`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            return true;
        }

        if (e.target.closest('#btn-carregar-json')) {
            const fileInput = document.getElementById('arquivo-json');
            if(!fileInput.files.length) { alert("Escolha um arquivo .json ou .csv."); return true; }

            const btnConfirma = e.target.closest('#btn-carregar-json');
            btnConfirma.innerText = "Processando...";
            btnConfirma.disabled = true;

            const file = fileInput.files[0];
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const conteudoTexto = event.target.result;
                    let dadosArray = [];

                    if (file.name.endsWith('.json')) {
                        dadosArray = JSON.parse(conteudoTexto);
                    } else if (file.name.endsWith('.csv')) {
                        const linhas = conteudoTexto.split(/\r\n|\n/);
                        if (linhas.length === 0) throw new Error("Arquivo CSV vazio.");

                        const primeiraLinha = linhas[0];
                        const delimitador = primeiraLinha.includes(';') ? ';' : ',';

                        const cabecalho = primeiraLinha.split(delimitador).map(h => h.trim().toLowerCase());
                        const idxData = cabecalho.findIndex(h => h.includes('data'));
                        const idxExc = cabecalho.findIndex(h => h.includes('excecao') || h.includes('tipo'));
                        const idxDesc = cabecalho.findIndex(h => h.includes('descricao'));

                        if (idxData === -1 || idxExc === -1) {
                            throw new Error("O CSV precisa conter colunas para 'data' e 'excecao/tipo'.");
                        }

                        for (let i = 1; i < linhas.length; i++) {
                            const linha = linhas[i].trim();
                            if (!linha) continue;
                            const colunas = linha.split(delimitador).map(c => c.trim().replace(/^"(.*)"$/, '$1'));
                            
                            if (colunas.length > idxData && colunas.length > idxExc) {
                                dadosArray.push({
                                    data: colunas[idxData],
                                    excecao: colunas[idxExc],
                                    descricao: idxDesc !== -1 && colunas[idxDesc] ? colunas[idxDesc] : ""
                                });
                            }
                        }
                    } else {
                        throw new Error("Formato de arquivo não suportado. Use .json ou .csv");
                    }

                    if(!Array.isArray(dadosArray) || dadosArray.length === 0) {
                        throw new Error("Nenhum dado válido encontrado no arquivo.");
                    }

                    const qtdInseridos = await window.ControllerCalendario.carregarExcecoesLote(dadosArray);
                    
                    if(qtdInseridos === 0) {
                        alert("Concluído: Nenhuma nova data foi inserida (todas já existiam no banco).");
                    } else {
                        alert(`Sucesso! ${qtdInseridos} novas exceções/pontes foram inseridas.`);
                        this.atualizarTabelaExcecoes(); 
                    }
                } catch(error) {
                    alert("Erro ao processar o arquivo: " + error.message);
                } finally {
                    btnConfirma.innerText = "Confirmar Processamento";
                    btnConfirma.disabled = false;
                    fileInput.value = ""; 
                }
            };

            reader.readAsText(file, "UTF-8");
            return true;
        }

        const btnExcluir = e.target.closest('.btn-excluir-exc');
        if (btnExcluir) {
            const dataId = btnExcluir.getAttribute('data-id');
            if(confirm(`Excluir a data ${dataId.split('-').reverse().join('/')}?`)) {
                await window.ControllerCalendario.excluirExcecao(dataId);
                this.atualizarTabelaExcecoes(); 
            }
            return true;
        }

        if (!e.target.closest('th')) {
            this.fecharTodosModais();
        }

        return false;
    },

    async tratarSubmits(e) {
        if (e.target.id === 'form-excecao') {
            e.preventDefault();
            try {
                await window.ControllerCalendario.salvarExcecaoManual(
                    document.getElementById('exc-data').value,
                    document.getElementById('exc-tipo').value,
                    document.getElementById('exc-desc').value
                );
                alert("Exceção cadastrada com sucesso!");
                e.target.reset();
                this.atualizarTabelaExcecoes(); 
            } catch (error) { alert(error.message); }
            return true;
        }
        return false;
    }
};