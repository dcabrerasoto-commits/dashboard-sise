let chartEstado = null;
let chartRegion = null;
let chartTendencia = null;
let dashboardData = null;
let currentMonthIndex = 0;
let modalRegionActual = null;
let regionSeleccionada = null;

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
function normalizarRunValido(valor) {
    const limpio = String(valor || "").replace(/\./g, "").replace(/-/g, "").trim().toUpperCase();
    if (!/^\d{7,8}[0-9K]$/.test(limpio)) return "";
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    let suma = 0;
    let multiplicador = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += Number(cuerpo[i]) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    const esperado = 11 - (suma % 11);
    const dvEsperado = esperado === 11 ? "0" : esperado === 10 ? "K" : String(esperado);
    return dv === dvEsperado ? `${cuerpo}-${dv}` : "";
}
function filtrarRunUnicosValidos(datos, colRun) {
    const vistos = new Set();
    return datos.filter((fila) => {
        const run = normalizarRunValido(fila[colRun]);
        if (!run || vistos.has(run)) return false;
        vistos.add(run);
        return true;
    });
}
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
    if (normalizado === "UBLE" || normalizado.endsWith(" UBLE") || normalizado.includes("NUBLE") || normalizado.includes("?UBLE") || normalizado.includes("?UBLE")) return "NUBLE";
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
function pctValor(valor) { return `${Number(valor || 0).toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`; }
function pct(n, total) { return total > 0 ? pctValor((n / total) * 100) : "-"; }
function obtenerDelta(actual, previo, mesAnterior = "mes anterior") { const diff = actual - previo; const referencia = `respecto de ${mesNombrePropioText(mesAnterior)}`; if (diff > 0) return { className: "delta-up", label: `+${fmt(diff)} ${referencia}` }; if (diff < 0) return { className: "delta-down", label: `${fmt(diff)} ${referencia}` }; return { className: "delta-flat", label: `Sin variación ${referencia}` }; }
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
    const usadas = new Set();
    const elegirHallazgo = (filas, condicion = () => true) => {
        const alternativa = filas.find((fila) => condicion(fila) && !usadas.has(fila.Region));
        const seleccion = alternativa || filas.find(condicion);
        if (seleccion) usadas.add(seleccion.Region);
        return seleccion;
    };
    const porTotal = [...regiones].sort((a, b) => b.Total - a.Total);
    const porAcreditado = [...regiones].sort((a, b) => b.Acreditado - a.Acreditado);
    const porNoAcreditado = [...regiones].sort((a, b) => b.NoAcreditado - a.NoAcreditado);
    const topNumero = elegirHallazgo(porTotal);
    const topAcreditacion = elegirHallazgo(porAcreditado, (r) => r.Acreditado > 0);
    const topSinAcreditacionPrevia = elegirHallazgo(porNoAcreditado, (r) => r.NoAcreditado > 0);
    const diffAcreditado = prevMonthData ? monthData.acreditado - prevMonthData.acreditado : 0;
    return [
        `${monthData.label}: ${fmt(monthData.acreditado)} personas con acreditación vigente y ${fmt(monthData.noVigente + monthData.noAcreditado)} personas sin acreditación vigente.`,
        topNumero ? { titulo: "Concentración de registros", hallazgo: `${topNumero.RegionEtiqueta} concentra ${fmt(topNumero.Total)} registros.` } : { titulo: "Concentración de registros", hallazgo: "No hay información regional disponible." },
        topAcreditacion ? { titulo: "Acreditación vigente relevante", hallazgo: `${topAcreditacion.RegionEtiqueta} figura entre las regiones con mayor número de personas con acreditación vigente, con ${fmt(topAcreditacion.Acreditado)} registros.` } : { titulo: "Acreditación vigente relevante", hallazgo: "No hay información regional disponible." },
        topSinAcreditacionPrevia ? { titulo: "Sin acreditación previa relevante", hallazgo: `${topSinAcreditacionPrevia.RegionEtiqueta} figura entre las regiones con mayor número de personas sin acreditación previa, con ${fmt(topSinAcreditacionPrevia.NoAcreditado)} registros.` } : { titulo: "Sin acreditación previa relevante", hallazgo: "No se identificaron registros sin acreditación previa." },
        prevMonthData ? { titulo: "Variación mensual", hallazgo: `Las personas con acreditación vigente ${diffAcreditado >= 0 ? "aumentan" : "disminuyen"} en ${fmt(Math.abs(diffAcreditado))} respecto de ${prevMonthData.label}.` } : { titulo: "Variación mensual", hallazgo: "No existe un mes previo informado para calcular variación mensual." }
    ];
}
function obtenerAlertas(monthData, prevMonthData) {
    const alertas = [];
    const regiones = monthData.porRegion.filter((r) => r.Total > 0 && r.Region !== "NIVEL CENTRAL");
    const usosRegion = {};
    const puedeUsar = (region) => (usosRegion[region] || 0) < 2;
    const usar = (fila) => { usosRegion[fila.Region] = (usosRegion[fila.Region] || 0) + 1; };
    const elegir = (filas, condicion = () => true) => filas.find((fila) => condicion(fila) && puedeUsar(fila.Region));
    const porNoAcreditacion = [...regiones].sort((a, b) => b.NoAcreditado - a.NoAcreditado);
    const porBrecha = [...regiones].sort((a, b) => (b.NoVigente + b.NoAcreditado) - (a.NoVigente + a.NoAcreditado));
    const porNoVigente = [...regiones].sort((a, b) => b.NoVigente - a.NoVigente);
    const mayorBrecha = elegir(porBrecha, (r) => (r.NoVigente + r.NoAcreditado) > 0);
    if (mayorBrecha) {
        usar(mayorBrecha);
        alertas.push({ etiqueta: "Atención", titulo: "Mayor grupo sin acreditación vigente", dato: `${mayorBrecha.RegionEtiqueta} registra ${fmt(mayorBrecha.NoVigente + mayorBrecha.NoAcreditado)} personas sin acreditación vigente.`, base: "Base: No vigente + Sin acreditación previa." });
    }
    const mayorNoAcreditacion = elegir(porNoAcreditacion, (r) => r.NoAcreditado > 0);
    if (mayorNoAcreditacion && mayorNoAcreditacion.NoAcreditado > 0) {
        usar(mayorNoAcreditacion);
        alertas.push({ etiqueta: "Revisión prioritaria", titulo: "Mayor número de personas sin acreditación previa", dato: `${mayorNoAcreditacion.RegionEtiqueta} registra ${fmt(mayorNoAcreditacion.NoAcreditado)} personas sin acreditación previa.` });
    }
    const mayorNoVigente = elegir(porNoVigente, (r) => r.NoVigente > 0);
    if (mayorNoVigente) {
        usar(mayorNoVigente);
        alertas.push({ etiqueta: "Seguimiento", titulo: "Mayor número de personas no vigentes", dato: `${mayorNoVigente.RegionEtiqueta} registra ${fmt(mayorNoVigente.NoVigente)} personas no vigentes.` });
    }
    if (prevMonthData) {
        const deltaNoVigente = monthData.noVigente - prevMonthData.noVigente;
        const deltaNoAcreditado = monthData.noAcreditado - prevMonthData.noAcreditado;
        if (deltaNoVigente !== 0 && alertas.length < 6) {
            alertas.push({ etiqueta: "Seguimiento", titulo: "Variación de no vigencia", dato: `El número de personas no vigentes ${deltaNoVigente > 0 ? "aumenta" : "disminuye"} en ${fmt(Math.abs(deltaNoVigente))} respecto de ${prevMonthData.label}.` });
        }
        if (deltaNoAcreditado !== 0 && alertas.length < 6) {
            alertas.push({ etiqueta: "Seguimiento", titulo: "Variación de personas sin acreditación previa", dato: `El número de personas sin acreditación previa ${deltaNoAcreditado > 0 ? "aumenta" : "disminuye"} en ${fmt(Math.abs(deltaNoAcreditado))} respecto de ${prevMonthData.label}.` });
        }
    }
    if (alertas.length === 0) {
        alertas.push({ etiqueta: "Seguimiento", titulo: "Sin puntos prioritarios", dato: "No se detectan puntos prioritarios para el mes seleccionado según los datos visibles." });
    }
    return alertas.slice(0, 6);
}
