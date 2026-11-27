// ./admin/controller_admin_backup.js - Exportação de backups autorizados do Firestore
window.ControllerAdminBackup = {
    _colecoes: [
        { nome: 'areas', rotulo: 'Áreas', grupo: 'Cadastros' },
        { nome: 'cursos', rotulo: 'Cursos', grupo: 'Cadastros' },
        { nome: 'ucs', rotulo: 'Unidades curriculares', grupo: 'Cadastros' },
        { nome: 'turmas', rotulo: 'Turmas', grupo: 'Cadastros' },
        { nome: 'salas_aula', rotulo: 'Salas de aula', grupo: 'Cadastros' },
        { nome: 'encontros', rotulo: 'Encontros', grupo: 'Operação' },
        { nome: 'datas_excecoes', rotulo: 'Exceções do calendário', grupo: 'Operação' },
        { nome: 'mapa_salas_status', rotulo: 'Status do Mapa de Sala', grupo: 'Operação' },
        { nome: 'Alterações', rotulo: 'Alterações', grupo: 'Operação' },
        { nome: 'escalas_docentes', rotulo: 'Escalas docentes', grupo: 'Área Docente' },
        { nome: 'ferias_docentes', rotulo: 'Férias docentes', grupo: 'Área Docente' },
        { nome: 'atividades_docentes', rotulo: 'Atividades docentes', grupo: 'Área Docente' },
        { nome: 'solicitacoes', rotulo: 'Solicitações', grupo: 'Administração' },
        { nome: 'solicitacoes_areas', rotulo: 'Solicitações de área', grupo: 'Administração' },
        { nome: 'usuarios', rotulo: 'Usuários e credenciamentos', grupo: 'Administração' },
        { nome: 'acessos', rotulo: 'Vínculos de acesso', grupo: 'Administração' },
        { nome: 'diretorio_docentes', rotulo: 'Diretório de docentes', grupo: 'Diretórios' },
        { nome: 'diretorio_solicitacoes', rotulo: 'Diretório legado de solicitações', grupo: 'Diretórios' },
        { nome: 'diretorio_solicitacoes_minimo', rotulo: 'Diretório mínimo de destinatários', grupo: 'Diretórios' }
    ],
    _isAdmin() { return ['root', 'admin'].includes(window.usuarioAtual?.cargo); },
    _isSuper() { return String(window.auth?.currentUser?.email || window.usuarioAtual?.email || '').toLowerCase() === 'leoignacio@gmail.com'; },
    colecoesDisponiveis() {
        if (!this._isAdmin()) throw new Error('Somente Root/Admin podem gerar backups.');
        const lista = [...this._colecoes];
        // As regras atuais reservam a leitura total dessas coleções legadas ao superusuário.
        if (this._isSuper()) lista.push(
            { nome: 'usuarios_permissoes', rotulo: 'Permissões legadas por usuário', grupo: 'Legadas (superusuário)' },
            { nome: 'permissoes', rotulo: 'Permissões legadas', grupo: 'Legadas (superusuário)' }
        );
        return lista;
    },
    _normalizar(valor) {
        if (valor === undefined) return null;
        if (valor === null || typeof valor === 'string' || typeof valor === 'boolean' || typeof valor === 'number') return valor;
        if (typeof valor === 'bigint') return String(valor);
        if (valor instanceof Date) return valor.toISOString();
        if (typeof valor.toDate === 'function') return valor.toDate().toISOString();
        if (typeof valor.latitude === 'number' && typeof valor.longitude === 'number') return { _tipo: 'GeoPoint', latitude: valor.latitude, longitude: valor.longitude };
        if (typeof valor.path === 'string' && valor.firestore) return { _tipo: 'DocumentReference', path: valor.path };
        if (typeof valor.toBase64 === 'function') return { _tipo: 'Bytes', base64: valor.toBase64() };
        if (valor instanceof Uint8Array || valor instanceof ArrayBuffer) {
            const bytes = valor instanceof Uint8Array ? valor : new Uint8Array(valor);
            let binario = ''; for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
            return { _tipo: 'Bytes', base64: btoa(binario) };
        }
        if (Array.isArray(valor)) return valor.map(item => this._normalizar(item));
        if (typeof valor === 'object') {
            const saida = {};
            Object.keys(valor).forEach(chave => { saida[chave] = this._normalizar(valor[chave]); });
            return saida;
        }
        return String(valor);
    },
    async lerColecao(nome, aoProgredir = () => {}) {
        if (!this._isAdmin()) throw new Error('Somente Root/Admin podem gerar backups.');
        if (!this.colecoesDisponiveis().some(item => item.nome === nome)) throw new Error(`Coleção não autorizada para este perfil: ${nome}`);
        if (!window.db || !window.firebase?.firestore?.FieldPath) throw new Error('Firebase/Firestore não está disponível nesta sessão.');
        const registros = [], tamanhoPagina = 500;
        let cursor = null, pagina = 0;
        while (true) {
            let consulta = window.db.collection(nome)
                .orderBy(window.firebase.firestore.FieldPath.documentId())
                .limit(tamanhoPagina);
            if (cursor) consulta = consulta.startAfter(cursor);
            const snapshot = await consulta.get();
            snapshot.docs.forEach(doc => registros.push({ ...this._normalizar(doc.data()), __documentId: doc.id }));
            pagina++;
            aoProgredir({ nome, pagina, registros: registros.length, lote: snapshot.size });
            if (snapshot.size < tamanhoPagina) break;
            cursor = snapshot.docs[snapshot.docs.length - 1];
        }
        return registros;
    },
    _csv(registros) {
        const cabecalhos = [...new Set(['__documentId', ...registros.flatMap(item => Object.keys(item))])];
        const valor = v => {
            let texto = v === null || v === undefined ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
            if (/^[\s]*[=+@\-\t\r]/.test(texto)) texto = `'${texto}`;
            return `"${texto.replace(/"/g, '""')}"`;
        };
        return '\ufeff' + [cabecalhos.map(valor).join(','), ...registros.map(item => cabecalhos.map(chave => valor(item[chave])).join(','))].join('\r\n');
    },
    conteudoArquivo(nomeColecao, registros, formato, criadoEm) {
        if (formato === 'csv') return this._csv(registros);
        return JSON.stringify({ colecao: nomeColecao, exportado_em: criadoEm, total_documentos: registros.length, documentos: registros }, null, 2);
    },
    nomeArquivo(nomeColecao, formato) {
        const slug = nomeColecao.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
        return `${slug || 'colecao'}.${formato}`;
    },
    _u16(v) { return [v & 255, (v >>> 8) & 255]; },
    _u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; },
    _crc32(bytes) {
        let crc = 0xffffffff;
        for (let i = 0; i < bytes.length; i++) {
            crc ^= bytes[i];
            for (let b = 0; b < 8; b++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
        return (crc ^ 0xffffffff) >>> 0;
    },
    _zip(files) {
        if (typeof TextEncoder === 'undefined' || typeof Blob === 'undefined') throw new Error('Este navegador não oferece os recursos necessários para gerar o ZIP.');
        const encoder = new TextEncoder(), locais = [], centrais = [];
        let deslocamento = 0;
        const agora = new Date(), hora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | Math.floor(agora.getSeconds() / 2);
        const data = ((Math.max(1980, agora.getFullYear()) - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate();
        if (files.length > 65535) throw new Error('O número de arquivos excede o limite do formato ZIP padrão.');
        files.forEach(file => {
            const nome = encoder.encode(file.nome), bytes = encoder.encode(file.conteudo), crc = this._crc32(bytes);
            if (bytes.length > 0xffffffff || deslocamento > 0xffffffff) throw new Error('O arquivo excede o limite do formato ZIP padrão.');
            const local = new Uint8Array(30 + nome.length), lv = new DataView(local.buffer);
            lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint16(8, 0, true);
            lv.setUint16(10, hora, true); lv.setUint16(12, data, true); lv.setUint32(14, crc, true); lv.setUint32(18, bytes.length, true); lv.setUint32(22, bytes.length, true);
            lv.setUint16(26, nome.length, true); lv.setUint16(28, 0, true); local.set(nome, 30);
            locais.push(local, bytes);
            const central = new Uint8Array(46 + nome.length), cv = new DataView(central.buffer);
            cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
            cv.setUint16(12, hora, true); cv.setUint16(14, data, true); cv.setUint32(16, crc, true); cv.setUint32(20, bytes.length, true); cv.setUint32(24, bytes.length, true);
            cv.setUint16(28, nome.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true); cv.setUint16(34, 0, true); cv.setUint16(36, 0, true);
            cv.setUint32(38, 0, true); cv.setUint32(42, deslocamento, true); central.set(nome, 46); centrais.push(central);
            deslocamento += local.length + bytes.length;
            if (deslocamento > 0xffffffff) throw new Error('O backup ultrapassa 4 GB, limite do ZIP padrão.');
        });
        const tamanhoCentral = centrais.reduce((s, item) => s + item.length, 0), fim = new Uint8Array(22), fv = new DataView(fim.buffer);
        if (tamanhoCentral > 0xffffffff) throw new Error('O backup ultrapassa 4 GB, limite do ZIP padrão.');
        fv.setUint32(0, 0x06054b50, true); fv.setUint16(4, 0, true); fv.setUint16(6, 0, true); fv.setUint16(8, files.length, true); fv.setUint16(10, files.length, true);
        fv.setUint32(12, tamanhoCentral, true); fv.setUint32(16, deslocamento, true); fv.setUint16(20, 0, true);
        return new Blob([...locais, ...centrais, fim], { type: 'application/zip' });
    }
};
