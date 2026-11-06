// ./controller.js - Controlador Global de Sessão, Perfis e Store Central com Cache Persistente
const STORAGE_CACHE_PREFIX = "inovatech_store_cache_v2:";
const STORAGE_CACHE_TTL_MS = 15 * 60 * 1000;
const STORAGE_CACHE_DEBOUNCE_MS = 250;
// SEGURANÇA: somente estes perfis carregam (e guardam em cache) a coleção completa "usuarios".
// Os demais (técnico, docente, apoio) nunca recebem essa coleção: consultam e alteram apenas o PRÓPRIO documento,
// direto no Firebase, e obtêm a lista de docentes pelo "diretorio_docentes" (somente nome, áreas e status).
const CARGOS_COLECAO_USUARIOS = ["root", "admin"];

window.Store = {
    dados: { areas: [], cursos: [], ucs: [], turmas: [], encontros: [], excecoes: [], salas: [], usuarios: [], diretorio: [], docentes: [] },
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
        const valor = usuario || window.usuarioAtual?.email || window.auth?.currentUser?.email || "";
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
                if (Array.isArray(parsed.data?.[k])) this.dados[k] = parsed.data[k];
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

    _salvarCacheNavegador() {
        if (!this._usuarioId) return;
        if (this._cacheTimer) clearTimeout(this._cacheTimer);
        this._cacheTimer = setTimeout(() => {
            this._cacheTimer = null;
            try {
                const data = {};
                Object.keys(this.dados).forEach(k => { data[k] = (k === "usuarios" && !this._carregaUsuarios()) ? [] : this._sanitizarCache(this.dados[k]); });
                localStorage.setItem(this._chaveCache(), JSON.stringify({ version: 2, user: this._usuarioId, savedAt: Date.now(), data }));
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
                { col: "salas_aula", chave: "salas" }, { col: "diretorio_docentes", chave: "diretorio" }
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
                snapshot.forEach(doc => this.dados[nomeEstado].push({ id: doc.id, ...doc.data() }));
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
        if (idx >= 0) this.dados[chave][idx] = { ...this.dados[chave][idx], ...item };
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

    async obterPerfil(email, isSuperUser = false) {
        const emailId = (email || "").trim().toLowerCase();
        if (!emailId) return "sem_acesso";

        if (isSuperUser) {
            window.Store.definirCargo("root");
            const todosPerfis = ["root", "admin", "tecnico", "docente", "apoio"];
            const refRoot = window.db.collection("usuarios").doc(emailId);
            const snapRoot = await refRoot.get();
            const existente = snapRoot.exists ? { id: snapRoot.id, ...snapRoot.data() } : null;

            if (!existente) {
                const novoRoot = {
                    id: emailId,
                    nome: "Leonardo",
                    sobrenome: "Ignacio",
                    nome_completo: "Leonardo Ignacio",
                    email: emailId,
                    cargo_solicitado: "root",
                    solicitacao_credenciamento: "Superusuário (ROOT) do Sistema",
                    cargo: "root",
                    perfis: todosPerfis,
                    areas: ["Todas"],
                    status: "ativo",
                    criado_em: new Date().toISOString()
                };
                await refRoot.set(novoRoot);
                await window.Store.garantirPronto(emailId);
                window.Store.upsertLocal("usuarios", novoRoot);
            } else if (existente.cargo !== "root" || existente.status !== "ativo") {
                await refRoot.update({
                    cargo: "root",
                    perfis: todosPerfis,
                    status: "ativo"
                });
                await window.Store.garantirPronto(emailId);
                window.Store.upsertLocal("usuarios", { ...existente, id: emailId, cargo: "root", perfis: todosPerfis, status: "ativo" });
            } else await window.Store.garantirPronto(emailId);
            return "root";
        }

        // Autoriza pelo documento individual antes de ativar listeners de coleções globais.
        const docUsuario = await window.db.collection("usuarios").doc(emailId).get();
        const dados = docUsuario.exists ? { id: docUsuario.id, ...docUsuario.data() } : null;

        if (dados) {
            if (dados.status === "pendente" || dados.cargo === "pendente") {
                window.Store.meuUsuario = dados;   // em memória: evita nova leitura ao montar o dashboard pendente
                return "pendente";
            }
            if (dados.status === "inativo" || dados.status === "bloqueado") {
                return "sem_acesso";
            }
            window.Store.definirCargo(dados.cargo || "apoio");
            window.Store.meuUsuario = dados;
            await window.Store.garantirPronto(emailId);
            return dados.cargo || "apoio";
        }

        // 2. Retrocompatibilidade com coleção antiga "permissoes"
        try {
            const docPerm = await window.db.collection("permissoes").doc(emailId).get();
            if (docPerm.exists) {
                const cargoLegado = docPerm.data().cargo || "apoio";
                window.Store.definirCargo(cargoLegado);
                await window.Store.garantirPronto(emailId);
                return cargoLegado;
            }
        } catch (_) {}

        return "nao_cadastrado";
    },

    async salvarPermissao(email, cargo) {
        const emailId = (email || "").trim().toLowerCase();
        const payload = {
            email: emailId,
            cargo: cargo,
            status: "ativo",
            atualizado_em: new Date().toISOString()
        };
        await window.db.collection("usuarios").doc(emailId).set(payload, { merge: true });
        window.Store.upsertLocal("usuarios", { id: emailId, ...payload });
    },

    usuarioPodeEditar() {
        const cargosEdicao = ["root", "admin", "tecnico", "docente"];
        return cargosEdicao.includes(window.usuarioAtual?.cargo);
    }
};
