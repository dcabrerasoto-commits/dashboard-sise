window.MONITOREO_CONFIG = {
  // Pegue aquí la URL del Web App de Google Apps Script para habilitar
  // carga colaborativa y lectura nacional en tiempo real.
  endpoint: "",
  storageMode: "auto",
  appVersion: "1.2.0"
};

window.addEventListener("load", () => {
  const script = document.createElement("script");
  script.src = "enhancements.js?v=20260716-mapa-chile-listado-regional-compacto";
  script.defer = true;
  document.body.appendChild(script);
});