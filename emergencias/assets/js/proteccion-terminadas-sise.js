// Corte protegido de Valparaíso y control de disminuciones en FIBE terminadas.
(function protegerFibeTerminadas(){
  'use strict';

  const REGION='VALPARAISO';
  const CORTE_MS=new Date(2026,6,20,17,37,59).getTime();
  const normalizar=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/\s+/g,' ').trim().toUpperCase();

  function regionDe(d){return typeof regionCanon==='function'?regionCanon(d.region):d.region}
  function comunaDe(d){const region=regionDe(d);return typeof comunaCanon==='function'?comunaCanon(region,d.comuna):d.comuna}
  function claveRegistro(d){return `${normalizar(regionDe(d))}|${normalizar(comunaDe(d))}`}
  function esValparaiso(d){return normalizar(regionDe(d))===REGION}
  function esComunaValida(d){const comuna=String(d?.comuna||'').trim();return comuna!==''&&!comuna.includes(',')}

  function fechaHoraRegistroMs(d){
    const s=String(d.marca||d.fechaLlenado||d.fecha||'').trim();
    let m=s.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})[T,\s]+(\d{1,2}):(\d{2})/);
    if(m)return new Date(+m[3],+m[2]-1,+m[1],+m[4],+m[5]).getTime();
    m=s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})[T,\s]+(\d{1,2}):(\d{2})/);
    if(m)return new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]).getTime();
    m=s.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if(m)return new Date(+m[3],+m[2]-1,+m[1],23,59).getTime();
    m=s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if(m)return new Date(+m[1],+m[2]-1,+m[3],23,59).getTime();
    return 0;
  }

  function normalizarHistorico(d){
    const firma=String(d._firma||'').split('|').map(v=>Number(v)||0);
    return {...d,region:regionDe(d),comuna:comunaDe(d),id:String(d.id||'149162'),terminadas:Number(d.terminadas||0),digitacion:Number(d.digitacion||0),anuladas:Number(d.anuladas||0),personas:Number(d.personas||0),nna:Number(d.nna||0),mayores:Number(d.mayores||0),discapacidad:Number(d.discapacidad||0),mujer:Number(d.mujer||d.mujeres||firma[10]||0),hombre:Number(d.hombre||d.hombres||firma[11]||0),otro:Number(d.otro||d.otros||firma[12]||0),hora:'17:37',siseHora:'17:37',corteProtegidoValparaiso:true};
  }

  function corteValparaiso17(){
    const fuentes=[];
    if(typeof historialRobot!=='undefined'&&Array.isArray(historialRobot))fuentes.push(...historialRobot);
    if(typeof historialDiario!=='undefined'&&Array.isArray(historialDiario))fuentes.push(...historialDiario);
    const mapa=new Map();

    fuentes.forEach((d,i)=>{
      if(!d||!esValparaiso(d)||!esComunaValida(d))return;
      const momento=fechaHoraRegistroMs(d);
      if(!momento||momento>CORTE_MS)return;
      const tipo=normalizar(d.tipo||'SISE');
      if(tipo&&!tipo.includes('SISE')&&!tipo.includes('ROBOT')&&!tipo.includes('PLATAFORMA WEB'))return;
      const k=claveRegistro(d),prev=mapa.get(k);
      if(!prev||momento>prev._momento||(momento===prev._momento&&i>prev._orden))mapa.set(k,{...normalizarHistorico(d),_momento:momento,_orden:i});
    });
    return mapa;
  }

  function mostrarAlertaVisible(){
    if(document.getElementById('alerta-corte-valparaiso'))return;
    const shell=document.querySelector('.shell');if(!shell)return;
    const aviso=document.createElement('div');
    aviso.id='alerta-corte-valparaiso';aviso.className='note-box';aviso.style.marginBottom='16px';
    aviso.innerHTML='<strong>Alerta de consistencia — Región de Valparaíso:</strong> Las cifras de la plataforma SISE se mantienen con el último registro disponible por comuna hasta las 17:37 horas del 20-07-2026. Esta medida se aplica porque en actualizaciones posteriores se detectó una disminución no explicada en el número de FIBE terminadas. El corte se mantendrá hasta validar la causa de la variación y su eventual correspondencia con fichas anuladas.';
    const topbar=shell.querySelector('.topbar');if(topbar)topbar.insertAdjacentElement('afterend',aviso);else shell.prepend(aviso);
  }

  function instalar(){
    if(typeof sumarSisePorComuna!=='function'){setTimeout(instalar,100);return}
    if(sumarSisePorComuna.__corteValparaiso17)return;
    const original=sumarSisePorComuna;
    const protegida=function(){
      const actuales=original.apply(this,arguments)||[],corte=corteValparaiso17();
      if(!corte.size)return actuales;
      const salida=actuales.filter(d=>!esValparaiso(d));
      const actualesValpo=new Map(actuales.filter(esValparaiso).map(d=>[claveRegistro(d),d]));
      corte.forEach((historico,k)=>{const actual=actualesValpo.get(k)||{};salida.push({...actual,...historico,matrizAfectacion:actual.matrizAfectacion||historico.matrizAfectacion||{}})});
      return salida;
    };
    protegida.__corteValparaiso17=true;sumarSisePorComuna=protegida;mostrarAlertaVisible();
    if(typeof combinadosCache!=='undefined')combinadosCache=null;
    if(typeof render==='function')render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});else instalar();
})();
