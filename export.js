function slug(texto) { return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase(); }
function escaparHtml(valor) { return String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function porcentajeExport(valor) { return `${Number(valor || 0).toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`; }
function descargarExcel(nombre, titulo, headers, filas) {
    const widths = headers.map((header, index) => {
        const maxData = Math.max(header.length, ...filas.map((fila) => String(fila[index] ?? "").length));
        return Math.min(Math.max(maxData + 2, 12), 28);
    });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>table{border-collapse:collapse;font-family:Segoe UI,Arial,sans-serif;font-size:12px}th{background:#1a4080;color:#fff;font-weight:700;padding:8px 10px;border:1px solid #cbd5e1;text-align:left}td{padding:7px 10px;border:1px solid #dbe5f3}tr:nth-child(even) td{background:#f8fbff}.title{font-size:16px;font-weight:700;color:#17396f;margin-bottom:10px}</style></head><body><div class="title">${escaparHtml(titulo)}</div><table><colgroup>${widths.map((w) => `<col style="width:${w}ch">`).join("")}</colgroup><thead><tr>${headers.map((header) => `<th>${escaparHtml(header)}</th>`).join("")}</tr></thead><tbody>${filas.map((fila) => `<tr>${fila.map((valor) => `<td>${escaparHtml(valor)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
function exportarRegional() {
    const monthData = obtenerMesActual();
    if (!monthData) return;
    const filas = monthData.porRegion.map((r) => [
        r.RegionEtiqueta,
        fmt(r.Acreditado),
        porcentajeExport(monthData.acreditado > 0 ? (r.Acreditado / monthData.acreditado) * 100 : 0),
        fmt(r.NoVigente),
        fmt(r.NoAcreditado),
        r.Region === "NIVEL CENTRAL" ? "-" : fmt(r.AcreditadoMunicipalidad),
        r.Region === "NIVEL CENTRAL" ? "-" : fmt(r.NoVigenteMunicipalidad),
        r.Region === "NIVEL CENTRAL" ? "-" : fmt(r.NoAcreditadoMunicipalidad),
        r.Region === "NIVEL CENTRAL" ? "-" : fmt(r.AcreditadoSeremi),
        r.Region === "NIVEL CENTRAL" ? "-" : fmt(r.NoVigenteSeremi),
        r.Region === "NIVEL CENTRAL" ? "-" : fmt(r.NoAcreditadoSeremi),
        r.Region === "NIVEL CENTRAL" ? "-" : fmt(r.AcreditadoOtras),
        r.Region === "NIVEL CENTRAL" ? "-" : fmt(r.NoVigenteOtras),
        r.Region === "NIVEL CENTRAL" ? "-" : fmt(r.NoAcreditadoOtras),
        fmt(r.Total)
    ]);
    descargarExcel(`sise_${slug(monthData.label)}_resumen_regional.xls`, `Resumen nacional por región - ${monthData.label}`, ["Región", "Con acreditación vigente", "% con acreditación vigente respecto al total nacional", "No vigente", "Sin acreditación previa", "Municipalidad con acreditación vigente", "Municipalidad No vigentes", "Municipalidad sin acreditación previa", "SEREMI con acreditación vigente", "SEREMI No vigentes", "SEREMI sin acreditación previa", "Otras instituciones con acreditación vigente", "Otras instituciones No vigentes", "Otras instituciones sin acreditación previa", "Total"], filas);
    cerrarMenuExportacion();
}
function exportarComunalNacional() {
    const monthData = obtenerMesActual();
    if (!monthData) return;
    const filas = monthData.porRegion.flatMap((regionData) =>
        (regionData.porComuna || []).map((c) => [
            regionData.RegionEtiqueta,
            c.Comuna,
            fmt(c.Acreditado),
            porcentajeExport(regionData.Acreditado > 0 ? (c.Acreditado / regionData.Acreditado) * 100 : 0),
            fmt(c.NoVigente),
            fmt(c.NoAcreditado),
            c.Comuna === "Nivel Central" ? "-" : fmt(c.AcreditadoMunicipalidad),
            c.Comuna === "Nivel Central" ? "-" : fmt(c.NoVigenteMunicipalidad),
            c.Comuna === "Nivel Central" ? "-" : fmt(c.NoAcreditadoMunicipalidad),
            c.Comuna === "Nivel Central" ? "-" : fmt(c.AcreditadoSeremi),
            c.Comuna === "Nivel Central" ? "-" : fmt(c.NoVigenteSeremi),
            c.Comuna === "Nivel Central" ? "-" : fmt(c.NoAcreditadoSeremi),
            c.Comuna === "Nivel Central" ? "-" : fmt(c.AcreditadoOtras),
            c.Comuna === "Nivel Central" ? "-" : fmt(c.NoVigenteOtras),
            c.Comuna === "Nivel Central" ? "-" : fmt(c.NoAcreditadoOtras),
            fmt(c.Total)
        ])
    );
    descargarExcel(`sise_${slug(monthData.label)}_resumen_comunal_nacional.xls`, `Resumen nacional por comuna - ${monthData.label}`, ["Región", "Comuna", "Con acreditación vigente", "% con acreditación vigente respecto al total regional", "No vigente", "Sin acreditación previa", "Municipalidad con acreditación vigente", "Municipalidad No vigentes", "Municipalidad sin acreditación previa", "SEREMI con acreditación vigente", "SEREMI No vigentes", "SEREMI sin acreditación previa", "Otras instituciones con acreditación vigente", "Otras instituciones No vigentes", "Otras instituciones sin acreditación previa", "Total"], filas);
    cerrarMenuExportacion();
}
function toggleMenuExportacion() { document.getElementById("exportMenu").classList.toggle("visible"); }
function cerrarMenuExportacion() { const menu = document.getElementById("exportMenu"); if (menu) menu.classList.remove("visible"); }
