// ./calendario/controller_calendario_frms.js - Cadastro, Edição e Carga em Lote de Exceções (Otimizado com Store)
window.ControllerCalendarioFrms = {

    _validarPermissaoCalendario() {
        const cargosPermitidos = ['root', 'admin'];
        if (!window.usuarioAtual || !cargosPermitidos.includes(window.usuarioAtual.cargo)) {
            throw new Error("Acesso restrito: Apenas Administradores podem cadastrar ou editar o calendário de exceções.");
        }
    },

    async salvarExcecao(data, tipo, excecao, descricao) {
        this._validarPermissaoCalendario();
        await window.Store.garantirPronto();

        const jaExiste = (window.Store.dados.excecoes || []).some(e => e.id === data || e.data === data);
        if (jaExiste) {
            throw new Error("Esta data já possui uma exceção cadastrada!");
        }

        const payload = { data, tipo, excecao, descricao };
        await window.db.collection("datas_excecoes").doc(data).set(payload);
        window.Store.upsertLocal("excecoes", { id: data, ...payload });
    },

    async editarExcecao(idOriginal, novaData, tipo, excecao, descricao) {
        this._validarPermissaoCalendario();
        await window.Store.garantirPronto();

        const payload = { data: novaData, tipo, excecao, descricao };

        if (idOriginal === novaData) {
            await window.db.collection("datas_excecoes").doc(idOriginal).update({ tipo, excecao, descricao });
            window.Store.upsertLocal("excecoes", { id: idOriginal, ...payload });
        } else {
            const jaExiste = (window.Store.dados.excecoes || []).some(e => e.id === novaData || e.data === novaData);
            if (jaExiste) {
                throw new Error("A nova data escolhida já está ocupada por outro evento/feriado.");
            }
            const batch = window.db.batch();
            batch.set(window.db.collection("datas_excecoes").doc(novaData), payload);
            batch.delete(window.db.collection("datas_excecoes").doc(idOriginal));
            await batch.commit();

            window.Store.removerLocal("excecoes", idOriginal);
            window.Store.upsertLocal("excecoes", { id: novaData, ...payload });
        }
    },

    async carregarExcecoesLote(dadosArray) {
        this._validarPermissaoCalendario();
        await window.Store.garantirPronto();

        const datasExistentes = new Set((window.Store.dados.excecoes || []).map(e => e.id || e.data));
        const batch = window.db.batch();
        const novosLocal = [];
        let inseridosCount = 0;

        for (const item of dadosArray) {
            if (!item.data || !item.tipo || !item.excecao || !item.descricao) continue;

            if (!datasExistentes.has(item.data)) {
                const docRef = window.db.collection("datas_excecoes").doc(item.data);
                const payload = {
                    data: item.data.trim(),
                    tipo: item.tipo.trim(),
                    excecao: item.excecao.trim(),
                    descricao: item.descricao.trim()
                };
                batch.set(docRef, payload);
                novosLocal.push({ id: payload.data, ...payload });
                datasExistentes.add(payload.data);
                inseridosCount++;
            }
        }

        if (inseridosCount > 0) {
            await batch.commit();
            novosLocal.forEach(item => window.Store.upsertLocal("excecoes", item));
        }
        return inseridosCount;
    }
};