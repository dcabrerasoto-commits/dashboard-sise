(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const key = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const cleanKey = value => key(value).replace(/[^A-Z0-9]+/g, "");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  const fmt = value => new Intl.NumberFormat("es-CL").format(Number(value || 0));
  const formatDateTime = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Sin información" : new Intl.DateTimeFormat("es-CL", {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
  };
  let scheduled = false;
  let sharedRecords = [];
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
    return sharedRecords;
  }

  function identity(record) {
    const code = cleanKey(record.residenceCode || record.residenceKey || "");
    if (code) return [cleanKey(record.service), "CODIGO", code].join("|");
    return [record.service, record.region, record.commune, record.establishment].map(cleanKey).join("|");
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

  function filteredData() {
    const service = $("filterService")?.value || "";
    const region = $("filterRegion")?.value || "";
    const status = $("filterStatus")?.value || "";
    return latestRecords(readRecords()).filter(record =>
      (!service || key(record.service) === key(service)) &&
      (!region || key(record.region) === key(region)) &&
      (!status || key(record.status) === key(status))
    );
  }

  function matchingRecords() {
    return filteredData().filter(record => key(record.status) === key("Sin afectación") && !(record.situations || []).length);
  }

  function updateRow() {
    scheduled = false;
    const container = $("situationBars");
    if (!container) return;
    const row = container.querySelector(".bar-row");
    if (!row) return;
    const records = matchingRecords();
    const label = row.querySelector(".bar-label");
    const value = row.querySelector(".bar-value");
    if (label && label.textContent !== "Sin situaciones reportadas (sin afectación)") label.textContent = "Sin situaciones reportadas (sin afectación)";
    if (value && value.textContent !== fmt(records.length)) value.textContent = fmt(records.length);
    const values = [...container.querySelectorAll(".bar-value")].map(node => Number(String(node.textContent).replace(/\D/g, "")) || 0);
    values[0] = records.length;
    const max = Math.max(1, ...values);
    const fill = row.querySelector(".bar-fill");
    const width = `${Math.round(records.length / max * 100)}%`;
    if (fill && fill.style.width !== width) fill.style.width = width;
  }

  function scheduleUpdate(delay = 40) {
    if (scheduled) return;
    scheduled = true;
    setTimeout(updateRow, delay);
  }

  function ensureModal() {
    if ($("detailModal")) return;
    const modal = document.createElement("div");
    modal.id = "detailModal";
    modal.className = "detail-modal hidden";
    modal.innerHTML = `<div class="detail-modal-backdrop" data-close-modal></div><section class="detail-modal-panel"><header class="detail-modal-header"><div><span class="detail-modal-kicker" id="detailModalKicker"></span><h2 id="detailModalTitle"></h2><p id="detailModalSubtitle"></p></div><button type="button" class="detail-modal-close" data-close-modal aria-label="Cerrar">×</button></header><div id="detailModalSummary" class="detail-modal-summary"></div><div id="detailModalBody" class="detail-modal-body"></div></section>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", event => {
      if (event.target.closest("[data-close-modal]")) {
        modal.classList.add("hidden");
        document.body.classList.remove("modal-open");
      }
    });
  }

  function openNoAffectationModal() {
    ensureModal();
    const records = matchingRecords();
    const regions = new Set(records.map(record => record.region).filter(Boolean)).size;
    const people = records.reduce((sum, record) => sum + Number(record.people || 0), 0);
    const electroPeople = records.reduce((sum, record) => sum + Number(record.electrodependentCount || 0), 0);
    $("detailModalKicker").textContent = "RESUMEN DE SITUACIÓN";
    $("detailModalTitle").textContent = "Sin situaciones reportadas (sin afectación)";
    $("detailModalSubtitle").textContent = records.length ? "Residencias únicas vigentes cuyo último reporte indica sin afectación y no registra situaciones presentes." : "No existen residencias únicas sin afectación con los filtros actuales.";
    $("detailModalSummary").innerHTML = [["Residencias sin afectación", records.length],["Regiones", regions],["Residencias informadas", records.length],["Personas atendidas", people],["Personas electrodependientes", electroPeople]].map(([label,value]) => `<article><span>${esc(label)}</span><strong>${fmt(value)}</strong></article>`).join("");
    $("detailModalBody").innerHTML = records.length ? `<div class="detail-modal-table-wrap"><table class="detail-modal-table"><thead><tr><th>Región</th><th>Comuna</th><th>Residencia</th><th>Dirección</th><th>Estado</th><th>Personas atendidas</th><th>Última actualización</th></tr></thead><tbody>${records.map(record => `<tr><td>${esc(record.region || "")}</td><td>${esc(record.commune || "")}</td><td>${esc(record.establishment || "")}</td><td>${esc(record.address || "Sin información")}</td><td>Sin afectación</td><td>${fmt(record.people)}</td><td>${esc(formatDateTime(record.reportDate || record.createdAt))}</td></tr>`).join("")}</tbody></table></div>` : '<div class="detail-modal-empty">No existen reportes asociados a esta selección.</div>';
    $("detailModal").classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  function init() {
    scheduleUpdate(0);
    window.addEventListener("residencias:shared-data", event => {
      sharedRecords = event.detail && Array.isArray(event.detail.records) ? uniqueById(event.detail.records) : [];
      scheduleUpdate();
    });
    const container = $("situationBars");
    if (!container) return;
    container.addEventListener("click", event => {
      const row = event.target.closest(".bar-row");
      if (!row || row !== container.querySelector(".bar-row")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openNoAffectationModal();
    }, true);
    ["filterService","filterRegion","filterStatus"].forEach(id => $(id)?.addEventListener("change", () => scheduleUpdate()));
    $("clearFilters")?.addEventListener("click", () => scheduleUpdate());
    $("reportForm")?.addEventListener("submit", () => scheduleUpdate(150));
    document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => scheduleUpdate(80)));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
