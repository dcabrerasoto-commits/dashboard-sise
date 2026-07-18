(() => {
  "use strict";

  function applyClearLabels() {
    const section = document.querySelector(".unique-metrics-section");
    if (section) {
      const kicker = section.querySelector(".card-kicker");
      const title = section.querySelector("h3");
      const note = section.querySelector(".small-note");
      if (kicker) kicker.textContent = "RESUMEN DE REGISTROS";
      if (title) title.textContent = "Residencias registradas y reportes del día";
      if (note) note.textContent = "Una residencia puede enviar más de un reporte";

      const labels = section.querySelectorAll(".kpi-label");
      const subtitles = section.querySelectorAll(".kpi-sub");
      const names = [
        "Residencias registradas",
        "Residencias nuevas hoy",
        "Residencias que reportaron hoy",
        "Residencias actualizadas hoy"
      ];
      const explanations = [
        "Total de residencias distintas en la plataforma",
        "Aparecen por primera vez hoy",
        "Enviaron al menos un reporte hoy",
        "Ya estaban registradas y reportaron nuevamente"
      ];
      labels.forEach((label, index) => { if (names[index]) label.textContent = names[index]; });
      subtitles.forEach((subtitle, index) => { if (explanations[index]) subtitle.textContent = explanations[index]; });
    }

    const detailNote = document.getElementById("detailUniqueCount");
    if (detailNote) {
      const numbers = detailNote.querySelectorAll("strong");
      const visible = numbers[0]?.textContent || "0";
      const total = numbers[1]?.textContent || visible;
      detailNote.innerHTML = `<strong>${visible}</strong> residencias aparecen en la tabla. Cada residencia se muestra una sola vez, con su reporte más reciente. <span>Total nacional: <strong>${total}</strong> residencias registradas.</span>`;
    }

    const definition = document.getElementById("historyUniqueDefinition");
    if (definition) definition.textContent = "Residencias nuevas: aparecen por primera vez ese día. Residencias actualizadas: ya estaban registradas y enviaron un nuevo reporte. El total a la fecha cuenta cada residencia una sola vez.";

    const headers = document.querySelectorAll("#historico .history-table thead th");
    const headerNames = [
      "Fecha",
      "Reportes recibidos",
      "Residencias que reportaron",
      "De ellas, nuevas",
      "De ellas, actualizadas",
      "Total de residencias registradas a esa fecha",
      "Con afectación",
      "Sin afectación",
      "En evaluación"
    ];
    headers.forEach((header, index) => { if (headerNames[index]) header.textContent = headerNames[index]; });
  }

  function schedule() {
    setTimeout(applyClearLabels, 20);
  }

  function init() {
    schedule();
    window.addEventListener("residencias:shared-data", schedule);
    ["filterService","filterRegion","filterStatus","detailService","detailRegion","detailSituation","historyService","historyRegion","historyFrom","historyTo"].forEach(id => {
      document.getElementById(id)?.addEventListener("change", schedule);
    });
    document.getElementById("detailSearch")?.addEventListener("input", schedule);
    document.getElementById("clearFilters")?.addEventListener("click", schedule);
    document.getElementById("clearHistoryFilters")?.addEventListener("click", schedule);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
