// Persistência de encontros: gravação em lote, movimentação, flags, exclusões e trilha de auditoria.
Object.assign(window.ControllerEspelho, {
    // Posição do encontro na sequência da UC (ex.: "Encontro 5 de 24"), considerando os encontros atuais.
    _posicaoNaUC(encontro) {
        if(!encontro||encontro.tipo==='cancelamento')return{numero:null,total:null};
        const outros=(window.Store.dados.encontros||[]).filter(e=>e.id_turma===encontro.id_turma&&e.id_uc===encontro.id_uc&&e.tipo!=='cancelamento'&&(!encontro.id||e.id!==encontro.id));
        const lista=[...outros,encontro].sort((x,y)=>(x.data||'').localeCompare(y.data||''));
        return{numero:lista.indexOf(encontro)+1,total:lista.length};
    },
    // UM registro por item da lista do Apoio: "Excluir" (retirar do SS/SGO) ou "Inserir" (lançar no SS/SGO).
    _logAlteracao(encontro, tipo, anterior = null) {
        const usuario=window.usuarioAtual||{},acao=tipo==='Excluir'?'Excluir':'Inserir';
        const turma=(window.Store.dados.turmas||[]).find(t=>t.id===encontro.id_turma)||{},pos=this._posicaoNaUC(encontro);
        return { versao:2, acao, tipo:acao==='Excluir'?'Excluir':'Redistribuir', dados_encontro:{...encontro},
            id_turma:encontro.id_turma||'', id_encontro:encontro.id||'', data:encontro.data||'',
            area:turma.area||turma.curso_area||'', turma_referencia:turma.referencia||'', oferta:turma.oferta||'',
            numero_aula:pos.numero, total_aulas:pos.total, chave:window.Util.chaveEncontro(encontro),
            SS:false, SGO:false, status:'Pendente', criado_em:new Date().toISOString(),
            criado_por:usuario.email||'', criado_por_nome:usuario.nome_completo||usuario.nome||'' };
    },
    // Edição de um encontro existente = excluir os dados antigos + inserir os novos (dois registros).
    // Se nada mudou, os dois são idênticos e a lista do Apoio os anula automaticamente.
    _opsLogEdicao(depois, antes) {
        const ops=[],add=doc=>ops.push(this._opLog(doc));
        if(antes)add(this._logAlteracao(antes,'Excluir'));
        add(this._logAlteracao(depois,'Inserir'));
        return ops;
    },
    _tipoAlteracao(anterior, atual) {
        const ids=x=>(x?.docentes||[]).map(d=>d.id||this._norm(d.email)).sort().join('|');
        return anterior && ids(anterior)!==ids(atual) ? 'Alterar Docente' : 'Redistribuir';
    },
    // Registro de alteração com metadados: o _commitGrupos pode descartá-lo ANTES de gravar se for duplicado ou anulado.
    _opLog(doc) {
        const ref=window.db.collection('Alterações').doc(),op=b=>b.set(ref,doc);
        op.__log={ref,doc};return op;
    },
    // REGRA: alterações duplicadas ou anuladas NÃO entram no banco.
    //  - "Excluir" e "Inserir" com exatamente os mesmos dados se anulam: nenhum dos dois é gravado e o pendente que já
    //    existia é APAGADO;
    //  - alteração idêntica a uma pendente do mesmo tipo é descartada (não se grava de novo).
    // Só considera itens pendentes e sem SS/SGO marcado (nunca desfaz trabalho já iniciado pelo Apoio). Uma consulta por turma.
    async _reconciliarAlteracoes(grupos) {
        const novos=[];grupos.forEach(g=>g.forEach(op=>{if(op.__log)novos.push(op);}));
        if(!novos.length)return grupos;
        const existentes=[];
        try{
            const turmas=[...new Set(novos.map(o=>o.__log.doc.id_turma).filter(Boolean))];
            // Mantém uma consulta específica por turma (mesmo volume de documentos lidos),
            // mas limita o paralelismo para não disparar centenas de requisições simultâneas.
            for(let i=0;i<turmas.length;i+=8){
                const grupo=await Promise.all(turmas.slice(i,i+8).map(async t=>{
                    const snap=await window.db.collection('Alterações').where('id_turma','==',t).where('status','==','Pendente').get();
                    return snap.docs.map(d=>({id:d.id,...d.data()}));
                }));
                grupo.forEach(docs=>existentes.push(...docs));
            }
        }catch(err){console.warn('[Alterações] Verificação de duplicidade não concluída; gravando normalmente:',err);return grupos;}

        const encontroVivo=id=>(window.Store.dados.encontros||[]).find(e=>e.id===id);
        const itens=[];
        existentes.sort((a,b)=>(a.criado_em||'').localeCompare(b.criado_em||'')).forEach(e=>{
            if(!e.dados_encontro||(!e.acao&&e.dados_encontro_anterior&&e.tipo!=='Excluir'))return;   // registro antigo de edição (2 itens): não mexe
            const acao=e.acao||(e.tipo==='Excluir'?'Excluir':'Inserir'),enc=acao==='Inserir'?encontroVivo(e.dados_encontro.id):null;
            const iniciado=e.SS===true||e.SGO===true||(enc&&(enc.SS===true||enc.SGO===true));
            itens.push({existente:e,acao,chave:window.Util.chaveEncontro(e.dados_encontro),elegivel:!iniciado});
        });
        novos.forEach(op=>{
            const d=op.__log.doc,iniciado=d.acao==='Excluir'&&(d.dados_encontro?.SS===true||d.dados_encontro?.SGO===true);
            itens.push({op,acao:d.acao,chave:d.chave,elegivel:!iniciado});
        });

        const abertos=new Map(),descartar=new Set(),apagar=new Set();
        const remover=it=>{if(it.op)descartar.add(it.op);else apagar.add(it.existente.id);};
        for(const it of itens){
            if(!it.elegivel)continue;
            const pilha=abertos.get(it.chave)||{Excluir:[],Inserir:[]};abertos.set(it.chave,pilha);
            const oposto=it.acao==='Excluir'?'Inserir':'Excluir';
            if(pilha[oposto].length){remover(it);remover(pilha[oposto].shift());}        // exclusão cancela inclusão
            else if(pilha[it.acao].length)remover(it);                                    // repetida
            else pilha[it.acao].push(it);
        }
        if(!descartar.size&&!apagar.size)return grupos;
        const novosGrupos=grupos.map(g=>g.map(op=>descartar.has(op)?(()=>{}):op));
        const ids=[...apagar];
        for(let i=0;i<ids.length;i+=400)novosGrupos.push(ids.slice(i,i+400).map(id=>b=>b.delete(window.db.collection('Alterações').doc(id))));
        return novosGrupos;
    },
    async _commitGrupos(grupos) {
        grupos=await this._reconciliarAlteracoes(grupos);
        let batch=window.db.batch(), count=0;
        for (const ops of grupos) {
            if (ops.length > 450) throw new Error('Lote de gravação excede o limite seguro.');
            if (count && count+ops.length>450) { await batch.commit(); batch=window.db.batch(); count=0; }
            ops.forEach(fn=>fn(batch)); count+=ops.length;
        }
        if (count) await batch.commit();
    },
    _docRefEncontro(id) { return window.db.collection(this.colecaoEncontros).doc(id); },
    async ignorarExcecaoTurma(idTurma, dataExcecao, cacheTurmas) {
        await window.Store.garantirPronto(); const turma=this._buscarTurma(cacheTurmas,idTurma);
        const ignoradas=Array.isArray(turma.excecoes_ignoradas)?[...turma.excecoes_ignoradas]:[];
        if (!ignoradas.includes(dataExcecao)) { ignoradas.push(dataExcecao); const atualizado_em=new Date().toISOString(); await window.db.collection('turmas').doc(idTurma).update({excecoes_ignoradas:ignoradas,atualizado_em}); window.Store.upsertLocal('turmas',{...turma,excecoes_ignoradas:ignoradas,atualizado_em}); }
    },
    async salvarEncontrosLote(registros, cacheTurmas) {
        await window.Store.garantirPronto(); if (!Array.isArray(registros)||!registros.length) throw new Error('Não há encontros para gravar.');
        const preparados=registros.map(r=>{const t=this._buscarTurma(cacheTurmas,r.id_turma);const p=this._normalizarEncontro(r,t);p.SS=false;p.SGO=false;p.criado_em=new Date().toISOString();return p;});
        this._validarDatasETurmas(preparados,cacheTurmas);this._validarLimiteUC(preparados);this._validarConflitos(preparados);
        const refs=preparados.map(()=>window.db.collection(this.colecaoEncontros).doc()), grupos=[];
        for(let i=0;i<preparados.length;i++){const p=preparados[i],ref=refs[i];grupos.push([b=>b.set(ref,p),this._opLog(this._logAlteracao({...p,id:ref.id},'Redistribuir'))]);}
        const patchesHoras=this._anexarPatchesHoras(grupos,preparados.map(depois=>({antes:null,depois})));await this._commitGrupos(grupos);this._sincronizarPatchesHoras(patchesHoras);preparados.forEach((p,i)=>window.Store.upsertLocal('encontros',{id:refs[i].id,...p}));return preparados.length;
    },
    async salvarEdicaoEmLote(alvos, payload, cacheTurmas) {
        await window.Store.garantirPronto();if(!Array.isArray(alvos)||!alvos.length)throw new Error('Selecione ao menos uma data ou encontro.');
        const encontrados=window.Store.dados.encontros||[], antigos=[], preparados=[];
        for(const a of alvos){const t=this._buscarTurma(cacheTurmas,a.id_turma);const old=a.id?encontrados.find(e=>e.id===a.id):null;if(a.id&&(!old||old.id_turma!==a.id_turma))throw new Error('Um dos encontros selecionados não foi encontrado para esta turma.');if(old&&old.data!==a.data)throw new Error('A data do encontro selecionado mudou; atualize o mapa.');const p=this._normalizarEncontro({...payload,id_turma:a.id_turma,data:a.data},t);p.SS=false;p.SGO=false;if(!old)p.criado_em=new Date().toISOString();antigos.push(old);preparados.push(p);}
        const ids=new Set(antigos.filter(Boolean).map(e=>e.id));this._validarDatasETurmas(preparados,cacheTurmas,ids);this._validarLimiteUC(preparados,ids);this._validarConflitos(preparados,ids);
        const grupos=[],refs=[];
        for(let i=0;i<preparados.length;i++){const p=preparados[i],old=antigos[i],ref=old?this._docRefEncontro(old.id):window.db.collection(this.colecaoEncontros).doc();refs.push(ref);const full={...p,...(old?.criado_em?{criado_em:old.criado_em}:{})};grupos.push([b=>old?b.update(ref,p):b.set(ref,p),...this._opsLogEdicao({...full,id:ref.id},old)]);preparados[i]=full;}
        const patchesHoras=this._anexarPatchesHoras(grupos,preparados.map((depois,i)=>({antes:antigos[i],depois})));await this._commitGrupos(grupos);this._sincronizarPatchesHoras(patchesHoras);preparados.forEach((p,i)=>window.Store.upsertLocal('encontros',{...p,id:refs[i].id}));return preparados.length;
    },
    async salvarEncontro(dados, cacheTurmas, encontroId=null) {
        await window.Store.garantirPronto();const turma=this._buscarTurma(cacheTurmas,dados.id_turma),old=encontroId?(window.Store.dados.encontros||[]).find(e=>e.id===encontroId):null;if(encontroId&&(!old||old.id_turma!==turma.id))throw new Error('Encontro não encontrado para esta turma.');
        const p=this._normalizarEncontro(dados,turma);p.SS=false;p.SGO=false;const ids=new Set(old?[old.id]:[]);this._validarDatasETurmas([p],cacheTurmas,ids);this._validarLimiteUC([p],ids);this._validarConflitos([p],ids);
        const ref=old?this._docRefEncontro(old.id):window.db.collection(this.colecaoEncontros).doc();p.atualizado_em=new Date().toISOString();if(!old)p.criado_em=p.atualizado_em;const grupos=[[b=>old?b.update(ref,p):b.set(ref,p),...this._opsLogEdicao({...p,id:ref.id},old)]];const patchesHoras=this._anexarPatchesHoras(grupos,[{antes:old,depois:p}]);await this._commitGrupos(grupos);this._sincronizarPatchesHoras(patchesHoras);window.Store.upsertLocal('encontros',{...p,id:ref.id});
    },
    // Movimentação de encontros (arrastar e soltar).
    // Fluxo: o encontro movido sai da data original e entra na nova; o encontro sobreposto (se houver) só é
    // excluído AQUI, ao salvar, nunca durante o arrasto. Cada alteração gera o seu próprio registro em
    // "Alterações": 'Excluir' para cada encontro excluído (inclusive a data original) e 'Redistribuir' para cada inserção.
    // "exclusoes" lista encontros sobrepostos; cada movimento também pode trazer "substitui" (id do encontro sobreposto).
    async salvarMovimentos(movimentos, cacheTurmas, excecoes=[], exclusoes=[]) {
        await window.Store.garantirPronto();
        if(!Array.isArray(movimentos)||!movimentos.length)return;
        const store=window.Store.dados.encontros||[],porId=new Map(store.map(e=>[e.id,e])),ids=new Set(movimentos.map(m=>m.id));
        if(ids.size!==movimentos.length)throw new Error('Encontro duplicado na operação.');

        const idsExcluir=new Set([...(exclusoes||[]),...movimentos.map(m=>m.substitui).filter(Boolean)]);
        if([...idsExcluir].some(id=>ids.has(id)))throw new Error('Um encontro não pode ser movido e excluído na mesma operação.');
        const hoje=this._hojeISO(),substituidos=[];
        for(const id of idsExcluir){
            const ocupante=porId.get(id);
            if(!ocupante)throw new Error('Um encontro a ser substituído não existe mais; atualize o mapa.');
            this._validarEdicao(this._buscarTurma(cacheTurmas,ocupante.id_turma));
            if(ocupante.tipo==='cancelamento')throw new Error('Cancelamentos não podem ser substituídos por arraste.');
            if(ocupante.data<=hoje)throw new Error('Só é possível substituir encontros de datas futuras; hoje e datas passadas são preservados.');
            substituidos.push(ocupante);
        }

        const preparados=[],antigos=[],mudancasAgenda=[];
        for(const m of movimentos){
            const old=porId.get(m.id);if(!old)throw new Error('Encontro não encontrado.');
            const move=m.data&&m.data!==old.data;
            if(move){
                const turma=this._buscarTurma(cacheTurmas,old.id_turma);this._validarEdicao(turma);
                if(old.tipo==='cancelamento')throw new Error('Cancelamentos não podem ser movidos.');
                if(!this._dataValida(m.data))throw new Error('Data inválida.');
                if((turma.d_inicio&&m.data<turma.d_inicio)||(turma.d_termino&&m.data>turma.d_termino))throw new Error('Data fora do período da turma.');
                if(this._excecaoAtiva(m.data,turma))throw new Error(`A data ${m.data} está bloqueada por exceção.`);
                preparados.push({...old,data:m.data,SS:false,SGO:false,atualizado_em:new Date().toISOString()});mudancasAgenda.push(true);
            }else{
                this._validarFlags();
                const p={...old};
                if(Object.prototype.hasOwnProperty.call(m,'SS'))p.SS=m.SS===true;
                if(Object.prototype.hasOwnProperty.call(m,'SGO'))p.SGO=m.SGO===true;
                p.atualizado_em=new Date().toISOString();preparados.push(p);mudancasAgenda.push(false);
            }
            antigos.push(old);
        }

        // Ocupação e conflitos: ignoram os próprios movidos e os encontros que serão excluídos nesta operação.
        const ignorar=new Set([...ids,...idsExcluir]);
        const candidatos=preparados.filter((_,i)=>mudancasAgenda[i]);
        if(candidatos.length){
            const chaves=new Set();
            for(const p of candidatos){
                const k=`${p.id_turma}|${p.data}`;
                if(chaves.has(k)||store.some(e=>!ignorar.has(e.id)&&`${e.id_turma}|${e.data}`===k))throw new Error(`Data da turma já ocupada: ${p.data}.`);
                chaves.add(k);this._validarDocentes(p,(window.Store.dados.turmas||[]).find(t=>t.id===p.id_turma));
            }
            this._validarConflitos(candidatos,ignorar);
        }

        const grupos=[];
        for(const ocupante of substituidos){
            grupos.push([b=>b.delete(this._docRefEncontro(ocupante.id)),this._opLog(this._logAlteracao(ocupante,'Excluir',ocupante))]);
        }
        for(let i=0;i<preparados.length;i++){
            const p=preparados[i],old=antigos[i];
            if(!mudancasAgenda[i]&&p.SS===old.SS&&p.SGO===old.SGO)continue;
            const ref=this._docRefEncontro(old.id);
            if(mudancasAgenda[i]){
                                const patch={data:p.data,SS:false,SGO:false,atualizado_em:p.atualizado_em};
                grupos.push([b=>b.update(ref,patch),this._opLog(this._logAlteracao(old,'Excluir',old)),this._opLog(this._logAlteracao(p,'Redistribuir'))]);
            }else grupos.push([b=>b.update(ref,{SS:p.SS,SGO:p.SGO,atualizado_em:p.atualizado_em})]);
        }
        const pares=[...preparados.map((depois,i)=>mudancasAgenda[i]?{antes:antigos[i],depois}:null).filter(Boolean),...substituidos.map(o=>({antes:o,depois:null}))];
        const patchesHoras=this._anexarPatchesHoras(grupos,pares);
        await this._commitGrupos(grupos);
        this._sincronizarPatchesHoras(patchesHoras);
        substituidos.forEach(o=>window.Store.removerLocal('encontros',o.id));
        preparados.forEach(p=>window.Store.upsertLocal('encontros',p));
    },
    async moverEncontro(encontro,novaData,cacheTurmas){return this.salvarMovimentos([{id:encontro.id,id_turma:encontro.id_turma,data:novaData}],cacheTurmas);},
    async atualizarFlagsEncontro(encontroId, flags) {
        await window.Store.garantirPronto();this._validarFlags();const encontro=(window.Store.dados.encontros||[]).find(e=>e.id===encontroId);if(!encontro)throw new Error('Encontro não encontrado.');const patch={};for(const key of ['SS','SGO'])if(Object.prototype.hasOwnProperty.call(flags||{},key))patch[key]=flags[key]===true;if(!Object.keys(patch).length)throw new Error('Nenhum campo SS/SGO válido foi informado.');patch.atualizado_em=new Date().toISOString();await this._docRefEncontro(encontroId).update(patch);const atualizado={...encontro,...patch};window.Store.upsertLocal('encontros',atualizado);return atualizado;
    },
    async atualizarFlagsEncontrosLote(idTurma, ids, flags) {
        await window.Store.garantirPronto();
        if(!['apoio','admin'].includes(window.usuarioAtual?.cargo))throw new Error('Somente Apoio Técnico ou Admin pode aplicar SS/SGO em lote.');
        if(!(window.Store.dados.turmas||[]).some(t=>t.id===idTurma))throw new Error('Turma não encontrada ou sem acesso.');
        const patch={};for(const key of ['SS','SGO'])if(Object.prototype.hasOwnProperty.call(flags||{},key)){if(typeof flags[key]!=='boolean')throw new Error(`Valor inválido para ${key}.`);patch[key]=flags[key];}
        if(!Object.keys(patch).length)throw new Error('Escolha ativar ou desativar SS ou SGO.');
        const idsUnicos=[...new Set(Array.isArray(ids)?ids:[])];if(!idsUnicos.length)throw new Error('Não há encontros selecionados para atualizar.');
        const todos=window.Store.dados.encontros||[],porId=new Map(todos.map(e=>[e.id,e]));
        const encontros=idsUnicos.map(id=>porId.get(id));
        if(encontros.some(e=>!e||e.id_turma!==idTurma||e.tipo==='cancelamento'))throw new Error('Um encontro alvo não está mais disponível; atualize o mapa e tente novamente.');
        const atualizado_em=new Date().toISOString(),alterados=encontros.filter(e=>Object.entries(patch).some(([k,v])=>e[k]!==v)).map(e=>({...e,...patch,atualizado_em}));
        if(!alterados.length)return [];
        const grupos=alterados.map(e=>[batch=>batch.update(this._docRefEncontro(e.id),{...patch,atualizado_em})]);
        await this._commitGrupos(grupos);alterados.forEach(e=>window.Store.upsertLocal('encontros',e));return alterados;
    },
    async excluirEncontro(encontro,cacheTurmas){
        await window.Store.garantirPronto();const turma=this._buscarTurma(cacheTurmas,encontro.id_turma);this._validarEdicao(turma);const atual=(window.Store.dados.encontros||[]).find(e=>e.id===encontro.id);if(!atual)throw new Error('Encontro não encontrado.');if(atual.data<=this._hojeISO())throw new Error('Só é permitido excluir encontros e cancelamentos de datas futuras; hoje e datas passadas são preservados.');const grupos=[[this._opLog(this._logAlteracao(atual,'Excluir',atual)),b=>b.delete(this._docRefEncontro(atual.id))]];const patchesHoras=this._anexarPatchesHoras(grupos,[{antes:atual,depois:null}]);await this._commitGrupos(grupos);this._sincronizarPatchesHoras(patchesHoras);window.Store.removerLocal('encontros',atual.id);
    },
    async excluirEncontrosSelecionados(alvos,cacheTurmas){
        await window.Store.garantirPronto();if(!Array.isArray(alvos)||!alvos.length)throw new Error('Não há encontros selecionados para excluir.');
        const encontros=window.Store.dados.encontros||[],vistos=new Set(),docs=[];
        for(const alvo of alvos){if(!alvo.id||vistos.has(alvo.id))continue;vistos.add(alvo.id);const atual=encontros.find(e=>e.id===alvo.id);if(!atual||atual.id_turma!==alvo.id_turma||atual.data!==alvo.data)throw new Error('Um encontro selecionado mudou ou não está mais disponível; atualize o mapa.');this._buscarTurma(cacheTurmas,atual.id_turma);if(atual.tipo==='cancelamento'||atual.data<=this._hojeISO())throw new Error('A exclusão em lote considera somente encontros de datas futuras; cancelamentos, hoje e datas passadas são preservados.');docs.push(atual);}
        if(!docs.length)throw new Error('Selecione ao menos um encontro existente em data futura.');
        const grupos=docs.map(encontro=>[this._opLog(this._logAlteracao(encontro,'Excluir',encontro)),b=>b.delete(this._docRefEncontro(encontro.id))]);
        const patchesHoras=this._anexarPatchesHoras(grupos,docs.map(antes=>({antes,depois:null})));await this._commitGrupos(grupos);this._sincronizarPatchesHoras(patchesHoras);docs.forEach(encontro=>window.Store.removerLocal('encontros',encontro.id));return docs.length;
    },
    async excluirEncontrosDaUC(idTurma,idUC,cacheTurmas){
        await window.Store.garantirPronto();const turma=this._buscarTurma(cacheTurmas,idTurma);if(!idUC)throw new Error('Selecione uma UC antes de remover encontros.');const todas=idUC==='TODAS',uc=this._ucsDaTurma(turma).find(x=>(x.id_uc_base||x.id)===idUC);if(!todas&&!uc)throw new Error('A UC selecionada não pertence a esta turma.');const docs=(window.Store.dados.encontros||[]).filter(e=>e.id_turma===turma.id&&e.tipo!=='cancelamento'&&e.data>this._hojeISO()&&(todas||e.id_uc===idUC));const grupos=docs.map(d=>[this._opLog(this._logAlteracao(d,'Excluir',d)),b=>b.delete(this._docRefEncontro(d.id))]);const patchesHoras=this._anexarPatchesHoras(grupos,docs.map(antes=>({antes,depois:null})));await this._commitGrupos(grupos);this._sincronizarPatchesHoras(patchesHoras);docs.forEach(d=>window.Store.removerLocal('encontros',d.id));return docs.length;
    },
});
