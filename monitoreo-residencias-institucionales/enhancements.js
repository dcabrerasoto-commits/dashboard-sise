(() => {
  "use strict";

  function injectStyles() {
    if (document.getElementById("seguimiento-no-map-styles")) return;
    const style = document.createElement("style");
    style.id = "seguimiento-no-map-styles";
    style.textContent = `
      :root{
        --accent:#61b8e6!important;
        --accent-dark:#287fae!important;
        --accent-soft:#e8f6fd!important;
      }

      .logo-box,.app-shell,.toolbar,.tab,.mode-pill,.btn,.filters,.kpi,.card,.table-card,
      .form-card,.form-head,fieldset,.check-option,.empty-state,.status-badge,.definition,
      .filters select,.filters input,.form-grid input,.form-grid select,.block-label input,
      .block-label textarea,.pilot-notice,.region-block,.region-block span,.map-legend i{
        border-radius:0!important;
      }

      .site-header,.site-footer{border-color:var(--accent)!important}
      .eyebrow{color:#bde6fa!important}
      .section-heading{border-left-color:var(--accent)!important}
      .section-kicker,.card-kicker{color:var(--accent-dark)!important}
      .tab-entry{border-color:var(--accent)!important;color:var(--accent-dark)!important}
      .tab-entry.active{background:var(--accent)!important;border-color:var(--accent)!important;color:#08384f!important}
      .mode-pill{background:var(--accent-soft)!important;border-color:#9bcfe9!important;color:var(--accent-dark)!important}
      .kpi.alert{border-top-color:var(--accent)!important;background:linear-gradient(135deg,#fff 0 76%,var(--accent-soft) 76%)!important}
      .kpi.alert .kpi-value{color:var(--accent-dark)!important}
      .table-card,.definition{border-top-color:var(--accent)!important}

      #resumen .kpi-grid{
        grid-template-columns:repeat(6,minmax(0,1fr))!important;
        gap:8px!important;
        margin-bottom:16px!important;
      }
      #resumen .kpi{
        min-height:104px!important;
        padding:11px 12px!important;
        border-top-width:5px!important;
        box-shadow:4px 4px 0 rgba(21,79,85,.07)!important;
      }
      #resumen .kpi::after{width:8px!important;height:8px!important;right:10px!important;top:11px!important}
      #resumen .kpi-label{font-size:11px!important;line-height:1.18!important;max-width:88%!important;letter-spacing:.015em!important}
      #resumen .kpi-value{font-size:32px!important;margin-top:5px!important}
      #resumen .kpi-sub{font-size:10px!important;margin-top:5px!important;padding-top:5px!important}
      #resumen .kpi:hover{transform:translate(-3px,-3px)!important;box-shadow:7px 8px 0 rgba(21,79,85,.12),0 14px 28px rgba(17,54,59,.14)!important}

      .toolbar-actions .definition-action{
        display:inline-flex!important;
        align-items:center!important;
        background:#fff!important;
        border:1px solid var(--border-strong,#839c98)!important;
        color:var(--primary,#154f55)!important;
        padding:10px 14px!important;
        font-weight:750!important;
      }
      .toolbar-actions .definition-action:hover{
        background:#edf6fa!important;
        border-color:var(--accent-dark)!important;
        transform:translate(-3px,-3px)!important;
        box-shadow:5px 5px 0 rgba(21,79,85,.14)!important;
      }
      .toolbar-actions .definition-action.active{
        background:var(--primary,#154f55)!important;
        border-color:var(--primary,#154f55)!important;
        color:#fff!important;
      }

      #chileRegionMap,.map-source{display:none!important}
      .map-comparison{display:block!important}
      #regionMap{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:8px!important;
        width:100%!important;
        max-width:none!important;
        height:auto!important;
        max-height:none!important;
        margin:0!important;
        padding:0!important;
        overflow:visible!important;
        background:transparent!important;
        border:0!important;
        box-shadow:none!important;
      }
      #regionMap .region-block{min-height:43px}

      @media(max-width:1180px){
        #resumen .kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      }
      @media(max-width:720px){
        #resumen .kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        #resumen .kpi{min-height:98px!important}
        #regionMap{grid-template-columns:1fr!important}
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

  function removeCartography() {
    document.getElementById("chileRegionMap")?.remove();
    document.querySelectorAll(".map-source").forEach(element => element.remove());

    const regionList = document.getElementById("regionMap");
    const wrapper = regionList?.closest(".map-comparison");
    if (regionList && wrapper && wrapper.parentNode) {
      wrapper.parentNode.insertBefore(regionList, wrapper);
      wrapper.remove();
    }

    const card = regionList?.closest(".map-card");
    const title = card?.querySelector("h3");
    const note = card?.querySelector(".small-note");
    if (title) title.textContent = "Distribución regional de afectación";
    if (note) note.textContent = "Detalle por región";
    if (regionList) regionList.setAttribute("aria-label", "Detalle regional de afectación");
  }

  function init() {
    injectStyles();
    ensureDefinitionsRight();
    removeCartography();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();