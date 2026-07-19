// Regla especial para Valparaíso: utiliza el evento unificado 149162,
// manteniendo la posibilidad de informar un ID nuevo de forma manual.
(function configurarEventoUnificadoValparaiso(){
  const REGION_VALPARAISO='VALPARAISO';
  const ID_UNIFICADO='149162';

  const clave=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

  function aplicarRegla(){
    const region=document.getElementById('region');
    const selector=document.getElementById('eventoSelector');
    const manual=document.getElementById('eventoManual');
    if(!region||!selector)return;

    if(clave(region.value)!==REGION_VALPARAISO){
      if(manual&&selector.value!=='manual')manual.style.display='none';
      return;
    }

    const valorAnterior=selector.value;
    selector.innerHTML=[
      '<option value="">Seleccione el ID</option>',
      `<option value="${ID_UNIFICADO}">${ID_UNIFICADO} - Valparaíso (evento unificado)</option>`,
      '<option value="sin-id">Sin ID SISE</option>',
      '<option value="manual">Otro ID de evento...</option>'
    ].join('');

    selector.value=['manual','sin-id',ID_UNIFICADO].includes(valorAnterior)?valorAnterior:ID_UNIFICADO;
    if(!selector.value)selector.value=ID_UNIFICADO;
    if(manual)manual.style.display=selector.value==='manual'?'block':'none';

    const nota=document.getElementById('robotNote');
    if(nota)nota.textContent='Para Valparaíso se utiliza el ID 149162 como evento unificado. Seleccione “Otro ID de evento...” únicamente si se creó un evento nuevo en SISE.';
  }

  function instalar(){
    const region=document.getElementById('region');
    const selector=document.getElementById('eventoSelector');
    const form=document.getElementById('formCarga');
    if(!region||!selector)return;

    const original=window.actualizarEventos;
    if(typeof original==='function'&&!original.__valparaisoUnificado){
      const envuelta=function(){
        const resultado=original.apply(this,arguments);
        aplicarRegla();
        return resultado;
      };
      envuelta.__valparaisoUnificado=true;
      window.actualizarEventos=envuelta;
    }

    region.addEventListener('change',()=>{
      if(typeof window.actualizarEventos==='function')window.actualizarEventos();
      else aplicarRegla();
    });

    selector.addEventListener('change',()=>{
      const manual=document.getElementById('eventoManual');
      if(manual)manual.style.display=selector.value==='manual'?'block':'none';
    });

    if(form){
      form.addEventListener('submit',()=>{
        const manual=document.getElementById('eventoManual');
        if(clave(region.value)===REGION_VALPARAISO&&selector.value==='manual'&&manual&&manual.value.trim()&&manual.value.trim()!==ID_UNIFICADO){
          alert(`Está ingresando el ID ${manual.value.trim()} para Valparaíso. Verifique que corresponda a un evento nuevo en SISE. El evento unificado vigente es ${ID_UNIFICADO}.`);
        }
      },true);
    }

    aplicarRegla();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar);
  else instalar();
})();
