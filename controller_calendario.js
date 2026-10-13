// controller_calendario.js - Regras de Negócio de Exceções, Feriados e Pontes
window.ControllerCalendario = {
    nomesDiasSemana: ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"],

    _normalizarData(dataStr) {
        if (!dataStr) return "";
        dataStr = dataStr.trim();
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
            const [dia, mes, ano] = dataStr.split('/');
            return `${ano}-${mes}-${dia}`;
        }
        if (/^\d{2}-\d{2}-\d{4}$/.test(dataStr)) {
            const [dia, mes, ano] = dataStr.split('-');
            return `${ano}-${mes}-${dia}`;
        }
        return dataStr;
    },

    _normalizarTipo(tipoStr) {
        if (!tipoStr) return "Feriado";
        const t = tipoStr.trim().toLowerCase();
        if (t.includes('feriado')) return "Feriado";
        if (t.includes('ponte') || t.includes('compensação') || t.includes('compensacao')) return "Ponte";
        if (t.includes('domingo')) return "Domingo";
        if (t.includes('reunião') || t.includes('reuniao')) return "Reunião Pedagógica";
        if (t.includes('cancelamento')) return "Cancelamento";
        return t.charAt(0).toUpperCase() + t.slice(1);
    },

    _obterDiaSemanaInt(dataString) {
        const dataNorm = this._normalizarData(dataString);
        const [ano, mes, dia] = dataNorm.split('-');
        const dataObj = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        return dataObj.getDay();
    },

    _adicionarDias(dataString, diasOffset) {
        const dataNorm = this._normalizarData(dataString);
        const [ano, mes, dia] = dataNorm.split('-');
        const dataObj = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        dataObj.setDate(dataObj.getDate() + diasOffset);
        return dataObj.toISOString().split('T')[0];
    },

    _gerarPontes(dataFeriado) {
        const dataNorm = this._normalizarData(dataFeriado);
        const diaInt = this._obterDiaSemanaInt(dataNorm);
        const pontes = [];

        const criarPonte = (offset) => {
            const dataPonte = this._adicionarDias(dataNorm, offset);
            const diaPonteInt = this._obterDiaSemanaInt(dataPonte);
            pontes.push({
                data: dataPonte,
                excecao: "Ponte",
                descricao: "Compensação - feriado",
                dia_semana: this.nomesDiasSemana[diaPonteInt]
            });
        };

        if (diaInt === 2) { criarPonte(-1); } 
        else if (diaInt === 4) { criarPonte(1); criarPonte(2); } 
        else if (diaInt === 5) { criarPonte(1); }
        return pontes;
    },

    // Nova Função Unificada: Gera o CSV completo e estruturado para o ano
    gerarCalendarioBaseCSV(ano) {
        const anoInt = parseInt(ano);
        let csv = "data;excecao;descricao\n";
        
        // 1. Feriados com datas variáveis no topo (Campo Data Vazio)
        csv += ";Feriado;Carnaval\n";
        csv += ";Feriado;Paixão de Cristo (Sexta-feira Santa)\n";
        csv += ";Feriado;Páscoa\n";
        csv += ";Feriado;Corpus Christi\n";
        
        // 2. Feriados fixos (Nacionais, Estaduais SP e Municipais Catanduva)
        const feriadosFixos = [
            { data: `${anoInt}-01-01`, tipo: "Feriado Nacional", desc: "Confraternização Universal" },
            { data: `${anoInt}-04-14`, tipo: "Feriado Municipal", desc: "Aniversário de Catanduva" },
            { data: `${anoInt}-04-21`, tipo: "Feriado Nacional", desc: "Tiradentes" },
            { data: `${anoInt}-05-01`, tipo: "Feriado Nacional", desc: "Dia Mundial do Trabalho" },
            { data: `${anoInt}-07-09`, tipo: "Feriado Estadual", desc: "Revolução Constitucionalista de 1932" },
            { data: `${anoInt}-08-08`, tipo: "Feriado Municipal", desc: "São Domingos de Gusmão (Padroeiro de Catanduva)" },
            { data: `${anoInt}-09-07`, tipo: "Feriado Nacional", desc: "Independência do Brasil" },
            { data: `${anoInt}-10-12`, tipo: "Feriado Nacional", desc: "Nossa Senhora Aparecida" },
            { data: `${anoInt}-11-02`, tipo: "Feriado Nacional", desc: "Finados" },
            { data: `${anoInt}-11-15`, tipo: "Feriado Nacional", desc: "Proclamação da República" },
            { data: `${anoInt}-11-20`, tipo: "Feriado Nacional", desc: "Dia Nacional de Zumbi e da Consciência Negra" },
            { data: `${anoInt}-12-25`, tipo: "Feriado Nacional", desc: "Natal" }
        ];

        // Ordena os feriados fixos cronologicamente
        feriadosFixos.sort((a, b) => a.data.localeCompare(b.data));
        feriadosFixos.forEach(f => {
            csv += `${f.data};${f.tipo};${f.desc}\n`;
        });

        // 3. Domingos do ano
        let dataAtual = new Date(anoInt, 0, 1);
        while (dataAtual.getFullYear() === anoInt) {
            if (dataAtual.getDay() === 0) { 
                const mesPad = String(dataAtual.getMonth() + 1).padStart(2, '0');
                const diaPad = String(dataAtual.getDate()).padStart(2, '0');
                const dataFormatada = `${anoInt}-${mesPad}-${diaPad}`;
                csv += `${dataFormatada};Domingo;Descanso Automático\n`;
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }

        return csv;
    },

    async listarExcecoes() {
        const snap = await window.db.collection("datas_excecoes").orderBy("data", "asc").get();
        return snap.docs.map(doc => doc.data());
    },

    async excluirExcecao(dataId) {
        await window.db.collection("datas_excecoes").doc(dataId).delete();
    },

    async verificarExcecaoExiste(dataId) {
        const dataNorm = this._normalizarData(dataId);
        const doc = await window.db.collection("datas_excecoes").doc(dataNorm).get();
        return doc.exists;
    },

    async salvarExcecaoManual(data, excecao, descricao) {
        const dataNorm = this._normalizarData(data);
        const tipoNorm = this._normalizarTipo(excecao);
        const existe = await this.verificarExcecaoExiste(dataNorm);
        if(existe) {
            throw new Error(`A data ${dataNorm.split('-').reverse().join('/')} já possui uma exceção cadastrada!`);
        }

        const batch = window.db.batch();
        const diaInt = this._obterDiaSemanaInt(dataNorm);
        const refPrincipal = window.db.collection("datas_excecoes").doc(dataNorm);
        
        batch.set(refPrincipal, { 
            data: dataNorm, 
            excecao: tipoNorm, 
            descricao: descricao,
            dia_semana: this.nomesDiasSemana[diaInt]
        });

        if (tipoNorm === "Feriado") {
            const pontes = this._gerarPontes(dataNorm);
            for (const ponte of pontes) {
                const refPonte = window.db.collection("datas_excecoes").doc(ponte.data);
                batch.set(refPonte, ponte, { merge: true });
            }
        }
        await batch.commit();
    },

    async carregarExcecoesLote(arrayExcecoes) {
        const snapExistentes = await window.db.collection("datas_excecoes").get();
        const chavesExistentes = new Set(snapExistentes.docs.map(doc => doc.id));

        const dadosProcessados = [];
        const datasAdicionadasNoLote = new Set();

        arrayExcecoes.forEach(item => {
            const dataNorm = this._normalizarData(item.data);
            const tipoNorm = this._normalizarTipo(item.excecao);

            if(dataNorm && tipoNorm) {
                const diaInt = this._obterDiaSemanaInt(dataNorm);
                
                if(!chavesExistentes.has(dataNorm) && !datasAdicionadasNoLote.has(dataNorm)) {
                    dadosProcessados.push({
                        data: dataNorm,
                        excecao: tipoNorm,
                        descricao: item.descricao || "",
                        dia_semana: this.nomesDiasSemana[diaInt]
                    });
                    datasAdicionadasNoLote.add(dataNorm);
                }

                if (tipoNorm === "Feriado") {
                    const pontes = this._gerarPontes(dataNorm);
                    pontes.forEach(ponte => {
                        if(!chavesExistentes.has(ponte.data) && !datasAdicionadasNoLote.has(ponte.data)) {
                            dadosProcessados.push(ponte);
                            datasAdicionadasNoLote.add(ponte.data);
                        }
                    });
                }
            }
        });

        if(dadosProcessados.length === 0) {
            return 0;
        }

        const chunks = [];
        for (let i = 0; i < dadosProcessados.length; i += 500) {
            chunks.push(dadosProcessados.slice(i, i + 500));
        }

        for (const chunk of chunks) {
            const batch = window.db.batch();
            chunk.forEach(item => {
                const ref = window.db.collection("datas_excecoes").doc(item.data);
                batch.set(ref, item);
            });
            await batch.commit();
        }

        return dadosProcessados.length;
    }
};