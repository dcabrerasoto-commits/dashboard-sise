(function(){
  'use strict';

  function iniciarMejoraSinInformacion(){
    const formulario=document.getElementById('formCarga');
    const tabla=document.querySelector('#carga .entry-table');
    const grilla=document.querySelector('#carga .formgrid');
    const selectorEstado=document.getElementById('estadoLlenado');
    const ayudaEstado=document.getElementById('estadoAyuda');
    if(!formulario||!tabla||!grilla||!selectorEstado||document.getElementById('existeInformacion'))return;

    const estilo=document.createElement('style');
    estilo.textContent='.report-availability{margin-top:14px;max-width:430px}.report-availability .robot-note{margin-bottom:0}.status.noinfo{background:#e8eef5;color:#35506b;border:1px solid #c5d2df}.status.noinfo:before{background:#607286}';
    document.head.appendChild(estilo);

    const campo=document.createElement('div');
    campo.className='field wide report-availability';
    campo.innerHTML='<label for="existeInformacion">¿Existe información para reportar?</label><select id="existeInformacion" required><option value="">Seleccione una opción</option><option value="si">Sí</option><option value="no">No</option></select><p class="robot-note" id="existeInformacionAyuda">Seleccione “No” cuando la región no tenga antecedentes nuevos que informar durante el día.</p>';
    grilla.insertAdjacentElement('afterend',campo);

    const selectorInformacion=document.getElementById('existeInformacion');
    const opcionSinInformacion=document.createElement('option');
    opcionSinInformacion.value='noinfo';
    opcionSinInformacion.textContent='No hay información que reportar';
    opcionSinInformacion.hidden=true;
    selectorEstado.appendChild(opcionSinInformacion);

    const estadoOriginal=estado;
    estado=function(regionNombre){
      const registros=reportesRegionales
        .map((d,i)=>({...d,_orden:d.registradoMs||fechaCapturaMs(d)||i}))
        .filter(d=>d.region===regionNombre&&d.fechaClave===hoyClave())
        .sort((a,b)=>a._orden-b._orden);
      if(!registros.length)return ['pending','Pendiente'];

      const comunales=registros.filter(d=>String(d.comuna||'').trim()&&d.estadoDiario!=='noinfo');
      if(comunales.length){
        const ultimoComunal=comunales[comunales.length-1];
        return ultimoComunal.estadoDiario==='done'?['done','Actualizado']:['progress','En proceso'];
      }

      const ultimo=registros[registros.length-1];
      if(ultimo.estadoDiario==='noinfo')return ['noinfo','No hay información que reportar'];
      return estadoOriginal(regionNombre);
    };

    const badgeOriginal=badge;
    badge=function(valor){
      if(valor&&valor[0]==='noinfo')return '<span class="status noinfo" title="La región informó que no tiene antecedentes nuevos que reportar durante el día.">No hay información que reportar</span>';
      return badgeOriginal(valor);
    };

    function actualizarDisponibilidad(){
      const sinInformacion=selectorInformacion.value==='no';
      tabla.style.display=sinInformacion?'none':'';
      selectorEstado.disabled=sinInformacion;
      if(sinInformacion){
        selectorEstado.value='noinfo';
        ayudaEstado.textContent='La tabla comunal no debe completarse. En Estado diario se mostrará “No hay información que reportar”.';
      }else{
        if(selectorEstado.value==='noinfo')selectorEstado.value='';
        selectorEstado.disabled=false;
        if(typeof actualizarAyudaEstado==='function')actualizarAyudaEstado();
      }
    }

    selectorInformacion.addEventListener('change',actualizarDisponibilidad);

    formulario.addEventListener('submit',async function(evento){
      if(selectorInformacion.value!=='no')return;
      evento.preventDefault();
      evento.stopImmediatePropagation();

      let id=eventoSelector.value==='manual'?eventoManual.value.trim():eventoSelector.value==='sin-id'?'':eventoSelector.value;
      if(eventoSelector.value==='manual'&&!/^\d+$/.test(id)){
        alert('El ID del evento SISE debe contener solo números.');
        return;
      }
      if(!validarIdSeleccionado(true))return;

      const marca=Date.now();
      const referenciaSise=datosSise.find(d=>d.id===id&&d.region===region.value)||datosSise.find(d=>d.id===id)||{};
      const nuevo={
        region:region.value,
        comuna:'',
        evento:referenciaSise.evento||'',
        id,
        alfa:0,
        aplicadas:0,
        encuestadores:0,
        hora:new Date().toTimeString().slice(0,5),
        fechaLlenado:fechaLlenado.value,
        fechaClave:hoyClave(),
        estadoDiario:'noinfo',
        registradoMs:marca
      };

      reportesRegionales.push(nuevo);
      deduplicarReportesRegionales();
      historialDiario.push({
        ...nuevo,
        fecha:hoyClave(),
        marca:fechaLlenado.value||fechaHora(),
        tipo:'Carga regional',
        terminadas:0,
        digitacion:0,
        anuladas:0,
        personas:0,
        nna:0,
        mayores:0,
        discapacidad:0
      });
      historialDiario=historialSinDuplicados();
      localStorage.setItem('uise-historico-diario',JSON.stringify(historialDiario));
      localStorage.setItem('uise-reportes-regionales',JSON.stringify(reportesRegionales));

      const guardado=await sincronizarHistoricoNube([nuevo]);
      render();
      if(!guardado){
        alert('No se pudo confirmar el guardado en la nube central. La información quedó solo como respaldo local en este navegador. Intente guardar nuevamente.');
        return;
      }

      alert('Se registró correctamente que la región no tiene información que reportar durante el día.');
      formulario.reset();
      actualizarComunas();
      actualizarEventos();
      fechaLlenado.value=fechaHora();
      setTimeout(actualizarDisponibilidad,0);
    },true);

    actualizarDisponibilidad();
    render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciarMejoraSinInformacion,{once:true});
  else iniciarMejoraSinInformacion();
})();
