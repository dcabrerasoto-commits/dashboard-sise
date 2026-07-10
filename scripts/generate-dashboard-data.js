const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");

function loadDashboardContext() {
    const context = {
        console,
        window: {},
        Date,
        Intl,
        URL,
        setTimeout,
        clearTimeout
    };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(root, "comunas_oficiales.js"), "utf8"), context);
    vm.runInContext(fs.readFileSync(path.join(root, "data.js"), "utf8"), context);
    return context;
}

function base64url(input) {
    return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getGoogleAccessToken() {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!raw) return "";
    const credentials = JSON.parse(raw);
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const claim = {
        iss: credentials.client_email,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now
    };
    const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(unsigned);
    const signature = signer.sign(credentials.private_key, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const jwt = `${unsigned}.${signature}`;
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt
        })
    });
    if (!response.ok) throw new Error(`Google auth ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return data.access_token;
}

async function readGoogleSheetRows() {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) return null;
    const token = await getGoogleAccessToken();
    if (!token) throw new Error("Falta GOOGLE_SERVICE_ACCOUNT_JSON para leer GOOGLE_SHEET_ID.");
    let sheetName = process.env.GOOGLE_SHEET_NAME || "";
    if (!sheetName) {
        const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!metaResponse.ok) throw new Error(`Google metadata ${metaResponse.status}: ${await metaResponse.text()}`);
        const meta = await metaResponse.json();
        sheetName = meta.sheets?.[0]?.properties?.title;
    }
    if (!sheetName) throw new Error("No se pudo determinar la hoja de Google Sheets.");
    const range = process.env.GOOGLE_SHEET_RANGE || "A:ZZ";
    const encodedRange = encodeURIComponent(`${sheetName}!${range}`);
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Google values ${response.status}: ${await response.text()}`);
    const values = (await response.json()).values || [];
    if (values.length < 2) return { datos: [], headers: [] };
    const headers = values[0].map((value) => String(value || "").trim());
    const datos = values.slice(1).filter((row) => row.some((value) => String(value || "").trim())).map((row) => {
        const fila = {};
        headers.forEach((header, index) => {
            fila[header] = String(row[index] || "").trim();
        });
        return fila;
    });
    return { datos, headers };
}

async function readCsvRows(context) {
    const dataJs = fs.readFileSync(path.join(root, "data.js"), "utf8");
    const defaultUrl = (dataJs.match(/AUTO_CSV_URL\s*=\s*"([^"]+)"/) || [])[1];
    const url = process.env.SOURCE_CSV_URL || defaultUrl;
    if (!url) throw new Error("No se encontró SOURCE_CSV_URL ni AUTO_CSV_URL.");
    const headers = {};
    if (process.env.SOURCE_CSV_BEARER_TOKEN) {
        headers.Authorization = `Bearer ${process.env.SOURCE_CSV_BEARER_TOKEN}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`CSV ${response.status}: ${await response.text()}`);
    return context.parsearCSV(await response.text());
}

async function readPreferredRows(context) {
    const errores = [];
    try {
        return await readCsvRows(context);
    } catch (error) {
        errores.push(`CSV: ${error.message}`);
    }
    try {
        const googleRows = await readGoogleSheetRows();
        if (googleRows) return googleRows;
    } catch (error) {
        errores.push(`Google Sheets: ${error.message}`);
    }
    throw new Error(`No fue posible obtener datos para el dashboard. ${errores.join(" | ")}`);
}

function buildDashboardData(context, rows) {
    const { datos, headers } = rows;
    if (!datos.length) throw new Error("La fuente no tiene filas de datos.");
    const colRegion = context.buscarColumna(headers, ["REGION", "REGIÓN", "REGION_NOMBRE", "NOM_REGION", "NOMBRE_REGION"]) || context.buscarColumnaAproximada(headers, (n) => n.startsWith("REGI") || n.includes("REGION"));
    const colComuna = context.buscarColumna(headers, ["COMUNA", "NOMBRE_COMUNA", "NOM_COMUNA", "COMUNA_NOMBRE", "GLOSA_COMUNA"]) || context.buscarColumnaAproximada(headers, (n) => n.includes("COMUNA"));
    const colDependeDe = context.buscarColumna(headers, ["DEPENDE DE", "DEPENDE_DE", "DEPENDENCIA", "INSTITUCION", "INSTITUCIÓN"]);
    const colRun = context.buscarColumna(headers, ["RUN", "RUT", "RUN_PERSONA", "RUT_PERSONA", "RUN BENEFICIARIO", "RUT BENEFICIARIO"]) || context.buscarColumnaAproximada(headers, (n) => n === "RUN" || n === "RUT" || n.includes("RUN") || n.includes("RUT"));
    const columnasEstado = context.buscarColumnasEstado(headers).filter((h) => datos.some((fila) => String(fila[h] || "").trim() !== ""));
    if (!colRun) throw new Error("No se encontró una columna RUN o RUT.");
    if (!columnasEstado.length) throw new Error("No se encontraron columnas ESTADO.");
    const datosRunValidos = context.filtrarRunUnicosValidos(datos, colRun);
    if (!datosRunValidos.length) throw new Error("No se encontraron RUN válidos.");
    return context.procesarDatos(datosRunValidos, { colRegion, colComuna, colDependeDe, columnasEstado });
}

function updateDataAssetVersion() {
    const indexPath = path.join(root, "index.html");
    const html = fs.readFileSync(indexPath, "utf8");
    const version = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const updated = html.replace(/dashboard-data\.js\?v=[^"]+/g, `dashboard-data.js?v=${version}`);
    if (updated !== html) fs.writeFileSync(indexPath, updated, "utf8");
}

async function main() {
    const context = loadDashboardContext();
    const rows = await readPreferredRows(context);
    const dashboardData = buildDashboardData(context, rows);
    const output = [
        "window.SISE_DASHBOARD_DATA = ",
        JSON.stringify({
            source: process.env.GOOGLE_SHEET_ID ? "private-google-sheet" : "csv",
            data: dashboardData
        }, null, 2),
        ";\n"
    ].join("");
    fs.writeFileSync(path.join(root, "dashboard-data.js"), output, "utf8");
    updateDataAssetVersion();
    console.log(`dashboard-data.js generado: ${dashboardData.totalPersonas} RUN válidos únicos.`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
