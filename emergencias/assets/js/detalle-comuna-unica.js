// Garantiza que el Detalle comunal muestre una sola fila por región y comuna.
(function configurarDetalleComunaUnica(){
  'use strict';

  const clave=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').toUpperCase().trim();
  const camposNumericos=['alfa','aplicadas','encuestadores','terminadas','digitacion','anuladas','personas','nna','mayores','discapacidad','mujer','mujeres','hombre','hombres','otro','otros'];

  function instalar(){
    if(typeof combinados!=='function'){
      setTimeout(instalar,100);
      return;
    }
    if(combinados.__comunaUnica)return;

    const combinadosOriginal=combinados;
    const combinadosUnicos=function(){
      const filas=combinadosOriginal.apply(this,arguments)||[];
      const mapa=new Map();

      filas.forEach(fila=>{
        const region=typeof regionCanon==='function'?regionCanon(fila.region):fila.region;
        const comuna=typeof comunaCanon==='function'?comunaCanon(region,fila.comuna):fila.comuna;
        if(!String(comuna||'').trim())return;
        const llave=`${clave(region)}|${clave(comuna)}`;
        const anterior=mapa.get(llave);

        if(!anterior){
          mapa.set(llave,{...fila,region,comuna});
          return;
        }

        const unido={...anterior,region,comuna};
        camposNumericos.forEach(campo=>{
          // La fuente principal ya consolida los registros. Si reaparece una fila
          // duplicada, se conserva el mayor valor para evitar duplicar las cifras.
          unido[campo]=Math.max(+(anterior[campo]||0),+(fila[campo]||0));
        });
        unido.id=[...new Set([...(String(anterior.id||'').split('; ')),...(String(fila.id||'').split('; '))].filter(Boolean))].join('; ');
        unido.hora=String(anterior.hora||'')>String(fila.hora||'')?anterior.hora:fila.hora;
        unido.fechaLlenado=anterior.fechaLlenado||fila.fechaLlenado||'';
        unido.estadoDiario=anterior.estadoDiario==='done'||fila.estadoDiario==='done'?'done':(anterior.estadoDiario||fila.estadoDiario);
        mapa.set(llave,unido);
      });

      return [...mapa.values()];
    };

    combinadosUnicos.__comunaUnica=true;
    combinados=combinadosUnicos;
    if(typeof render==='function')render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});
  else instalar();
})();
