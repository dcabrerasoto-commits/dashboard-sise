const SHEET_NAME = "Registros";
const HEADERS = [
  "ID",
  "Creado",
  "Fecha reporte",
  "Servicio",
  "Programa",
  "Región",
  "Comuna",
  "Establecimiento",
  "Responsable",
  "Capacidad",
  "Personas atendidas",
  "Estado",
  "Situaciones",
  "Otra situación",
  "Nivel de daño",
  "Detalle del daño",
  "Necesidades",
  "Medidas implementadas",
  "Observaciones"
];

function doGet(e) {
  const callback = sanitizeCallback_((e && e.parameter && e.parameter.callback) || "");
  let result;
  try {
    const action = String((e && e.parameter && e.parameter.action) || "list");
    if (action !== "list") result = {ok:false, message:"Acción no válida."};
    else result = {ok:true, records:readRecords_()};
  } catch (error) {
    result = {ok:false, message:String(error.message || error)};
  }
  return callback ? javascript_(callback, result) : json_(result);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (payload.action !== "save" || !payload.record) {
      return json_({ok:false, message:"Solicitud incompleta."});
    }

    const record = sanitizeRecord_(payload.record);
    validateRecord_(record);
    validateAccess_(record.service, String(payload.accessKey || ""));

    const sheet = getSheet_();
    sheet.appendRow([
      record.id,
      record.createdAt,
      record.reportDate,
      record.service,
      record.program,
      record.region,
      record.commune,
      record.establishment,
      record.responsible,
      record.capacity,
      record.people,
      record.status,
      record.situations.join(" | "),
      record.otherSituation,
      record.damageLevel,
      record.damageDetail,
      record.needs.join(" | "),
      record.measures,
      record.observations
    ]);

    return json_({ok:true, id:record.id});
  } catch (error) {
    return json_({ok:false, message:String(error.message || error)});
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#0d4f5b")
      .setFontColor("#ffffff");
  }
  return sheet;
}

function readRecords_() {
  const sheet = getSheet_();
  if (sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getDisplayValues();
  return rows.filter(r => r[0]).map(r => ({
    id:r[0],
    createdAt:r[1],
    reportDate:r[2],
    service:r[3],
    program:r[4],
    region:r[5],
    commune:r[6],
    establishment:r[7],
    responsible:"",
    capacity:Number(r[9] || 0),
    people:Number(r[10] || 0),
    status:r[11],
    situations:split_(r[12]),
    otherSituation:r[13],
    damageLevel:r[14],
    damageDetail:r[15],
    needs:split_(r[16]),
    measures:r[17],
    observations:r[18]
  }));
}

function sanitizeRecord_(r) {
  const text = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
  const list = (v) => (Array.isArray(v) ? v : []).map(x => text(x, 100)).filter(Boolean).slice(0, 20);
  const integer = (v) => Math.max(0, Math.round(Number(v || 0)));
  return {
    id:text(r.id || Utilities.getUuid(), 80),
    createdAt:text(r.createdAt || new Date().toISOString(), 40),
    reportDate:text(r.reportDate || new Date().toISOString(), 40),
    service:text(r.service, 180),
    program:text(r.program, 180),
    region:text(r.region, 80),
    commune:text(r.commune, 100),
    establishment:text(r.establishment, 220),
    responsible:text(r.responsible, 160),
    capacity:integer(r.capacity),
    people:integer(r.people),
    status:text(r.status, 80),
    situations:list(r.situations),
    otherSituation:text(r.otherSituation, 300),
    damageLevel:text(r.damageLevel, 100),
    damageDetail:text(r.damageDetail, 1500),
    needs:list(r.needs),
    measures:text(r.measures, 1500),
    observations:text(r.observations, 1500)
  };
}

function validateRecord_(r) {
  const required = [
    ["Servicio", r.service],
    ["Región", r.region],
    ["Comuna", r.commune],
    ["Establecimiento", r.establishment],
    ["Responsable", r.responsible],
    ["Estado", r.status],
    ["Nivel de daño", r.damageLevel]
  ];
  const missing = required.filter(x => !x[1]).map(x => x[0]);
  if (missing.length) throw new Error("Faltan campos obligatorios: " + missing.join(", ") + ".");
}

function validateAccess_(service, suppliedKey) {
  const raw = PropertiesService.getScriptProperties().getProperty("ACCESS_KEYS_JSON");
  if (!raw) return;
  let keys;
  try { keys = JSON.parse(raw); }
  catch (_) { throw new Error("La configuración ACCESS_KEYS_JSON no contiene un JSON válido."); }

  const expected = String(keys[service] || keys["*"] || "");
  if (expected && suppliedKey !== expected) throw new Error("Clave del servicio incorrecta.");
}

function split_(value) {
  return String(value || "").split("|").map(x => x.trim()).filter(Boolean);
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function javascript_(callback, data) {
  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(data) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function sanitizeCallback_(value) {
  const callback = String(value || "");
  return /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback) ? callback : "";
}
