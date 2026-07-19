(() => {
  "use strict";

  const config = window.MONITOREO_SYNC_CONFIG || {};
  const endpoint = String(config.webAppUrl || "").trim();
  const $ = id => document.getElementById(id);
  const RESIDENCE_CATALOG = window.MONITOREO_RESIDENCIAS_CATALOGO || [];
  const PROTECTION_SERVICE = "Servicio Nacional de Protección Especializada a la Niñez y Adolescencia";
  const REFRESH_MS = 60000;
  let loading = false;
  let refreshTimer = null;

  function setStatus(message, type) {
    const line = $("syncLine");
    if (!line) return;
    line.textContent = message;
    line.dataset.syncState = type || "";
  }

  function invalidTestRecord(record) {
    return /prueba|validacion\s*tecnica|codex/i.test(String(record?.establishment || "")) || /prueba|validacion\s*tecnica|codex/i.test(String(record?.responsible || ""));
  }

  function shiftedRecord(record) {
    const service = String(record?.service || "").trim();
    return /^\d{1,2}:\d{2}(:\d{2})?$/.test(service) || /^\d{4}-\d{2}-\d{2}T/.test(service);
  }

  function cleanText(value) {
    return String(value ?? "")
      .replaceAll("SÃ­", "Sí").replaceAll("SÃ", "Sí")
      .replaceAll("NiÃ±ez", "Niñez").replaceAll("ProtecciÃ³n", "Protección")
      .replaceAll("informaciÃ³n", "información").replaceAll("afectaciÃ³n", "afectación")
      .replaceAll("RegiÃ³n", "Región").replaceAll("DirecciÃ³n", "Dirección")
      .replaceAll("actualizaciÃ³n", "actualización").replaceAll("situaciÃ³n", "situación")
      .replaceAll("evaluaciÃ³n", "evaluación").replaceAll("nÃºmero", "número")
      .replaceAll("Ã¡", "á").replaceAll("Ã©", "é").replaceAll("Ã­", "í")
      .replaceAll("Ã³", "ó").replaceAll("Ãº", "ú").replaceAll("Ã±", "ñ");
  }

  function normalizeKey(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "").toUpperCase().trim();
  }

  function normalizeStatus(value) {
    const normalized = normalizeKey(value);
    if (normalized === "SINAFECTACION" || normalized === "SINAFECTACIN") return "Sin afectación";
    if (normalized === "CONAFECTACION" || normalized === "CONAFECTACIN") return "Con afectación";
    if (normalized === "ENEVALUACION" || normalized === "ENEVALUACIN") return "En evaluación";
    if (normalized.includes("NOPRESENTAAFECTACION") || normalized.includes("NOPRESENTASITUACIONES")) return "Sin afectación";
    return value;
  }

  function normalizeSituation(value) {
    const normalized = normalizeKey(value);
    if (normalized === "INUNDACIN") return "Inundación";
    if (normalized === "EVACUACIN") return "Evacuación";
    if (normalized === "EXPOSICINAGUASSERVIDAS") return "Exposición a aguas servidas";
    if (normalized === "OTRASITUACIN") return "Otra situación";
    const catalog = window.MONITOREO_CATALOGOS || {};
    const match = (catalog.situaciones || []).find(item => normalizeKey(item) === normalized);
    return match || value;
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

  function cleanRecord(record) {
    const cleaned = {};
    Object.keys(record || {}).forEach(field => {
      const value = record[field];
      cleaned[field] = Array.isArray(value) ? value.map(item => typeof item === "string" ? cleanText(item) : item) : (typeof value === "string" ? cleanText(value) : value);
    });
    cleaned.status = normalizeStatus(cleaned.status);
    cleaned.situations = (cleaned.situations || []).map(normalizeSituation);
    cleaned.region = normalizeRegion(cleaned.region, cleaned.commune);
    return cleaned;
  }

  function canonicalResidenceName(value) {
    const removable = new Set(["RESIDENCIA","RESIDENCIAL","PROTECCION","PARA","DE","DEL","LA","EL","LOS","LAS","PER","REM","RLP","RVA","RTA","RTS","RTT","RDS","RMA","RPM","RFA","HOGAR"]);
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim().split(/\s+/).filter(word => word && !removable.has(word)).join("");
  }

  function similarity(a, b) {
    const left = canonicalResidenceName(a);
    const right = canonicalResidenceName(b);
    if (!left || !right) return 0;
    if (left === right) return 1;
    if (left.includes(right) || right.includes(left)) return 0.94;
    const rows = left.length, cols = right.length;
    const dp = Array.from({length:rows + 1}, () => Array(cols + 1).fill(0));
    for (let i = 0; i <= rows; i++) dp[i][0] = i;
    for (let j = 0; j <= cols; j++) dp[0][j] = j;
    for (let i = 1; i <= rows; i++) for (let j = 1; j <= cols; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
    return 1 - dp[rows][cols] / Math.max(rows, cols);
  }

  function lastToken(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean).pop() || "";
  }

  function explicitlyDifferentResidence(a, b) {
    const distinct = new Set(["F","M","I","II","III","IV","1","2","3","4"]);
    const left = lastToken(a), right = lastToken(b);
    return left !== right && distinct.has(left) && distinct.has(right);
  }

  function catalogMatch(record) {
    if (normalizeKey(record.service) !== normalizeKey(PROTECTION_SERVICE)) return null;
    const candidates = RESIDENCE_CATALOG.filter(item => normalizeKey(item.region) === normalizeKey(record.region) && normalizeKey(item.commune) === normalizeKey(record.commune));
    let best = null;
    candidates.forEach(item => {
      const score = similarity(item.establishment, record.establishment);
      if (!best || score > best.score) best = {item, score};
    });
    return best && best.score >= 0.86 ? best.item : null;
  }

  function enrichResidenceIdentities(records) {
    const groups = new Map();
    records.forEach(record => {
      const match = catalogMatch(record);
      if (match) {
        record.residenceCode = match.code || record.residenceCode;
        record.residenceKey = `${normalizeKey(record.service)}|CODIGO|${normalizeKey(match.code)}`;
        record.establishmentOfficial = match.establishment || record.establishment;
        return;
      }
      const groupKey = [record.service, record.region, record.commune].map(normalizeKey).join("|");
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(record);
    });
    groups.forEach(group => {
      const aliases = [];
      group.sort((a,b) => new Date(a.reportDate || a.createdAt || 0) - new Date(b.reportDate || b.createdAt || 0));
      group.forEach(record => {
        const alias = aliases.find(item => !explicitlyDifferentResidence(item.name, record.establishment) && similarity(item.name, record.establishment) >= 0.86);
        const canonical = alias ? alias.key : `AUTO|${[record.service, record.region, record.commune].map(normalizeKey).join("|")}|${canonicalResidenceName(record.establishment)}`;
        if (!alias) aliases.push({name:record.establishment, key:canonical});
        record.residenceKey = canonical;
      });
    });
    return records;
  }

  function minuteKey(value) {
    const time = new Date(value || 0).getTime();
    return time ? Math.floor(time / 60000) : normalizeKey(value);
  }

  function submissionFingerprint(record) {
    return [
      minuteKey(record.reportDate || record.createdAt), normalizeKey(record.service), normalizeKey(record.region), normalizeKey(record.commune),
      canonicalResidenceName(record.establishment), normalizeKey(record.responsible), normalizeKey(record.status), normalizeKey(record.damageLevel),
      Number(record.capacity || 0), Number(record.people || 0), (record.situations || []).map(normalizeKey).sort().join("|"),
      normalizeKey(record.damageDetail), normalizeKey(record.measures), normalizeKey(record.observations)
    ].join("§");
  }

  function deduplicateSharedRecords(input) {
    const byId = new Map();
    (input || []).forEach(record => {
      const id = String(record?.id || "").trim();
      if (!id) return;
      const prior = byId.get(id);
      const currentTime = new Date(record.reportDate || record.createdAt || 0).getTime() || 0;
      const priorTime = prior ? (new Date(prior.reportDate || prior.createdAt || 0).getTime() || 0) : -1;
      if (!prior || currentTime >= priorTime) byId.set(id, record);
    });
    const byFingerprint = new Map();
    Array.from(byId.values()).forEach(record => {
      const fingerprint = submissionFingerprint(record);
      const prior = byFingerprint.get(fingerprint);
      if (!prior) {
        byFingerprint.set(fingerprint, record);
        return;
      }
      const currentTime = new Date(record.reportDate || record.createdAt || 0).getTime() || 0;
      const priorTime = new Date(prior.reportDate || prior.createdAt || 0).getTime() || 0;
      if (currentTime > priorTime) byFingerprint.set(fingerprint, record);
    });
    return Array.from(byFingerprint.values());
  }

  function fetchSharedRecords() {
    const callbackName = `__residenciasSync_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const cacheBust = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    script.async = true;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => finish(() => reject(new Error("No fue posible descargar la base compartida."))), 30000);
      function finish(done) { clearTimeout(timeout); delete window[callbackName]; script.remove(); done(); }
      window[callbackName] = response => finish(() => {
        if (!response || response.ok !== true || !Array.isArray(response.records)) return reject(new Error(response?.error || "La respuesta de sincronización no es válida."));
        resolve(response.records);
      });
      script.onerror = () => finish(() => reject(new Error("No fue posible conectar con Google Sheets.")));
      script.src = `${endpoint}?action=list&callback=${encodeURIComponent(callbackName)}&_=${cacheBust}`;
      document.head.appendChild(script);
    });
  }

  function applySharedRecords(shared) {
    if (shared.some(shiftedRecord)) {
      setStatus("La base compartida requiere actualizar su implementación. No se muestran columnas corridas.", "error");
      window.dispatchEvent(new CustomEvent("residencias:shared-data", {detail:{records:[]}}));
      return [];
    }
    const cleaned = shared.filter(record => !invalidTestRecord(record)).map(cleanRecord);
    const valid = enrichResidenceIdentities(deduplicateSharedRecords(cleaned));
    setStatus(`Información compartida actualizada: ${valid.length} reportes válidos. Todas las personas visualizan esta misma base.`, "ok");
    window.dispatchEvent(new CustomEvent("residencias:shared-data", {detail:{records:valid}}));
    return valid;
  }

  function jsonpLoad() {
    if (!endpoint || loading || document.hidden) return;
    loading = true;
    setStatus("Sincronizando información compartida...", "loading");
    fetchSharedRecords().then(applySharedRecords).catch(error => setStatus(`${error.message} No se muestran datos locales.`, "error")).finally(() => { loading = false; });
  }

  async function postRecord(record) {
    if (!endpoint || !record || invalidTestRecord(record)) {
      window.dispatchEvent(new CustomEvent("residencias:shared-save", {detail:{ok:false, record, message:"Registro de prueba rechazado."}}));
      return;
    }
    setStatus("Guardando el reporte en la base compartida...", "loading");
    try {
      await fetch(endpoint, {method:"POST", mode:"no-cors", cache:"no-store", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({action:"save", record})});
      setStatus("Verificando que el reporte quedó en la base compartida...", "loading");
      let lastError = null;
      for (let attempt = 0; attempt < 14; attempt++) {
        await new Promise(resolve => setTimeout(resolve, attempt ? 2000 : 1200));
        try {
          const valid = applySharedRecords(await fetchSharedRecords());
          if (valid.some(item => item.id === record.id)) {
            window.dispatchEvent(new CustomEvent("residencias:shared-save", {detail:{ok:true, record}}));
            return;
          }
        } catch (error) { lastError = error; }
        setStatus(`Verificando guardado en Google Sheets (${attempt + 1}/14)...`, "loading");
      }
      throw new Error(lastError?.message || "El reporte no aparece todavía en Google Sheets.");
    } catch (error) {
      setStatus("No se pudo confirmar el guardado en la base compartida.", "error");
      window.dispatchEvent(new CustomEvent("residencias:shared-save", {detail:{ok:false, record, message:error.message}}));
    }
  }

  function init() {
    if (!endpoint) { setStatus("Base compartida pendiente de activación.", "pending"); return; }
    window.addEventListener("residencias:pending-record", event => { const record = event.detail && event.detail.record; if (record) postRecord(record); });
    setTimeout(jsonpLoad, 500);
    refreshTimer = setInterval(jsonpLoad, REFRESH_MS);
    window.addEventListener("focus", jsonpLoad);
    window.addEventListener("pageshow", event => {
      if (event.persisted) setTimeout(jsonpLoad, 100);
    });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) jsonpLoad(); });
    window.addEventListener("beforeunload", () => { if (refreshTimer) clearInterval(refreshTimer); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
