let chartEstado = null;
let chartRegion = null;
let chartTendencia = null;
let dashboardData = null;
let currentMonthIndex = 0;
let modalRegionActual = null;
let regionSeleccionada = null;

const AUTO_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQp3xmjVpjlQTcHdHxM69Jju6ZOJuE2jm58gWU7owObfGoL0PTzHAgWiDR2i8ri-anb0c7j_p4ffjJb/pub?gid=1955078176&single=true&output=csv";
const ORDEN_REGIONES = ["ARICA Y PARINACOTA", "TARAPACA", "ANTOFAGASTA", "ATACAMA", "COQUIMBO", "VALPARAISO", "METROPOLITANA", "OHIGGINS", "MAULE", "NUBLE", "BIO BIO", "LA ARAUCANIA", "LOS RIOS", "LOS LAGOS", "AYSEN", "MAGALLANES", "NIVEL CENTRAL"];
const ETIQUETAS_REGION = { "NIVEL CENTRAL": "Nivel Central", "ARICA Y PARINACOTA": "Arica y Parinacota", "TARAPACA": "Tarapacá", "ANTOFAGASTA": "Antofagasta", "ATACAMA": "Atacama", "COQUIMBO": "Coquimbo", "VALPARAISO": "Valparaíso", "METROPOLITANA": "Metropolitana de Santiago", "OHIGGINS": "O'Higgins", "MAULE": "Maule", "NUBLE": "Ñuble", "BIO BIO": "Biobío", "LA ARAUCANIA": "La Araucanía", "LOS RIOS": "Los Ríos", "LOS LAGOS": "Los Lagos", "AYSEN": "Aysén", "MAGALLANES": "Magallanes" };
const COMUNAS_OFICIALES_POR_REGION = window.COMUNAS_OFICIALES_POR_REGION || {};
const COMUNAS_ALIAS_POR_REGION = window.COMUNAS_ALIAS_POR_REGION || {};

