(() => {
  "use strict";

  const config = window.MONITOREO_SYNC_CONFIG || {};
  const endpoint = String(config.webAppUrl || "").trim();
  const $ = id => document.getElementById(id);
  const RESIDENCE_CATALOG = window.MONITOREO_RESIDENCIAS_CATALOGO || [];
  const PROTECTION_SERVICE = "Servicio Nacional de Protección Especializada a la Niñez y Adolescencia";
  let loading = false;

  function setStatus(message, type) {
    const line = $("syncLine");
    if (!line) return;
    line.textContent = message;
    line.dataset.syncState = type || "";
  }

  function invalidTestRecord(record) {
    return /prueba/i.test(String(record?.establishment || "")) || /prueba/i.test(String(record?.responsible || ""));
  }

  function shiftedRecord(record) {
    const service = String(record?.service || "").trim();
    return /^\d{1,2}:\d{2}(:\d{2})?$/.test(service) || /^\d{4}-\d{2}-\d{2}T/.test(service);
  }

  function cleanText(value) {
    return String(value ?? "")
      .replaceAll("SÃ­", "Sí")
      .replaceAll("SÃ", "Sí")
      .replaceAll("NiÃ±ez", "Niñez")
      .replaceAll("ProtecciÃ³n", "Protección")
      .replaceAll("informaciÃ³n", "información")
      .replaceAll("afectaciÃ³n", "afectación")
      .replaceAll("RegiÃ³n", "Región")
      .replaceAll("DirecciÃ³n", "Dirección")
      .replaceAll("actualizaciÃ³n", "actualización")
      .replaceAll("situaciÃ³n", "situación")
      .replaceAll("evaluaciÃ³n", "evaluación")
      .replaceAll("nÃºmero", "número")
      .replaceAll("Ã¡", "á")
      .replaceAll("Ã©", "é")
      .replaceAll("Ã­", "í")
      .replaceAll("Ã³", "ó")
      .replaceAll("Ãº", "ú")
      .replaceAll("Ã±", "ñ");
  }

  function cleanRecord(record) {
    const cleaned = {};
    Object.keys(record || {}).forEach(key => {
      const value = record[key];
      cleaned[key] = Array.isArray(value) ? value.map(item => typeof item === "string" ? cleanText(item) : item) : (typeof value === "string" ? cleanText(value) : value);
    });
    cleaned.region = normalizeRegion(cleaned.region, cleaned.commune);
    return cleaned;
  }

  function normalizeKey(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "")
      .toUpperCase()
      .trim();
  }

  function normalizeRegion(region, commune) {
    const catalog = window.MONITOREO_CATALOGOS || {};
    const regionKey = normalizeKey(region);
    const direct = (catalog.regiones || []).find(item => normalizeKey(item) === regionKey);
    if (direct) return direct;
    const possibleCommuneKeys = [normalizeKey(commune), normalizeKey(region)].filter(Boolean);
    const byCommune = Object.keys(catalog.comunasPorRegion || {}).find(regionName =>
      (catalog.comunasPorRegion[regionName] || []).some(item => possibleCommuneKeys.includes(normalizeKey(item)))
    );
    return byCommune || region;
  }

  function canonicalResidenceName(value) {
    const words = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    while (["REM","PER","RLP","RVA","RFA","RDS","RTS","RMA","RPM","RSP","ELEAM","RESIDENCIA","HOGAR"].includes(words[0])) words.shift();
    return words.filter(word => !["DE","DEL","LA","EL","LOS","LAS","N"].includes(word)).join("");
  }

  function similarity(a, b) {
    const left = canonicalResidenceName(a);
    const right = canonicalResidenceName(b);
    if (!left || !right) return 0;
    if (left === right) return 1;
    if (left.includes(right) || right.includes(left)) return 0.94;
    const rows = left.length;
    const cols = right.length;
    const dp = Array.from({length:rows + 1}, () => Array(cols + 1).fill(0));
    for (let i = 0; i <= rows; i++) dp[i][0] = i;
    for (let j = 0; j <= cols; j++) dp[0][j] = j;
    for (let i = 1; i <= rows; i++) {
      for (let j = 1; j <= cols; j++) {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
      }
    }
    return 1 - dp[rows][cols] / Math.max(rows, cols);
  }

  function lastToken(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .pop() || "";
  }

  function explicitlyDifferentResidence(a, b) {
    const distinct = new Set(["F","M","I","II","III","IV","1","2","3","4"]);
    const left = lastToken(a);
    const right = lastToken(b);
    return left !== right && distinct.has(left) && distinct.has(right);
  }

  function catalogMatch(record) {
    if (normalizeKey(record.service) !== normalizeKey(PROTECTION_SERVICE)) return null;
    const candidates = RESIDENCE_CATALOG.filter(item =>
      normalizeKey(item.region) === normalizeKey(record.region) &&
      normalizeKey(item.commune) === normalizeKey(record.commune)
    );
    let best = null;
    candidates.forEach(item => {
      const score = similarity(item.establishment, record.establishment);
      if (!best || score > best.score) best = {item, score};
    });
    return best && best.score >= 0.88 ? best.item : null;
  }

  function enrichResidenceIdentities(records) {
    const groups = new Map();
    records.forEach(record => {
      const match = catalogMatch(record);
      if (match) {
        record.residenceCode = record.residenceCode || match.code;
        record.residenceKey = `${normalizeKey(record.service)}|CODIGO|${normalizeKey(match.code)}`;
        return;
      }
      const groupKey = [record.service, record.region, record.commune].map(normalizeKey).join("|");
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(record);
    });
    groups.forEach(group => {
      const aliases = [];
      group.forEach(record => {
        const alias = aliases.find(item => !explicitlyDifferentResidence(item.name, record.establishment) && similarity(item.name, record.establishment) >= 0.88);
        const canonical = alias ? alias.key : `AUTO|${[record.service, record.region, record.commune].map(normalizeKey).join("|")}|${canonicalResidenceName(record.establishment)}`;
        if (!alias) aliases.push({name:record.establishment, key:canonical});
        record.residenceKey = record.residenceKey || canonical;
      });
    });
    return records;
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
            reject(new Error(response?.error || "La respuesta de sincronización no es válida."));
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
      setStatus("La base compartida requiere actualizar su implementación. No se muestran columnas corridas.", "error");
      window.dispatchEvent(new CustomEvent("residencias:shared-data", {detail:{records:[]}}));
      return [];
    }
    const valid = enrichResidenceIdentities(shared.filter(record => !invalidTestRecord(record)).map(cleanRecord));
    setStatus("El tablero muestra el último reporte informado por cada residencia. Los reportes anteriores se pueden revisar en Histórico diario.", "ok");
    window.dispatchEvent(new CustomEvent("residencias:shared-data", {detail:{records:valid}}));
    return valid;
  }

  function jsonpLoad() {
    if (!endpoint || loading) return;
    loading = true;
    setStatus("Sincronizando información compartida...", "loading");
    fetchSharedRecords()
      .then(applySharedRecords)
      .catch(error => setStatus(`${error.message} No se muestran datos locales.`, "error"))
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
      setStatus("No se pudo confirmar el guardado en la base compartida.", "error");
      window.dispatchEvent(new CustomEvent("residencias:shared-save", {detail:{ok:false, record, message:error.message}}));
    }
  }

  function setupSubmitSync() {
    window.addEventListener("residencias:pending-record", event => {
      const record = event.detail && event.detail.record;
      if (record) postRecord(record);
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

