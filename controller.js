// ./controller.js - Controlador Global de Sessão, Perfis e Store Central com Cache Persistente
const STORAGE_CACHE_KEY = "inovatech_store_cache_v1";

window.Store = {
    dados: {
        areas: [],
        cursos: [],
        ucs: [],
        turmas: [],
        encontros: [],
        excecoes: [],
        salas: [],
        usuarios: [],
        docentes: []
    },
    listeners: [],
    inicializado: false,
    _promessaInicio: null,
    onUpdateCallback: null,

    // Carrega instantaneamente os dados salvos no navegador ao abrir a página
    _carregarCacheNavegador() {
        try {
            const salvo = localStorage.getItem(STORAGE_CACHE_KEY) || sessionStorage.getItem(STORAGE_CACHE_KEY);
            if (!salvo) return false;
            const parsed = JSON.parse(salvo);
            if (parsed && typeof parsed === "object") {
                Object.keys(this.dados).forEach(k => {
                    if (Array.isArray(parsed[k])) this.dados[k] = parsed[k];
                });
                this._processarDocentes();
                return true;
            }
        } catch (err) {
            console.warn("[Store] Não foi possível ler o cache local:", err);
        }
        return false;
    },

    _salvarCacheNavegador() {
        try {
            const payload = JSON.stringify({
                areas: this.dados.areas,
                cursos: this.dados.cursos,
                ucs: this.dados.ucs,
                turmas: this.dados.turmas,
                encontros: this.dados.encontros,
                excecoes: this.dados.excecoes,
                salas: this.dados.salas,
                usuarios: this.dados.usuarios
            });
            sessionStorage.setItem(STORAGE_CACHE_KEY, payload);
            localStorage.setItem(STORAGE_CACHE_KEY, payload);
        } catch (err) {
            console.warn("[Store] Limite de armazenamento local atingido:", err);
        }
    },

    async iniciar() {
        return this.garantirPronto();
    },

    // Garante que os listeners foram ativados e que os dados estão prontos para qualquer Controller
    async garantirPronto() {
        if (this.inicializado && this.listeners.length > 0) {
            return this.dados;
        }
        if (this._promessaInicio) {
            return this._promessaInicio;
        }

        const tinhaCacheLocal = this._carregarCacheNavegador();

        this._promessaInicio = new Promise((resolve) => {
            const colecoes = [
                { col: "areas", chave: "areas" },
                { col: "cursos", chave: "cursos" },
                { col: "ucs", chave: "ucs" },
                { col: "turmas", chave: "turmas" },
                { col: "encontros", chave: "encontros" },
                { col: "datas_excecoes", chave: "excecoes" },
                { col: "salas_aula", chave: "salas" },
                { col: "usuarios", chave: "usuarios" }
            ];

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

            // Se já existia cache no navegador, libera a interface rapidamente sem travar
            if (tinhaCacheLocal && (this.dados.cursos.length > 0 || this.dados.turmas.length > 0 || this.dados.usuarios.length > 0)) {
                setTimeout(concluir, 60);
            }

            // Timeout de segurança para nunca travar a tela caso alguma coleção demore ou falhe
            const timerSeguranca = setTimeout(concluir, 4000);

            const checkPronto = () => {
                pendentes--;
                if (pendentes <= 0) {
                    clearTimeout(timerSeguranca);
                    concluir();
                }
            };

            colecoes.forEach(({ col, chave }) => {
                this._escutarColecao(col, chave, checkPronto);
            });
        });

        return this._promessaInicio;
    },

    _escutarColecao(nomeColecao, nomeEstado, callbackInicial) {
        if (!window.db) {
            callbackInicial();
            return;
        }

        let primeiroDisparo = true;
        const unsubscribe = window.db.collection(nomeColecao).onSnapshot((snapshot) => {
            const teveMudancaReal = snapshot.docChanges().length > 0;
            if (primeiroDisparo || teveMudancaReal) {
                const lista = [];
                snapshot.forEach(doc => lista.push({ id: doc.id, ...doc.data() }));
                this.dados[nomeEstado] = lista;

                if (nomeEstado === "usuarios") {
                    this._processarDocentes();
                }
                this._salvarCacheNavegador();

                if (!primeiroDisparo && teveMudancaReal && typeof this.onUpdateCallback === "function") {
                    this.onUpdateCallback(nomeEstado);
                }
            }

            if (primeiroDisparo) {
                primeiroDisparo = false;
                callbackInicial();
            }
        }, (err) => {
            console.warn(`[Store] Aviso ao monitorar coleção '${nomeColecao}':`, err.message);
            if (primeiroDisparo) {
                primeiroDisparo = false;
                callbackInicial();
            }
        });

        this.listeners.push(unsubscribe);
    },

    _processarDocentes() {
        const norm = s => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
        this.dados.docentes = (this.dados.usuarios || []).filter(u =>
            u.status === "ativo" &&
            norm(u.cargo) === "docente" &&
            Array.isArray(u.perfis) &&
            u.perfis.some(p => norm(p) === "docente")
        );
    },

    // Atualiza ou insere imediatamente um item no cache em memória e no navegador
    upsertLocal(chave, item) {
        if (!item || !item.id || !Array.isArray(this.dados[chave])) return;
        const idx = this.dados[chave].findIndex(x => x.id === item.id);
        if (idx >= 0) {
            this.dados[chave][idx] = { ...this.dados[chave][idx], ...item };
        } else {
            this.dados[chave].push(item);
        }
        if (chave === "usuarios") this._processarDocentes();
        this._salvarCacheNavegador();
    },

    // Remove imediatamente um item do cache em memória e do navegador
    removerLocal(chave, id) {
        if (!id || !Array.isArray(this.dados[chave])) return;
        this.dados[chave] = this.dados[chave].filter(x => x.id !== id);
        if (chave === "usuarios") this._processarDocentes();
        this._salvarCacheNavegador();
    },

    limpar() {
        this.listeners.forEach(unsub => {
            try { unsub(); } catch (_) {}
        });
        this.listeners = [];
        this.inicializado = false;
        this._promessaInicio = null;
        Object.keys(this.dados).forEach(k => { this.dados[k] = []; });
        try {
            sessionStorage.removeItem(STORAGE_CACHE_KEY);
            localStorage.removeItem(STORAGE_CACHE_KEY);
        } catch (_) {}
    }
};

