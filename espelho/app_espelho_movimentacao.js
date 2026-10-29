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
    _registrarDragDrop() {
        const pane=document.getElementById('espelho-painel'); if(!pane)return;
        const limparPreview=()=>{
            pane.querySelectorAll('.espelho-drag-preview').forEach(n=>n.remove());
            pane.querySelectorAll('[data-dnd-oculto]').forEach(n=>{n.style.display='';n.removeAttribute('data-dnd-oculto');});
            pane.querySelectorAll('.espelho-dnd-alvo').forEach(n=>n.classList.remove('espelho-dnd-alvo','ring-2','ring-inset','ring-indigo-400'));
        };
        // A célula da turma na data (vaga ou ocupada), vista como um único espaço do dia.
        const celulaDaData=(idTurma,data)=>{
            const vaga=[...pane.querySelectorAll('td[data-id-turma][data-data]')].find(td=>td.dataset.idTurma===idTurma&&td.dataset.data===data);
            if(vaga)return vaga;
            return [...pane.querySelectorAll('.espelho-card')].find(c=>c.dataset.idTurma===idTurma&&c.dataset.data===data&&!c.classList.contains('espelho-drag-preview'))?.closest('td')||null;
        };
        // O cartão arrastado "encaixa" no lugar do conteúdo da data: esconde o quadro vazio (ou o cartão atual) e ocupa o espaço.
        const colocarPreview=(cell,origem,destacar=false)=>{
            if(!cell||!origem)return;
            const filhos=[...cell.children].filter(n=>!n.classList.contains('espelho-drag-preview'));
            const alturaVaga=Math.max(88,...filhos.map(n=>n.offsetHeight||0));
            filhos.forEach(n=>{n.setAttribute('data-dnd-oculto','1');n.style.display='none';});
            const clone=origem.cloneNode(true);
            clone.removeAttribute('draggable');clone.removeAttribute('data-dnd-oculto');clone.style.display='';clone.classList.remove('opacity-30');
            clone.classList.add('espelho-drag-preview','w-full','shadow-lg','ring-2','ring-indigo-400');
            clone.style.pointerEvents='none';clone.style.minHeight=`${alturaVaga}px`;
            clone.querySelectorAll('button,input').forEach(b=>b.remove());
            cell.appendChild(clone);
            if(destacar)cell.classList.add('espelho-dnd-alvo','ring-2','ring-inset','ring-indigo-400');
        };
        pane.ondragstart=e=>{
            const card=e.target.closest('.espelho-card');if(!card||card.dataset.tipo==='cancelamento')return;
            if(this.alvosEdicaoLote.size){e.preventDefault();this._mostrarStatus('Limpe a seleção em lote antes de arrastar encontros.',true);return;}
            this.draggedId=card.dataset.encontroId;this.lastDragTarget='';
            e.dataTransfer.setData('text/plain',this.draggedId);e.dataTransfer.effectAllowed='move';
            this._dndPonteiro={x:e.clientX,y:e.clientY};
            this._dndDocHandler=ev=>{this._dndPonteiro={x:ev.clientX,y:ev.clientY};};
            document.addEventListener('dragover',this._dndDocHandler);
            this._iniciarAutoScrollArrasto(pane);
        };
        pane.ondragover=e=>{
            const id=this.draggedId||e.dataTransfer?.getData?.('text/plain');if(!id)return;
            e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';
            this._dndPonteiro={x:e.clientX,y:e.clientY};
            const source=this.encontros.find(x=>x.id===id);if(!source)return;
            // O alvo é a DATA inteira: o ponteiro em qualquer ponto da linha (inclusive no rótulo do dia) resolve a célula da turma.
            const linha=e.target.closest?.('tbody tr');if(!linha)return;
            const cell=celulaDaData(source.id_turma,[...linha.querySelectorAll('td[data-id-turma][data-data],.espelho-card:not(.espelho-drag-preview)')].find(n=>n.dataset.idTurma===source.id_turma)?.dataset.data||'');
            const newDate=cell?(cell.dataset.data||cell.querySelector('.espelho-card')?.dataset.data):null;
            if(!cell||!newDate)return;
            const idTurma=source.id_turma,key=`${idTurma}|${newDate}`;if(this.lastDragTarget===key)return;this.lastDragTarget=key;
            const turma=this.turmas.find(t=>t.id===idTurma);if(!turma)return;
            const ignoradas = Array.isArray(turma.excecoes_ignoradas) ? turma.excecoes_ignoradas : [];
            if(window.Util.excecaoAplica(this._mapaExcecoes().get(newDate),turma) && !ignoradas.includes(newDate))return;
            const map=this._mapaEncontros(),occupant=map.get(`${turma.id}|${newDate}`),current=this.pendenciasArraste.get(id)?.data||source.data;
            if(current===newDate||occupant?.id===id||occupant?.tipo==='cancelamento')return;
            if(occupant){const next=this._proximaDataLivre(turma,newDate,new Set([id,occupant.id]));if(!next)return;this.pendenciasArraste.set(occupant.id,{id_turma:turma.id,data:next,SS:false,SGO:false});}
            if(newDate===source.data&&!source.SS&&!source.SGO&&!this.pendenciasArraste.has(id))this.pendenciasArraste.delete(id);else this.pendenciasArraste.set(id,{id_turma:turma.id,data:newDate,SS:false,SGO:false});
            limparPreview();
            const sourceCard=pane.querySelector(`.espelho-card[data-encontro-id="${CSS.escape(id)}"]`);if(sourceCard)sourceCard.classList.add('opacity-30');
            colocarPreview(cell,sourceCard,true);
            for(const [movedId,mv] of this.pendenciasArraste){
                if(movedId===id)continue;
                const origem=pane.querySelector(`.espelho-card[data-encontro-id="${CSS.escape(movedId)}"]:not(.espelho-drag-preview)`);origem?.classList.add('opacity-30');
                const destino=celulaDaData(source.id_turma,mv.data);if(destino&&destino!==cell)colocarPreview(destino,origem);
            }
        };
        pane.ondragleave=e=>{if(!pane.contains(e.relatedTarget))this.lastDragTarget='';};
        pane.ondrop=e=>{if(e.target.closest('tbody tr'))e.preventDefault();};
        pane.ondragend=()=>{this._pararAutoScrollArrasto();this.draggedId=null;this.lastDragTarget='';this.renderizarMapa();this._registrarDragDrop();if(this.pendenciasArraste.size)this._mostrarStatus('Encontro(s) reposicionado(s). Use Salvar Alterações no cabeçalho da turma.');};
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
