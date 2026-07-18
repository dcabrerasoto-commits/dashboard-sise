(() => {
  "use strict";

  const definitions = [
    "Total de residencias distintas que existen en la plataforma.",
    "Residencias que hoy aparecen por primera vez en la plataforma.",
    "Residencias distintas que enviaron al menos un reporte durante el día.",
    "Residencias que ya estaban registradas y enviaron un nuevo reporte hoy."
  ];

  function applyClearLabels() {
    const section = document.querySelector(".unique-metrics-section");
    if (section) {
      const kicker = section.querySelector(".card-kicker");
      const title = section.querySelector("h3");
      const note = section.querySelector(".small-note");
      if (kicker) kicker.textContent = "RESUMEN DE REGISTROS";
      if (title) title.textContent = "Residencias registradas y reportes del día";
      if (note) note.textContent = "Una residencia puede enviar más de un reporte";

      const cards = section.querySelectorAll(".unique-kpi");
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
      cards.forEach((card, index) => {
        if (!definitions[index]) return;
        card.title = definitions[index];
        card.setAttribute("aria-label", `${names[index]}. ${definitions[index]}`);
        card.setAttribute("tabindex", "0");
        card.dataset.definition = definitions[index];
      });
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

  function injectTooltipStyles() {
    if (document.getElementById("indicator-definition-styles")) return;
    const style = document.createElement("style");
    style.id = "indicator-definition-styles";
    style.textContent = `
      .unique-kpi{position:relative;cursor:help}
      .unique-kpi::before{content:"i";position:absolute;top:8px;right:8px;width:18px;height:18px;display:grid;place-items:center;border:1px solid #287fae;background:#eef8fc;color:#176777;font-size:11px;font-weight:850;border-radius:50%}
      .unique-kpi::after{content:attr(data-definition);position:absolute;left:10px;right:10px;bottom:calc(100% + 8px);z-index:50;padding:10px 12px;background:#0b363b;color:#fff;font-size:12px;line-height:1.4;text-align:left;box-shadow:0 8px 20px rgba(0,0,0,.18);opacity:0;visibility:hidden;transform:translateY(5px);transition:.15s ease;pointer-events:none}
      .unique-kpi:hover::after,.unique-kpi:focus::after{opacity:1;visibility:visible;transform:translateY(0)}
      @media(max-width:700px){.unique-kpi::after{left:4px;right:4px;font-size:11px}}
    `;
    document.head.appendChild(style);
  }

  function schedule() {
    setTimeout(applyClearLabels, 20);
  }

  function init() {
    injectTooltipStyles();
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
