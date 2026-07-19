(() => {
  "use strict";

  const C = window.MONITOREO_CATALOGOS || {};
  const RESIDENCE_CATALOG = window.MONITOREO_RESIDENCIAS_CATALOGO || [];
  const PROTECTION_SERVICE = "Servicio Nacional de Protección Especializada a la Niñez y Adolescencia";
  const OTHER_RESIDENCE = "__otra_residencia__";
  let records = [];
  let latest = [];
  let previousMatch = null;
  let detailSort = {field:"reportDate", direction:"desc"};
  let savingInProgress = false;

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
    const values = (C.comunasPorRegion || {})[region] || [];
    populate($("commune"), values, region ? "Seleccione una comuna" : "Seleccione una región");
    $("commune").value = selected ? (values.find(value => key(value) === key(selected)) || "") : "";
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
    setCommunes($("region").value, cleanCatalogValue(item.commune));
    $("establishment").value = cleanCatalogValue(item.establishment);
    if ($("address")) $("address").value = cleanCatalogValue(item.address);
    $("responsible").value = cleanCatalogValue(item.responsible);
    $("contactEmail").value = cleanCatalogValue(item.contactEmail);
    $("contactPhone").value = cleanCatalogValue(item.contactPhone);
    $("capacity").value = Number(item.capacity || 0) || "";
    $("people").value = Number(item.people || 0) || "";
    setResidenceFieldsLocked(true);
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
    ["filterService","detailService","historyService"].forEach(id => populate($(id), C.servicios, "Todos los servicios"));
    ["filterRegion","detailRegion","historyRegion"].forEach(id => populate($(id), C.regiones, "Todas las regiones"));
    populate($("filterStatus"), C.estados, "Todos los estados");
    populate($("detailSituation"), C.situaciones, "Todas las situaciones");
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
    const cards = [
      ["Residencias sin afectación", data.filter(r => r.status === "Sin afectación").length, "Último reporte sin daños ni situaciones de emergencia", "", "Residencias cuyo último reporte vigente indica estado sin afectación."],
      ["Residencias con afectación", data.filter(affected).length, "Requieren seguimiento", "alert", "Residencias cuyo último reporte vigente indica afectación o alguna situación reportada."],
      ["Residencias sin electricidad", data.filter(r => hasSituation(r, "Sin electricidad")).length, "Corte eléctrico informado", "alert", "Residencias cuyo último reporte vigente informa falta de electricidad."],
      ["Residencias con aguas servidas", data.filter(r => hasSituation(r, "Exposición a aguas servidas")).length, "Exposición informada", "alert", "Residencias cuyo último reporte vigente informa exposición a aguas servidas."],
      ["Residencias con electrodependientes", data.filter(r => r.electrodependent === "Sí").length, "Personas electrodependientes informadas", "alert", "Residencias cuyo último reporte vigente informa personas electrodependientes."]
    ];
    $("kpiGrid").innerHTML = cards.map(([label,value,sub,klass,definition]) => `<article class="kpi ${klass}" tabindex="0" title="${esc(definition)}" data-definition="${esc(definition)}"><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${fmt(value)}</div><div class="kpi-sub">${esc(sub)}</div></article>`).join("");
  }

  function byRegión(data) {
    return (C.regiones || []).map(region => {
      const rows = data.filter(r => key(r.region) === key(region));
      const dates = rows.map(r => r.reportDate || r.createdAt).sort();
      return {region, total:rows.length, without:rows.filter(r => r.status === "Sin afectación").length, affected:rows.filter(affected).length, electricity:rows.filter(r => hasSituation(r,"Sin electricidad")).length, sewage:rows.filter(r => hasSituation(r,"Exposición a aguas servidas")).length, electro:rows.filter(r => r.electrodependent === "Sí").length, last:dates.length ? dates[dates.length - 1] : ""};
    });
  }

  function intensity(n) { return n >= 6 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0; }

  function renderSummary() {
    const data = filteredSummary();
    renderKpis(data);
    const regions = byRegión(data);
    $("regionMap").innerHTML = regions.map(r => `<button type="button" class="region-block level-${intensity(r.affected)}" data-region="${esc(r.region)}" title="${esc(r.region)}: ${fmt(r.total)} informadas, ${fmt(r.affected)} con afectación"><strong>${esc(r.region)}</strong><span class="region-values"><b>${fmt(r.total)}</b><small>informadas</small><i>/</i><b>${fmt(r.affected)}</b><small>con afectación</small></span></button>`).join("");
    $$(".region-block").forEach(btn => btn.addEventListener("click", () => { $("filterRegion").value = btn.dataset.region; renderSummary(); }));
    const uniqueSituationBase = latestRecords(data);
    const situations = [
      {label:"Sin situaciones reportadas (sin afectación)", value:uniqueSituationBase.filter(r => r.status === "Sin afectación" && !(r.situations || []).length).length},
      {label:"Con afectación", value:uniqueSituationBase.filter(affected).length},
      ...(C.situaciones || []).map(label => ({label, value:uniqueSituationBase.filter(r => hasSituation(r,label)).length}))
    ];
    const max = Math.max(1, ...situations.map(x => x.value));
    $("situationBars").innerHTML = situations.map(x => `<div class="bar-row"><div class="bar-label">${esc(x.label)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(x.value/max*100)}%"></div></div><div class="bar-value">${fmt(x.value)}</div></div>`).join("");
    const visible = regions.filter(r => r.total > 0);
    $("regionTableBody").innerHTML = visible.length ? visible.map(r => `<tr><td>${esc(r.region)}</td><td>${fmt(r.total)}</td><td>${fmt(r.without)}</td><td>${fmt(r.affected)}</td><td>${fmt(r.electricity)}</td><td>${fmt(r.sewage)}</td><td>${fmt(r.electro)}</td><td>${esc(r.last ? formatDateTime(r.last) : "Sin información")}</td></tr>`).join("") : '<tr><td colspan="8">Sin información disponible.</td></tr>';
  }

  function detailValue(record, field) {
    if (field === "situations") return (record.situations || []).join(", ");
    if (field === "people") return Number(record.people || 0);
    if (field === "reportDate") return new Date(record.reportDate || record.createdAt || 0).getTime() || 0;
    return key(record[field] || "");
  }

  function sortDetailRows(rows) {
    const factor = detailSort.direction === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      const av = detailValue(a, detailSort.field);
      const bv = detailValue(b, detailSort.field);
      if (av < bv) return -1 * factor;
      if (av > bv) return 1 * factor;
      return (new Date(b.reportDate || b.createdAt || 0).getTime() || 0) - (new Date(a.reportDate || a.createdAt || 0).getTime() || 0);
    });
  }

  function renderDetailSortState() {
    $$("#detailTable th[data-sort]").forEach(th => {
      const active = th.dataset.sort === detailSort.field;
      th.classList.toggle("sort-active", active);
      th.setAttribute("aria-sort", active ? (detailSort.direction === "asc" ? "ascending" : "descending") : "none");
      const icon = th.querySelector(".sort-icon");
      if (icon) icon.textContent = active ? (detailSort.direction === "asc" ? "▲" : "▼") : "↕";
    });
  }

  function renderDetail() {
    const q = key($("detailSearch").value);
    const data = sortDetailRows(latest.filter(r =>
      (!$("detailService").value || r.service === $("detailService").value) &&
      (!$("detailRegion").value || r.region === $("detailRegion").value) &&
      (!$("detailSituation").value || hasSituation(r, $("detailSituation").value)) &&
      (!q || [r.service,r.program,r.region,r.commune,r.establishment,r.responsible,r.contactEmail,r.contactPhone].some(v => key(v).includes(q)))
    ));
    $("detailTableBody").innerHTML = data.length ? data.map(r => `<tr><td>${esc(r.service)}</td><td>${esc(r.region)}</td><td>${esc(r.commune)}</td><td>${esc(r.establishment)}</td><td>${esc(r.status)}</td><td>${esc((r.situations || []).join(", ") || "Sin situaciones")}</td><td>${fmt(r.people)}</td><td>${esc(r.damageLevel || "Sin información")}</td><td>${esc(formatDateTime(r.reportDate || r.createdAt))}</td></tr>`).join("") : '<tr><td colspan="9">Sin información disponible.</td></tr>';
    renderDetailSortState();
  }

  function dailyRows() {
    const service = $("historyService").value;
    const region = $("historyRegion").value;
    const from = $("historyFrom").value;
    const to = $("historyTo").value;
    const filtered = records.filter(r => {
      const d = dateKey(r.reportDate || r.createdAt);
      return (!service || r.service === service) && (!region || r.region === region) && (!from || d >= from) && (!to || d <= to);
    });
    const groups = new Map();
    filtered.forEach(r => {
      const d = dateKey(r.reportDate || r.createdAt);
      if (!d) return;
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d).push(r);
    });
    return Array.from(groups.entries()).sort((a,b) => b[0].localeCompare(a[0])).map(([date, rows]) => {
      const current = latestRecords(rows);
      return {date, reports:rows.length, residences:current.length, affected:current.filter(affected).length, without:current.filter(r => r.status === "Sin afectación").length, evaluation:current.filter(r => r.status === "En evaluación").length, electricity:current.filter(r => hasSituation(r,"Sin electricidad")).length, sewage:current.filter(r => hasSituation(r,"Exposición a aguas servidas")).length, electroResidences:current.filter(r => r.electrodependent === "Sí").length, electroPeople:current.reduce((sum,r) => sum + Number(r.electrodependentCount || 0),0)};
    });
  }

  function renderHistory() {
    const rows = dailyRows();
    $("historyTableBody").innerHTML = rows.length ? rows.map(r => `<tr><td>${esc(r.date.split("-").reverse().join("-"))}</td><td>${fmt(r.reports)}</td><td>${fmt(r.residences)}</td><td>${fmt(r.affected)}</td><td>${fmt(r.without)}</td><td>${fmt(r.evaluation)}</td><td>${fmt(r.electricity)}</td><td>${fmt(r.sewage)}</td><td>${fmt(r.electroResidences)}</td><td>${fmt(r.electroPeople)}</td></tr>`).join("") : '<tr><td colspan="10">Sin registros para el período seleccionado.</td></tr>';
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

  function renderAll() { renderSummary(); renderDetail(); renderHistory(); }

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
    ["detailService","detailRegion","detailSituation"].forEach(id => $(id).addEventListener("change", renderDetail));
    $("detailSearch").addEventListener("input", renderDetail);
    $$("#detailTable th[data-sort]").forEach(th => th.addEventListener("click", () => {
      const field = th.dataset.sort;
      detailSort = {field, direction: detailSort.field === field && detailSort.direction === "asc" ? "desc" : "asc"};
      renderDetail();
    }));
    ["historyService","historyRegion","historyFrom","historyTo"].forEach(id => $(id).addEventListener("change", renderHistory));
    $("clearHistoryFilters").addEventListener("click", () => { ["historyService","historyRegion","historyFrom","historyTo"].forEach(id => $(id).value = ""); renderHistory(); });
    $("region").addEventListener("change", e => { setCommunes(e.target.value); refreshResidenceCatalogOptions(); updateResidenceCatalogMode(); previousMatch = null; });
    $("service").addEventListener("change", () => { previousMatch = null; refreshResidenceCatalogOptions(); updateResidenceCatalogMode(); evaluatePrevious(); });
    $("residenceCatalog")?.addEventListener("change", () => { previousMatch = null; updateResidenceCatalogMode(); evaluatePrevious(); });
    $("commune").addEventListener("change", () => { refreshResidenceCatalogOptions(); updateResidenceCatalogMode(); evaluatePrevious(); });
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


