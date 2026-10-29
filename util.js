// ./util.js - Utilitários globais (escape de HTML e mensagens de erro amigáveis)
window.Util = {

    // Escapa texto para uso seguro dentro de templates HTML e atributos ("..." ou '...').
    esc(valor) {
        return (valor ?? '').toString().replace(/[&<>"'`]/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;'
        }[c]));
    },

    // Nome do dia da semana (pt-BR) de uma data ISO (AAAA-MM-DD). Retorna '' se a data for inválida.
    diaSemana(iso) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
        if (!m) return '';
        const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
        if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return '';
        return ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][d.getUTCDay()];
    },

    // Período (MANHÃ / TARDE / NOITE) de uma turma, a partir do texto livre do cadastro.
    periodoDaTurma(turma) {
        const p = window.Util.semAcento(turma?.periodo || '');
        if (p.includes('manha')) return 'MANHÃ';
        if (p.includes('tarde')) return 'TARDE';
        if (p.includes('noite')) return 'NOITE';
        return 'MANHÃ';
    },

    // A exceção vale para a turma? Exceções com "periodos" (ex.: Quarta-feira de Cinzas, só pela manhã)
    // atingem apenas turmas desses períodos; sem "periodos", valem para o dia inteiro.
    excecaoAplica(excecao, turma) {
        if (!excecao) return false;
        const periodos = Array.isArray(excecao.periodos) ? excecao.periodos : [];
        if (!periodos.length || !turma) return true;
        return periodos.includes(window.Util.periodoDaTurma(turma));
    },

    // Remove acentos e caixa: útil para comparar cabeçalhos e rótulos digitados.
    semAcento(texto) {
        return (texto ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    },

    // Converte erros do Firebase/JS em mensagens claras para o usuário final.
    mensagemErro(err, padrao = 'Não foi possível concluir a operação. Tente novamente.') {
        if (!err) return padrao;
        const codigo = (err.code || '').toString();
        const mapa = {
            'permission-denied': 'Você não tem permissão para realizar esta operação.',
            'unavailable': 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
            'resource-exhausted': 'O limite diário de uso do banco de dados foi atingido. Tente novamente mais tarde.',
            'deadline-exceeded': 'O servidor demorou para responder. Tente novamente.',
            'failed-precondition': 'A operação não pôde ser concluída no estado atual dos dados.',
            'not-found': 'O registro solicitado não foi encontrado.',
            'already-exists': 'Este registro já existe.',
            'auth/email-already-in-use': 'Este e-mail já possui uma conta. Entre com sua senha ou use o login do Google.',
            'auth/invalid-email': 'O e-mail informado é inválido.',
            'auth/weak-password': 'A senha deve possuir no mínimo 6 caracteres.',
            'auth/user-not-found': 'E-mail ou senha incorretos.',
            'auth/wrong-password': 'E-mail ou senha incorretos.',
            'auth/invalid-credential': 'E-mail ou senha incorretos.',
            'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
            'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.',
            'auth/network-request-failed': 'Falha de rede. Verifique sua internet e tente novamente.',
            'auth/popup-closed-by-user': 'A janela de login foi fechada antes da conclusão.',
            'auth/cancelled-popup-request': 'A janela de login foi fechada antes da conclusão.',
            'auth/popup-blocked': 'O navegador bloqueou a janela de login. Libere pop-ups para este site.',
            'auth/user-disabled': 'Esta conta foi desativada.'
        };
        const chave = codigo.replace(/^firestore\//, '');
        if (mapa[chave]) return mapa[chave];
        if (err.message && !/^(firebase|firestore)/i.test(err.message) && !/\(auth\//.test(err.message)) return err.message;
        return padrao;
    }
};
