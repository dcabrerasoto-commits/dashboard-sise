const SPREADSHEET_ID = '1-j0ItNOgWTvYjWlmnks1JCelQ-zhXN4Gii_QVq05ByA';
const SHEET_NAME = 'Registros';

const HEADERS = [
  'ID_REGISTRO','FECHA_HORA_REPORTE','FECHA_REPORTE','HORA_REPORTE','SERVICIO_RESPONSABLE',
  'PROGRAMA_LINEA','REGION','COMUNA','RESIDENCIA_ESTABLECIMIENTO','DIRECCION_RESIDENCIA',
  'RESPONSABLE_RESIDENCIA','CORREO_CONTACTO','TELEFONO_CONTACTO','REPORTE_PREVIO','HUBO_CAMBIOS',
  'ESTADO_GENERAL','NIVEL_DANO_RIESGO','CAPACIDAD_TOTAL','PERSONAS_ATENDIDAS','SITUACIONES_PRESENTES',
  'EXPOSICION_AGUAS_SERVIDAS','PERSONAS_ELECTRODEPENDIENTES','NUMERO_ELECTRODEPENDIENTES',
  'DETALLE_AFECTACION_RIESGO','NECESIDADES_PRIORITARIAS','MEDIDAS_IMPLEMENTADAS','OBSERVACIONES',
  'ID_REPORTE_ANTERIOR'
];

const HEADER_ALIASES = {
  id: ['ID_REGISTRO','ID'],
  createdAt: ['FECHA_HORA_REPORTE','Creado'],
  reportDate: ['FECHA_REPORTE','Fecha reporte','FECHA_HORA_REPORTE','Creado'],
  reportTime: ['HORA_REPORTE'],
  service: ['SERVICIO_RESPONSABLE','Servicio'],
  program: ['PROGRAMA_LINEA','Programa'],
  region: ['REGION','RegiÃ³n','RegiÃƒÂ³n'],
  commune: ['COMUNA','Comuna'],
  establishment: ['RESIDENCIA_ESTABLECIMIENTO','Establecimiento'],
  address: ['DIRECCION_RESIDENCIA','DirecciÃ³n residencia','Direccion residencia'],
  responsible: ['RESPONSABLE_RESIDENCIA','Responsable'],
  contactEmail: ['CORREO_CONTACTO','Correo de contacto'],
  contactPhone: ['TELEFONO_CONTACTO','TelÃ©fono de contacto','Telefono de contacto'],
  previousReport: ['REPORTE_PREVIO'],
  hasChanges: ['HUBO_CAMBIOS'],
  status: ['ESTADO_GENERAL','Estado'],
  damageLevel: ['NIVEL_DANO_RIESGO','Nivel de daÃ±o','Nivel de daÃƒÂ±o'],
  capacity: ['CAPACIDAD_TOTAL','Capacidad'],
  people: ['PERSONAS_ATENDIDAS','Personas atendidas'],
  situations: ['SITUACIONES_PRESENTES','Situaciones'],
  otherSituation: ['OTRA_SITUACION','Otra situaciÃ³n','Otra situaciÃƒÂ³n'],
  sewageExposure: ['EXPOSICION_AGUAS_SERVIDAS'],
  electrodependent: ['PERSONAS_ELECTRODEPENDIENTES'],
  electrodependentCount: ['NUMERO_ELECTRODEPENDIENTES'],
  damageDetail: ['DETALLE_AFECTACION_RIESGO','Detalle del daÃ±o','Detalle del daÃƒÂ±o'],
  needs: ['NECESIDADES_PRIORITARIAS','Necesidades'],
  measures: ['MEDIDAS_IMPLEMENTADAS','Medidas implementadas'],
  observations: ['OBSERVACIONES','Observaciones'],
  previousRecordId: ['ID_REPORTE_ANTERIOR']
};

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || 'list').toLowerCase();
  const callback = sanitizeCallback_((e && e.parameter && e.parameter.callback) || '');
  let result;

  try {
    if (action === 'health') {
      result = { ok: true, service: 'seguimiento-residencias', timestamp: new Date().toISOString() };
    } else {
      result = { ok: true, records: readRecords_(), timestamp: new Date().toISOString() };
    }
  } catch (error) {
    result = { ok: false, error: String(error && error.message || error) };
  }

  const json = JSON.stringify(result);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const payload = parsePayload_(e);
    const action = String(payload.action || 'save').toLowerCase();
    const record = payload.record || payload;
    validateRecord_(record);
    if (action === 'update') {
      updateRecord_(ensureSheet_(), record);
    } else {
      appendRecord_(ensureSheet_(), record);
    }
    SpreadsheetApp.flush();
    return json_({ ok: true, id: record.id, action: action, timestamp: new Date().toISOString() });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message || error) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function parsePayload_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
  if (!raw) throw new Error('No se recibiÃ³ informaciÃ³n.');
  return JSON.parse(raw);
}

