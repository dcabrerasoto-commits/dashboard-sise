(() => {
  "use strict";

  const GEO_URL = "https://arcgiswebad.bcn.cl/arcgis/rest/services/Hosted/Capa_Factores/FeatureServer/0/query?where=1%3D1&outFields=nom_reg%2Ccodregion&returnGeometry=true&outSR=4326&maxAllowableOffset=0.015&geometryPrecision=5&f=geojson";
  const C = window.MONITOREO_CATALOGOS || { regiones: [] };
  let map = null;
  let geoLayer = null;
  let regionValues = new Map();

  const normalize = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toUpperCase()
    .trim();

  function canonicalRegion(value) {
    const s = normalize(value);
    if (s.includes("ARICA")) return "Arica y Parinacota";
    if (s.includes("TARAPACA")) return "Tarapacá";
    if (s.includes("ANTOFAGASTA")) return "Antofagasta";
    if (s.includes("ATACAMA")) return "Atacama";
    if (s.includes("COQUIMBO")) return "Coquimbo";
    if (s.includes("VALPARAISO")) return "Valparaíso";
    if (s.includes("METROPOLITANA")) return "Metropolitana";
    if (s.includes("OHIGGINS") || s.includes("LIBERTADOR")) return "O’Higgins";
    if (s.includes("MAULE")) return "Maule";
    if (s.includes("NUBLE")) return "Ñuble";
    if (s.includes("BIOBIO")) return "Biobío";
    if (s.includes("ARAUCANIA")) return "La Araucanía";
    if (s.includes("LOS RIOS")) return "Los Ríos";
    if (s.includes("LOS LAGOS")) return "Los Lagos";
    if (s.includes("AYSEN") || s.includes("AISEN")) return "Aysén";
    if (s.includes("MAGALLANES")) return "Magallanes";
    return String(value || "");
  }

  function injectStyles() {
    const style = document.createElement("style");
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

      .map-comparison{
        display:grid;
        grid-template-columns:minmax(260px,.9fr) minmax(310px,1.1fr);
        gap:14px;
        align-items:stretch;
      }
      #chileRegionMap{
        width:100%;
        height:520px;
        background:#eee9df;
        border:1px solid #b8c9cd;
        box-shadow:5px 5px 0 rgba(21,79,85,.08);
      }
      #regionMap{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:7px!important;
        max-width:none!important;
        width:100%!important;
        height:520px;
        max-height:520px;
        margin:0!important;
        padding:10px;
        align-content:start;
        overflow:auto;
        background:#f6f2e9;
        border:1px solid #c7d3d4;
        box-shadow:5px 5px 0 rgba(21,79,85,.06);
      }
      #regionMap .region-block{min-height:43px}
      #chileRegionMap .leaflet-control-zoom a{
        border-radius:0!important;
        color:#174c68!important;
      }
      #chileRegionMap .leaflet-tooltip{
        border-radius:0!important;
        border:1px solid #8abbd3!important;
        box-shadow:4px 4px 0 rgba(21,79,85,.12)!important;
        color:#173136!important;
      }
      .map-source{margin-top:10px;color:#607276;font-size:11px;text-align:right}
      .map-loading{height:100%;display:grid;place-items:center;color:#50696e;font-weight:700;padding:20px;text-align:center}

      @media(max-width:1180px){
        #resumen .kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      }
      @media(max-width:900px){
        .map-comparison{grid-template-columns:1fr}
        #chileRegionMap,#regionMap{height:470px;max-height:470px}
      }
      @media(max-width:720px){
        #resumen .kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        #resumen .kpi{min-height:98px!important}
        #regionMap{grid-template-columns:1fr!important;height:auto;max-height:480px}
        #chileRegionMap{height:480px}
      }
      @media(max-width:450px){
        #resumen .kpi-grid{grid-template-columns:1fr!important}
      }
    `;
    document.head.appendChild(style);
  }

  function moveDefinitions() {
    const button = document.querySelector('[data-tab="metodologia"]');
    const actions = document.querySelector(".toolbar-actions");
    const exportButton = document.getElementById("exportButton");
    if (!button || !actions || !exportButton) return;
    button.classList.add("definition-action", "btn", "btn-light");
    if (button.parentElement !== actions) actions.insertBefore(button, exportButton);
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    return new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.dataset.leaflet = "1";
        document.head.appendChild(link);
      }
      const existing = document.querySelector('script[data-leaflet]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.L), { once:true });
        existing.addEventListener("error", reject, { once:true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.dataset.leaflet = "1";
      script.onload = () => resolve(window.L);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function parseNumber(value) {
    const cleaned = String(value || "0").replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, "");
    return Number(cleaned) || 0;
  }

  function readRegionValues() {
    const values = new Map((C.regiones || []).map(region => [region, { total:0, affected:0 }]));
    document.querySelectorAll("#regionTableBody tr").forEach(row => {
      const cells = row.cells;
      if (!cells || cells.length < 4) return;
      const region = canonicalRegion(cells[0].textContent);
      if (!values.has(region)) return;
      values.set(region, {
        total: parseNumber(cells[1].textContent),
        affected: parseNumber(cells[3].textContent)
      });
    });
    regionValues = values;
  }

  function level(value) {
    if (value >= 6) return 3;
    if (value >= 3) return 2;
    if (value >= 1) return 1;
    return 0;
  }

  function fillColor(value) {
    return ["#e9e2d6", "#d9eef8", "#8fcbe8", "#2f84b3"][level(value)];
  }

  function featureRegion(feature) {
    const p = feature && feature.properties ? feature.properties : {};
    return canonicalRegion(p.nom_reg || p.NOM_REG || p.region || p.Region || "");
  }

  function featureStyle(feature) {
    const region = featureRegion(feature);
    const info = regionValues.get(region) || { total:0, affected:0 };
    return {
      fillColor: fillColor(info.affected),
      fillOpacity: 0.9,
      color: info.affected ? "#ffffff" : "#c7beb0",
      opacity: 0.45,
      weight: 0.45
    };
  }

  function updateMapStyles() {
    readRegionValues();
    if (geoLayer) geoLayer.setStyle(featureStyle);
  }

  function selectRegion(region) {
    const filter = document.getElementById("filterRegion");
    if (!filter) return;
    filter.value = region;
    filter.dispatchEvent(new Event("change", { bubbles:true }));
  }

  async function buildMap() {
    const original = document.getElementById("regionMap");
    if (!original || document.getElementById("chileRegionMap")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "map-comparison";
    original.parentNode.insertBefore(wrapper, original);

    const visible = document.createElement("div");
    visible.id = "chileRegionMap";
    visible.innerHTML = '<div class="map-loading">Cargando cartografía regional…</div>';
    wrapper.appendChild(visible);
    wrapper.appendChild(original);

    const source = document.createElement("div");
    source.className = "map-source";
    source.textContent = "Cartografía territorial: Biblioteca del Congreso Nacional de Chile.";
    const legend = wrapper.parentNode.querySelector(".map-legend");
    if (legend) legend.insertAdjacentElement("afterend", source);

    const note = original.closest(".card")?.querySelector(".small-note");
    if (note) note.textContent = "Mapa de Chile y detalle regional";

    try {
      await loadLeaflet();
      visible.innerHTML = "";
      map = window.L.map(visible, {
        zoomControl:true,
        attributionControl:false,
        scrollWheelZoom:false,
        doubleClickZoom:true,
        boxZoom:false,
        minZoom:3,
        maxZoom:8
      });
      map.setView([-37.5, -71.3], 4);

      const response = await fetch(GEO_URL, { cache:"force-cache" });
      if (!response.ok) throw new Error(`Cartografía ${response.status}`);
      const geojson = await response.json();
      readRegionValues();

      geoLayer = window.L.geoJSON(geojson, {
        style: featureStyle,
        onEachFeature(feature, layer) {
          const region = featureRegion(feature);
          const current = () => regionValues.get(region) || { total:0, affected:0 };
          layer.on({
            mouseover(e) {
              e.target.setStyle({ weight:2, color:"#174c68", opacity:1, fillOpacity:1 });
              const info = current();
              e.target.bindTooltip(`<strong>${region}</strong><br>Establecimientos informados: ${info.total}<br>Con afectación: ${info.affected}`, { sticky:true }).openTooltip();
            },
            mouseout(e) {
              if (geoLayer) geoLayer.resetStyle(e.target);
            },
            click() {
              if (region) selectRegion(region);
            }
          });
        }
      }).addTo(map);

      map.fitBounds([[-56.2,-76.5],[-17.3,-66]], { padding:[12,12] });
      setTimeout(() => map.invalidateSize(), 150);
    } catch (error) {
      visible.innerHTML = '<div class="map-loading">No fue posible cargar el mapa territorial. El detalle regional permanece disponible al costado.</div>';
    }
  }

  function observeUpdates() {
    const body = document.getElementById("regionTableBody");
    if (!body) return;
    let timer = 0;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(updateMapStyles, 60);
    });
    observer.observe(body, { childList:true, subtree:true, characterData:true });
  }

  function init() {
    injectStyles();
    moveDefinitions();
    observeUpdates();
    buildMap();
    document.querySelector('[data-tab="resumen"]')?.addEventListener("click", () => {
      setTimeout(() => map && map.invalidateSize(), 120);
    });
  }

  init();
})();