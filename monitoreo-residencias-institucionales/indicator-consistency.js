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

  function baseLatest() {
    const service = $("filterService")?.value || "";
    const region = $("filterRegion")?.value || "";
    return latestByResidence(records).filter(record =>
      (!service || key(record.service) === key(service)) &&
      (!region || key(record.region) === key(region))
    );
  }

  function filteredLatest() {
    const selectedCategory = $("filterStatus")?.value || "";
    return baseLatest().filter(record => !selectedCategory || key(category(record)) === key(selectedCategory));
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

  function renderKpis(data) {
    const without = data.filter(record => category(record) === "Sin afectación");
    const affected = data.filter(record => category(record) === "Con afectación");
    const evaluation = data.filter(record => category(record) === "En evaluación");

    setCard(["RESIDENCIASSINAFECTACION"], without.length);
    setCard(["RESIDENCIASCONAFECTACION"], affected.length);
    setCard(["RESIDENCIASENEVALUACION", "ENEVALUACION"], evaluation.length);
    setCard(["RESIDENCIASSINELECTRICIDAD"], data.filter(record => hasSituation(record, "Sin electricidad")).length);
    setCard(["RESIDENCIASCONAGUASSERVIDAS", "AGUASSERVIDAS"], data.filter(record => hasSituation(record, "Exposición a aguas servidas")).length);
    setCard(["RESIDENCIASCON ELECTRODEPENDIENTES", "ELECTRODEPENDIENTES"], data.filter(record => key(record.electrodependent) === "SI" || Number(record.electrodependentCount || 0) > 0).length);

    const uniqueGrid = $("uniqueMetricsGrid");
    if (uniqueGrid) {
      [...uniqueGrid.querySelectorAll(".unique-kpi")].forEach(card => {
        if (key(card.querySelector(".kpi-label")?.textContent) === "RESIDENCIASINFORMADAS") {
          const target = card.querySelector(".kpi-value");
          if (target) target.textContent = fmt(data.length);
        }
      });
    }
  }

  function renderSituations(data) {
    const container = $("situationBars");
    const catalog = window.MONITOREO_CATALOGOS || {};
    if (!container) return;
    const rows = [
      {label:"Sin afectación", value:data.filter(record => category(record) === "Sin afectación").length},
      {label:"Con afectación", value:data.filter(record => category(record) === "Con afectación").length},
      {label:"En evaluación", value:data.filter(record => category(record) === "En evaluación").length},
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
      return `<tr><td>${esc(region)}</td><td>${fmt(rows.length)}</td><td>${fmt(rows.filter(record => category(record) === "Sin afectación").length)}</td><td>${fmt(rows.filter(record => category(record) === "Con afectación").length)}</td><td>${fmt(rows.filter(record => hasSituation(record, "Sin electricidad")).length)}</td><td>${fmt(rows.filter(record => hasSituation(record, "Exposición a aguas servidas")).length)}</td><td>${fmt(rows.filter(record => key(record.electrodependent) === "SI" || Number(record.electrodependentCount || 0) > 0).length)}</td><td>${esc(latestDate(rows))}</td></tr>`;
    }).join("");
  }

  function validateInvariant(data) {
    const counts = ["Sin afectación", "Con afectación", "En evaluación"].map(name => data.filter(record => category(record) === name).length);
    const total = counts.reduce((sum, value) => sum + value, 0);
    document.documentElement.dataset.indicatorInvariant = total === data.length ? "ok" : "error";
  }

  function refresh() {
    const data = filteredLatest();
    renderKpis(data);
    renderSituations(data);
    renderRegions(data);
    renderRegionTable(data);
    validateInvariant(data);
  }

  function schedule(delay = 0) {
    clearTimeout(timer);
    timer = setTimeout(refresh, delay);
  }

  function init() {
    ["filterService", "filterRegion", "filterStatus"].forEach(id => $(id)?.addEventListener("change", () => schedule(20)));
    $("clearFilters")?.addEventListener("click", () => schedule(40));
    window.addEventListener("residencias:shared-data", event => {
      records = Array.isArray(event.detail?.records) ? event.detail.records : [];
      schedule(80);
    });
    schedule(500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();