// ./admin/app_admin_solicitacoes.js - Eventos da aba "Solicitações de áreas"
window.AppAdminSolicitacoes = {
    itens: [],

    async iniciarView() {
        if (!document.getElementById('admin-solic-lista')) return;
        await this.carregar();
    },

    async carregar() {
        const lista = document.getElementById('admin-solic-lista');
        if (lista) lista.innerHTML = '<p class="p-6 text-center text-sm text-slate-400">Carregando solicitações…</p>';
        try { this.itens = await window.ControllerAdminSolicitacoes.listar(); this.renderizar(); }
        catch (err) { if (lista) lista.innerHTML = '<p class="p-6 text-center text-sm text-rose-600">Não foi possível carregar as solicitações.</p>'; await window.Dialog.erro(err, 'Erro ao carregar solicitações'); }
    },

    renderizar() {
        const lista = document.getElementById('admin-solic-lista'); if (!lista) return;
        const pendentes = this.itens.filter(s => s.status === 'Pendente').length;
        const badge = document.getElementById('badge-solic-areas');
        if (badge) { badge.textContent = pendentes; badge.classList.toggle('hidden', !pendentes); }
        lista.innerHTML = this.itens.length ? this.itens.map(s => window.ViewsAdminSolicitacoes.cartao(s)).join('')
            : '<div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Nenhuma solicitação de área até o momento.</div>';
    },

    async tratarCliques(e) {
        const aprovar = e.target.closest('.admin-solic-aprovar'), recusar = e.target.closest('.admin-solic-recusar');
        if (!aprovar && !recusar) return false;
        const cartao = e.target.closest('article[data-id]'), solic = this.itens.find(s => s.id === cartao?.dataset.id);
        if (!solic) return true;
        const botoes = cartao.querySelectorAll('button'); botoes.forEach(b => b.disabled = true);
        try {
            if (aprovar) {
                const marcadas = [...cartao.querySelectorAll('.admin-solic-area:checked')].map(c => c.value);
                const aprovadas = await window.ControllerAdminSolicitacoes.aprovar(solic, marcadas);
                window.Util.toast(`Áreas habilitadas para ${solic.nome || solic.email}: ${aprovadas.join(', ')}.`);
            } else {
                await window.ControllerAdminSolicitacoes.recusar(solic, cartao.querySelector('.admin-solic-motivo')?.value);
                window.Util.toast('Solicitação recusada.', { tipo: 'info' });
            }
            await this.carregar();
        } catch (err) { botoes.forEach(b => b.disabled = false); await window.Dialog.erro(err, 'Não foi possível concluir a avaliação'); }
        return true;
    }
};
