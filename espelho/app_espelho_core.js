// Núcleo do Espelho: estado, ciclo de vida, permissões comuns e despacho de eventos.
window.AppEspelho = {
    turmas: [], cursos: [], encontros: [], excecoes: [], docentes: [], salas: [], selecionadas: new Set(), alvosEdicaoLote: new Map(), turmaDistribuicao: null, turmaEdicaoLote: null, docentesLoteIds: new Set(), csvRows: [], editavel: false, pendenciasArraste: new Map(), gruposFiltro: [], docentesPorDia: new Map(), docentesEncontroIds: new Set(), docentesModalDraft: new Set(), docentesModalContext: null, turmaEdicao: null, periodoMapa: 'MANHÃ', filtrosDiasPorPeriodo: new Map(), filtroDiasAberto: false, mesesVisiveis: null, turmaRemocao: null, _filtroOutsideHandler: null, _resizeMapaHandler: null, _resizeMapaTimer: null, _lastMapWidth: 0,
    meses: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
    dias: ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'],
};
// Operações comuns compartilhadas entre mapa e recursos.
Object.assign(window.AppEspelho, {
    _html(s) { return (s ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
    _dataBR(iso) { const [y,m,d] = (iso || '').split('-'); return y ? `${d}/${m}/${y}` : iso; },
    _norm(s) { return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase(); },
    _podeEditar() { return ['root','admin','tecnico','docente'].includes(window.usuarioAtual?.cargo); },
    _podeGerenciarFlags() { return ['root','admin','tecnico','apoio'].includes(window.usuarioAtual?.cargo); },
    _podeGerenciarFlagsLote() { return ['apoio','admin'].includes(window.usuarioAtual?.cargo); },
    async iniciarView() {
        this.editavel = this._podeEditar();
        this.podeGerenciarFlags = this._podeGerenciarFlags();
        this.podeGerenciarFlagsLote = this._podeGerenciarFlagsLote();
        this.alvosEdicaoLote.clear();
        const pane = document.getElementById('espelho-painel');
        try {
            const base = await window.ControllerEspelho.carregarBase();
            this.turmas = base.turmas; this.cursos = base.cursos || []; this.encontros = base.encontros; this.excecoes = base.excecoes; this.docentes = base.docentes; this.salas = base.salas;
            this._sincronizarSelecaoTurmas();
            this._renderizarFiltros(); this._renderizarSalas(); this.renderizarMapa(); this._registrarDragDrop(); this._registrarFechamentoFiltroDias(); this._registrarResizeMapa();
        } catch (err) {
            if (pane) pane.innerHTML = `<div class="m-4 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700">Não foi possível carregar o mapa: ${this._html(err.message)}<br><span class="text-xs">Verifique as regras de leitura das coleções turmas, cursos, usuarios, encontros e datas_excecoes.</span></div>`;
        }
    },
    // Mantém as turmas que o usuário filtrou; turmas novas entram selecionadas. (Antes toda atualização selecionava todas de novo.)
    _sincronizarSelecaoTurmas() {
        const ids=new Set(this.turmas.map(t=>t.id)),conhecidas=this._turmasConhecidas||new Set();
        this.selecionadas=new Set([...this.turmas.map(t=>t.id)].filter(id=>this._turmasConhecidas?(this.selecionadas.has(id)||!conhecidas.has(id)):true));
        this._turmasConhecidas=ids;
    },
    // Atualização vinda do Store (ex.: depois de salvar): refaz o mapa SEM reconstruir a tela, preservando rolagem, filtros e abas.
    async atualizarSuave() {
        if(!document.getElementById('espelho-painel')||this.draggedId)return;
        const base=await window.ControllerEspelho.carregarBase();
        this.turmas=base.turmas;this.cursos=base.cursos||[];this.encontros=base.encontros;this.excecoes=base.excecoes;this.docentes=base.docentes;this.salas=base.salas;
        this._sincronizarSelecaoTurmas();this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();
    },
    _registrarFechamentoFiltroDias() {
        if(this._filtroOutsideHandler)return;
        this._filtroOutsideHandler=e=>{
            if(!this.filtroDiasAberto)return;
            const caminho=e.composedPath?.()||[];
            if(caminho.some(node=>node?.id==='filtro-dias-container')||e.target?.closest?.('#filtro-dias-container'))return;
            setTimeout(()=>{
                if(!this.filtroDiasAberto)return;
                this.filtroDiasAberto=false;
                if(document.getElementById('espelho-painel')){this.renderizarMapa();this._registrarDragDrop();}
            },0);
        };
        document.addEventListener('click',this._filtroOutsideHandler);
    },
    _mostrarStatus(texto, erro=false) { const el=document.getElementById('espelho-status'); if (!el) return; el.textContent=texto; el.className=`mb-2 px-3 py-2 rounded-lg text-sm shrink-0 ${erro?'bg-rose-50 text-rose-700 border border-rose-200':'bg-emerald-50 text-emerald-700 border border-emerald-200'}`; el.classList.remove('hidden'); clearTimeout(this._statusTimer); this._statusTimer=setTimeout(()=>el.classList.add('hidden'),erro?20000:6000); },
    abrirModal(idTurma,data,tipo='aula',encontro=null) {
        const t=this.turmas.find(x=>x.id===idTurma);if(!t)return;this.turmaEdicao=t;
        const modal=document.getElementById('modal-encontro');modal.classList.remove('hidden');modal.classList.add('flex');
        const form=document.getElementById('form-espelho-encontro');form.reset();
        document.getElementById('encontro-id').value=encontro?.id||'';document.getElementById('encontro-turma-id').value=idTurma;document.getElementById('encontro-data').value=data;
        document.getElementById('titulo-modal-encontro').textContent=encontro?'Editar encontro':'Adicionar encontro';document.getElementById('subtitulo-modal-encontro').textContent=`${t.referencia} · ${this._dataBR(data)}`;
        document.getElementById('encontro-tipo').value=encontro?.tipo||tipo;
        const ucEl=document.getElementById('encontro-uc');ucEl.innerHTML='<option value="">Selecione a UC...</option>'+this._ucsOrdenadas(t).map(u=>`<option value="${this._html(u.id_uc_base||u.id)}">${this._html(u.referencia)} — ${this._html(u.titulo)} (${this._html(u.carga_horaria)}h)</option>`).join('');if(encontro?.id_uc)ucEl.value=encontro.id_uc;
        this.docentesEncontroIds=new Set((encontro?.docentes||[]).map(d=>d.id));
        const docentes=this._criarDocentesSelecionados();document.getElementById('encontro-docentes-resumo').textContent=docentes.length?docentes.map(d=>d.nome_completo).join(', '):'Nenhum selecionado';
        const sala=document.getElementById('encontro-sala');sala.innerHTML='<option value="">Sem sala definida</option>'+this.salas.map(x=>`<option value="${this._html(x.id)}">${this._html(x.referencia||x.nome||x.id)} · ${this._html(x.tipo||'')}</option>`).join('');if(encontro?.sala_id)sala.value=encontro.sala_id;
        document.getElementById('encontro-modalidade').value=encontro?.modalidade||'Presencial';document.getElementById('encontro-sala-wrap').classList.toggle('hidden',(encontro?.modalidade||'Presencial')==='Remoto');
        const chTurma=window.ControllerTurmaFrm?.calcularCHEncontro(t.h_inicio,t.h_termino)||Number(t.ch_encontro)||0;
        document.getElementById('encontro-h-inicio').value=encontro?.h_inicio||t.h_inicio||'';document.getElementById('encontro-h-termino').value=encontro?.h_termino||t.h_termino||'';document.getElementById('encontro-ch').value=encontro?.ch_encontro??chTurma;
        document.getElementById('encontro-ss').checked=!!encontro?.SS;document.getElementById('encontro-sgo').checked=!!encontro?.SGO;document.getElementById('encontro-descricao').value=encontro?.descricao||'';this._alternarCamposTipo();this._renderizarProgressoEncontro();
    },
    fecharModal(id) { const m=document.getElementById(id); if(m){m.classList.add('hidden');m.classList.remove('flex');} },
    async tratarCliques(e) {
        const t=e.target;
        if(await this._tratarCliqueRecurso(e))return true;
        if(t.closest('.espelho-alvo-chk'))return true;
        if(t.closest('.btn-editar-lote')){this.abrirEdicaoLote(t.closest('.btn-editar-lote').dataset.idTurma);return true;}
        if(t.closest('.btn-flags-lote')){this.abrirModalFlagsLote(t.closest('.btn-flags-lote').dataset.idTurma);return true;}
        if(t.closest('#btn-confirmar-flags-lote')){await this.aplicarFlagsLote();return true;}
        if(t.closest('.btn-fechar-flags-lote')||t.id==='modal-flags-lote'){this.fecharModal('modal-flags-lote');return true;}
        if(t.closest('.btn-excluir-lote')){await this.excluirSelecaoLote(t.closest('.btn-excluir-lote').dataset.idTurma);return true;}
        if(t.closest('.btn-limpar-selecao-turma')){this.limparSelecaoTurma(t.closest('.btn-limpar-selecao-turma').dataset.idTurma);return true;}
        if(t.closest('.btn-fechar-lote')||t.id==='modal-edicao-lote'){this.fecharModal('modal-edicao-lote');return true;}
        if(t.closest('#btn-configuracoes-turmas')){const modal=document.getElementById('modal-configuracoes-turmas');if(modal){modal.classList.remove('hidden');modal.classList.add('flex');}return true;}
        if(t.closest('.btn-fechar-configuracoes')||t.id==='modal-configuracoes-turmas'){this.fecharModal('modal-configuracoes-turmas');return true;}
        if(t.closest('.btn-periodo-mapa')){this.periodoMapa=t.closest('.btn-periodo-mapa').dataset.periodo;this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('#btn-toggle-filtro-dias')){this.filtroDiasAberto=!this.filtroDiasAberto;this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('#btn-restaurar-filtro-dias')){this.filtrosDiasPorPeriodo.set(this.periodoMapa,new Set(this.periodoMapa==='SÁBADOS'?[6]:[0,1,2,3,4,5]));this.filtroDiasAberto=true;this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('.btn-abrir-modal-remover-uc')){this.abrirModalRemocaoUC(t.closest('.btn-abrir-modal-remover-uc').dataset.idTurma);return true;}
        if(t.closest('#btn-confirmar-remover-uc')){await this.confirmarRemocaoUC();return true;}
        if(t.closest('.btn-fechar-remocao-uc')||t.id==='modal-remover-uc'){this.fecharModal('modal-remover-uc');return true;}
        if(t.closest('#btn-escolher-docentes-encontro')){this.abrirModalDocentes('encontro');return true;}
        if(t.closest('#btn-escolher-docentes-lote')){this.abrirModalDocentes('lote');return true;}
        if(t.closest('.btn-dist-docentes')){this.abrirModalDocentes('dia',t.closest('.btn-dist-docentes').dataset.dia);return true;}
        if(t.closest('.btn-aplicar-docentes-dist')){this.aplicarDocentesModal();return true;}
        if(t.closest('.btn-fechar-docentes')){if(this.docentesModalContext?.contexto==='dia'){const dia=Number(this.docentesModalContext.dia),chk=[...document.querySelectorAll('.dist-dia-chk')].find(x=>Number(x.value)===dia);if(chk)chk.checked=!!this.docentesPorDia.get(dia)?.size;}this.fecharModal('modal-docentes-distribuicao');this.docentesModalContext=null;return true;}
        if(t.closest('#btn-area-marcar-todas')){this.selecionadas=new Set(this.turmas.map(x=>x.id));this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('.btn-area-marcar-todas')){const idx=Number(t.closest('.btn-area-marcar-todas').dataset.areaIndex);const g=this.gruposFiltro[idx];(g?.cursos||[]).flatMap(c=>c.turmas).forEach(x=>this.selecionadas.add(x.id));this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('.btn-descartar-movimentos')){await this._descartarMovimentosTurma(t.closest('.btn-descartar-movimentos').dataset.idTurma);return true;}
        if(t.closest('.btn-salvar-movimentos')){
            const btn=t.closest('.btn-salvar-movimentos'),turmaId=btn.dataset.idTurma;
            const moves=[...this.pendenciasArraste.entries()].filter(([,m])=>m.id_turma===turmaId).map(([id,m])=>({id,...m}));
            if(!moves.length){this._mostrarStatus('Não há alterações pendentes para esta turma.',true);return true;}
            if(btn.dataset.saving==='1')return true;
            btn.dataset.saving='1';btn.disabled=true;btn.textContent='Salvando…';btn.classList.add('opacity-60','cursor-wait');
            try{
                await window.ControllerEspelho.salvarMovimentos(moves,this.turmas,this.excecoes);
                const porId=new Map(moves.map(m=>[m.id,m]));
                this.encontros=this.encontros.map(en=>{const m=porId.get(en.id);if(!m)return en;const mudouData=!!m.data&&m.data!==en.data;return{...en,data:m.data||en.data,SS:mudouData?false:(Object.prototype.hasOwnProperty.call(m,'SS')?m.SS===true:en.SS===true),SGO:mudouData?false:(Object.prototype.hasOwnProperty.call(m,'SGO')?m.SGO===true:en.SGO===true)};});
                moves.forEach(m=>this.pendenciasArraste.delete(m.id));
                for(const [key,alvo] of this.alvosEdicaoLote)if(alvo.id_turma===turmaId)this.alvosEdicaoLote.delete(key);
                this._mostrarStatus(`${moves.length} alteração(ões) salva(s) para a turma.`);
                this.renderizarMapa();this._registrarDragDrop();
            }catch(err){
                this._mostrarStatus(`Não foi possível salvar: ${err?.message||'erro desconhecido'}`,true);
                btn.dataset.saving='0';btn.disabled=false;btn.textContent=`Salvar Alterações (${moves.length})`;btn.classList.remove('opacity-60','cursor-wait');
            }
            return true;
        }
        if(t.closest('.btn-ignorar-excecao')){
            if(!this.editavel) return true;
            const btn = t.closest('.btn-ignorar-excecao');
            try {
                await window.ControllerEspelho.ignorarExcecaoTurma(btn.dataset.idTurma, btn.dataset.data, this.turmas);
                this.renderizarMapa();
                this._registrarDragDrop();
            } catch (err) {
                this._mostrarStatus(err.message, true);
            }
            return true;
        }
        if(t.closest('.btn-add-encontro')){const b=t.closest('.btn-add-encontro');this.abrirModal(b.dataset.idTurma,b.dataset.data);return true;}
        if(t.closest('.btn-add-cancelamento')){const b=t.closest('.btn-add-cancelamento');this.abrirModal(b.dataset.idTurma,b.dataset.data,'cancelamento');return true;}
        if(t.closest('.btn-distribuir-turma')){const id=t.closest('.btn-distribuir-turma').dataset.idTurma;if([...this.pendenciasArraste.values()].some(m=>m.id_turma===id)){this._mostrarStatus('Salve as alterações de arraste antes de iniciar outra distribuição.',true);return true;}this.abrirDistribuicao(id);return true;}
        if(t.closest('.btn-remover-encontro')){const id=t.closest('.btn-remover-encontro').dataset.id;if(this.pendenciasArraste.has(id)){this._mostrarStatus('Salve as alterações de arraste antes de remover este encontro.',true);return true;}const ecard=this.encontros.find(x=>x.id===id);if(ecard&&await window.Dialog.confirmar('Remover este encontro/cancelamento?',{perigo:true,titulo:'Remover encontro',textoConfirmar:'Remover'}))try{await window.ControllerEspelho.excluirEncontro(ecard,this.turmas);await this.iniciarView();}catch(err){this._mostrarStatus(err.message,true);}return true;}
        if(t.closest('.btn-fechar-encontro')){this.fecharModal('modal-encontro');return true;}
        if(t.closest('.btn-fechar-distribuicao')){this.fecharModal('modal-distribuicao');return true;}
        if(t.closest('#btn-baixar-modelo-mapa')){this._baixarCSV();return true;}
        return false;
    },
    async tratarSubmits(e) {
        if(await this._tratarSubmitRecurso(e))return true;
        if(e.target.id==='form-edicao-lote'){e.preventDefault();await this.salvarEdicaoLote(e.target);return true;}
        if(e.target.id==='form-espelho-encontro') {e.preventDefault();const form=e.target,btn=form.querySelector('button[type=submit]');if(btn?.dataset.saving==='1')return true;if(btn){btn.dataset.saving='1';btn.disabled=true;btn.textContent='Salvando…';}try{const id=document.getElementById('encontro-id').value;const docs=this._criarDocentesSelecionados();const tipo=document.getElementById('encontro-tipo').value;if(tipo==='aula'&&!docs.length)throw new Error('Selecione ao menos um docente habilitado para o curso.');const sala=document.getElementById('encontro-sala');const horaInicio=document.getElementById('encontro-h-inicio').value,horaFim=document.getElementById('encontro-h-termino').value,ch=window.ControllerTurmaFrm?.calcularCHEncontro(horaInicio,horaFim)||0;if(tipo!=='cancelamento'&&ch<=0)throw new Error('O horário final deve ser posterior ao horário inicial.');const salaDoc=this.salas.find(s=>s.id===sala.value);const payload={id_turma:document.getElementById('encontro-turma-id').value,data:document.getElementById('encontro-data').value,tipo,id_uc:document.getElementById('encontro-uc').value,docentes:docs,sala_id:sala.value,sala_nome:salaDoc?.referencia||salaDoc?.nome||'',modalidade:document.getElementById('encontro-modalidade').value,h_inicio:horaInicio,h_termino:horaFim,ch_encontro:ch,SS:document.getElementById('encontro-ss').checked,SGO:document.getElementById('encontro-sgo').checked,descricao:document.getElementById('encontro-descricao').value};await window.ControllerEspelho.salvarEncontro(payload,this.turmas,id||null);this.fecharModal('modal-encontro');this._mostrarStatus('Registro salvo.');await this.iniciarView();}catch(err){await window.Dialog.erro(err,'Não foi possível salvar o encontro');}finally{if(btn?.isConnected){btn.dataset.saving='0';btn.disabled=false;btn.textContent='Salvar';}}return true;}
        if(e.target.id==='form-distribuicao'){e.preventDefault();const form=e.target,btn=form.querySelector('button[type=submit]');if(btn?.dataset.saving==='1')return true;if(btn){btn.dataset.saving='1';btn.disabled=true;btn.textContent='Distribuindo…';}try{const id=document.getElementById('distribuicao-turma-id').value;await this._distribuir(id,this.csvRows.length?this.csvRows:null);this.fecharModal('modal-distribuicao');}catch(err){await window.Dialog.erro(err?.message?err:'Falha ao distribuir encontros.','Não foi possível distribuir');}finally{if(btn?.isConnected){btn.dataset.saving='0';btn.disabled=false;btn.textContent='Distribuir encontros';}}return true;}
        return false;
    },
    async tratarMudancas(e) {
        if(e.target.matches('.espelho-alvo-chk')){const a={id_turma:e.target.dataset.idTurma,data:e.target.dataset.data,...(e.target.dataset.id?{id:e.target.dataset.id}:{})},k=`${a.id_turma}|${a.data}|${a.id||''}`;e.target.checked?this.alvosEdicaoLote.set(k,a):this.alvosEdicaoLote.delete(k);this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-filtro-dia-chk')){const set=this._diasVisiveisPeriodo(),dia=Number(e.target.value);e.target.checked?set.add(dia):set.delete(dia);this.filtroDiasAberto=true;this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-filtro-mes-chk')){this._alternarMesFiltro(e.target.dataset.mes,e.target.checked);this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-filtro-ano-chk')){const ano=Number(e.target.dataset.ano);for(let mi=0;mi<12;mi++)this._alternarMesFiltro(`${ano}-${String(mi+1).padStart(2,'0')}`,e.target.checked);this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-flag-encontro')){await this._salvarFlagEncontro(e.target);return true;}
        if(['flags-lote-escopo','flags-lote-uc','flags-lote-ss','flags-lote-sgo'].includes(e.target.id)){this._atualizarResumoFlagsLote();return true;}
        if(e.target.id==='select-remover-uc'){this._atualizarResumoRemocaoUC();return true;}
        if(e.target.id==='dist-uc'){this._renderizarProgressoDistribuicao();return true;}
        if(e.target.matches('.modal-docente-chk')){e.target.checked?this.docentesModalDraft.add(e.target.value):this.docentesModalDraft.delete(e.target.value);if(this.docentesModalContext?.contexto==='dia'){const dia=Number(this.docentesModalContext.dia),chk=[...document.querySelectorAll('.dist-dia-chk')].find(x=>Number(x.value)===dia);if(chk)chk.checked=this.docentesModalDraft.size>0;}return true;}
        if(['dist-h-inicio','dist-h-termino'].includes(e.target.id)){const a=document.getElementById('dist-h-inicio').value,b=document.getElementById('dist-h-termino').value,field=document.getElementById('dist-ch');field.value=a&&b&&b>a?(window.ControllerTurmaFrm?.calcularCHEncontro(a,b)||''):'';const atual=document.getElementById('dist-uc')?.value;this._popularUcsDistribuicao(atual);return true;}
        if(e.target.id==='dist-modalidade'){const remoto=e.target.value==='Remoto',wrap=document.getElementById('dist-sala-wrap'),sala=document.getElementById('dist-sala');wrap.classList.toggle('hidden',remoto);if(remoto)sala.value='';return true;}
        if(e.target.id==='encontro-tipo'){this._alternarCamposTipo();this._renderizarProgressoEncontro();return true;}
        if(e.target.id==='encontro-uc'){this._renderizarProgressoEncontro();return true;}
        if(e.target.id==='lote-uc'){this._renderizarProgressoLote();return true;}
        if(e.target.id==='lote-tipo'){this._alternarCamposTipoLote();this._renderizarProgressoLote();return true;}
        if(e.target.id==='encontro-modalidade'){const remoto=e.target.value==='Remoto';document.getElementById('encontro-sala-wrap')?.classList.toggle('hidden',remoto||document.getElementById('encontro-tipo')?.value==='cancelamento');if(remoto)document.getElementById('encontro-sala').value='';return true;}
        if(e.target.id==='lote-modalidade'){const remoto=e.target.value==='Remoto';document.getElementById('lote-sala-wrap')?.classList.toggle('hidden',remoto||document.getElementById('lote-tipo')?.value==='cancelamento');if(remoto)document.getElementById('lote-sala').value='';return true;}
        if(['encontro-h-inicio','encontro-h-termino'].includes(e.target.id)){const a=document.getElementById('encontro-h-inicio').value,b=document.getElementById('encontro-h-termino').value;if(a&&b&&b>a)document.getElementById('encontro-ch').value=window.ControllerTurmaFrm?.calcularCHEncontro(a,b)||'';this._renderizarProgressoEncontro();return true;}
        if(['lote-h-inicio','lote-h-termino'].includes(e.target.id)){const a=document.getElementById('lote-h-inicio').value,b=document.getElementById('lote-h-termino').value;document.getElementById('lote-ch').value=a&&b&&b>a?(window.ControllerTurmaFrm?.calcularCHEncontro(a,b)||''):'';this._renderizarProgressoLote();return true;}
        if(e.target.id==='lote-modalidade'){const remoto=e.target.value==='Remoto',wrap=document.getElementById('lote-sala-wrap'),sala=document.getElementById('lote-sala');wrap?.classList.toggle('hidden',remoto);if(remoto&&sala)sala.value='';return true;}
        if(e.target.id==='input-csv-mapa'&&e.target.files?.[0]){try{await this._lerCSV(e.target.files[0]);}catch(err){this._mostrarStatus(err.message,true);}return true;}
        if(e.target.matches('.espelho-turma-chk')){e.target.checked?this.selecionadas.add(e.target.value):this.selecionadas.delete(e.target.value);this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-course-chk')){const g=this.gruposFiltro[Number(e.target.dataset.areaIndex)],c=g?.cursos[Number(e.target.dataset.courseIndex)];(c?.turmas||[]).flatMap(c=>c.turmas).forEach(x=>this.selecionadas.add(x.id));this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-area-chk')){const g=this.gruposFiltro[Number(e.target.dataset.areaIndex)];(g?.cursos||[]).flatMap(c=>c.turmas).forEach(t=>e.target.checked?this.selecionadas.add(t.id):this.selecionadas.delete(t.id));this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.id==='espelho-mostrar-todas'){this.selecionadas=e.target.checked?new Set(this.turmas.map(t=>t.id)):new Set();this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        return false;
    }
});
