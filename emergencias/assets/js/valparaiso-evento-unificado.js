// Regla especial para Valparaíso: utiliza el evento unificado 149162,
// manteniendo la posibilidad de informar un ID nuevo de forma manual.
(function configurarEventoUnificadoValparaiso(){
  const REGION_VALPARAISO='VALPARAISO';
  const ID_UNIFICADO='149162';
  let aplicando=false;

  const clave=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

  function esValparaiso(){
    const region=document.getElementById('region');
    return !!region&&clave(region.value)===REGION_VALPARAISO;
  }

  function aplicarRegla(forzarSeleccion=false){
    const region=document.getElementById('region');
    const selector=document.getElementById('eventoSelector');
    const manual=document.getElementById('eventoManual');
    if(!region||!selector||aplicando)return;

    if(!esValparaiso()){
      if(manual&&selector.value!=='manual')manual.style.display='none';
      return;
    }

    aplicando=true;
    const valorAnterior=selector.value;
    const valorPermitido=['manual','sin-id',ID_UNIFICADO].includes(valorAnterior)?valorAnterior:ID_UNIFICADO;

    selector.innerHTML=[
      '<option value="">Seleccione el ID</option>',
      `<option value="${ID_UNIFICADO}">${ID_UNIFICADO} - Evento unificado</option>`,
      '<option value="sin-id">Sin ID SISE</option>',
      '<option value="manual">Otro ID de evento...</option>'
    ].join('');

    selector.value=forzarSeleccion?ID_UNIFICADO:valorPermitido;
    if(!selector.value)selector.value=ID_UNIFICADO;
    if(manual)manual.style.display=selector.value==='manual'?'block':'none';

    const nota=document.getElementById('robotNote');
    if(nota)nota.textContent='Para Valparaíso se utiliza el ID 149162 como evento unificado. Seleccione “Otro ID de evento...” solo si se creó un evento nuevo en SISE.';
    aplicando=false;
  }

  function instalar(){
    const region=document.getElementById('region');
    const selector=document.getElementById('eventoSelector');
    const form=document.getElementById('formCarga');
    if(!region||!selector){
      setTimeout(instalar,100);
      return;
    }

    region.addEventListener('change',()=>{
      setTimeout(()=>aplicarRegla(true),0);
      setTimeout(()=>aplicarRegla(true),250);
    });

    selector.addEventListener('change',()=>{
      const manual=document.getElementById('eventoManual');
      if(manual)manual.style.display=selector.value==='manual'?'block':'none';
    });

    // El robot reconstruye el selector al actualizarse. Este observador vuelve a
    // aplicar inmediatamente la regla de Valparaíso después de cada reconstrucción.
    const observer=new MutationObserver(()=>{
      if(esValparaiso())setTimeout(()=>aplicarRegla(false),0);
    });
    observer.observe(selector,{childList:true,subtree:true});

    // Respaldo para actualizaciones automáticas o restauraciones del navegador móvil.
    setInterval(()=>{
      if(esValparaiso()){
        const opciones=[...selector.options].map(o=>o.value);
        const correcto=opciones.length===4&&opciones.includes(ID_UNIFICADO)&&opciones.includes('manual')&&!opciones.some(v=>/^1490/.test(v));
        if(!correcto)aplicarRegla(false);
      }
    },500);

    if(form){
      form.addEventListener('submit',()=>{
        const manual=document.getElementById('eventoManual');
        if(esValparaiso()&&selector.value==='manual'&&manual&&manual.value.trim()&&manual.value.trim()!==ID_UNIFICADO){
          alert(`Está ingresando el ID ${manual.value.trim()} para Valparaíso. Verifique que corresponda a un evento nuevo en SISE. El evento unificado vigente es ${ID_UNIFICADO}.`);
        }
      },true);
    }

    aplicarRegla(true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar);
  else instalar();
})();
