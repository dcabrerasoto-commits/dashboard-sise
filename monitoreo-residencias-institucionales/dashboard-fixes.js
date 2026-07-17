(() => {
  "use strict";

  const STORAGE_KEY = "mdsf-monitoreo-residencias-v2";
  const $ = id => document.getElementById(id);
  const key = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  const fmt = value => new Intl.NumberFormat("es-CL").format(Number(value || 0));
  const formatDateTime = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Sin información" : new Intl.DateTimeFormat("es-CL", {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
  };
  const dateKey = value => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  let applying = false;
  let timer = null;

  function readRecords() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  function writeRecords(records) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch (_) {}
  }

  function identity(record) {
    return [record.service, record.region, record.commune, record.establishment].map(key).join("|");
  }

  function latestRecords(records) {
    const latest = new Map();
    records.forEach(record => {
      if (!record.service || !record.region || !record.establishment) return;
      const id = identity(record);
      const currentTime = new Date(record.reportDate || record.createdAt || 0).getTime() || 0;
      const previous = latest.get(id);
      const previousTime = previous ? (new Date(previous.reportDate || previous.createdAt || 0).getTime() || 0) : -1;
      if (!previous || currentTime >= previousTime) latest.set(id, record);
    });
    return [...latest.values()];
  }

  function filteredLatest() {
    const service = $("filterService")?.value || "";
    const region = $("filterRegion")?.value || "";
    const status = $("filterStatus")?.value || "";
    return latestRecords(readRecords()).filter(record =>
      (!service || record.service === service) &&
      (!region || record.region === region) &&
      (!status || record.status === status)
    );
  }

  function isAffected(record) {
    return record.status === "Con afectación" || (record.situations || []).length > 0;
  }

  function hasSituation(record, situation) {
    return (record.situations || []).some(value => key(value) === key(situation));
  }

  function enhanceRegions(data) {
    const container = $("regionMap");
    if (!container || !window.MONITOREO_CATALOGOS) return;
    const regions = window.MONITOREO_CATALOGOS.regiones || [];
    container.innerHTML = regions.map(region => {
      const rows = data.filter(record => record.region === region);
      const total = rows.length;
      const affected = rows.filter(isAffected).length;
      const level = affected >= 6 ? 3 : affected >= 3 ? 2 : affected >= 1 ? 1 : 0;
      return `<button type="button" class="region-block level-${level}" data-region="${esc(region)}" title="${esc(region)}: ${fmt(total)} informadas, ${fmt(affected)} con afectación">
        <strong>${esc(region)}</strong>
        <span class="region-values"><b>${fmt(total)}</b><small>informadas</small><i>/</i><b>${fmt(affected)}</b><small>con afectación</small></span>
      </button>`;
    }).join("");
    container.querySelectorAll(".region-block").forEach(button => {
      button.addEventListener("click", () => {
        if ($("filterRegion")) $("filterRegion").value = button.dataset.region;
        scheduleEnhancement();
      });
    });
  }

  function enhanceSituations(data) {
    const container = $("situationBars");
    if (!container || !window.MONITOREO_CATALOGOS) return;
    const base = window.MONITOREO_CATALOGOS.situaciones || [];
    const rows = [{label:"Sin situaciones reportadas", value:data.filter(record => !(record.situations || []).length).length}, ...base.map(label => ({label, value:data.filter(record => hasSituation(record, label)).length}))];
    const max = Math.max(1, ...rows.map(row => row.value));
    container.innerHTML = rows.map(row => `<div class="bar-row"><div class="bar-label">${esc(row.label)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(row.value / max * 100)}%"></div></div><div class="bar-value">${fmt(row.value)}</div></div>`).join("");
  }

  function centerCards() {
    document.querySelectorAll("#resumen .kpi").forEach(card => {
      const value = card.querySelector(".kpi-value");
      if (value) value.style.cssText += ";display:flex;align-items:center;justify-content:center;text-align:center;width:100%;";
    });
  }

  function ensureAddressField() {
    if ($("address")) return;
    const establishment = $("establishment");
    const label = establishment?.closest("label");
    const grid = label?.parentElement;
    if (!grid) return;
    const addressLabel = document.createElement("label");
    addressLabel.className = "span-2";
    addressLabel.innerHTML = 'Dirección de la residencia<input id="address" name="address" type="text" maxlength="220" required placeholder="Calle, número y referencia, si corresponde">';
    label.insertAdjacentElement("afterend", addressLabel);
  }

  function findPreviousAddress() {
    const current = {
      service: $("service")?.value || "",
      region: $("region")?.value || "",
      commune: $("commune")?.value || "",
      establishment: $("establishment")?.value || ""
    };
    if (!current.service || !current.region || !current.commune || !current.establishment.trim()) return;
    const match = latestRecords(readRecords()).find(record => identity(record) === identity(current));
    if (match && $("address")) $("address").value = match.address || "";
  }

  function saveAddressInLastRecord() {
    const address = $("address")?.value.trim() || "";
    const records = readRecords();
    if (!records.length) return;
    const last = records[records.length - 1];
    last.address = address;
    writeRecords(records);
  }

  function ensureHistoryDetail() {
    const history = $("historico");
    if (!history) return;
    const summaryTable = history.querySelector(".history-table");
    const firstHeader = summaryTable?.querySelector("thead th:first-child");
    if (firstHeader) firstHeader.textContent = "Fecha de reporte";
    if ($("historyEntriesBody")) return;
    const card = document.createElement("article");
    card.className = "card table-card history-entry-card";
    card.innerHTML = `
      <div class="card-head"><div><span class="card-kicker">DETALLE DE INGRESOS</span><h3>Reportes registrados</h3></div><span class="small-note">Cada fila corresponde a un ingreso guardado</span></div>
      <div class="table-scroll"><table class="history-entry-table"><thead><tr>
        <th>Fecha de reporte</th><th>Servicio</th><th>Región</th><th>Comuna</th><th>Residencia</th><th>Dirección</th><th>Estado</th><th>Hubo cambios</th><th>Situaciones reportadas</th><th>Responsable</th>
      </tr></thead><tbody id="historyEntriesBody"></tbody></table></div>`;
    history.appendChild(card);
  }

  function renderHistoryEntries() {
    ensureHistoryDetail();
    const body = $("historyEntriesBody");
    if (!body) return;
    const service = $("historyService")?.value || "";
    const region = $("historyRegion")?.value || "";
    const from = $("historyFrom")?.value || "";
    const to = $("historyTo")?.value || "";
    const records = readRecords().filter(record => {
      const date = dateKey(record.reportDate || record.createdAt);
      return (!service || record.service === service) && (!region || record.region === region) && (!from || date >= from) && (!to || date <= to);
    }).sort((a,b) => new Date(b.reportDate || b.createdAt || 0) - new Date(a.reportDate || a.createdAt || 0));
    body.innerHTML = records.length ? records.map(record => `<tr>
      <td>${esc(formatDateTime(record.reportDate || record.createdAt))}</td>
      <td>${esc(record.service || "")}</td><td>${esc(record.region || "")}</td><td>${esc(record.commune || "")}</td>
      <td>${esc(record.establishment || "")}</td><td>${esc(record.address || "Sin información")}</td>
      <td>${esc(record.status || "Sin información")}</td><td>${esc(record.hasChanges || "No aplica")}</td>
      <td>${esc((record.situations || []).join(", ") || "Sin situaciones reportadas")}</td><td>${esc(record.responsible || "")}</td>
    </tr>`).join("") : '<tr><td colspan="10">Sin ingresos para el período seleccionado.</td></tr>';
  }

  function applyEnhancements() {
    if (applying) return;
    applying = true;
    const data = filteredLatest();
    centerCards();
    enhanceRegions(data);
    enhanceSituations(data);
    renderHistoryEntries();
    requestAnimationFrame(() => { applying = false; });
  }

  function scheduleEnhancement() {
    clearTimeout(timer);
    timer = setTimeout(applyEnhancements, 30);
  }

  function injectStyles() {
    if (document.getElementById("dashboard-balance-styles")) return;
    const style = document.createElement("style");
    style.id = "dashboard-balance-styles";
    style.textContent = `
      #resumen .kpi{display:grid!important;grid-template-rows:auto 1fr auto!important}
      #resumen .kpi-value{display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;width:100%!important;min-height:38px!important}
      #resumen .dashboard-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;align-items:stretch!important}
      #resumen .dashboard-grid>.card{height:100%!important;display:flex!important;flex-direction:column!important}
      #regionMap{grid-template-columns:repeat(2,minmax(0,1fr))!important;align-content:start!important;flex:1!important}
      .region-block{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;padding:9px 10px!important}
      .region-values{display:grid!important;grid-template-columns:auto auto auto auto auto!important;align-items:baseline!important;gap:4px!important;white-space:nowrap!important}
      .region-values b{font-size:17px!important;color:var(--primary,#154f55)!important}
      .region-values small{font-size:8px!important;text-transform:uppercase!important;letter-spacing:.03em!important;color:#61777b!important}
      .region-values i{font-style:normal!important;color:#8a9b9e!important}
      #situationBars{display:flex!important;flex-direction:column!important;justify-content:space-between!important;flex:1!important;gap:8px!important}
      #situationBars .bar-row{min-height:30px!important}
      #historico .history-entry-card{margin-top:18px!important;border-top-color:var(--accent,#61b8e6)!important}
      #historico .history-entry-table{min-width:1450px!important}
      #historico .history-entry-table td,#historico .history-entry-table th{vertical-align:top!important}
      @media(max-width:900px){#resumen .dashboard-grid{grid-template-columns:1fr!important}}
      @media(max-width:620px){#regionMap{grid-template-columns:1fr!important}.region-values small{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    ensureAddressField();
    ensureHistoryDetail();
    scheduleEnhancement();
    ["filterService","filterRegion","filterStatus"].forEach(id => $(id)?.addEventListener("change", scheduleEnhancement));
    $("clearFilters")?.addEventListener("click", scheduleEnhancement);
    ["historyService","historyRegion","historyFrom","historyTo"].forEach(id => $(id)?.addEventListener("change", renderHistoryEntries));
    $("clearHistoryFilters")?.addEventListener("click", () => setTimeout(renderHistoryEntries, 0));
    ["service","region","commune","establishment"].forEach(id => $(id)?.addEventListener(id === "establishment" ? "blur" : "change", findPreviousAddress));
    $("reportForm")?.addEventListener("submit", () => {
      saveAddressInLastRecord();
      ["filterService","filterRegion","filterStatus"].forEach(id => { if ($(id)) $(id).value = ""; });
      setTimeout(scheduleEnhancement, 80);
      setTimeout(scheduleEnhancement, 900);
    });
    const observer = new MutationObserver(() => { if (!applying) scheduleEnhancement(); });
    [$("kpiGrid"), $("regionMap"), $("situationBars")].filter(Boolean).forEach(node => observer.observe(node, {childList:true, subtree:true}));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
