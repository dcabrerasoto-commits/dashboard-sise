// URL del Web App de Apps Script para consolidar el ingreso regional.
window.UISE_HISTORICO_ENDPOINT = "https://script.google.com/macros/s/AKfycbx5EoFvhisRV1MbtOdVwa_OJz-V1oc0iIeO4yz-GlMG45HeL3wKDDE3Pi-W65Bj9bIm/exec";

// Mejora del formulario: permite informar que la región no tiene antecedentes nuevos.
(function cargarEstadoSinInformacion(){
  const script=document.createElement('script');
  script.src='assets/js/no-info-report.js?v=20260717';
  script.async=false;
  document.head.appendChild(script);
})();

// Mantiene Valparaíso en el corte validado de las 17:37 horas y muestra
// una alerta visible mientras se revisa la disminución de FIBE terminadas.
(function cargarProteccionTerminadas(){
  const script=document.createElement('script');
  script.src='assets/js/proteccion-terminadas-sise.js?v=20260721-5';
  script.async=false;
  document.head.appendChild(script);
})();

// La unificación del evento 149162 y su desglose comunal se realizan en el robot
// que genera monitoreo-sise.json. No se aplican transformaciones adicionales en la página.
