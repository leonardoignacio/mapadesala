// Distribuição de encontros: planejamento por UC, escolha de docentes e importação por CSV.
Object.assign(window.AppEspelho, {
    _popularUcsDistribuicao(preferida=null) {
        const turma=this.turmaDistribuicao,select=document.getElementById('dist-uc');if(!turma||!select)return;
        const ch=Number(document.getElementById('dist-ch')?.value)||0,pendentes=this._ucsPendentes(turma,ch);
        const opts=pendentes.map(x=>`<option value="${this._html(x.id)}">${this._html(x.uc.referencia)} — ${this._html(x.uc.titulo)} (${x.faltam} pendente(s))</option>`);
        opts.push(`<option value="TODAS" ${pendentes.length?'':'disabled'}>TODAS — distribuir todas as UCs pendentes</option>`);
        if(!pendentes.length)opts.unshift('<option value="" disabled selected>Nenhuma UC pendente de distribuição</option>');
        select.innerHTML=opts.join('');
        select.value=preferida==='TODAS'&&pendentes.length?'TODAS':(pendentes.some(x=>x.id===preferida)?preferida:(pendentes[0]?.id||''));
        select.onchange=()=>this._renderizarProgressoDistribuicao();
        this._renderizarProgressoDistribuicao();
    },
    _renderizarProgressoDistribuicao() {
        const out=document.getElementById('progresso-distribuicao'),turma=this.turmaDistribuicao;if(!out||!turma)return;
        const ch=Number(document.getElementById('dist-ch')?.value)||0,value=document.getElementById('dist-uc')?.value||'',ucs=value==='TODAS'?this._ucsOrdenadas(turma):this._ucsOrdenadas(turma).filter(u=>(u.id_uc_base||u.id)===value);
        if(!value||!ucs.length){out.innerHTML='';this._atualizarQuantidadeDistribuicao(value,0);return;}
        let total=0,distribuidos=0;for(const uc of ucs){const id=uc.id_uc_base||uc.id;total+=this._totalEncontrosComCH(uc,turma,ch);distribuidos+=this.encontros.filter(e=>e.id_turma===turma.id&&e.id_uc===id&&e.tipo!=='cancelamento').length;}
        const feitos=Math.min(total,distribuidos),faltam=Math.max(0,total-feitos),pct=total?Math.round(feitos/total*100):0,pctFalta=total?100-pct:0;
        out.innerHTML=this._htmlBarrasProgresso(total,feitos);
        this._atualizarQuantidadeDistribuicao(value,faltam);
    },
    // Campo "Quantidade de encontros": input + datalist ("Todos" ou um número). Reinicia em "Todos" ao trocar de UC.
    _atualizarQuantidadeDistribuicao(ucValue,faltam) {
        const input=document.getElementById('dist-qtd'),lista=document.getElementById('dist-qtd-lista');if(!input)return;
        const todas=ucValue==='TODAS',semSaldo=!(faltam>0);
        if(this._ucQuantidade!==ucValue){input.value='Todos';this._ucQuantidade=ucValue;}
        if(lista)lista.innerHTML=['Todos',...Array.from({length:Math.min(faltam||0,100)},(_,i)=>String(i+1))].map(v=>`<option value="${v}"></option>`).join('');
        input.disabled=todas||semSaldo;if(todas||semSaldo)input.value='Todos';
    },
    _lerQuantidadeDistribuicao() {
        const bruto=(document.getElementById('dist-qtd')?.value||'').trim();
        if(!bruto||this._norm(bruto)==='todos')return Infinity;
        if(!/^\d+$/.test(bruto)||Number(bruto)<1)throw new Error('Informe uma quantidade válida de encontros (número inteiro maior que zero) ou escolha “Todos”.');
        return Number(bruto);
    },
    abrirDistribuicao(idTurma) {
        const t=this.turmas.find(x=>x.id===idTurma); if(!t)return;
        this.turmaDistribuicao=t;this.csvRows=[];this.docentesPorDia=new Map();
        const hid=document.getElementById('distribuicao-turma-id');if(hid)hid.value=t.id;
        document.getElementById('subtitulo-distribuicao').textContent=`${t.referencia} · ${t.curso_titulo||''} · ${t.d_inicio?this._dataBR(t.d_inicio):''} a ${t.d_termino?this._dataBR(t.d_termino):''}`;
        const hIni=document.getElementById('dist-h-inicio'),hFim=document.getElementById('dist-h-termino');
        if(hIni)hIni.value=t.h_inicio||'';if(hFim)hFim.value=t.h_termino||'';
        const ch=window.ControllerTurmaFrm?.calcularCHEncontro(t.h_inicio,t.h_termino)||Number(t.ch_encontro)||'';
        document.getElementById('dist-ch').value=ch;
        this._ucQuantidade=null;this._popularUcsDistribuicao();
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
    _alternarCamposTipo() { const cancel=document.getElementById('encontro-tipo')?.value==='cancelamento';const modalidade=document.getElementById('encontro-modalidade-wrap'),sala=document.getElementById('encontro-sala-wrap');document.getElementById('campos-encontro-aula')?.classList.toggle('hidden',cancel);modalidade?.classList.toggle('hidden',cancel);sala?.classList.toggle('hidden',cancel||document.getElementById('encontro-modalidade')?.value==='Remoto');document.getElementById('encontro-uc')?.toggleAttribute('required',!cancel);['encontro-h-inicio','encontro-h-termino','encontro-ch'].forEach(id=>document.getElementById(id)?.toggleAttribute('required',!cancel)); },
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
        const limite=ucValue==='TODAS'?Infinity:this._lerQuantidadeDistribuicao();
        const start=new Date(`${turma.d_inicio}T12:00:00`),end=new Date(`${turma.d_termino}T12:00:00`);if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))throw new Error('A turma precisa ter período de início e término válidos.');
        const ignoradas = Array.isArray(turma.excecoes_ignoradas) ? turma.excecoes_ignoradas : [];
        const dataPool=[];for(const d=new Date(start);d<=end;d.setDate(d.getDate()+1)){const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const excAtiva=window.Util.excecaoAplica(mapaX.get(iso),turma)&&!ignoradas.includes(iso);if(!mapaE.has(`${turma.id}|${iso}`)&&!excAtiva&&diasSelecionados.has(d.getDay()))dataPool.push({iso,dow:d.getDay()});}
        const todasUcs=this._ucsOrdenadas(turma),ucs=ucValue==='TODAS'?todasUcs:todasUcs.filter(u=>(u.id_uc_base||u.id)===ucValue),registros=[],totalEncontros=uc=>Number(uc.carga_horaria)>0?Math.ceil(Number(uc.carga_horaria)/ch):this._totalEncontros(uc,turma);
        const existentesUC=uc=>this.encontros.filter(e=>e.id_turma===turma.id&&e.id_uc===(uc.id_uc_base||uc.id)&&e.tipo!=='cancelamento').length;
        const restantesUC=ucs.reduce((soma,uc)=>soma+Math.max(0,totalEncontros(uc)-existentesUC(uc)),0),alvoQtd=Math.min(limite,restantesUC);
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
                const excAtivaRow = window.Util.excecaoAplica(mapaX.get(row.data),turma) && !ignoradas.includes(row.data);
                if(mapaE.has(`${turma.id}|${row.data}`)||excAtivaRow)continue;
                const uc=ucs.find(u=>this._norm(u.referencia)===this._norm(row.uc_referencia));if(!uc){if(ucValue!=='TODAS')throw new Error(`A UC ${row.uc_referencia} não corresponde à UC selecionada.`);continue;}
                const jaNoLote=registros.filter(e=>e.id_uc===(uc.id_uc_base||uc.id)).length;if(jaNoLote>=limite)continue;const usados=existentesUC(uc)+jaNoLote;if(usados>=totalEncontros(uc))continue;
                const day=new Date(`${row.data}T12:00:00`).getDay(),docs=docentesPara(day,row),rowSala=this.salas.find(s=>this._norm(s.referencia||s.nome)===this._norm(row.sala));
                registros.push({id_turma:turma.id,data:row.data,tipo:'aula',id_uc:uc.id_uc_base||uc.id,uc_referencia:uc.referencia,docentes:docs,h_inicio:inicio,h_termino:termino,ch_encontro:ch,modalidade,sala_id:salaId,sala_nome:sala?.referencia||sala?.nome||'',descricao:descricao||row.observacoes||''});
            }
        }else{
            const regras=new Map();document.querySelectorAll('.dist-dia-chk:checked').forEach(chk=>{const ids=this.docentesPorDia.get(Number(chk.value))||new Set();if(!ids.size)throw new Error(`Selecione ao menos um docente para ${this.dias[Number(chk.value)]}.`);regras.set(Number(chk.value),this._criarDocentesSelecionados(ids));});
            if(!regras.size)throw new Error('Selecione ao menos um dia da semana.');
            for(const uc of ucs){let pend=Math.min(limite,Math.max(0,totalEncontros(uc)-existentesUC(uc)));if(!pend)continue;
                for(const slot of dataPool){if(!pend)break;if(registros.some(r=>r.data===slot.iso))continue;const docentes=regras.get(slot.dow);if(!docentes)continue;registros.push({id_turma:turma.id,data:slot.iso,tipo:'aula',id_uc:uc.id_uc_base||uc.id,uc_referencia:uc.referencia,docentes,h_inicio:inicio,h_termino:termino,ch_encontro:ch,modalidade,sala_id:salaId,sala_nome:sala?.referencia||sala?.nome||'',descricao});pend--;}
            }
        }
        if(!registros.length)throw new Error('Não há encontros pendentes ou lacunas compatíveis para distribuir.');
        await window.ControllerEspelho.salvarEncontrosLote(registros,this.turmas);
        this._mostrarStatus(`${registros.length} encontro(s) distribuído(s).${Number.isFinite(limite)&&limite>restantesUC?` Você pediu ${limite}, mas o saldo da UC era ${restantesUC}.`:''}`);await this.iniciarView();
        if(!plano&&registros.length<alvoQtd)await window.Dialog.aviso(`Foram distribuídos ${registros.length} de ${alvoQtd} encontro(s): não havia datas livres suficientes nos dias selecionados, dentro do período da turma. Ajuste os dias da semana ou as exceções e tente novamente para o restante.`,'Distribuição parcial');
    },
    _baixarCSV() { const csv='data;referencia_uc;docentes_email\n2026-03-02;UC-01;docente@escola.org\n';const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='modelo-distribuicao-encontros.csv';a.click();URL.revokeObjectURL(a.href); },
    async _lerCSV(file) { const text=await file.text();const lines=text.replace(/^\ufeff/,'').split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)throw new Error('O CSV não contém linhas de dados.');const sep=lines[0].includes(';')?';':',';const hdr=lines.shift().split(sep).map(x=>this._norm(x.trim()));const ix={data:hdr.indexOf('data'),uc:hdr.indexOf('referencia_uc'),doc:hdr.indexOf('docentes_email'),sala:hdr.indexOf('sala'),obs:hdr.indexOf('observacoes')};if(ix.data<0||ix.uc<0)throw new Error('O cabeçalho deve conter data e referencia_uc.');this.csvRows=lines.map(l=>{const c=l.split(sep).map(x=>x.trim());return{data:c[ix.data],uc_referencia:c[ix.uc],docentes:ix.doc>=0&&c[ix.doc]?c[ix.doc].split(/[|,]/).map(x=>x.trim()).filter(Boolean):[],sala:ix.sala>=0?c[ix.sala]:'',observacoes:ix.obs>=0?c[ix.obs]:''};}).filter(r=>r.data&&r.uc_referencia);document.getElementById('csv-mapa-nome').textContent=`${this.csvRows.length} linha(s) carregada(s)`;},
    _proximaDataLivre(turma, depoisDe, ignorarIds=new Set()) {
        if(!turma.d_termino) return null;
        const mapa=this._mapaEncontros(), excecoes=this._mapaExcecoes(), dias=new Set(this._diasTurma(turma));
        const d=new Date(`${depoisDe}T12:00:00`);d.setDate(d.getDate()+1);
        const fim=new Date(`${turma.d_termino}T12:00:00`);
        const ignoradas = Array.isArray(turma.excecoes_ignoradas) ? turma.excecoes_ignoradas : [];
        for(;d<=fim;d.setDate(d.getDate()+1)){
            if(!dias.has(d.getDay()))continue;
            const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const excAtiva = window.Util.excecaoAplica(excecoes.get(iso),turma) && !ignoradas.includes(iso);
            if(excAtiva)continue;
            const ocupado=mapa.get(`${turma.id}|${iso}`);
            if(!ocupado||ignorarIds.has(ocupado.id))return iso;
        }
        return null;
    },
});