// Carrega dados prévios do navegador imediatamente ao abrir o script
window.Store._carregarCacheNavegador();

window.Controller = {

    async obterPerfil(email, isSuperUser = false) {
        const emailId = (email || "").trim().toLowerCase();
        if (!emailId) return "sem_acesso";

        // Inicia os listeners e o cache global assim que o usuário autentica
        await window.Store.garantirPronto();

        if (isSuperUser) {
            const todosPerfis = ["root", "admin", "tecnico", "docente", "apoio"];
            const existente = window.Store.dados.usuarios.find(u => (u.id || u.email || "").toLowerCase() === emailId);
            const refRoot = window.db.collection("usuarios").doc(emailId);

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
                window.Store.upsertLocal("usuarios", novoRoot);
            } else if (existente.cargo !== "root" || existente.status !== "ativo") {
                await refRoot.update({
                    cargo: "root",
                    perfis: todosPerfis,
                    status: "ativo"
                });
                window.Store.upsertLocal("usuarios", { ...existente, id: emailId, cargo: "root", perfis: todosPerfis, status: "ativo" });
            }
            return "root";
        }

        // 1. Busca primeiro em memória no Store (0 leituras extras)
        let dados = window.Store.dados.usuarios.find(u => (u.id || u.email || "").toLowerCase() === emailId);

        // Fallback seguro caso o documento acabe de ser criado e ainda não conste no Store
        if (!dados) {
            const docUsuario = await window.db.collection("usuarios").doc(emailId).get();
            if (docUsuario.exists) {
                dados = { id: docUsuario.id, ...docUsuario.data() };
                window.Store.upsertLocal("usuarios", dados);
            }
        }

        if (dados) {
            if (dados.status === "pendente" || dados.cargo === "pendente") {
                return "pendente";
            }
            if (dados.status === "inativo" || dados.status === "bloqueado") {
                return "sem_acesso";
            }
            return dados.cargo || "apoio";
        }

        // 2. Retrocompatibilidade com coleção antiga "permissoes"
        try {
            const docPerm = await window.db.collection("permissoes").doc(emailId).get();
            if (docPerm.exists) {
                return docPerm.data().cargo || "apoio";
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