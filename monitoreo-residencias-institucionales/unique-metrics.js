(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const fmt = value => new Intl.NumberFormat("es-CL").format(Number(value || 0));
  const key = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "").toUpperCase().trim();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  let records = [];
  const CHILE_TIME_ZONE = "America/Santiago";

  function parseDateValue(value) {
    if (value instanceof Date) return value;
    const text = String(value || "").trim();
    const local = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (local) return new Date(Date.UTC(Number(local[1]), Number(local[2]) - 1, Number(local[3]), Number(local[4]) + 4, Number(local[5]), Number(local[6] || 0)));
    const cl = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (cl) return new Date(Date.UTC(Number(cl[3]), Number(cl[2]) - 1, Number(cl[1]), Number(cl[4] || 12) + 4, Number(cl[5] || 0), Number(cl[6] || 0)));
    return new Date(value);
  }

  function dateKey(value) {
    const date = parseDateValue(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {timeZone:CHILE_TIME_ZONE, year:"numeric", month:"2-digit", day:"2-digit"}).formatToParts(date);
    const part = type => parts.find(item => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  }

  function formatDate(value) {
    if (!value) return "Sin fecha";
    const parts = value.split("-");
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : value;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function identity(record) {
    const official = record.residenceCode || record.residenceKey || "";
    if (official) return `${key(record.service)}|${key(official)}`;
    return [record.service, record.region, record.commune, record.establishment].map(key).join("|");
  }

  function latestByResidence(input) {
    const map = new Map();
    (input || []).forEach(record => {
      const id = identity(record);
      if (!id || !record.service || !record.region || !record.establishment) return;
      const current = new Date(record.reportDate || record.createdAt || 0).getTime() || 0;
      const previous = map.get(id);
      const previousTime = previous ? (new Date(previous.reportDate || previous.createdAt || 0).getTime() || 0) : -1;
      if (!previous || current >= previousTime) map.set(id, record);
    });
    return [...map.values()];
  }

  function uniqueCount(input) {
    return new Set((input || []).map(identity).filter(Boolean)).size;
  }

  function summaryBaseRecords() {
    const service = $("filterService")?.value || "";
    const region = $("filterRegion")?.value || "";
    return records.filter(record =>
      (!service || key(record.service) === key(service)) &&
      (!region || key(record.region) === key(region))
    );
  }

  function summaryLatestRecords() {
    const status = $("filterStatus")?.value || "";
    return latestByResidence(summaryBaseRecords()).filter(record => !status || key(record.status) === key(status));
  }

  function firstReportDates(input) {
    const first = new Map();
    input.forEach(record => {
      const id = identity(record);
      const day = dateKey(record.reportDate || record.createdAt);
      if (!id || !day) return;
      const previous = first.get(id);
      if (!previous || day < previous) first.set(id, day);
    });
    return first;
  }

  function dailyStats(input) {
    const first = firstReportDates(input);
    const groups = new Map();
    input.forEach(record => {
      const day = dateKey(record.reportDate || record.createdAt);
      if (!day) return;
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(record);
    });

    const dates = [...groups.keys()].sort();
    return dates.map(day => {
      const rows = groups.get(day) || [];
      const uniqueDaily = uniqueCount(rows);
      const newResidences = [...new Set(rows.map(identity).filter(Boolean))].filter(id => first.get(id) === day).length;
      const current = latestByResidence(rows);
      const cumulative = [...first.values()].filter(firstDay => firstDay <= day).length;
      return {
        day,
        reports: rows.length,
        uniqueDaily,
        newResidences,
        updates: Math.max(0, rows.length - newResidences),
        cumulative,
        affected: current.filter(record => record.status === "Con afectación" || (record.situations || []).length > 0).length,
        without: current.filter(record => record.status === "Sin afectación").length,
        evaluation: current.filter(record => record.status === "En evaluación").length
      };
    });
  }

  function ensureSummaryMetrics() {
    if ($("uniqueMetricsGrid")) return;
    const kpiGrid = $("kpiGrid");
    if (!kpiGrid) return;
    const section = document.createElement("section");
    section.className = "unique-metrics-section";
    section.innerHTML = `
      <div class="unique-metrics-head">
        <div><span class="card-kicker">REGISTROS RECIBIDOS</span><h3>Residencias únicas y reportes recibidos</h3></div>
        <span class="small-note">Una residencia puede enviar más de un reporte</span>
      </div>
      <div class="unique-metrics-grid" id="uniqueMetricsGrid"></div>`;
    kpiGrid.insertAdjacentElement("beforebegin", section);
  }

  function renderSummaryMetrics() {
    ensureSummaryMetrics();
    const container = $("uniqueMetricsGrid");
    if (!container) return;

    const base = summaryBaseRecords();
    const latest = summaryLatestRecords();
    const stats = dailyStats(base);
    const today = todayKey();
    const todayStats = stats.find(row => row.day === today);
    const cards = [
      ["residencias.svg", "Residencias informadas", latest.length, "Total acumulado de residencias únicas que han reportado al menos una vez en la plataforma"],
      ["reportes.svg", "Reportes recibidos", base.length, "Total acumulado de formularios recibidos en la plataforma"],
      ["reportadas_hoy.svg", "Residencias que reportaron hoy", todayStats ? todayStats.uniqueDaily : 0, "N° de residencias que enviaron al menos un reporte hoy"],
      ["reportes_hoy.svg", "Reportes recibidos hoy", todayStats ? todayStats.reports : 0, "Total de formularios recibidos hoy"]
    ];
    container.innerHTML = cards.map(([icon, label, value, sub]) => `<article class="kpi unique-kpi" tabindex="0" title="${esc(sub)}" data-definition="${esc(sub)}"><span class="unique-kpi-icon"><img src="iconos_svg/${esc(icon)}" alt=""></span><div class="unique-kpi-copy"><div class="kpi-value">${fmt(value)}</div><div class="kpi-label">${esc(label)}</div><div class="kpi-sub">${esc(sub)}</div></div></article>`).join("");

  }

  function detailFilteredLatest() {
    const service = $("detailService")?.value || "";
    const region = $("detailRegion")?.value || "";
    const situation = $("detailSituation")?.value || "";
    const search = key($("detailSearch")?.value || "");
    return latestByResidence(records).filter(record =>
      (!service || key(record.service) === key(service)) &&
      (!region || key(record.region) === key(region)) &&
      (!situation || (record.situations || []).some(item => key(item) === key(situation))) &&
      (!search || [record.service, record.program, record.region, record.commune, record.establishment, record.responsible].some(value => key(value).includes(search)))
    );
  }

  function ensureDetailCount() {
    if ($("detailUniqueCount")) return;
    const heading = document.querySelector("#detalle .section-heading");
    if (!heading) return;
    const note = document.createElement("p");
    note.id = "detailUniqueCount";
    note.className = "unique-count-note";
    heading.appendChild(note);
  }

  function renderDetailCount() {
    ensureDetailCount();
    const note = $("detailUniqueCount");
    if (!note) return;
    const visible = detailFilteredLatest();
    const total = latestByResidence(records).length;
    note.innerHTML = `<strong>${fmt(visible.length)}</strong> residencias informadas visibles. Cada fila muestra solamente el reporte más reciente de una residencia. <span>Total nacional informado: <strong>${fmt(total)}</strong>.</span>`;
  }

  function historyBaseRecords() {
    const service = $("historyService")?.value || "";
    const region = $("historyRegion")?.value || "";
    return records.filter(record =>
      (!service || key(record.service) === key(service)) &&
      (!region || key(record.region) === key(region))
    );
  }

  function ensureHistoryDefinition() {
    if ($("historyUniqueDefinition")) return;
    const heading = document.querySelector("#historico .section-heading");
    if (!heading) return;
    const note = document.createElement("p");
    note.id = "historyUniqueDefinition";
    note.className = "unique-count-note";
    note.textContent = "Nuevas residencias son las informadas por primera vez ese día. Residencias actualizadas son las que ya estaban registradas y enviaron nueva información. El total hasta la fecha cuenta cada residencia una sola vez.";
    heading.appendChild(note);
  }

  function renderHistoryTable() {
    ensureHistoryDefinition();
    const table = document.querySelector("#historico .history-table");
    const body = $("historyTableBody");
    if (!table || !body) return;

    const from = $("historyFrom")?.value || "";
    const to = $("historyTo")?.value || "";
    const stats = dailyStats(historyBaseRecords()).filter(row => (!from || row.day >= from) && (!to || row.day <= to)).sort((a, b) => b.day.localeCompare(a.day));

    table.querySelector("thead").innerHTML = `<tr>
      <th>Fecha de reporte</th>
      <th>Reportes recibidos</th>
      <th>Residencias que reportaron</th>
      <th>Nuevas residencias</th>
      <th>Residencias actualizadas</th>
      <th>Total de residencias informadas hasta la fecha</th>
      <th>Con afectación</th>
      <th>Sin afectación</th>
      <th>En evaluación</th>
    </tr>`;

    body.innerHTML = stats.length ? stats.map(row => `<tr>
      <td>${esc(formatDate(row.day))}</td>
      <td>${fmt(row.reports)}</td>
      <td>${fmt(row.uniqueDaily)}</td>
      <td><strong>+${fmt(row.newResidences)}</strong></td>
      <td>${fmt(row.updates)}</td>
      <td><strong>${fmt(row.cumulative)}</strong></td>
      <td>${fmt(row.affected)}</td>
      <td>${fmt(row.without)}</td>
      <td>${fmt(row.evaluation)}</td>
    </tr>`).join("") : '<tr><td colspan="9">Sin registros para el período seleccionado.</td></tr>';
  }

  function renderAll() {
    renderSummaryMetrics();
  }

  function setupStyles() {
    if ($("unique-metrics-styles")) return;
    const style = document.createElement("style");
    style.id = "unique-metrics-styles";
    style.textContent = `
      .unique-metrics-section{margin:0 0 8px;padding:14px 20px;background:#FFFFFF;border:1px solid #E6ECF3;border-radius:10px;box-shadow:0 8px 22px rgba(16,42,86,.06)}
      .unique-metrics-head{display:none}
      .unique-metrics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}
      .unique-kpi{min-height:84px!important;display:grid!important;grid-template-columns:54px minmax(0,1fr)!important;grid-template-rows:1fr!important;column-gap:12px!important;align-content:center!important;align-items:center!important;justify-content:start!important;text-align:left!important;overflow:visible!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:0 16px!important}
      .unique-kpi::before{display:none!important}
      .unique-kpi-icon{grid-row:1 / span 3;align-self:center;justify-self:start;width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#5B21B6,#8B5CF6);display:grid;place-items:center}
      .unique-kpi:nth-child(2) .unique-kpi-icon{background:linear-gradient(135deg,rgba(141,45,117,.92),rgba(181,72,139,.82))}
      .unique-kpi:nth-child(3) .unique-kpi-icon,.unique-kpi:nth-child(4) .unique-kpi-icon{background:linear-gradient(135deg,#2563EB,#60A5FA)}
      .unique-kpi-icon img{width:25px;height:25px;filter:brightness(0) invert(1)}
      .unique-kpi+.unique-kpi{border-left:1px solid #DCE3EC!important}
      .unique-kpi-copy{grid-column:2!important;grid-row:1!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;text-align:left!important;min-width:0!important;width:100%!important}
      .unique-kpi .kpi-value{display:block!important;align-self:flex-start!important;justify-self:start!important;text-align:left!important;font-size:31px!important;color:#5B21B6!important;line-height:1!important;margin:0 0 7px!important;height:auto!important;font-variant-numeric:tabular-nums!important}
      .unique-kpi:nth-child(2) .kpi-value{color:#7E2E70!important}
      .unique-kpi:nth-child(3) .kpi-value,.unique-kpi:nth-child(4) .kpi-value{color:#2563EB!important}
      .unique-kpi .kpi-label{color:#14213D!important;font-size:10px!important;line-height:1.1!important;align-self:flex-start!important;justify-self:start!important;text-align:left!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;width:100%!important}
      .unique-kpi .kpi-sub{color:#56657A!important;font-size:9.5px!important;line-height:1.2!important;margin:8px 0 0!important;padding:0!important;border:0!important;text-align:left!important;align-self:flex-start!important;justify-self:start!important;width:100%!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
      .unique-count-note{margin-top:12px!important;padding:9px 0 0;background:transparent;border:0;border-top:1px solid #DCE3EC;color:#56657A}
      .unique-count-note span{margin-left:8px}
      @media(max-width:900px){.unique-metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.unique-metrics-head{display:block}.unique-metrics-head .small-note{display:block;margin-top:6px}}
      @media(max-width:900px){.unique-kpi:nth-child(3){border-left:0!important}.unique-kpi:nth-child(n+3){border-top:1px solid rgba(7,27,77,.09)!important;padding-top:16px!important;margin-top:12px!important}}
      @media(max-width:520px){.unique-metrics-grid{grid-template-columns:1fr;gap:0}.unique-metrics-section{padding:17px}.unique-kpi{min-height:94px!important;padding:13px 0!important;border-left:0!important;grid-template-columns:58px minmax(0,1fr)!important;grid-template-rows:36px 17px 30px!important}.unique-kpi+.unique-kpi{border-left:0!important;border-top:1px solid rgba(7,27,77,.09)!important}.unique-kpi .kpi-value{font-size:30px!important;height:34px!important}.unique-kpi-icon{width:56px;height:56px}.unique-kpi-icon img{width:26px;height:26px}.unique-count-note span{display:block;margin:5px 0 0}}
    `;
    document.head.appendChild(style);
  }

  function bindRefreshEvents() {
    ["filterService", "filterRegion", "filterStatus"].forEach(id => $(id)?.addEventListener("change", () => setTimeout(renderSummaryMetrics, 0)));
    $("clearFilters")?.addEventListener("click", () => setTimeout(renderSummaryMetrics, 10));
    ["historyService", "historyRegion", "historyFrom", "historyTo"].forEach(id => $(id)?.addEventListener("change", () => setTimeout(renderHistoryTable, 0)));
  }

  function init() {
    setupStyles();
    bindRefreshEvents();
    window.addEventListener("residencias:shared-data", event => {
      records = event.detail && Array.isArray(event.detail.records) ? event.detail.records : [];
      setTimeout(renderAll, 0);
    });
    renderAll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
