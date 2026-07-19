(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const key = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "").toUpperCase().trim();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  const fmt = value => new Intl.NumberFormat("es-CL").format(Number(value || 0));
  const CHILE_TIME_ZONE = "America/Santiago";
  let records = [];
  let timer = null;

  function identity(record) {
    const official = key(record.residenceCode || record.residenceKey || "");
    if (official) return `${key(record.service)}|CODIGO|${official}`;
    return [record.service, record.region, record.commune, record.establishment].map(key).join("|");
  }

  function latestByResidence(input) {
    const map = new Map();
    (input || []).forEach(record => {
      if (!record?.service || !record?.region || !record?.establishment) return;
      const id = identity(record);
      const current = new Date(record.reportDate || record.createdAt || 0).getTime() || 0;
      const previous = map.get(id);
      const previousTime = previous ? (new Date(previous.reportDate || previous.createdAt || 0).getTime() || 0) : -1;
      if (!previous || current >= previousTime) map.set(id, record);
    });
    return [...map.values()];
  }

  function category(record) {
    const status = key(record.status);
    const hasSituations = Array.isArray(record.situations) && record.situations.some(value => key(value));
    if (status === "ENEVALUACION") return "En evaluación";
    if (status === "CONAFECTACION" || hasSituations) return "Con afectación";
    if (status === "SINAFECTACION") return "Sin afectación";
    return "En evaluación";
  }

  function hasSituation(record, situation) {
    return (record.situations || []).some(value => key(value) === key(situation));
  }

  function canonicalLatest() {
    return latestByResidence(records);
  }

  function filterCollection(input, service = "", region = "", selectedCategory = "") {
    return input.filter(record =>
      (!service || key(record.service) === key(service)) &&
      (!region || key(record.region) === key(region)) &&
      (!selectedCategory || key(category(record)) === key(selectedCategory))
    );
  }

  function filteredLatest() {
    return filterCollection(
      canonicalLatest(),
      $("filterService")?.value || "",
      $("filterRegion")?.value || "",
      $("filterStatus")?.value || ""
    );
  }

  function formatDateTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Sin información" : new Intl.DateTimeFormat("es-CL", {
      timeZone: CHILE_TIME_ZONE, day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"
    }).format(date);
  }

  function latestDate(rows) {
    const values = rows.map(record => record.reportDate || record.createdAt).filter(Boolean);
    if (!values.length) return "Sin información";
    return formatDateTime(values.sort((a, b) => new Date(b) - new Date(a))[0]);
  }

  function setCard(labelMatch, value) {
    document.querySelectorAll("#kpiGrid .kpi").forEach(card => {
      const label = key(card.querySelector(".kpi-label")?.textContent || "");
      if (!labelMatch.some(match => label.includes(key(match)))) return;
      const target = card.querySelector(".kpi-value");
      if (target) target.textContent = fmt(value);
    });
  }

  function countsFor(data) {
    return {
      total: data.length,
      without: data.filter(record => category(record) === "Sin afectación").length,
      affected: data.filter(record => category(record) === "Con afectación").length,
      evaluation: data.filter(record => category(record) === "En evaluación").length
    };
  }

  function renderKpis(data) {
    const counts = countsFor(data);
    setCard(["RESIDENCIASSINAFECTACION"], counts.without);
    setCard(["RESIDENCIASCONAFECTACION"], counts.affected);
    setCard(["RESIDENCIASENEVALUACION", "ENEVALUACION"], counts.evaluation);
    setCard(["RESIDENCIASSINELECTRICIDAD"], data.filter(record => hasSituation(record, "Sin electricidad")).length);
    setCard(["RESIDENCIASCONAGUASSERVIDAS", "AGUASSERVIDAS"], data.filter(record => hasSituation(record, "Exposición a aguas servidas")).length);
    setCard(["RESIDENCIAS CON ELECTRODEPENDIENTES", "ELECTRODEPENDIENTES"], data.filter(record => key(record.electrodependent) === "SI" || Number(record.electrodependentCount || 0) > 0).length);

    const uniqueGrid = $("uniqueMetricsGrid");
    if (uniqueGrid) {
      [...uniqueGrid.querySelectorAll(".unique-kpi")].forEach(card => {
        if (key(card.querySelector(".kpi-label")?.textContent) === "RESIDENCIASINFORMADAS") {
          const target = card.querySelector(".kpi-value");
          if (target) target.textContent = fmt(counts.total);
        }
      });
    }
  }

  function renderSituations(data) {
    const container = $("situationBars");
    const catalog = window.MONITOREO_CATALOGOS || {};
    if (!container) return;
    const counts = countsFor(data);
    const rows = [
      {label:"Sin afectación", value:counts.without},
      {label:"Con afectación", value:counts.affected},
      {label:"En evaluación", value:counts.evaluation},
      ...(catalog.situaciones || []).map(label => ({label, value:data.filter(record => hasSituation(record, label)).length}))
    ];
    const max = Math.max(1, ...rows.map(row => row.value));
    container.innerHTML = rows.map(row => `<div class="bar-row"><div class="bar-label">${esc(row.label)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(row.value / max * 100)}%"></div></div><div class="bar-value">${fmt(row.value)}</div></div>`).join("");
  }

  function renderRegions(data) {
    const container = $("regionMap");
    const catalog = window.MONITOREO_CATALOGOS || {};
    if (!container) return;
    container.innerHTML = (catalog.regiones || []).map(region => {
      const rows = data.filter(record => key(record.region) === key(region));
      const affected = rows.filter(record => category(record) === "Con afectación").length;
      const level = affected >= 6 ? 3 : affected >= 3 ? 2 : affected >= 1 ? 1 : 0;
      return `<button type="button" class="region-block level-${level}" data-region="${esc(region)}" title="${esc(region)}: ${fmt(rows.length)} informadas, ${fmt(affected)} con afectación"><strong>${esc(region)}</strong><span class="region-values"><span><b>${fmt(rows.length)}</b><small>informadas</small></span><span><b>${fmt(affected)}</b><small>con afectación</small></span></span></button>`;
    }).join("");
  }

  function renderRegionTable(data) {
    const body = $("regionTableBody");
    const catalog = window.MONITOREO_CATALOGOS || {};
    if (!body) return;
    body.innerHTML = (catalog.regiones || []).map(region => {
      const rows = data.filter(record => key(record.region) === key(region));
      const counts = countsFor(rows);
      return `<tr><td>${esc(region)}</td><td>${fmt(counts.total)}</td><td>${fmt(counts.without)}</td><td>${fmt(counts.affected)}</td><td>${fmt(rows.filter(record => hasSituation(record, "Sin electricidad")).length)}</td><td>${fmt(rows.filter(record => hasSituation(record, "Exposición a aguas servidas")).length)}</td><td>${fmt(rows.filter(record => key(record.electrodependent) === "SI" || Number(record.electrodependentCount || 0) > 0).length)}</td><td>${esc(latestDate(rows))}</td></tr>`;
    }).join("");
  }

  function invariantResult(data) {
    const counts = countsFor(data);
    return {...counts, ok:counts.total === counts.without + counts.affected + counts.evaluation};
  }

  function auditAllFilters() {
    const latest = canonicalLatest();
    const catalog = window.MONITOREO_CATALOGOS || {};
    const services = ["", ...(catalog.servicios || [])];
    const regions = ["", ...(catalog.regiones || [])];
    const statuses = ["", "Sin afectación", "Con afectación", "En evaluación"];
    const failures = [];

    services.forEach(service => regions.forEach(region => statuses.forEach(status => {
      const result = invariantResult(filterCollection(latest, service, region, status));
      if (!result.ok) failures.push({service, region, status, ...result});
    })));

    const audit = {
      ok: failures.length === 0,
      checkedAt: new Date().toISOString(),
      combinations: services.length * regions.length * statuses.length,
      uniqueResidences: latest.length,
      failures
    };
    window.MONITOREO_INDICATOR_AUDIT = audit;
    document.documentElement.dataset.indicatorAudit = audit.ok ? "ok" : "error";
    if (!audit.ok) console.error("Inconsistencia de indicadores detectada", audit);
    return audit;
  }

  function refresh() {
    const data = filteredLatest();
    renderKpis(data);
    renderSituations(data);
    renderRegions(data);
    renderRegionTable(data);
    const current = invariantResult(data);
    document.documentElement.dataset.indicatorInvariant = current.ok ? "ok" : "error";
    auditAllFilters();
  }

  function schedule(delay = 0) {
    clearTimeout(timer);
    timer = setTimeout(refresh, delay);
  }

  function init() {
    ["filterService", "filterRegion", "filterStatus"].forEach(id => $(id)?.addEventListener("change", () => schedule(30)));
    $("clearFilters")?.addEventListener("click", () => schedule(60));
    window.addEventListener("residencias:shared-data", event => {
      records = Array.isArray(event.detail?.records) ? event.detail.records : [];
      schedule(100);
    });
    schedule(600);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
