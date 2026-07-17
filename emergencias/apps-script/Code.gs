const SHEET_NAME = 'Historico';
const HEADERS = [
  'fecha',
  'marca',
  'tipo',
  'region',
  'comuna',
  'id',
  'alfa',
  'aplicadas',
  'encuestadores',
  'terminadas',
  'digitacion',
  'anuladas',
  'personas',
  'nna',
  'mayores',
  'discapacidad',
  'estadoDiario',
  'actualizado',
  'origen'
];

function doPost(e) {
  const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
  const registros = Array.isArray(payload.historial) ? payload.historial : [];
  const sheet = ensureSheet_();
  const keys = existingKeys_(sheet);
  const rows = [];

  registros.filter(registro => String(registro.tipo || '') === 'Carga regional').forEach(registro => {
    const row = rowFromRecord_(registro, payload);
    const key = keyFromRow_(row);
    if (!keys.has(key)) {
      keys.add(key);
      rows.push(row);
    }
  });

  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
  }

  return output_({ ok: true, inserted: rows.length, total: Math.max(sheet.getLastRow() - 1, 0) });
}

function doGet(e) {
  const sheet = ensureSheet_();
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1).map(rowToRecord_);
  const data = { ok: true, historial: rows };
  const callback = e && e.parameter && e.parameter.callback;
  return output_(data, callback);
}

function ensureSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function existingKeys_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return new Set();
  return new Set(sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues().map(keyFromRow_));
}

function rowFromRecord_(r, payload) {
  return [
    text_(r.fecha),
    text_(r.marca),
    text_(r.tipo),
    text_(r.region),
    text_(r.comuna),
    text_(r.id),
    number_(r.alfa),
    number_(r.aplicadas),
    number_(r.encuestadores),
    number_(r.terminadas),
    number_(r.digitacion),
    number_(r.anuladas),
    number_(r.personas),
    number_(r.nna),
    number_(r.mayores),
    number_(r.discapacidad),
    text_(r.estadoDiario),
    text_(payload.actualizado),
    text_(payload.origen)
  ];
}

function rowToRecord_(row) {
  return {
    fecha: row[0],
    marca: row[1],
    tipo: row[2],
    region: row[3],
    comuna: row[4],
    id: row[5],
    alfa: number_(row[6]),
    aplicaciones: number_(row[7]),
    aplicadas: number_(row[7]),
    encuestadores: number_(row[8]),
    terminadas: number_(row[9]),
    digitacion: number_(row[10]),
    anuladas: number_(row[11]),
    personas: number_(row[12]),
    nna: number_(row[13]),
    mayores: number_(row[14]),
    discapacidad: number_(row[15]),
    estadoDiario: row[16],
    actualizado: row[17],
    origen: row[18]
  };
}

function keyFromRow_(row) {
  return [
    row[0],
    row[2],
    row[3],
    row[4],
    row[5],
    row[6],
    row[7],
    row[8],
    row[9],
    row[10],
    row[11],
    row[12],
    row[13],
    row[14],
    row[15],
    row[16]
  ].join('|');
}

function output_(data, callback) {
  const body = callback ? `${callback}(${JSON.stringify(data)});` : JSON.stringify(data);
  const type = callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
  return ContentService.createTextOutput(body).setMimeType(type);
}

function text_(value) {
  return value == null ? '' : String(value);
}

function number_(value) {
  return Number(String(value == null ? 0 : value).replace(',', '.')) || 0;
}
