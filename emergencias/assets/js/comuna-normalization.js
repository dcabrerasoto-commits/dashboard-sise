// Normalizaciones para evitar duplicados comunales y pérdidas en la matriz de afectación.
(function normalizarUISE(){
  function clave(valor){
    return String(valor || '')
      .replace(/Ã[’'\u0092]?iqu[eé]n/gi, 'Ñiquén')
      .replace(/Ã±/g, 'ñ').replace(/Ã‘/g, 'Ñ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[’'`´]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function aliasComuna(valor){
    const k=clave(valor);
    if(k==='MARCHIGUE'||k==='MARCHIHUE')return 'Marchihue';
    if(k==='TREHUACO'||k==='TREGUACO')return 'Treguaco';
    if(k==='NIQUEN'||k.includes('IQUEN'))return 'Ñiquén';
    return valor;
  }

  function canonEnseres(valor){
    const k=clave(valor);
    if(/^NO AFECTAD/.test(k))return 'No afectados';
    if(/^POCO AFECTAD/.test(k))return 'Poco afectados';
    if(/^MEDIANAMENTE AFECTAD/.test(k))return 'Medianamente afectados';
    if(/^MUY AFECTAD/.test(k))return 'Muy afectados';
    return '';
  }

  function canonVivienda(valor){
    const k=clave(valor);
    if(/^NO AFECTAD/.test(k))return 'No afectada';
    if(/^POCO AFECTAD/.test(k))return 'Poco afectada';
    if(/^MEDIANAMENTE AFECTAD/.test(k))return 'Medianamente afectada';
    if(/^MUY AFECTAD/.test(k))return 'Muy afectada';
    if(/^DESTRUID/.test(k))return 'Destruida';
    return '';
  }

  function instalar(){
    let listo=true;

    if(typeof window.comunaCanon==='function'&&!window.comunaCanon.__normalizacionUISE){
      const original=window.comunaCanon;
      const normalizada=function(region,comuna){return original(region,aliasComuna(comuna));};
      normalizada.__normalizacionUISE=true;
      window.comunaCanon=normalizada;
    }else if(typeof window.comunaCanon!=='function')listo=false;

    if(typeof window.matrizAfectacion==='function'&&!window.matrizAfectacion.__normalizacionUISE){
      const filas=['No afectados','Poco afectados','Medianamente afectados','Muy afectados'];
      const cols=['No afectada','Poco afectada','Medianamente afectada','Muy afectada','Destruida'];
      const corregida=function(datos){
        const m={};
        datos.forEach(d=>{
          const x=d.matrizAfectacion||d.matriz||{};
          Object.entries(x).forEach(([k,v])=>{
            const partes=String(k).split('|');
            const f=canonEnseres(partes[0]);
            const c=canonVivienda(partes.slice(1).join('|'));
            if(f&&c)m[`${f}|${c}`]=(m[`${f}|${c}`]||0)+(+v||0);
            else if(+v)console.warn('Categoría de afectación no reconocida:',k,v);
          });
        });

        let totalGeneral=0;
        const totalesCol=cols.map(()=>0),totalesFila=[];
        const body=filas.map(f=>{
          let totalFila=0;
          const tds=cols.map((c,i)=>{const v=m[`${f}|${c}`]||0;totalFila+=v;totalesCol[i]+=v;return `<td>${fmt(v)}</td>`;}).join('');
          totalesFila.push(totalFila);totalGeneral+=totalFila;
          return `<tr><td>${f}</td>${tds}<td class="row-total">${fmt(totalFila)}</td></tr>`;
        }).join('');

        const esperado=datos.reduce((s,d)=>s+(+(d.terminadas||0)),0);
        if(totalGeneral!==esperado)console.warn('Diferencia matriz/FIBE terminadas',{matriz:totalGeneral,terminadas:esperado,diferencia:esperado-totalGeneral});
        const pct=v=>totalGeneral?`${Math.round(v*1000/totalGeneral)/10}%`:'0%';
        const card=(label,v,i)=>`<div class="damage-card c${i}"><span>${label}</span><strong>${fmt(v)}</strong><small>${pct(v)} del total</small></div>`;
        const cardsVivienda=cols.map((c,i)=>card(c,totalesCol[i],i)).join('')+`<div class="damage-card total"><span>Total hogares</span><strong>${fmt(totalGeneral)}</strong><small>100% del total</small></div>`;
        const cardsEnseres=filas.map((f,i)=>card(f,totalesFila[i],i)).join('')+`<div class="damage-card total"><span>Total hogares</span><strong>${fmt(totalGeneral)}</strong><small>100% del total</small></div>`;
        return `<p class="damage-title vivienda">Estado de vivienda</p><div class="damage-cards vivienda">${cardsVivienda}</div><p class="damage-title enseres">Estado de enseres</p><div class="damage-cards enseres">${cardsEnseres}</div><table class="commune-table affect-matrix"><colgroup>${Array(7).fill('<col>').join('')}</colgroup><thead><tr><th class="damage-head" rowspan="2"><strong>Apreciación del daño FIBE</strong><small>Estado de enseres</small></th><th colspan="6">Estado de vivienda</th></tr><tr>${cols.map(c=>`<th>${c}</th>`).join('')}<th>Total</th></tr></thead><tbody>${body}<tr class="national-row"><td>Total</td>${totalesCol.map(v=>`<td>${fmt(v)}</td>`).join('')}<td>${fmt(totalGeneral)}</td></tr></tbody></table>`;
      };
      corregida.__normalizacionUISE=true;
      window.matrizAfectacion=corregida;
    }else if(typeof window.matrizAfectacion!=='function')listo=false;

    if(!listo){setTimeout(instalar,50);return;}
    if(typeof window.render==='function'){try{window.render();}catch(e){console.warn('No fue posible refrescar la vista.',e);}}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});
  else instalar();
})();
