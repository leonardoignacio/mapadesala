// ./controller.js - Controlador Global de Sessão, Perfis e Store Central com Cache Persistente
const STORAGE_CACHE_PREFIX = "inovatech_store_cache_v2:";
const STORAGE_CACHE_TTL_MS = 15 * 60 * 1000;
const STORAGE_CACHE_DEBOUNCE_MS = 250;
// SEGURANÇA: somente estes perfis carregam (e guardam em cache) a coleção completa "usuarios".
// Os demais (técnico, docente, apoio) nunca recebem essa coleção: consultam e alteram apenas o PRÓPRIO documento,
// direto no Firebase, e obtêm a lista de docentes pelo "diretorio_docentes" (somente nome, áreas e status).
const CARGOS_COLECAO_USUARIOS = ["root", "admin"];

window.Store = {
    dados: { areas: [], cursos: [], ucs: [], turmas: [], encontros: [], excecoes: [], salas: [], usuarios: [], diretorio: [], destinatarios: [], docentes: [] },
    listeners: [],
    inicializado: false,
    _promessaInicio: null,
    _usuarioId: null,
    cargo: null,
    _cacheTimer: null,
    _cacheRestaurado: false,
    onUpdateCallback: null,

    // true somente para Root/Admin.
    _carregaUsuarios() { return CARGOS_COLECAO_USUARIOS.includes(this.cargo); },

    // Documento do próprio usuário logado: lido direto do Firebase e mantido apenas em memória (nunca em cache).
    meuUsuario: null,

    definirCargo(cargo) { this.cargo = cargo || null; },

    _identificarUsuario(usuario) {
        // O cache é identificado pela conta de login (uid), que não muda quando o e-mail é trocado.
        const valor = usuario || window.auth?.currentUser?.uid || window.usuarioAtual?.email || window.auth?.currentUser?.email || "";
        return String(valor).trim().toLowerCase();
    },

    _chaveCache() {
        return this._usuarioId ? STORAGE_CACHE_PREFIX + encodeURIComponent(this._usuarioId) : null;
    },

    _carregarCacheNavegador(usuario) {
        const uid = this._identificarUsuario(usuario);
        if (!uid) return false;
        if (this._usuarioId && this._usuarioId !== uid) { const cargoAtual = this.cargo; this.limpar(false); this.cargo = cargoAtual; }
        this._usuarioId = uid;
        try {
            const chave = this._chaveCache();
            const salvo = localStorage.getItem(chave);
            if (!salvo) return false;
            const parsed = JSON.parse(salvo);
            if (parsed?.version !== 2 || parsed.user !== uid || !Number.isFinite(parsed.savedAt) || Date.now() - parsed.savedAt > STORAGE_CACHE_TTL_MS) {
                localStorage.removeItem(chave);
                return false;
            }
            Object.keys(this.dados).forEach(k => {
                if (Array.isArray(parsed.data?.[k])) this.dados[k] = k === 'destinatarios'
                    ? (parsed.destinatariosVersion === 2 ? this._sanitizarDestinatarios(parsed.data[k]) : [])
                    : parsed.data[k];
            });
            if (!this._carregaUsuarios()) {
                // Perfis sem acesso à coleção: remove qualquer resquício de versões anteriores do cache.
                const tinhaUsuarios = Array.isArray(parsed.data?.usuarios) && parsed.data.usuarios.length > 0;
                this.dados.usuarios = [];
                if (tinhaUsuarios) this._salvarCacheNavegador();
            }
            this._cacheRestaurado = true;
            this._processarDocentes();
            return true;
        } catch (err) {
            console.warn("[Store] Não foi possível ler o cache local:", err);
            return false;
        }
    },

    _sanitizarCache(valor) {
        if (Array.isArray(valor)) return valor.map(v => this._sanitizarCache(v));
        if (!valor || typeof valor !== "object") return valor;
        const limpo = {};
        Object.keys(valor).forEach(k => {
            if (/(password|senha|token|credential|credencial|secret|segredo|auth)/i.test(k)) return;
            limpo[k] = this._sanitizarCache(valor[k]);
        });
        return limpo;
    },

    _sanitizarDestinatarios(lista) {
        const permitidas = new Set(['id', 'uid', 'nome', 'cargo', 'status', '_normalizarNecessario']);
        return (lista || []).map(u => {
            const precisaLimpeza = !!u?._normalizarNecessario || Object.keys(u || {}).some(k => !permitidas.has(k));
            const item = { id: String(u?.id || ''), uid: String(u?.uid || ''), nome: String(u?.nome || ''), cargo: String(u?.cargo || ''), status: String(u?.status || 'ativo') };
            if (precisaLimpeza) item._normalizarNecessario = true;
            return item;
        });
    },

    _salvarCacheNavegador() {
        if (!this._usuarioId) return;
        if (this._cacheTimer) clearTimeout(this._cacheTimer);
        this._cacheTimer = setTimeout(() => {
            this._cacheTimer = null;
            try {
                const data = {};
                Object.keys(this.dados).forEach(k => {
                    if (k === 'usuarios' && !this._carregaUsuarios()) data[k] = [];
                    else if (k === 'destinatarios') data[k] = this._sanitizarDestinatarios(this.dados[k]);
                    else data[k] = this._sanitizarCache(this.dados[k]);
                });
                localStorage.setItem(this._chaveCache(), JSON.stringify({ version: 2, destinatariosVersion: 2, user: this._usuarioId, savedAt: Date.now(), data }));
            } catch (err) {
                console.warn("[Store] Limite de armazenamento local atingido:", err);
            }
        }, STORAGE_CACHE_DEBOUNCE_MS);
    },

    async iniciar() { return this.garantirPronto(); },

    async garantirPronto(usuario) {
        const uid = this._identificarUsuario(usuario);
        if (!uid) return this.dados;
        if (this._usuarioId && this._usuarioId !== uid) { const cargoAtual = this.cargo; this.limpar(false); this.cargo = cargoAtual; }
        this._usuarioId = uid;
        if (this.inicializado && this.listeners.length > 0) return this.dados;
        if (this._promessaInicio) return this._promessaInicio;

        const tinhaCacheLocal = this._carregarCacheNavegador(uid);
        this._promessaInicio = new Promise(resolve => {
            const colecoes = [
                { col: "areas", chave: "areas" }, { col: "cursos", chave: "cursos" },
                { col: "ucs", chave: "ucs" }, { col: "turmas", chave: "turmas" },
                { col: "encontros", chave: "encontros" }, { col: "datas_excecoes", chave: "excecoes" },
                { col: "salas_aula", chave: "salas" }, { col: "diretorio_docentes", chave: "diretorio" }, { col: "diretorio_solicitacoes_minimo", chave: "destinatarios" }
            ];
            if (this._carregaUsuarios()) colecoes.push({ col: "usuarios", chave: "usuarios" });
            let pendentes = colecoes.length;
            let resolvido = false;
            const concluir = () => {
                if (resolvido) return;
                resolvido = true;
                this.inicializado = true;
                this._processarDocentes();
                this._salvarCacheNavegador();
                resolve(this.dados);
            };
            if (tinhaCacheLocal && (this.dados.cursos.length || this.dados.turmas.length || this.dados.diretorio.length)) setTimeout(concluir, 60);
            const timerSeguranca = setTimeout(concluir, 4000);
            const checkPronto = () => {
                if (--pendentes <= 0) { clearTimeout(timerSeguranca); concluir(); }
            };
            colecoes.forEach(({ col, chave }) => this._escutarColecao(col, chave, checkPronto));
        });
        return this._promessaInicio;
    },

    _escutarColecao(nomeColecao, nomeEstado, callbackInicial) {
        if (!window.db) { callbackInicial(); return; }
        let primeiroDisparo = true;
        const unsubscribe = window.db.collection(nomeColecao).onSnapshot(snapshot => {
            const teveMudancaReal = snapshot.docChanges().length > 0;
            if (primeiroDisparo || teveMudancaReal) {
                this.dados[nomeEstado] = [];
                snapshot.forEach(doc => {
                    const item = { id: doc.id, ...doc.data() };
                    this.dados[nomeEstado].push(nomeEstado === 'destinatarios' ? this._sanitizarDestinatarios([item])[0] : item);
                });
                if (nomeEstado === "usuarios" || nomeEstado === "diretorio") this._processarDocentes();
                this._salvarCacheNavegador();
                if (!primeiroDisparo && teveMudancaReal && typeof this.onUpdateCallback === "function") this.onUpdateCallback(nomeEstado);
                if (primeiroDisparo && this.inicializado && this._cacheRestaurado && typeof this.onUpdateCallback === "function") this.onUpdateCallback(nomeEstado, { snapshotInicial: true });
            }
            if (primeiroDisparo) { primeiroDisparo = false; callbackInicial(); }
        }, err => {
            console.warn(`[Store] Aviso ao monitorar coleção '${nomeColecao}':`, err.message);
            if (primeiroDisparo) { primeiroDisparo = false; callbackInicial(); }
        });
        this.listeners.push(unsubscribe);
    },

    _processarDocentes() {
        const norm = s => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
        // Root/Admin: a partir de "usuarios". Demais perfis: a partir do diretório público de docentes.
        const origem = this._carregaUsuarios() ? this.dados.usuarios : this.dados.diretorio;
        this.dados.docentes = (origem || []).filter(u => u.status === "ativo" && norm(u.cargo) === "docente" && Array.isArray(u.perfis) && u.perfis.some(p => norm(p) === "docente"));
    },

    upsertLocal(chave, item) {
        if (!item || !item.id || !Array.isArray(this.dados[chave])) return;
        if (chave === "usuarios" && !this._carregaUsuarios()) return;   // perfis sem acesso nunca guardam usuários
        const idx = this.dados[chave].findIndex(x => x.id === item.id);
        if (idx >= 0) this.dados[chave][idx] = chave === 'destinatarios' ? { ...item } : { ...this.dados[chave][idx], ...item };
        else this.dados[chave].push(item);
        if (chave === "usuarios" || chave === "diretorio") this._processarDocentes();
        this._salvarCacheNavegador();
    },

    removerLocal(chave, id) {
        if (!id || !Array.isArray(this.dados[chave])) return;
        this.dados[chave] = this.dados[chave].filter(x => x.id !== id);
        if (chave === "usuarios" || chave === "diretorio") this._processarDocentes();
        this._salvarCacheNavegador();
    },

    limpar(apagarCache = true) {
        this.listeners.forEach(unsub => { try { unsub(); } catch (_) {} });
        this.listeners = [];
        if (this._cacheTimer) { clearTimeout(this._cacheTimer); this._cacheTimer = null; }
        if (apagarCache && this._usuarioId) { try { localStorage.removeItem(this._chaveCache()); } catch (_) {} }
        this.inicializado = false;
        this._promessaInicio = null;
        this._usuarioId = null;
        this.cargo = null;
        this.meuUsuario = null;
        this._cacheRestaurado = false;
        Object.keys(this.dados).forEach(k => { this.dados[k] = []; });
    }
};

