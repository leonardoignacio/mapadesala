// ./apoio/controller_apoio_mapa.js - Estado de ocupação manual das salas por data e período
window.ControllerApoioMapa = {
    colecao: 'mapa_salas_status',
    cache: new Map(),
    ttlMs: 45000,
    podeEditar() { return ['apoio', 'tecnico', 'admin', 'root'].includes(window.usuarioAtual?.cargo); },
    _validarPermissao() { if (!this.podeEditar()) throw new Error('Seu perfil possui acesso somente para visualizar o mapa de salas.'); },
    _periodoId(periodo) { return window.Util.semAcento(periodo || '').toLowerCase(); },
    chave(salaId, data, periodo) { return `${String(salaId || '')}|${data}|${this._periodoId(periodo)}`; },
    _idDocumento(salaId, data, periodo) {
        // Os IDs das salas são gerados pelo Firestore; a sanitização impede barras e caracteres reservados.
        const sala = String(salaId || '').replace(/[^A-Za-z0-9_-]/g, '_');
        return `${sala}_${data}_${this._periodoId(periodo)}`;
    },
    async carregar(inicio, fim, forcar = false) {
        const chaveCache = `${inicio}|${fim}`, atual = this.cache.get(chaveCache);
        if (!forcar && atual && Date.now() - atual.em < this.ttlMs) return new Map(atual.dados);
        await window.Store.garantirPronto();
        let query = window.db.collection(this.colecao).where('data', '>=', inicio).where('data', '<=', fim);
        const snap = await query.get(), mapa = new Map();
        snap.docs.forEach(doc => {
            const item = { id: doc.id, ...doc.data() };
            if (!item.sala_id || !item.data || !item.periodo) return;
            mapa.set(this.chave(item.sala_id, item.data, item.periodo), item);
        });
        this.cache.set(chaveCache, { em: Date.now(), dados: mapa });
        return new Map(mapa);
    },
    invalidar(inicio, fim) { this.cache.delete(`${inicio}|${fim}`); },
    async salvar({ sala_id, sala_referencia, data, periodo, status, descricao }) {
        this._validarPermissao();
        if (!sala_id || !/^\d{4}-\d{2}-\d{2}$/.test(String(data || '')) || !['Manhã', 'Tarde', 'Noite'].includes(periodo)) throw new Error('Sala, data ou período inválido.');
        if (!['Disponível', 'Manutenção', 'Alocada'].includes(status)) throw new Error('Selecione um status válido.');
        const texto = String(descricao || '').trim();
        if (status === 'Alocada' && !texto) throw new Error('Descreva o motivo da alocação da sala.');
        if (texto.length > 500) throw new Error('A descrição deve ter no máximo 500 caracteres.');
        const ref = window.db.collection(this.colecao).doc(this._idDocumento(sala_id, data, periodo));
        if (status === 'Disponível') {
            await ref.delete();
        } else {
            const usuario = window.usuarioAtual || {};
            const payload = {
                sala_id: String(sala_id), sala_referencia: String(sala_referencia || '').trim(), data,
                periodo, status, descricao: texto,
                atualizado_em: new Date().toISOString(), atualizado_por_uid: String(usuario.uid || window.auth?.currentUser?.uid || ''),
                atualizado_por_nome: String(usuario.nome_completo || [usuario.nome, usuario.sobrenome].filter(Boolean).join(' ') || usuario.email || '')
            };
            await ref.set(payload, { merge: true });
        }
        // As chaves representam intervalos semanais, não datas individuais.
        // O cache é pequeno e transitório; limpar tudo evita exibir um estado antigo.
        this.cache.clear();
    },
    mapearOcupacoes(salas, encontros, inicio, fim) {
        const salaPorId = new Map((salas || []).map(s => [String(s.id || ''), s]));
        const salaPorRef = new Map((salas || []).map(s => [window.Util.semAcento(s.referencia || s.nome || ''), s]));
        const mapa = new Map();
        (encontros || []).forEach(enc => {
            if (!enc?.data || enc.data < inicio || enc.data > fim || enc.tipo === 'cancelamento') return;
            const turma = enc.turma || (window.Store.dados.turmas || []).find(t => t.id === enc.id_turma) || {};
            const periodo = window.ControllerDashboard._periodo({ ...enc, turma });
            const sala = salaPorId.get(String(enc.sala_id || '')) || salaPorRef.get(window.Util.semAcento(enc.sala_referencia || enc.sala_nome || ''));
            if (!sala) return;
            const key = this.chave(sala.id, enc.data, periodo);
            if (!mapa.has(key)) mapa.set(key, []);
            mapa.get(key).push({ ...enc, turma });
        });
        return mapa;
    }
};
