// ./apoio/app_apoio.js - Núcleo da tela Apoio Técnico: estado, inicialização e despacho de eventos
window.AppApoio = {
    filtros: null,
    itens: [],            // itens carregados (já normalizados)
    carregadoDesde: null, // início da janela carregada (ISO)
    limite: 60,           // cartões exibidos por vez

    _montada() { return !!document.getElementById('apoio-lista'); },

    _estadoInicial() {
        const padrao = window.ControllerApoioAlteracoes.areasPadrao();
        this.filtros = { situacao: 'Pendente', acao: '', tipoData: 'encontro', de: '', ate: '', responsavel: '', areasTodas: padrao.todas, areas: [...padrao.areas] };
        this.itens = []; this.carregadoDesde = null; this.limite = 60;
    },

    async iniciarView() {
        await window.Store.garantirPronto();
        this._estadoInicial();
        this._preencherFiltros();
        this.renderizarPerfil();
        await this.carregarAlteracoes();
    },

    // O Store avisa quando algo muda (ex.: SS/SGO de um encontro): reavalia a lista sem recarregar a tela nem perder a rolagem.
    atualizarSuave() { if (this._montada() && this.itens.length) this.recalcular(); },

    async tratarCliques(e) {
        if (!this._montada()) return false;
        return (await this._cliquesAlteracoes(e)) || (await this._cliquesPerfil(e));
    },
    async tratarMudancas(e) {
        if (!this._montada()) return false;
        return await this._mudancasAlteracoes(e);
    },
    async tratarSubmits(e) {
        if (!this._montada()) return false;
        return await this._submitsPerfil(e);
    }
};
