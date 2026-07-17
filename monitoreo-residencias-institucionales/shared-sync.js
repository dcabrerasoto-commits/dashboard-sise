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

  function shiftedRecord(record) {
    const service = String(record?.service || "").trim();
    return /^\d{1,2}:\d{2}(:\d{2})?$/.test(service) || /^\d{4}-\d{2}-\d{2}T/.test(service);
  }

  function latestLocalRecord() {
    const records = readLocal();
    return records.length ? records[records.length - 1] : null;
  }

  function fetchSharedRecords() {
    const callbackName = `__residenciasSync_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => finish(() => reject(new Error("No fue posible descargar la base compartida."))), 15000);

      function finish(done) {
        clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
        done();
      }

      window[callbackName] = response => {
        finish(() => {
          if (!response || response.ok !== true || !Array.isArray(response.records)) {
            reject(new Error(response?.error || "La respuesta de sincronizacion no es valida."));
            return;
          }
          resolve(response.records);
        });
      };

      script.onerror = () => finish(() => reject(new Error("No fue posible conectar con Google Sheets.")));
      script.src = `${endpoint}?action=list&callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
      document.head.appendChild(script);
    });
  }

  function applySharedRecords(shared) {
    if (shared.some(shiftedRecord)) {
      const local = readLocal().filter(record => !shiftedRecord(record));
      writeLocal(local);
      setStatus("La base compartida requiere actualizar su implementacion. No se muestran columnas corridas.", "error");
      window.dispatchEvent(new CustomEvent("residencias:shared-data", {detail:{records:local}}));
      return local;
    }
    const valid = shared.filter(record => !invalidTestRecord(record));
    writeLocal(valid);
    setStatus("El tablero muestra el ultimo reporte informado por cada residencia. Los reportes anteriores se pueden revisar en Historico diario.", "ok");
    window.dispatchEvent(new CustomEvent("residencias:shared-data", {detail:{records:valid}}));
    return valid;
  }

  function jsonpLoad() {
    if (!endpoint || loading) return;
    loading = true;
    setStatus("Sincronizando informacion compartida...", "loading");
    fetchSharedRecords()
      .then(applySharedRecords)
      .catch(error => setStatus(`${error.message} Se muestran los datos guardados en este navegador.`, "error"))
      .finally(() => { loading = false; });
  }

  async function postRecord(record) {
    if (!endpoint || !record || invalidTestRecord(record)) return;
    setStatus("Guardando el reporte en la base compartida...", "loading");
    try {
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        cache: "no-store",
        headers: {"Content-Type":"text/plain;charset=utf-8"},
        body: JSON.stringify({action:"save", record})
      });
      setStatus("Verificando que el reporte quedo en la base compartida...", "loading");
      for (let attempt = 0; attempt < 6; attempt++) {
        await new Promise(resolve => setTimeout(resolve, attempt ? 1500 : 700));
        const valid = applySharedRecords(await fetchSharedRecords());
        if (valid.some(item => item.id === record.id)) {
          window.dispatchEvent(new CustomEvent("residencias:shared-save", {detail:{ok:true, record}}));
          return;
        }
      }
      throw new Error("El reporte no aparece todavia en Google Sheets.");
    } catch (error) {
      setStatus("El reporte quedo guardado localmente, pero no pudo enviarse a la base compartida.", "error");
      window.dispatchEvent(new CustomEvent("residencias:shared-save", {detail:{ok:false, record, message:error.message}}));
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
      setStatus("Base compartida pendiente de activacion.", "pending");
      return;
    }
    setupSubmitSync();
    setTimeout(jsonpLoad, 700);
    window.addEventListener("focus", () => {
      jsonpLoad();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
