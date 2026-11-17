// ./apoio/app_apoio_perfil.js - Aba "Informações pessoais": exibição, edição e pedido de outras áreas
Object.assign(window.AppApoio, {
    ROTULOS_CARGO: { root: 'Root', admin: 'Administrador', tecnico: 'Técnico', docente: 'Docente', apoio: 'Apoio Técnico', pendente: 'Pendente' },

    async abrirAbaPerfil() {
        try { await window.ControllerApoioPerfil.recarregarMeuUsuario(); } catch (err) { console.warn('[Apoio] Não foi possível atualizar o cadastro:', err); }
        this.renderizarPerfil();
        try { await window.ControllerApoioPerfil.minhasSolicitacoes(); } catch (err) { console.warn('[Apoio] Solicitações:', err); }
        this.renderizarPerfil();
    },

    renderizarPerfil() {
        const u = window.usuarioAtual || {}, e = window.Util.esc, C = window.ControllerApoioPerfil;
        const linha = (rotulo, valor) => `<div><dt class="text-[11px] font-bold uppercase text-slate-400">${rotulo}</dt><dd class="font-semibold text-slate-800">${e(valor || '—')}</dd></div>`;
        const dados = document.getElementById('apoio-perfil-dados');
        if (dados) dados.innerHTML = linha('Nome', u.nome_completo || `${u.nome || ''} ${u.sobrenome || ''}`.trim()) + linha('E-mail', u.email) + linha('Perfil', this.ROTULOS_CARGO[u.cargo] || u.cargo) + linha('Acesso', C.contaComSenha() ? 'E-mail e senha' : 'Google');
        const areas = Array.isArray(u.areas) ? u.areas.map(a => window.ControllerApoioAlteracoes._valorArea(a)).filter(Boolean) : [];
        const elAreas = document.getElementById('apoio-perfil-areas');
        if (elAreas) elAreas.innerHTML = areas.length ? areas.map(a => `<span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">${e(a)}</span>`).join('') : '<span class="text-sm text-slate-400">Nenhuma área vinculada.</span>';
        const sol = document.getElementById('apoio-perfil-solicitacoes');
        const lista = C._minhasSolicitacoesCache || [];
        const cor = { Pendente: 'bg-amber-100 text-amber-800', Aprovada: 'bg-emerald-100 text-emerald-800', Recusada: 'bg-rose-100 text-rose-800' };
        if (sol) sol.innerHTML = lista.length ? lista.map(s => `<div class="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"><span class="rounded-md px-2 py-0.5 text-[11px] font-extrabold ${cor[s.status] || 'bg-slate-100 text-slate-600'}">${e(s.status)}</span><span class="min-w-0 flex-1 font-semibold text-slate-700">${e((s.areas_solicitadas || []).join(', '))}</span><span class="text-xs text-slate-400">${e(window.Util.dataHoraBR(s.criado_em))}</span>${s.motivo_recusa ? `<span class="w-full text-xs text-rose-700">Motivo: ${e(s.motivo_recusa)}</span>` : ''}</div>`).join('') : '<span class="text-sm text-slate-400">Nenhuma solicitação enviada.</span>';
    },

    abrirModalPerfil() {
        const u = window.usuarioAtual || {}, e = window.Util.esc, C = window.ControllerApoioPerfil, CA = window.ControllerApoioAlteracoes;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
        set('apoio-p-nome', u.nome); set('apoio-p-sobrenome', u.sobrenome); set('apoio-p-email', u.email);
        ['apoio-p-senha-atual', 'apoio-p-senha-nova', 'apoio-p-senha-confirma', 'apoio-p-areas-motivo'].forEach(id => set(id, ''));
        const comSenha = C.contaComSenha();
        document.getElementById('apoio-p-bloco-senha')?.classList.toggle('hidden', !comSenha);
        const campoEmail = document.getElementById('apoio-p-email'); if (campoEmail) campoEmail.disabled = !comSenha;
        document.getElementById('apoio-p-ajuda-email')?.classList.toggle('hidden', !comSenha);
        document.getElementById('apoio-p-aviso-google')?.classList.toggle('hidden', comSenha);
        const jaTem = new Set(CA.areasDoUsuario().map(a => CA._norm(a)));
        const pendentes = new Set((C._minhasSolicitacoesCache || []).filter(s => s.status === 'Pendente').flatMap(s => s.areas_solicitadas || []).map(a => CA._norm(a)));
        const disponiveis = CA.areasDisponiveis().filter(a => !jaTem.has(CA._norm(a)));
        const lista = document.getElementById('apoio-p-areas-lista');
        if (lista) lista.innerHTML = CA.usuarioTemTodasAsAreas() ? '<p class="p-2 text-xs text-slate-500">Você já está habilitado em todas as áreas.</p>'
            : (disponiveis.length ? disponiveis.map(a => `<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50"><input type="checkbox" class="apoio-p-area-chk h-4 w-4 rounded border-slate-300" value="${e(a)}"><span class="min-w-0 flex-1 truncate">${e(a)}</span>${pendentes.has(CA._norm(a)) ? '<span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">solicitada</span>' : ''}</label>`).join('') : '<p class="p-2 text-xs text-slate-500">Não há outras áreas disponíveis.</p>');
        const modal = document.getElementById('modal-apoio-perfil'); modal.classList.remove('hidden'); modal.classList.add('flex');
    },
    fecharModalPerfil() { const m = document.getElementById('modal-apoio-perfil'); m?.classList.add('hidden'); m?.classList.remove('flex'); },

    async _cliquesPerfil(e) {
        const t = e.target;
        if (t.closest('.tab-btn[data-target="tab-apoio-perfil"]')) { this.abrirAbaPerfil(); return false; }   // deixa o código global trocar a aba
        if (t.closest('#apoio-btn-editar-perfil')) { this.abrirModalPerfil(); return true; }
        if (t.closest('.btn-fechar-apoio-perfil') || t.id === 'modal-apoio-perfil') { this.fecharModalPerfil(); return true; }
        return false;
    },

    async _submitsPerfil(e) {
        const C = window.ControllerApoioPerfil, v = id => document.getElementById(id)?.value ?? '';
        if (e.target.id === 'form-apoio-dados') {
            const btn = e.target.querySelector('button[type=submit]'); if (btn?.disabled) return true;
            if (btn) btn.disabled = true;
            try {
                const u = window.usuarioAtual || {}, nome = v('apoio-p-nome').trim(), sobrenome = v('apoio-p-sobrenome').trim();
                const comSenha = C.contaComSenha();
                const querSenha = comSenha && [v('apoio-p-senha-nova'), v('apoio-p-senha-confirma')].some(x => x);
                const novoEmail = comSenha ? v('apoio-p-email').trim().toLowerCase() : '';
                const querEmail = comSenha && novoEmail && novoEmail !== (u.email || '').toLowerCase();
                const mudouNome = nome !== (u.nome || '') || sobrenome !== (u.sobrenome || '');
                if (!mudouNome && !querSenha && !querEmail) { window.Util.toast('Nenhuma alteração para salvar.', { tipo: 'info' }); return true; }
                // Valida o que exige a senha atual ANTES de gravar qualquer coisa.
                if (querEmail && !/^\S+@\S+\.\S+$/.test(novoEmail)) throw new Error('Informe um e-mail válido.');
                if (querEmail && !v('apoio-p-senha-atual')) throw new Error('Informe a senha atual para confirmar a troca de e-mail.');
                if (querSenha) await C.alterarSenha(v('apoio-p-senha-atual'), v('apoio-p-senha-nova'), v('apoio-p-senha-confirma'));
                if (querEmail) await C.alterarEmail(novoEmail, v('apoio-p-senha-atual'));
                if (mudouNome) await C.atualizarNome(nome, sobrenome);
                this.fecharModalPerfil(); this.renderizarPerfil();
                const partes = [mudouNome ? 'Nome atualizado.' : '', querSenha ? 'Senha alterada.' : '',
                    querEmail ? `Enviamos um link de confirmação para ${novoEmail}. O e-mail só muda depois que você clicar no link; depois, entre com o novo e-mail (seus vínculos e designações são mantidos).` : ''].filter(Boolean);
                await window.Dialog.sucesso(partes.join(' '));
            } catch (err) { await window.Dialog.erro(err, 'Não foi possível salvar'); }
            finally { if (btn) btn.disabled = false; }
            return true;
        }
        if (e.target.id === 'form-apoio-areas') {
            const btn = e.target.querySelector('button[type=submit]'); if (btn?.disabled) return true;
            if (btn) btn.disabled = true;
            try {
                const areas = [...document.querySelectorAll('.apoio-p-area-chk:checked')].map(c => c.value);
                await C.solicitarAreas(areas, v('apoio-p-areas-motivo'));
                this.fecharModalPerfil(); this.renderizarPerfil();
                await window.Dialog.sucesso('Solicitação enviada! Um Admin irá avaliar e você acompanha o resultado nesta aba.');
            } catch (err) { await window.Dialog.erro(err, 'Não foi possível enviar a solicitação'); }
            finally { if (btn) btn.disabled = false; }
            return true;
        }
        return false;
    }
});
