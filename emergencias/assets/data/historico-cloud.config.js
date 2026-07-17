// URL del Web App de Apps Script para consolidar el ingreso regional.
window.UISE_HISTORICO_ENDPOINT = "https://script.google.com/macros/s/AKfycbx5EoFvhisRV1MbtOdVwa_OJz-V1oc0iIeO4yz-GlMG45HeL3wKDDE3Pi-W65Bj9bIm/exec";

// Mejora del formulario: permite informar que la región no tiene antecedentes nuevos.
(function cargarEstadoSinInformacion(){
  const script=document.createElement('script');
  script.src='assets/js/no-info-report.js?v=20260717';
  script.async=false;
  document.head.appendChild(script);
})();
