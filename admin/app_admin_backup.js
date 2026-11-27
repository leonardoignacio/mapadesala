// ./admin/app_admin_backup.js - Interações e exportação da aba Backup
window.AppAdminBackup = {
    _inicializando: false,
    _formatarData() {
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    },
    async iniciarView() {
        const container = document.getElementById('admin-backup-colecoes');
        if (!container || this._inicializando) return false;
        if (!window.ControllerAdminBackup?._isAdmin()) {
            container.innerHTML = '<p class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">A exportação está disponível somente para Root/Admin.</p>';
            return false;
        }
        this._inicializando = true;
        try {
            const colecoes = window.ControllerAdminBackup.colecoesDisponiveis();
            container.innerHTML = window.ViewsAdminBackup.renderizarColecoes(colecoes);
            this._atualizarSelecao();
        } catch (err) {
            container.innerHTML = `<p class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">${window.Util.esc(err.message || 'Não foi possível carregar as coleções.')}</p>`;
        } finally { this._inicializando = false; }
        return true;
    },
    _atualizarSelecao() {
        const caixas = Array.from(document.querySelectorAll('.admin-backup-colecao'));
        const selecionadas = caixas.filter(item => item.checked).length;
        const mestre = document.getElementById('admin-backup-selecionar-todas');
        const contador = document.getElementById('admin-backup-contagem');
        const botao = document.getElementById('admin-backup-exportar');
        if (mestre) { mestre.checked = caixas.length > 0 && selecionadas === caixas.length; mestre.indeterminate = selecionadas > 0 && selecionadas < caixas.length; }
        if (contador) contador.textContent = selecionadas ? `${selecionadas} de ${caixas.length} coleção(ões) selecionada(s)` : 'Nenhuma coleção selecionada';
        if (botao && !botao.dataset.exportando) botao.disabled = selecionadas === 0;
    },
    tratarMudancas(event) {
        if (event.target?.id === 'admin-backup-selecionar-todas') {
            document.querySelectorAll('.admin-backup-colecao').forEach(chk => { chk.checked = event.target.checked; });
            this._atualizarSelecao(); return true;
        }
        if (event.target?.classList?.contains('admin-backup-colecao')) { this._atualizarSelecao(); return true; }
        return false;
    },
    async tratarCliques(event) {
        if (!event.target.closest('#admin-backup-exportar')) return false;
        await this.exportar();
        return true;
    },
    _mensagem(texto, tipo = 'info') {
        const el = document.getElementById('admin-backup-status');
        if (!el) return;
        const estilos = { info: 'border-blue-200 bg-blue-50 text-blue-800', sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-800', parcial: 'border-amber-200 bg-amber-50 text-amber-900', erro: 'border-rose-200 bg-rose-50 text-rose-800' };
        el.className = `rounded-xl border px-3 py-3 text-xs leading-relaxed ${estilos[tipo] || estilos.info}`;
        el.textContent = texto;
    },
    _baixar(blob, nome) {
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = nome; link.style.display = 'none'; document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
    },
    async _baixarSeparados(arquivos) {
        for (let i = 0; i < arquivos.length; i++) {
            const arquivo = arquivos[i], tipo = arquivo.nome.endsWith('.csv') ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
            this._baixar(new Blob([arquivo.conteudo], { type: tipo }), arquivo.nome);
            this._mensagem(`ZIP indisponível neste navegador. Baixando arquivo ${i + 1} de ${arquivos.length}: ${arquivo.nome}. Se solicitado, permita vários downloads para este site.`);
            await new Promise(resolve => setTimeout(resolve, 650));
        }
    },
    async exportar() {
        if (!window.ControllerAdminBackup?._isAdmin()) { this._mensagem('Somente Root/Admin podem gerar backups.', 'erro'); return; }
        const botao = document.getElementById('admin-backup-exportar'), formato = document.getElementById('admin-backup-formato')?.value || 'json';
        const colecoes = Array.from(document.querySelectorAll('.admin-backup-colecao:checked')).map(chk => chk.value);
        if (!colecoes.length) { this._mensagem('Selecione ao menos uma coleção para exportar.', 'erro'); return; }
        const criadoEm = new Date().toISOString(), arquivos = [], erros = [];
        if (botao) { botao.disabled = true; botao.dataset.exportando = 'true'; botao.textContent = 'Preparando backup…'; }
        const detalhes = [];
        try {
            for (let i = 0; i < colecoes.length; i++) {
                const nomeColecao = colecoes[i];
                this._mensagem(`Lendo coleção ${i + 1} de ${colecoes.length}: ${nomeColecao}…`);
                try {
                    const registros = await window.ControllerAdminBackup.lerColecao(nomeColecao, p => {
                        const detalhe = `${p.nome}: ${p.registros} documento(s)`;
                        detalhes[i] = detalhe;
                        this._mensagem(`Lendo ${i + 1}/${colecoes.length} · ${detalhe}${p.lote === 500 ? ' (continuando…)' : ''}`);
                    });
                    arquivos.push({ nome: `colecoes/${window.ControllerAdminBackup.nomeArquivo(nomeColecao, formato)}`, conteudo: window.ControllerAdminBackup.conteudoArquivo(nomeColecao, registros, formato, criadoEm) });
                    detalhes[i] = `${nomeColecao}: ${registros.length} documento(s)`;
                } catch (err) {
                    erros.push({ colecao: nomeColecao, erro: String(err.code || err.message || 'Falha de leitura').slice(0, 300) });
                    detalhes[i] = `${nomeColecao}: falha na leitura`;
                }
            }
            if (!arquivos.length) throw new Error(`Nenhuma coleção pôde ser exportada. ${erros.map(item => `${item.colecao}: ${item.erro}`).join(' · ')}`);
            const manifesto = { produto: 'InovaTech', exportado_em: criadoEm, formato, colecoes_selecionadas: colecoes, colecoes_exportadas: arquivos.length, erros };
            const pacote = [...arquivos, { nome: 'manifesto.json', conteudo: JSON.stringify(manifesto, null, 2) }];
            try {
                const zip = window.ControllerAdminBackup._zip(pacote);
                this._baixar(zip, `backup_inovatech_${this._formatarData()}.zip`);
                this._mensagem(`Backup ZIP iniciado: ${arquivos.length} arquivo(s) de coleção em ${formato.toUpperCase()}${erros.length ? `. Exportação parcial; falha em: ${erros.map(x => x.colecao).join(', ')}.` : '.'} ${detalhes.join(' · ')}`, erros.length ? 'parcial' : 'sucesso');
            } catch (zipErr) {
                await this._baixarSeparados(pacote);
                this._mensagem(`Não foi possível montar o ZIP (${zipErr.message || 'erro desconhecido'}). Os downloads individuais foram iniciados; permita vários downloads se o navegador pedir.${erros.length ? ` Coleções com falha: ${erros.map(x => x.colecao).join(', ')}.` : ''}`, erros.length ? 'parcial' : 'sucesso');
            }
        } catch (err) {
            this._mensagem(err.message || 'Não foi possível gerar o backup.', 'erro');
        } finally {
            if (botao?.isConnected) { delete botao.dataset.exportando; botao.disabled = false; botao.innerHTML = '<span aria-hidden="true">↓</span>Gerar e baixar backup (.zip)'; }
            this._atualizarSelecao();
        }
    }
};
