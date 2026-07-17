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
    validateRecord_(payload);
    ensureSheet_().appendRow(recordToRow_(payload));
    SpreadsheetApp.flush();
    return json_({ ok: true, id: payload.id, timestamp: new Date().toISOString() });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message || error) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function parsePayload_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
  if (!raw) throw new Error('No se recibió información.');
  const parsed = JSON.parse(raw);
  return parsed && parsed.record ? parsed.record : parsed;
}

function validateRecord_(record) {
  if (!record || typeof record !== 'object') throw new Error('El reporte no es válido.');
  ['id','reportDate','service','region','commune','establishment','responsible','status'].forEach(field => {
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
  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (currentHeaders.join('|') !== HEADERS.join('|')) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
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
    (r.situations || []).join(' | '), (r.situations || []).includes('Exposición a aguas servidas') ? 'Sí' : 'No',
    r.electrodependent || 'No', Number(r.electrodependentCount || 0), r.damageDetail || '',
    (r.needs || []).join(' | '), r.measures || '', r.observations || '', r.previousRecordId || ''
  ];
}

function readRecords_() {
  const sheet = ensureSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return rows.filter(row => row[0]).map(rowToRecord_);
}

function rowToRecord_(row) {
  const reportDate = row[1] instanceof Date ? row[1].toISOString() : String(row[1] || '');
  return {
    id: String(row[0] || ''), createdAt: reportDate, reportDate: reportDate,
    service: String(row[4] || ''), program: String(row[5] || ''), region: String(row[6] || ''), commune: String(row[7] || ''),
    establishment: String(row[8] || ''), address: String(row[9] || ''), responsible: String(row[10] || ''),
    contactEmail: String(row[11] || ''), contactPhone: String(row[12] || ''), previousReport: String(row[13] || ''),
    hasChanges: String(row[14] || ''), status: String(row[15] || ''), damageLevel: String(row[16] || ''),
    capacity: Number(row[17] || 0), people: Number(row[18] || 0), situations: splitList_(row[19]),
    electrodependent: String(row[21] || 'No'), electrodependentCount: Number(row[22] || 0),
    damageDetail: String(row[23] || ''), needs: splitList_(row[24]), measures: String(row[25] || ''),
    observations: String(row[26] || ''), previousRecordId: String(row[27] || '')
  };
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
