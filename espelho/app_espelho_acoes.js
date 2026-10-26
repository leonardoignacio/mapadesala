// ./espelho/app_espelho_acoes.js - Modais, Interações e Submits do Espelho de Classe
Object.assign(window.AppEspelho, {

    _contagemEncontrosUC(turmaId,ucId) { return this.encontros.filter(x=>x.id_turma===turmaId&&x.id_uc===ucId&&x.tipo!=='cancelamento').length; },
    _contagemFuturaUC(turmaId,ucId) { const hoje=this._hojeISO();return this.encontros.filter(x=>x.id_turma===turmaId&&x.tipo!=='cancelamento'&&x.data>hoje&&(ucId==='TODAS'||x.id_uc===ucId)).length; },
    _totalEncontrosComCH(uc,turma,ch) { const carga=Number(uc?.carga_horaria)||0;if(!(Number(ch)>0))return 0;return carga>0?Math.ceil(carga/Number(ch)):this._totalEncontros(uc,turma); },
    _ucsPendentes(turma,ch) { return this._ucsOrdenadas(turma).map(uc=>{const id=uc.id_uc_base||uc.id,total=this._totalEncontrosComCH(uc,turma,ch),distribuidos=this.encontros.filter(e=>e.id_turma===turma.id&&e.id_uc===id&&e.tipo!=='cancelamento').length;return{uc,id,total,distribuidos,faltam:Math.max(0,total-distribuidos)};}).filter(x=>x.faltam>0); },
    
    _renderizarProgressoGenerico(turmaId, ucElementId, chElementId, outElementId) {
        const out = document.getElementById(outElementId);
        const turma = this.turmas.find(t => t.id === turmaId);
        if (!out || !turma) return;
        const ch = Number(document.getElementById(chElementId)?.value) || 0;
        const value = document.getElementById(ucElementId)?.value || '';
        const ucs = value === 'TODAS' ? this._ucsOrdenadas(turma) : this._ucsOrdenadas(turma).filter(u => (u.id_uc_base || u.id) === value);
        
        if (!value || !ucs.length) {
            out.innerHTML = '<p class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">Selecione uma UC para consultar o andamento e preenchimento.</p>';
            return;
        }
        let total = 0, distribuidos = 0;
        for (const uc of ucs) {
            const id = uc.id_uc_base || uc.id;
            total += this._totalEncontrosComCH(uc, turma, ch);
            distribuidos += this.encontros.filter(e => e.id_turma === turma.id && e.id_uc === id && e.tipo !== 'cancelamento').length;
        }
        const feitos = Math.min(total, distribuidos), faltam = Math.max(0, total - feitos), pct = total ? Math.round(feitos / total * 100) : 0, pctFalta = total ? 100 - pct : 0;
        const bars = [['Total previsto', total ? 100 : 0, `${total} encontro(s)`, 'bg-slate-400'], ['Já distribuídos', pct, `${feitos} de ${total} (${pct}%)`, 'bg-emerald-500'], ['Faltam distribuir', pctFalta, `${faltam} de ${total} (${pctFalta}%)`, 'bg-indigo-500']];
        out.innerHTML = bars.map(([label, p, text, color]) => `<div><div class="mb-1 flex justify-between gap-2 text-[11px]"><span class="font-semibold text-slate-600">${label}</span><span class="text-slate-500">${text}</span></div><div class="h-2 overflow-hidden rounded-full bg-slate-200"><div class="h-full ${color} transition-all duration-300" style="width:${p}%"></div></div></div>`).join('');
    },

    _popularUcsDistribuicao(preferida=null) {
        const turma=this.turmaDistribuicao,select=document.getElementById('dist-uc');if(!turma||!select)return;
        const ch=Number(document.getElementById('dist-ch')?.value)||0,pendentes=this._ucsPendentes(turma,ch);
        const opts=pendentes.map(x=>`<option value="${this._html(x.id)}">${this._html(x.uc.referencia)} — ${this._html(x.uc.titulo)} (${x.faltam} pendente(s))</option>`);
        opts.push(`<option value="TODAS" ${pendentes.length?'':'disabled'}>TODAS — distribuir todas as UCs pendentes</option>`);
        if(!pendentes.length)opts.unshift('<option value="" disabled selected>Nenhuma UC pendente de distribuição</option>');
        select.innerHTML=opts.join('');
        select.value=preferida==='TODAS'&&pendentes.length?'TODAS':(pendentes.some(x=>x.id===preferida)?preferida:(pendentes[0]?.id||''));
        select.onchange=()=>this._renderizarProgressoGenerico(turma.id, 'dist-uc', 'dist-ch', 'dist-progresso');
        this._renderizarProgressoGenerico(turma.id, 'dist-uc', 'dist-ch', 'dist-progresso');
    },

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
        document.getElementById('encontro-ss').value=encontro?.SS?'true':'false';document.getElementById('encontro-sgo').value=encontro?.SGO?'true':'false';document.getElementById('encontro-descricao').value=encontro?.descricao||'';this._alternarCamposTipo();
        
        ucEl.onchange = () => this._renderizarProgressoGenerico(idTurma, 'encontro-uc', 'encontro-ch', 'encontro-progresso');
        document.getElementById('encontro-ch').oninput = () => this._renderizarProgressoGenerico(idTurma, 'encontro-uc', 'encontro-ch', 'encontro-progresso');
        this._renderizarProgressoGenerico(idTurma, 'encontro-uc', 'encontro-ch', 'encontro-progresso');
    },

    _alternarCamposTipo() { 
        const cancel=document.getElementById('encontro-tipo')?.value==='cancelamento';
        const modalidade=document.getElementById('encontro-modalidade-wrap'),sala=document.getElementById('encontro-sala-wrap');
        document.getElementById('campos-encontro-aula')?.classList.toggle('hidden',cancel);
        modalidade?.classList.toggle('hidden',cancel);
        sala?.classList.toggle('hidden',cancel||document.getElementById('encontro-modalidade')?.value==='Remoto');
        document.getElementById('encontro-uc')?.toggleAttribute('required',!cancel);
        ['encontro-h-inicio','encontro-h-termino','encontro-ch'].forEach(id=>document.getElementById(id)?.toggleAttribute('required',!cancel)); 
    },
    
    fecharModal(id) { const m=document.getElementById(id); if(m){m.classList.add('hidden');m.classList.remove('flex');} },

    abrirDistribuicao(idTurma) {
        const t=this.turmas.find(x=>x.id===idTurma); if(!t)return;
        this.turmaDistribuicao=t;this.csvRows=[];this.docentesPorDia=new Map();
        const hid=document.getElementById('distribuicao-turma-id');if(hid)hid.value=t.id;
        document.getElementById('subtitulo-distribuicao').textContent=`${t.referencia} · ${t.curso_titulo||''} · ${t.d_inicio?this._dataBR(t.d_inicio):''} a ${t.d_termino?this._dataBR(t.d_termino):''}`;
        const hIni=document.getElementById('dist-h-inicio'),hFim=document.getElementById('dist-h-termino');
        if(hIni)hIni.value=t.h_inicio||'';if(hFim)hFim.value=t.h_termino||'';
        const ch=window.ControllerTurmaFrm?.calcularCHEncontro(t.h_inicio,t.h_termino)||Number(t.ch_encontro)||'';
        document.getElementById('dist-ch').value=ch;
        this._popularUcsDistribuicao();
        document.getElementById('dist-modalidade').value='Presencial';
        const sala=document.getElementById('dist-sala');sala.innerHTML='<option value="">Sem sala</option>'+this.salas.map(x=>`<option value="${this._html(x.id)}">${this._html(x.referencia||x.nome||x.id)} · ${this._html(x.tipo||'')}</option>`).join('');
        sala.value=t.sala_id||'';document.getElementById('dist-obs').value='';document.getElementById('dist-sala-wrap').classList.remove('hidden');sala.disabled=false;
        const map={'Seg':1,'Ter':2,'Qua':3,'Qui':4,'Sex':5,'Sáb':6,'Sab':6,'Dom':0};
        document.getElementById('distribuicao-dias').innerHTML=(t.dias_semana||['Seg','Ter','Qua','Qui','Sex','Sáb']).map(d=>{
            const n=map[d]??map[d.slice(0,3)];
            return `<fieldset class="rounded-xl border border-slate-200 bg-slate-50 p-3" data-dist-row="${n}"><legend class="px-1"><label class="flex items-center gap-2 text-sm font-bold"><input class="dist-dia-chk rounded text-blue-600" type="checkbox" value="${n}"> ${this._html(d)}</label></legend><div class="flex flex-col sm:flex-row sm:items-center gap-2"><button type="button" class="btn-dist-docentes shrink-0 px-3 py-2 rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 text-sm font-semibold" data-dia="${n}">Selecionar docentes</button><span class="dist-docentes-resumo text-xs text-slate-500" data-dia="${n}">Nenhum docente selecionado</span></div></fieldset>`;
        }).join('');
        const f=document.getElementById('input-csv-mapa');if(f)f.value='';document.getElementById('csv-mapa-nome').textContent='';
        const modal=document.getElementById('modal-distribuicao');modal.classList.remove('hidden');modal.classList.add('flex');
    },

    abrirModalDocentes(contexto,dia=null) {
        const turma=contexto==='encontro'?this.turmaEdicao:(contexto==='lote'?this.turmas.find(t=>t.id===this.turmaEdicaoLote):this.turmaDistribuicao);if(!turma)return;
        this.docentesModalContext={contexto,dia};
        const selecionados=contexto==='encontro'?this.docentesEncontroIds:(contexto==='lote'?this.docentesLoteIds:(this.docentesPorDia.get(Number(dia))||new Set()));
        this.docentesModalDraft=new Set(selecionados);
        document.getElementById('subtitulo-modal-docentes').textContent=contexto==='encontro'?'Encontro atual':(contexto==='lote'?'Encontros selecionados':`${this.dias[Number(dia)]||'Dia'} · Distribuição in loco`);
        const lista=this._docentesDaTurma(turma);
        document.getElementById('lista-docentes-distribuicao').innerHTML=lista.length?lista.map(d=>`<label class="flex items-center gap-3 rounded-lg p-2 hover:bg-blue-50 cursor-pointer"><input type="checkbox" class="modal-docente-chk w-4 h-4 rounded text-blue-600" value="${this._html(d.id)}" ${this.docentesModalDraft.has(d.id)?'checked':''}><span class="text-sm text-slate-700">${this._html(d.nome_completo||`${d.nome||''} ${d.sobrenome||''}`.trim()||d.email)}</span><span class="ml-auto text-xs text-slate-400">${this._html(d.email||'')}</span></label>`).join(''):'<p class="p-3 text-sm text-amber-700 bg-amber-50 rounded-lg">Nenhum usuário com cargo principal Docente, ativo e habilitado para a área deste curso.</p>';
        const modal=document.getElementById('modal-docentes-distribuicao');modal.classList.remove('hidden');modal.classList.add('flex');
    },

    aplicarDocentesModal() {
        if(!this.docentesModalContext)return;
        const ids=new Set([...document.querySelectorAll('.modal-docente-chk:checked')].map(x=>x.value));
        const {contexto,dia}=this.docentesModalContext;
        if(contexto==='encontro'){
            this.docentesEncontroIds=ids;
            const nomes=[...ids].map(id=>this.docentes.find(d=>d.id===id)?.nome_completo).filter(Boolean);
            document.getElementById('encontro-docentes-resumo').textContent=nomes.length?nomes.join(', '):'Nenhum selecionado';
        }else if(contexto==='lote'){
            this.docentesLoteIds=ids;const nomes=[...ids].map(id=>this.docentes.find(d=>d.id===id)).filter(Boolean).map(d=>d.nome_completo||`${d.nome||''} ${d.sobrenome||''}`.trim()||d.email);const resumo=document.getElementById('lote-docentes-resumo');if(resumo)resumo.textContent=nomes.length?nomes.join(', '):'Nenhum selecionado';
        }else{
            this.docentesPorDia.set(Number(dia),ids);
            const diaChk=[...document.querySelectorAll('.dist-dia-chk')].find(x=>Number(x.value)===Number(dia));if(diaChk)diaChk.checked=ids.size>0;
            const nomes=[...ids].map(id=>{const d=this.docentes.find(x=>x.id===id);return d?.nome_completo||`${d?.nome||''} ${d?.sobrenome||''}`.trim()||d?.email;}).filter(Boolean);
            const resumo=[...document.querySelectorAll('.dist-docentes-resumo')].find(el=>el.dataset.dia===String(dia));if(resumo)resumo.textContent=nomes.length?nomes.join(' · '):'Nenhum docente selecionado';
        }
        this.fecharModal('modal-docentes-distribuicao');this.docentesModalContext=null;
    },

    _criarDocentesSelecionados(ids=this.docentesEncontroIds) {
        return [...ids].map(id=>{const d=this.docentes.find(x=>x.id===id);return d?{id:d.id,email:d.email,nome_completo:d.nome_completo||`${d.nome||''} ${d.sobrenome||''}`.trim()}:null;}).filter(Boolean);
    },

    async _distribuir(turmaId,plano=null) {
        const turma=this.turmas.find(t=>t.id===turmaId);if(!turma)throw new Error('Turma não encontrada.');
        const inicio=document.getElementById('dist-h-inicio').value,termino=document.getElementById('dist-h-termino').value;
        const ch=window.ControllerTurmaFrm?.calcularCHEncontro(inicio,termino)||0;
        if(!inicio||!termino||termino<=inicio||ch<=0)throw new Error('Informe horários válidos; o término deve ser posterior ao início.');
        const modalidade=document.getElementById('dist-modalidade').value||'Presencial',salaId=modalidade==='Remoto'?'':document.getElementById('dist-sala').value;
        const sala=this.salas.find(x=>x.id===salaId),descricao=document.getElementById('dist-obs').value.trim();
        const mapaE=this._mapaEncontros(),mapaX=this._mapaExcecoes();
        const diasSelecionados=new Set([...document.querySelectorAll('.dist-dia-chk:checked')].map(x=>Number(x.value)));
        const ucValue=document.getElementById('dist-uc')?.value||'';if(!ucValue)throw new Error('Não há UCs pendentes para distribuir.');
        const start=new Date(`${turma.d_inicio}T12:00:00`),end=new Date(`${turma.d_termino}T12:00:00`);if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))throw new Error('A turma precisa ter período de início e término válidos.');
        const ignoradas = Array.isArray(turma.excecoes_ignoradas) ? turma.excecoes_ignoradas : [];
        const dataPool=[];for(const d=new Date(start);d<=end;d.setDate(d.getDate()+1)){const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const excAtiva=mapaX.has(iso)&&!ignoradas.includes(iso);if(!mapaE.has(`${turma.id}|${iso}`)&&!excAtiva&&diasSelecionados.has(d.getDay()))dataPool.push({iso,dow:d.getDay()});}
        const todasUcs=this._ucsOrdenadas(turma),ucs=ucValue==='TODAS'?todasUcs:todasUcs.filter(u=>(u.id_uc_base||u.id)===ucValue),registros=[],totalEncontros=uc=>Number(uc.carga_horaria)>0?Math.ceil(Number(uc.carga_horaria)/ch):this._totalEncontros(uc,turma);
        const docentesPara=(dia,row=null)=>{
            const ids=row?.docentes?.length?row.docentes.map(email=>this._docentesDaTurma(turma).find(d=>this._norm(d.email)===this._norm(email))?.id).filter(Boolean):[...(this.docentesPorDia.get(Number(dia))||[])];
            const docs=this._criarDocentesSelecionados(new Set(ids));if(!docs.length)throw new Error(`Selecione ao menos um docente habilitado para ${this.dias[Number(dia)]||'a linha do CSV'}.`);return docs;
        };
        if(plano){
            for(const row of plano){
                if(!/^\d{4}-\d{2}-\d{2}$/.test(row.data))throw new Error(`Data inválida no CSV: ${row.data}`);
                if((turma.d_inicio&&row.data<turma.d_inicio)||(turma.d_termino&&row.data>turma.d_termino))throw new Error(`A data ${row.data} está fora do período da turma.`);
                if(!diasSelecionados.has(new Date(`${row.data}T12:00:00`).getDay()))throw new Error(`A data ${row.data} não corresponde a um dia da semana selecionado.`);
                if(registros.some(r=>r.data===row.data))throw new Error(`O CSV contém mais de um encontro para ${row.data}; distribua no máximo um encontro por turma/dia.`);
                const excAtivaRow = mapaX.has(row.data) && !ignoradas.includes(row.data);
                if(mapaE.has(`${turma.id}|${row.data}`)||excAtivaRow)continue;
                const uc=ucs.find(u=>this._norm(u.referencia)===this._norm(row.uc_referencia));if(!uc){if(ucValue!=='TODAS')throw new Error(`A UC ${row.uc_referencia} não corresponde à UC selecionada.`);continue;}
                const usados=this.encontros.filter(e=>e.id_turma===turma.id&&e.id_uc===(uc.id_uc_base||uc.id)&&e.tipo!=='cancelamento').length+registros.filter(e=>e.id_uc===(uc.id_uc_base||uc.id)).length;if(usados>=totalEncontros(uc))continue;
                const day=new Date(`${row.data}T12:00:00`).getDay(),docs=docentesPara(day,row),rowSala=this.salas.find(s=>this._norm(s.referencia||s.nome)===this._norm(row.sala));
                registros.push({id_turma:turma.id,data:row.data,tipo:'aula',id_uc:uc.id_uc_base||uc.id,uc_referencia:uc.referencia,docentes:docs,h_inicio:inicio,h_termino:termino,ch_encontro:ch,modalidade,sala_id:salaId,sala_nome:sala?.referencia||sala?.nome||'',descricao:descricao||row.observacoes||''});
            }
        }else{
            const regras=new Map();document.querySelectorAll('.dist-dia-chk:checked').forEach(chk=>{const ids=this.docentesPorDia.get(Number(chk.value))||new Set();if(!ids.size)throw new Error(`Selecione ao menos um docente para ${this.dias[Number(chk.value)]}.`);regras.set(Number(chk.value),this._criarDocentesSelecionados(ids));});
            if(!regras.size)throw new Error('Selecione ao menos um dia da semana.');
            for(const uc of ucs){let pend=Math.max(0,totalEncontros(uc)-this.encontros.filter(e=>e.id_turma===turma.id&&e.id_uc===(uc.id_uc_base||uc.id)&&e.tipo!=='cancelamento').length);if(!pend)continue;
                for(const slot of dataPool){if(!pend)break;if(registros.some(r=>r.data===slot.iso))continue;const docentes=regras.get(slot.dow);if(!docentes)continue;registros.push({id_turma:turma.id,data:slot.iso,tipo:'aula',id_uc:uc.id_uc_base||uc.id,uc_referencia:uc.referencia,docentes,h_inicio:inicio,h_termino:termino,ch_encontro:ch,modalidade,sala_id:salaId,sala_nome:sala?.referencia||sala?.nome||'',descricao});pend--;}
            }
        }
        if(!registros.length)throw new Error('Não há encontros pendentes ou lacunas compatíveis para distribuir.');
        await window.ControllerEspelho.salvarEncontrosLote(registros,this.turmas);
        this._mostrarStatus(`${registros.length} encontro(s) distribuído(s).`);await this.iniciarView();
    },

    _baixarCSV() { const csv='data;referencia_uc;docentes_email\n2026-03-02;UC-01;docente@escola.org\n';const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='modelo-distribuicao-encontros.csv';a.click();URL.revokeObjectURL(a.href); },
    
    async _lerCSV(file) { const text=await file.text();const lines=text.replace(/^\ufeff/,'').split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)throw new Error('O CSV não contém linhas de dados.');const sep=lines[0].includes(';')?';':',';const hdr=lines.shift().split(sep).map(x=>this._norm(x.trim()));const ix={data:hdr.indexOf('data'),uc:hdr.indexOf('referencia_uc'),doc:hdr.indexOf('docentes_email'),sala:hdr.indexOf('sala'),obs:hdr.indexOf('observacoes')};if(ix.data<0||ix.uc<0)throw new Error('O cabeçalho deve conter data e referencia_uc.');this.csvRows=lines.map(l=>{const c=l.split(sep).map(x=>x.trim());return{data:c[ix.data],uc_referencia:c[ix.uc],docentes:ix.doc>=0&&c[ix.doc]?c[ix.doc].split(/[|,]/).map(x=>x.trim()).filter(Boolean):[],sala:ix.sala>=0?c[ix.sala]:'',observacoes:ix.obs>=0?c[ix.obs]:''};}).filter(r=>r.data&&r.uc_referencia);document.getElementById('csv-mapa-nome').textContent=`${this.csvRows.length} linha(s) carregada(s)`;},

    _atualizarToolbarLote() { const bar=document.getElementById('espelho-lote-toolbar'),n=document.getElementById('espelho-lote-contagem');if(!bar)return;bar.classList.toggle('hidden',!this.editavel||!this.alvosEdicaoLote.size);if(n)n.textContent=this.alvosEdicaoLote.size; },
    
    abrirEdicaoLote(idTurma) {
        if(!this.editavel||!this.alvosEdicaoLote.size)return;
        if(this.pendenciasArraste.size){this._mostrarStatus('Salve ou descarte as alterações pendentes antes de editar in loco.',true);return;}
        const alvos=[...this.alvosEdicaoLote.values()].filter(a=>!idTurma||a.id_turma===idTurma);if(!alvos.length)return;this.turmaEdicaoLote=alvos[0].id_turma;const primeiro=alvos[0],registro=primeiro.id?this.encontros.find(x=>x.id===primeiro.id):null,turma=this.turmas.find(x=>x.id===primeiro.id_turma);
        const uc=document.getElementById('lote-uc'),sala=document.getElementById('lote-sala');
        uc.innerHTML='<option value="">Selecione a UC...</option>'+this._ucsOrdenadas(turma||{}).map(x=>`<option value="${this._html(x.id_uc_base||x.id)}">${this._html(x.referencia)} — ${this._html(x.titulo)}</option>`).join('');uc.value=registro?.id_uc||'';
        this.docentesLoteIds=new Set((registro?.docentes||[]).map(x=>x.id).filter(Boolean));const nomesDoc=this._criarDocentesSelecionados(this.docentesLoteIds).map(x=>x.nome_completo);document.getElementById('lote-docentes-resumo').textContent=nomesDoc.length?nomesDoc.join(', '):'Nenhum selecionado';
        sala.innerHTML='<option value="">Sem sala definida</option>'+this.salas.map(x=>`<option value="${this._html(x.id)}">${this._html(x.referencia||x.nome||x.id)}</option>`).join('');sala.value=registro?.sala_id||'';
        document.getElementById('lote-h-inicio').value=registro?.h_inicio||turma?.h_inicio||'';document.getElementById('lote-h-termino').value=registro?.h_termino||turma?.h_termino||'';document.getElementById('lote-ch').value=window.ControllerTurmaFrm?.calcularCHEncontro(document.getElementById('lote-h-inicio').value,document.getElementById('lote-h-termino').value)||'';document.getElementById('lote-modalidade').value=registro?.modalidade||'Presencial';document.getElementById('lote-obs').value=registro?.descricao||'';document.getElementById('lote-tipo').value=registro?.tipo||'aula';this._alternarCamposTipoLote();document.getElementById('lote-subtitulo').textContent=`${alvos.length} alvo(s) selecionado(s); os campos serão aplicados a todos.`;
        
        uc.onchange = () => this._renderizarProgressoGenerico(this.turmaEdicaoLote, 'lote-uc', 'lote-ch', 'lote-progresso');
        document.getElementById('lote-ch').oninput = () => this._renderizarProgressoGenerico(this.turmaEdicaoLote, 'lote-uc', 'lote-ch', 'lote-progresso');
        this._renderizarProgressoGenerico(this.turmaEdicaoLote, 'lote-uc', 'lote-ch', 'lote-progresso');

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
            this.alvosEdicaoLote.clear();this.turmaEdicaoLote=null;this.fecharModal('modal-edicao-lote');this._mostrarStatus(`Edição aplicada a ${alvos.length} alvo(s).`);await this.iniciarView();
        }catch(err){this.fecharModal('modal-edicao-lote');this._mostrarStatus(`Não foi possível salvar a edição em lote: ${err?.message||'erro desconhecido'}`,true);}
        finally{if(btn){btn.disabled=false;btn.textContent='Aplicar a todos';}}
    },

    async excluirSelecaoLote(idTurma) {
        const alvos=[...this.alvosEdicaoLote.values()].filter(a=>a.id_turma===idTurma),ids=new Set(alvos.filter(a=>a.id).map(a=>a.id)),excluiveis=this.encontros.filter(e=>ids.has(e.id)&&e.tipo!=='cancelamento'&&e.data>this._hojeISO());
        if(!excluiveis.length){this._mostrarStatus('Selecione ao menos um encontro futuro para excluir. Datas vazias, cancelamentos, hoje e passado não podem ser excluídos.',true);return false;}
        if(excluiveis.some(e=>this.pendenciasArraste.has(e.id))){this._mostrarStatus('Salve ou descarte as alterações de arraste antes de excluir.',true);return false;}
        if(typeof confirm==='function'&&!confirm(`Excluir ${excluiveis.length} encontro(s) selecionado(s) desta turma? Datas passadas, hoje e cancelamentos serão preservados.`))return false;
        const btn=document.querySelector(`.btn-excluir-lote[data-id-turma="${CSS.escape(idTurma)}"]`);if(btn){btn.disabled=true;btn.classList.add('opacity-60','cursor-wait');}
        try{const n=await window.ControllerEspelho.excluirEncontrosSelecionados(excluiveis.map(e=>({id:e.id,id_turma:e.id_turma,data:e.data})),this.turmas);for(const e of excluiveis)this.alvosEdicaoLote.delete(`${e.id_turma}|${e.data}|${e.id}`);this.encontros=this.encontros.filter(e=>!ids.has(e.id));this.renderizarMapa();this._registrarDragDrop();this._mostrarStatus(`${n} encontro(s) selecionado(s) excluído(s).`);return true;}catch(err){this._mostrarStatus(`Não foi possível excluir os encontros selecionados: ${err?.message||'erro desconhecido'}`,true);return false;}finally{if(btn){btn.disabled=false;btn.classList.remove('opacity-60','cursor-wait');}}
    },

    limparSelecaoTurma(idTurma) {
        for(const [key,a] of this.alvosEdicaoLote)if(a.id_turma===idTurma)this.alvosEdicaoLote.delete(key);this.renderizarMapa();this._registrarDragDrop();
    },

    abrirModalFlags(idTurma) {
        const turma = this.turmas.find(t => t.id === idTurma);
        if (!turma) return;
        const alvos = [...this.alvosEdicaoLote.values()].filter(a => a.id_turma === idTurma);
        
        document.getElementById('flags-turma-id').value = idTurma;
        document.getElementById('subtitulo-modal-flags').textContent = alvos.length ? `Aplicar a ${alvos.length} encontro(s) selecionado(s).` : `Aplicar a todos os encontros futuros de uma UC.`;
        
        const ucWrap = document.getElementById('flags-uc-wrap');
        if (alvos.length) {
            ucWrap.classList.add('hidden');
        } else {
            ucWrap.classList.remove('hidden');
            const ucs = this._ucsOrdenadas(turma);
            document.getElementById('flags-uc').innerHTML = '<option value="TODAS">Todas as UCs</option>' + ucs.map(u => `<option value="${this._html(u.id_uc_base||u.id)}">${this._html(u.referencia)} — ${this._html(u.titulo)}</option>`).join('');
        }
        const modal = document.getElementById('modal-flags-lote');
        modal.classList.remove('hidden'); modal.classList.add('flex');
    },

    async salvarFlagsLote(form) {
        const btn = form.querySelector('[type=submit]');
        if (btn) { btn.disabled = true; btn.textContent = 'Aplicando...'; }
        try {
            const idTurma = document.getElementById('flags-turma-id').value;
            const acao = document.getElementById('flags-acao').value;
            const alvos = [...this.alvosEdicaoLote.values()].filter(a => a.id_turma === idTurma);
            const ucId = alvos.length ? null : document.getElementById('flags-uc').value;
            
            const count = await window.ControllerEspelho.atualizarFlagsLote(idTurma, ucId, alvos, acao, this.turmas);
            
            this.alvosEdicaoLote.clear();
            this.fecharModal('modal-flags-lote');
            this._mostrarStatus(`${count} encontro(s) atualizado(s) com sucesso.`);
            await this.iniciarView();
        } catch (err) {
            this._mostrarStatus(err.message, true);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Aplicar'; }
        }
    },

    async _salvarFlagEncontro(input) {
        const encontro=this.encontros.find(x=>x.id===input.dataset.id);if(!encontro)return false;
        const flag=input.dataset.flag;if(!['SS','SGO'].includes(flag))return false;
        if(!this.podeGerenciarFlags){input.checked=!!encontro[flag];return false;}
        const atual=this.pendenciasArraste.get(encontro.id)||{id_turma:encontro.id_turma,data:encontro.data,SS:encontro.SS===true,SGO:encontro.SGO===true};
        if(atual.data!==encontro.data){input.checked=false;atual.SS=false;atual.SGO=false;this.pendenciasArraste.set(encontro.id,atual);this.renderizarMapa();this._registrarDragDrop();this._mostrarStatus('Ao mover um encontro, SS e SGO são desativados.');return true;}
        atual[flag]=!!input.checked;
        if(atual.data===encontro.data&&atual.SS===(encontro.SS===true)&&atual.SGO===(encontro.SGO===true))this.pendenciasArraste.delete(encontro.id);
        else this.pendenciasArraste.set(encontro.id,atual);
        this.renderizarMapa();this._registrarDragDrop();
        if(this.pendenciasArraste.has(encontro.id))this._mostrarStatus('Marcador alterado. Use Salvar Alterações ou descarte para reverter.');
        return true;
    },

    _descartarMovimentosTurma(turmaId) {
        const moves=[...this.pendenciasArraste.entries()].filter(([,m])=>m.id_turma===turmaId);
        if(!moves.length){this._mostrarStatus('Não há alterações pendentes para descartar.',true);return false;}
        if(typeof confirm==='function'&&!confirm(`Descartar ${moves.length} alteração(ões) não salva(s) desta turma?`))return false;
        moves.forEach(([id])=>this.pendenciasArraste.delete(id));
        this.renderizarMapa();this._registrarDragDrop();
        this._mostrarStatus(`${moves.length} alteração(ões) de arraste descartada(s).`);
        return true;
    },

    async tratarCliques(e) {
        const t=e.target;
        if(t.closest('.espelho-alvo-chk'))return true;
        if(t.closest('.btn-editar-lote')){this.abrirEdicaoLote(t.closest('.btn-editar-lote').dataset.idTurma);return true;}
        if(t.closest('.btn-excluir-lote')){await this.excluirSelecaoLote(t.closest('.btn-excluir-lote').dataset.idTurma);return true;}
        if(t.closest('.btn-limpar-selecao-turma')){this.limparSelecaoTurma(t.closest('.btn-limpar-selecao-turma').dataset.idTurma);return true;}
        if(t.closest('.btn-fechar-lote')||t.id==='modal-edicao-lote'){this.fecharModal('modal-edicao-lote');return true;}
        if(t.closest('#btn-nova-sala')){this.abrirModalSala();return true;}
        if(t.closest('.btn-editar-sala')){const id=t.closest('.btn-editar-sala').dataset.id;const sala=this.salas.find(s=>s.id===id);if(!sala){this._mostrarStatus('Esta sala não está mais disponível. Atualize a lista.',true);return true;}this.abrirModalSala(sala);return true;}
        if(t.closest('.btn-excluir-sala')){const id=t.closest('.btn-excluir-sala').dataset.id,sala=this.salas.find(s=>s.id===id);if(!sala)return true;if(!confirm(`Excluir a sala “${sala.referencia||sala.nome||'Sala'}”? Esta ação não pode ser desfeita.`))return true;const btn=t.closest('.btn-excluir-sala');if(btn.disabled)return true;btn.disabled=true;btn.textContent='Excluindo…';try{await window.ControllerEspelho.excluirSala(id);this.salas=this.salas.filter(s=>s.id!==id);this._renderizarSalas();this._mostrarStatusRecursos(`Sala “${sala.referencia||sala.nome||'Sala'}” excluída.`);}catch(err){this._mostrarStatusRecursos(err.message||'Não foi possível excluir a sala.',true);btn.disabled=false;btn.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>Excluir';}return true;}
        if(t.closest('.btn-fechar-modal-sala')||t.id==='modal-sala-aula'){this.fecharModal('modal-sala-aula');return true;}
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
        if(t.closest('.btn-abrir-modal-flags')){this.abrirModalFlags(t.closest('.btn-abrir-modal-flags').dataset.idTurma);return true;}
        if(t.closest('.btn-fechar-flags')||t.id==='modal-flags-lote'){this.fecharModal('modal-flags-lote');return true;}
        if(t.closest('#btn-area-marcar-todas')){this.selecionadas=new Set(this.turmas.map(x=>x.id));this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('.btn-area-marcar-todas')){const idx=Number(t.closest('.btn-area-marcar-todas').dataset.areaIndex);const g=this.gruposFiltro[idx];(g?.cursos||[]).flatMap(c=>c.turmas).forEach(x=>this.selecionadas.add(x.id));this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(t.closest('.btn-descartar-movimentos')){this._descartarMovimentosTurma(t.closest('.btn-descartar-movimentos').dataset.idTurma);return true;}
        if(t.closest('.btn-salvar-movimentos')){
            const btn=t.closest('.btn-salvar-movimentos'),turmaId=btn.dataset.idTurma;
            const moves=[...this.pendenciasArraste.entries()].filter(([,m])=>m.id_turma===turmaId).map(([id,m])=>({id,...m}));
            if(!moves.length){this._mostrarStatus('Não há alterações pendentes para esta turma.',true);return true;}
            if(btn.dataset.saving==='1')return true;
            btn.dataset.saving='1';btn.disabled=true;btn.textContent='Salvando…';btn.classList.add('opacity-60','cursor-wait');
            try{
                await window.ControllerEspelho.salvarMovimentos(moves,this.turmas,this.excecoes);
                const datas=new Map(moves.map(m=>[m.id,m.data]));
                this.encontros=this.encontros.map(en=>datas.has(en.id)?{...en,data:datas.get(en.id),SS:false,SGO:false}:en);
                moves.forEach(m=>this.pendenciasArraste.delete(m.id));
                this.alvosEdicaoLote.clear();
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
        if(t.closest('.btn-remover-encontro')){const id=t.closest('.btn-remover-encontro').dataset.id;if(this.pendenciasArraste.has(id)){this._mostrarStatus('Salve as alterações de arraste antes de remover este encontro.',true);return true;}const ecard=this.encontros.find(x=>x.id===id);if(ecard&&confirm('Remover este encontro/cancelamento?'))try{await window.ControllerEspelho.excluirEncontro(ecard,this.turmas);await this.iniciarView();}catch(err){this._mostrarStatus(err.message,true);}return true;}
        if(t.closest('.btn-fechar-encontro')){this.fecharModal('modal-encontro');return true;}
        if(t.closest('.btn-fechar-distribuicao')){this.fecharModal('modal-distribuicao');return true;}
        if(t.closest('#btn-baixar-modelo-mapa')){this._baixarCSV();return true;}
        return false;
    },

    tratarDuploClique(e) {
        if(e.target.closest('.btn-remover-encontro'))return true;
        if(e.target.closest('.espelho-flag-encontro'))return true;
        const card=e.target.closest('.espelho-card');
        if(card){
            if(!this.editavel)return false;
            const id=card.dataset.encontroId, data=card.dataset.data, idTurma=card.dataset.idTurma;
            const k = `${idTurma}|${data}|${id||''}`;
            if (this.alvosEdicaoLote.has(k)) {
                this.abrirEdicaoLote(idTurma);
                return true;
            }
            const encontro=this.encontros.find(x=>x.id===id);
            if(!encontro)return false;
            if(this.pendenciasArraste.has(id)){this._mostrarStatus('Salve as alterações de arraste antes de editar este encontro.',true);return true;}
            this.abrirModal(encontro.id_turma,data,encontro.tipo||'aula',{...encontro,data:data});
            return true;
        }
        const row=e.target.closest('#espelho-painel tbody tr');if(!row)return false;
        this._linhaSelecionada?.classList.remove('ring-2','ring-inset','ring-indigo-400');
        if(this._linhaSelecionada===row){this._linhaSelecionada=null;return true;}
        this._linhaSelecionada=row;row.classList.add('ring-2','ring-inset','ring-indigo-400');return true;
    },

    async tratarSubmits(e) {
        if(e.target.id==='form-flags-lote'){e.preventDefault();this.salvarFlagsLote(e.target);return true;}
        if(e.target.id==='form-edicao-lote'){e.preventDefault();try{await this.salvarEdicaoLote(e.target);}catch(err){this._mostrarStatus(err.message,true);}return true;}
        if(e.target.id==='form-espelho-encontro') {e.preventDefault();const form=e.target,btn=form.querySelector('button[type=submit]');if(btn?.dataset.saving==='1')return true;if(btn){btn.dataset.saving='1';btn.disabled=true;btn.textContent='Salvando…';}try{const id=document.getElementById('encontro-id').value;const docs=this._criarDocentesSelecionados();const tipo=document.getElementById('encontro-tipo').value;if(tipo==='aula'&&!docs.length)throw new Error('Selecione ao menos um docente habilitado para o curso.');const sala=document.getElementById('encontro-sala');const horaInicio=document.getElementById('encontro-h-inicio').value,horaFim=document.getElementById('encontro-h-termino').value,ch=window.ControllerTurmaFrm?.calcularCHEncontro(horaInicio,horaFim)||0;if(tipo!=='cancelamento'&&ch<=0)throw new Error('O horário final deve ser posterior ao horário inicial.');const salaDoc=this.salas.find(s=>s.id===sala.value);const payload={id_turma:document.getElementById('encontro-turma-id').value,data:document.getElementById('encontro-data').value,tipo,id_uc:document.getElementById('encontro-uc').value,docentes:docs,sala_id:sala.value,sala_nome:salaDoc?.referencia||salaDoc?.nome||'',modalidade:document.getElementById('encontro-modalidade').value,h_inicio:horaInicio,h_termino:horaFim,ch_encontro:ch,SS:document.getElementById('encontro-ss').value==='true',SGO:document.getElementById('encontro-sgo').value==='true',descricao:document.getElementById('encontro-descricao').value};await window.ControllerEspelho.salvarEncontro(payload,this.turmas,id||null);this.alvosEdicaoLote.clear();this.fecharModal('modal-encontro');this._mostrarStatus('Registro salvo.');await this.iniciarView();}catch(err){this._mostrarStatus(err.message,true);}finally{if(btn?.isConnected){btn.dataset.saving='0';btn.disabled=false;btn.textContent='Salvar';}}return true;}
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
        if(e.target.id==='form-distribuicao'){e.preventDefault();const form=e.target,btn=form.querySelector('button[type=submit]');if(btn?.dataset.saving==='1')return true;if(btn){btn.dataset.saving='1';btn.disabled=true;btn.textContent='Distribuindo…';}try{const id=document.getElementById('distribuicao-turma-id').value;await this._distribuir(id,this.csvRows.length?this.csvRows:null);this.alvosEdicaoLote.clear();this.fecharModal('modal-distribuicao');}catch(err){this.fecharModal('modal-distribuicao');this._mostrarStatus(err?.message||'Falha ao distribuir encontros.',true);}finally{if(btn?.isConnected){btn.dataset.saving='0';btn.disabled=false;btn.textContent='Distribuir encontros';}}return true;}
        return false;
    },

    async tratarMudancas(e) {
        if(e.target.matches('.espelho-alvo-chk')){const a={id_turma:e.target.dataset.idTurma,data:e.target.dataset.data,...(e.target.dataset.id?{id:e.target.dataset.id}:{})},k=`${a.id_turma}|${a.data}|${a.id||''}`;e.target.checked?this.alvosEdicaoLote.set(k,a):this.alvosEdicaoLote.delete(k);this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-filtro-dia-chk')){const set=this._diasVisiveisPeriodo(),dia=Number(e.target.value);e.target.checked?set.add(dia):set.delete(dia);this.filtroDiasAberto=true;this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-filtro-mes-chk')){this._alternarMesFiltro(e.target.dataset.mes,e.target.checked);this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-filtro-ano-chk')){const ano=Number(e.target.dataset.ano);for(let mi=0;mi<12;mi++)this._alternarMesFiltro(`${ano}-${String(mi+1).padStart(2,'0')}`,e.target.checked);this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-flag-encontro')){await this._salvarFlagEncontro(e.target);return true;}
        if(e.target.id==='select-remover-uc'){this._atualizarResumoRemocaoUC();return true;}
        if(e.target.id==='dist-uc'){this._renderizarProgressoGenerico(this.turmaDistribuicao?.id, 'dist-uc', 'dist-ch', 'dist-progresso');return true;}
        if(e.target.matches('.modal-docente-chk')){e.target.checked?this.docentesModalDraft.add(e.target.value):this.docentesModalDraft.delete(e.target.value);if(this.docentesModalContext?.contexto==='dia'){const dia=Number(this.docentesModalContext.dia),chk=[...document.querySelectorAll('.dist-dia-chk')].find(x=>Number(x.value)===dia);if(chk)chk.checked=this.docentesModalDraft.size>0;}return true;}
        if(['dist-h-inicio','dist-h-termino'].includes(e.target.id)){const a=document.getElementById('dist-h-inicio').value,b=document.getElementById('dist-h-termino').value,field=document.getElementById('dist-ch');field.value=a&&b&&b>a?(window.ControllerTurmaFrm?.calcularCHEncontro(a,b)||''):'';const atual=document.getElementById('dist-uc')?.value;this._popularUcsDistribuicao(atual);return true;}
        if(e.target.id==='dist-modalidade'){const remoto=e.target.value==='Remoto',wrap=document.getElementById('dist-sala-wrap'),sala=document.getElementById('dist-sala');wrap.classList.toggle('hidden',remoto);if(remoto)sala.value='';return true;}
        if(e.target.id==='encontro-tipo'){this._alternarCamposTipo();return true;}
        if(e.target.id==='lote-tipo'){this._alternarCamposTipoLote();return true;}
        if(e.target.id==='encontro-modalidade'){const remoto=e.target.value==='Remoto';document.getElementById('encontro-sala-wrap')?.classList.toggle('hidden',remoto||document.getElementById('encontro-tipo')?.value==='cancelamento');if(remoto)document.getElementById('encontro-sala').value='';return true;}
        if(e.target.id==='lote-modalidade'){const remoto=e.target.value==='Remoto';document.getElementById('lote-sala-wrap')?.classList.toggle('hidden',remoto||document.getElementById('lote-tipo')?.value==='cancelamento');if(remoto)document.getElementById('lote-sala').value='';return true;}
        if(['encontro-h-inicio','encontro-h-termino'].includes(e.target.id)){const a=document.getElementById('encontro-h-inicio').value,b=document.getElementById('encontro-h-termino').value;if(a&&b&&b>a)document.getElementById('encontro-ch').value=window.ControllerTurmaFrm?.calcularCHEncontro(a,b)||'';this._renderizarProgressoGenerico(this.turmaEdicao?.id, 'encontro-uc', 'encontro-ch', 'encontro-progresso');return true;}
        if(['lote-h-inicio','lote-h-termino'].includes(e.target.id)){const a=document.getElementById('lote-h-inicio').value,b=document.getElementById('lote-h-termino').value;document.getElementById('lote-ch').value=a&&b&&b>a?(window.ControllerTurmaFrm?.calcularCHEncontro(a,b)||''):'';this._renderizarProgressoGenerico(this.turmaEdicaoLote, 'lote-uc', 'lote-ch', 'lote-progresso');return true;}
        if(e.target.id==='lote-modalidade'){const remoto=e.target.value==='Remoto',wrap=document.getElementById('lote-sala-wrap'),sala=document.getElementById('lote-sala');wrap?.classList.toggle('hidden',remoto);if(remoto&&sala)sala.value='';return true;}
        if(e.target.id==='input-csv-mapa'&&e.target.files?.[0]){try{await this._lerCSV(e.target.files[0]);}catch(err){this._mostrarStatus(err.message,true);}return true;}
        if(e.target.matches('.espelho-turma-chk')){e.target.checked?this.selecionadas.add(e.target.value):this.selecionadas.delete(e.target.value);this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-course-chk')){const g=this.gruposFiltro[Number(e.target.dataset.areaIndex)],c=g?.cursos[Number(e.target.dataset.courseIndex)];(c?.turmas||[]).flatMap(c=>c.turmas).forEach(x=>this.selecionadas.add(x.id));this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.matches('.espelho-area-chk')){const g=this.gruposFiltro[Number(e.target.dataset.areaIndex)];(g?.cursos||[]).flatMap(c=>c.turmas).forEach(t=>e.target.checked?this.selecionadas.add(t.id):this.selecionadas.delete(t.id));this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        if(e.target.id==='espelho-mostrar-todas'){this.selecionadas=e.target.checked?new Set(this.turmas.map(t=>t.id)):new Set();this._renderizarFiltros();this.renderizarMapa();this._registrarDragDrop();return true;}
        return false;
    }
});