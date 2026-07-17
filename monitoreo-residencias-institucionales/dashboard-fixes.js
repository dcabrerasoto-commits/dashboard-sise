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
  let sharedRecords = null;
  let timer = null;

  function readRecords() {
    if (Array.isArray(sharedRecords)) return sharedRecords;
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data.filter(record => !shiftedRecord(record)) : [];
    } catch (_) {
      return [];
    }
  }

  function writeRecords(records) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch (_) {}
  }

  function shiftedRecord(record) {
    const service = String(record?.service || "").trim();
    return /^\d{1,2}:\d{2}(:\d{2})?$/.test(service) || /^\d{4}-\d{2}-\d{2}T/.test(service);
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
      (!service || key(record.service) === key(service)) &&
      (!region || key(record.region) === key(region)) &&
      (!status || key(record.status) === key(status))
    );
  }

  function isAffected(record) {
    return record.status === "Con afectación" || (record.situations || []).length > 0;
  }

  function hasSituation(record, situation) {
    return (record.situations || []).some(value => key(value) === key(situation));
  }

  function renderRegions(data) {
    const container = $("regionMap");
    const catalog = window.MONITOREO_CATALOGOS;
    if (!container || !catalog) return;
    container.innerHTML = (catalog.regiones || []).map(region => {
      const rows = data.filter(record => key(record.region) === key(region));
      const total = rows.length;
      const affected = rows.filter(isAffected).length;
      const level = affected >= 6 ? 3 : affected >= 3 ? 2 : affected >= 1 ? 1 : 0;
      return `<button type="button" class="region-block level-${level}" data-region="${esc(region)}" title="${esc(region)}: ${fmt(total)} informadas, ${fmt(affected)} con afectación">
        <strong>${esc(region)}</strong>
        <span class="region-values"><span><b>${fmt(total)}</b><small>informadas</small></span><span><b>${fmt(affected)}</b><small>con afectación</small></span></span>
      </button>`;
    }).join("");
  }

  function renderSituations(data) {
    const container = $("situationBars");
    const catalog = window.MONITOREO_CATALOGOS;
    if (!container || !catalog) return;
    const without = data.filter(record => record.status === "Sin afectación" && !(record.situations || []).length);
    const rows = [
      {label:"Sin situaciones reportadas (sin afectación)", value:without.length},
      ...(catalog.situaciones || []).map(label => ({label, value:data.filter(record => hasSituation(record, label)).length}))
    ];
    const max = Math.max(1, ...rows.map(row => row.value));
    container.innerHTML = rows.map(row => `<div class="bar-row"><div class="bar-label">${esc(row.label)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(row.value / max * 100)}%"></div></div><div class="bar-value">${fmt(row.value)}</div></div>`).join("");
  }

  function centerCards() {
    document.querySelectorAll("#resumen .kpi-value").forEach(value => {
      value.style.display = "flex";
      value.style.alignItems = "center";
      value.style.justifyContent = "center";
      value.style.textAlign = "center";
      value.style.width = "100%";
    });
  }

  function ensureAddressField() {
    if ($("address")) return;
    const establishmentLabel = $("establishment")?.closest("label");
    if (!establishmentLabel) return;
    const addressLabel = document.createElement("label");
    addressLabel.className = "span-2";
    addressLabel.innerHTML = 'Dirección de la residencia<input id="address" name="address" type="text" maxlength="220" placeholder="Calle, número y referencia, si corresponde">';
    establishmentLabel.insertAdjacentElement("afterend", addressLabel);
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
    const records = readRecords();
    if (!records.length) return;
    records[records.length - 1].address = $("address")?.value.trim() || "";
    writeRecords(records);
  }

  function ensureHistoryDetail() {
    const history = $("historico");
    if (!history) return;
    const firstHeader = history.querySelector(".history-table thead th:first-child");
    if (firstHeader) firstHeader.textContent = "Fecha de reporte";
    if ($("historyEntriesBody")) return;
    const card = document.createElement("article");
    card.className = "card table-card history-entry-card";
    card.innerHTML = `<div class="card-head"><div><span class="card-kicker">DETALLE DE INGRESOS</span><h3>Reportes registrados</h3></div><span class="small-note" id="historyEntriesCount">Cada fila corresponde a un ingreso guardado</span></div>
      <div class="table-scroll"><table class="history-entry-table"><thead><tr><th>Fecha de reporte</th><th>Servicio</th><th>Región</th><th>Comuna</th><th>Residencia</th><th>Dirección</th><th>Estado</th><th>Hubo cambios</th><th>Situaciones reportadas</th><th>Responsable</th></tr></thead><tbody id="historyEntriesBody"></tbody></table></div>`;
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
    const count = $("historyEntriesCount");
    if (count) count.textContent = records.length ? `Mostrando ${records.length} ingresos guardados` : "Sin ingresos con los filtros actuales";
    body.innerHTML = records.length ? records.map(record => `<tr>
      <td>${esc(formatDateTime(record.reportDate || record.createdAt))}</td><td>${esc(record.service || "")}</td><td>${esc(record.region || "")}</td><td>${esc(record.commune || "")}</td>
      <td>${esc(record.establishment || "")}</td><td>${esc(record.address || "Sin información")}</td><td>${esc(record.status || "Sin información")}</td><td>${esc(record.hasChanges || "No aplica")}</td>
      <td>${esc((record.situations || []).join(", ") || (record.status === "Sin afectación" ? "Sin situaciones reportadas (sin afectación)" : "Sin situaciones reportadas"))}</td><td>${esc(record.responsible || "")}</td>
    </tr>`).join("") : '<tr><td colspan="10">Sin ingresos para el período seleccionado.</td></tr>';
  }

  function refresh() {
    const data = filteredLatest();
    centerCards();
    renderRegions(data);
    renderSituations(data);
    renderHistoryEntries();
  }

  function scheduleRefresh(delay = 30) {
    clearTimeout(timer);
    timer = setTimeout(refresh, delay);
  }

  function injectStyles() {
    if ($("dashboard-balance-styles")) return;
    const style = document.createElement("style");
    style.id = "dashboard-balance-styles";
    style.textContent = `
      #resumen .kpi{display:grid!important;grid-template-rows:auto 1fr auto!important}
      #resumen .kpi-value{display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;width:100%!important;min-height:38px!important}
      #resumen .dashboard-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;align-items:stretch!important}
      #resumen .dashboard-grid>.card{height:100%!important;display:flex!important;flex-direction:column!important}
      #regionMap{grid-template-columns:repeat(2,minmax(0,1fr))!important;align-content:start!important;flex:1!important;gap:10px!important}
      .region-block{display:grid!important;grid-template-columns:minmax(110px,1fr) auto!important;align-items:center!important;gap:10px!important;padding:10px 11px!important;background:#f8fbfa!important;border:1px solid #c7d8d6!important;box-shadow:0 1px 0 rgba(11,54,59,.06)!important}
      .region-block strong{font-size:12.5px!important;color:#173f45!important;text-align:left!important}
      .region-block.level-1{background:#eef9ff!important;border-color:#9fd3ed!important}
      .region-block.level-2{background:#c6e9fa!important;border-color:#66b7df!important}
      .region-block.level-3{background:#287fae!important;border-color:#176f9d!important}
      .region-block.level-3 .region-values{background:rgba(255,255,255,.16)!important;border-color:rgba(255,255,255,.35)!important}
      .region-block.level-3 strong,.region-block.level-3 .region-values b,.region-block.level-3 .region-values small{color:#fff!important}
      .region-values{display:flex!important;align-items:center!important;justify-content:center!important;gap:10px!important;white-space:nowrap!important;background:#fff!important;border:1px solid #dfe9e7!important;padding:5px 8px!important;min-width:138px!important}
      .region-values>span{display:inline-flex!important;align-items:baseline!important;gap:3px!important;text-align:center!important;background:transparent!important;border:0!important;padding:0!important;min-width:0!important}
      .region-values b{font-size:15px!important;line-height:1!important;color:var(--primary,#154f55)!important}.region-values small{font-size:7px!important;line-height:1!important;text-transform:uppercase!important;color:#61777b!important}.region-values i{display:none!important}
      #resumen .legend{display:flex!important;gap:8px!important;flex-wrap:wrap!important;align-items:center!important;margin-top:12px!important;padding:10px 12px!important;background:#f8fbfa!important;border:1px solid #d8e5e3!important;color:#38595e!important;font-size:11px!important}
      #resumen .legend span{display:inline-flex!important;align-items:center!important;gap:6px!important;padding:4px 8px!important;background:#fff!important;border:1px solid #e1e8e7!important;font-weight:750!important}
      #resumen .legend span::before{content:"";width:12px;height:12px;border:1px solid #b8c9c7;background:#f4f7f6}
      #resumen .legend span:nth-child(2)::before{background:#eef9ff;border-color:#9fd3ed}#resumen .legend span:nth-child(3)::before{background:#c6e9fa;border-color:#66b7df}#resumen .legend span:nth-child(4)::before{background:#287fae;border-color:#176f9d}
      #situationBars{display:flex!important;flex-direction:column!important;justify-content:space-between!important;flex:1!important;gap:8px!important}#situationBars .bar-row{min-height:30px!important}
      #historico .history-entry-card{margin-top:18px!important;border-top-color:var(--accent,#61b8e6)!important}#historico .history-entry-card .table-scroll{max-height:620px!important;overflow:auto!important}#historico .history-entry-table{min-width:1450px!important}
      @media(max-width:900px){#resumen .dashboard-grid{grid-template-columns:1fr!important}}@media(max-width:620px){#regionMap{grid-template-columns:1fr!important}.region-values small{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    ensureAddressField();
    ensureHistoryDetail();
    scheduleRefresh(80);
    ["filterService","filterRegion","filterStatus"].forEach(id => $(id)?.addEventListener("change", () => scheduleRefresh()));
    $("clearFilters")?.addEventListener("click", () => scheduleRefresh());
    ["historyService","historyRegion","historyFrom","historyTo"].forEach(id => $(id)?.addEventListener("change", renderHistoryEntries));
    $("clearHistoryFilters")?.addEventListener("click", () => setTimeout(renderHistoryEntries, 0));
    ["service","region","commune","establishment"].forEach(id => $(id)?.addEventListener(id === "establishment" ? "blur" : "change", findPreviousAddress));
    $("reportForm")?.addEventListener("submit", () => {
      setTimeout(saveAddressInLastRecord, 0);
      setTimeout(() => scheduleRefresh(), 60);
      setTimeout(() => scheduleRefresh(), 900);
    });
    window.addEventListener("residencias:shared-data", event => {
      sharedRecords = event.detail && Array.isArray(event.detail.records) ? event.detail.records.filter(record => !shiftedRecord(record)) : null;
      scheduleRefresh(0);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
