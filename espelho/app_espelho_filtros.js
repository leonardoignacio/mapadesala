// Filtros do mapa: seleção de turmas por área/curso, anos e resumo das turmas selecionadas.
Object.assign(window.AppEspelho, {
    _renderizarFiltros() {
        const c = document.getElementById('espelho-filtro-areas'); if (!c) return;
        if (!this.turmas.length) { c.innerHTML = '<span class="text-sm text-slate-400">Nenhum curso/turma disponível para suas áreas.</span>'; return; }
        const grupos = new Map();
        this.turmas.forEach(t => {
            const area = t.area || t.curso_area || t.curso_tipo || 'Sem área informada';
            if (!grupos.has(area)) grupos.set(area,new Map());
            const cursos = grupos.get(area); const chave = t.id_curso || t.curso_titulo || 'curso-sem-identificacao';
            if (!cursos.has(chave)) cursos.set(chave,{nome:t.curso_titulo||'Curso sem título',turmas:[]});
            cursos.get(chave).turmas.push(t);
        });
        this.gruposFiltro=[];
        c.innerHTML=[...grupos.entries()].map(([area,cursos],ai)=>{
            const cursoArr=[...cursos.entries()].map(([key,value])=>({key,nome:value.nome,turmas:value.turmas}));this.gruposFiltro.push({area,cursos:cursoArr});
            const idsArea=[...cursos.values()].flatMap(x=>x.turmas.map(t=>t.id));
            const todosArea=idsArea.every(id=>this.selecionadas.has(id));
            const cursoHtml=cursoArr.map((curso,ci)=>`<div class="rounded-lg border border-slate-100 p-1.5 sm:p-2"><label class="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" class="espelho-course-chk rounded text-blue-600" data-area-index="${ai}" data-course-index="${ci}" ${curso.turmas.every(t=>this.selecionadas.has(t.id))?'checked':''}>${this._html(curso.nome)} <span class="font-normal text-slate-400">(${curso.turmas.length} turma(s))</span></label><div class="mt-1 flex flex-wrap gap-1 pl-6 sm:mt-1.5 sm:gap-1.5">${curso.turmas.map(t=>`<label class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer hover:bg-blue-50 sm:px-2 sm:py-1 sm:text-[11px]"><input type="checkbox" class="espelho-turma-chk rounded text-blue-600" value="${this._html(t.id)}" ${this.selecionadas.has(t.id)?'checked':''}>${this._html(t.referencia||'Turma')}</label>`).join('')}</div></div>`).join('');
            return `<section class="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60"><div class="flex items-center gap-1.5 p-1.5 text-xs font-bold text-slate-700 sm:gap-2 sm:p-2.5 sm:text-sm"><input type="checkbox" aria-label="Selecionar área ${this._html(area)}" class="espelho-area-chk rounded text-blue-600" data-area-index="${ai}" ${todosArea?'checked':''}><span class="flex-1">${this._html(area)}</span><span class="text-[9px] font-normal text-slate-400 sm:text-[10px]">${idsArea.length} turma(s)</span><button type="button" class="btn-area-marcar-todas text-[9px] font-bold text-blue-700 hover:underline sm:text-[10px]" data-area-index="${ai}">Marcar todas</button></div><div class="space-y-1.5 border-t border-slate-200 p-1.5 sm:space-y-2 sm:p-2">${cursoHtml}</div></section>`;
        }).join('');
        this._renderizarTurmasSelecionadas();
    },
    _renderizarTurmasSelecionadas() {
        const arr=this.turmas.filter(t=>this.selecionadas.has(t.id));
        const label=document.getElementById('espelho-contagem-turmas');if(label)label.textContent=`${arr.length} de ${this.turmas.length} turmas selecionadas`;
        const modalLabel=document.getElementById('espelho-contagem-modal');if(modalLabel)modalLabel.textContent=`${arr.length} de ${this.turmas.length} selecionadas`;
        const all=document.getElementById('espelho-mostrar-todas');if(all)all.checked=this.turmas.length>0&&arr.length===this.turmas.length;
    },
    _renderizarFiltroAnos(anosDisponiveis) {
        const selecionados=this._mesesSelecionados();
        if(!anosDisponiveis.length)return '<p class="text-xs text-slate-500">Não há anos disponíveis para as turmas deste período.</p>';
        return `<div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">${anosDisponiveis.map(ano=>{const keys=Array.from({length:12},(_,mi)=>`${ano}-${String(mi+1).padStart(2,'0')}`),todos=keys.every(k=>selecionados.has(k)),algum=keys.some(k=>selecionados.has(k));return `<details open data-ano-accordion="${ano}" class="rounded-md border border-slate-200 bg-white"><summary class="flex cursor-pointer list-none items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5 hover:bg-slate-100"><input type="checkbox" aria-label="Selecionar todos os meses de ${ano}" class="espelho-filtro-ano-chk h-3.5 w-3.5 rounded text-blue-600" onclick="event.stopPropagation()" data-ano="${ano}" data-misto="${algum&&!todos}" ${todos?'checked':''}><span class="text-xs font-bold text-slate-700">${ano}</span><span class="ml-auto text-[10px] text-slate-400">${keys.filter(k=>selecionados.has(k)).length}/12 meses</span></summary><div class="grid grid-cols-2 gap-x-2 p-2">${this.meses.map((mes,mi)=>{const key=keys[mi];return `<label class="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50"><input type="checkbox" class="espelho-filtro-mes-chk h-3 w-3 rounded text-blue-600" data-mes="${key}" ${selecionados.has(key)?'checked':''}>${mes}</label>`;}).join('')}</div></details>`;}).join('')}</div>`;
    },
});
