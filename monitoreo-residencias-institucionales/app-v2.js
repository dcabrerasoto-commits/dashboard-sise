(() => {
  "use strict";

  const C = window.MONITOREO_CATALOGOS || {};
  const RESIDENCE_CATALOG = window.MONITOREO_RESIDENCIAS_CATALOGO || [];
  const PROTECTION_SERVICE = "Servicio Nacional de Protección Especializada a la Niñez y Adolescencia";
  const OTHER_RESIDENCE = "__otra_residencia__";
  let records = [];
  let latest = [];
  let previousMatch = null;
  let savingInProgress = false;
  let mapSvgLoaded = false;
  let regionTableMode = "territory";
  let regionTableSort = {key:"region", dir:"asc"};

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.prototype.slice.call(root.querySelectorAll(selector));
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const key = (v) => String(v == null ? "" : v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "").toUpperCase().trim();
  const fmt = (n) => new Intl.NumberFormat("es-CL").format(Number(n || 0));
  const CHILE_TIME_ZONE = "America/Santiago";
  const parseDateValue = (value) => {
    if (value instanceof Date) return value;
    const text = String(value || "").trim();
    const local = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (local) return new Date(Date.UTC(Number(local[1]), Number(local[2]) - 1, Number(local[3]), Number(local[4]) + 4, Number(local[5]), Number(local[6] || 0)));
    const cl = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (cl) return new Date(Date.UTC(Number(cl[3]), Number(cl[2]) - 1, Number(cl[1]), Number(cl[4] || 12) + 4, Number(cl[5] || 0), Number(cl[6] || 0)));
    return new Date(value);
  };
  const chileParts = (value) => {
    const date = parseDateValue(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {timeZone:CHILE_TIME_ZONE, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23"}).formatToParts(date);
    const part = (type) => parts.find(item => item.type === type)?.value || "";
    return {year:part("year"), month:part("month"), day:part("day"), hour:part("hour"), minute:part("minute")};
  };
  const nowLocal = () => {
    const parts = chileParts(new Date());
    return parts ? `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}` : new Date().toISOString().slice(0, 16);
  };
  const formatDateTime = (value) => {
    const d = parseDateValue(value);
    return Number.isNaN(d.getTime()) ? "Sin información" : new Intl.DateTimeFormat("es-CL", {timeZone:CHILE_TIME_ZONE, day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"}).format(d);
  };
  const updatePrintTimestamp = () => {
    const target = $("printTimestamp");
    if (target) target.textContent = `Minuta generada el ${formatDateTime(new Date())}`;
  };
  const dateKey = (value) => {
    const parts = chileParts(value);
    return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
  };
  const checkedValues = (name) => $$(`input[name="${name}"]:checked`).map(x => x.value);
  function setSavingState(active) {
    savingInProgress = active;
    const submit = document.querySelector('#reportForm button[type="submit"]');
    if (submit) {
      if (!submit.dataset.defaultText) submit.dataset.defaultText = submit.textContent;
      submit.disabled = active;
      submit.textContent = active ? "Guardando..." : submit.dataset.defaultText;
    }
    const reset = $("resetForm");
    if (reset) reset.disabled = active;
  }
  const shiftedRecord = (record) => {
    const service = String(record?.service || "").trim();
    return /^\d{1,2}:\d{2}(:\d{2})?$/.test(service) || /^\d{4}-\d{2}-\d{2}T/.test(service);
  };
  const uniqueById = (input) => {
    const map = new Map();
    (input || []).forEach(record => {
      const id = String(record?.id || "").trim();
      if (id) map.set(id, record);
      else map.set(`__row_${map.size}`, record);
    });
    return Array.from(map.values());
  };

  function populate(select, values, firstLabel) {
    select.innerHTML = `<option value="">${esc(firstLabel)}</option>` + (values || []).map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  }

  function setCommunes(region, selected) {
    const official = officialRegion(region);
    const values = (C.comunasPorRegion || {})[official] || [];
    populate($("commune"), values, official ? "Seleccione una comuna" : "Seleccione una región");
    $("commune").value = selected ? (values.find(value => key(value) === key(selected)) || "") : "";
    return $("commune").value;
  }

  function setDetailCommunes(region, selected) {
    const select = $("detailFilterCommune");
    if (!select) return "";
    const official = officialRegion(region);
    const values = (C.comunasPorRegion || {})[official] || [];
    populate(select, values, official ? "Todas las comunas" : "Seleccione una región");
    select.value = selected ? (values.find(value => key(value) === key(selected)) || "") : "";
    return select.value;
  }

  function officialRegion(value) {
    return (C.regiones || []).find(region => key(region) === key(value)) || "";
  }

  function officialCommune(region, value) {
    const official = officialRegion(region);
    return ((C.comunasPorRegion || {})[official] || []).find(commune => key(commune) === key(value)) || "";
  }

  function cleanCatalogValue(value) {
    const text = String(value == null ? "" : value).trim();
    return key(text) === "SININFORMACION" ? "" : text;
  }

  function selectedCatalogResidence() {
    const code = $("residenceCatalog")?.value || "";
    if (!code || code === OTHER_RESIDENCE) return null;
    return RESIDENCE_CATALOG.find(item => item.code === code) || null;
  }

  function isProtectionService() {
    return key($("service")?.value) === key(PROTECTION_SERVICE);
  }

  function setResidenceFieldsLocked(locked) {
    ["program","region","commune"].forEach(id => {
      const control = $(id);
      if (control) control.disabled = locked;
    });
    const address = $("address");
    if (address) address.readOnly = locked;
  }

  function fillFromCatalog(item) {
    if (!item) return;
    $("residenceCode").value = item.code || "";
    $("program").value = cleanCatalogValue(item.program);
    $("region").value = cleanCatalogValue(item.region);
    const selectedCommune = setCommunes($("region").value, cleanCatalogValue(item.commune));
    $("establishment").value = cleanCatalogValue(item.establishment);
    if ($("address")) $("address").value = cleanCatalogValue(item.address);
    $("responsible").value = cleanCatalogValue(item.responsible);
    $("contactEmail").value = cleanCatalogValue(item.contactEmail);
    $("contactPhone").value = cleanCatalogValue(item.contactPhone);
    $("capacity").value = Number(item.capacity || 0) || "";
    $("people").value = Number(item.people || 0) || "";
    setResidenceFieldsLocked(Boolean(selectedCommune));
  }

  function updateResidenceCatalogMode() {
    const wrap = $("residenceCatalogWrap");
    const select = $("residenceCatalog");
    const manualInput = $("establishment");
    const manualLabel = $("establishment")?.closest("label");
    const enabled = isProtectionService();
    if (!wrap || !select || !manualLabel) return;
    wrap.classList.toggle("hidden", !enabled);
    select.required = enabled;
    if (!enabled) {
      select.value = "";
      $("residenceCode").value = "";
      manualLabel.classList.remove("hidden");
      manualInput.required = true;
      setResidenceFieldsLocked(false);
      return;
    }
    if (!select.value) {
      manualLabel.classList.add("hidden");
      $("residenceCode").value = "";
      manualInput.required = false;
      setResidenceFieldsLocked(false);
      return;
    }
    const other = select.value === OTHER_RESIDENCE;
    manualLabel.classList.toggle("hidden", !other);
    manualInput.required = other;
    if (other) {
      $("residenceCode").value = "";
      $("establishment").value = "";
      setResidenceFieldsLocked(false);
      return;
    }
    fillFromCatalog(selectedCatalogResidence());
  }

  function setupResidenceCatalog() {
    refreshResidenceCatalogOptions();
  }

  function refreshResidenceCatalogOptions() {
    const select = $("residenceCatalog");
    if (!select) return;
    const selected = select.value;
    const region = $("region")?.value || "";
    const commune = $("commune")?.value || "";
    const filtered = !region ? [] : RESIDENCE_CATALOG.filter(item =>
      key(item.region) === key(region) &&
      (!commune || key(item.commune) === key(commune))
    );
    const options = RESIDENCE_CATALOG
      .filter(item => filtered.includes(item))
      .sort((a,b) => key(`${a.region}${a.commune}${a.establishment}`).localeCompare(key(`${b.region}${b.commune}${b.establishment}`)))
      .map(item => `<option value="${esc(item.code)}">${esc(`${item.region} / ${item.commune} / ${item.establishment}`)}</option>`);
    const firstLabel = commune ? "Seleccione una residencia de la comuna" : (region ? "Seleccione una residencia de la región" : "Seleccione una región y comuna");
    select.innerHTML = `<option value="">${esc(firstLabel)}</option>` + options.join("") + `<option value="${OTHER_RESIDENCE}">Otra residencia</option>`;
    if ([...select.options].some(option => option.value === selected)) select.value = selected;
    else select.value = "";
  }

  function similarity(a, b) {
    const left = key(a);
    const right = key(b);
    if (!left || !right) return 0;
    if (left === right) return 1;
    if (left.includes(right) || right.includes(left)) return 0.94;
    const m = left.length, n = right.length;
    const dp = Array.from({length:m + 1}, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
      }
    }
    return 1 - dp[m][n] / Math.max(m, n);
  }

  function similarCatalogResidence() {
    if (!isProtectionService() || $("residenceCatalog")?.value !== OTHER_RESIDENCE) return null;
    const region = $("region").value;
    const commune = $("commune").value;
    const name = $("establishment").value;
    if (!name.trim()) return null;
    return RESIDENCE_CATALOG.find(item =>
      (!region || key(item.region) === key(region)) &&
      (!commune || key(item.commune) === key(commune)) &&
      similarity(item.establishment, name) >= 0.88
    ) || null;
  }

  function setupCatalogs() {
    populate($("filterService"), C.servicios, "Todos los servicios");
    populate($("filterRegion"), C.regiones, "Todas las regiones");
    populate($("filterStatus"), C.estados, "Todos los estados");
    populate($("detailFilterService"), C.servicios, "Todos los servicios");
    populate($("detailFilterRegion"), C.regiones, "Todas las regiones");
    setDetailCommunes("");
    populate($("historyService"), C.servicios, "Todos los servicios");
    populate($("historyRegion"), C.regiones, "Todas las regiones");
    populate($("service"), C.servicios, "Seleccione un servicio");
    populate($("region"), C.regiones, "Seleccione una región");
    populate($("status"), C.estados, "Seleccione un estado");
    populate($("damageLevel"), C.nivelesDanio, "Seleccione un nivel");
    setupResidenceCatalog();
    setCommunes("");
    $("situationChecks").innerHTML = (C.situaciones || []).map((s, i) => `<label class="check-option"><input type="checkbox" name="situations" value="${esc(s)}" id="sit-${i}"><span>${esc(s)}</span></label>`).join("");
    $("needChecks").innerHTML = (C.necesidades || []).map((s, i) => `<label class="check-option"><input type="checkbox" name="needs" value="${esc(s)}" id="need-${i}"><span>${esc(s)}</span></label>`).join("");
  }

  function latestRecords(input) {
    const map = new Map();
    input.forEach(r => {
      const k = identityKey(r);
      if (!r.service || !r.region || !r.establishment) return;
      const current = new Date(r.reportDate || r.createdAt || 0).getTime() || 0;
      const prior = map.get(k);
      const priorTime = prior ? (new Date(prior.reportDate || prior.createdAt || 0).getTime() || 0) : -1;
      if (!prior || current >= priorTime) map.set(k, r);
    });
    return Array.from(map.values());
  }

  function identityKey(r) {
    const code = key(r.residenceCode || r.residenceKey || "");
    if (code) return [key(r.service), "CODIGO", code].join("|");
    return [key(r.service), key(r.region), key(r.commune), key(r.establishment)].join("|");
  }

  function findPrevious() {
    const current = {service:$("service").value, region:$("region").value, commune:$("commune").value, establishment:$("establishment").value, residenceCode:$("residenceCode")?.value || ""};
    if (!current.service || !current.region || !current.commune || !current.establishment.trim()) return null;
    const target = identityKey(current);
    return latest.find(r => identityKey(r) === target) || null;
  }

  function setUpdateSections(show) {
    [$("stateSection"), $("needsSection")].forEach(section => {
      section.classList.toggle("hidden", !show);
      $$('input, select, textarea', section).forEach(control => {
        control.disabled = !show;
      });
    });
    if (show) {
      $("status").required = true;
      $("damageLevel").required = true;
      $("electrodependent").required = true;
      $("electrodependentCount").required = $("electrodependent").value === "Sí";
    }
  }

  function fillPrevious(r) {
    if (!r) return;
    $("program").value = r.program || "";
    $("responsible").value = r.responsible || "";
    $("contactEmail").value = r.contactEmail || "";
    $("contactPhone").value = r.contactPhone || "";
    $("status").value = r.status || "";
    $("damageLevel").value = r.damageLevel || "";
    $("capacity").value = r.capacity == null ? "" : r.capacity;
    $("people").value = r.people == null ? "" : r.people;
    $("damageDetail").value = r.damageDetail || "";
    $("measures").value = r.measures || "";
    $("observations").value = r.observations || "";
    $("electrodependent").value = r.electrodependent || "No";
    $("electrodependentCount").value = r.electrodependentCount || "";
    $("electrodependentCountWrap").classList.toggle("hidden", r.electrodependent !== "Sí");
    $$("input[name='situations']").forEach(input => input.checked = (r.situations || []).includes(input.value));
    $$("input[name='needs']").forEach(input => input.checked = (r.needs || []).includes(input.value));
  }

  function evaluatePrevious() {
    previousMatch = findPrevious();
    const wrap = $("changeQuestionWrap");
    const message = $("previousReportMessage");
    if (previousMatch) {
      fillPrevious(previousMatch);
      wrap.classList.remove("hidden");
      $("hasChanges").value = "";
      setUpdateSections(false);
      message.textContent = `Se encontró un reporte anterior del ${formatDateTime(previousMatch.reportDate || previousMatch.createdAt)}. Revise los datos recuperados e indique si hubo cambios.`;
      message.classList.remove("hidden");
    } else {
      wrap.classList.add("hidden");
      $("hasChanges").value = "Sí";
      setUpdateSections(true);
      message.classList.add("hidden");
    }
  }

  function affected(r) { return r.status === "Con afectación" || (r.situations || []).length > 0; }
  function hasSituation(r, value) { return (r.situations || []).some(s => key(s) === key(value)); }

  function filteredSummary() {
    return latest.filter(r =>
      (!$("filterService").value || r.service === $("filterService").value) &&
      (!$("filterRegion").value || r.region === $("filterRegion").value) &&
      (!$("filterStatus").value || r.status === $("filterStatus").value)
    );
  }

  function renderKpis(data) {
    const grid = $("kpiGrid");
    if (grid) grid.innerHTML = "";
  }

  function byRegión(data) {
    return (C.regiones || []).map(region => {
      const rows = data.filter(r => key(r.region) === key(region));
      const dates = rows.map(r => r.reportDate || r.createdAt).sort();
      const affectedCount = rows.filter(affected).length;
      return {region, total:rows.length, without:rows.filter(r => r.status === "Sin afectación").length, affected:affectedCount, affectedRate:rows.length ? Math.round(affectedCount / rows.length * 100) : 0, electricity:rows.filter(r => hasSituation(r,"Sin electricidad")).length, sewage:rows.filter(r => hasSituation(r,"Exposición a aguas servidas")).length, electro:rows.filter(r => r.electrodependent === "Sí").length, last:dates.length ? dates[dates.length - 1] : ""};
    });
  }

  function intensity(n) { return n >= 6 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0; }

  function renderCharacterization(data, regions, situations) {
    const grid = $("characterGrid");
    const chart = $("characterChart");
    if (!grid || !chart) return;
    const informedRegions = regions.filter(r => r.total > 0).length;
    const totalPeople = data.reduce((sum, r) => sum + Number(r.people || 0), 0);
    const electroPeople = data.reduce((sum, r) => sum + Number(r.electrodependentCount || 0), 0);
    const affectedCount = data.filter(affected).length;
    const affectedRate = data.length ? Math.round(affectedCount / data.length * 100) : 0;
    const lastDate = data.map(r => r.reportDate || r.createdAt).filter(Boolean).sort().pop();
    const topSituation = situations
      .filter(item => item.label !== "Sin situaciones reportadas (sin afectación)")
      .sort((a, b) => b.value - a.value)[0];
    const totalRegions = (C.regiones || []).length || 1;
    const topSituationValue = topSituation && topSituation.value ? topSituation.value : 0;
    const totalResidences = data.length;
    const cards = [
      ["territory", "⌖", "Cobertura territorial", `${fmt(informedRegions)} / ${fmt(totalRegions)}`, "regiones con reportes", Math.round(informedRegions / totalRegions * 100)],
      ["people", "●", "Personas atendidas", fmt(totalPeople), `${fmt(totalResidences)} residencias vigentes`, data.length ? 100 : 0],
      ["ratio", "%", "Tasa con afectación", `${fmt(affectedRate)}%`, `${fmt(affectedCount)} de ${fmt(totalResidences)} residencias`, affectedRate],
      ["energy", "⚡", "Electrodependientes", fmt(electroPeople), `de ${fmt(totalPeople)} personas atendidas`, totalPeople ? Math.min(100, Math.round(electroPeople / totalPeople * 100)) : 0],
      ["signal", "!", "Situación principal", topSituationValue ? topSituation.label : "Sin situaciones", topSituationValue ? `${fmt(topSituationValue)} de ${fmt(totalResidences)} residencias` : `0 de ${fmt(totalResidences)} residencias`, data.length ? Math.round(topSituationValue / data.length * 100) : 0],
      ["time", "↻", "Última actualización", lastDate ? formatDateTime(lastDate) : "Sin información", "reporte vigente más reciente", lastDate ? 100 : 0]
    ];
    grid.innerHTML = cards.map(([klass, icon, label, value, sub, percent]) => `<article class="character-item ${klass}" style="--value:${Math.max(0, Math.min(100, percent))}%"><div class="character-ring"><span class="character-icon" aria-hidden="true">${esc(icon)}</span></div><div class="character-copy"><div class="character-label">${esc(label)}</div><strong>${esc(value)}</strong><small>${esc(sub)}</small></div></article>`).join("");
    chart.innerHTML = "";
  }

  function dailyRows(input) {
    const groups = new Map();
    input.forEach(r => {
      const day = dateKey(r.reportDate || r.createdAt);
      if (!day) return;
      groups.set(day, (groups.get(day) || 0) + 1);
    });
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, reports]) => ({day, reports}));
  }

  function renderSituationDonut(data) {
    const target = $("situationDonut");
    if (!target) return;
    const total = Math.max(1, data.length);
    const without = data.filter(r => r.status === "Sin afectación" && !(r.situations || []).length).length;
    const affectedCount = data.filter(affected).length;
    const evaluation = data.filter(r => r.status === "En evaluación").length;
    const other = Math.max(0, data.length - without - affectedCount - evaluation);
    const values = [
      ["Sin afectación reportada", without, "#93C5FD"],
      ["Con afectación o situación", affectedCount, "#2563EB"],
      ["En evaluación", evaluation, "#60A5FA"],
      ["Sin clasificación", other, "#EAF3FF"]
    ];
    let cursor = 0;
    const stops = values.map(([, value, color]) => {
      const start = cursor;
      cursor += value / total * 100;
      return `${color} ${start}% ${cursor}%`;
    }).join(",");
    target.innerHTML = `<div class="donut-ring" aria-hidden="true" style="background:conic-gradient(${stops || "#DCE3EC 0 100%"})"><span><b>${fmt(data.length)}</b><small>Total</small></span></div><div class="donut-legend">${values.map(([label, value, color]) => `<span><i style="background:${color}"></i><b>${fmt(value)}</b><small>${esc(label)}</small></span>`).join("")}</div>`;
  }

  function renderNeeds(data) {
    const target = $("needsBars");
    if (!target) return;
    const rows = (C.necesidades || []).map(label => ({label, value:data.filter(r => (r.needs || []).some(item => key(item) === key(label))).length})).filter(row => row.value > 0).sort((a, b) => b.value - a.value);
    const total = Math.max(1, data.length);
    target.innerHTML = rows.length ? rows.slice(0, 6).map(row => `<div class="need-row"><span class="need-icon"><img src="iconos_svg/${esc(needIcon(row.label))}" alt=""></span><span class="need-label">${esc(row.label)}</span><span class="need-value"><b>${fmt(row.value)}</b><small>${fmt(Math.round(row.value / total * 100))}%</small></span></div>`).join("") : '<div class="empty-state compact">Sin necesidades reportadas con los filtros actuales.</div>';
  }

  function needIcon(label) {
    const value = key(label);
    if (value.includes("ELECTRIC")) return "electricidad.svg";
    if (value.includes("AGUA") || value.includes("SERVIDA")) return "agua.svg";
    if (value.includes("ELECTRO")) return "electrodependientes.svg";
    if (value.includes("CONECT")) return "conectividad.svg";
    if (value.includes("ALIMENT") || value.includes("ABAST") || value.includes("GAS")) return "abastecimiento.svg";
    if (value.includes("TRASL")) return "actualizacion.svg";
    return "informacion.svg";
  }

  function renderPeople(data) {
    const target = $("peopleSummary");
    if (!target) return;
    const people = data.reduce((sum, r) => sum + Number(r.people || 0), 0);
    const capacity = data.reduce((sum, r) => sum + Number(r.capacity || 0), 0);
    const electro = data.reduce((sum, r) => sum + Number(r.electrodependentCount || 0), 0);
    const occupancy = capacity ? Math.round(people / capacity * 100) : 0;
    target.innerHTML = `<div class="people-main"><span class="metric-icon" aria-hidden="true">●</span><strong>${fmt(people)}</strong><small>personas atendidas</small></div><div class="people-stats"><span><b>${fmt(capacity)}</b><small>capacidad informada</small></span><span><b>${fmt(occupancy)}%</b><small>ocupación referencial</small></span><span><b>${fmt(electro)}</b><small>electrodependientes</small></span></div>`;
  }

  function renderSummaryHistory() {
    const target = $("summaryHistoryChart");
    if (!target) return;
    const service = $("filterService")?.value || "";
    const region = $("filterRegion")?.value || "";
    const status = $("filterStatus")?.value || "";
    const base = records.filter(r =>
      (!service || r.service === service) &&
      (!region || r.region === region) &&
      (!status || r.status === status)
    );
    const rows = dailyRows(base).slice(-14);
    const max = Math.max(1, ...rows.map(row => row.reports));
    const width = 620, height = 240, left = 46, right = 18, top = 24, bottom = 36;
    const usableW = width - left - right;
    const usableH = height - top - bottom;
    const points = rows.map((row, index) => {
      const x = rows.length === 1 ? left + usableW / 2 : left + index * (usableW / (rows.length - 1));
      const y = top + usableH - row.reports / max * usableH;
      return {row, x, y};
    });
    const path = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const area = `${left},${top + usableH} ${path} ${left + usableW},${top + usableH}`;
    target.innerHTML = rows.length ? `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Reportes por día">
      <line class="axis" x1="${left}" y1="${top}" x2="${left}" y2="${top + usableH}"></line>
      <line class="axis" x1="${left}" y1="${top + usableH}" x2="${left + usableW}" y2="${top + usableH}"></line>
      ${[0,.25,.5,.75,1].map(step => `<text class="y-label" x="${left - 10}" y="${(top + usableH - usableH * step + 4).toFixed(1)}">${fmt(Math.round(max * step))}</text>`).join("")}
      <polygon points="${area}"></polygon>
      <polyline points="${path}"></polyline>
      ${points.map((point, index) => `<g><circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="5"><title>${esc(point.row.day)}: ${fmt(point.row.reports)} reportes</title></circle>${index === 0 || index === points.length - 1 || index % 2 === 1 ? `<text class="point-label" x="${point.x.toFixed(1)}" y="${(point.y - 10).toFixed(1)}">${fmt(point.row.reports)}</text>` : ""}</g>`).join("")}
      ${points.map((point, index) => index % Math.ceil(points.length / 6 || 1) === 0 || index === points.length - 1 ? `<text class="x-label" x="${point.x.toFixed(1)}" y="${height - 8}">${esc(point.row.day.slice(5))}</text>` : "").join("")}
    </svg>` : '<div class="empty-state compact">Sin reportes para graficar.</div>';
  }

  function renderRecentReports() {
    const target = $("recentReports");
    if (!target) return;
    const rows = records.slice().sort((a, b) => new Date(b.reportDate || b.createdAt || 0) - new Date(a.reportDate || a.createdAt || 0)).slice(0, 5);
    target.innerHTML = rows.length ? `<div class="table-scroll"><table class="recent-table"><thead><tr><th>Fecha y hora</th><th>Región</th><th>Residencia</th><th>Comuna</th><th>Estado</th><th>Personas</th><th>Tipo de reporte</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(formatDateTime(r.reportDate || r.createdAt))}</td><td>${esc(r.region || "")}</td><td>${esc(r.establishment || "Residencia sin nombre")}</td><td>${esc(r.commune || "")}</td><td><span class="status-badge ${statusClass(r.status)}">${esc(r.status || "Sin información")}</span></td><td>${fmt(Number(r.people || 0))}</td><td>${esc(r.previousReport === "Sí" ? "Actualización" : "Regular")}</td></tr>`).join("")}</tbody></table></div><button type="button" class="inline-link" id="viewAllReports">Ver todos los reportes →</button>` : '<div class="empty-state compact">Sin reportes recibidos.</div>';
  }

  function statusClass(status) {
    const value = key(status);
    if (value === "SINAFECTACION") return "status-good";
    if (value === "CONAFECTACION") return "status-bad";
    if (value === "ENEVALUACION") return "status-eval";
    return "status-none";
  }

  function mapRegionId(region) {
    const map = {
      ARICAYPARINACOTA:"AricaParinacota",
      TARAPACA:"Tarapaca",
      ANTOFAGASTA:"Antofagasta",
      ATACAMA:"Atacama",
      COQUIMBO:"Coquimbo",
      VALPARAISO:"Valparaiso",
      METROPOLITANA:"Metropolitana",
      LIBERTADORGENERALBERNARDOOHIGGINS:"OHiggins",
      OHIGGINS:"OHiggins",
      MAULE:"Maule",
      NUBLE:"Nuble",
      BIOBIO:"Biobio",
      ARAUCANIA:"Araucania",
      LOSRIOS:"Los_Rios",
      LOSLAGOS:"Los_Lagos",
      AYSEN:"Aisen",
      AYSENDELGENERALCARLOSIBANEZDELCAMPO:"Aisen",
      MAGALLANES:"Magallanes",
      MAGALLANESYLAANTARTICACHILENA:"Magallanes"
    };
    return map[key(region)] || "";
  }

  function mapColor(value) {
    if (value >= 50) return "#1E5AA8";
    if (value >= 21) return "#3882F6";
    if (value >= 11) return "#60A5FA";
    if (value >= 1) return "#93C5FD";
    return "#EAF3FF";
  }

  function mapFill(region) {
    if (!region.total) return "#DCE3EC";
    if (!region.affected) return "#EAF3FF";
    if (region.affected >= 6) return "#1E5AA8";
    if (region.affected >= 3) return "#3882F6";
    return "#93C5FD";
  }

  function colorChileMap(regions) {
    const wrap = $("chileMapSvg");
    if (!wrap) return;
    wrap.querySelectorAll("path").forEach(path => {
      path.style.fill = "#DCE3EC";
      path.style.stroke = "#F5F7FA";
      path.style.strokeWidth = "0.6";
    });
    regions.forEach(region => {
      const id = mapRegionId(region.region);
      if (!id) return;
      wrap.querySelectorAll(`#${CSS.escape(id)}`).forEach(path => {
        path.style.fill = mapFill(region);
        path.style.stroke = "#FFFFFF";
        path.style.strokeWidth = "0.8";
        path.setAttribute("tabindex", "0");
        path.setAttribute("role", "img");
        path.setAttribute("aria-label", `${region.region}: ${fmt(region.total)} informadas, ${fmt(region.affected)} con afectación, ${fmt(region.affectedRate)}% de afectación`);
        path.innerHTML = `<title>${esc(region.region)}: ${fmt(region.total)} informadas, ${fmt(region.affected)} con afectación, ${fmt(region.affectedRate)}%. Última actualización: ${esc(region.last ? formatDateTime(region.last) : "Sin información")}</title>`;
      });
    });
  }

  function renderTerritoryInsights(regions) {
    const target = $("territoryInsights");
    if (!target) return;
    const informed = regions.filter(r => r.total > 0);
    const affectedRegions = regions.filter(r => r.affected > 0);
    const top = affectedRegions.slice().sort((a, b) => b.affected - a.affected || b.total - a.total)[0];
    const last = regions.map(r => r.last).filter(Boolean).sort().pop();
    const totalNational = regions.reduce((sum, r) => sum + r.total, 0);
    target.innerHTML = `<div class="territory-stat"><b>${fmt(totalNational)}</b><span>residencias informadas</span></div><div class="territory-stat"><b>${fmt(affectedRegions.length)}</b><span>regiones con afectación</span></div><div class="territory-stat"><b>${esc(top ? top.region : "Sin afectación")}</b><span>${top ? `${fmt(top.affected)} residencias con afectación` : "sin regiones priorizadas"}</span></div><div class="territory-stat"><b>${esc(last ? formatDateTime(last) : "Sin información")}</b><span>última actualización</span></div>`;
  }

  function regionPriorityScore(r) {
    return r.affected * 1000 + (r.electricity + r.sewage) * 100 + r.electro * 10 + r.affectedRate;
  }

  function sortedRegionsForTable(regions) {
    const rows = regions.filter(r => r.total > 0);
    if (regionTableMode === "priority") return rows.sort((a, b) => regionPriorityScore(b) - regionPriorityScore(a));
    const keyName = regionTableSort.key;
    const dir = regionTableSort.dir === "desc" ? -1 : 1;
    return rows.sort((a, b) => {
      if (keyName === "region") return dir * (C.regiones || []).indexOf(a.region) - dir * (C.regiones || []).indexOf(b.region);
      if (keyName === "last") return dir * ((new Date(a.last || 0).getTime() || 0) - (new Date(b.last || 0).getTime() || 0));
      return dir * (Number(a[keyName] || 0) - Number(b[keyName] || 0));
    });
  }

  function freshnessLabel(value) {
    const time = new Date(value || 0).getTime();
    if (!time) return "Sin actualización";
    const hours = Math.max(0, Math.round((Date.now() - time) / 36e5));
    if (hours < 6) return `Actualizado hace ${hours || 1} h`;
    if (hours < 12) return `Actualizado hace ${hours} h`;
    if (hours < 24) return `Sin actualización en ${hours} h`;
    return `Más de ${Math.floor(hours / 24)} días`;
  }

  function renderChileMap(regions) {
    const wrap = $("chileMapSvg");
    if (!wrap) return;
    if (mapSvgLoaded) {
      colorChileMap(regions);
      return;
    }
    fetch("mapa_chile_16_regiones_vector.svg")
      .then(response => response.ok ? response.text() : "")
      .then(svg => {
        if (!svg) return;
        wrap.innerHTML = svg;
        mapSvgLoaded = true;
        colorChileMap(regions);
      })
      .catch(() => { wrap.innerHTML = ""; });
  }

  function renderSummary() {
    const data = filteredSummary();
    renderKpis(data);
    const regions = byRegión(data);
    $("regionMap").innerHTML = regions.map(r => `<button type="button" class="region-block ${r.total ? "" : "no-data"} level-${intensity(r.affected)}" data-region="${esc(r.region)}" title="${esc(r.region)}: ${fmt(r.total)} informadas, ${fmt(r.affected)} con afectación, ${fmt(r.affectedRate)}%"><i aria-hidden="true"></i><strong>${esc(r.region)}</strong><span class="region-values"><b>${fmt(r.affected)}</b></span></button>`).join("");
    $$(".region-block").forEach(btn => btn.addEventListener("click", () => { $("filterRegion").value = btn.dataset.region; renderSummary(); }));
    renderChileMap(regions);
    renderTerritoryInsights(regions);
    const uniqueSituationBase = latestRecords(data);
    const situations = [
      {label:"Sin situaciones reportadas (sin afectación)", value:uniqueSituationBase.filter(r => r.status === "Sin afectación" && !(r.situations || []).length).length},
      {label:"Con afectación", value:uniqueSituationBase.filter(affected).length},
      ...(C.situaciones || []).map(label => ({label, value:uniqueSituationBase.filter(r => hasSituation(r,label)).length}))
    ];
    const totalForBars = Math.max(1, uniqueSituationBase.length);
    $("situationBars").innerHTML = situations.map(x => `<div class="bar-row"><div class="bar-label">${esc(x.label)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(x.value/totalForBars*100)}%"></div></div><div class="bar-value"><b>${fmt(x.value)}</b><small>/ ${fmt(totalForBars)}</small></div></div>`).join("");
    renderSituationDonut(uniqueSituationBase);
    renderNeeds(uniqueSituationBase);
    renderPeople(data);
    renderSummaryHistory();
    renderRecentReports();
    renderCharacterization(data, regions, situations);
    document.querySelectorAll(".mode-toggle").forEach(btn => btn.classList.toggle("active", (btn.id === "regionModePriority") === (regionTableMode === "priority")));
    const visible = sortedRegionsForTable(regions);
    const totalRow = visible.reduce((acc, r) => {
      acc.total += Number(r.total || 0);
      acc.without += Number(r.without || 0);
      acc.affected += Number(r.affected || 0);
      acc.electricity += Number(r.electricity || 0);
      acc.sewage += Number(r.sewage || 0);
      acc.electro += Number(r.electro || 0);
      if (r.last && (!acc.last || new Date(r.last) > new Date(acc.last))) acc.last = r.last;
      return acc;
    }, {total:0, without:0, affected:0, electricity:0, sewage:0, electro:0, last:""});
    const totalRate = totalRow.total ? Math.round(totalRow.affected / totalRow.total * 100) : 0;
    const totalHtml = `<tr class="region-total-row"><td>Total nacional</td><td>${fmt(totalRow.total)}</td><td>${fmt(totalRow.without)}</td><td>${fmt(totalRow.affected)}</td><td>${fmt(totalRate)}%</td><td>${fmt(totalRow.electricity)}</td><td>${fmt(totalRow.sewage)}</td><td>${fmt(totalRow.electro)}</td><td>${esc(totalRow.last ? formatDateTime(totalRow.last) : "Sin información")}</td><td><span class="freshness">${esc(totalRow.last ? freshnessLabel(totalRow.last) : "Sin actualización")}</span></td></tr>`;
    $("regionTableBody").innerHTML = visible.length ? totalHtml + visible.map(r => `<tr><td>${esc(r.region)}</td><td>${fmt(r.total)}</td><td>${fmt(r.without)}</td><td>${fmt(r.affected)}</td><td>${fmt(r.affectedRate)}%</td><td>${fmt(r.electricity)}</td><td>${fmt(r.sewage)}</td><td>${fmt(r.electro)}</td><td>${esc(r.last ? formatDateTime(r.last) : "Sin información")}</td><td><span class="freshness">${esc(freshnessLabel(r.last))}</span></td></tr>`).join("") : '<tr><td colspan="10">Sin información disponible.</td></tr>';
    renderDetail();
  }

  function filteredDetail() {
    const service = $("detailFilterService")?.value || "";
    const region = $("detailFilterRegion")?.value || "";
    const commune = $("detailFilterCommune")?.value || "";
    const date = $("detailFilterDate")?.value || "";
    return latest.filter(r =>
      (!service || r.service === service) &&
      (!region || r.region === region) &&
      (!commune || r.commune === commune) &&
      (!date || String(r.reportDate || r.createdAt || "").slice(0, 10) === date)
    );
  }

  function renderDetail() {
    const body = $("detailTableBody");
    if (!body) return;
    const rows = filteredDetail().slice().sort((a, b) => key(`${a.region}${a.commune}${a.establishment}`).localeCompare(key(`${b.region}${b.commune}${b.establishment}`)));
    body.innerHTML = rows.length ? rows.map(r => `<tr><td>${esc(r.service || "")}</td><td>${esc(r.region || "")}</td><td>${esc(r.commune || "")}</td><td>${esc(r.establishment || "")}</td><td><span class="status-badge ${statusClass(r.status)}">${esc(r.status || "Sin información")}</span></td><td>${esc((r.situations || []).join(" | ") || "Sin situaciones reportadas")}</td><td>${fmt(Number(r.people || 0))}</td><td>${esc(r.electrodependent || "Sin información")}${r.electrodependent === "Sí" ? ` (${fmt(Number(r.electrodependentCount || 0))})` : ""}</td><td>${esc(formatDateTime(r.reportDate || r.createdAt))}</td></tr>`).join("") : '<tr><td colspan="9">Sin información disponible.</td></tr>';
  }

  function buildRecord() {
    const noChanges = previousMatch && $("hasChanges").value === "No";
    const source = noChanges ? previousMatch : {};
    return {
      id:`REG-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      createdAt:new Date().toISOString(), reportDate:$("reportDate").value,
      service:$("service").value, program:$("program").value.trim(), region:$("region").value, commune:$("commune").value,
      establishment:$("establishment").value.trim(), responsible:$("responsible").value.trim(), contactEmail:$("contactEmail").value.trim(), contactPhone:$("contactPhone").value.trim(),
      residenceCode:$("residenceCode")?.value || "", residenceKey:[$("service").value, $("region").value, $("commune").value, $("establishment").value].map(key).join("|"),
      previousReport:previousMatch ? "Sí" : "No", hasChanges:previousMatch ? $("hasChanges").value : "Sí", previousRecordId:previousMatch ? previousMatch.id : "",
      status:noChanges ? source.status : $("status").value, damageLevel:noChanges ? source.damageLevel : $("damageLevel").value,
      capacity:noChanges ? Number(source.capacity || 0) : Number($("capacity").value || 0), people:noChanges ? Number(source.people || 0) : Number($("people").value || 0),
      situations:noChanges ? (source.situations || []) : checkedValues("situations"), damageDetail:noChanges ? source.damageDetail : $("damageDetail").value.trim(),
      needs:noChanges ? (source.needs || []) : checkedValues("needs"), measures:noChanges ? source.measures : $("measures").value.trim(), observations:noChanges ? source.observations : $("observations").value.trim(),
      electrodependent:noChanges ? source.electrodependent : $("electrodependent").value, electrodependentCount:noChanges ? Number(source.electrodependentCount || 0) : Number($("electrodependentCount").value || 0)
    };
  }

  function saveReport(event) {
    event.preventDefault();
    if (savingInProgress) return;
    const similar = similarCatalogResidence();
    if (similar) {
      $("residenceCatalog").value = similar.code;
      fillFromCatalog(similar);
      $("formMessage").textContent = `Residencia reconocida en el catálogo: ${similar.establishment}. Se guardará con su código oficial.`;
      $("formMessage").className = "form-message";
    }
    if (previousMatch && !$("hasChanges").value) {
      $("formMessage").textContent = "Indique si hubo cambios respecto del reporte anterior.";
      $("formMessage").className = "form-message error";
      return;
    }
    if (!$("stateSection").classList.contains("hidden") && $("electrodependent").value === "Sí" && Number($("electrodependentCount").value || 0) < 1) {
      $("formMessage").textContent = "Ingrese el número de personas electrodependientes.";
      $("formMessage").className = "form-message error";
      return;
    }
    if (!officialRegion($("region").value) || !officialCommune($("region").value, $("commune").value)) {
      $("formMessage").textContent = "Seleccione una región y comuna válidas antes de guardar.";
      $("formMessage").className = "form-message error";
      setResidenceFieldsLocked(false);
      return;
    }
    const record = buildRecord();
    setSavingState(true);
    records.push(record);
    latest = latestRecords(records);
    renderAll();
    $("formMessage").textContent = "Guardando reporte en la base compartida...";
    $("formMessage").className = "form-message";
    window.dispatchEvent(new CustomEvent("residencias:pending-record", {detail:{record}}));
  }

  function resetForm() {
    $("reportForm").reset();
    $("reportDate").value = nowLocal();
    $("reportDateDisplay").value = formatDateTime($("reportDate").value);
    setCommunes("");
    $("residenceCode").value = "";
    if ($("residenceCatalog")) $("residenceCatalog").value = "";
    setResidenceFieldsLocked(false);
    updateResidenceCatalogMode();
    previousMatch = null;
    $("changeQuestionWrap").classList.add("hidden");
    $("previousReportMessage").classList.add("hidden");
    $("electrodependentCountWrap").classList.add("hidden");
    setUpdateSections(true);
  }

  function renderAll() { renderSummary(); }

  function setupTabs() {
    $$(".tab").forEach(btn => btn.addEventListener("click", () => {
      $$(".tab").forEach(b => b.classList.toggle("active", b === btn));
      $$(".panel").forEach(p => p.classList.toggle("active", p.id === btn.dataset.tab));
      window.scrollTo({top:150, behavior:"smooth"});
    }));
  }

  function setupEvents() {
    ["filterService","filterRegion","filterStatus"].forEach(id => $(id).addEventListener("change", renderSummary));
    $("clearFilters").addEventListener("click", () => { ["filterService","filterRegion","filterStatus"].forEach(id => $(id).value = ""); renderSummary(); });
    ["detailFilterService","detailFilterCommune","detailFilterDate"].forEach(id => $(id)?.addEventListener("change", renderDetail));
    $("detailFilterRegion")?.addEventListener("change", e => { setDetailCommunes(e.target.value); renderDetail(); });
    $("clearDetailFilters")?.addEventListener("click", () => { ["detailFilterService","detailFilterRegion","detailFilterCommune","detailFilterDate"].forEach(id => { if ($(id)) $(id).value = ""; }); setDetailCommunes(""); renderDetail(); });
    $("regionModeTerritory")?.addEventListener("click", () => { regionTableMode = "territory"; regionTableSort = {key:"region", dir:"asc"}; renderSummary(); });
    $("regionModePriority")?.addEventListener("click", () => { regionTableMode = "priority"; renderSummary(); });
    document.querySelectorAll("[data-region-sort]").forEach(btn => btn.addEventListener("click", () => {
      const next = btn.dataset.regionSort;
      regionTableMode = "territory";
      regionTableSort = {key:next, dir:regionTableSort.key === next && regionTableSort.dir === "desc" ? "asc" : "desc"};
      renderSummary();
    }));
    $("region").addEventListener("change", e => {
      const region = officialRegion(e.target.value);
      e.target.value = region;
      setCommunes(region);
      refreshResidenceCatalogOptions();
      updateResidenceCatalogMode();
      previousMatch = null;
    });
    $("service").addEventListener("change", () => { previousMatch = null; refreshResidenceCatalogOptions(); updateResidenceCatalogMode(); evaluatePrevious(); });
    $("residenceCatalog")?.addEventListener("change", () => { previousMatch = null; updateResidenceCatalogMode(); evaluatePrevious(); });
    $("commune").addEventListener("change", e => {
      e.target.value = officialCommune($("region").value, e.target.value);
      refreshResidenceCatalogOptions();
      updateResidenceCatalogMode();
      evaluatePrevious();
    });
    $("establishment").addEventListener("blur", evaluatePrevious);
    $("hasChanges").addEventListener("change", e => setUpdateSections(e.target.value === "Sí"));
    $("electrodependent").addEventListener("change", e => { const yes = e.target.value === "Sí"; $("electrodependentCountWrap").classList.toggle("hidden", !yes); $("electrodependentCount").required = yes; if (!yes) $("electrodependentCount").value = ""; });
    $("reportForm").addEventListener("submit", saveReport);
    $("resetForm").addEventListener("click", () => setTimeout(resetForm, 0));
    $("exportButton").addEventListener("click", () => {
      const headers = ["ID","Código residencia","Fecha de registro","Fecha y hora del reporte","Servicio","Programa o línea","Región","Comuna","Residencia","Dirección","Responsable","Correo","Teléfono","Reporte anterior","Hubo cambios","ID reporte anterior","Estado","Nivel de daño o riesgo","Capacidad total","Personas atendidas","Situaciones presentes","Detalle de afectación o riesgo","Personas electrodependientes","Número de personas electrodependientes","Necesidades prioritarias","Medidas implementadas","Observaciones"];
      const rows = records.map(r => [r.id,r.residenceCode || "",r.createdAt,r.reportDate,r.service,r.program,r.region,r.commune,r.establishment,r.address,r.responsible,r.contactEmail,r.contactPhone,r.previousReport,r.hasChanges,r.previousRecordId,r.status,r.damageLevel,r.capacity,r.people,(r.situations||[]).join(" | "),r.damageDetail,r.electrodependent,r.electrodependentCount,(r.needs||[]).join(" | "),r.measures,r.observations]);
      const csv = "\ufeff" + [headers].concat(rows).map(row => row.map(v => `"${String(v == null ? "" : v).replace(/"/g,'""')}"`).join(";")).join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
      const a = document.createElement("a"); a.href = url; a.download = `seguimiento_residencias_${dateKey(new Date())}.csv`; a.click(); URL.revokeObjectURL(url);
    });
    $("printButton").addEventListener("click", () => { updatePrintTimestamp(); window.print(); });
    document.addEventListener("click", event => {
      if (event.target?.id !== "viewAllReports") return;
      const tab = document.querySelector('[data-tab="detalle"]');
      if (tab) tab.click();
    });
  }

  function setupSharedData() {
    window.addEventListener("residencias:shared-data", event => {
      const shared = event.detail && Array.isArray(event.detail.records) ? event.detail.records : [];
      records = uniqueById(shared);
      latest = latestRecords(records);
      renderAll();
    });
    window.addEventListener("residencias:shared-save", event => {
      const detail = event.detail || {};
      if (detail.ok) {
        $("formMessage").textContent = "Reporte guardado correctamente en la base compartida.";
        $("formMessage").className = "form-message ok";
        setTimeout(() => { resetForm(); setSavingState(false); }, 800);
      } else {
        setSavingState(false);
        $("formMessage").textContent = "No se pudo confirmar el guardado en Google Sheets. Revise la conexión e intente nuevamente.";
        $("formMessage").className = "form-message error";
      }
    });
  }

  function init() {
    setupCatalogs();
    setupTabs();
    setupEvents();
    setupSharedData();
    records = [];
    latest = latestRecords(records);
    $("reportDate").value = nowLocal();
    $("reportDateDisplay").value = formatDateTime($("reportDate").value);
    updateResidenceCatalogMode();
    updatePrintTimestamp();
    $("syncLine").textContent = "Sincronizando información compartida...";
    renderAll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();


