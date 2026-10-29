// ./calendario/controller_calendario_frms.js - Cadastro, Edição, Geração e Carga em Lote de Exceções (Otimizado com Store)
window.ControllerCalendarioFrms = {

    // Rótulos que alimentam os filtros da tabela de exceções (a coluna "excecao" do CSV usa exatamente estes textos).
    TIPOS: ['Feriado', 'Feriado Nacional', 'Feriado Estadual', 'Feriado Municipal', 'Ponte', 'Reunião Pedagógica', 'Domingo', 'Cancelamento', 'Outros'],

    // Feriados fixos [mês, dia, descrição]. Para incluir outro feriado municipal, basta acrescentar uma linha em FERIADOS_MUNICIPAIS.
    FERIADOS_NACIONAIS: [
        [1, 1, 'Confraternização Universal'], [4, 21, 'Tiradentes'], [5, 1, 'Dia Mundial do Trabalho'],
        [9, 7, 'Independência do Brasil'], [10, 12, 'Nossa Senhora Aparecida'], [11, 2, 'Finados'],
        [11, 15, 'Proclamação da República'], [11, 20, 'Dia Nacional de Zumbi e da Consciência Negra'], [12, 25, 'Natal']
    ],
    FERIADOS_ESTADUAIS_SP: [[7, 9, 'Revolução Constitucionalista de 1932']],
    FERIADOS_MUNICIPAIS: [[4, 14, 'Aniversário de Catanduva'], [8, 8, 'São Domingos de Gusmão (Padroeiro de Catanduva)']],

    _validarPermissaoCalendario() {
        const cargosPermitidos = ['root', 'admin'];
        if (!window.usuarioAtual || !cargosPermitidos.includes(window.usuarioAtual.cargo)) {
            throw new Error("Acesso restrito: Apenas Administradores podem cadastrar ou editar o calendário de exceções.");
        }
    },

    // ---- Normalização --------------------------------------------------------
    // Aceita AAAA-MM-DD, DD/MM/AAAA, DD-MM-AAAA e AAAA/MM/DD. Retorna ISO válido ou null.
    normalizarData(valor) {
        const t = (valor ?? '').toString().trim();
        let a, m, d, r;
        if ((r = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(t))) { a = +r[1]; m = +r[2]; d = +r[3]; }
        else if ((r = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t))) { d = +r[1]; m = +r[2]; a = +r[3]; }
        else return null;
        const dt = new Date(Date.UTC(a, m - 1, d));
        if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
        return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    },

    // "feriado", "FERIADO " ou "reuniao pedagogica" viram o rótulo oficial; textos livres são preservados.
    canonizarTipo(texto) {
        const t = (texto ?? '').toString().trim();
        if (!t) return '';
        const n = window.Util.semAcento(t);
        const achado = this.TIPOS.find(x => window.Util.semAcento(x) === n || (x === 'Reunião Pedagógica' && n.startsWith('reuniao')) || (x === 'Cancelamento' && n.startsWith('cancelamento')));
        return achado || t;
    },

    // Formato único gravado no banco: { data, dia_semana, tipo, excecao, descricao }.
    // "excecao" é o rótulo exibido (Feriado, Ponte...); "tipo" repete o rótulo por compatibilidade com o Espelho.
    normalizarItem(item) {
        const data = this.normalizarData(item?.data);
        if (!data) throw new Error(`Data inválida: "${item?.data ?? ''}". Use AAAA-MM-DD ou DD/MM/AAAA.`);
        const excecao = this.canonizarTipo(item.excecao || item.tipo);
        if (!excecao) throw new Error('Informe o tipo da exceção (ex.: Feriado, Ponte).');
        const descricao = (item.descricao ?? '').toString().trim() || excecao;
        const periodos = Array.isArray(item.periodos) ? item.periodos.filter(Boolean) : [];
        return { data, dia_semana: window.Util.diaSemana(data), tipo: excecao, excecao, descricao, ...(periodos.length ? { periodos } : {}) };
    },

    // ---- Gerador do calendário base ------------------------------------------
    // Domingo de Páscoa (algoritmo gregoriano anônimo). Retorna Date UTC.
    calcularPascoa(ano) {
        const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
        const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
        const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(Date.UTC(ano, mes - 1, dia));
    },

    // Datas dos feriados móveis do ano (todos calculados a partir da Páscoa).
    feriadosVariaveis(ano) {
        const somar = (dt, dias) => new Date(dt.getTime() + dias * 86400000);
        const pascoa = this.calcularPascoa(ano);
        return [
            { chave: 'carnaval', data: somar(pascoa, -47), descricao: 'Carnaval' },
            { chave: 'paixao', data: somar(pascoa, -2), descricao: 'Paixão de Cristo (Sexta-feira Santa)' },
            { chave: 'pascoa', data: pascoa, descricao: 'Páscoa' },
            { chave: 'corpus', data: somar(pascoa, 60), descricao: 'Corpus Christi' }
        ];
    },

    // Linhas do calendário-base do ano, na ordem do arquivo:
    // 1) feriados de data variável, 2) feriados fixos + paradas pedagógicas por data, 3) domingos.
    // Cada data aparece uma única vez (feriado tem prioridade sobre reunião e domingo).
    gerarCalendarioBase(ano) {
        const iso = (dt) => dt.toISOString().slice(0, 10);
        const usadas = new Set(), topo = [], meio = [], domingos = [];
        const adicionar = (lista, dt, excecao, descricao) => {
            const k = iso(dt);
            if (usadas.has(k)) return;
            usadas.add(k); lista.push({ data: k, excecao, descricao });
        };

        this.feriadosVariaveis(ano).forEach(f => adicionar(topo, f.data, 'Feriado', f.descricao));
        const fixos = [
            ...this.FERIADOS_NACIONAIS.map(([m, d, t]) => [m, d, t, 'Feriado Nacional']),
            ...this.FERIADOS_ESTADUAIS_SP.map(([m, d, t]) => [m, d, t, 'Feriado Estadual']),
            ...this.FERIADOS_MUNICIPAIS.map(([m, d, t]) => [m, d, t, 'Feriado Municipal'])
        ];
        fixos.forEach(([m, d, t, tipo]) => adicionar(meio, new Date(Date.UTC(ano, m - 1, d)), tipo, t));

        // Reunião pedagógica: última segunda-feira de cada mês.
        for (let m = 0; m < 12; m++) {
            const dt = new Date(Date.UTC(ano, m + 1, 0));              // último dia do mês
            while (dt.getUTCDay() !== 1) dt.setUTCDate(dt.getUTCDate() - 1);
            adicionar(meio, dt, 'Reunião Pedagógica', 'Parada Pedagógica');
        }
        meio.sort((a, b) => a.data.localeCompare(b.data));

        for (let dt = new Date(Date.UTC(ano, 0, 1)); dt.getUTCFullYear() === ano; dt.setUTCDate(dt.getUTCDate() + 1)) {
            if (dt.getUTCDay() === 0) adicionar(domingos, new Date(dt), 'Domingo', 'Descanso Automático');
        }
        return [...topo, ...meio, ...domingos];
    },

    // CSV no formato do sistema: data;excecao;descricao (datas DD/MM/AAAA, BOM e quebra de linha do Excel ficam por conta do chamador).
    gerarCalendarioBaseCSV(ano) {
        const anoNum = Number(ano);
        if (!Number.isInteger(anoNum) || anoNum < 2000 || anoNum > 2100) {
            throw new Error('Informe um ano válido entre 2000 e 2100.');
        }
        const campo = (v) => /[;"\n\r]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
        const br = (isoData) => isoData.split('-').reverse().join('/');
        const linhas = this.gerarCalendarioBase(anoNum).map(i => [br(i.data), i.excecao, i.descricao].map(campo).join(';'));
        return ['data;excecao;descricao', ...linhas].join('\r\n') + '\r\n';
    },

    // ---- Importação: datas variáveis em branco e pontes automáticas ------------------
    // Linhas sem data cujo texto é um feriado móvel (Carnaval, Paixão de Cristo, Páscoa, Corpus Christi)
    // recebem a data calculada para o ano predominante das demais linhas do arquivo.
    completarFeriadosVariaveis(itens) {
        const anos = {};
        itens.forEach(i => { const d = this.normalizarData(i.data); if (d) anos[d.slice(0, 4)] = (anos[d.slice(0, 4)] || 0) + 1; });
        const ano = Number(Object.entries(anos).sort((a, b) => b[1] - a[1])[0]?.[0]);
        if (!ano) return itens;
        const dic = [['carnaval', /carnaval/], ['paixao', /paixao de cristo|sexta[- ]feira santa/], ['pascoa', /pascoa/], ['corpus', /corpus christi/]];
        const datas = Object.fromEntries(this.feriadosVariaveis(ano).map(f => [f.chave, f.data.toISOString().slice(0, 10)]));
        return itens.map(i => {
            if ((i.data ?? '').toString().trim()) return i;
            const txt = window.Util.semAcento(i.descricao);
            const achado = dic.find(([, re]) => re.test(txt));
            return achado ? { ...i, data: datas[achado[0]] } : i;
        });
    },

    // Regras de ponte aplicadas a todo feriado do arquivo:
    //  terça -> segunda | quinta -> sexta e sábado | sexta -> sábado | Carnaval -> quarta-feira de cinzas (só de manhã).
    gerarPontes(itensValidos) {
        const somar = (isoData, dias) => { const d = new Date(`${isoData}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10); };
        const pontes = [];
        for (const f of itensValidos) {
            if (!window.Util.semAcento(f.excecao).startsWith('feriado')) continue;
            const dow = new Date(`${f.data}T12:00:00Z`).getUTCDay();
            const motivo = `Ponte — ${f.descricao}`;
            if (dow === 2) pontes.push({ data: somar(f.data, -1), excecao: 'Ponte', descricao: motivo });
            if (dow === 4) { pontes.push({ data: somar(f.data, 1), excecao: 'Ponte', descricao: motivo }); pontes.push({ data: somar(f.data, 2), excecao: 'Ponte', descricao: motivo }); }
            if (dow === 5) pontes.push({ data: somar(f.data, 1), excecao: 'Ponte', descricao: motivo });
            if (/carnaval/.test(window.Util.semAcento(f.descricao))) {
                const ate = (3 - dow + 7) % 7 || 7;            // próxima quarta-feira
                pontes.push({ data: somar(f.data, ate), excecao: 'Ponte', descricao: 'Quarta-feira de Cinzas (somente manhã)', periodos: ['MANHÃ'] });
            }
        }
        return pontes;
    },

    // ---- Gravação -------------------------------------------------------------
    async salvarExcecaoManual(data, excecao, descricao) {
        this._validarPermissaoCalendario();
        await window.Store.garantirPronto();
        const payload = this.normalizarItem({ data, excecao, descricao });

        const jaExiste = (window.Store.dados.excecoes || []).some(e => (e.id || e.data) === payload.data || e.data === payload.data);
        if (jaExiste) throw new Error("Esta data já possui uma exceção cadastrada!");

        // Confirmação final no servidor: se outra pessoa gravou a mesma data um instante antes, a transação recusa.
        const ref = window.db.collection("datas_excecoes").doc(payload.data);
        await window.db.runTransaction(async (tx) => {
            const atual = await tx.get(ref);
            if (atual.exists) throw new Error("Esta data já possui uma exceção cadastrada!");
            tx.set(ref, payload);
        });
        window.Store.upsertLocal("excecoes", { id: payload.data, ...payload });
        return payload;
    },

    async editarExcecao(idOriginal, novaData, excecao, descricao) {
        this._validarPermissaoCalendario();
        await window.Store.garantirPronto();
        const payload = this.normalizarItem({ data: novaData, excecao, descricao });

        if (idOriginal === payload.data) {
            await window.db.collection("datas_excecoes").doc(idOriginal).set(payload);
            window.Store.upsertLocal("excecoes", { id: idOriginal, ...payload });
        } else {
            const jaExiste = (window.Store.dados.excecoes || []).some(e => e.id === payload.data || e.data === payload.data);
            if (jaExiste) throw new Error("A nova data escolhida já está ocupada por outro evento/feriado.");
            const batch = window.db.batch();
            batch.set(window.db.collection("datas_excecoes").doc(payload.data), payload);
            batch.delete(window.db.collection("datas_excecoes").doc(idOriginal));
            await batch.commit();
            window.Store.removerLocal("excecoes", idOriginal);
            window.Store.upsertLocal("excecoes", { id: payload.data, ...payload });
        }
        return payload;
    },

    // itens: [{ linha, data, excecao, descricao }].
    // Regras: uma exceção por data (a primeira do arquivo vence; datas já cadastradas são preservadas) e
    // pontes dos feriados sempre geradas. Retorna { inseridos, pontes, existentes, repetidas, invalidos }.
    async carregarExcecoesLote(itens) {
        this._validarPermissaoCalendario();
        await window.Store.garantirPronto();

        const existentes = new Set((window.Store.dados.excecoes || []).flatMap(e => [e.id, e.data].filter(Boolean)));
        const naoGravar = new Set(existentes), validos = [], invalidos = [];
        let jaExistiam = 0, repetidas = 0;

        for (const item of this.completarFeriadosVariaveis(itens)) {
            let payload;
            try { payload = this.normalizarItem(item); }
            catch (err) {
                const semData = !(item.data ?? '').toString().trim();
                invalidos.push({ linha: item.linha, motivo: semData ? 'Data em branco (informe a data do feriado).' : err.message });
                continue;
            }
            validos.push(payload);
        }

        const novos = [];
        for (const p of validos) {
            if (existentes.has(p.data)) { jaExistiam++; continue; }
            if (naoGravar.has(p.data)) { repetidas++; continue; }     // já veio antes no próprio arquivo
            naoGravar.add(p.data); novos.push(p);
        }

        // Pontes: criadas a partir dos feriados do arquivo, sem nunca duplicar uma data já ocupada.
        let pontes = 0;
        for (const ponte of this.gerarPontes(validos)) {
            if (naoGravar.has(ponte.data)) continue;
            naoGravar.add(ponte.data); novos.push(this.normalizarItem(ponte)); pontes++;
        }

        // O Firestore aceita no máximo 500 operações por lote.
        for (let i = 0; i < novos.length; i += 400) {
            const batch = window.db.batch();
            novos.slice(i, i + 400).forEach(p => batch.set(window.db.collection("datas_excecoes").doc(p.data), p));
            await batch.commit();
        }
        novos.forEach(p => window.Store.upsertLocal("excecoes", { id: p.data, ...p }));
        return { inseridos: novos.length - pontes, pontes, existentes: jaExistiam, repetidas, invalidos };
    }
};
