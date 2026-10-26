// ./turmas/app_turma_listar.js - Lógica de Listagem, Acordeon de UCs e Filtros de Turmas
window.AppTurmaListar = {
    cacheTurmas: [],
    cacheCursos: [],
    cacheUCsBase: [],
    cacheEncontros: [],

    filtrosTurmas: {
        ref: "",
        areas: ["Todos"],
        periodos: ["Todos"],
        status: ["Todos"]
    },

    _norm(str) {
        return (str || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    },

    podeEditar() {
        const cargosEdicao = ['root', 'admin', 'tecnico', 'docente'];
        return cargosEdicao.includes(window.usuarioAtual?.cargo);
    },

    obterAreasUsuario() {
        const areas = window.usuarioAtual?.areas || [];
        return Array.isArray(areas) ? areas.filter(a => a && a !== "Todas") : [];
    },

    // Verifica se um curso pertence às áreas informadas (considerando 'area' e 'tipo', ex.: Aprendizagem)
    _cursoCorrespondeAsAreas(curso, listaAreas) {
        if (!curso || !Array.isArray(listaAreas)) return false;
        if (listaAreas.includes("Todas") || listaAreas.includes("Todos")) return true;

        const areaCursoNorm = this._norm(curso.area);
        const tipoCursoNorm = this._norm(curso.tipo);

        return listaAreas.some(a => {
            const areaAlvoNorm = this._norm(a);
            return areaAlvoNorm !== "" && (areaAlvoNorm === areaCursoNorm || areaAlvoNorm === tipoCursoNorm);
        });
    },

    // Verifica se uma turma pertence às áreas informadas (considerando a área da turma e o curso vinculado)
    _turmaCorrespondeAsAreas(turma, listaAreas, mapaCursosPorId = new Map()) {
        if (!turma || !Array.isArray(listaAreas)) return false;
        if (listaAreas.includes("Todas") || listaAreas.includes("Todos")) return true;

        const areaTurmaNorm = this._norm(turma.area);
        const cursoVinculado = mapaCursosPorId.get(turma.id_curso);
        const areaCursoNorm = this._norm(cursoVinculado?.area);
        const tipoCursoNorm = this._norm(cursoVinculado?.tipo);

        return listaAreas.some(a => {
            const areaAlvoNorm = this._norm(a);
            return areaAlvoNorm !== "" && (
                areaAlvoNorm === areaTurmaNorm ||
                areaAlvoNorm === areaCursoNorm ||
                areaAlvoNorm === tipoCursoNorm
            );
        });
    },

    configurarFiltrosPadrao() {
        const cargo = window.usuarioAtual?.cargo;
        const areasUser = this.obterAreasUsuario();

        if (cargo === 'apoio' && areasUser.length > 0) {
            this.filtrosTurmas.areas = [...areasUser];
        } else {
            this.filtrosTurmas.areas = ["Todos"];
        }

        this.filtrosTurmas.status = ["Todos"];
    },

    async iniciarView() {
        this.configurarFiltrosPadrao();
        await this.carregarDadosBase();
        this.popularFiltrosESelects();
        this.renderizarTabelaTurmas();
    },

    async carregarDadosBase() {
        const tbody = document.getElementById('tabela-turmas');
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Carregando dados...</td></tr>';
        try {
            await window.Store.garantirPronto();
            const [turmas, cursos, ucs] = await Promise.all([
                window.ControllerTurmaListar.listarTurmas(),
                window.ControllerTurmaListar.listarCursosBase(),
                window.ControllerTurmaListar.listarUCsBase()
            ]);
            const todasTurmas=Array.isArray(turmas)?turmas:[],todosCursos=Array.isArray(cursos)?cursos:[],todasUCs=Array.isArray(ucs)?ucs:[];
            const encontros=window.Store.dados?.encontros;
            this.cacheEncontros=Array.isArray(encontros)?encontros.filter(e=>e&&typeof e==='object'):[];
            const mapaCursosGeral=new Map(todosCursos.filter(Boolean).map(c=>[c.id,c]));
            const cargo=window.usuarioAtual?.cargo,areasUser=this.obterAreasUsuario(),possuiAcessoGlobal=(window.usuarioAtual?.areas||[]).includes('Todas');
            if(cargo==='docente'&&!possuiAcessoGlobal){
                this.cacheCursos=todosCursos.filter(c=>this._cursoCorrespondeAsAreas(c,areasUser));
                this.cacheTurmas=todasTurmas.filter(t=>t&&this._turmaCorrespondeAsAreas(t,areasUser,mapaCursosGeral));
                const idsCursosPermitidos=new Set(this.cacheCursos.map(c=>c.id));this.cacheUCsBase=todasUCs.filter(u=>idsCursosPermitidos.has(u.id_curso));
            }else{
                this.cacheCursos=todosCursos.filter(Boolean);this.cacheTurmas=todasTurmas.filter(Boolean);this.cacheUCsBase=todasUCs.filter(Boolean);
                if(cargo==='apoio'&&!this.filtrosTurmas.areas.includes('Todos')){
                    const areasExpandidas=new Set(this.filtrosTurmas.areas);
                    todasTurmas.forEach(t=>{if(t&&this._turmaCorrespondeAsAreas(t,areasUser,mapaCursosGeral)&&t.area)areasExpandidas.add(t.area);});
                    todosCursos.forEach(c=>{if(c&&this._cursoCorrespondeAsAreas(c,areasUser)&&c.area)areasExpandidas.add(c.area);});
                    this.filtrosTurmas.areas=Array.from(areasExpandidas);
                }
            }
            this._calcularProgressoReal();
        } catch (err) {
            if(tbody)tbody.innerHTML=`<tr><td colspan="5" class="p-6 text-center text-rose-700"><strong>Não foi possível carregar as turmas.</strong><div class="mt-1 text-xs">${String(err?.message||err||'Erro desconhecido')}</div></td></tr>`;
            console.error('Falha ao carregar dados da tela Turmas:',err);
            throw err;
        }
    },

    _calcularProgressoReal() {
        const agora=new Date(),hoje=`${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}-${String(agora.getDate()).padStart(2,'0')}`;
        const numero=valor=>{const n=Number(String(valor??'').replace(',','.'));return Number.isFinite(n)&&n>0?n:0;};
        const encontrosPassados=new Map();
        for(const e of this.cacheEncontros){
            if(!e||e.tipo!=='aula'||typeof e.data!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.data)||e.data>=hoje||!e.id_turma||!e.id_uc)continue;
            const key=`${e.id_turma}|${e.id_uc}`;if(!encontrosPassados.has(key))encontrosPassados.set(key,[]);encontrosPassados.get(key).push(e);
        }
        const horasEncontros=(lista,turma)=>lista.reduce((soma,e)=>soma+numero(e.ch_encontro||e.carga_horaria||turma.ch_encontro||this._horasDaTurma(turma)),0);
        const statusPorHoras=(horas,ch)=>horas<=0?'Não Iniciada':(ch>0&&horas>=ch?'Concluída':'Em Andamento');
        const percentual=(horas,ch)=>ch>0?Math.min(100,Math.max(0,Math.round(horas/ch*100))):0;
        for(const turma of this.cacheTurmas){
            if(!turma||typeof turma!=='object')continue;
            const ucs=Array.isArray(turma.ucs)?turma.ucs.filter(u=>u&&typeof u==='object'):[];
            let horasTurma=0;
            turma.ucs=ucs.map(uc=>{
                const id=uc.id_uc_base||uc.id, lista=(id?encontrosPassados.get(`${turma.id}|${id}`):[])||[];
                const horas=horasEncontros(lista,turma),ch=numero(uc.carga_horaria);
                horasTurma+=horas;
                const pct=percentual(horas,ch);
                return {...uc,status:statusPorHoras(horas,ch),horas_ministradas:horas,horas_apuradas:horas,encontros_apurados:lista.length,progresso:pct,progresso_calculado:pct};
            });
            const curso=this.cacheCursos.find(c=>c.id===turma.id_curso);
            const cargaUCs=ucs.reduce((s,u)=>s+numero(u.carga_horaria),0);
            const cargaTurma=cargaUCs||numero(turma.ch_total_curso)||numero(curso?.carga_horaria)||numero(curso?.ch_total_curso);
            if(!ucs.length){const lista=this.cacheEncontros.filter(e=>e&&e.id_turma===turma.id&&e.tipo==='aula'&&typeof e.data==='string'&&e.data<hoje);horasTurma=horasEncontros(lista,turma);}
            turma.status=statusPorHoras(horasTurma,cargaTurma);
            turma.horas_ministradas=horasTurma;turma.horas_apuradas=horasTurma;
            turma.progresso_calculado=percentual(horasTurma,cargaTurma);turma.progresso_turma=turma.progresso_calculado;
        }
    },

    _horasDaTurma(turma) {
        const parse=valor=>{const m=/^(\d{1,2}):(\d{2})$/.exec(String(valor||''));return m?Number(m[1])*60+Number(m[2]):null;};
        const inicio=parse(turma?.h_inicio),fim=parse(turma?.h_termino);return inicio!==null&&fim!==null&&fim>inicio?(fim-inicio)/60:0;
    },

    popularFiltrosESelects() {
        const mapaAreasUnicas = new Map();
        const registrarArea = (nome) => {
            const chave = this._norm(nome);
            if (chave && !mapaAreasUnicas.has(chave)) {
                mapaAreasUnicas.set(chave, nome.trim());
            }
        };

        this.cacheCursos.forEach(c => { if (c.area) registrarArea(c.area); });
        this.cacheTurmas.forEach(t => { if (t.area) registrarArea(t.area); });
        if (window.usuarioAtual?.cargo === 'docente') {
            this.obterAreasUsuario().forEach(a => registrarArea(a));
        }

        const areasUnicas = Array.from(mapaAreasUnicas.values()).sort((a, b) => a.localeCompare(b));

        const containerAreas = document.getElementById('popover-container-turma-areas');
        if (containerAreas) {
            const isTodosChecked = this.filtrosTurmas.areas.includes("Todos");
            const attrTodos = isTodosChecked ? 'checked' : '';
            const normSelecionadas = new Set(this.filtrosTurmas.areas.map(a => this._norm(a)));

            const chks = areasUnicas.map(nomeArea => {
                const isChecked = isTodosChecked || normSelecionadas.has(this._norm(nomeArea));
                const attrItem = isChecked ? 'checked' : '';
                return '<label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"><input type="checkbox" value="' + nomeArea + '" class="popover-area-turma-chk w-4 h-4 text-blue-600 rounded" ' + attrItem + '> <span class="truncate" title="' + nomeArea + '">' + nomeArea + '</span></label>';
            }).join('');

            containerAreas.innerHTML = 
                '<label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition font-semibold"><input type="checkbox" value="Todos" class="popover-area-turma-chk w-4 h-4 text-blue-600 rounded" ' + attrTodos + '> Todos</label>' +
                chks;
        }

        if (this.podeEditar() && window.AppTurmaFrm) {
            window.AppTurmaFrm.popularSelectCursos();
        }
    },

    atualizarIconesFiltro() {
        const iconRef = document.getElementById('icon-filter-turma-ref');
        if (iconRef) iconRef.textContent = (this.filtrosTurmas.ref !== "") ? "✖️" : "🔎";

        const iconArea = document.getElementById('icon-filter-turma-area');
        if (iconArea) {
            const ativo = !this.filtrosTurmas.areas.includes("Todos");
            iconArea.textContent = ativo ? "✖️" : "🔎";
            iconArea.parentElement.title = ativo ? "Filtrar / Mostrar Áreas" : "Filtrar por Área";
        }

        const iconPeriodo = document.getElementById('icon-filter-turma-periodo');
        if (iconPeriodo) iconPeriodo.textContent = (!this.filtrosTurmas.periodos.includes("Todos")) ? "✖️" : "🔎";

        const iconStatus = document.getElementById('icon-filter-turma-status');
        if (iconStatus) {
            const isPadraoSemConcluidas = this.filtrosTurmas.status.includes("Todos") || (!this.filtrosTurmas.status.includes("Todos") &&
                this.filtrosTurmas.status.length === 2 &&
                this.filtrosTurmas.status.includes("Em Andamento") &&
                this.filtrosTurmas.status.includes("Não Iniciada"));
            iconStatus.textContent = isPadraoSemConcluidas ? "🔎" : "✖️";
        }
    },

    _formatarDataBR(dataISO) {
        if (!dataISO || !dataISO.includes('-')) return "---";
        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    },

    _formatarNumeroBR(valor) {
        const num = parseFloat(valor) || 0;
        return Number.isInteger(num) ? num.toString() : num.toFixed(1).replace('.', ',');
    },

    _abreviarArea(areaStr) {
        if (!areaStr) return "";
        const limpa = areaStr.trim();
        if (!limpa) return "";
        const ignorar = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'a', 'o', 'as', 'os']);
        const palavras = limpa.split(/\s+/).filter(p => !ignorar.has(p.toLowerCase()));
        if (palavras.length <= 1) {
            const unica = palavras[0] || limpa;
            return unica.substring(0, 3).toUpperCase();
        }
        return palavras.map(p => p.charAt(0).toUpperCase()).join('');
    },

    renderizarTabelaTurmas() {
        const tbody = document.getElementById('tabela-turmas');
        if (!tbody) return;

        this.atualizarIconesFiltro();
        const temPermissaoEdicao = this.podeEditar();

        const svgLixeira = '<svg class="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
        const svgLapis = '<svg class="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';

        const termoRef = this.filtrosTurmas.ref.toLowerCase().trim();
        const mapaCursos = new Map(this.cacheCursos.map(c => [c.id, c]));

        const dadosFiltrados = this.cacheTurmas.filter(t => {
            const matchRef = termoRef === "" ||
                (t.referencia && t.referencia.toLowerCase().includes(termoRef)) ||
                (t.oferta && t.oferta.toLowerCase().includes(termoRef)) ||
                (t.curso_titulo && t.curso_titulo.toLowerCase().includes(termoRef));

            const matchArea = this._turmaCorrespondeAsAreas(t, this.filtrosTurmas.areas, mapaCursos);
            const matchPeriodo = this.filtrosTurmas.periodos.includes("Todos") || this.filtrosTurmas.periodos.includes(t.periodo);
            const matchStatus = this.filtrosTurmas.status.includes("Todos") || this.filtrosTurmas.status.includes(t.status);

            return matchRef && matchArea && matchPeriodo && matchStatus;
        });

        if (dadosFiltrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400 text-sm md:text-base">Nenhuma turma encontrada para estes filtros.</td></tr>';
            return;
        }

        const html = dadosFiltrados.map(turma => {
            const ucsDaTurma = Array.isArray(turma.ucs) ? turma.ucs.slice().sort((a, b) => {
                const numA = parseInt((a.referencia || "").replace(/\D/g, '')) || 0;
                const numB = parseInt((b.referencia || "").replace(/\D/g, '')) || 0;
                return numA - numB;
            }) : [];

            const progTurma = turma.progresso_calculado || 0;
            const siglaArea = this._abreviarArea(turma.area);
            const areaTooltip = turma.area || "";

            const htmlSiglaArea = siglaArea
                ? ' <span class="text-slate-300 font-normal">|</span> <span class="text-blue-600 font-extrabold" title="' + areaTooltip + '">' + siglaArea + '</span>'
                : '';

            const htmlBotoesAcao = temPermissaoEdicao
                ? '<div class="flex flex-col items-center justify-center gap-1.5">' +
                    '<span class="btn-editar-turma transform hover:scale-110 transition-transform" data-id="' + turma.id + '" title="Editar Turma">' + svgLapis + '</span>' +
                    '<span class="btn-excluir-turma transform hover:scale-110 transition-transform" data-id="' + turma.id + '" title="Excluir Turma">' + svgLixeira + '</span>' +
                  '</div>'
                : '<span class="text-slate-300">-</span>';

            const diasArr = Array.isArray(turma.dias_semana) ? turma.dias_semana : [];
            const diasTexto = diasArr.length > 0 ? diasArr.join(" | ") : "Dias não informados";

            let badgeStatus = "text-slate-600 md:bg-slate-100 md:border-slate-200";
            if (turma.status === "Em Andamento") badgeStatus = "text-blue-700 md:bg-blue-50 md:border-blue-200";
            else if (turma.status === "Concluída") badgeStatus = "text-emerald-700 md:bg-emerald-50 md:border-emerald-200";
            else if (turma.status === "Não Iniciada") badgeStatus = "text-amber-700 md:bg-amber-50 md:border-amber-200";

            let badgePeriodo = "text-slate-700 md:bg-slate-50 md:border-slate-200";
            if (turma.periodo === "MANHÃ") badgePeriodo = "text-sky-700 md:bg-sky-50 md:border-sky-200";
            else if (turma.periodo === "TARDE") badgePeriodo = "text-orange-700 md:bg-orange-50 md:border-orange-200";
            else if (turma.periodo === "NOITE") badgePeriodo = "text-indigo-700 md:bg-indigo-50 md:border-indigo-200";

            let htmlUCs = "";
            if (ucsDaTurma.length === 0) {
                htmlUCs = '<tr><td colspan="5" class="py-4 text-center text-slate-400 text-xs md:text-sm">Curso de curta duração ou sem UCs vinculadas.</td></tr>';
            } else {
                const tooltipUC = temPermissaoEdicao
                    ? "Clique para editar Nº Aula, Status e Progresso desta UC"
                    : "Clique para ver detalhes da UC";

                htmlUCs = ucsDaTurma.map((uc, idx) => {
                    const progUC = uc.progresso_calculado || 0;
                    let ucStatusBadge = "text-amber-700 md:bg-amber-50 md:border-amber-200";
                    if (uc.status === "Em Andamento") ucStatusBadge = "text-blue-700 md:bg-blue-50 md:border-blue-200";
                    else if (uc.status === "Concluída") ucStatusBadge = "text-emerald-700 md:bg-emerald-50 md:border-emerald-200";

                    const nAulaTexto = uc.n_aula || "---";
                    const statusUCTexto = uc.status || "Não Iniciada";
                    const horasFormatadas = this._formatarNumeroBR(uc.horas_apuradas || 0);

                    return `
                    <tr class="hover:bg-blue-50/50 transition-colors duration-200 cursor-pointer row-turma-uc group/uc border-b border-slate-100 last:border-0" data-turma-id="${turma.id}" data-uc-idx="${idx}" title="${tooltipUC}">
                        <td class="px-1.5 py-2 md:p-3 w-[16%] md:w-[12%] text-[11px] md:text-xs font-bold text-slate-600 whitespace-normal break-words group-hover/uc:text-blue-600">
                            ${uc.referencia}
                        </td>
                        <td class="px-1.5 py-2 md:p-3 w-[34%] md:w-[38%] text-[11px] leading-snug md:text-sm font-medium text-slate-700 whitespace-normal break-words">
                            ${uc.titulo}
                        </td>
                        <td class="px-1.5 py-2 md:p-3 w-[18%] md:w-[16%] text-[10px] md:text-xs font-semibold text-slate-500 whitespace-normal break-words">
                            Aula: <span class="text-slate-800 font-bold">${nAulaTexto}</span>
                        </td>
                        <td class="px-1.5 py-2 md:p-3 w-[17%] md:w-[16%] text-center">
                            <span class="p-0 border-0 bg-transparent md:px-2 md:py-1 md:rounded-md text-[10px] md:text-xs font-bold md:border ${ucStatusBadge} whitespace-normal break-words md:whitespace-nowrap">${statusUCTexto}</span>
                        </td>
                        <td class="px-1.5 py-2 md:p-3 w-[15%] md:w-[18%] text-right">
                            <div class="flex flex-col items-end gap-1">
                                <span class="text-[10px] md:text-xs font-extrabold text-blue-600">${progUC}% <span class="text-slate-400 font-normal">(${horasFormatadas}/${uc.carga_horaria}h)</span></span>
                                <div class="w-full max-w-[90px] bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div class="bg-blue-600 h-full rounded-full transition-all" style="width: ${progUC}%"></div>
                                </div>
                            </div>
                        </td>
                    </tr>
                    `;
                }).join('');
            }

            const ofertaTexto = turma.oferta || "---";
            const chEncontroFormatada = this._formatarNumeroBR(turma.ch_encontro);
            const dataInicioBR = this._formatarDataBR(turma.d_inicio);
            const dataTerminoBR = this._formatarDataBR(turma.d_termino);
            const chCursoTotal = turma.ch_total_curso || 0;

            return `
            <tr class="hover:bg-blue-50/50 hover:shadow-[inset_4px_0_0_0_#3b82f6] transition-all duration-200 cursor-pointer row-turma group border-b border-slate-100" data-turma-id="${turma.id}">
                <td class="px-1 py-2 md:py-3 md:px-2 text-center align-middle w-[8%] md:w-[5%] relative z-10">
                    ${htmlBotoesAcao}
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 align-middle w-[22%] md:w-[18%] whitespace-normal break-words">
                    <p class="text-[11px] md:text-sm font-black text-blue-600 leading-tight">${turma.referencia}</p>
                    <p class="text-[9px] md:text-xs font-semibold text-slate-400">Oferta: <span class="font-normal text-slate-500">${ofertaTexto}</span></p>
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 align-middle w-[34%] md:w-[38%] whitespace-normal break-words">
                    <p class="text-[11px] leading-snug md:text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                        ${turma.curso_titulo}${htmlSiglaArea}
                    </p>
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 align-middle w-[20%] md:w-[22%] whitespace-normal break-words">
                    <span class="inline-block p-1 border-0 bg-transparent shadow-none md:px-2.5 md:py-1.5 md:rounded-md text-[10px] md:text-xs md:border md:shadow-sm ${badgePeriodo} leading-relaxed">
                        <strong class="font-extrabold">${turma.periodo}</strong><br>
                        <span class="font-medium">${turma.h_inicio} - ${turma.h_termino} (${chEncontroFormatada}h)</span><br>
                        <span class="text-[10px] font-bold text-slate-600">${diasTexto}</span>
                    </span>
                </td>
                <td class="px-1 py-2 md:py-4 md:px-3 align-middle w-[16%] md:w-[17%] text-right">
                    <div class="flex flex-col items-end gap-1">
                        <span class="p-0 border-0 bg-transparent shadow-none md:px-2.5 md:py-1 md:rounded-md text-[10px] md:text-xs font-bold md:border md:shadow-sm ${badgeStatus} whitespace-nowrap mb-0.5">${turma.status}</span>
                        <span class="text-[11px] md:text-sm font-black text-slate-700 group-hover:text-blue-600">${progTurma}%</span>
                        <div class="w-full max-w-[85px] bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div class="bg-blue-600 h-full rounded-full transition-all" style="width: ${progTurma}%"></div>
                        </div>
                    </div>
                </td>
            </tr>
            <tr class="hidden row-turma-ucs bg-slate-50 shadow-inner" id="accordion-turma-${turma.id}">
                <td colspan="5" class="p-0 border-b-2 border-blue-100">
                    <div class="p-3 md:p-5 pl-3 md:pl-12 border-l-4 border-blue-400 bg-gradient-to-r from-blue-50/50 to-transparent">
                        <div class="mb-2.5 text-xs md:text-sm text-slate-700 leading-relaxed">
                            <strong class="font-bold text-blue-800 uppercase tracking-wide">UCs da Turma (${turma.referencia})</strong>
                            <span class="text-slate-300 mx-1.5">|</span>
                            <strong class="font-bold text-slate-800">Início:</strong> <span class="font-normal text-slate-600">${dataInicioBR}</span>
                            <span class="text-slate-300 mx-1.5">|</span>
                            <strong class="font-bold text-slate-800">Término Previsto:</strong> <span class="font-normal text-slate-600">${dataTerminoBR}</span>
                            <span class="text-slate-300 mx-1.5">|</span>
                            <strong class="font-bold text-slate-800">CH Curso:</strong> <span class="font-normal text-slate-600">${chCursoTotal}h</span>
                        </div>
                        <div class="bg-white rounded-xl shadow-sm border border-blue-100/50 overflow-hidden">
                            <table class="w-full text-left table-fixed">
                                <tbody class="divide-y divide-slate-50">${htmlUCs}</tbody>
                            </table>
                        </div>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

        tbody.innerHTML = html;
    },

    fecharPopovers(excetoId = null) {
        ['modal-filter-turma-ref', 'modal-filter-turma-area', 'modal-filter-turma-periodo', 'modal-filter-turma-status'].forEach(id => {
            if (id !== excetoId) {
                document.getElementById(id)?.classList.add('hidden');
            }
        });
    },

    async tratarCliques(e) {
        const configurarInterruptor = (classeChk) => {
            if (e.target.classList.contains(classeChk)) {
                const chkTodos = document.querySelector(`.${classeChk}[value="Todos"]`);
                const chkItens = Array.from(document.querySelectorAll(`.${classeChk}`)).filter(c => c.value !== "Todos");
                if (e.target.value === "Todos") {
                    chkItens.forEach(c => c.checked = e.target.checked);
                } else {
                    if (!e.target.checked && chkTodos) chkTodos.checked = false;
                    else if (chkTodos) chkTodos.checked = chkItens.every(c => c.checked);
                }
                return true;
            }
            return false;
        };

        if (configurarInterruptor('popover-area-turma-chk')) return true;
        if (configurarInterruptor('popover-periodo-turma-chk')) return true;
        if (configurarInterruptor('popover-status-turma-chk')) return true;

        const rowTurma = e.target.closest('.row-turma');
        if (rowTurma && !e.target.closest('.btn-editar-turma') && !e.target.closest('.btn-excluir-turma')) {
            const turmaId = rowTurma.getAttribute('data-turma-id');
            const acc = document.getElementById(`accordion-turma-${turmaId}`);
            if (acc) acc.classList.toggle('hidden');
            return true;
        }

        const rowTurmaUc = e.target.closest('.row-turma-uc');
        if (rowTurmaUc) {
            const turmaId = rowTurmaUc.getAttribute('data-turma-id');
            const ucIdx = parseInt(rowTurmaUc.getAttribute('data-uc-idx'), 10);
            if (window.AppTurmaFrm) window.AppTurmaFrm.abrirModalEditarUCTurma(turmaId, ucIdx);
            return true;
        }

        if (e.target.closest('.btn-excluir-turma')) {
            if (!this.podeEditar()) return true;
            const id = e.target.closest('.btn-excluir-turma').getAttribute('data-id');
            if (confirm("ATENÇÃO: Confirma a exclusão desta Turma e do histórico de progresso de suas UCs?")) {
                await window.ControllerTurmaListar.excluirTurma(id);
                await this.carregarDadosBase();
                this.popularFiltrosESelects();
                this.renderizarTabelaTurmas();
            }
            return true;
        }

        const btnRef = e.target.closest('#btn-filter-turma-ref');
        if (btnRef) {
            if (this.filtrosTurmas.ref !== "") {
                this.filtrosTurmas.ref = "";
                const inp = document.getElementById('popover-input-turma-ref');
                if (inp) inp.value = "";
                this.renderizarTabelaTurmas();
            } else {
                this.fecharPopovers('modal-filter-turma-ref');
                const modal = document.getElementById('modal-filter-turma-ref');
                modal?.classList.toggle('hidden');
                if (modal && !modal.classList.contains('hidden')) document.getElementById('popover-input-turma-ref')?.focus();
            }
            return true;
        }

        const btnArea = e.target.closest('#btn-filter-turma-area');
        if (btnArea) {
            this.fecharPopovers('modal-filter-turma-area');
            const modal = document.getElementById('modal-filter-turma-area');
            modal?.classList.toggle('hidden');
            if (modal && !modal.classList.contains('hidden')) {
                const isTodos = this.filtrosTurmas.areas.includes("Todos");
                const normSelecionadas = new Set(this.filtrosTurmas.areas.map(a => this._norm(a)));
                document.querySelectorAll('.popover-area-turma-chk').forEach(c => {
                    if (c.value === "Todos") c.checked = isTodos;
                    else c.checked = isTodos ? true : normSelecionadas.has(this._norm(c.value));
                });
            }
            return true;
        }

        const btnPeriodo = e.target.closest('#btn-filter-turma-periodo');
        if (btnPeriodo) {
            if (!this.filtrosTurmas.periodos.includes("Todos")) {
                this.filtrosTurmas.periodos = ["Todos"];
                document.querySelectorAll('.popover-periodo-turma-chk').forEach(c => c.checked = true);
                this.renderizarTabelaTurmas();
            } else {
                this.fecharPopovers('modal-filter-turma-periodo');
                document.getElementById('modal-filter-turma-periodo')?.classList.toggle('hidden');
            }
            return true;
        }

        const btnStatus = e.target.closest('#btn-filter-turma-status');
        if (btnStatus) {
            this.fecharPopovers('modal-filter-turma-status');
            const modal = document.getElementById('modal-filter-turma-status');
            modal?.classList.toggle('hidden');
            if (modal && !modal.classList.contains('hidden')) {
                const isTodos = this.filtrosTurmas.status.includes("Todos");
                document.querySelectorAll('.popover-status-turma-chk').forEach(c => {
                    if (c.value === "Todos") c.checked = isTodos;
                    else c.checked = isTodos ? true : this.filtrosTurmas.status.includes(c.value);
                });
            }
            return true;
        }

        if (e.target.closest('#apply-filter-turma-ref')) {
            this.filtrosTurmas.ref = document.getElementById('popover-input-turma-ref')?.value || "";
            document.getElementById('modal-filter-turma-ref')?.classList.add('hidden');
            this.renderizarTabelaTurmas();
            return true;
        }
        if (e.target.closest('#apply-filter-turma-area')) {
            const marcados = Array.from(document.querySelectorAll('.popover-area-turma-chk:checked')).map(c => c.value);
            this.filtrosTurmas.areas = marcados.includes("Todos") ? ["Todos"] : marcados;
            document.getElementById('modal-filter-turma-area')?.classList.add('hidden');
            this.renderizarTabelaTurmas();
            return true;
        }
        if (e.target.closest('#apply-filter-turma-periodo')) {
            const marcados = Array.from(document.querySelectorAll('.popover-periodo-turma-chk:checked')).map(c => c.value);
            this.filtrosTurmas.periodos = marcados.includes("Todos") ? ["Todos"] : marcados;
            document.getElementById('modal-filter-turma-periodo')?.classList.add('hidden');
            this.renderizarTabelaTurmas();
            return true;
        }
        if (e.target.closest('#apply-filter-turma-status')) {
            const marcados = Array.from(document.querySelectorAll('.popover-status-turma-chk:checked')).map(c => c.value);
            this.filtrosTurmas.status = marcados.includes("Todos") ? ["Todos"] : marcados;
            document.getElementById('modal-filter-turma-status')?.classList.add('hidden');
            this.renderizarTabelaTurmas();
            return true;
        }

        if (!e.target.closest('th') && !e.target.closest('.popover-modal')) {
            this.fecharPopovers();
        }

        return false;
    }
};