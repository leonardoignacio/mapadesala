// Seleção em lote, flags SS/SGO e remoção de encontros por UC.
Object.assign(window.AppEspelho, {
    _atualizarToolbarLote() { const bar=document.getElementById('espelho-lote-toolbar'),n=document.getElementById('espelho-lote-contagem');if(!bar)return;bar.classList.toggle('hidden',!this.editavel||!this.alvosEdicaoLote.size);if(n)n.textContent=this.alvosEdicaoLote.size; },
    abrirEdicaoLote(idTurma) {
        if(!this.editavel||!this.alvosEdicaoLote.size)return;
        if(this.pendenciasArraste.size){this._mostrarStatus('Salve ou descarte as alterações pendentes antes de editar in loco.',true);return;}
        const alvos=[...this.alvosEdicaoLote.values()].filter(a=>!idTurma||a.id_turma===idTurma);if(!alvos.length)return;this.turmaEdicaoLote=alvos[0].id_turma;const primeiro=alvos[0],registro=primeiro.id?this.encontros.find(x=>x.id===primeiro.id):null,turma=this.turmas.find(x=>x.id===primeiro.id_turma);
        const uc=document.getElementById('lote-uc'),sala=document.getElementById('lote-sala');
        uc.innerHTML='<option value="">Selecione a UC...</option>'+this._ucsOrdenadas(turma||{}).map(x=>`<option value="${this._html(x.id_uc_base||x.id)}">${this._html(x.referencia)} — ${this._html(x.titulo)}</option>`).join('');uc.value=registro?.id_uc||'';
        this.docentesLoteIds=new Set((registro?.docentes||[]).map(x=>x.id).filter(Boolean));const nomesDoc=this._criarDocentesSelecionados(this.docentesLoteIds).map(x=>x.nome_completo);document.getElementById('lote-docentes-resumo').textContent=nomesDoc.length?nomesDoc.join(', '):'Nenhum selecionado';
        sala.innerHTML='<option value="">Sem sala definida</option>'+this.salas.map(x=>`<option value="${this._html(x.id)}">${this._html(x.referencia||x.nome||x.id)}</option>`).join('');sala.value=registro?.sala_id||'';
        document.getElementById('lote-h-inicio').value=registro?.h_inicio||turma?.h_inicio||'';document.getElementById('lote-h-termino').value=registro?.h_termino||turma?.h_termino||'';document.getElementById('lote-ch').value=window.ControllerTurmaFrm?.calcularCHEncontro(document.getElementById('lote-h-inicio').value,document.getElementById('lote-h-termino').value)||'';document.getElementById('lote-modalidade').value=registro?.modalidade||'Presencial';document.getElementById('lote-obs').value=registro?.descricao||'';document.getElementById('lote-tipo').value=registro?.tipo||'aula';this._alternarCamposTipoLote();this._renderizarProgressoLote();document.getElementById('lote-subtitulo').textContent=`${alvos.length} alvo(s) selecionado(s); os campos serão aplicados a todos.`;
        const modal=document.getElementById('modal-edicao-lote');modal.classList.remove('hidden');modal.classList.add('flex');
    },
    _alternarCamposTipoLote() { const cancel=document.getElementById('lote-tipo')?.value==='cancelamento';document.getElementById('lote-campos-aula')?.classList.toggle('hidden',cancel);document.getElementById('lote-modalidade-wrap')?.classList.toggle('hidden',cancel);document.getElementById('lote-sala-wrap')?.classList.toggle('hidden',cancel||document.getElementById('lote-modalidade')?.value==='Remoto'); },
    async salvarEdicaoLote(form) {
        const btn=form.querySelector('[type=submit]');if(btn){btn.disabled=true;btn.textContent='Salvando…';}
        try{
            const inicio=document.getElementById('lote-h-inicio').value,fim=document.getElementById('lote-h-termino').value;
            const docentes=this._criarDocentesSelecionados(this.docentesLoteIds),sid=document.getElementById('lote-sala').value,sala=this.salas.find(x=>x.id===sid);
            const payload={tipo:document.getElementById('lote-tipo').value,id_uc:document.getElementById('lote-uc').value,docentes,sala_id:sid,sala_nome:sala?.referencia||sala?.nome||'',modalidade:document.getElementById('lote-modalidade').value,h_inicio:inicio,h_termino:fim,ch_encontro:window.ControllerTurmaFrm?.calcularCHEncontro(inicio,fim)||0,descricao:document.getElementById('lote-obs').value};
            if(payload.tipo!=='cancelamento'&&(!payload.id_uc||!docentes.length||!inicio||!fim||fim<=inicio))throw new Error('Informe UC, selecione ao menos um docente habilitado e preencha um horário válido.');
            const alvos=[...this.alvosEdicaoLote.values()].filter(a=>a.id_turma===this.turmaEdicaoLote);if(!alvos.length)throw new Error('Nenhum encontro ou data permanece selecionado.');
            await window.ControllerEspelho.salvarEdicaoEmLote(alvos,payload,this.turmas);
            this.fecharModal('modal-edicao-lote');alvos.forEach(a=>this.alvosEdicaoLote.delete(`${a.id_turma}|${a.data}|${a.id||''}`));this.turmaEdicaoLote=null;this._mostrarStatus(`Edição aplicada a ${alvos.length} alvo(s).`);await this.iniciarView();
        }catch(err){await window.Dialog.erro(err,'Não foi possível salvar a edição em lote');}
        finally{if(btn){btn.disabled=false;btn.textContent='Aplicar a todos';}}
    },
    async excluirSelecaoLote(idTurma) {
        const alvos=[...this.alvosEdicaoLote.values()].filter(a=>a.id_turma===idTurma),ids=new Set(alvos.filter(a=>a.id).map(a=>a.id)),excluiveis=this.encontros.filter(e=>ids.has(e.id)&&e.tipo!=='cancelamento'&&e.data>this._hojeISO());
        if(!excluiveis.length){this._mostrarStatus('Selecione ao menos um encontro futuro para excluir. Datas vazias, cancelamentos, hoje e passado não podem ser excluídos.',true);return false;}
        if(excluiveis.some(e=>this.pendenciasArraste.has(e.id))){this._mostrarStatus('Salve ou descarte as alterações de arraste antes de excluir.',true);return false;}
        if(!(await window.Dialog.confirmar(`Excluir ${excluiveis.length} encontro(s) selecionado(s) desta turma? Datas passadas, hoje e cancelamentos serão preservados.`,{perigo:true,titulo:'Excluir encontros',textoConfirmar:'Excluir'})))return false;
        const btn=document.querySelector(`.btn-excluir-lote[data-id-turma="${CSS.escape(idTurma)}"]`);if(btn){btn.disabled=true;btn.classList.add('opacity-60','cursor-wait');}
        try{const n=await window.ControllerEspelho.excluirEncontrosSelecionados(excluiveis.map(e=>({id:e.id,id_turma:e.id_turma,data:e.data})),this.turmas);for(const e of excluiveis)this.alvosEdicaoLote.delete(`${e.id_turma}|${e.data}|${e.id}`);this.encontros=this.encontros.filter(e=>!ids.has(e.id));this.renderizarMapa();this._registrarDragDrop();this._mostrarStatus(`${n} encontro(s) selecionado(s) excluído(s).`);return true;}catch(err){this._mostrarStatus(`Não foi possível excluir os encontros selecionados: ${err?.message||'erro desconhecido'}`,true);return false;}finally{if(btn){btn.disabled=false;btn.classList.remove('opacity-60','cursor-wait');}}
    },
    abrirModalFlagsLote(idTurma) {
        if(!this._podeGerenciarFlagsLote()){this._mostrarStatus('Somente Apoio Técnico ou Admin pode aplicar SS/SGO em lote.',true);return;}
        const turma=this.turmas.find(t=>t.id===idTurma),modal=document.getElementById('modal-flags-lote'),escopo=document.getElementById('flags-lote-escopo'),uc=document.getElementById('flags-lote-uc');if(!turma||!modal||!escopo||!uc)return;
        const selecionados=[...this.alvosEdicaoLote.values()].filter(a=>a.id_turma===idTurma&&a.id&&this.encontros.some(e=>e.id===a.id&&e.id_turma===idTurma&&e.tipo!=='cancelamento'));
        const ucs=this._ucsOrdenadas(turma).filter(x=>this._contagemEncontrosUC(turma.id,x.id_uc_base||x.id)>0);
        escopo.innerHTML='<option value="">Selecione os encontros alvo...</option>'+(selecionados.length?`<option value="selecionados">Encontros selecionados (${selecionados.length})</option>`:'')+(ucs.length?'<option value="uc">Todos os encontros de uma UC</option>':'');
        uc.innerHTML=ucs.map(x=>`<option value="${this._html(x.id_uc_base||x.id)}">${this._html(x.referencia)} — ${this._html(x.titulo)}</option>`).join('');
        escopo.value=selecionados.length?'selecionados':(ucs.length?'uc':'');uc.value=ucs[0]?(ucs[0].id_uc_base||ucs[0].id):'';document.getElementById('flags-lote-uc-wrap')?.classList.toggle('hidden',escopo.value!=='uc');
        document.getElementById('flags-lote-ss').value='manter';document.getElementById('flags-lote-sgo').value='manter';
        document.getElementById('subtitulo-modal-flags-lote').textContent=`${turma.referencia} · ${turma.curso_titulo||''}`;this.turmaFlagsLote=turma;
        modal.classList.remove('hidden');modal.classList.add('flex');this._atualizarResumoFlagsLote();
    },
    _alvosFlagsLote() {
        const turma=this.turmaFlagsLote,escopo=document.getElementById('flags-lote-escopo')?.value;if(!turma)return[];
        if(escopo==='selecionados'){const ids=new Set([...this.alvosEdicaoLote.values()].filter(a=>a.id_turma===turma.id&&a.id).map(a=>a.id));return this.encontros.filter(e=>ids.has(e.id)&&e.id_turma===turma.id&&e.tipo!=='cancelamento');}
        if(escopo==='uc'){const idUC=document.getElementById('flags-lote-uc')?.value;return this.encontros.filter(e=>e.id_turma===turma.id&&e.id_uc===idUC&&e.tipo!=='cancelamento');}
        return[];
    },
    _atualizarResumoFlagsLote() {
        const escopo=document.getElementById('flags-lote-escopo')?.value,wrap=document.getElementById('flags-lote-uc-wrap'),ss=document.getElementById('flags-lote-ss')?.value||'manter',sgo=document.getElementById('flags-lote-sgo')?.value||'manter',out=document.getElementById('flags-lote-resumo'),btn=document.getElementById('btn-confirmar-flags-lote');
        wrap?.classList.toggle('hidden',escopo!=='uc');const n=this._alvosFlagsLote().length,acao=ss!=='manter'||sgo!=='manter';
        if(out)out.textContent=!escopo?'Escolha uma UC ou os encontros selecionados.':!n?'Não há encontros disponíveis para esse alvo.':!acao?`${n} encontro(s) alvo(s). Escolha ativar ou desativar SS e/ou SGO.`:`${n} encontro(s) serão atualizados. ${ss!=='manter'?`SS: ${ss}. `:''}${sgo!=='manter'?`SGO: ${sgo}.`:''}`;
        if(btn)btn.disabled=!n||!acao;
    },
    async aplicarFlagsLote() {
        if(!this._podeGerenciarFlagsLote())throw new Error('Somente Apoio Técnico ou Admin pode aplicar SS/SGO em lote.');
        const btn=document.getElementById('btn-confirmar-flags-lote'),escopo=document.getElementById('flags-lote-escopo')?.value,alvos=this._alvosFlagsLote(),ss=document.getElementById('flags-lote-ss')?.value||'manter',sgo=document.getElementById('flags-lote-sgo')?.value||'manter';
        if(!alvos.length||(!escopo)|| (ss==='manter'&&sgo==='manter')){this._atualizarResumoFlagsLote();return false;}
        const flags={};if(ss!=='manter')flags.SS=ss==='ativar';if(sgo!=='manter')flags.SGO=sgo==='ativar';
        if(!(await window.Dialog.confirmar(`Aplicar SS/SGO a ${alvos.length} encontro(s) da turma ${this.turmaFlagsLote?.referencia}?`,{titulo:'Aplicar SS/SGO',textoConfirmar:'Aplicar'})))return false;
        if(btn){btn.disabled=true;btn.textContent='Aplicando…';}
        try{
            const idTurma=this.turmaFlagsLote.id,ids=alvos.map(e=>e.id),atualizados=await window.ControllerEspelho.atualizarFlagsEncontrosLote(idTurma,ids,flags),porId=new Map(atualizados.map(e=>[e.id,e]));
            this.encontros=this.encontros.map(e=>porId.get(e.id)||e);const alterados=new Set(ids);
            for(const [key,a] of this.alvosEdicaoLote)if(a.id_turma===idTurma&&a.id&&alterados.has(a.id))this.alvosEdicaoLote.delete(key);
            this.fecharModal('modal-flags-lote');this.renderizarMapa();this._registrarDragDrop();this._mostrarStatus(atualizados.length?`SS/SGO atualizado(s) em ${atualizados.length} encontro(s).`:'Os encontros já estavam com os valores escolhidos.');return true;
        }catch(err){const out=document.getElementById('flags-lote-resumo');if(out){out.textContent=err?.message||'Não foi possível atualizar SS/SGO.';out.className='rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800';}this._mostrarStatus(err?.message||'Não foi possível atualizar SS/SGO.',true);return false;}
        finally{if(btn&&document.getElementById('modal-flags-lote')?.classList.contains('flex')){btn.disabled=false;btn.textContent='Aplicar alterações';this._atualizarResumoFlagsLote();}}
    },
    // Atalho do cabeçalho: ativa SS e SGO nos encontros selecionados da turma (Admin e Apoio).
    async ativarSsSgoSelecionados(idTurma) {
        if(!this._podeGerenciarFlagsLote()){this._mostrarStatus('Somente Apoio Técnico ou Admin pode aplicar SS/SGO em lote.',true);return false;}
        const turma=this.turmas.find(t=>t.id===idTurma);if(!turma)return false;
        if([...this.pendenciasArraste.values()].some(m=>m.id_turma===idTurma)){this._mostrarStatus('Salve ou descarte as alterações pendentes desta turma antes de aplicar SS/SGO.',true);return false;}
        const ids=new Set([...this.alvosEdicaoLote.values()].filter(a=>a.id_turma===idTurma&&a.id).map(a=>a.id));
        const alvos=this.encontros.filter(e=>ids.has(e.id)&&e.id_turma===idTurma&&e.tipo!=='cancelamento');
        if(!alvos.length){this._mostrarStatus('Selecione ao menos um encontro desta turma.',true);return false;}
        const faltantes=alvos.filter(e=>!(e.SS===true&&e.SGO===true));
        if(!faltantes.length){this._mostrarStatus(`Os ${alvos.length} encontro(s) selecionado(s) já estão com SS e SGO ativos.`);return false;}
        if(!(await window.Dialog.confirmar(`Ativar SS e SGO em ${faltantes.length} encontro(s) selecionado(s) da turma ${turma.referencia}?`,{titulo:'Ativar SS e SGO',textoConfirmar:'Ativar'})))return false;
        try{
            const atualizados=await window.ControllerEspelho.atualizarFlagsEncontrosLote(idTurma,faltantes.map(e=>e.id),{SS:true,SGO:true}),porId=new Map(atualizados.map(e=>[e.id,e]));
            this.encontros=this.encontros.map(e=>porId.get(e.id)||e);
            for(const [key,a] of this.alvosEdicaoLote)if(a.id_turma===idTurma&&a.id&&ids.has(a.id))this.alvosEdicaoLote.delete(key);
            this.renderizarMapa();this._registrarDragDrop();this._mostrarStatus(`SS e SGO ativados em ${atualizados.length} encontro(s).`);return true;
        }catch(err){await window.Dialog.erro(err,'Não foi possível ativar SS e SGO');return false;}
    },
    limparSelecaoTurma(idTurma) {for(const [key,a] of this.alvosEdicaoLote)if(a.id_turma===idTurma)this.alvosEdicaoLote.delete(key);if(this._ancoraSelecao?.idTurma===idTurma)this._ancoraSelecao=null;this.renderizarMapa();this._registrarDragDrop();},
    _atualizarResumoRemocaoUC() {
        const select=document.getElementById('select-remover-uc'),out=document.getElementById('resumo-remocao-uc'),btn=document.getElementById('btn-confirmar-remover-uc');
        const todas=select?.value==='TODAS',uc=(this.turmaRemocao?.ucs||[]).find(x=>(x.id_uc_base||x.id)===select?.value),n=select?.value?this._contagemFuturaUC(this.turmaRemocao?.id,select.value):0;
        if(out)out.textContent=n?`${n} encontro(s) futuro(s) ${todas?'de todas as UCs':`da UC ${uc?.referencia||'selecionada'}`} serão removidos. Datas passadas (e hoje) serão preservadas.`:'Não há encontros futuros para remover. Datas passadas (e hoje) serão preservadas.';
        if(btn)btn.disabled=!n;
    },
    abrirModalRemocaoUC(idTurma) {
        const turma=this.turmas.find(t=>t.id===idTurma);if(!turma)return;
        if([...this.pendenciasArraste.values()].some(m=>m.id_turma===idTurma)){this._mostrarStatus('Salve as alterações pendentes desta turma antes de remover encontros.',true);return;}
        this.turmaRemocao=turma;
        const select=document.getElementById('select-remover-uc');
        document.getElementById('subtitulo-modal-remover-uc').textContent=`${turma.referencia} · ${turma.curso_titulo||''}`;
        const ucs=this._ucsOrdenadas(turma).filter(u=>this._contagemEncontrosUC(turma.id,u.id_uc_base||u.id)>0),futuros=this._contagemFuturaUC(turma.id,'TODAS');
        const opts=ucs.map(u=>{const id=u.id_uc_base||u.id,n=this._contagemFuturaUC(turma.id,id),total=this._contagemEncontrosUC(turma.id,id);return `<option value="${this._html(id)}">${this._html(u.referencia)} — ${this._html(u.titulo)} (${n} futuro(s) de ${total})</option>`;});
        if(futuros)opts.push(`<option value="TODAS">TODAS — remover todos os futuros (${futuros})</option>`);
        select.innerHTML=opts.join('')||'<option value="">Nenhuma UC distribuída</option>';
        const disponivel=ucs.find(u=>this._contagemFuturaUC(turma.id,u.id_uc_base||u.id)>0)||ucs[0];if(disponivel)select.value=disponivel.id_uc_base||disponivel.id;else if(futuros)select.value='TODAS';
        this._atualizarResumoRemocaoUC();const modal=document.getElementById('modal-remover-uc');modal.classList.remove('hidden');modal.classList.add('flex');
    },
    async confirmarRemocaoUC() {
        const turma=this.turmaRemocao,select=document.getElementById('select-remover-uc'),ucId=select?.value,btn=document.getElementById('btn-confirmar-remover-uc');
        if(!turma||!ucId||!this._contagemFuturaUC(turma.id,ucId))return;
        const uc=ucId==='TODAS'?null:(turma.ucs||[]).find(x=>(x.id_uc_base||x.id)===ucId),hoje=this._hojeISO();
        if(btn){btn.disabled=true;btn.textContent='Removendo…';}
        try{const removidos=await window.ControllerEspelho.excluirEncontrosDaUC(turma.id,ucId,this.turmas);this.encontros=this.encontros.filter(x=>!(x.id_turma===turma.id&&x.tipo!=='cancelamento'&&x.data>hoje&&(ucId==='TODAS'||x.id_uc===ucId)));this.fecharModal('modal-remover-uc');this.renderizarMapa();this._registrarDragDrop();this._mostrarStatus(`${removidos} encontro(s) futuro(s) removido(s)${uc?` da UC ${uc.referencia}`:' de todas as UCs'}.`);}
        catch(err){const out=document.getElementById('resumo-remocao-uc');if(out){out.textContent=`Não foi possível remover os encontros: ${err.message}`;out.className='rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800';}this._mostrarStatus(`Não foi possível remover os encontros: ${err.message}`,true);}
        finally{if(btn){btn.disabled=false;btn.textContent='Remover encontros';}}
    },
});
