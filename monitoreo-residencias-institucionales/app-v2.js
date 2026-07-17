(() => {
  "use strict";

  const C = window.MONITOREO_CATALOGOS || {};
  const STORAGE_KEY = "mdsf-monitoreo-residencias-v2";
  let records = [];
  let latest = [];
  let previousMatch = null;

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.prototype.slice.call(root.querySelectorAll(selector));
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const key = (v) => String(v == null ? "" : v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const fmt = (n) => new Intl.NumberFormat("es-CL").format(Number(n || 0));
  const nowLocal = () => {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };
  const formatDateTime = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "Sin información" : new Intl.DateTimeFormat("es-CL", {day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"}).format(d);
  };
  const dateKey = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const checkedValues = (name) => $$(`input[name="${name}"]:checked`).map(x => x.value);

  function safeRead() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function safeWrite(value) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch (_) {}
  }

  function populate(select, values, firstLabel) {
    select.innerHTML = `<option value="">${esc(firstLabel)}</option>` + (values || []).map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  }

  function setCommunes(region, selected) {
    const values = (C.comunasPorRegion || {})[region] || [];
    populate($("commune"), values, region ? "Seleccione una comuna" : "Seleccione una región");
    $("commune").value = selected || "";
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
    setCommunes("");
    $("situationChecks").innerHTML = (C.situaciones || []).map((s, i) => `<label class="check-option"><input type="checkbox" name="situations" value="${esc(s)}" id="sit-${i}"><span>${esc(s)}</span></label>`).join("");
    $("needChecks").innerHTML = (C.necesidades || []).map((s, i) => `<label class="check-option"><input type="checkbox" name="needs" value="${esc(s)}" id="need-${i}"><span>${esc(s)}</span></label>`).join("");
  }

  function latestRecords(input) {
    const map = new Map();
    input.forEach(r => {
      const k = [key(r.service), key(r.region), key(r.commune), key(r.establishment)].join("|");
      if (!r.service || !r.region || !r.establishment) return;
      const current = new Date(r.reportDate || r.createdAt || 0).getTime() || 0;
      const prior = map.get(k);
      const priorTime = prior ? (new Date(prior.reportDate || prior.createdAt || 0).getTime() || 0) : -1;
      if (!prior || current >= priorTime) map.set(k, r);
    });
    return Array.from(map.values());
  }

  function identityKey(r) {
    return [key(r.service), key(r.region), key(r.commune), key(r.establishment)].join("|");
  }

  function findPrevious() {
    const current = {service:$("service").value, region:$("region").value, commune:$("commune").value, establishment:$("establishment").value};
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
      ["Establecimientos informados", data.length, "Último reporte vigente", "primary"],
      ["Sin afectación", data.filter(r => r.status === "Sin afectación").length, "Estado vigente", ""],
      ["Con afectación", data.filter(affected).length, "Requiere seguimiento", "alert"],
      ["Sin electricidad", data.filter(r => hasSituation(r, "Sin electricidad")).length, "Situación presente", "alert"],
      ["Aguas servidas", data.filter(r => hasSituation(r, "Exposición a aguas servidas")).length, "Exposición reportada", "alert"],
      ["Electrodependientes", data.filter(r => r.electrodependent === "Sí").length, "Residencias informadas", "alert"]
    ];
    $("kpiGrid").innerHTML = cards.map(([label,value,sub,klass]) => `<article class="kpi ${klass}"><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${fmt(value)}</div><div class="kpi-sub">${esc(sub)}</div></article>`).join("");
  }

  function byRegion(data) {
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
    const regions = byRegion(data);
    $("regionMap").innerHTML = regions.map(r => `<button type="button" class="region-block level-${intensity(r.affected)}" data-region="${esc(r.region)}" title="${esc(r.region)}: ${fmt(r.total)} informadas, ${fmt(r.affected)} con afectación"><strong>${esc(r.region)}</strong><span class="region-values"><b>${fmt(r.total)}</b><small>informadas</small><i>/</i><b>${fmt(r.affected)}</b><small>con afectación</small></span></button>`).join("");
    $$(".region-block").forEach(btn => btn.addEventListener("click", () => { $("filterRegion").value = btn.dataset.region; renderSummary(); }));
    const situations = (C.situaciones || []).map(label => ({label, value:data.filter(r => hasSituation(r,label)).length}));
    const max = Math.max(1, ...situations.map(x => x.value));
    $("situationBars").innerHTML = situations.map(x => `<div class="bar-row"><div class="bar-label">${esc(x.label)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(x.value/max*100)}%"></div></div><div class="bar-value">${fmt(x.value)}</div></div>`).join("");
    const visible = regions.filter(r => r.total > 0);
    $("regionTableBody").innerHTML = visible.length ? visible.map(r => `<tr><td>${esc(r.region)}</td><td>${fmt(r.total)}</td><td>${fmt(r.without)}</td><td>${fmt(r.affected)}</td><td>${fmt(r.electricity)}</td><td>${fmt(r.sewage)}</td><td>${fmt(r.electro)}</td><td>${esc(r.last ? formatDateTime(r.last) : "Sin información")}</td></tr>`).join("") : '<tr><td colspan="8">Sin información disponible.</td></tr>';
  }

  function renderDetail() {
    const q = key($("detailSearch").value);
    const data = latest.filter(r =>
      (!$("detailService").value || r.service === $("detailService").value) &&
      (!$("detailRegion").value || r.region === $("detailRegion").value) &&
      (!$("detailSituation").value || hasSituation(r, $("detailSituation").value)) &&
      (!q || [r.service,r.program,r.region,r.commune,r.establishment,r.responsible,r.contactEmail,r.contactPhone].some(v => key(v).includes(q)))
    );
    $("detailTableBody").innerHTML = data.length ? data.map(r => `<tr><td>${esc(r.service)}</td><td>${esc(r.region)}</td><td>${esc(r.commune)}</td><td>${esc(r.establishment)}</td><td>${esc(r.status)}</td><td>${esc((r.situations || []).join(", ") || "Sin situaciones")}</td><td>${fmt(r.people)}</td><td>${esc(r.damageLevel || "Sin información")}</td><td>${esc(formatDateTime(r.reportDate || r.createdAt))}</td></tr>`).join("") : '<tr><td colspan="9">Sin información disponible.</td></tr>';
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
    records.push(buildRecord());
    safeWrite(records);
    latest = latestRecords(records);
    renderAll();
    $("formMessage").textContent = "Reporte guardado correctamente.";
    $("formMessage").className = "form-message ok";
    setTimeout(resetForm, 800);
  }

  function resetForm() {
    $("reportForm").reset();
    $("reportDate").value = nowLocal();
    $("reportDateDisplay").value = formatDateTime($("reportDate").value);
    setCommunes("");
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
    ["historyService","historyRegion","historyFrom","historyTo"].forEach(id => $(id).addEventListener("change", renderHistory));
    $("clearHistoryFilters").addEventListener("click", () => { ["historyService","historyRegion","historyFrom","historyTo"].forEach(id => $(id).value = ""); renderHistory(); });
    $("region").addEventListener("change", e => { setCommunes(e.target.value); previousMatch = null; });
    ["service","commune","establishment"].forEach(id => $(id).addEventListener(id === "establishment" ? "blur" : "change", evaluatePrevious));
    $("hasChanges").addEventListener("change", e => setUpdateSections(e.target.value === "Sí"));
    $("electrodependent").addEventListener("change", e => { const yes = e.target.value === "Sí"; $("electrodependentCountWrap").classList.toggle("hidden", !yes); $("electrodependentCount").required = yes; if (!yes) $("electrodependentCount").value = ""; });
    $("reportForm").addEventListener("submit", saveReport);
    $("resetForm").addEventListener("click", () => setTimeout(resetForm, 0));
    $("exportButton").addEventListener("click", () => {
      const headers = ["ID","Fecha de registro","Fecha y hora del reporte","Servicio","Programa o linea","Region","Comuna","Residencia","Direccion","Responsable","Correo","Telefono","Reporte anterior","Hubo cambios","ID reporte anterior","Estado","Nivel de dano o riesgo","Capacidad total","Personas atendidas","Situaciones presentes","Detalle de afectacion o riesgo","Personas electrodependientes","Numero de personas electrodependientes","Necesidades prioritarias","Medidas implementadas","Observaciones"];
      const rows = records.map(r => [r.id,r.createdAt,r.reportDate,r.service,r.program,r.region,r.commune,r.establishment,r.address,r.responsible,r.contactEmail,r.contactPhone,r.previousReport,r.hasChanges,r.previousRecordId,r.status,r.damageLevel,r.capacity,r.people,(r.situations||[]).join(" | "),r.damageDetail,r.electrodependent,r.electrodependentCount,(r.needs||[]).join(" | "),r.measures,r.observations]);
      const csv = "\ufeff" + [headers].concat(rows).map(row => row.map(v => `"${String(v == null ? "" : v).replace(/"/g,'""')}"`).join(";")).join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
      const a = document.createElement("a"); a.href = url; a.download = `seguimiento_residencias_${dateKey(new Date())}.csv`; a.click(); URL.revokeObjectURL(url);
    });
    $("printButton").addEventListener("click", () => window.print());
  }

  function setupSharedData() {
    window.addEventListener("residencias:shared-data", event => {
      const shared = event.detail && Array.isArray(event.detail.records) ? event.detail.records : [];
      records = shared;
      latest = latestRecords(records);
      renderAll();
    });
  }

  function init() {
    setupCatalogs();
    setupTabs();
    setupEvents();
    setupSharedData();
    records = safeRead();
    latest = latestRecords(records);
    $("reportDate").value = nowLocal();
    $("reportDateDisplay").value = formatDateTime($("reportDate").value);
    const last = records.length ? records[records.length - 1] : null;
    $("syncLine").textContent = last ? `Última actualización local: ${formatDateTime(last.reportDate || last.createdAt)}` : "Sin reportes registrados";
    renderAll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
