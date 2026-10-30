// Movimentação de encontros: arrastar e soltar, flag individual, descarte de alterações e duplo clique.
Object.assign(window.AppEspelho, {
    // Rolagem automática durante o arrasto: laço contínuo (requestAnimationFrame) que acelera conforme o
    // ponteiro se aproxima da borda do mapa, independente da frequência dos eventos "dragover" do navegador.
    _iniciarAutoScrollArrasto(pane) {
        if(this._dndRaf)return;
        const velocidade=(dist,borda)=>{const prox=Math.min(1,Math.max(0,(borda-Math.max(0,dist))/borda));return Math.ceil(3+prox*prox*27);};
        const passo=()=>{
            if(!this.draggedId||!pane.isConnected){this._dndRaf=null;return;}
            const p=this._dndPonteiro,r=pane.getBoundingClientRect();
            if(p){
                const borda=Math.max(48,Math.min(110,r.height/4,r.width/4));
                if(p.y<r.top+borda)pane.scrollTop-=velocidade(p.y-r.top,borda);
                else if(p.y>r.bottom-borda)pane.scrollTop+=velocidade(r.bottom-p.y,borda);
                if(p.x<r.left+borda)pane.scrollLeft-=velocidade(p.x-r.left,borda);
                else if(p.x>r.right-borda)pane.scrollLeft+=velocidade(r.right-p.x,borda);
            }
            this._dndRaf=requestAnimationFrame(passo);
        };
        this._dndRaf=requestAnimationFrame(passo);
    },
    _pararAutoScrollArrasto() {
        if(this._dndRaf){cancelAnimationFrame(this._dndRaf);this._dndRaf=null;}
        if(this._dndDocHandler){document.removeEventListener('dragover',this._dndDocHandler);this._dndDocHandler=null;}
        this._dndPonteiro=null;
    },
    // Ao SOLTAR sobre uma data válida: registra a pendência (o encontro sai da data original e entra na nova) e, se a
    // data estiver ocupada, marca o encontro sobreposto para exclusão. Nada é gravado: tudo vale só ao "Salvar".
    _confirmarArrasto() {
        const id=this.draggedId,alvo=this._dragAlvo;if(!id||!alvo)return false;
        const source=this.encontros.find(x=>x.id===id);if(!source)return false;
        if(alvo.data===source.data&&!alvo.ocupanteId)this.pendenciasArraste.delete(id);
        else this.pendenciasArraste.set(id,{id_turma:alvo.idTurma,data:alvo.data,SS:false,SGO:false,...(alvo.ocupanteId?{substitui:alvo.ocupanteId}:{})});
        this._ultimoDrop={substitui:!!alvo.ocupanteId};
        this._dragAlvo=null;return true;
    },
    _registrarDragDrop() {
        const pane=document.getElementById('espelho-painel'); if(!pane)return;
        const limparPreview=()=>{
            pane.querySelectorAll('.espelho-drag-preview').forEach(n=>n.remove());
            pane.querySelectorAll('[data-dnd-oculto]').forEach(n=>{n.style.display='';n.removeAttribute('data-dnd-oculto');});
            pane.querySelectorAll('.espelho-dnd-alvo').forEach(n=>n.classList.remove('espelho-dnd-alvo','ring-2','ring-inset','ring-indigo-400','ring-rose-500'));
        };
        const celulaDaData=(idTurma,data)=>{
            const vaga=[...pane.querySelectorAll('td[data-id-turma][data-data]')].find(td=>td.dataset.idTurma===idTurma&&td.dataset.data===data);
            if(vaga)return vaga;
            return [...pane.querySelectorAll('.espelho-card')].find(c=>c.dataset.idTurma===idTurma&&c.dataset.data===data&&!c.classList.contains('espelho-drag-preview'))?.closest('td')||null;
        };
        // Pré-visualização apenas visual: o cartão "encaixa" no espaço da data. Se houver ocupante, ele é escondido e a data
        // fica destacada em vermelho, avisando que ele será substituído (e excluído) somente se o usuário soltar e salvar.
        const colocarPreview=(cell,origem,substitui)=>{
            if(!cell||!origem)return;
            const filhos=[...cell.children].filter(n=>!n.classList.contains('espelho-drag-preview'));
            const alturaVaga=Math.max(88,...filhos.map(n=>n.offsetHeight||0));
            filhos.forEach(n=>{n.setAttribute('data-dnd-oculto','1');n.style.display='none';});
            const clone=origem.cloneNode(true);
            clone.removeAttribute('draggable');clone.removeAttribute('data-dnd-oculto');clone.style.display='';clone.classList.remove('opacity-30');
            clone.classList.add('espelho-drag-preview','w-full','shadow-lg','ring-2',substitui?'ring-rose-500':'ring-indigo-400');
            clone.style.pointerEvents='none';clone.style.minHeight=`${alturaVaga}px`;
            clone.querySelectorAll('button,input').forEach(b=>b.remove());
            if(substitui){const aviso=document.createElement('div');aviso.className='mb-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700';aviso.textContent='Substituirá o encontro desta data ao soltar';clone.prepend(aviso);}
            cell.appendChild(clone);
            cell.classList.add('espelho-dnd-alvo','ring-2','ring-inset',substitui?'ring-rose-500':'ring-indigo-400');
        };
        const semAlvo=(e)=>{this._dragAlvo=null;this.lastDragTarget='';limparPreview();if(e?.dataTransfer)e.dataTransfer.dropEffect='none';};
        // Shift+clique alterna a seleção: impede a seleção de texto e o início de arrasto nesse caso.
        pane.onmousedown=e=>{if(e.shiftKey&&e.target.closest('.espelho-card,td.espelho-dropzone')&&!e.target.closest('input,button,label,select,a'))e.preventDefault();};
        pane.ondragstart=e=>{
            const card=e.target.closest('.espelho-card');if(!card||card.dataset.tipo==='cancelamento')return;
            if(this.alvosEdicaoLote.size){e.preventDefault();this._mostrarStatus('Limpe a seleção em lote antes de arrastar encontros.',true);return;}
            this.draggedId=card.dataset.encontroId;this.lastDragTarget='';this._dragAlvo=null;this._ultimoDrop=null;
            e.dataTransfer.setData('text/plain',this.draggedId);e.dataTransfer.effectAllowed='move';
            this._dndPonteiro={x:e.clientX,y:e.clientY};
            this._dndDocHandler=ev=>{this._dndPonteiro={x:ev.clientX,y:ev.clientY};};
            document.addEventListener('dragover',this._dndDocHandler);
            this._iniciarAutoScrollArrasto(pane);
        };
        pane.ondragover=e=>{
            const id=this.draggedId;if(!id)return;
            e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';
            this._dndPonteiro={x:e.clientX,y:e.clientY};
            const source=this.encontros.find(x=>x.id===id);if(!source)return;
            // O alvo é a DATA inteira: o ponteiro em qualquer ponto da linha resolve a célula da turma do encontro.
            const linha=e.target.closest?.('tbody tr');if(!linha){semAlvo(e);return;}
            const ref=[...linha.querySelectorAll('td[data-id-turma][data-data],.espelho-card:not(.espelho-drag-preview)')].find(n=>n.dataset.idTurma===source.id_turma);
            const cell=celulaDaData(source.id_turma,ref?.dataset.data||'');
            const newDate=cell?(cell.dataset.data||cell.querySelector('.espelho-card:not(.espelho-drag-preview)')?.dataset.data):null;
            if(!cell||!newDate){semAlvo(e);return;}
            const turma=this.turmas.find(t=>t.id===source.id_turma);if(!turma){semAlvo(e);return;}
            const ignoradas=Array.isArray(turma.excecoes_ignoradas)?turma.excecoes_ignoradas:[];
            if(window.Util.excecaoAplica(this._mapaExcecoes().get(newDate),turma)&&!ignoradas.includes(newDate)){semAlvo(e);return;}
            const ocupante=this._mapaEncontros().get(`${turma.id}|${newDate}`),atual=this.pendenciasArraste.get(id)?.data||source.data;
            if(ocupante?.id===id||newDate===atual){this._dragAlvo=null;this.lastDragTarget='';limparPreview();return;}
            if(ocupante){
                const real=this.encontros.find(x=>x.id===ocupante.id);
                if(ocupante.tipo==='cancelamento'||!real||real.data<=this._hojeISO()){semAlvo(e);return;}   // só substitui encontros futuros
            }
            const key=`${turma.id}|${newDate}|${ocupante?.id||''}`;if(this.lastDragTarget===key&&this._dragAlvo)return;
            this.lastDragTarget=key;this._dragAlvo={idTurma:turma.id,data:newDate,ocupanteId:ocupante?.id||null};
            limparPreview();
            const sourceCard=pane.querySelector(`.espelho-card[data-encontro-id="${CSS.escape(id)}"]:not(.espelho-drag-preview)`);sourceCard?.classList.add('opacity-30');
            colocarPreview(cell,sourceCard,!!ocupante);
        };
        pane.ondragleave=e=>{if(!pane.contains(e.relatedTarget)){this._dragAlvo=null;this.lastDragTarget='';limparPreview();}};
        pane.ondrop=e=>{if(!this.draggedId)return;e.preventDefault();this._confirmarArrasto();};
        pane.ondragend=()=>{
            this._pararAutoScrollArrasto();this.draggedId=null;this._dragAlvo=null;this.lastDragTarget='';
            this.renderizarMapa();this._registrarDragDrop();
            if(this._ultimoDrop){this._mostrarStatus(this._ultimoDrop.substitui?'Encontro reposicionado. O encontro sobreposto será excluído ao salvar; use Salvar Alterações (ou ↶ para descartar).':'Encontro reposicionado. Use Salvar Alterações no cabeçalho da turma.');this._ultimoDrop=null;}
        };
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
    async _descartarMovimentosTurma(turmaId) {
        const moves=[...this.pendenciasArraste.entries()].filter(([,m])=>m.id_turma===turmaId);
        if(!moves.length){this._mostrarStatus('Não há alterações pendentes para descartar.',true);return false;}
        if(!(await window.Dialog.confirmar(`Descartar ${moves.length} alteração(ões) não salva(s) desta turma?`,{titulo:'Descartar alterações',textoConfirmar:'Descartar'})))return false;
        moves.forEach(([id])=>this.pendenciasArraste.delete(id));
        this.renderizarMapa();this._registrarDragDrop();
        this._mostrarStatus(`${moves.length} alteração(ões) de arraste descartada(s).`);
        return true;
    },
    // Duplo clique em encontro (ou data vaga) JÁ SELECIONADO abre a edição dos selecionados da turma;
    // Apoio/Admin sem permissão de edição abrem o SS/SGO em lote. Sem seleção, mantém a edição individual.
    _abrirAcaoDosSelecionados(idTurma) {
        if(this.editavel){this.abrirEdicaoLote(idTurma);return true;}
        if(this.podeGerenciarFlagsLote){this.abrirModalFlagsLote(idTurma);return true;}
        return false;
    },
    tratarDuploClique(e) {
        if(e.shiftKey)return true;
        if(e.target.closest('.espelho-alvo-chk'))return true;
        if(e.target.closest('.btn-remover-encontro'))return true;
        if(e.target.closest('.espelho-flag-encontro'))return true;
        if(e.target.closest('button,select,input,label,a'))return false;
        const card=e.target.closest('.espelho-card');
        if(card){
            const id=card.dataset.encontroId,encontro=this.encontros.find(x=>x.id===id);if(!encontro)return false;
            const selecionado=this.alvosEdicaoLote.has(`${encontro.id_turma}|${card.dataset.data||encontro.data}|${id}`);
            if(selecionado&&this._abrirAcaoDosSelecionados(encontro.id_turma))return true;
            if(!this.editavel)return false;
            if(this.pendenciasArraste.has(id)){this._mostrarStatus('Salve as alterações de arraste antes de editar este encontro.',true);return true;}
            this.abrirModal(encontro.id_turma,card.dataset.data||encontro.data,encontro.tipo||'aula',{...encontro,data:card.dataset.data||encontro.data});return true;
        }
        const celula=e.target.closest('td[data-id-turma][data-data]');
        if(celula&&this.alvosEdicaoLote.has(`${celula.dataset.idTurma}|${celula.dataset.data}|`)&&this._abrirAcaoDosSelecionados(celula.dataset.idTurma))return true;
        const row=e.target.closest('#espelho-painel tbody tr');if(!row)return false;
        this._linhaSelecionada?.classList.remove('ring-2','ring-inset','ring-indigo-400');
        if(this._linhaSelecionada===row){this._linhaSelecionada=null;return true;}
        this._linhaSelecionada=row;row.classList.add('ring-2','ring-inset','ring-indigo-400');return true;
    },
});
