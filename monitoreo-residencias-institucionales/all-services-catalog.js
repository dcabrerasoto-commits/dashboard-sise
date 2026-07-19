(() => {
  "use strict";

  let sharedRecords = [];
  const OTHER = "__OTRA_RESIDENCIA__";

  const $ = id => document.getElementById(id);
  const clean = value => String(value ?? "").trim();
  const norm = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  function latestCatalogFromReports() {
    const byIdentity = new Map();
    sharedRecords.forEach((row, index) => {
      const service = clean(row.service || row.servicioResponsable);
      const region = clean(row.region);
      const commune = clean(row.commune || row.comuna);
      const establishment = clean(row.establishment || row.residenciaEstablecimiento);
      if (!service || !region || !establishment) return;
      const key = [service, region, commune, establishment].map(norm).join("|");
      const time = new Date(row.reportDate || row.createdAt || 0).getTime() || index;
      const previous = byIdentity.get(key);
      if (!previous || time >= previous._time) {
        byIdentity.set(key, {
          code: clean(row.residenceCode || row.codigoResidencia || row.residenceKey || key),
          service,
          program: clean(row.program || row.programaLinea),
          region,
          commune,
          establishment,
          address: clean(row.address || row.direccionResidencia),
          responsible: clean(row.responsible || row.responsableResidencia),
          contactEmail: clean(row.contactEmail || row.correoContacto),
          contactPhone: clean(row.contactPhone || row.telefonoContacto),
          capacity: row.capacity ?? row.capacidadTotal ?? "",
          people: row.people ?? row.personasAtendidas ?? "",
          _time: time
        });
      }
    });
    return [...byIdentity.values()];
  }

  function combinedCatalog() {
    const staticRows = Array.isArray(window.MONITOREO_RESIDENCIAS_CATALOGO) ? window.MONITOREO_RESIDENCIAS_CATALOGO : [];
    const map = new Map();
    [...staticRows, ...latestCatalogFromReports()].forEach(item => {
      const key = [item.service, item.region, item.commune, item.establishment].map(norm).join("|");
      if (!key.replace(/\|/g, "")) return;
      map.set(key, {...(map.get(key) || {}), ...item, _catalogKey: key});
    });
    return [...map.values()];
  }

  function matchesFilters(item) {
    const service = clean($("service")?.value);
    const region = clean($("region")?.value);
    const commune = clean($("commune")?.value);
    if (!service || !region) return false;
    if (norm(item.service) !== norm(service) || norm(item.region) !== norm(region)) return false;
    return !commune || !item.commune || norm(item.commune) === norm(commune);
  }

  function fill(id, value) {
    const input = $(id);
    if (!input) return;
    input.value = value ?? "";
    input.dispatchEvent(new Event("input", {bubbles:true}));
    input.dispatchEvent(new Event("change", {bubbles:true}));
  }

  function clearIdentification() {
    ["residenceCode","program","establishment","address","responsible","contactEmail","contactPhone","capacity","people"].forEach(id => fill(id, ""));
  }

  function applySelectedResidence() {
    const select = $("residenceCatalog");
    if (!select) return;
    if (select.value === OTHER) {
      clearIdentification();
      fill("residenceCode", "");
      $("establishment")?.focus();
      return;
    }
    const item = combinedCatalog().find(row => row._catalogKey === select.value || clean(row.code) === select.value);
    if (!item) return;
    fill("residenceCode", item.code || item._catalogKey);
    fill("program", item.program);
    fill("establishment", item.establishment);
    fill("address", item.address);
    fill("responsible", item.responsible);
    fill("contactEmail", item.contactEmail);
    fill("contactPhone", item.contactPhone);
    fill("capacity", item.capacity);
    fill("people", item.people);
  }

  function refreshSelector() {
    const wrap = $("residenceCatalogWrap");
    const select = $("residenceCatalog");
    const service = clean($("service")?.value);
    const region = clean($("region")?.value);
    if (!wrap || !select) return;

    if (!service || !region) {
      wrap.classList.add("hidden");
      select.innerHTML = '<option value="">Seleccione servicio y región</option>';
      return;
    }

    const current = select.value;
    const options = combinedCatalog().filter(matchesFilters).sort((a,b) => clean(a.establishment).localeCompare(clean(b.establishment), "es"));
    select.innerHTML = '<option value="">Seleccione una residencia</option>' + options.map(item => `<option value="${item._catalogKey}">${clean(item.establishment)}${item.commune ? ` — ${clean(item.commune)}` : ""}</option>`).join("") + `<option value="${OTHER}">Otra residencia (no está en la lista)</option>`;
    wrap.classList.remove("hidden");
    if ([...select.options].some(option => option.value === current)) select.value = current;
  }

  function init() {
    const select = $("residenceCatalog");
    if (!select) return;
    select.addEventListener("change", applySelectedResidence, true);
    ["service","region","commune"].forEach(id => $(id)?.addEventListener("change", () => setTimeout(refreshSelector, 0), true));
    window.addEventListener("residencias:shared-data", event => {
      const rows = event.detail?.records;
      if (Array.isArray(rows)) sharedRecords = rows;
      setTimeout(refreshSelector, 0);
    });
    setTimeout(refreshSelector, 50);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