function validateRecord_(record) {
  if (!record || typeof record !== 'object') throw new Error('El reporte no es vÃ¡lido.');
  ['id','reportDate','service','region','commune','establishment','responsible','contactEmail','contactPhone','status'].forEach(field => {
    if (!String(record[field] == null ? '' : record[field]).trim()) throw new Error('Falta el campo obligatorio: ' + field);
  });
  if (/prueba/i.test(String(record.establishment)) || /prueba/i.test(String(record.responsible))) {
    throw new Error('Los registros de prueba no se guardan.');
  }
}

function ensureSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  const lastColumn = Math.max(sheet.getLastColumn(), HEADERS.length);
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
  if (!currentHeaders.some(Boolean)) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  } else {
    const existing = {};
    currentHeaders.forEach(header => existing[normalizeHeader_(header)] = true);
    const missing = HEADERS.filter(header => !existing[normalizeHeader_(header)]);
    if (missing.length) {
      sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]);
    }
  }
  return sheet;
}

function recordToRow_(r) {
  const date = new Date(r.reportDate || r.createdAt || new Date());
  const timezone = Session.getScriptTimeZone() || 'America/Santiago';
  return [
    r.id || '',
    date,
    Utilities.formatDate(date, timezone, 'yyyy-MM-dd'),
    Utilities.formatDate(date, timezone, 'HH:mm:ss'),
    r.service || '', r.program || '', r.region || '', r.commune || '', r.establishment || '', r.address || '',
    r.responsible || '', r.contactEmail || '', r.contactPhone || '', r.previousReport || '', r.hasChanges || '',
    r.status || '', r.damageLevel || '', Number(r.capacity || 0), Number(r.people || 0),
    (r.situations || []).join(' | '), (r.situations || []).includes('ExposiciÃ³n a aguas servidas') ? 'SÃ­' : 'No',
    r.electrodependent || 'No', Number(r.electrodependentCount || 0), r.damageDetail || '',
    (r.needs || []).join(' | '), r.measures || '', r.observations || '', r.previousRecordId || ''
  ];
}

function appendRecord_(sheet, record) {
  const lastColumn = Math.max(sheet.getLastColumn(), HEADERS.length);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const headerMap = buildHeaderMap_(headers);
  const values = recordToValues_(record);
  const row = new Array(lastColumn).fill('');
  Object.keys(values).forEach(field => {
    const index = headerMap[field];
    if (index != null) row[index] = values[field];
  });
  sheet.appendRow(row);
}

function updateRecord_(sheet, record) {
  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), HEADERS.length);
  if (lastRow < 2) throw new Error('No existen registros para actualizar.');
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const headerMap = buildHeaderMap_(headers);
  const idColumn = headerMap.id;
  if (idColumn == null) throw new Error('No se encontro columna de ID.');
  const ids = sheet.getRange(2, idColumn + 1, lastRow - 1, 1).getValues();
  let targetRow = 0;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') === String(record.id || '')) {
      targetRow = i + 2;
      break;
    }
  }
  if (!targetRow) throw new Error('No se encontro el registro para actualizar: ' + record.id);
  const current = sheet.getRange(targetRow, 1, 1, lastColumn).getValues()[0];
  const values = recordToValues_(record);
  Object.keys(values).forEach(field => {
    const index = headerMap[field];
    if (index != null) current[index] = values[field];
  });
  sheet.getRange(targetRow, 1, 1, lastColumn).setValues([current]);
}

