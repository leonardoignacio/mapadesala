// ./admin/controller_admin_credenciamento.js - Regras de Negócio da Aba Credenciamento (Otimizado com Store)
window.ControllerAdminCredenciamento = {

    hierarquiaCargos: {
        root: 5, admin: 4, tecnico: 3, docente: 2, apoio: 1, pendente: 0
    },

    // ---- Diretório público de docentes ------------------------------------------------------------
    // Perfis sem acesso à coleção "usuarios" (técnico, docente, apoio) obtêm a lista de docentes aqui. O diretório guarda
    // somente o necessário para escalar docentes (nome, áreas e status), sem justificativas, datas de auditoria etc.
    COLECAO_DIRETORIO: 'diretorio_docentes',

    _norm(v) { return (v || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(); },

    // Retorna o registro do diretório ou null quando o usuário não deve constar (não é docente ativo).
    _entradaDiretorio(u) {
        if (!u) return null;
        const perfis = Array.isArray(u.perfis) ? u.perfis : [];
        if (u.status !== 'ativo' || this._norm(u.cargo) !== 'docente' || !perfis.some(p => this._norm(p) === 'docente')) return null;
        const email = (u.id || u.email || '').toLowerCase();
        if (!email) return null;
        return { email, nome: u.nome || '', sobrenome: u.sobrenome || '', nome_completo: u.nome_completo || `${u.nome || ''} ${u.sobrenome || ''}`.trim(),
                 cargo: 'docente', perfis, areas: Array.isArray(u.areas) ? u.areas : [], status: 'ativo' };
    },

    _diretorioIgual(a, b) {
        return ['email', 'nome', 'sobrenome', 'nome_completo', 'cargo', 'status'].every(k => (a[k] || '') === (b[k] || ''))
            && JSON.stringify(a.perfis || []) === JSON.stringify(b.perfis || [])
            && JSON.stringify(a.areas || []) === JSON.stringify(b.areas || []);
    },

    // Grava o usuário e o respectivo registro do diretório no mesmo lote (ambos ou nenhum).
    async _gravarUsuarioEDiretorio(emailId, patch, usuarioAtualizado) {
        const entrada = this._entradaDiretorio(usuarioAtualizado);
        const refDir = window.db.collection(this.COLECAO_DIRETORIO).doc(emailId);
        const batch = window.db.batch();
        batch.update(window.db.collection("usuarios").doc(emailId), patch);
        if (entrada) batch.set(refDir, entrada); else batch.delete(refDir);
        await batch.commit();
        window.Store.upsertLocal("usuarios", usuarioAtualizado);
        if (entrada) window.Store.upsertLocal("diretorio", { id: emailId, ...entrada });
        else window.Store.removerLocal("diretorio", emailId);
    },

    // Deixa o diretório igual ao esperado a partir de "usuarios" (cria, atualiza e remove sobras). Só Root/Admin.
    // Rodado em segundo plano no login: só grava quando há diferença, então custa zero escritas no dia a dia.
    async sincronizarDiretorio() {
        await window.Store.garantirPronto();
        if (!window.Store._carregaUsuarios()) return { gravados: 0, removidos: 0 };
        const esperado = new Map();
        (window.Store.dados.usuarios || []).forEach(u => { const e = this._entradaDiretorio(u); if (e) esperado.set(e.email, e); });
        const atual = new Map((window.Store.dados.diretorio || []).map(d => [d.id, d]));

        const ops = [];
        esperado.forEach((e, id) => { const a = atual.get(id); if (!a || !this._diretorioIgual(a, e)) ops.push({ tipo: 'set', id, dados: e }); });
        atual.forEach((_, id) => { if (!esperado.has(id)) ops.push({ tipo: 'delete', id }); });
        if (!ops.length) return { gravados: 0, removidos: 0 };

        for (let i = 0; i < ops.length; i += 400) {
            const batch = window.db.batch();
            ops.slice(i, i + 400).forEach(o => {
                const ref = window.db.collection(this.COLECAO_DIRETORIO).doc(o.id);
                if (o.tipo === 'set') batch.set(ref, o.dados); else batch.delete(ref);
            });
            await batch.commit();
        }
        ops.forEach(o => o.tipo === 'set' ? window.Store.upsertLocal("diretorio", { id: o.id, ...o.dados }) : window.Store.removerLocal("diretorio", o.id));
        return { gravados: ops.filter(o => o.tipo === 'set').length, removidos: ops.filter(o => o.tipo === 'delete').length };
    },

    async listarUsuarios() {
        await window.Store.garantirPronto();
        const lista = [...(window.Store.dados.usuarios || [])];

        return lista.sort((a, b) => {
            const aPend = (a.status === 'pendente' || a.cargo === 'pendente') ? 0 : 1;
            const bPend = (b.status === 'pendente' || b.cargo === 'pendente') ? 0 : 1;
            if (aPend !== bPend) return aPend - bPend;
            return (a.nome_completo || a.email || "").localeCompare(b.nome_completo || b.email || "");
        });
    },

    async listarAreasCadastradas() {
        await window.Store.garantirPronto();
        return [...(window.Store.dados.areas || [])].sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    },

    obterCargosPermitidosParaAtribuicao(cargoLogado) {
        if (cargoLogado === 'root') {
            return [
                { valor: 'admin', rotulo: 'Administrador (Acumula todos os perfis)' },
                { valor: 'tecnico', rotulo: 'Técnico de Área (Coordenação Pedagógica)' },
                { valor: 'docente', rotulo: 'Docente' },
                { valor: 'apoio', rotulo: 'Apoio Administrativo / Escolar' }
            ];
        }
        if (cargoLogado === 'admin') {
            return [
                { valor: 'tecnico', rotulo: 'Técnico de Área (Coordenação Pedagógica)' },
                { valor: 'docente', rotulo: 'Docente' },
                { valor: 'apoio', rotulo: 'Apoio Administrativo / Escolar' }
            ];
        }
        return [];
    },

    podeGerenciarUsuario(cargoLogado, usuarioAlvo) {
        if (!usuarioAlvo) return false;
        const cargoAlvo = usuarioAlvo.cargo || 'pendente';

        if (cargoAlvo === 'root') return cargoLogado === 'root';
        if (cargoLogado === 'root') return true;
        if (cargoLogado === 'admin') {
            return ['tecnico', 'docente', 'apoio', 'pendente'].includes(cargoAlvo);
        }
        return false;
    },

    _calcularPerfisAcumulados(cargo) {
        switch (cargo) {
            case 'root': return ['root', 'admin', 'tecnico', 'docente', 'apoio'];
            case 'admin': return ['admin', 'tecnico', 'docente', 'apoio'];
            case 'tecnico': return ['tecnico', 'docente', 'apoio'];
            case 'docente': return ['docente'];
            case 'apoio': return ['apoio'];
            default: return [];
        }
    },

    async salvarCredenciamentoUsuario(emailAlvo, dadosCredenciamento, usuarioLogado) {
        await window.Store.garantirPronto();
        const emailId = (emailAlvo || "").trim().toLowerCase();
        if (!emailId) throw new Error("E-mail do usuário inválido.");

        const docRef = window.db.collection("usuarios").doc(emailId);
        let usuarioAlvo = (window.Store.dados.usuarios || []).find(u => (u.id || u.email || "").toLowerCase() === emailId);

        if (!usuarioAlvo) {
            const docSnap = await docRef.get();
            if (!docSnap.exists) throw new Error("Usuário não encontrado no banco de dados.");
            usuarioAlvo = { id: docSnap.id, ...docSnap.data() };
        }

        const cargoLogado = usuarioLogado?.cargo || 'sem_acesso';
        if (!this.podeGerenciarUsuario(cargoLogado, usuarioAlvo)) {
            throw new Error("Você não possui privilégio hierárquico para alterar este usuário.");
        }

        const novoCargo = dadosCredenciamento.cargo;
        const novoStatus = dadosCredenciamento.status || 'ativo';

        if (novoStatus === 'pendente') {
            const patchPendente = {
                nome: dadosCredenciamento.nome.trim(),
                sobrenome: dadosCredenciamento.sobrenome.trim(),
                nome_completo: `${dadosCredenciamento.nome.trim()} ${dadosCredenciamento.sobrenome.trim()}`,
                cargo: 'pendente',
                status: 'pendente',
                perfis: [],
                areas: dadosCredenciamento.areas || [],
                atualizado_em: new Date().toISOString(),
                credenciado_por: usuarioLogado.email
            };
            await this._gravarUsuarioEDiretorio(emailId, patchPendente, { ...usuarioAlvo, id: emailId, ...patchPendente });
            return;
        }

        if (usuarioAlvo.cargo !== 'root') {
            const permitidos = this.obterCargosPermitidosParaAtribuicao(cargoLogado).map(c => c.valor);
            if (!permitidos.includes(novoCargo)) {
                throw new Error(`Seu perfil (${cargoLogado.toUpperCase()}) não tem permissão para promover usuários ao perfil ${novoCargo.toUpperCase()}.`);
            }
        }

        const cargoFinal = usuarioAlvo.cargo === 'root' ? 'root' : novoCargo;
        const perfisAcumulados = this._calcularPerfisAcumulados(cargoFinal);
        const areasSelecionadas = (cargoFinal === 'root' || cargoFinal === 'admin')
            ? ['Todas']
            : (dadosCredenciamento.areas || []);

        const payload = {
            nome: dadosCredenciamento.nome.trim(),
            sobrenome: dadosCredenciamento.sobrenome.trim(),
            nome_completo: `${dadosCredenciamento.nome.trim()} ${dadosCredenciamento.sobrenome.trim()}`,
            cargo: cargoFinal,
            perfis: perfisAcumulados,
            areas: areasSelecionadas,
            tipo_vinculo_area: cargoFinal === 'tecnico'
                ? 'responsavel'
                : (cargoFinal === 'docente' ? 'atuacao' : (cargoFinal === 'apoio' ? 'preferencial' : 'global')),
            status: novoStatus,
            credenciado_por: usuarioLogado.email,
            credenciado_em: new Date().toISOString()
        };

        await this._gravarUsuarioEDiretorio(emailId, payload, { ...usuarioAlvo, id: emailId, ...payload });
    },

    async excluirUsuario(emailAlvo, usuarioLogado) {
        await window.Store.garantirPronto();
        const emailId = (emailAlvo || "").trim().toLowerCase();
        const docRef = window.db.collection("usuarios").doc(emailId);
        const usuarioAlvo = (window.Store.dados.usuarios || []).find(u => (u.id || u.email || "").toLowerCase() === emailId);
        if (!usuarioAlvo) return;

        if (usuarioAlvo.cargo === 'root') {
            throw new Error("A conta ROOT do sistema não pode ser excluída.");
        }

        if (!this.podeGerenciarUsuario(usuarioLogado?.cargo, usuarioAlvo)) {
            throw new Error("Você não possui permissão para excluir um usuário deste nível hierárquico.");
        }

        const batch = window.db.batch();
        batch.delete(docRef);
        batch.delete(window.db.collection(this.COLECAO_DIRETORIO).doc(emailId));
        await batch.commit();
        window.Store.removerLocal("usuarios", emailId);
        window.Store.removerLocal("diretorio", emailId);
    }
};