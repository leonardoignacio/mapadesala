// Filtros do mapa: seleção de turmas por área/curso, situação, anos e resumo das turmas selecionadas.
Object.assign(window.AppEspelho, {
    _statusTurmaFiltro(t) {
        const bruto=t.status_turma||t.status||'';
        const status=this._norm(bruto);
        if(status.includes('conclu'))return 'concluidas';
        if(status.includes('andamento')||status.includes('iniciad'))return 'ativas';
        const horas=Number(t.horas_ministradas??t.horas_apuradas)||0;
        const carga=Number(String(t.ch_total_curso??t.carga_horaria??'').replace(',','.'))||0;
        return carga>0&&horas>=carga?'concluidas':'ativas';
    },
    _renderizarFiltros() {
        const c=document.getElementById('espelho-filtro-areas');if(!c)return;
        if(!this.turmas.length){c.innerHTML='<span class="text-sm text-slate-400">Nenhum curso/turma disponível para suas áreas.</span>';return;}
        const categorias=[
            {id:'ativas',titulo:'Em andamento e não iniciadas',sub:'Turmas em andamento ou ainda não iniciadas',turmas:this.turmas.filter(t=>this._statusTurmaFiltro(t)==='ativas')},
            {id:'concluidas',titulo:'Concluídas',sub:'Turmas com carga horária concluída',turmas:this.turmas.filter(t=>this._statusTurmaFiltro(t)==='concluidas')}
        ];
        this.gruposFiltro=[];
        c.innerHTML=categorias.map(cat=>{
            const idsStatus=cat.turmas.map(t=>t.id),statusAtivo=idsStatus.length>0&&idsStatus.every(id=>this.selecionadas.has(id));
            const areas=new Map();
            cat.turmas.forEach(t=>{
                const area=t.area||t.curso_area||t.curso_tipo||'Sem área informada';
                if(!areas.has(area))areas.set(area,new Map());
                const cursos=areas.get(area),chave=t.id_curso||t.curso_titulo||'curso-sem-identificacao';
                if(!cursos.has(chave))cursos.set(chave,{nome:t.curso_titulo||'Curso sem título',turmas:[]});
                cursos.get(chave).turmas.push(t);
            });
            const conteudo=[...areas.entries()].map(([area,cursos])=>{
                const cursoArr=[...cursos.entries()].map(([key,value])=>({key,nome:value.nome,turmas:value.turmas}));
                const ai=this.gruposFiltro.length;this.gruposFiltro.push({area,status:cat.id,cursos:cursoArr});
                const idsArea=cursoArr.flatMap(x=>x.turmas.map(t=>t.id));
                const cursoHtml=cursoArr.map((curso,ci)=>{
                    const cursoMarcado=curso.turmas.length>0&&curso.turmas.every(t=>this.selecionadas.has(t.id));
                    return `<div class="rounded-lg border border-slate-100 p-1.5 sm:p-2"><label class="flex items-start gap-2 text-xs font-bold text-slate-700"><input type="checkbox" class="espelho-course-chk mt-0.5 rounded text-blue-600" data-area-index="${ai}" data-course-index="${ci}" ${cursoMarcado?'checked':''}><span>${this._html(curso.nome)} <span class="font-normal text-slate-400">(${curso.turmas.length} turma(s))</span></span></label><div class="mt-1 flex flex-wrap gap-1 pl-6 sm:mt-1.5 sm:gap-1.5">${curso.turmas.map(t=>`<label class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer hover:bg-blue-50 sm:px-2 sm:py-1 sm:text-[11px]"><input type="checkbox" class="espelho-turma-chk rounded text-blue-600" value="${this._html(t.id)}" ${this.selecionadas.has(t.id)?'checked':''}>${this._html(t.referencia||'Turma')}</label>`).join('')}</div></div>`;
                }).join('');
                const todosArea=idsArea.length>0&&idsArea.every(id=>this.selecionadas.has(id));
                return `<section class="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60"><div class="flex items-center gap-1.5 p-1.5 text-xs font-bold text-slate-700 sm:gap-2 sm:p-2.5 sm:text-sm"><input type="checkbox" aria-label="Selecionar área ${this._html(area)} (${cat.titulo})" class="espelho-area-chk rounded text-blue-600" data-area-index="${ai}" ${todosArea?'checked':''}><span class="flex-1">${this._html(area)}</span><span class="text-[9px] font-normal text-slate-400 sm:text-[10px]">${idsArea.length} turma(s)</span></div><div class="space-y-1.5 border-t border-slate-200 p-1.5 sm:space-y-2 sm:p-2">${cursoHtml}</div></section>`;
            }).join('');
            return `<section class="overflow-hidden rounded-xl border ${cat.id==='ativas'?'border-blue-200':'border-slate-200'} bg-white"><header class="flex flex-wrap items-center gap-2 border-b ${cat.id==='ativas'?'border-blue-100 bg-blue-50/70':'border-slate-200 bg-slate-50'} px-2.5 py-2 sm:px-3"><label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2"><input type="checkbox" class="espelho-status-chk h-4 w-4 rounded text-blue-600" data-status="${cat.id}" ${statusAtivo?'checked':''}><span class="text-xs font-extrabold text-slate-800 sm:text-sm">${cat.titulo}</span></label><span class="text-[10px] font-medium text-slate-500">${idsStatus.filter(id=>this.selecionadas.has(id)).length}/${idsStatus.length} selecionadas</span></header><div class="space-y-2 p-2 sm:p-3"><p class="text-[10px] text-slate-500 sm:text-xs">${cat.sub}</p>${conteudo||'<p class="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-400">Nenhuma turma nesta situação.</p>'}</div></section>`;
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
