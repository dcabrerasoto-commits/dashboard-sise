(() => {
  "use strict";

  function injectStyles() {
    if (document.getElementById("seguimiento-ui-styles")) return;
    const style = document.createElement("style");
    style.id = "seguimiento-ui-styles";
    style.textContent = `
      :root{--accent:#61b8e6!important;--accent-dark:#287fae!important;--accent-soft:#e8f6fd!important;--beige:#f5f0e7}
      #resumen .kpi-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:8px!important}
      #resumen .kpi{min-height:94px!important;padding:9px 10px!important;border-top-width:5px!important}
      #resumen .kpi::after{width:7px!important;height:7px!important;right:9px!important;top:9px!important}
      #resumen .kpi-label{font-size:10.5px!important;line-height:1.15!important;letter-spacing:.01em!important}
      #resumen .kpi-value{font-size:29px!important;margin-top:3px!important;text-align:center!important;width:100%!important}
      #resumen .kpi-sub{font-size:9.5px!important;margin-top:4px!important;padding-top:4px!important}
      .toolbar-actions .definition-action{display:inline-flex!important;align-items:center!important;background:#fff!important;border:1px solid var(--border-strong,#839c98)!important;color:var(--primary,#154f55)!important;padding:10px 14px!important;font-weight:750!important;border-radius:0!important}
      .toolbar-actions .definition-action:hover{background:#edf7fc!important;border-color:var(--accent-dark)!important;transform:translate(-3px,-3px)!important;box-shadow:5px 5px 0 rgba(21,79,85,.14)!important}
      .toolbar-actions .definition-action.active{background:var(--primary,#154f55)!important;border-color:var(--primary,#154f55)!important;color:#fff!important}
      #regionMap{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;width:100%!important;max-width:none!important;height:auto!important;max-height:none!important;margin:0!important;padding:0!important;overflow:visible!important;background:transparent!important;border:0!important;box-shadow:none!important}
      #regionMap .region-block{min-height:43px}
      #ingreso .form-card{border-top:8px solid var(--accent)!important;background:linear-gradient(180deg,#fff 0,#fff 170px,#f7faf9 170px)!important}
      #ingreso .form-head{position:relative;overflow:hidden;background:linear-gradient(110deg,#0b363b 0%,#154f55 62%,#287fae 100%)!important;border-left:0!important;padding:24px 26px!important}
      #ingreso .form-head::after{content:"";position:absolute;right:-46px;top:-64px;width:220px;height:220px;border:28px solid rgba(255,255,255,.09);transform:rotate(18deg)}
      #ingreso .form-head h2,#ingreso .form-head p,#ingreso .form-head .section-kicker{position:relative;z-index:1}
      #ingreso .form-head .section-kicker{color:#bde6fa!important}
      #ingreso .form-body{padding:22px!important}
      .form-progress{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin:0 0 16px;border:1px solid #b9ccd2;background:#b9ccd2}
      .form-step{display:flex;align-items:center;gap:10px;min-height:58px;padding:10px 13px;background:#fff;color:#35555d;font-size:12px;font-weight:750}
      .form-step:nth-child(2){background:var(--beige)}
      .form-step:nth-child(3){background:var(--accent-soft)}
      .form-step-number{display:grid;place-items:center;flex:0 0 30px;height:30px;background:var(--primary,#154f55);color:#fff;font-size:14px;font-weight:850}
      .form-step:nth-child(2) .form-step-number{background:#8a7964}
      .form-step:nth-child(3) .form-step-number{background:var(--accent-dark)}
      #ingreso .pilot-notice{background:#eef8fd!important;border-left-color:var(--accent)!important;color:#235e7d!important}
      .previous-report-message{margin:0 0 15px;padding:13px 15px;border-left:6px solid #8a7964;background:#f5f0e7;color:#574a3c;font-size:13px;line-height:1.45}
      .change-question{display:grid;grid-template-columns:minmax(260px,420px) 1fr;gap:16px;align-items:end;margin-top:17px;padding:15px;border:1px solid #9bcfe9;background:#eef8fd}
      .change-question label{display:grid;gap:6px;color:#274f63;font-size:13px;font-weight:800}
      .change-question p{margin:0;color:#4f6974;font-size:12px;line-height:1.45}
      #reportDateDisplay{background:#edf2f1!important;color:#506266!important;font-weight:700;cursor:not-allowed}
      #ingreso fieldset{padding:20px 18px 18px!important;border:1px solid #bfd0d1!important;border-left:7px solid var(--accent)!important;background:#f7fbfd!important;box-shadow:5px 5px 0 rgba(21,79,85,.055)!important}
      #ingreso fieldset:nth-of-type(2){border-left-color:#8a7964!important;background:var(--beige)!important}
      #ingreso fieldset:nth-of-type(3){border-left-color:var(--primary,#154f55)!important;background:#f3f8f7!important}
      #ingreso legend{padding:6px 10px!important;border:1px solid #b8cbd0;background:#fff;color:var(--primary-dark,#0b363b)!important;font-size:14px}
      #ingreso input,#ingreso select,#ingreso textarea{background:#fff!important;border-color:#a9bfc3!important}
      #ingreso input:focus,#ingreso select:focus,#ingreso textarea:focus{border-color:var(--accent-dark)!important;box-shadow:4px 4px 0 rgba(97,184,230,.20)!important}
      #ingreso .check-option{background:#fff!important;border-color:#b8c9cb!important}
      #ingreso .check-option:has(input:checked){background:var(--accent-soft)!important;border-color:var(--accent-dark)!important;box-shadow:inset 5px 0 0 var(--accent-dark)!important}
      #ingreso .form-actions{margin:18px -22px -22px;padding:17px 22px;border-top:1px solid #bfd0d1;background:linear-gradient(90deg,var(--beige),#eef8fd)}
      #ingreso .form-actions .btn-primary{background:var(--accent-dark)!important;border-color:var(--accent-dark)!important}
      #historico .history-table{min-width:1180px}
      #historico .table-card{border-top-color:var(--accent)!important}
      #historico tbody tr:hover{background:#eef8fd}
      @media(max-width:1180px){#resumen .kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
      @media(max-width:720px){#resumen .kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.form-progress{grid-template-columns:1fr}.change-question{grid-template-columns:1fr}#regionMap{grid-template-columns:1fr!important}}
      @media(max-width:450px){#resumen .kpi-grid{grid-template-columns:1fr!important}}
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
    const notice = form?.querySelector(".pilot-notice");
    if (!form || !notice || form.querySelector(".form-progress")) return;
    const progress = document.createElement("div");
    progress.className = "form-progress";
    progress.setAttribute("aria-label", "Etapas del reporte");
    progress.innerHTML = '<div class="form-step"><span class="form-step-number">1</span><span>Identificación y contacto</span></div><div class="form-step"><span class="form-step-number">2</span><span>Estado y afectación</span></div><div class="form-step"><span class="form-step-number">3</span><span>Necesidades y respuesta</span></div>';
    form.insertBefore(progress, notice);
  }

  function loadAuxiliaryScript(src, marker) {
    if (document.querySelector(`script[data-${marker}]`)) return null;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset[marker] = "true";
    document.head.appendChild(script);
    return script;
  }

  function loadDetailPopups() {
    const popupScript = loadAuxiliaryScript("detail-popups.js?v=20260717-13", "detailPopups");
    const loadRules = () => loadAuxiliaryScript("situation-rules.js?v=20260717-13", "situationRules");
    if (popupScript) popupScript.addEventListener("load", loadRules, {once:true});
    else loadRules();
  }

  function init() {
    injectStyles();
    ensureDefinitionsRight();
    addFormProgress();
    loadDetailPopups();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
