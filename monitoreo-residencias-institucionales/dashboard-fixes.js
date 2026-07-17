(() => {
  "use strict";

  const STORAGE_KEY = "mdsf-monitoreo-residencias-v2";
  const $ = id => document.getElementById(id);
  const key = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  const fmt = value => new Intl.NumberFormat("es-CL").format(Number(value || 0));
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
    const rows = [{
      label: "Sin situaciones reportadas",
      value: data.filter(record => !(record.situations || []).length).length
    }, ...base.map(label => ({label, value: data.filter(record => hasSituation(record, label)).length}))];
    const max = Math.max(1, ...rows.map(row => row.value));
    container.innerHTML = rows.map(row => `<div class="bar-row"><div class="bar-label">${esc(row.label)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(row.value / max * 100)}%"></div></div><div class="bar-value">${fmt(row.value)}</div></div>`).join("");
  }

  function centerCards() {
    document.querySelectorAll("#resumen .kpi").forEach(card => {
      const value = card.querySelector(".kpi-value");
      if (value) value.style.cssText += ";display:flex;align-items:center;justify-content:center;text-align:center;width:100%;";
    });
  }

  function applyEnhancements() {
    if (applying) return;
    applying = true;
    const data = filteredLatest();
    centerCards();
    enhanceRegions(data);
    enhanceSituations(data);
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
      @media(max-width:900px){#resumen .dashboard-grid{grid-template-columns:1fr!important}}
      @media(max-width:620px){#regionMap{grid-template-columns:1fr!important}.region-values small{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    scheduleEnhancement();
    ["filterService","filterRegion","filterStatus"].forEach(id => $(id)?.addEventListener("change", scheduleEnhancement));
    $("clearFilters")?.addEventListener("click", scheduleEnhancement);
    $("reportForm")?.addEventListener("submit", () => {
      ["filterService","filterRegion","filterStatus"].forEach(id => { if ($(id)) $(id).value = ""; });
      setTimeout(scheduleEnhancement, 80);
      setTimeout(scheduleEnhancement, 900);
    });
    const observer = new MutationObserver(() => {
      if (!applying) scheduleEnhancement();
    });
    [$("kpiGrid"), $("regionMap"), $("situationBars")].filter(Boolean).forEach(node => observer.observe(node, {childList:true, subtree:true}));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
