function porcentajeEs(valor) { return `${valor.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`; }
function porcentajeRatioEs(valor, total) { return porcentajeEs(total > 0 ? (valor / total) * 100 : 0); }
function badgeTasa(valor) { return `<span class="badge badge-principal">${porcentajeEs(valor)}</span>`; }
function textoPorcentaje(valor) {
    return `<div class="percent-text">${badgeTasa(valor)}</div>`;
}
function textoPorcentajeSimple(valor) {
    return `<div class="percent-text percent-text-simple">${porcentajeEs(valor)}</div>`;
}
function mesNombrePropioText(texto) {
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return String(texto).replace(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/gi, (m) => {
        const mes = meses.find((item) => item === m.toLowerCase());
        return mes ? `${mes.charAt(0).toUpperCase()}${mes.slice(1)}` : m;
    });
}
function mesNombrePropioHtml(texto) {
    return mesNombrePropioText(texto).replace(/\b(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\b/g, "<strong>$1</strong>");
}
function lecturaEjecutivaMes(monthData) {
    const sinAcreditacionVigente = monthData.noVigente + monthData.noAcreditado;
    return `<strong>${mesNombrePropioText(monthData.label)}:</strong> ${fmt(monthData.acreditado)} personas con acreditaciÃ³n vigente y ${fmt(sinAcreditacionVigente)} personas sin acreditaciÃ³n vigente. De este segundo grupo, ${fmt(monthData.noVigente)} son no vigentes y ${fmt(monthData.noAcreditado)} no registran acreditaciÃ³n previa.`;
}
function renderTarjetasHallazgos(hallazgos) {
    const titulos = ["ConcentraciÃ³n de registros", "AcreditaciÃ³n vigente relevante", "Sin acreditaciÃ³n previa relevante", "VariaciÃ³n mensual"];
    return hallazgos.slice(1).map((item, index) => {
        if (typeof item === "object") {
            return `<div class="insight-item insight-structured"><div class="insight-kicker">${item.titulo || titulos[index] || "SÃ­ntesis"}</div><div class="insight-main">${mesNombrePropioHtml(item.hallazgo || "")}</div><div class="insight-copy">${mesNombrePropioHtml(item.lectura || "")}</div></div>`;
        }
        const partes = item.split(", ");
        const dato = partes.length > 1 ? partes[0] : item.split(".")[0];
        return `<div class="insight-item insight-structured"><div class="insight-kicker">${titulos[index] || "SÃ­ntesis"}</div><div class="insight-main">${mesNombrePropioHtml(dato)}</div><div class="insight-copy">${mesNombrePropioHtml(item)}</div></div>`;
    }).join("");
}
function obtenerTipoAlerta(item) {
    if (typeof item === "object" && item.etiqueta) return item.etiqueta;
    if (item.startsWith("Seguimiento sugerido")) return "Seguimiento";
    if (item.startsWith("AtenciÃ³n")) return "AtenciÃ³n";
    if (item.startsWith("RevisiÃ³n prioritaria")) return "RevisiÃ³n prioritaria";
    if (item.startsWith("VariaciÃ³n mensual")) return "Seguimiento";
    return "Seguimiento";
}
function renderTarjetasAlertas(alertas) {
    return alertas.map((item) => {
        const tipo = obtenerTipoAlerta(item);
        const clase = tipo === "AtenciÃ³n" ? "alerta-atencion" : (tipo === "RevisiÃ³n prioritaria" ? "alerta-revision" : "alerta-seguimiento");
        if (typeof item === "object") {
            return `<div class="insight-item alert-item ${clase}"><div class="alert-label">${tipo}</div><div class="insight-main">${mesNombrePropioHtml(item.titulo || "")}</div><div class="insight-copy">${mesNombrePropioHtml(item.dato || "")}</div>${item.base ? `<div class="insight-base">${item.base}</div>` : ""}</div>`;
        }
        return `<div class="insight-item alert-item ${clase}"><div class="alert-label">${tipo}</div><div class="insight-copy">${mesNombrePropioHtml(item)}</div></div>`;
    }).join("");
}
function renderSubfilasInstitucion(item, esNivelCentral, totalAcreditadoReferencia) {
    if (esNivelCentral) return "";
    const textoParticipacion = (valor) => textoPorcentajeSimple(totalAcreditadoReferencia > 0 ? ((valor / totalAcreditadoReferencia) * 100) : 0);
    const totalMunicipalidad = item.AcreditadoMunicipalidad + item.NoVigenteMunicipalidad + item.NoAcreditadoMunicipalidad;
    const totalSeremi = item.AcreditadoSeremi + item.NoVigenteSeremi + item.NoAcreditadoSeremi;
    const totalOtras = item.AcreditadoOtras + item.NoVigenteOtras + item.NoAcreditadoOtras;
    return `
        <tr class="subfila-institucion">
            <td>Municipalidad</td>
            <td class="cell-acreditado">${fmt(item.AcreditadoMunicipalidad)}</td>
            <td class="percent-cell cell-porcentaje">${textoParticipacion(item.AcreditadoMunicipalidad)}</td>
            <td class="cell-brecha cell-novigente">${fmt(item.NoVigenteMunicipalidad)}</td>
            <td class="cell-brecha cell-noacreditado">${fmt(item.NoAcreditadoMunicipalidad)}</td>
            <td class="cell-total">${fmt(totalMunicipalidad)}</td>
        </tr>
        <tr class="subfila-institucion">
            <td>SEREMI</td>
            <td class="cell-acreditado">${fmt(item.AcreditadoSeremi)}</td>
            <td class="percent-cell cell-porcentaje">${textoParticipacion(item.AcreditadoSeremi)}</td>
            <td class="cell-brecha cell-novigente">${fmt(item.NoVigenteSeremi)}</td>
            <td class="cell-brecha cell-noacreditado">${fmt(item.NoAcreditadoSeremi)}</td>
            <td class="cell-total">${fmt(totalSeremi)}</td>
        </tr>
        <tr class="subfila-institucion">
            <td>Otras instituciones</td>
            <td class="cell-acreditado">${fmt(item.AcreditadoOtras)}</td>
            <td class="percent-cell cell-porcentaje">${textoParticipacion(item.AcreditadoOtras)}</td>
            <td class="cell-brecha cell-novigente">${fmt(item.NoVigenteOtras)}</td>
            <td class="cell-brecha cell-noacreditado">${fmt(item.NoAcreditadoOtras)}</td>
            <td class="cell-total">${fmt(totalOtras)}</td>
        </tr>
    `;
}
function buildMonthButtons() { return dashboardData.monthly.map((mes, index) => `<button class="month-btn ${index === currentMonthIndex ? "active" : ""}" onclick="seleccionarMes(${index})">${mesNombrePropioText(mes.label)}</button>`).join(""); }
function obtenerMesActual() {
    return dashboardData && dashboardData.monthly ? dashboardData.monthly[currentMonthIndex] : null;
}
function abrirDetalleRegion(region) {
    const monthData = obtenerMesActual();
    if (!monthData) return;
    const regionData = monthData.porRegion.find((item) => item.Region === region) || obtenerResumenVacio(region, ETIQUETAS_REGION[region] || region);
    modalRegionActual = regionData.Region;
    regionSeleccionada = regionData.Region;
    const esNivelCentral = regionData.Region === "NIVEL CENTRAL";
    document.getElementById("comunaModalTitle").textContent = regionData.RegionEtiqueta;
    const subtituloBase = `Mes visualizado: ${mesNombrePropioText(monthData.label)}.`;
    const encabezado = document.getElementById("comunaModalSectionTitle");
    if (encabezado) encabezado.textContent = esNivelCentral ? "Resumen del nivel central" : "Desglose por comuna";
    document.getElementById("comunaModalSubtitle").textContent = esNivelCentral
        ? `${subtituloBase} Resumen del nÃºmero de personas registradas en Nivel Central.`
        : (dashboardData.hasComunaData
            ? `${subtituloBase} Desglose del nÃºmero de personas por comuna dentro de la regiÃ³n seleccionada.`
            : `${subtituloBase} La fuente publicada actual no incluye una columna de comuna; agrega una columna COMUNA para habilitar este detalle.`);
    const contenedor = document.getElementById("comunaModalContent");
    if (!dashboardData.hasComunaData) {
        contenedor.innerHTML = `<div class="modal-empty">La base publicada hoy no trae una columna de comuna. En cuanto el CSV incorpore una columna como <strong>COMUNA</strong>, <strong>NOMBRE_COMUNA</strong> o similar, este desglose se activarÃ¡ automÃ¡ticamente al hacer clic en cada regiÃ³n.</div>`;
    } else {
        const filasComuna = regionData.porComuna.map((c, index) => `
            <tr class="${index % 2 === 0 ? "region-group-par" : "region-group-impar"}">
                <td>${c.Comuna}</td>
                <td class="cell-acreditado">${fmt(c.Acreditado)}</td>
                <td class="percent-cell cell-porcentaje">${textoPorcentajeSimple(regionData.Acreditado > 0 ? (c.Acreditado / regionData.Acreditado) * 100 : 0)}</td>
                <td class="cell-brecha cell-novigente">${fmt(c.NoVigente)}</td>
                <td class="cell-brecha cell-noacreditado">${fmt(c.NoAcreditado)}</td>
                <td class="cell-total">${fmt(c.Total)}</td>
            </tr>
            ${renderSubfilasInstitucion(c, false, regionData.Acreditado).replaceAll('class="subfila-institucion"', `class="subfila-institucion ${index % 2 === 0 ? "region-group-par" : "region-group-impar"}"`)}
        `).join("");
        const brechaRegional = regionData.NoVigente + regionData.NoAcreditado;
        contenedor.innerHTML = `
            <div class="modal-grid kpi-section modal-kpi-grid">
                <div class="kpi-card azul"><div class="kpi-label">NÂ° de personas registradas</div><div class="kpi-value">${fmt(regionData.Total)}</div></div>
                <div class="kpi-card verde"><div class="kpi-label">NÂ° de personas con acreditaciÃ³n vigente</div><div class="kpi-value">${fmt(regionData.Acreditado)}</div><div class="kpi-percent">${porcentajeRatioEs(regionData.Acreditado, regionData.Total)} del total regional.</div></div>
                <div class="kpi-group-with-subgroups">
                    <div class="kpi-card brecha"><div class="kpi-label">NÂ° de personas sin acreditaciÃ³n vigente</div><div class="kpi-value">${fmt(brechaRegional)}</div><div class="kpi-percent">No vigente + Sin acreditaciÃ³n previa.</div></div>
                    <div class="kpi-subgroups-panel"><div class="kpi-subgroup-heading">Subgrupos de personas sin acreditaciÃ³n vigente</div><div class="kpi-subgroup-stack">
                        <div class="kpi-card ambar kpi-subgrupo"><div class="kpi-label">NÂ° de personas no vigentes</div><div class="kpi-value">${fmt(regionData.NoVigente)}</div><div class="kpi-percent">${porcentajeRatioEs(regionData.NoVigente, regionData.Total)} del total regional.</div></div>
                        <div class="kpi-card rojo kpi-subgrupo"><div class="kpi-label">NÂ° de personas sin acreditaciÃ³n previa</div><div class="kpi-value">${fmt(regionData.NoAcreditado)}</div><div class="kpi-percent">${porcentajeRatioEs(regionData.NoAcreditado, regionData.Total)} del total regional.</div></div>
                    </div></div>
                    </div>
                </div>
            </div>
                ${esNivelCentral ? "" : `<div class="table-section" style="padding:0; border:none; box-shadow:none;">
                    <div class="section-title" style="padding:0 0 8px 0;">Estados por comuna</div>
                    <table class="fixed-data-table">
                        <colgroup>
                            <col class="col-territorio">
                            <col class="col-data">
                            <col class="col-data col-porcentaje">
                            <col class="col-data col-estrecha">
                            <col class="col-data col-estrecha">
                            <col class="col-data">
                        </colgroup>
                        <thead>
                            <tr><th rowspan="2">Comuna</th><th rowspan="2" class="th-acreditado">Con acreditaciÃ³n vigente</th><th rowspan="2" class="percent-header th-porcentaje"><span>% con acreditaciÃ³n vigente respecto al total regional</span></th><th colspan="2" class="th-brecha-group col-brecha-group"><span>Personas sin acreditaciÃ³n vigente</span></th><th rowspan="2" class="th-total">Total</th></tr>
                            <tr><th class="th-novigente">No vigente</th><th class="th-noacreditado">Sin acreditaciÃ³n previa</th></tr>
                        </thead>
                        <tbody>${filasComuna}</tbody>
                    </table>
                </div>`}
            `;
    }
    document.getElementById("comunaModal").classList.add("visible");
}
function cerrarModalComuna(event) {
    if (event && event.target && event.target !== event.currentTarget) return;
    modalRegionActual = null;
    document.getElementById("comunaModal").classList.remove("visible");
}
function renderDashboard() {
    const monthData = dashboardData.monthly[currentMonthIndex];
    const prevMonthData = currentMonthIndex > 0 ? dashboardData.monthly[currentMonthIndex - 1] : null;
    const hallazgos = obtenerHallazgos(monthData, prevMonthData);
    const alertas = obtenerAlertas(monthData, prevMonthData);
    const mesAnteriorLabel = prevMonthData ? mesNombrePropioText(prevMonthData.label) : "mes anterior";
    const deltaAcreditado = obtenerDelta(monthData.acreditado, prevMonthData ? prevMonthData.acreditado : monthData.acreditado, mesAnteriorLabel);
    const deltaNoVigente = obtenerDelta(monthData.noVigente, prevMonthData ? prevMonthData.noVigente : monthData.noVigente, mesAnteriorLabel);
    const deltaNoAcreditado = obtenerDelta(monthData.noAcreditado, prevMonthData ? prevMonthData.noAcreditado : monthData.noAcreditado, mesAnteriorLabel);
    const brechaActual = monthData.noVigente + monthData.noAcreditado;
    const brechaPrevia = prevMonthData ? prevMonthData.noVigente + prevMonthData.noAcreditado : brechaActual;
    const deltaBrecha = obtenerDelta(brechaActual, brechaPrevia, mesAnteriorLabel);
    const deltaUniverso = prevMonthData ? monthData.total - prevMonthData.total : 0;
    const filasRegion = monthData.porRegion.map((r, index) => `
        <tr class="${index % 2 === 0 ? "region-group-par" : "region-group-impar"}">
            <td><button type="button" class="region-cell-button" onclick="abrirDetalleRegion('${r.Region.replace(/'/g, "\\'")}')">${r.RegionEtiqueta}</button></td>
            <td class="cell-acreditado">${fmt(r.Acreditado)}</td>
            <td class="percent-cell cell-porcentaje">${textoPorcentaje(monthData.acreditado > 0 ? (r.Acreditado / monthData.acreditado) * 100 : 0)}</td>
            <td class="cell-brecha cell-novigente">${fmt(r.NoVigente)}</td>
            <td class="cell-brecha cell-noacreditado">${fmt(r.NoAcreditado)}</td>
            <td class="cell-total">${fmt(r.Total)}</td>
        </tr>
        ${renderSubfilasInstitucion(r, r.Region === "NIVEL CENTRAL", r.Acreditado).replaceAll('class="subfila-institucion"', `class="subfila-institucion ${index % 2 === 0 ? "region-group-par" : "region-group-impar"}"`)}
    `).join("");
    const filaTotales = `
        <tr>
            <td><strong>Total</strong></td>
            <td class="cell-acreditado"><strong>${fmt(monthData.acreditado)}</strong></td>
            <td class="percent-cell cell-porcentaje">${textoPorcentajeSimple(100)}</td>
            <td class="cell-brecha cell-novigente"><strong>${fmt(monthData.noVigente)}</strong></td>
            <td class="cell-brecha cell-noacreditado"><strong>${fmt(monthData.noAcreditado)}</strong></td>
            <td class="cell-total"><strong>${fmt(monthData.total)}</strong></td>
        </tr>
    `;
    document.getElementById("content").innerHTML = `
        <div class="dashboard-shell">
        <div class="executive-band">
            <div class="panel executive-main"><div class="executive-title">Lectura ejecutiva</div><div class="executive-text">${lecturaEjecutivaMes(monthData)}</div><div class="definitions-compact definitions-grouped"><div class="definition-group"><strong>Con acreditaciÃ³n vigente</strong><span>Personas matriculadas con acreditaciÃ³n vigente en el mes seleccionado.</span></div><div class="definition-group definition-group-parent"><strong>Sin acreditaciÃ³n vigente</strong><span>Personas matriculadas que actualmente no cuentan con acreditaciÃ³n activa.</span><div class="definition-subgroups"><span><b>No vigente:</b> personas matriculadas que tuvieron acreditaciÃ³n previa, pero no cuentan con vigencia actual.</span><span><b>Sin acreditaciÃ³n previa:</b> personas matriculadas que no registran acreditaciÃ³n anterior ni actual.</span></div></div></div></div>
            <div class="panel executive-side"><div class="executive-title">Contexto</div><div class="context-list"><div><span>Mes visualizado</span><strong>${mesNombrePropioText(monthData.label)}</strong></div><div><span>Fuente</span><strong>Sistema de InformaciÃ³n Social en Emergencias</strong></div><div><span>NÂ° de registros del mes</span><strong>${fmt(monthData.total)} registros de ${mesNombrePropioText(monthData.label)}</strong></div><div><span>ComparaciÃ³n</span><strong>${prevMonthData ? `${mesNombrePropioText(prevMonthData.label)} (${fmt(prevMonthData.total)} registros)` : "Sin mes previo"}</strong></div><div><span>VariaciÃ³n del universo mensual</span><strong>${prevMonthData ? `${deltaUniverso >= 0 ? "+" : ""}${fmt(deltaUniverso)} registros` : "Sin mes previo"}</strong></div></div><div class="context-note">Las variaciones muestran el cambio frente al mes anterior. Como el total de registros puede cambiar, no deben leerse como traspasos directos entre categorÃ­as.</div></div>
        </div>
        <div class="panel toolbar">
            <div><div class="toolbar-title">Seleccionar mes</div><div class="month-group">${buildMonthButtons()}</div></div>
            <div class="toolbar-actions">
                <div class="toolbar-meta"><div><strong>Fuente:</strong> Sistema de InformaciÃ³n Social en Emergencias</div></div>
                <div class="export-wrap">
                    <button type="button" class="export-btn" onclick="toggleMenuExportacion()">Exportar datos</button>
                    <div class="export-menu" id="exportMenu">
                        <button type="button" class="export-option" onclick="exportarRegional()">Descargar resumen nacional por regiÃ³n</button>
                        <button type="button" class="export-option" onclick="exportarComunalNacional()" ${dashboardData.hasComunaData ? "" : "disabled"}>Descargar resumen nacional por comuna</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="kpi-section">
            <div class="kpi-card azul"><div class="kpi-label">NÂ° de personas registradas</div><div class="kpi-value">${fmt(dashboardData.totalPersonas)}</div><div class="kpi-percent">Recuento de RUN Ãºnicos de los meses consolidados.</div></div>
            <div class="kpi-card verde"><div class="kpi-label">NÂ° de personas con acreditaciÃ³n vigente</div><div class="kpi-value">${fmt(monthData.acreditado)}</div><div class="kpi-percent">${porcentajeRatioEs(monthData.acreditado, monthData.total)} del total de registros de ${mesNombrePropioText(monthData.label)}</div><div class="kpi-description">Personas con acreditaciÃ³n vigente en el mes visualizado.</div><div class="kpi-delta ${deltaAcreditado.className}">${deltaAcreditado.label}</div></div>
            <div class="kpi-group-with-subgroups">
                <div class="kpi-card brecha"><div class="kpi-label">NÂ° de personas sin acreditaciÃ³n vigente</div><div class="kpi-value">${fmt(brechaActual)}</div><div class="kpi-percent">${porcentajeRatioEs(brechaActual, monthData.total)} del total de registros de ${mesNombrePropioText(monthData.label)}</div><div class="kpi-description">No vigente + Sin acreditaciÃ³n previa.</div><div class="kpi-delta ${deltaBrecha.className}">${deltaBrecha.label}</div></div>
                <div class="kpi-subgroups-panel"><div class="kpi-subgroup-heading">Subgrupos de personas sin acreditaciÃ³n vigente</div><div class="kpi-subgroup-stack">
                    <div class="kpi-card ambar kpi-subgrupo"><div class="kpi-label">NÂ° de personas no vigentes</div><div class="kpi-value">${fmt(monthData.noVigente)}</div><div class="kpi-percent">${porcentajeRatioEs(monthData.noVigente, monthData.total)} del total de registros de ${mesNombrePropioText(monthData.label)}</div><div class="kpi-delta ${deltaNoVigente.className}">${deltaNoVigente.label}</div></div>
                    <div class="kpi-card rojo kpi-subgrupo"><div class="kpi-label">NÂ° de personas sin acreditaciÃ³n previa</div><div class="kpi-value">${fmt(monthData.noAcreditado)}</div><div class="kpi-percent">${porcentajeRatioEs(monthData.noAcreditado, monthData.total)} del total de registros de ${mesNombrePropioText(monthData.label)}</div><div class="kpi-delta ${deltaNoAcreditado.className}">${deltaNoAcreditado.label}</div></div>
                </div></div>
            </div>
        </div>
        <div class="charts-section">
            <div class="chart-card"><div class="section-title">EvoluciÃ³n mensual segÃºn acreditaciÃ³n vigente</div><div class="chart-canvas-wrap"><canvas id="trendChart"></canvas></div></div>
            <div class="chart-card"><div class="section-title">DistribuciÃ³n por acreditaciÃ³n vigente</div><div class="chart-canvas-wrap compact"><canvas id="estadoChart"></canvas></div></div>
        </div>
        <div class="mid-section">
            <div class="table-section"><div class="section-title">Estados por regiÃ³n</div><div class="section-note">${dashboardData.hasComunaData ? "Haz clic en una regiÃ³n para ver el desglose por comuna." : "Haz clic en una regiÃ³n para revisar el detalle disponible. La fuente actual todavÃ­a no incorpora comuna."}</div><table class="fixed-data-table"><colgroup><col class="col-territorio"><col class="col-data"><col class="col-data col-porcentaje"><col class="col-data col-estrecha"><col class="col-data col-estrecha"><col class="col-data"></colgroup><thead><tr><th rowspan="2">RegiÃ³n</th><th rowspan="2" class="th-acreditado">Con acreditaciÃ³n vigente</th><th rowspan="2" class="percent-header th-porcentaje"><span>% con acreditaciÃ³n vigente</span><small>Fila regional: respecto al total nacional. Detalle institucional: respecto a personas con acreditaciÃ³n vigente de la regiÃ³n.</small></th><th colspan="2" class="th-brecha-group col-brecha-group"><span>Personas sin acreditaciÃ³n vigente</span></th><th rowspan="2" class="th-total">Total</th></tr><tr><th class="th-novigente">No vigente</th><th class="th-noacreditado">Sin acreditaciÃ³n previa</th></tr></thead><tbody>${filasRegion}${filaTotales}</tbody></table></div>
            <div class="insights-column"><div class="insight-card"><div class="section-title">SÃ­ntesis ejecutiva</div><div class="insight-list">${renderTarjetasHallazgos(hallazgos)}</div></div><div class="insight-card"><div class="section-title">Puntos de atenciÃ³n</div><div class="insight-list">${renderTarjetasAlertas(alertas)}</div></div></div>
        </div>
        <div class="footer-card metodologia-card"><div class="section-title">MetodologÃ­a y criterios de lectura</div><div class="method-grid method-grid-two"><div class="method-item"><strong>Fuente y territorio</strong><span><b>Fuente:</b> Sistema de InformaciÃ³n Social en Emergencias.</span><span><b>Territorio:</b> regiÃ³n y comuna dependen de la informaciÃ³n registrada en la fuente; las regiones vacÃ­as, con valor cero o sin clasificaciÃ³n se consolidan en Nivel Central.</span></div><div class="method-item"><strong>Comunas sin coincidencia regional</strong><span>Cuando la comuna informada no corresponde a la regiÃ³n registrada, se clasifica como "Sin informaciÃ³n de comuna".</span></div></div></div>
        </div>
    `;
    crearGraficos(monthData);
}
function procesarTextoCsv(text, origenLabel) {
    const { datos, headers } = parsearCSV(text);
    if (datos.length === 0) {
        throw new Error("El archivo estÃ¡ vacÃ­o o no tiene filas de datos.");
    }
    const colRegion = buscarColumna(headers, ["REGION", "REGIÃ“N", "REGION_NOMBRE", "NOM_REGION", "NOMBRE_REGION"]) || buscarColumnaAproximada(headers, (n) => n.startsWith("REGI") || n.includes("REGION"));
    const colComuna = buscarColumna(headers, ["COMUNA", "NOMBRE_COMUNA", "NOM_COMUNA", "COMUNA_NOMBRE", "GLOSA_COMUNA"]) || buscarColumnaAproximada(headers, (n) => n.includes("COMUNA"));
    const colDependeDe = buscarColumna(headers, ["DEPENDE DE", "DEPENDE_DE", "DEPENDENCIA", "INSTITUCION", "INSTITUCIÃ“N"]);
    const colRun = buscarColumna(headers, ["RUN", "RUT", "RUN_PERSONA", "RUT_PERSONA", "RUN BENEFICIARIO", "RUT BENEFICIARIO"]) || buscarColumnaAproximada(headers, (n) => n === "RUN" || n === "RUT" || n.includes("RUN") || n.includes("RUT"));
    const columnasEstado = buscarColumnasEstado(headers).filter((h) => datos.some((fila) => String(fila[h] || "").trim() !== ""));
    if (columnasEstado.length === 0) {
        throw new Error("No se encontraron columnas de estado vÃ¡lidas. Se esperaban columnas como ESTADO_ENERO, ESTADO_FEBRERO o ESTADO_MARZO.");
    }
    if (!colRun) {
        throw new Error("No se encontrÃ³ una columna RUN o RUT para identificar personas Ãºnicas.");
    }
    const datosRunValidos = filtrarRunUnicosValidos(datos, colRun);
    if (datosRunValidos.length === 0) {
        throw new Error("No se encontraron RUN vÃ¡lidos en la fuente publicada.");
    }
    dashboardData = procesarDatos(datosRunValidos, { colRegion, colComuna, colDependeDe, columnasEstado });
    currentMonthIndex = Math.max(dashboardData.monthly.length - 1, 0);
    renderDashboard();
    if (origenLabel) mostrarInfo(`Fuente cargada: ${origenLabel}`);
}
function cargarDatosPreprocesados() {
    if (!window.SISE_DASHBOARD_DATA || !window.SISE_DASHBOARD_DATA.data) return false;
    dashboardData = window.SISE_DASHBOARD_DATA.data;
    currentMonthIndex = Math.max(dashboardData.monthly.length - 1, 0);
    renderDashboard();
    mostrarInfo("");
    mostrarError("");
    return true;
}
function seleccionarMes(index) { currentMonthIndex = index; renderDashboard(); }
window.addEventListener("DOMContentLoaded", () => {
    if (!cargarDatosPreprocesados()) {
        mostrarInfo("");
        mostrarError("No fue posible cargar los datos preprocesados del dashboard.");
    }
});
window.addEventListener("click", (event) => {
    const wrap = document.querySelector(".export-wrap");
    if (wrap && !wrap.contains(event.target)) cerrarMenuExportacion();
});