function norm(str) { return String(str || "").replace(/^\uFEFF/, "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
function limpiarHeader(str) { return String(str || "").replace(/^\uFEFF/, "").trim(); }
function detectarSeparador(primeraLinea) { const semicolons = (primeraLinea.match(/;/g) || []).length; const commas = (primeraLinea.match(/,/g) || []).length; return semicolons > commas ? ";" : ","; }
function parsearCSV(csv) {
    const lineas = csv.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
    if (lineas.length < 2) return { datos: [], headers: [] };
    const sep = detectarSeparador(lineas[0]);
    function splitLinea(linea) {
        const cols = [];
        let inQuote = false;
        let current = "";
        for (let i = 0; i < linea.length; i++) {
            const c = linea[i];
            if (c === '"') {
                if (inQuote && linea[i + 1] === '"') { current += '"'; i++; } else { inQuote = !inQuote; }
            } else if (c === sep && !inQuote) {
                cols.push(current.trim());
                current = "";
            } else {
                current += c;
            }
        }
        cols.push(current.trim());
        return cols.map((valor) => valor.replace(/^"|"$/g, "").trim());
    }
    const headers = splitLinea(lineas[0]).map(limpiarHeader);
    const datos = [];
    for (let i = 1; i < lineas.length; i++) {
        if (!lineas[i].trim()) continue;
        const valores = splitLinea(lineas[i]);
        const fila = {};
        headers.forEach((h, j) => { fila[h] = (valores[j] || "").trim(); });
        datos.push(fila);
    }
    return { datos, headers };
}
function buscarColumna(headers, candidatos) { const headersNorm = headers.map(norm); for (const cand of candidatos) { const idx = headersNorm.indexOf(norm(cand)); if (idx !== -1) return headers[idx]; } return null; }
function buscarColumnaAproximada(headers, matcher) { for (const header of headers) { if (matcher(norm(header), header)) return header; } return null; }
function buscarColumnasEstado(headers) { return headers.filter((header) => norm(header).startsWith("ESTADO")); }
function extraerMesDesdeColumna(nombre) { return norm(nombre).replace(/^ESTADO_?/, "").trim(); }
function normalizarEstado(valor) { const estado = norm(valor); if (!estado) return "SIN ESTADO"; if (estado.includes("NO VIGENTE")) return "NO VIGENTE"; if (estado.includes("NO ACREDITADO")) return "NO ACREDITADO"; if (estado === "ACREDITADO") return "ACREDITADO"; return estado; }
function comunaClave(valor) { return norm(valor).replace(/[^A-Z0-9]/g, ""); }
function obtenerIndiceComunasOficiales() {
    if (window.__COMUNAS_OFICIALES_INDEX) return window.__COMUNAS_OFICIALES_INDEX;
    const indice = {};
    Object.entries(COMUNAS_OFICIALES_POR_REGION).forEach(([region, comunas]) => {
        indice[region] = {};
        comunas.forEach((comuna) => {
            indice[region][comunaClave(comuna)] = comuna;
        });
        Object.entries(COMUNAS_ALIAS_POR_REGION[region] || {}).forEach(([alias, oficial]) => {
            indice[region][comunaClave(alias)] = oficial;
        });
    });
    window.__COMUNAS_OFICIALES_INDEX = indice;
    return indice;
}
function normalizarComunaPorRegion(region, valor) {
    if (region === "NIVEL CENTRAL") return "Nivel Central";
    const texto = String(valor || "").trim();
    if (!texto || norm(texto) === "0") return "Sin información de comuna";
    const oficiales = obtenerIndiceComunasOficiales();
    const comunasRegion = oficiales[region];
    if (!comunasRegion) return "Sin información de comuna";
    const match = comunasRegion[comunaClave(texto)];
    return match || "Sin información de comuna";
}
function construirUrlSinCache(url) {
    const limpia = String(url || "").trim();
    if (!limpia) return "";
    const separador = limpia.includes("?") ? "&" : "?";
    return `${limpia}${separador}_ts=${Date.now()}`;
}
function normalizarRegion(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "NIVEL CENTRAL";
    const normalizado = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
    if (!normalizado || normalizado === "0" || normalizado === "SIN REGION") return "NIVEL CENTRAL";
    if (normalizado.includes("NIVEL CENTRAL")) return "NIVEL CENTRAL";
    if (normalizado.includes("ARICA")) return "ARICA Y PARINACOTA";
    if (normalizado.includes("TARAPACA")) return "TARAPACA";
    if (normalizado.includes("ANTOFAGASTA")) return "ANTOFAGASTA";
    if (normalizado.includes("ATACAMA")) return "ATACAMA";
    if (normalizado.includes("COQUIMBO")) return "COQUIMBO";
    if (normalizado.includes("VALPARAISO")) return "VALPARAISO";
    if (normalizado.includes("METROPOLITANA")) return "METROPOLITANA";
    if (normalizado.includes("OHIGGINS")) return "OHIGGINS";
    if (normalizado.includes("MAULE")) return "MAULE";
    if (normalizado === "UBLE" || normalizado.endsWith(" UBLE") || normalizado.includes("NUBLE") || normalizado.includes("ÑUBLE") || normalizado.includes("ÃUBLE")) return "NUBLE";
    if (normalizado.includes("BIO") && normalizado.includes("BIO")) return "BIO BIO";
    if (normalizado.includes("ARAUCANIA")) return "LA ARAUCANIA";
    if (normalizado.includes("LOS RIOS")) return "LOS RIOS";
    if (normalizado.includes("LOS LAGOS")) return "LOS LAGOS";
    if (normalizado.includes("AYSEN")) return "AYSEN";
    if (normalizado.includes("MAGALLANES")) return "MAGALLANES";
    return normalizado;
}
function obtenerOrdenRegion(region) { const idx = ORDEN_REGIONES.indexOf(region); return idx === -1 ? ORDEN_REGIONES.length + 1 : idx; }
function mostrarError(msg) { const el = document.getElementById("errorMsg"); el.style.display = msg ? "block" : "none"; el.textContent = msg || ""; }
function mostrarInfo(msg) { const el = document.getElementById("infoMsg"); el.style.display = msg ? "block" : "none"; el.textContent = msg || ""; }
function fmt(n) { return Number(n || 0).toLocaleString("es-CL"); }
function pct(n, total) { return total > 0 ? ((n / total) * 100).toFixed(1) + "%" : "-"; }
function obtenerDelta(actual, previo) { const diff = actual - previo; if (diff > 0) return { className: "delta-up", label: `+${fmt(diff)} vs mes anterior` }; if (diff < 0) return { className: "delta-down", label: `${fmt(diff)} vs mes anterior` }; return { className: "delta-flat", label: "Sin variación vs mes anterior" }; }
function obtenerResumenVacio(region, etiquetaRegion) {
    return {
        Region: region, RegionEtiqueta: etiquetaRegion || region, Total: 0, Acreditado: 0, NoVigente: 0, NoAcreditado: 0, SinEstado: 0,
        Municipalidad: 0, Seremi: 0, OtrasInstituciones: 0,
        AcreditadoMunicipalidad: 0, AcreditadoSeremi: 0, AcreditadoOtras: 0,
        NoVigenteMunicipalidad: 0, NoVigenteSeremi: 0, NoVigenteOtras: 0,
        NoAcreditadoMunicipalidad: 0, NoAcreditadoSeremi: 0, NoAcreditadoOtras: 0,
        TasaAcreditado: 0, porComuna: []
    };
}
function normalizarInstitucion(valor) {
    const texto = norm(valor);
    if (!texto) return "OTRAS";
    if (texto.includes("SEREMI")) return "SEREMI";
    if (texto.includes("MUNICIPALIDAD") || texto.includes("MUNICIPIO") || texto.includes("MUNI")) return "MUNICIPALIDAD";
    return "OTRAS";
}
function procesarDatos(datos, cols) {
    const { colRegion, colComuna, colDependeDe, columnasEstado } = cols;
    const meses = columnasEstado.map((columna) => ({ key: columna, label: extraerMesDesdeColumna(columna) }));
    const monthly = meses.map((mes) => {
        const resumen = { key: mes.key, label: mes.label, acreditado: 0, noVigente: 0, noAcreditado: 0, sinEstado: 0, total: 0, porRegion: {}, hasComunaData: false };
        datos.forEach((fila) => {
            const valorMes = String(fila[mes.key] || "").trim();
            if (!valorMes) return;
            const estado = normalizarEstado(fila[mes.key]);
            const region = normalizarRegion(colRegion ? fila[colRegion] : "");
            const comuna = normalizarComunaPorRegion(region, colComuna ? fila[colComuna] : "");
            const institucion = normalizarInstitucion(colDependeDe ? fila[colDependeDe] : "");
            resumen.total++;
            if (!resumen.porRegion[region]) {
                resumen.porRegion[region] = {
                    Region: region, RegionEtiqueta: ETIQUETAS_REGION[region] || region, OrdenRegion: obtenerOrdenRegion(region),
                    Acreditado: 0, NoVigente: 0, NoAcreditado: 0, SinEstado: 0, Total: 0,
                    Municipalidad: 0, Seremi: 0, OtrasInstituciones: 0,
                    AcreditadoMunicipalidad: 0, AcreditadoSeremi: 0, AcreditadoOtras: 0,
                    NoVigenteMunicipalidad: 0, NoVigenteSeremi: 0, NoVigenteOtras: 0,
                    NoAcreditadoMunicipalidad: 0, NoAcreditadoSeremi: 0, NoAcreditadoOtras: 0,
                    porComuna: {}
                };
            }
            resumen.porRegion[region].Total++;
            if (region !== "NIVEL CENTRAL") {
                if (institucion === "MUNICIPALIDAD") resumen.porRegion[region].Municipalidad++;
                else if (institucion === "SEREMI") resumen.porRegion[region].Seremi++;
                else resumen.porRegion[region].OtrasInstituciones++;
            }
            if (estado === "ACREDITADO") {
                resumen.acreditado++;
                resumen.porRegion[region].Acreditado++;
                if (region !== "NIVEL CENTRAL") {
                    if (institucion === "MUNICIPALIDAD") resumen.porRegion[region].AcreditadoMunicipalidad++;
                    else if (institucion === "SEREMI") resumen.porRegion[region].AcreditadoSeremi++;
                    else resumen.porRegion[region].AcreditadoOtras++;
                }
            } else if (estado === "NO VIGENTE") {
                resumen.noVigente++;
                resumen.porRegion[region].NoVigente++;
                if (region !== "NIVEL CENTRAL") {
                    if (institucion === "MUNICIPALIDAD") resumen.porRegion[region].NoVigenteMunicipalidad++;
                    else if (institucion === "SEREMI") resumen.porRegion[region].NoVigenteSeremi++;
                    else resumen.porRegion[region].NoVigenteOtras++;
                }
            } else if (estado === "NO ACREDITADO") {
                resumen.noAcreditado++;
                resumen.porRegion[region].NoAcreditado++;
                if (region !== "NIVEL CENTRAL") {
                    if (institucion === "MUNICIPALIDAD") resumen.porRegion[region].NoAcreditadoMunicipalidad++;
                    else if (institucion === "SEREMI") resumen.porRegion[region].NoAcreditadoSeremi++;
                    else resumen.porRegion[region].NoAcreditadoOtras++;
                }
            } else {
                resumen.sinEstado++;
                resumen.porRegion[region].SinEstado++;
            }
            if (colComuna) {
                resumen.hasComunaData = true;
                if (!resumen.porRegion[region].porComuna[comuna]) {
                    resumen.porRegion[region].porComuna[comuna] = {
                        Comuna: comuna, Total: 0, Acreditado: 0, NoVigente: 0, NoAcreditado: 0, SinEstado: 0,
                        Municipalidad: 0, Seremi: 0, OtrasInstituciones: 0,
                        AcreditadoMunicipalidad: 0, AcreditadoSeremi: 0, AcreditadoOtras: 0,
                        NoVigenteMunicipalidad: 0, NoVigenteSeremi: 0, NoVigenteOtras: 0,
                        NoAcreditadoMunicipalidad: 0, NoAcreditadoSeremi: 0, NoAcreditadoOtras: 0,
                        TasaAcreditado: 0
                    };
                }
                resumen.porRegion[region].porComuna[comuna].Total++;
                if (region !== "NIVEL CENTRAL") {
                    if (institucion === "MUNICIPALIDAD") resumen.porRegion[region].porComuna[comuna].Municipalidad++;
                    else if (institucion === "SEREMI") resumen.porRegion[region].porComuna[comuna].Seremi++;
                    else resumen.porRegion[region].porComuna[comuna].OtrasInstituciones++;
                }
                if (estado === "ACREDITADO") {
                    resumen.porRegion[region].porComuna[comuna].Acreditado++;
                    if (region !== "NIVEL CENTRAL") {
                        if (institucion === "MUNICIPALIDAD") resumen.porRegion[region].porComuna[comuna].AcreditadoMunicipalidad++;
                        else if (institucion === "SEREMI") resumen.porRegion[region].porComuna[comuna].AcreditadoSeremi++;
                        else resumen.porRegion[region].porComuna[comuna].AcreditadoOtras++;
                    }
                } else if (estado === "NO VIGENTE") {
                    resumen.porRegion[region].porComuna[comuna].NoVigente++;
                    if (region !== "NIVEL CENTRAL") {
                        if (institucion === "MUNICIPALIDAD") resumen.porRegion[region].porComuna[comuna].NoVigenteMunicipalidad++;
                        else if (institucion === "SEREMI") resumen.porRegion[region].porComuna[comuna].NoVigenteSeremi++;
                        else resumen.porRegion[region].porComuna[comuna].NoVigenteOtras++;
                    }
                } else if (estado === "NO ACREDITADO") {
                    resumen.porRegion[region].porComuna[comuna].NoAcreditado++;
                    if (region !== "NIVEL CENTRAL") {
                        if (institucion === "MUNICIPALIDAD") resumen.porRegion[region].porComuna[comuna].NoAcreditadoMunicipalidad++;
                        else if (institucion === "SEREMI") resumen.porRegion[region].porComuna[comuna].NoAcreditadoSeremi++;
                        else resumen.porRegion[region].porComuna[comuna].NoAcreditadoOtras++;
                    }
                } else {
                    resumen.porRegion[region].porComuna[comuna].SinEstado++;
                }
            }
        });
        resumen.porRegion = Object.values(resumen.porRegion).map((fila) => ({
            ...fila,
            TasaAcreditado: fila.Total > 0 ? (fila.Acreditado / fila.Total) * 100 : 0,
            porComuna: Object.values(fila.porComuna).map((comunaFila) => ({
                ...comunaFila,
                TasaAcreditado: comunaFila.Total > 0 ? (comunaFila.Acreditado / comunaFila.Total) * 100 : 0
            })).sort((a, b) => {
                const aSinComuna = a.Comuna === "Sin información de comuna";
                const bSinComuna = b.Comuna === "Sin información de comuna";
                if (aSinComuna && !bSinComuna) return 1;
                if (!aSinComuna && bSinComuna) return -1;
                return a.Comuna.localeCompare(b.Comuna, "es-CL");
            })
        })).sort((a, b) => a.OrdenRegion - b.OrdenRegion);
        return resumen;
    });
    return { totalPersonas: datos.length, meses, monthly, fechaCarga: new Date().toLocaleDateString("es-CL"), hasComunaData: Boolean(colComuna) };
}
function obtenerHallazgos(monthData, prevMonthData) {
    const regiones = monthData.porRegion.filter((r) => r.Total > 0 && r.Region !== "NIVEL CENTRAL");
    const topNumero = [...regiones].sort((a, b) => b.Total - a.Total)[0];
    const topAcreditacion = [...regiones].filter((r) => r.Total >= 200).sort((a, b) => b.TasaAcreditado - a.TasaAcreditado)[0];
    const topNoVigente = [...regiones].sort((a, b) => b.NoVigente - a.NoVigente)[0];
    const diffAcreditado = prevMonthData ? monthData.acreditado - prevMonthData.acreditado : 0;
    return [
        `${monthData.label}: número de personas acreditadas ${fmt(monthData.acreditado)}, número de personas no vigentes ${fmt(monthData.noVigente)} y número de personas no acreditadas ${fmt(monthData.noAcreditado)}.`,
        topNumero ? `${topNumero.RegionEtiqueta} concentra el mayor número de registros del mes, con ${fmt(topNumero.Total)} registros.` : "No hay información regional disponible.",
        topAcreditacion ? `${topAcreditacion.RegionEtiqueta} presenta el mayor porcentaje de acreditación entre regiones con al menos 200 registros, alcanzando ${topAcreditacion.TasaAcreditado.toFixed(1)}%.` : "No hay suficiente base para comparar porcentajes regionales.",
        topNoVigente ? `${topNoVigente.RegionEtiqueta} registra el mayor número de personas no vigentes, con ${fmt(topNoVigente.NoVigente)} registros.` : "No se identificaron concentraciones relevantes de no vigencia.",
        prevMonthData ? `La variación mensual del número de personas acreditadas es ${diffAcreditado > 0 ? "+" : ""}${fmt(diffAcreditado)} respecto de ${prevMonthData.label}.` : "No existe un mes previo informado para calcular variación mensual."
    ];
}
function obtenerAlertas(monthData, prevMonthData) {
    const alertas = [];
    const regiones = monthData.porRegion.filter((r) => r.Total > 0 && r.Region !== "NIVEL CENTRAL");
    const altaNoVigencia = [...regiones].filter((r) => r.NoVigente / r.Total >= 0.45).sort((a, b) => (b.NoVigente / b.Total) - (a.NoVigente / a.Total))[0];
    const bajaAcreditacion = [...regiones].filter((r) => r.Total >= 200 && r.TasaAcreditado < 12).sort((a, b) => a.TasaAcreditado - b.TasaAcreditado)[0];
    const altaNoAcreditacion = [...regiones].filter((r) => r.NoAcreditado / r.Total >= 0.35).sort((a, b) => (b.NoAcreditado / b.Total) - (a.NoAcreditado / a.Total))[0];
    if (altaNoVigencia) {
        alertas.push(`Seguimiento sugerido: ${altaNoVigencia.RegionEtiqueta} presenta un porcentaje de no vigencia de ${((altaNoVigencia.NoVigente / altaNoVigencia.Total) * 100).toFixed(1)}%.`);
    }
    if (bajaAcreditacion) {
        alertas.push(`Atención: ${bajaAcreditacion.RegionEtiqueta} registra un porcentaje de acreditación de ${bajaAcreditacion.TasaAcreditado.toFixed(1)}%, bajo el umbral de referencia de 12,0%.`);
    }
    if (altaNoAcreditacion) {
        alertas.push(`Revisión prioritaria: ${altaNoAcreditacion.RegionEtiqueta} concentra ${((altaNoAcreditacion.NoAcreditado / altaNoAcreditacion.Total) * 100).toFixed(1)}% de personas no acreditadas dentro de su total regional.`);
    }
    if (prevMonthData) {
        const deltaNoVigente = monthData.noVigente - prevMonthData.noVigente;
        if (deltaNoVigente > 500) {
            alertas.push(`Variación mensual relevante: el número de personas no vigentes aumenta en ${fmt(deltaNoVigente)} respecto de ${prevMonthData.label}.`);
        }
        const deltaAcreditado = monthData.acreditado - prevMonthData.acreditado;
        if (deltaAcreditado < -500) {
            alertas.push(`Variación mensual relevante: el número de personas acreditadas disminuye en ${fmt(deltaAcreditado)} respecto de ${prevMonthData.label}.`);
        }
    }
    if (alertas.length === 0) {
        alertas.push("No se detectan alertas prioritarias para el mes seleccionado según los umbrales definidos.");
    }
    return alertas;
}
