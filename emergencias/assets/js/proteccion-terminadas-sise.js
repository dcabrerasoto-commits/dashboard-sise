// Protección de consistencia para FIBE terminadas.
// Una nueva descarga SISE no puede reducir silenciosamente el número ya observado
// para una misma región y comuna durante este monitoreo.
(function protegerFibeTerminadas(){
  'use strict';

  const normalizar=t=>String(t||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[’']/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();

  function claveRegistro(d){
    const region=typeof regionCanon==='function'?regionCanon(d.region):d.region;
    const comuna=typeof comunaCanon==='function'?comunaCanon(region,d.comuna):d.comuna;
    return `${normalizar(region)}|${normalizar(comuna)}`;
  }

  function esComunaValida(d){
    const comuna=String(d?.comuna||'').trim();
    return comuna!==''&&!comuna.includes(',');
  }

  function maximosHistoricos(){
    const maximos=new Map();
    const fuentes=[];
    if(typeof historialRobot!=='undefined'&&Array.isArray(historialRobot))fuentes.push(...historialRobot);
    if(typeof historialDiario!=='undefined'&&Array.isArray(historialDiario))fuentes.push(...historialDiario.filter(d=>{
      const tipo=normalizar(d.tipo);
      return tipo.includes('SISE')||tipo.includes('ROBOT');
    }));

    fuentes.forEach(d=>{
      if(!d||!esComunaValida(d))return;
      const valor=Number(d.terminadas||0);
      if(!Number.isFinite(valor)||valor<0)return;
      const k=claveRegistro(d);
      maximos.set(k,Math.max(maximos.get(k)||0,valor));
    });
    return maximos;
  }

  function agregarAlerta(d,actual,protegido){
    if(typeof alertasSise==='undefined'||!Array.isArray(alertasSise))return;
    const existe=alertasSise.some(a=>a&&a.tipo==='Disminución bloqueada'&&claveRegistro(a)===claveRegistro(d)&&Number(a.valorActual)===actual);
    if(existe)return;
    alertasSise.push({
      tipo:'Disminución bloqueada',
      id:d.id||'',
      region:d.region||'',
      comuna:d.comuna||'',
      campo:'FIBE terminadas',
      valorAnterior:protegido,
      valorActual:actual
    });
  }

  function instalar(){
    if(typeof sumarSisePorComuna!=='function'){
      setTimeout(instalar,100);
      return;
    }
    if(sumarSisePorComuna.__proteccionTerminadas)return;

    const original=sumarSisePorComuna;
    const protegida=function(){
      const filas=original.apply(this,arguments)||[];
      const maximos=maximosHistoricos();
      return filas.map(d=>{
        if(!d||!esComunaValida(d))return d;
        const actual=Number(d.terminadas||0);
        const anterior=maximos.get(claveRegistro(d))||0;
        if(anterior>actual){
          agregarAlerta(d,actual,anterior);
          return {...d,terminadas:anterior,terminadasSiseActual:actual,terminadasProtegidas:true};
        }
        return d;
      });
    };

    protegida.__proteccionTerminadas=true;
    sumarSisePorComuna=protegida;
    if(typeof combinadosCache!=='undefined')combinadosCache=null;
    if(typeof render==='function')render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});
  else instalar();
})();
