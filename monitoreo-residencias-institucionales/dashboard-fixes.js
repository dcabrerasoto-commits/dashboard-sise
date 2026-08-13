(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const key = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const cleanKey = value => key(value).replace(/[^A-Z0-9]+/g, "");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  const fmt = value => new Intl.NumberFormat("es-CL").format(Number(value || 0));
  const CHILE_TIME_ZONE = "America/Santiago";
  const formatDateTime = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Sin información" : new Intl.DateTimeFormat("es-CL", {timeZone:CHILE_TIME_ZONE,day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
  };
  const dateKey = value => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {timeZone:CHILE_TIME_ZONE, year:"numeric", month:"2-digit", day:"2-digit"}).formatToParts(date);
    const part = type => parts.find(item => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  };
  let sharedRecords = null;
  let timer = null;
  const uniqueById = input => {
    const map = new Map();
    (input || []).forEach(record => {
      const id = String(record?.id || "").trim();
      if (id) map.set(id, record);
      else map.set(`__row_${map.size}`, record);
    });
    return Array.from(map.values());
  };

  function readRecords() {
    if (Array.isArray(sharedRecords)) return sharedRecords;
    return [];
  }

  function shiftedRecord(record) {
    const service = String(record?.service || "").trim();
    return /^\d{1,2}:\d{2}(:\d{2})?$/.test(service) || /^\d{4}-\d{2}-\d{2}T/.test(service);
  }

  function identity(record) {
    const code = cleanKey(record.residenceCode || record.residenceKey || "");
    if (code) return [cleanKey(record.service), "CODIGO", code].join("|");
    return [record.service, record.region, record.commune, record.establishment].map(cleanKey).join("|");
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
      const rate = total ? Math.round(affected / total * 100) : 0;
      return `<button type="button" class="region-block ${total ? "" : "no-data"} level-${level}" data-region="${esc(region)}" title="${esc(region)}: ${fmt(total)} informadas, ${fmt(affected)} con afectación, ${fmt(rate)}%">
        <strong>${esc(region)}</strong>
        <span class="region-values"><span><b>${fmt(total)}</b><small>informadas</small></span><span><b>${fmt(affected)}</b><small>afectadas</small></span><span><b>${fmt(rate)}%</b><small>afectación</small></span></span>
      </button>`;
    }).join("");
  }

  function renderSituations(data) {
    const container = $("situationBars");
    const catalog = window.MONITOREO_CATALOGOS;
    if (!container || !catalog) return;
    const uniqueSituationBase = latestRecords(data);
    const without = uniqueSituationBase.filter(record => record.status === "Sin afectación" && !(record.situations || []).length);
    const rows = [
      {label:"Sin situaciones reportadas (sin afectación)", value:without.length},
      {label:"Con afectación", value:uniqueSituationBase.filter(isAffected).length},
      ...(catalog.situaciones || []).map(label => ({label, value:uniqueSituationBase.filter(record => hasSituation(record, label)).length}))
    ];
    const total = Math.max(1, uniqueSituationBase.length);
    container.innerHTML = rows.map(row => `<div class="bar-row"><div class="bar-label">${esc(row.label)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(row.value / total * 100)}%"></div></div><div class="bar-value"><b>${fmt(row.value)}</b><small>/ ${fmt(total)}</small></div></div>`).join("");
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
      #regionMap{grid-template-columns:1fr!important;align-content:start!important;flex:1!important;gap:5px!important}
      .region-block{display:grid!important;grid-template-columns:minmax(130px,1fr) minmax(210px,auto)!important;align-items:center!important;gap:8px!important;padding:6px 8px!important;background:#F5F7FA!important;border:0!important;box-shadow:none!important}
      .region-block strong{font-size:11.5px!important;line-height:1.2!important;color:#102A56!important;text-align:left!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .region-block.level-1{background:#EAF3FF!important}
      .region-block.level-2{background:#93C5FD!important}
      .region-block.level-3{background:#1E5AA8!important}
      .region-block.level-3 .region-values{background:rgba(255,255,255,.16)!important;border-color:transparent!important}
      .region-block.level-3 strong,.region-block.level-3 .region-values b,.region-block.level-3 .region-values small{color:#fff!important}
      .region-values{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:9px!important;white-space:nowrap!important;background:rgba(255,255,255,.58)!important;border:0!important;padding:3px 6px!important;min-width:210px!important;width:auto!important}
      .region-values>span{display:grid!important;align-items:center!important;gap:1px!important;text-align:right!important;background:transparent!important;border:0!important;padding:0!important;min-width:48px!important}
      .region-values b{font-size:13px!important;line-height:1!important;color:#102A56!important;min-width:0!important;text-align:right!important}.region-values small{font-size:7px!important;line-height:1!important;text-transform:uppercase!important;color:#56657A!important}.region-values i{display:none!important}
      .overview-grid .territory-layout{display:grid!important;grid-template-columns:1fr!important;align-items:start!important}
      .overview-grid .territory-insights,.overview-grid .chile-map-svg,.overview-grid .legend{display:none!important}
      .overview-grid #regionMap{display:grid!important;grid-template-rows:1fr auto!important;gap:8px!important;overflow:hidden!important}
      .territory-top-list{display:grid!important;gap:8px!important;align-content:start!important}
      .territory-top-head{display:grid!important;grid-template-columns:minmax(92px,1fr) 34px minmax(70px,.72fr)!important;gap:9px!important;color:#56657A!important;font-size:9px!important;font-weight:850!important;text-transform:uppercase!important;margin-bottom:2px!important}
      .territory-top-head span:nth-child(2){text-align:right!important}
      .overview-grid .region-block{min-height:17px!important;padding:0!important;display:grid!important;grid-template-columns:8px minmax(92px,1fr) 26px!important;gap:6px!important;background:transparent!important;border:0!important;box-shadow:none!important;color:#102A56!important}
      .overview-grid .region-rank{min-height:24px!important;grid-template-columns:minmax(92px,1fr) 34px minmax(70px,.72fr)!important;gap:9px!important;text-align:left!important}
      .overview-grid .region-block i{display:block!important;width:6px!important;height:6px!important;border-radius:50%!important;background:#60A5FA!important}
      .overview-grid .region-block.level-0 i{background:#DCE3EC!important}.overview-grid .region-block.level-1 i{background:#93C5FD!important}.overview-grid .region-block.level-2 i{background:#60A5FA!important}.overview-grid .region-block.level-3 i{background:#2563EB!important}.overview-grid .region-block.level-4 i{background:#1E5AA8!important}
      .overview-grid .region-block strong{font-size:9.2px!important;color:#102A56!important;font-weight:750!important}
      .overview-grid .region-values{display:flex!important;min-width:0!important;width:auto!important;background:transparent!important;padding:0!important;justify-content:end!important}
      .overview-grid .region-values b{font-size:9.6px!important;color:#102A56!important}
      .overview-grid .region-values small{display:none!important}
      .overview-grid .region-rank strong{font-size:11px!important;color:#102A56!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .overview-grid .region-rank>b{font-size:13px!important;color:#1E5AA8!important;text-align:right!important;font-variant-numeric:tabular-nums!important}
      .rank-track{height:7px!important;border-radius:999px!important;background:#EAF3FF!important;overflow:hidden!important}.rank-track i{display:block!important;height:100%!important;border-radius:999px!important;background:linear-gradient(90deg,#60A5FA,#2563EB)!important}
      .territory-detail-link{align-self:end!important;color:#1E5AA8!important;font-size:11px!important;font-weight:850!important;text-decoration:none!important}.territory-detail-link:hover{text-decoration:underline!important}
      #resumen .legend{display:flex!important;gap:8px!important;flex-wrap:wrap!important;align-items:center!important;margin-top:12px!important;padding:10px 12px!important;background:#F5F7FA!important;border:1px solid #DCE3EC!important;color:#56657A!important;font-size:11px!important}
      #resumen .legend span{display:inline-flex!important;align-items:center!important;gap:6px!important;padding:4px 8px!important;background:#fff!important;border:1px solid #DCE3EC!important;font-weight:750!important}
      #resumen .legend span::before{content:"";width:12px;height:12px;border:1px solid #DCE3EC;background:#F5F7FA}
      #resumen .legend span:nth-child(1)::before{background:#DCE3EC!important;border-color:#DCE3EC!important}#resumen .legend span:nth-child(2)::before{background:#EAF3FF!important;border-color:#93C5FD!important}#resumen .legend span:nth-child(3)::before{background:#93C5FD!important;border-color:#60A5FA!important}#resumen .legend span:nth-child(4)::before{background:#3882F6!important;border-color:#3882F6!important}#resumen .legend span:nth-child(5)::before{background:#1E5AA8!important;border-color:#1E5AA8!important}
      #situationBars{display:none!important}
      #needsBars{display:grid!important;align-content:start!important;gap:6px!important;flex:0 0 auto!important}
      #needsBars .bar-row{min-height:24px!important}.bar-fill{background:linear-gradient(90deg,#1E5AA8,#2563EB,#60A5FA)!important}.bar-label{line-height:1.25!important}.bar-value{color:#102A56!important}
      #historico .history-entry-card{margin-top:18px!important;border-top-color:#7C3AED!important}#historico .history-entry-card .table-scroll{max-height:620px!important;overflow:auto!important}#historico .history-entry-table{min-width:1450px!important}
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
      sharedRecords = event.detail && Array.isArray(event.detail.records) ? uniqueById(event.detail.records.filter(record => !shiftedRecord(record))) : null;
      scheduleRefresh(0);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
