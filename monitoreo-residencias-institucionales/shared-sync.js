(() => {
  "use strict";

  const STORAGE_KEY = "mdsf-monitoreo-residencias-v2";
  const config = window.MONITOREO_SYNC_CONFIG || {};
  const endpoint = String(config.webAppUrl || "").trim();
  const $ = id => document.getElementById(id);
  let loading = false;

  function setStatus(message, type) {
    const line = $("syncLine");
    if (!line) return;
    line.textContent = message;
    line.dataset.syncState = type || "";
  }

  function readLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeLocal(records) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records || [])); } catch (_) {}
  }

  function invalidTestRecord(record) {
    return /prueba/i.test(String(record?.establishment || "")) || /prueba/i.test(String(record?.responsible || ""));
  }

  function latestLocalRecord() {
    const records = readLocal();
    return records.length ? records[records.length - 1] : null;
  }

  function jsonpLoad() {
    if (!endpoint || loading) return;
    loading = true;
    setStatus("Sincronizando información compartida…", "loading");

    const callbackName = `__residenciasSync_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timeout = setTimeout(() => finishError("No fue posible descargar la base compartida."), 15000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
      loading = false;
    }

    function finishError(message) {
      cleanup();
      setStatus(`${message} Se muestran los datos guardados en este navegador.`, "error");
    }

    window[callbackName] = response => {
      if (!response || response.ok !== true || !Array.isArray(response.records)) {
        finishError(response?.error || "La respuesta de sincronización no es válida.");
        return;
      }
      const valid = response.records.filter(record => !invalidTestRecord(record));
      writeLocal(valid);
      cleanup();
      setStatus(`Base compartida sincronizada: ${valid.length} reportes.`, "ok");
      window.dispatchEvent(new CustomEvent("residencias:shared-data", {detail:{records:valid}}));
    };

    script.onerror = () => finishError("No fue posible conectar con Google Sheets.");
    script.src = `${endpoint}?action=list&callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
    document.head.appendChild(script);
  }

  async function postRecord(record) {
    if (!endpoint || !record || invalidTestRecord(record)) return;
    setStatus("Guardando el reporte en la base compartida…", "loading");
    try {
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        cache: "no-store",
        headers: {"Content-Type":"text/plain;charset=utf-8"},
        body: JSON.stringify({record})
      });
      setStatus("Reporte enviado a la base compartida. Actualizando información…", "ok");
      setTimeout(jsonpLoad, 1200);
    } catch (_) {
      setStatus("El reporte quedó guardado localmente, pero no pudo enviarse a la base compartida.", "error");
    }
  }

  function setupSubmitSync() {
    const form = $("reportForm");
    if (!form) return;
    form.addEventListener("submit", () => {
      setTimeout(() => {
        const record = latestLocalRecord();
        if (record) postRecord(record);
      }, 120);
    });
  }

  function init() {
    if (!endpoint) {
      setStatus("Base compartida pendiente de activación.", "pending");
      return;
    }
    setupSubmitSync();
    jsonpLoad();
    window.addEventListener("focus", () => {
      jsonpLoad();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
