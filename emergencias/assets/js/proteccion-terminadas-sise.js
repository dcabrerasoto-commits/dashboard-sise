// Corte protegido de Valparaíso y control de disminuciones en FIBE terminadas.
(function protegerFibeTerminadas(){
  'use strict';

  const REGION='VALPARAISO';
  const HORA_CORTE='17:05';
  const TOTAL_TERMINADAS_ESPERADO=481;
  const SNAPSHOT_URL='https://raw.githubusercontent.com/dcabrerasoto-commits/dashboard-sise/7745f139b769741f9f555a3695f3477824d0d256/emergencias/assets/data/monitoreo-sise.json';
  let snapshotValparaiso=[];
  const normalizar=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/\s+/g,' ').trim().toUpperCase();

  function regionDe(d){return typeof regionCanon==='function'?regionCanon(d.region):d.region}
  function comunaDe(d){const region=regionDe(d);return typeof comunaCanon==='function'?comunaCanon(region,d.comuna):d.comuna}
  function claveRegistro(d){return `${normalizar(regionDe(d))}|${normalizar(comunaDe(d))}`}
  function esValparaiso(d){return normalizar(regionDe(d))===REGION}
  function esComunaValida(d){const comuna=String(d?.comuna||'').trim();return comuna!==''&&!comuna.includes(',')}

  function normalizarFila(d){
    return {...d,region:regionDe(d),comuna:comunaDe(d),terminadas:Number(d.terminadas||0),digitacion:Number(d.digitacion||0),anuladas:Number(d.anuladas||0),personas:Number(d.personas||0),nna:Number(d.nna||0),mayores:Number(d.mayores||0),discapacidad:Number(d.discapacidad||0),mujer:Number(d.mujer||d.mujeres||0),hombre:Number(d.hombre||d.hombres||0),otro:Number(d.otro||d.otros||0),hora:HORA_CORTE,siseHora:HORA_CORTE,corteProtegidoValparaiso:true};
  }

  function encontrarFilas(obj){
    let mejor=[];
    function recorrer(v){
      if(Array.isArray(v)){
        const candidatas=v.filter(x=>x&&typeof x==='object'&&'region'in x&&'comuna'in x&&'terminadas'in x);
        if(candidatas.length>mejor.length)mejor=candidatas;
        v.forEach(recorrer);
      }else if(v&&typeof v==='object')Object.values(v).forEach(recorrer);
    }
    recorrer(obj);
    return mejor;
  }

  async function cargarSnapshot(){
    try{
      const r=await fetch(SNAPSHOT_URL,{cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const data=await r.json();
      snapshotValparaiso=encontrarFilas(data).filter(d=>esValparaiso(d)&&esComunaValida(d)).map(normalizarFila);
    }catch(e){console.warn('No se pudo cargar el corte comunal exacto de Valparaíso.',e)}
  }

  function corteValparaiso(){
    const mapa=new Map();
    snapshotValparaiso.forEach((d,i)=>{
      const k=claveRegistro(d),prev=mapa.get(k);
      if(!prev)mapa.set(k,{...d,_orden:i});
      else mapa.set(k,{...prev,...d,terminadas:Number(prev.terminadas||0)+Number(d.terminadas||0),digitacion:Number(prev.digitacion||0)+Number(d.digitacion||0),anuladas:Number(prev.anuladas||0)+Number(d.anuladas||0),personas:Number(prev.personas||0)+Number(d.personas||0),nna:Number(prev.nna||0)+Number(d.nna||0),mayores:Number(prev.mayores||0)+Number(d.mayores||0),discapacidad:Number(prev.discapacidad||0)+Number(d.discapacidad||0)});
    });
    return mapa;
  }

  function mostrarAlertaVisible(){
    document.getElementById('alerta-corte-valparaiso')?.remove();
    const ancla=document.getElementById('alertasContent');if(!ancla)return;
    const aviso=document.createElement('div');
    aviso.id='alerta-corte-valparaiso';aviso.className='note-box';aviso.style.margin='14px 0 18px';
    aviso.innerHTML='<strong>Alerta:</strong> Para la Región de Valparaíso se mantienen las cifras comunales correspondientes al corte SISE de las 17:05 horas del 20-07-2026. Esta medida se aplica debido a que en actualizaciones posteriores se detectó una disminución no explicada en el número de FIBE terminadas.';
    ancla.insertAdjacentElement('beforebegin',aviso);
  }

  async function instalar(){
    if(typeof sumarSisePorComuna!=='function'||typeof resumenRegion!=='function'||typeof totales!=='function'){setTimeout(instalar,100);return}
    if(sumarSisePorComuna.__corteValparaiso)return;
    await cargarSnapshot();
    const sumarOriginal=sumarSisePorComuna,resumenOriginal=resumenRegion,totalesOriginal=totales,horaOriginal=typeof horaRegion==='function'?horaRegion:null;

    sumarSisePorComuna=function(){
      const actuales=sumarOriginal.apply(this,arguments)||[],corte=corteValparaiso();
      if(!corte.size)return actuales;
      const salida=actuales.filter(d=>!esValparaiso(d));
      corte.forEach(historico=>salida.push({...historico}));
      return salida;
    };
    sumarSisePorComuna.__corteValparaiso=true;

    resumenRegion=function(region){const r=resumenOriginal.apply(this,arguments);if(normalizar(region)===REGION)r.te=TOTAL_TERMINADAS_ESPERADO;return r};
    totales=function(){const t=totalesOriginal.apply(this,arguments),valpo=(typeof combinados==='function'?combinados():[]).filter(esValparaiso).reduce((s,d)=>s+Number(d.terminadas||0),0);t.te+=TOTAL_TERMINADAS_ESPERADO-valpo;return t};
    horaRegion=function(region){if(normalizar(region)===REGION)return HORA_CORTE;return horaOriginal?horaOriginal.apply(this,arguments):''};

    mostrarAlertaVisible();
    if(typeof combinadosCache!=='undefined')combinadosCache=null;
    if(typeof render==='function')render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});else instalar();
})();
