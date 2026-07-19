// Unificación del evento de Valparaíso.
// Todos los IDs comunales anteriores al evento 149162 se consolidan bajo ese ID,
// manteniendo intacta la comuna real de cada registro.
(function configurarEventoUnificadoValparaiso(){
  'use strict';

  const REGION_VALPARAISO='VALPARAISO';
  const ID_UNIFICADO='149162';
  let instalado=false;
  let actualizandoSelector=false;

  const clave=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').toUpperCase().trim();
  const esRegionValparaiso=r=>clave(r)===REGION_VALPARAISO;

  function esIdAnteriorValparaiso(id){
    const numero=Number(String(id||'').trim());
    return Number.isInteger(numero)&&numero>0&&numero<Number(ID_UNIFICADO);
  }

  function esComunaRealValparaiso(comuna){
    const valor=clave(comuna);
    if(!valor)return false;
    const lista=(typeof comunasPorRegion!=='undefined'&&comunasPorRegion['Valparaíso'])||[];
    return lista.some(nombre=>clave(nombre)===valor);
  }

  function esFilaAgregadaValparaiso(registro){
    if(!registro||!esRegionValparaiso(registro.region))return false;
    const comuna=String(registro.comuna||'').trim();
    if(!comuna)return false;
    return !esComunaRealValparaiso(comuna);
  }

  function normalizarRegistro(registro){
    if(!registro||!esRegionValparaiso(registro.region)||!esIdAnteriorValparaiso(registro.id))return registro;
    return {...registro,id:ID_UNIFICADO};
  }

  function unificarDatos(){
    try{
      if(typeof datosSise!=='undefined'&&Array.isArray(datosSise)){
        datosSise=datosSise
          .map(normalizarRegistro)
          .filter(registro=>!esFilaAgregadaValparaiso(registro));
      }

      if(typeof eventosInfo!=='undefined'&&Array.isArray(eventosInfo)){
        eventosInfo=eventosInfo.map(e=>{
          if(!e||!esRegionValparaiso(e.region)||(!esIdAnteriorValparaiso(e.id)&&String(e.id)!==ID_UNIFICADO))return e;
          return {...e,id:ID_UNIFICADO,nombre:'Evento unificado',comunas:''};
        });
        const vistos=new Set();
        eventosInfo=eventosInfo.filter(e=>{
          const k=[String(e.id||''),clave(e.region||''),clave(e.comunas||'')].join('|');
          if(vistos.has(k))return false;
          vistos.add(k);
          return true;
        });
      }

      if(typeof reportesRegionales!=='undefined'&&Array.isArray(reportesRegionales)){
        reportesRegionales=reportesRegionales.map(normalizarRegistro);
        localStorage.setItem('uise-reportes-regionales',JSON.stringify(reportesRegionales));
      }

      if(typeof historialRobot!=='undefined'&&Array.isArray(historialRobot)){
        historialRobot=historialRobot
          .map(normalizarRegistro)
          .filter(registro=>!esFilaAgregadaValparaiso(registro));
      }

      if(typeof historialDiario!=='undefined'&&Array.isArray(historialDiario)){
        historialDiario=historialDiario
          .map(normalizarRegistro)
          .filter(registro=>!esFilaAgregadaValparaiso(registro));
        localStorage.setItem('uise-historico-diario',JSON.stringify(historialDiario));
      }

      if(typeof eventosDetectados!=='undefined'&&Array.isArray(eventosDetectados)){
        eventosDetectados=[...new Set(eventosDetectados.map(id=>esIdAnteriorValparaiso(id)?ID_UNIFICADO:String(id)))];
      }
    }catch(error){
      console.warn('No se pudo completar la unificación de Valparaíso.',error);
    }
  }

  function construirSelectorValparaiso(forzar=false){
    const region=document.getElementById('region');
    const selector=document.getElementById('eventoSelector');
    const manual=document.getElementById('eventoManual');
    if(!region||!selector||!esRegionValparaiso(region.value)||actualizandoSelector)return;

    actualizandoSelector=true;
    const anterior=selector.value;
    selector.innerHTML=[
      '<option value="">Seleccione el ID</option>',
      `<option value="${ID_UNIFICADO}">${ID_UNIFICADO} - Evento unificado</option>`,
      '<option value="sin-id">Sin ID SISE</option>',
      '<option value="manual">Otro ID de evento...</option>'
    ].join('');
    selector.value=forzar?ID_UNIFICADO:([ID_UNIFICADO,'sin-id','manual'].includes(anterior)?anterior:ID_UNIFICADO);
    if(manual)manual.style.display=selector.value==='manual'?'block':'none';
    const nota=document.getElementById('robotNote');
    if(nota)nota.textContent='Para Valparaíso se utiliza el ID 149162 como evento unificado. Cada comuna conserva su propia fila y sus datos. Use “Otro ID de evento...” solo si se crea un evento nuevo en SISE.';
    actualizandoSelector=false;
  }

  function instalar(){
    if(instalado)return;
    const region=document.getElementById('region');
    const selector=document.getElementById('eventoSelector');
    if(!region||!selector||typeof actualizarEventos!=='function'){
      setTimeout(instalar,100);
      return;
    }
    instalado=true;

    const actualizarEventosOriginal=actualizarEventos;
    actualizarEventos=function(){
      unificarDatos();
      const resultado=actualizarEventosOriginal.apply(this,arguments);
      construirSelectorValparaiso(false);
      return resultado;
    };

    region.addEventListener('change',()=>{
      unificarDatos();
      actualizarEventos();
      construirSelectorValparaiso(true);
      if(typeof render==='function')render();
    });

    selector.addEventListener('change',()=>{
      const manual=document.getElementById('eventoManual');
      if(manual)manual.style.display=selector.value==='manual'?'block':'none';
    });

    const observador=new MutationObserver(()=>{
      if(esRegionValparaiso(region.value))setTimeout(()=>construirSelectorValparaiso(false),0);
    });
    observador.observe(selector,{childList:true});

    setInterval(()=>{
      unificarDatos();
      if(esRegionValparaiso(region.value)){
        const opciones=[...selector.options].map(o=>o.value);
        const correcto=opciones.length===4&&opciones[1]===ID_UNIFICADO&&opciones.includes('manual');
        if(!correcto)construirSelectorValparaiso(false);
      }
    },1000);

    unificarDatos();
    actualizarEventos();
    if(typeof render==='function')render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});
  else instalar();
})();
