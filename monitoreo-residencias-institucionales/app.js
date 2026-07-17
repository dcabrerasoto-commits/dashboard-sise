(() => {
  "use strict";

  const C = window.MONITOREO_CATALOGOS;
  const CONFIG = window.MONITOREO_CONFIG || {};
  const STORAGE_KEY = "mdsf-monitoreo-residencias-v1";
  const endpoint = String(CONFIG.endpoint || "").trim();
  const cloudMode = Boolean(endpoint);

  let records = [];
  let latest = [];

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const fmt = (n) => new Intl.NumberFormat("es-CL").format(Number(n || 0));
  const keyText = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[m]));
  const isoNow = () => new Date().toISOString();
  const localDateTimeValue = (date = new Date()) => {
    const z = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 16);
  };
  const formatDate = (value) => {
    if (!value) return "Sin información";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat("es-CL", {day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"}).format(d);
  };
  const arrayValue = (v) => Array.isArray(v) ? v : String(v || "").split("|").map(x => x.trim()).filter(Boolean);
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  function normalizeRecord(raw) {
    return {
      id: String(raw.id || ""),
      createdAt: raw.createdAt || raw.timestamp || raw.fecha || "",
      reportDate: raw.reportDate || raw.fechaReporte || raw.createdAt || "",
      service: String(raw.service || raw.servicio || ""),
      program: String(raw.program || raw.programa || ""),
      region: String(raw.region || ""),
      commune: String(raw.commune || raw.comuna || ""),
      establishment: String(raw.establishment || raw.establecimiento || raw.nombreEstablecimiento || ""),
      responsible: String(raw.responsible || raw.responsable || ""),
      capacity: num(raw.capacity ?? raw.capacidad),
      people: num(raw.people ?? raw.personasAtendidas),
      status: String(raw.status || raw.estado || ""),
      situations: arrayValue(raw.situations || raw.situaciones),
      otherSituation: String(raw.otherSituation || raw.otraSituacion || ""),
      damageLevel: String(raw.damageLevel || raw.nivelDanio || raw.danio || ""),
      damageDetail: String(raw.damageDetail || raw.detalleDanio || ""),
      needs: arrayValue(raw.needs || raw.necesidades),
      measures: String(raw.measures || raw.medidas || ""),
      observations: String(raw.observations || raw.observaciones || "")
    };
  }

  function latestRecords(input) {
    const map = new Map();
    input.map(normalizeRecord).filter(r => r.service && r.region && r.establishment).forEach((r) => {
      const k = [keyText(r.service), keyText(r.region), keyText(r.commune), keyText(r.establishment)].join("|");
      const previous = map.get(k);
      const currentTime = new Date(r.reportDate || r.createdAt || 0).getTime() || 0;
      const previousTime = previous ? (new Date(previous.reportDate || previous.createdAt || 0).getTime() || 0) : -1;
      if (!previous || currentTime >= previousTime) map.set(k, r);
    });
    return [...map.values()];
  }

  async function loadRecords() {
    setSync("Cargando información…");
    if (cloudMode) {
      try {
        const response = await fetch(`${endpoint}${endpoint.includes("?") ? "&" : "?"}action=list&_=${Date.now()}`, {cache:"no-store"});
        if (!response.ok) throw new Error(`Respuesta ${response.status}`);
        const data = await response.json();
        records = Array.isArray(data) ? data : Array.isArray(data.records) ? data.records : [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        setSync(`Última sincronización: ${formatDate(isoNow())}`);
      } catch (error) {
        records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        setSync("No fue posible sincronizar. Se muestra la copia disponible en este navegador.");
      }
    } else {
      records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setSync(records.length ? `Datos guardados en este navegador · ${records.length} envíos` : "Versión piloto sin registros compartidos");
    }
    latest = latestRecords(records);
    renderAll();
  }

  function setSync(text) {
    $("syncLine").textContent = text;
  }

  function populateSelect(select, values, firstLabel, selected = "") {
    select.innerHTML = `<option value="">${escapeHtml(firstLabel)}</option>` +
      values.map(v => `<option value="${escapeHtml(v)}"${v === selected ? " selected" : ""}>${escapeHtml(v)}</option>`).join("");
  }

  function setupCatalogs() {
    ["filterService","detailService"].forEach(id => populateSelect($(id), C.servicios, "Todos los servicios"));
    ["filterRegion","detailRegion"].forEach(id => populateSelect($(id), C.regiones, "Todas las regiones"));
    populateSelect($("filterStatus"), C.estados, "Todos los estados");
    populateSelect($("detailSituation"), C.situaciones, "Todas las situaciones");
    populateSelect($("service"), C.servicios, "Seleccione un servicio");
    populateSelect($("region"), C.regiones, "Seleccione una región");
    populateSelect($("status"), C.estados, "Seleccione un estado");
    populateSelect($("damageLevel"), C.nivelesDanio, "Seleccione un nivel");
    $("commune").innerHTML = '<option value="">Seleccione una región</option>';

    $("situationChecks").innerHTML = C.situaciones.map((s, i) =>
      `<label class="check-option"><input type="checkbox" name="situations" value="${escapeHtml(s)}" id="sit-${i}"><span>${escapeHtml(s)}</span></label>`
    ).join("");
    $("needChecks").innerHTML = C.necesidades.map((s, i) =>
      `<label class="check-option"><input type="checkbox" name="needs" value="${escapeHtml(s)}" id="need-${i}"><span>${escapeHtml(s)}</span></label>`
    ).join("");
  }

  function setupMode() {
    const pill = $("modePill");
    const notice = $("pilotNotice");
    if (cloudMode) {
      pill.textContent = "Datos compartidos";
      pill.classList.add("cloud");
      notice.textContent = "Modo colaborativo habilitado. Los reportes se guardan en la base nacional y quedan disponibles para el tablero.";
      notice.classList.add("cloud");
      $("accessKey").required = true;
    } else {
      pill.textContent = "Versión piloto";
      notice.innerHTML = "La plataforma está publicada y operativa en modo piloto. Los reportes se guardan solo en este navegador hasta configurar la base compartida de Google Sheets.";
      $("accessKey").required = false;
    }
  }

  function setupTabs() {
    $$(".tab").forEach(btn => btn.addEventListener("click", () => {
      $$(".tab").forEach(b => b.classList.toggle("active", b === btn));
      $$(".panel").forEach(p => p.classList.toggle("active", p.id === btn.dataset.tab));
      window.scrollTo({top: 155, behavior:"smooth"});
    }));
  }

  function filteredSummary() {
    const service = $("filterService").value;
    const region = $("filterRegion").value;
    const status = $("filterStatus").value;
    return latest.filter(r =>
      (!service || r.service === service) &&
      (!region || r.region === region) &&
      (!status || r.status === status)
    );
  }

  function hasSituation(r, situation) {
    return r.situations.some(s => keyText(s) === keyText(situation));
  }

  function affected(r) {
    return r.status === "Con afectación" || r.situations.length > 0;
  }

  function renderKpis(data) {
    const total = data.length;
    const without = data.filter(r => r.status === "Sin afectación").length;
    const withAffect = data.filter(affected).length;
    const electricity = data.filter(r => hasSituation(r, "Sin electricidad")).length;
    const flood = data.filter(r => hasSituation(r, "Inundación")).length;
    const evac = data.filter(r => hasSituation(r, "Evacuación")).length;
    const cards = [
      ["Establecimientos informados", total, "Último reporte vigente", "primary"],
      ["Sin afectación", without, total ? `${Math.round(without / total * 100)}% del total` : "Sin registros", ""],
      ["Con afectación", withAffect, total ? `${Math.round(withAffect / total * 100)}% del total` : "Sin registros", "alert"],
      ["Sin electricidad", electricity, "Requiere seguimiento", "alert"],
      ["Inundación", flood, "Situación reportada", "alert"],
      ["Evacuación", evac, "Total o parcial", "alert"]
    ];
    $("kpiGrid").innerHTML = cards.map(([label,value,sub,klass]) =>
      `<article class="kpi ${klass}"><div class="kpi-label">${escapeHtml(label)}</div><div class="kpi-value">${fmt(value)}</div><div class="kpi-sub">${escapeHtml(sub)}</div></article>`
    ).join("");
  }

  function byRegion(data) {
    return C.regiones.map(region => {
      const rows = data.filter(r => r.region === region);
      const dates = rows.map(r => new Date(r.reportDate || r.createdAt || 0).getTime()).filter(Number.isFinite);
      return {
        region,
        total: rows.length,
        without: rows.filter(r => r.status === "Sin afectación").length,
        affected: rows.filter(affected).length,
        electricity: rows.filter(r => hasSituation(r, "Sin electricidad")).length,
        flood: rows.filter(r => hasSituation(r, "Inundación")).length,
        evacuation: rows.filter(r => hasSituation(r, "Evacuación")).length,
        last: dates.length ? new Date(Math.max(...dates)).toISOString() : ""
      };
    });
  }

  function intensity(n) {
    if (n >= 6) return 3;
    if (n >= 3) return 2;
    if (n >= 1) return 1;
    return 0;
  }

  function renderMap(regionData) {
    $("regionMap").innerHTML = regionData.map(r =>
      `<button type="button" class="region-block level-${intensity(r.affected)}" data-region="${escapeHtml(r.region)}" title="Filtrar por ${escapeHtml(r.region)}">
        <strong>${escapeHtml(r.region)}</strong><span>${fmt(r.affected)}</span>
      </button>`
    ).join("");
    $$(".region-block").forEach(btn => btn.addEventListener("click", () => {
      $("filterRegion").value = btn.dataset.region;
      renderSummary();
    }));
  }

  function renderSituationBars(data) {
    const values = C.situaciones.map(label => ({label, value:data.filter(r => hasSituation(r, label)).length}));
    const max = Math.max(1, ...values.map(x => x.value));
    $("situationBars").innerHTML = values.map(x =>
      `<div class="bar-row"><div class="bar-label">${escapeHtml(x.label)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(x.value / max * 100)}%"></div></div><div class="bar-value">${fmt(x.value)}</div></div>`
    ).join("");
  }

  function renderRegionTable(regionData) {
    const visible = regionData.filter(r => r.total > 0);
    $("regionTableBody").innerHTML = visible.length ? visible.map(r =>
      `<tr>
        <td>${escapeHtml(r.region)}</td>
        <td>${fmt(r.total)}</td>
        <td>${fmt(r.without)}</td>
        <td>${fmt(r.affected)}</td>
        <td>${fmt(r.electricity)}</td>
        <td>${fmt(r.flood)}</td>
        <td>${fmt(r.evacuation)}</td>
        <td>${escapeHtml(r.last ? formatDate(r.last) : "Sin información")}</td>
      </tr>`
    ).join("") : '<tr><td colspan="8">Sin información disponible.</td></tr>';
  }

  function renderSummary() {
    const data = filteredSummary();
    renderKpis(data);
    const regionData = byRegion(data);
    renderMap(regionData);
    renderSituationBars(data);
    renderRegionTable(regionData);
    $("emptySummary").classList.toggle("hidden", data.length > 0);
  }

  function statusBadge(status) {
    const c = status === "Sin afectación" ? "status-good" :
      status === "Con afectación" ? "status-bad" :
      status === "En evaluación" ? "status-eval" : "status-none";
    return `<span class="status-badge ${c}">${escapeHtml(status || "Sin información")}</span>`;
  }

  function filteredDetail() {
    const service = $("detailService").value;
    const region = $("detailRegion").value;
    const situation = $("detailSituation").value;
    const q = keyText($("detailSearch").value);
    return latest.filter(r => {
      const matchesText = !q || [r.service,r.program,r.region,r.commune,r.establishment,r.responsible].some(v => keyText(v).includes(q));
      return (!service || r.service === service) &&
        (!region || r.region === region) &&
        (!situation || hasSituation(r, situation)) &&
        matchesText;
    }).sort((a,b) => C.regiones.indexOf(a.region) - C.regiones.indexOf(b.region) ||
      a.commune.localeCompare(b.commune, "es-CL") ||
      a.establishment.localeCompare(b.establishment, "es-CL"));
  }

  function renderDetail() {
    const data = filteredDetail();
    $("detailTableBody").innerHTML = data.map(r =>
      `<tr>
        <td>${escapeHtml(r.service)}</td>
        <td>${escapeHtml(r.region)}</td>
        <td>${escapeHtml(r.commune)}</td>
        <td><strong>${escapeHtml(r.establishment)}</strong>${r.program ? `<br><small>${escapeHtml(r.program)}</small>` : ""}</td>
        <td>${statusBadge(r.status)}</td>
        <td>${escapeHtml(r.situations.join(", ") || "Sin situaciones")}</td>
        <td>${fmt(r.people)}</td>
        <td>${escapeHtml(r.damageLevel || "Sin información")}</td>
        <td>${escapeHtml(formatDate(r.reportDate || r.createdAt))}</td>
      </tr>`
    ).join("");
    $("emptyDetail").classList.toggle("hidden", data.length > 0);
  }

  function renderAll() {
    latest = latestRecords(records);
    renderSummary();
    renderDetail();
  }

  function setCommunes(region, selected = "") {
    const list = C.comunasPorRegion[region] || [];
    populateSelect($("commune"), list, region ? "Seleccione una comuna" : "Seleccione una región", selected);
  }

  function checkedValues(name) {
    return $$(`input[name="${name}"]:checked`).map(x => x.value);
  }

  function formPayload() {
    const selectedService = $("service").value;
    const service = selectedService === "Otro servicio" ? $("otherService").value.trim() : selectedService;
    return {
      id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : `R-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: isoNow(),
      reportDate: new Date($("reportDate").value).toISOString(),
      service,
      program: $("program").value.trim(),
      region: $("region").value,
      commune: $("commune").value,
      establishment: $("establishment").value.trim(),
      responsible: $("responsible").value.trim(),
      capacity: num($("capacity").value),
      people: num($("people").value),
      status: $("status").value,
      situations: checkedValues("situations"),
      otherSituation: $("otherSituation").value.trim(),
      damageLevel: $("damageLevel").value,
      damageDetail: $("damageDetail").value.trim(),
      needs: checkedValues("needs"),
      measures: $("measures").value.trim(),
      observations: $("observations").value.trim()
    };
  }

  async function saveReport(event) {
    event.preventDefault();
    const message = $("formMessage");
    message.className = "form-message";
    message.textContent = "";

    if ($("service").value === "Otro servicio" && !$("otherService").value.trim()) {
      message.classList.add("error");
      message.textContent = "Debe indicar el nombre del servicio.";
      $("otherService").focus();
      return;
    }

    const payload = formPayload();
    if (payload.people > payload.capacity && payload.capacity > 0) {
      const proceed = window.confirm("El número de personas atendidas supera la capacidad informada. ¿Desea guardar de todas formas?");
      if (!proceed) return;
    }

    const accessKey = $("accessKey").value;
    message.textContent = "Guardando reporte…";

    try {
      if (cloudMode) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {"Content-Type":"text/plain;charset=utf-8"},
          body: JSON.stringify({action:"save", accessKey, record:payload})
        });
        if (!response.ok) throw new Error(`Respuesta ${response.status}`);
        const result = await response.json();
        if (result.ok === false) throw new Error(result.message || "No fue posible guardar.");
        await loadRecords();
      } else {
        records.push(payload);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        renderAll();
        setSync(`Datos guardados en este navegador · ${records.length} envíos`);
      }
      message.classList.add("ok");
      message.textContent = "Reporte guardado correctamente.";
      resetFormState();
    } catch (error) {
      message.classList.add("error");
      message.textContent = `No fue posible guardar el reporte: ${error.message}`;
    }
  }

  function resetFormState() {
    $("reportForm").reset();
    $("reportDate").value = localDateTimeValue();
    $("commune").innerHTML = '<option value="">Seleccione una región</option>';
    $("otherServiceWrap").classList.add("hidden");
    $("otherSituationWrap").classList.add("hidden");
  }

  function csvEscape(v) {
    const s = Array.isArray(v) ? v.join(" | ") : String(v ?? "");
    return `"${s.replaceAll('"','""')}"`;
  }

  function exportCsv() {
    const headers = ["Fecha reporte","Servicio","Programa","Región","Comuna","Establecimiento","Responsable","Capacidad","Personas atendidas","Estado","Situaciones","Nivel de daño","Detalle","Necesidades","Medidas implementadas","Observaciones"];
    const rows = latest.map(r => [
      r.reportDate || r.createdAt,r.service,r.program,r.region,r.commune,r.establishment,r.responsible,r.capacity,r.people,r.status,r.situations,r.damageLevel,r.damageDetail,r.needs,r.measures,r.observations
    ]);
    const csv = "\ufeff" + [headers, ...rows].map(row => row.map(csvEscape).join(";")).join("\r\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monitoreo_residencias_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function setupEvents() {
    ["filterService","filterRegion","filterStatus"].forEach(id => $(id).addEventListener("change", renderSummary));
    $("clearFilters").addEventListener("click", () => {
      $("filterService").value = "";
      $("filterRegion").value = "";
      $("filterStatus").value = "";
      renderSummary();
    });

    ["detailService","detailRegion","detailSituation"].forEach(id => $(id).addEventListener("change", renderDetail));
    $("detailSearch").addEventListener("input", renderDetail);

    $("region").addEventListener("change", e => setCommunes(e.target.value));
    $("service").addEventListener("change", e => {
      $("otherServiceWrap").classList.toggle("hidden", e.target.value !== "Otro servicio");
    });
    $("status").addEventListener("change", e => {
      if (e.target.value === "Sin afectación") {
        $$("input[name=\"situations\"]").forEach(x => x.checked = false);
        $("damageLevel").value = "Sin daños";
        $("otherSituationWrap").classList.add("hidden");
      }
    });
    $("situationChecks").addEventListener("change", () => {
      const other = checkedValues("situations").includes("Otra situación");
      $("otherSituationWrap").classList.toggle("hidden", !other);
    });
    $("reportForm").addEventListener("submit", saveReport);
    $("resetForm").addEventListener("click", () => setTimeout(resetFormState, 0));
    $("exportButton").addEventListener("click", exportCsv);
    $("printButton").addEventListener("click", () => window.print());
  }

  function init() {
    setupCatalogs();
    setupMode();
    setupTabs();
    setupEvents();
    $("reportDate").value = localDateTimeValue();
    loadRecords();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