function recordToValues_(r) {
  const date = new Date(r.reportDate || r.createdAt || new Date());
  const timezone = Session.getScriptTimeZone() || 'America/Santiago';
  const situations = r.situations || [];
  return {
    id: r.id || '',
    createdAt: date,
    reportDate: Utilities.formatDate(date, timezone, 'yyyy-MM-dd'),
    reportTime: Utilities.formatDate(date, timezone, 'HH:mm:ss'),
    service: r.service || '',
    program: r.program || '',
    region: r.region || '',
    commune: r.commune || '',
    establishment: r.establishment || '',
    address: r.address || '',
    responsible: r.responsible || '',
    contactEmail: r.contactEmail || '',
    contactPhone: r.contactPhone || '',
    previousReport: r.previousReport || '',
    hasChanges: r.hasChanges || '',
    status: r.status || '',
    damageLevel: r.damageLevel || '',
    capacity: Number(r.capacity || 0),
    people: Number(r.people || 0),
    situations: situations.join(' | '),
    otherSituation: r.otherSituation || '',
    sewageExposure: situations.includes('ExposiciÃ³n a aguas servidas') ? 'SÃ­' : 'No',
    electrodependent: r.electrodependent || 'No',
    electrodependentCount: Number(r.electrodependentCount || 0),
    damageDetail: r.damageDetail || '',
    needs: (r.needs || []).join(' | '),
    measures: r.measures || '',
    observations: r.observations || '',
    previousRecordId: r.previousRecordId || ''
  };
}

function readRecords_() {
  const sheet = ensureSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const lastColumn = Math.max(sheet.getLastColumn(), HEADERS.length);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const headerMap = buildHeaderMap_(headers);
  const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  return rows.map(row => rowToRecord_(row, headerMap)).filter(record => record.id);
}

function rowToRecord_(row, headerMap) {
  const value = (field, fallbackIndex) => {
    const index = headerMap[field];
    if (index != null) return row[index];
    return fallbackIndex == null ? '' : row[fallbackIndex];
  };
  const reportDateRaw = value('createdAt', 1) || value('reportDate', 2);
  const reportDate = reportDateRaw instanceof Date ? reportDateRaw.toISOString() : String(reportDateRaw || '');
  const situations = splitList_(value('situations', 19));
  return {
    id: String(value('id', 0) || ''), createdAt: reportDate, reportDate: reportDate,
    service: String(value('service', 4) || ''), program: String(value('program', 5) || ''),
    region: String(value('region', 6) || ''), commune: String(value('commune', 7) || ''),
    establishment: String(value('establishment', 8) || ''), address: String(value('address', 9) || ''),
    responsible: String(value('responsible', 10) || ''), contactEmail: String(value('contactEmail', 11) || ''),
    contactPhone: String(value('contactPhone', 12) || ''), previousReport: String(value('previousReport', 13) || ''),
    hasChanges: String(value('hasChanges', 14) || ''), status: String(value('status', 15) || ''),
    damageLevel: String(value('damageLevel', 16) || ''), capacity: Number(value('capacity', 17) || 0),
    people: Number(value('people', 18) || 0), situations: situations,
    otherSituation: String(value('otherSituation', null) || ''),
    electrodependent: String(value('electrodependent', 21) || 'No'), electrodependentCount: Number(value('electrodependentCount', 22) || 0),
    damageDetail: String(value('damageDetail', 23) || ''), needs: splitList_(value('needs', 24)),
    measures: String(value('measures', 25) || ''), observations: String(value('observations', 26) || ''),
    previousRecordId: String(value('previousRecordId', 27) || '')
  };
}

function buildHeaderMap_(headers) {
  const normalized = {};
  headers.forEach((header, index) => {
    const key = normalizeHeader_(header);
    if (key) normalized[key] = index;
  });
  const map = {};
  Object.keys(HEADER_ALIASES).forEach(field => {
    const aliases = HEADER_ALIASES[field];
    for (let i = 0; i < aliases.length; i++) {
      const index = normalized[normalizeHeader_(aliases[i])];
      if (index != null) {
        map[field] = index;
        break;
      }
    }
  });
  return map;
}

function normalizeHeader_(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function splitList_(value) {
  return String(value || '').split('|').map(item => item.trim()).filter(Boolean);
}

function sanitizeCallback_(value) {
  const callback = String(value || '');
  return /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback) ? callback : '';
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

