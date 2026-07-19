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
      ["Residencias informadas", latest.length, "Total acumulado de residencias únicas que han reportado al menos una vez en la plataforma"],
      ["Reportes recibidos", base.length, "Total acumulado de formularios recibidos en la plataforma"],
      ["Residencias que reportaron hoy", todayStats ? todayStats.uniqueDaily : 0, "N° de residencias que enviaron al menos un reporte hoy"],
      ["Reportes recibidos hoy", todayStats ? todayStats.reports : 0, "Total de formularios recibidos hoy"]
    ];
    container.innerHTML = cards.map(([label, value, sub]) => `<article class="kpi unique-kpi" tabindex="0" title="${esc(sub)}" data-definition="${esc(sub)}"><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${fmt(value)}</div><div class="kpi-sub">${esc(sub)}</div></article>`).join("");

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
    renderDetailCount();
    renderHistoryTable();
  }

  function setupStyles() {
    if ($("unique-metrics-styles")) return;
    const style = document.createElement("style");
    style.id = "unique-metrics-styles";
    style.textContent = `
      .unique-metrics-section{margin:0 0 18px;padding:16px;background:#fff;border:1px solid #d8e5e3;border-top:5px solid #61b8e6}
      .unique-metrics-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}
      .unique-metrics-head h3{margin:3px 0 0;color:#153f45}
      .unique-metrics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
      .unique-kpi{min-height:126px!important;display:grid!important;grid-template-rows:auto 1fr auto!important;overflow:visible!important}
      .unique-kpi .kpi-value{display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important}
      .unique-count-note{margin-top:8px!important;padding:10px 12px;background:#eef8fc;border-left:4px solid #61b8e6;color:#315b62}
      .unique-count-note span{margin-left:8px}
      #historico .history-table th:nth-child(4),#historico .history-table th:nth-child(6){background:#176777}
      #historico .history-table td:nth-child(4),#historico .history-table td:nth-child(6){background:#f1f9fb}
      @media(max-width:900px){.unique-metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.unique-metrics-head{display:block}.unique-metrics-head .small-note{display:block;margin-top:6px}}
      @media(max-width:520px){.unique-metrics-grid{grid-template-columns:1fr 1fr;gap:8px}.unique-metrics-section{padding:12px}.unique-kpi{min-height:116px!important}.unique-count-note span{display:block;margin:5px 0 0}}
    `;
    document.head.appendChild(style);
  }

  function bindRefreshEvents() {
    ["filterService", "filterRegion", "filterStatus"].forEach(id => $(id)?.addEventListener("change", () => setTimeout(renderSummaryMetrics, 0)));
    $("clearFilters")?.addEventListener("click", () => setTimeout(renderSummaryMetrics, 10));
    ["detailService", "detailRegion", "detailSituation"].forEach(id => $(id)?.addEventListener("change", () => setTimeout(renderDetailCount, 0)));
    $("detailSearch")?.addEventListener("input", () => setTimeout(renderDetailCount, 0));
    ["historyService", "historyRegion", "historyFrom", "historyTo"].forEach(id => $(id)?.addEventListener("change", () => setTimeout(renderHistoryTable, 0)));
    $("clearHistoryFilters")?.addEventListener("click", () => setTimeout(renderHistoryTable, 10));
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
