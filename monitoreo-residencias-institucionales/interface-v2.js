(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);

  function injectStyles() {
    if ($("#interface-v2-styles")) return;
    const style = document.createElement("style");
    style.id = "interface-v2-styles";
    style.textContent = `
      :root{
        --accent:#61b8e6!important;
        --accent-dark:#287fae!important;
        --accent-soft:#e8f6fd!important;
        --beige:#f5f0e7;
        --beige-strong:#d9cdbb;
      }

      #resumen .kpi-grid{
        grid-template-columns:repeat(6,minmax(0,1fr))!important;
        gap:8px!important;
      }
      #resumen .kpi{
        min-height:94px!important;
        padding:9px 10px!important;
        border-top-width:5px!important;
      }
      #resumen .kpi::after{
        width:7px!important;
        height:7px!important;
        right:9px!important;
        top:9px!important;
      }
      #resumen .kpi-label{
        font-size:10.5px!important;
        line-height:1.15!important;
        letter-spacing:.01em!important;
      }
      #resumen .kpi-value{
        font-size:29px!important;
        margin-top:3px!important;
      }
      #resumen .kpi-sub{
        font-size:9.5px!important;
        margin-top:4px!important;
        padding-top:4px!important;
      }

      .toolbar-actions .definition-action{
        display:inline-flex!important;
        align-items:center!important;
        background:#fff!important;
        border:1px solid var(--border-strong,#839c98)!important;
        color:var(--primary,#154f55)!important;
        padding:10px 14px!important;
        font-weight:750!important;
        border-radius:0!important;
      }
      .toolbar-actions .definition-action:hover{
        background:#edf7fc!important;
        border-color:var(--accent-dark)!important;
        transform:translate(-3px,-3px)!important;
        box-shadow:5px 5px 0 rgba(21,79,85,.14)!important;
      }
      .toolbar-actions .definition-action.active{
        background:var(--primary,#154f55)!important;
        border-color:var(--primary,#154f55)!important;
        color:#fff!important;
      }

      .map-comparison.without-cartography{
        grid-template-columns:1fr!important;
      }
      .map-comparison.without-cartography #regionMap{
        height:auto!important;
        max-height:none!important;
        grid-template-columns:repeat(4,minmax(0,1fr))!important;
      }
      .map-comparison.without-cartography #chileRegionMap{
        display:none!important;
      }
      .map-source.hidden-source{
        display:none!important;
      }

      #ingreso .form-card{
        border-top:8px solid var(--accent)!important;
        background:linear-gradient(180deg,#ffffff 0,#ffffff 170px,#f7faf9 170px)!important;
      }
      #ingreso .form-head{
        position:relative;
        overflow:hidden;
        background:linear-gradient(110deg,#0b363b 0%,#154f55 62%,#287fae 100%)!important;
        border-left:0!important;
        padding:24px 26px!important;
      }
      #ingreso .form-head::after{
        content:"";
        position:absolute;
        right:-46px;
        top:-64px;
        width:220px;
        height:220px;
        border:28px solid rgba(255,255,255,.09);
        transform:rotate(18deg);
      }
      #ingreso .form-head h2,
      #ingreso .form-head p,
      #ingreso .form-head .section-kicker{
        position:relative;
        z-index:1;
      }
      #ingreso .form-head .section-kicker{
        color:#bde6fa!important;
      }
      #ingreso .form-body{
        padding:22px!important;
      }
      .form-progress{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:1px;
        margin:0 0 16px;
        border:1px solid #b9ccd2;
        background:#b9ccd2;
      }
      .form-step{
        display:flex;
        align-items:center;
        gap:10px;
        min-height:58px;
        padding:10px 13px;
        background:#fff;
        color:#35555d;
        font-size:12px;
        font-weight:750;
      }
      .form-step:nth-child(2){background:var(--beige)}
      .form-step:nth-child(3){background:var(--accent-soft)}
      .form-step-number{
        display:grid;
        place-items:center;
        flex:0 0 30px;
        height:30px;
        background:var(--primary,#154f55);
        color:#fff;
        font-size:14px;
        font-weight:850;
      }
      .form-step:nth-child(2) .form-step-number{
        background:#8a7964;
      }
      .form-step:nth-child(3) .form-step-number{
        background:var(--accent-dark);
      }
      #ingreso .pilot-notice{
        background:#eef8fd!important;
        border-left-color:var(--accent)!important;
        color:#235e7d!important;
      }
      #ingreso fieldset{
        position:relative;
        padding:20px 18px 18px!important;
        border:1px solid #bfd0d1!important;
        border-left:7px solid var(--accent)!important;
        background:#f7fbfd!important;
        box-shadow:5px 5px 0 rgba(21,79,85,.055)!important;
      }
      #ingreso fieldset:nth-of-type(2){
        border-left-color:#8a7964!important;
        background:var(--beige)!important;
      }
      #ingreso fieldset:nth-of-type(3){
        border-left-color:var(--primary,#154f55)!important;
        background:#f3f8f7!important;
      }
      #ingreso legend{
        padding:6px 10px!important;
        border:1px solid #b8cbd0;
        background:#fff;
        color:var(--primary-dark,#0b363b)!important;
        font-size:14px;
        letter-spacing:.02em;
      }
      #ingreso input,
      #ingreso select,
      #ingreso textarea{
        background:#fff!important;
        border-color:#a9bfc3!important;
      }
      #ingreso input:focus,
      #ingreso select:focus,
      #ingreso textarea:focus{
        border-color:var(--accent-dark)!important;
        box-shadow:4px 4px 0 rgba(97,184,230,.20)!important;
      }
      #ingreso .check-option{
        background:#fff!important;
        border-color:#b8c9cb!important;
      }
      #ingreso .check-option:has(input:checked){
        background:var(--accent-soft)!important;
        border-color:var(--accent-dark)!important;
        box-shadow:inset 5px 0 0 var(--accent-dark)!important;
      }
      #ingreso .form-actions{
        margin:18px -22px -22px;
        padding:17px 22px;
        border-top:1px solid #bfd0d1;
        background:linear-gradient(90deg,var(--beige),#eef8fd);
      }
      #ingreso .form-actions .btn-primary{
        background:var(--accent-dark)!important;
        border-color:var(--accent-dark)!important;
      }
      #ingreso .form-actions .btn-primary:hover{
        background:#1f6f98!important;
      }

      @media(max-width:1180px){
        #resumen .kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
        .map-comparison.without-cartography #regionMap{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      }
      @media(max-width:720px){
        #resumen .kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .form-progress{grid-template-columns:1fr}
        .form-step{min-height:48px}
        .map-comparison.without-cartography #regionMap{grid-template-columns:1fr!important}
      }
      @media(max-width:450px){
        #resumen .kpi-grid{grid-template-columns:1fr!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDefinitionsRight() {
    const button = document.querySelector('[data-tab="metodologia"]');
    const actions = document.querySelector(".toolbar-actions");
    const exportButton = document.getElementById("exportButton");
    if (!button || !actions || !exportButton) return;
    button.classList.add("definition-action", "btn", "btn-light", "tab");
    if (button.parentElement !== actions) actions.insertBefore(button, exportButton);
  }

  function addFormProgress() {
    const form = document.getElementById("reportForm");
    const notice = document.getElementById("pilotNotice");
    if (!form || !notice || form.querySelector(".form-progress")) return;
    const progress = document.createElement("div");
    progress.className = "form-progress";
    progress.setAttribute("aria-label", "Etapas del reporte");
    progress.innerHTML = `
      <div class="form-step"><span class="form-step-number">1</span><span>Identifique el establecimiento</span></div>
      <div class="form-step"><span class="form-step-number">2</span><span>Informe su estado y afectación</span></div>
      <div class="form-step"><span class="form-step-number">3</span><span>Registre necesidades y respuesta</span></div>
    `;
    form.insertBefore(progress, notice);
  }

  function territorialCardParts() {
    const original = document.getElementById("regionMap");
    const card = original ? original.closest(".card") : null;
    return {
      original,
      card,
      title: card ? card.querySelector("h3") : null,
      note: card ? card.querySelector(".small-note") : null,
      source: card ? card.querySelector(".map-source") : null,
      wrapper: card ? card.querySelector(".map-comparison") : null,
      visible: document.getElementById("chileRegionMap")
    };
  }

  function setNeutralTerritorialView() {
    const parts = territorialCardParts();
    if (parts.title) parts.title.textContent = "Distribución regional de afectación";
    if (parts.note) parts.note.textContent = "Detalle por región";
    if (parts.wrapper) parts.wrapper.classList.add("without-cartography");
    if (parts.visible) parts.visible.style.display = "none";
    if (parts.source) parts.source.classList.add("hidden-source");
    if (parts.original) parts.original.setAttribute("aria-label", "Detalle regional de afectación");
  }

  function setCartographyAvailable() {
    const parts = territorialCardParts();
    if (parts.title) parts.title.textContent = "Mapa de Chile y distribución regional";
    if (parts.note) parts.note.textContent = "Cartografía y detalle por región";
    if (parts.wrapper) parts.wrapper.classList.remove("without-cartography");
    if (parts.visible) parts.visible.style.display = "block";
    if (parts.source) parts.source.classList.remove("hidden-source");
  }

  function reviewCartography() {
    const parts = territorialCardParts();
    if (!parts.original) return;
    if (!parts.visible) {
      setNeutralTerritorialView();
      return;
    }
    const text = parts.visible.textContent || "";
    const failed = text.includes("No fue posible cargar") || text.includes("no fue posible cargar");
    const loaded = Boolean(parts.visible.querySelector(".leaflet-pane, svg.leaflet-zoom-animated"));
    if (failed) setNeutralTerritorialView();
    else if (loaded) setCartographyAvailable();
  }

  function observeCartography() {
    const root = document.querySelector(".map-card") || document.body;
    const observer = new MutationObserver(() => reviewCartography());
    observer.observe(root, { childList:true, subtree:true, characterData:true });
    setTimeout(reviewCartography, 100);
    setTimeout(reviewCartography, 1500);
    setTimeout(reviewCartography, 6000);
  }

  function init() {
    injectStyles();
    ensureDefinitionsRight();
    addFormProgress();
    observeCartography();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();
