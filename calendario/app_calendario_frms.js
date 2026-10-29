// ./calendario/app_calendario_frms.js - Eventos de Formulários, Geração e Importação CSV do Calendário
window.AppCalendarioFrms = {

    podeEditar() {
        return ['root', 'admin'].includes(window.usuarioAtual?.cargo);
    },

    // Leitor de CSV: aceita ; , ou TAB, campos entre aspas (inclusive com quebras de linha) e BOM do Excel.
    _lerCSV(texto) {
        texto = (texto || '').replace(/^\uFEFF/, '');
        const primeiraLinha = texto.split(/\r\n|\n|\r/)[0] || '';
        const delimitador = [';', ',', '\t'].map(d => [d, primeiraLinha.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];

        const linhas = [];
        let campo = '', registro = [], aspas = false, numeroLinha = 1, linhaInicio = 1;
        const fecharCampo = () => { registro.push(campo); campo = ''; };
        const fecharRegistro = () => {
            fecharCampo();
            if (registro.some(c => c.trim() !== '')) linhas.push({ linha: linhaInicio, campos: registro.map(c => c.trim()) });
            registro = []; linhaInicio = numeroLinha + 1;
        };
        for (let i = 0; i < texto.length; i++) {
            const ch = texto[i];
            if (aspas) {
                if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
                else if (ch === '"') aspas = false;
                else { campo += ch; if (ch === '\n') numeroLinha++; }
            } else if (ch === '"') aspas = true;
            else if (ch === delimitador) fecharCampo();
            else if (ch === '\r' || ch === '\n') {
                if (ch === '\r' && texto[i + 1] === '\n') i++;
                fecharRegistro(); numeroLinha++; linhaInicio = numeroLinha;
            } else campo += ch;
        }
        if (campo !== '' || registro.length) fecharRegistro();
        return linhas;
    },

    _resumoImportacao(r) {
        const partes = [];
        partes.push(`${r.inseridos} exceção(ões) cadastrada(s)${r.pontes ? ` e ${r.pontes} ponte(s) gerada(s) automaticamente` : ''}.`);
        if (r.existentes) partes.push(`${r.existentes} já existiam e foram mantidas sem alteração.`);
        if (r.repetidas) partes.push(`${r.repetidas} linha(s) repetida(s) no arquivo (mesma data); valeu a primeira.`);
        if (r.invalidos.length) {
            const lista = r.invalidos.slice(0, 5).map(x => `• linha ${x.linha}: ${x.motivo}`).join('\n');
            const resto = r.invalidos.length > 5 ? `\n… e mais ${r.invalidos.length - 5} linha(s).` : '';
            partes.push(`${r.invalidos.length} linha(s) ignorada(s) por erro:\n${lista}${resto}`);
        }
        return partes.join('\n\n');
    },

    async _atualizarListagem() {
        if (!window.AppCalendarioListar) return;
        await window.AppCalendarioListar.carregarDadosBase();
        window.AppCalendarioListar.popularFiltros();
        window.AppCalendarioListar.renderizarTabelaCalendario();
    },

    async tratarCliques(e) {
        if (!this.podeEditar()) return false;

        // Gerar CSV Base (feriados nacionais, móveis e pontes do ano escolhido)
        if (e.target.closest('#btn-gerar-csv-base')) {
            try {
                const ano = (document.getElementById('select-ano-gerador')?.value || '').trim();
                const csv = window.ControllerCalendarioFrms.gerarCalendarioBaseCSV(ano);
                const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `calendario_base_${ano}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch (err) {
                await window.Dialog.aviso(err);
            }
            return true;
        }

        // Upload CSV em Lote
        if (e.target.closest('#btn-carregar-lote-calendario')) {
            const fileInput = document.getElementById('arquivo-lote-calendario');
            if (!fileInput.files.length) {
                await window.Dialog.aviso("Por favor, selecione um arquivo .csv para processar.");
                return true;
            }
            const btnConfirma = e.target.closest('#btn-carregar-lote-calendario');
            if (btnConfirma.disabled) return true;
            const textoOriginal = btnConfirma.innerText;
            btnConfirma.innerText = "Processando...";
            btnConfirma.disabled = true;

            try {
                const texto = await fileInput.files[0].text();
                const registros = this._lerCSV(texto);
                if (registros.length < 2) throw new Error("O arquivo está vazio ou possui apenas o cabeçalho.");

                const cabecalho = registros[0].campos.map(h => window.Util.semAcento(h));
                const achar = (...nomes) => cabecalho.findIndex(h => nomes.includes(h));
                const idxData = achar('data', 'date');
                const idxExc = achar('excecao', 'tipo', 'categoria');
                const idxDesc = achar('descricao', 'desc', 'observacao', 'observacoes');
                if (idxData === -1 || idxExc === -1) {
                    throw new Error("O CSV precisa conter as colunas 'data' e 'excecao' (e, opcionalmente, 'descricao').");
                }

                const itens = registros.slice(1).map(r => ({
                    linha: r.linha,
                    data: r.campos[idxData],
                    excecao: r.campos[idxExc],
                    descricao: idxDesc !== -1 ? r.campos[idxDesc] : ''
                }));

                const resultado = await window.ControllerCalendarioFrms.carregarExcecoesLote(itens);
                const gravados = resultado.inseridos + resultado.pontes;
                const tipo = gravados > 0 && !resultado.invalidos.length ? 'sucesso' : 'aviso';
                await window.Dialog.alerta(this._resumoImportacao(resultado), { tipo, titulo: gravados ? 'Importação concluída' : 'Nada foi importado' });
                await this._atualizarListagem();
            } catch (err) {
                await window.Dialog.erro(err, "Erro ao processar o arquivo");
            } finally {
                btnConfirma.innerText = textoOriginal;
                btnConfirma.disabled = false;
                fileInput.value = "";
            }
            return true;
        }

        return false;
    },

    async tratarSubmits(e) {
        if (e.target.id === 'form-calendario') {
            e.preventDefault();
            if (!this.podeEditar()) {
                await window.Dialog.aviso("Acesso negado: apenas Administradores podem cadastrar exceções.");
                return true;
            }
            const btn = e.target.querySelector('button[type=submit]');
            if (btn?.disabled) return true;
            const textoBtn = btn?.innerText;
            if (btn) { btn.disabled = true; btn.innerText = 'Salvando...'; }
            try {
                const data = document.getElementById('add-cal-data').value;
                const excecao = document.getElementById('add-cal-tipo').value;
                const desc = document.getElementById('add-cal-desc').value;

                await window.ControllerCalendarioFrms.salvarExcecaoManual(data, excecao, desc);
                await window.Dialog.sucesso("Exceção salva com sucesso!");
                e.target.reset();
                await this._atualizarListagem();
            } catch (err) {
                await window.Dialog.erro(err);
            } finally {
                if (btn) { btn.disabled = false; btn.innerText = textoBtn; }
            }
            return true;
        }
        return false;
    }
};
