// ./admin/controller_admin_credenciamento.js - Regras de Negócio da Aba Credenciamento (Painel Admin)
window.ControllerAdminCredenciamento = {

    hierarquiaCargos: {
        root: 5,
        admin: 4,
        tecnico: 3,
        docente: 2,
        apoio: 1,
        pendente: 0
    },

    async listarUsuarios() {
        const snap = await window.db.collection("usuarios").get();
        const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Ordena priorizando os cadastros "pendentes" no topo e depois por nome alfabético
        return lista.sort((a, b) => {
            const aPend = (a.status === 'pendente' || a.cargo === 'pendente') ? 0 : 1;
            const bPend = (b.status === 'pendente' || b.cargo === 'pendente') ? 0 : 1;
            if (aPend !== bPend) return aPend - bPend;
            return (a.nome_completo || a.email || "").localeCompare(b.nome_completo || b.email || "");
        });
    },

    async listarAreasCadastradas() {
        const snap = await window.db.collection("areas").orderBy("nome", "asc").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Retorna quais cargos o usuário logado tem autoridade para atribuir
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
        if (cargoLogado === 'tecnico') {
            return [
                { valor: 'docente', rotulo: 'Docente' },
                { valor: 'apoio', rotulo: 'Apoio Administrativo / Escolar' }
            ];
        }
        return [];
    },

    // Verifica se o usuário logado pode editar/gerenciar o usuário alvo
    podeGerenciarUsuario(cargoLogado, usuarioAlvo) {
        if (!usuarioAlvo) return false;
        const cargoAlvo = usuarioAlvo.cargo || 'pendente';

        // Ninguém altera o ROOT pelo painel de terceiros (apenas o próprio ROOT se necessário)
        if (cargoAlvo === 'root') return cargoLogado === 'root';

        if (cargoLogado === 'root') return true;
        if (cargoLogado === 'admin') {
            return ['tecnico', 'docente', 'apoio', 'pendente'].includes(cargoAlvo);
        }
        if (cargoLogado === 'tecnico') {
            return ['docente', 'apoio', 'pendente'].includes(cargoAlvo);
        }
        return false;
    },

    // Define os perfis acumulados conforme a regra de negócio de cada cargo
    _calcularPerfisAcumulados(cargo) {
        switch (cargo) {
            case 'root':
                return ['root', 'admin', 'tecnico', 'docente', 'apoio'];
            case 'admin':
                return ['admin', 'tecnico', 'docente', 'apoio'];
            case 'tecnico':
                return ['tecnico', 'docente', 'apoio'];
            case 'docente':
                return ['docente'];
            case 'apoio':
                return ['apoio'];
            default:
                return [];
        }
    },

    async salvarCredenciamentoUsuario(emailAlvo, dadosCredenciamento, usuarioLogado) {
        const emailId = (emailAlvo || "").trim().toLowerCase();
        if (!emailId) throw new Error("E-mail do usuário inválido.");

        const docRef = window.db.collection("usuarios").doc(emailId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) throw new Error("Usuário não encontrado no banco de dados.");

        const usuarioAlvo = docSnap.data();
        const cargoLogado = usuarioLogado?.cargo || 'sem_acesso';

        if (!this.podeGerenciarUsuario(cargoLogado, usuarioAlvo)) {
            throw new Error("Você não possui privilégio hierárquico para alterar este usuário.");
        }

        const novoCargo = dadosCredenciamento.cargo;
        const novoStatus = dadosCredenciamento.status || 'ativo';

        // Se o status for pendente, mantém cargo como pendente
        if (novoStatus === 'pendente') {
            await docRef.update({
                nome: dadosCredenciamento.nome.trim(),
                sobrenome: dadosCredenciamento.sobrenome.trim(),
                nome_completo: `${dadosCredenciamento.nome.trim()} ${dadosCredenciamento.sobrenome.trim()}`,
                cargo: 'pendente',
                status: 'pendente',
                perfis: [],
                areas: dadosCredenciamento.areas || [],
                atualizado_em: new Date().toISOString(),
                credenciado_por: usuarioLogado.email
            });
            return;
        }

        // Valida se o cargo atribuído está dentro da alçada do usuário logado (exceto se for o próprio root editando a si mesmo)
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

        await docRef.update(payload);
    },

    async excluirUsuario(emailAlvo, usuarioLogado) {
        const emailId = (emailAlvo || "").trim().toLowerCase();
        const docRef = window.db.collection("usuarios").doc(emailId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return;

        const usuarioAlvo = docSnap.data();
        if (usuarioAlvo.cargo === 'root') {
            throw new Error("A conta ROOT do sistema não pode ser excluída.");
        }

        if (!this.podeGerenciarUsuario(usuarioLogado?.cargo, usuarioAlvo)) {
            throw new Error("Você não possui permissão para excluir um usuário deste nível hierárquico.");
        }

        await docRef.delete();
    }
};