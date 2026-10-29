// Recursos: gestão de salas/laboratórios e seus eventos de interface.
Object.assign(window.AppEspelho, {
    abrirModalSala(sala=null) {
        const form=document.getElementById('form-sala-aula'),modal=document.getElementById('modal-sala-aula');
        if(!form||!modal)return;
        form.reset();
        document.getElementById('sala-id').value=sala?.id||'';
        document.getElementById('sala-referencia').value=sala?.referencia||sala?.nome||'';
        document.getElementById('sala-tipo').value=sala?.tipo==='Laboratório'?'Laboratório':'Comum';
        document.getElementById('sala-cadeiras').value=sala?.numero_cadeiras??'';
        document.getElementById('sala-obs').value=sala?.observacoes||'';
        document.getElementById('titulo-modal-sala').textContent=sala?'Editar sala / laboratório':'Cadastrar sala / laboratório';
        document.getElementById('subtitulo-modal-sala').textContent=sala?'Atualize os dados deste recurso.':'Informe os dados do recurso.';
        document.getElementById('btn-salvar-sala').textContent=sala?'Salvar alterações':'Cadastrar sala';
        const status=document.getElementById('espelho-status-modal-sala');
        if(status){status.textContent='';status.className='hidden rounded-lg px-3 py-2 text-sm';}
        modal.classList.remove('hidden');modal.classList.add('flex');
    },
    _renderizarSalas() {
        const el=document.getElementById('espelho-lista-salas');if(!el)return;
        if(!this.salas.length){el.innerHTML='<div class="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center"><div class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-7h6v7M9 9h.01M15 9h.01"/></svg></div><p class="text-sm font-semibold text-slate-600">Nenhuma sala cadastrada</p><p class="mt-1 text-xs text-slate-400">Salas e laboratórios cadastrados aparecerão nesta lista.</p></div>';return;}
        const podeGerenciar=['root','admin','tecnico'].includes(window.usuarioAtual?.cargo);
        el.innerHTML=this.salas.map(s=>`<article class="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-4"><div class="flex items-start gap-3"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.tipo==='Laboratório'?'bg-violet-50 text-violet-700':'bg-sky-50 text-sky-700'}"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-7h6v7M9 9h.01M15 9h.01"/></svg></div><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h3 class="break-words text-sm font-extrabold text-slate-800 sm:text-base">${this._html(s.referencia||s.nome||'Sala')}</h3><span class="rounded-full px-2 py-0.5 text-[10px] font-bold ${s.tipo==='Laboratório'?'bg-violet-50 text-violet-700':'bg-sky-50 text-sky-700'}">${this._html(s.tipo||'Comum')}</span></div><div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span class="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM18 8h4m-2-2v4"/></svg>${Number(s.numero_cadeiras)||0} cadeiras</span></div>${s.observacoes?`<p class="mt-2 border-t border-slate-100 pt-2 text-xs leading-relaxed text-slate-600">${this._html(s.observacoes)}</p>`:''}${podeGerenciar?`<div class="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" class="btn-editar-sala inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200" data-id="${this._html(s.id)}" aria-label="Editar sala ${this._html(s.referencia||s.nome||'')}"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/></svg>Editar</button><button type="button" class="btn-excluir-sala inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200" data-id="${this._html(s.id)}" aria-label="Excluir sala ${this._html(s.referencia||s.nome||'')}"><svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>Excluir</button></div>`:''}</div></div></article>`).join('');
    },
    _mostrarStatusRecursos(texto,erro=false) { const el=document.getElementById('espelho-status-recursos');if(!el)return;el.textContent=texto;el.className=`mb-3 rounded-lg border px-3 py-2 text-sm ${erro?'border-rose-200 bg-rose-50 text-rose-700':'border-emerald-200 bg-emerald-50 text-emerald-700'}`;el.classList.remove('hidden');clearTimeout(this._statusSalaTimer);this._statusSalaTimer=setTimeout(()=>el.classList.add('hidden'),7000); },
    async _tratarCliqueRecurso(e) {
        const t=e.target;
        if(t.closest('#btn-nova-sala')){this.abrirModalSala();return true;}
        if(t.closest('.btn-editar-sala')){const id=t.closest('.btn-editar-sala').dataset.id;const sala=this.salas.find(s=>s.id===id);if(!sala){this._mostrarStatus('Esta sala não está mais disponível. Atualize a lista.',true);return true;}this.abrirModalSala(sala);return true;}
        if(t.closest('.btn-excluir-sala')){const id=t.closest('.btn-excluir-sala').dataset.id,sala=this.salas.find(s=>s.id===id);if(!sala)return true;if(!(await window.Dialog.confirmar(`Excluir a sala “${sala.referencia||sala.nome||'Sala'}”? Esta ação não pode ser desfeita.`,{perigo:true,titulo:'Excluir sala',textoConfirmar:'Excluir sala'})))return true;const btn=t.closest('.btn-excluir-sala');if(btn.disabled)return true;btn.disabled=true;btn.textContent='Excluindo…';try{await window.ControllerEspelho.excluirSala(id);this.salas=this.salas.filter(s=>s.id!==id);this._renderizarSalas();this._mostrarStatusRecursos(`Sala “${sala.referencia||sala.nome||'Sala'}” excluída.`);}catch(err){this._mostrarStatusRecursos(err.message||'Não foi possível excluir a sala.',true);btn.disabled=false;btn.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>Excluir';}return true;}
        if(t.closest('.btn-fechar-modal-sala')||t.id==='modal-sala-aula'){this.fecharModal('modal-sala-aula');return true;}
        return false;
    },
    async _tratarSubmitRecurso(e) {
        const t=e.target;
        if(e.target.id==='form-sala-aula'){
            e.preventDefault();const form=e.target,btn=form.querySelector('button[type=submit]'),statusModal=document.getElementById('espelho-status-modal-sala'),status=document.getElementById('espelho-status-recursos');
            if(btn?.dataset.saving==='1')return true;if(btn){btn.dataset.saving='1';btn.disabled=true;btn.textContent='Salvando…';}
            try{
                const salaId=document.getElementById('sala-id').value,dados={referencia:document.getElementById('sala-referencia').value,tipo:document.getElementById('sala-tipo').value,numero_cadeiras:document.getElementById('sala-cadeiras').value,observacoes:document.getElementById('sala-obs').value};
                if(salaId)await window.ControllerEspelho.atualizarSala(salaId,dados);else await window.ControllerEspelho.salvarSala(dados);
                form.reset();this.fecharModal('modal-sala-aula');await this.iniciarView();
                if(status){status.textContent=salaId?'Sala atualizada com sucesso.':'Sala cadastrada com sucesso.';status.className='mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700';}
            }catch(err){if(statusModal){statusModal.textContent=err.message||'Não foi possível cadastrar a sala.';statusModal.className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700';}}
            finally{if(btn?.isConnected){btn.dataset.saving='0';btn.disabled=false;btn.textContent=document.getElementById('sala-id')?.value?'Salvar alterações':'Cadastrar sala';}}
            return true;
        }
        return false;
    }
});
