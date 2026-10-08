// controller.js - Regras de Negócio e Interação com Firestore
window.Controller = {
    
    nomesDiasSemana: ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"],

    _obterDiaSemanaInt(dataString) {
        const [ano, mes, dia] = dataString.split('-');
        const dataObj = new Date(ano, mes - 1, dia);
        return dataObj.getDay();
    },

    _adicionarDias(dataString, diasOffset) {
        const [ano, mes, dia] = dataString.split('-');
        const dataObj = new Date(ano, mes - 1, dia);
        dataObj.setDate(dataObj.getDate() + diasOffset);
        return dataObj.toISOString().split('T')[0];
    },

    _gerarPontes(dataFeriado) {
        const diaInt = this._obterDiaSemanaInt(dataFeriado);
        const pontes = [];

        const criarPonte = (offset) => {
            const dataPonte = this._adicionarDias(dataFeriado, offset);
            const diaPonteInt = this._obterDiaSemanaInt(dataPonte);
            pontes.push({
                data: dataPonte,
                excecao: "Ponte",
                descricao: "Compensação - feriado",
                dia_semana: this.nomesDiasSemana[diaPonteInt]
            });
        };

        if (diaInt === 2) { // Terça
            criarPonte(-1);
        } else if (diaInt === 4) { // Quinta
            criarPonte(1);
            criarPonte(2);
        } else if (diaInt === 5) { // Sexta
            criarPonte(1);
        }
        return pontes;
    },

    // ==========================================
    // PERMISSÕES
    // ==========================================
    async obterPerfil(email, isSuperUser) {
        if (isSuperUser) return 'admin';
        try {
            const doc = await window.db.collection("usuarios_permissoes").doc(email).get();
            return doc.exists ? doc.data().cargo : 'sem_acesso';
        } catch (e) { return 'sem_acesso'; }
    },

    async salvarPermissao(email, cargo) {
        await window.db.collection("usuarios_permissoes").doc(email).set({ cargo, data: new Date() });
    },

    // ==========================================
    // MÓDULO: CALENDÁRIO E EXCEÇÕES
    // ==========================================
    
    // [MODIFICADO] Apenas retorna o array, não grava no banco
    gerarArrayDomingos(ano) {
        const anoInt = parseInt(ano);
        let dataAtual = new Date(anoInt, 0, 1);
        const domingos = [];

        while (dataAtual.getFullYear() === anoInt) {
            if (dataAtual.getDay() === 0) { 
                const dataFormatada = new Date(dataAtual.getTime() - (dataAtual.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                domingos.push({ 
                    data: dataFormatada, 
                    excecao: "Domingo", 
                    descricao: "Descanso Automático"
                });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        return domingos;
    },

    // [NOVO] Listar todas as exceções ordenadas por data
    async listarExcecoes() {
        const snap = await window.db.collection("datas_excecoes").orderBy("data", "asc").get();
        return snap.docs.map(doc => doc.data());
    },

    // [NOVO] Excluir uma exceção específica
    async excluirExcecao(dataId) {
        await window.db.collection("datas_excecoes").doc(dataId).delete();
    },

    // [NOVO] Verifica se a data já existe para bloquear duplicidade
    async verificarExcecaoExiste(dataId) {
        const doc = await window.db.collection("datas_excecoes").doc(dataId).get();
        return doc.exists;
    },

    // [MODIFICADO] Trava de duplicidade no cadastro manual
    async salvarExcecaoManual(data, excecao, descricao) {
        const existe = await this.verificarExcecaoExiste(data);
        if(existe) {
            throw new Error(`A data ${data} já possui uma exceção cadastrada!`);
        }

        const batch = window.db.batch();
        const diaInt = this._obterDiaSemanaInt(data);
        const refPrincipal = window.db.collection("datas_excecoes").doc(data);
        
        batch.set(refPrincipal, { 
            data: data, 
            excecao: excecao, 
            descricao: descricao,
            dia_semana: this.nomesDiasSemana[diaInt]
        });

        if (excecao === "Feriado") {
            const pontes = this._gerarPontes(data);
            for (const ponte of pontes) {
                // Para emendas, usamos set com merge para não sobrescrever caso já exista outra regra no dia
                const refPonte = window.db.collection("datas_excecoes").doc(ponte.data);
                batch.set(refPonte, ponte, { merge: true });
            }
        }
        await batch.commit();
    },

    // [MODIFICADO] Ignora datas que já estão no banco durante o Upload do JSON
    async carregarExcecoesLote(arrayExcecoes) {
        // 1. Busca todas as datas que já existem no banco
        const snapExistentes = await window.db.collection("datas_excecoes").get();
        const chavesExistentes = new Set(snapExistentes.docs.map(doc => doc.id));

        const dadosProcessados = [];

        // 2. Prepara os dados
        arrayExcecoes.forEach(item => {
            if(item.data && item.excecao) {
                const diaInt = this._obterDiaSemanaInt(item.data);
                
                // Só adiciona na fila de gravação se a data NÃO existir no banco
                if(!chavesExistentes.has(item.data)) {
                    dadosProcessados.push({
                        data: item.data,
                        excecao: item.excecao,
                        descricao: item.descricao || "",
                        dia_semana: this.nomesDiasSemana[diaInt]
                    });
                }

                if (item.excecao === "Feriado") {
                    const pontes = this._gerarPontes(item.data);
                    pontes.forEach(ponte => {
                        if(!chavesExistentes.has(ponte.data)) {
                            dadosProcessados.push(ponte);
                        }
                    });
                }
            }
        });

        if(dadosProcessados.length === 0) {
            return 0; // Nenhuma data nova para inserir
        }

        // 3. Divide em chunks de 500 e grava
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

        return dadosProcessados.length; // Retorna quantos inseriu de fato
    },

    // ==========================================
    // MÓDULO: CADASTROS BÁSICOS
    // ==========================================
    async salvarCurso(nome) { await window.db.collection("cursos").add({ nome }); },
    async salvarUC(idCurso, nome, descricao, cargaHoraria) {
        await window.db.collection("ucs").add({ id_curso: idCurso, nome: nome, descricao: descricao, carga_horaria_minima: parseInt(cargaHoraria) });
    },
    async listarDocs(colecao) {
        const snap = await window.db.collection(colecao).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
};