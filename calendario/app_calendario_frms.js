// ./calendario/app_calendario_frms.js - Eventos de Formulários e Importação CSV do Calendário
window.AppCalendarioFrms = {

    podeEditar() {
        return ['root', 'admin'].includes(window.usuarioAtual?.cargo);
    },

    async tratarCliques(e) {
        if (!this.podeEditar()) return false;

        // Gerar CSV Base
        if (e.target.closest('#btn-gerar-csv-base')) {
            const ano = document.getElementById('select-ano-gerador').value;
            const csv = window.ControllerCalendarioFrms.gerarCalendarioBaseCSV(ano);
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `feriados_pontes_reunioes_${ano}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        }

        // Upload CSV em Lote
        if (e.target.closest('#btn-carregar-lote-calendario')) {
            const fileInput = document.getElementById('arquivo-lote-calendario');
            if (!fileInput.files.length) {
                alert("Por favor, selecione um arquivo .csv para processar.");
                return true;
            }
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
                    
                    if (idxData === -1 || idxExc === -1) {
                        throw new Error("O CSV precisa obrigatoriamente conter as colunas 'data' e 'excecao'.");
                    }

                    const arrayDados = [];
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

                    const addCount = await window.ControllerCalendarioFrms.carregarExcecoesLote(arrayDados);
                    alert(`Processamento concluído! ${addCount} registros inseridos/atualizados.`);
                    if (window.AppCalendarioListar) {
                        await window.AppCalendarioListar.carregarDadosBase();
                        window.AppCalendarioListar.popularFiltros();
                        window.AppCalendarioListar.renderizarTabelaCalendario();
                    }
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

        return false;
    },

    async tratarSubmits(e) {
        if (e.target.id === 'form-calendario') {
            e.preventDefault();
            if (!this.podeEditar()) {
                alert("Acesso negado: Apenas Administradores podem cadastrar exceções.");
                return true;
            }
            try {
                const data = document.getElementById('add-cal-data').value;
                const tipo = document.getElementById('add-cal-tipo').value;
                const desc = document.getElementById('add-cal-desc').value;
                
                await window.ControllerCalendarioFrms.salvarExcecaoManual(data, tipo, desc);
                alert("Salvo com sucesso!");
                e.target.reset();
                
                if (window.AppCalendarioListar) {
                    await window.AppCalendarioListar.carregarDadosBase();
                    window.AppCalendarioListar.popularFiltros();
                    window.AppCalendarioListar.renderizarTabelaCalendario();
                }
            } catch(err) { 
                alert(err.message); 
            }
            return true;
        }
        return false;
    }
};