window.Controller = {

    // authUser: usuário do Firebase Auth (uid + e-mail). O documento em "usuarios" é localizado pelo vínculo com a conta
    // (acessos/{uid}); cadastros antigos, cujo id era o e-mail, são vinculados automaticamente no primeiro acesso.
    async obterPerfil(authUserInput, isSuperUser = false) {
        // Aceita o objeto Firebase User e também chamadas legadas que enviam apenas o e-mail.
        // O valor pode estar ausente/não textual; nunca execute trim() em um objeto.
        const authAtual = window.auth?.currentUser || {};
        const fonte = authUserInput && typeof authUserInput === "object" ? authUserInput : authAtual;
        const emailCandidato = typeof authUserInput === "string" ? authUserInput
            : (typeof authUserInput?.email === "string" ? authUserInput.email
                : (Array.isArray(authUserInput?.providerData) ? authUserInput.providerData.find(p => typeof p?.email === "string")?.email : ""))
                || (typeof authAtual.email === "string" ? authAtual.email : "");
        const email = typeof emailCandidato === "string" ? emailCandidato.trim().toLowerCase() : "";
        const uid = (typeof fonte?.uid === "string" && fonte.uid) || (typeof authAtual.uid === "string" && authAtual.uid) || email;
        const authUser = { uid, email };
        if (!email && !uid) return "sem_acesso";
        const todosPerfis = ["root", "admin", "tecnico", "docente", "apoio"];

        if (isSuperUser) {
            window.Store.definirCargo("root");
            let existente = await window.ControllerUsuarios.localizarUsuario(authUser);

            if (!existente) {
                const ref = window.db.collection("usuarios").doc();
                const novoRoot = {
                    uid: authUser.uid, nome: "Leonardo", sobrenome: "Ignacio", nome_completo: "Leonardo Ignacio", email,
                    cargo_solicitado: "root", solicitacao_credenciamento: "Superusuário (ROOT) do Sistema",
                    cargo: "root", perfis: todosPerfis, areas: ["Todas"], status: "ativo", criado_em: new Date().toISOString()
                };
                await ref.set(novoRoot);
                await window.db.collection("acessos").doc(authUser.uid).set({ usuario_id: ref.id, criado_em: novoRoot.criado_em });
                existente = { id: ref.id, ...novoRoot };
            } else if (existente.cargo !== "root" || existente.status !== "ativo") {
                const patch = { cargo: "root", perfis: todosPerfis, status: "ativo" };
                await window.db.collection("usuarios").doc(existente.id).update(patch);
                existente = { ...existente, ...patch };
            }
            window.Store.meuUsuario = existente;
            await window.Store.garantirPronto(uid);
            return "root";
        }

        // Autoriza pelo documento individual antes de ativar listeners de coleções globais.
        const dados = await window.ControllerUsuarios.localizarUsuario(authUser);

        if (dados) {
            window.Store.meuUsuario = dados;   // em memória (nunca em cache)
            if (dados.status === "pendente" || dados.cargo === "pendente") return "pendente";
            if (dados.status === "inativo" || dados.status === "bloqueado") return "sem_acesso";
            window.Store.definirCargo(dados.cargo || "apoio");
            await window.Store.garantirPronto(uid);
            return dados.cargo || "apoio";
        }

        // Retrocompatibilidade com coleção antiga "permissoes" (chave = e-mail)
        try {
            const docPerm = await window.db.collection("permissoes").doc(email).get();
            if (docPerm.exists) {
                const cargoLegado = docPerm.data().cargo || "apoio";
                window.Store.definirCargo(cargoLegado);
                await window.Store.garantirPronto(uid);
                return cargoLegado;
            }
        } catch (_) {}

        return "nao_cadastrado";
    },

    usuarioPodeEditar() {
        const cargosEdicao = ["root", "admin", "tecnico", "docente"];
        return cargosEdicao.includes(window.usuarioAtual?.cargo);
    }
};
