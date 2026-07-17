(() => {
  "use strict";

  const STORAGE_KEY = "mdsf-monitoreo-residencias-v2";
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  const key = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const fmt = value => new Intl.NumberFormat("es-CL").format(Number(value || 0));
  const formatDateTime = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Sin información" : new Intl.DateTimeFormat("es-CL", {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
  };

  function readRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function identity(record) {
    return [record.service, record.region, record.commune, record.establishment].map(key).join("|");
  }

  function latestRecords(records) {
    const map = new Map();
    records.forEach(record => {
      if (!record.service || !record.region || !record.establishment) return;
      const id = identity(record);
      const currentTime = new Date(record.reportDate || record.createdAt || 0).getTime() || 0;
      const previous = map.get(id);
      const previousTime = previous ? (new Date(previous.reportDate || previous.createdAt || 0).getTime() || 0) : -1;
      if (!previous || currentTime >= previousTime) map.set(id, record);
    });
    return [...map.values()];
  }

  function currentData() {
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

  function ensureModal() {
    if ($("detailModal")) return;
    const modal = document.createElement("div");
    modal.id = "detailModal";
    modal.className = "detail-modal hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "detailModalTitle");
    modal.innerHTML = `
      <div class="detail-modal-backdrop" data-close-modal></div>
      <section class="detail-modal-panel">
        <header class="detail-modal-header">
          <div><span class="detail-modal-kicker" id="detailModalKicker"></span><h2 id="detailModalTitle"></h2><p id="detailModalSubtitle"></p></div>
          <button type="button" class="detail-modal-close" data-close-modal aria-label="Cerrar">×</button>
        </header>
        <div id="detailModalSummary" class="detail-modal-summary"></div>
        <div id="detailModalBody" class="detail-modal-body"></div>
      </section>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", event => {
      if (event.target.closest("[data-close-modal]")) closeModal();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
    });
  }

  function openModal({kicker, title, subtitle, summary, body}) {
    ensureModal();
    $("detailModalKicker").textContent = kicker;
    $("detailModalTitle").textContent = title;
    $("detailModalSubtitle").textContent = subtitle;
    $("detailModalSummary").innerHTML = summary;
    $("detailModalBody").innerHTML = body;
    $("detailModal").classList.remove("hidden");
    document.body.classList.add("modal-open");
    $("detailModal").querySelector(".detail-modal-close")?.focus();
  }

  function closeModal() {
    $("detailModal")?.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  function summaryCards(cards) {
    return cards.map(card => `<article><span>${esc(card.label)}</span><strong>${fmt(card.value)}</strong></article>`).join("");
  }

  function recordsTable(records, includeRegion = false) {
    if (!records.length) return '<div class="detail-modal-empty">No existen reportes asociados a esta selección.</div>';
    return `<div class="detail-modal-table-wrap"><table class="detail-modal-table"><thead><tr>
      ${includeRegion ? "<th>Región</th>" : ""}<th>Comuna</th><th>Residencia</th><th>Dirección</th><th>Estado</th><th>Situaciones</th><th>Personas atendidas</th><th>Electrodependientes</th><th>Última actualización</th>
    </tr></thead><tbody>${records.map(record => `<tr>
      ${includeRegion ? `<td>${esc(record.region || "")}</td>` : ""}
      <td>${esc(record.commune || "")}</td><td>${esc(record.establishment || "")}</td><td>${esc(record.address || "Sin información")}</td>
      <td><span class="detail-status">${esc(record.status || "Sin información")}</span></td>
      <td>${esc((record.situations || []).join(", ") || "Sin situaciones reportadas")}</td>
      <td>${fmt(record.people)}</td><td>${record.electrodependent === "Sí" ? `Sí (${fmt(record.electrodependentCount)})` : "No"}</td>
      <td>${esc(formatDateTime(record.reportDate || record.createdAt))}</td>
    </tr>`).join("")}</tbody></table></div>`;
  }

  function openRegionDetail(region) {
    const records = currentData().filter(record => record.region === region);
    const affected = records.filter(isAffected).length;
    const without = records.filter(record => record.status === "Sin afectación").length;
    const evaluation = records.filter(record => record.status === "En evaluación").length;
    const electro = records.filter(record => record.electrodependent === "Sí").length;
    openModal({
      kicker: "DETALLE REGIONAL",
      title: region,
      subtitle: records.length ? "Información vigente según el último reporte de cada residencia." : "No existen residencias informadas para esta región con los filtros actuales.",
      summary: summaryCards([
        {label:"Residencias informadas", value:records.length},
        {label:"Con afectación", value:affected},
        {label:"Sin afectación", value:without},
        {label:"En evaluación", value:evaluation},
        {label:"Con electrodependientes", value:electro}
      ]),
      body: recordsTable(records)
    });
  }

  function openSituationDetail(situation) {
    const all = currentData();
    const records = situation === "Sin situaciones reportadas"
      ? all.filter(record => !(record.situations || []).length)
      : all.filter(record => hasSituation(record, situation));
    const affected = records.filter(isAffected).length;
    const regions = new Set(records.map(record => record.region).filter(Boolean)).size;
    const people = records.reduce((sum, record) => sum + Number(record.people || 0), 0);
    const electroPeople = records.reduce((sum, record) => sum + Number(record.electrodependentCount || 0), 0);
    openModal({
      kicker: "RESUMEN DE SITUACIÓN",
      title: situation,
      subtitle: records.length ? "Residencias cuyo último reporte coincide con esta situación." : "No existen registros asociados a esta situación con los filtros actuales.",
      summary: summaryCards([
        {label:"Residencias", value:records.length},
        {label:"Regiones", value:regions},
        {label:"Con afectación", value:affected},
        {label:"Personas atendidas", value:people},
        {label:"Personas electrodependientes", value:electroPeople}
      ]),
      body: recordsTable(records, true)
    });
  }

  function injectStyles() {
    if ($("detail-popup-styles")) return;
    const style = document.createElement("style");
    style.id = "detail-popup-styles";
    style.textContent = `
      body.modal-open{overflow:hidden!important}
      .detail-modal{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px}
      .detail-modal.hidden{display:none!important}
      .detail-modal-backdrop{position:absolute;inset:0;background:rgba(5,31,35,.72);backdrop-filter:blur(2px)}
      .detail-modal-panel{position:relative;width:min(1180px,96vw);max-height:88vh;display:flex;flex-direction:column;background:#fff;border:1px solid #8ba7aa;box-shadow:14px 14px 0 rgba(5,31,35,.28)}
      .detail-modal-header{display:flex;justify-content:space-between;gap:20px;padding:20px 22px;background:linear-gradient(110deg,#0b363b,#154f55 65%,#287fae);color:#fff}
      .detail-modal-header h2{margin:3px 0 4px;color:#fff;font-size:25px}.detail-modal-header p{margin:0;color:#d6edf4;font-size:13px;line-height:1.45}
      .detail-modal-kicker{font-size:10px;font-weight:850;letter-spacing:.12em;color:#bde6fa}
      .detail-modal-close{align-self:flex-start;width:38px;height:38px;border:1px solid rgba(255,255,255,.55);background:transparent;color:#fff;font-size:28px;line-height:1;cursor:pointer;border-radius:0}
      .detail-modal-close:hover{background:#fff;color:#154f55}
      .detail-modal-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;background:#b9ccd2;border-bottom:1px solid #b9ccd2}
      .detail-modal-summary article{display:grid;gap:4px;padding:13px 15px;background:#f4f9f8;text-align:center}.detail-modal-summary span{font-size:10px;font-weight:800;text-transform:uppercase;color:#536c70}.detail-modal-summary strong{font-size:25px;color:#154f55}
      .detail-modal-body{overflow:auto;padding:18px 20px 22px;background:#f6f9f8}
      .detail-modal-table-wrap{overflow:auto;border:1px solid #b7c9cb;background:#fff}
      .detail-modal-table{width:100%;min-width:1050px;border-collapse:collapse}.detail-modal-table th{position:sticky;top:0;z-index:1;padding:10px;background:#e7f3f5;color:#154f55;text-align:left;font-size:11px;text-transform:uppercase;border-bottom:1px solid #afc4c7}.detail-modal-table td{padding:10px;border-bottom:1px solid #dce5e5;font-size:12px;vertical-align:top}.detail-modal-table tbody tr:hover{background:#eef8fd}
      .detail-status{display:inline-block;padding:4px 7px;background:#edf4f3;border-left:4px solid #287fae;font-weight:750;white-space:nowrap}
      .detail-modal-empty{padding:28px;text-align:center;background:#fff;border:1px solid #c2d0d1;color:#53686c}
      #regionMap .region-block{cursor:pointer!important}
      #situationBars .bar-row{cursor:pointer!important;transition:background .15s ease,transform .15s ease}
      #situationBars .bar-row:hover{background:#e8f6fd!important;transform:translateX(3px)}
      @media(max-width:760px){.detail-modal{padding:8px}.detail-modal-panel{width:100%;max-height:94vh}.detail-modal-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.detail-modal-header{padding:16px}.detail-modal-body{padding:10px}}
    `;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    ensureModal();
    $("regionMap")?.addEventListener("click", event => {
      const button = event.target.closest(".region-block");
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openRegionDetail(button.dataset.region || button.querySelector("strong")?.textContent.trim() || "Región");
    }, true);
    $("situationBars")?.addEventListener("click", event => {
      const row = event.target.closest(".bar-row");
      if (!row) return;
      const label = row.querySelector(".bar-label")?.textContent.trim();
      if (label) openSituationDetail(label);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
