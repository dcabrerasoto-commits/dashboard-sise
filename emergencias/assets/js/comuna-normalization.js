// Normalización de nombres comunales para evitar dobles conteos.
(function normalizarComunasUISE(){
  function claveLocal(valor){
    return String(valor || '')
      .replace(/Ã[’'\u0092]?iqu[eé]n/gi, 'Ñiquén')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function aliasComuna(valor){
    const clave = claveLocal(valor);
    if (clave === 'MARCHIGUE' || clave === 'MARCHIHUE') return 'Marchihue';
    if (clave === 'TREHUACO' || clave === 'TREGUACO') return 'Treguaco';
    if (clave === 'NIQUEN' || clave.includes('IQUEN')) return 'Ñiquén';
    return valor;
  }

  function instalar(){
    if (typeof window.comunaCanon !== 'function') {
      setTimeout(instalar, 50);
      return;
    }
    if (window.comunaCanon.__normalizacionUISE) return;

    const original = window.comunaCanon;
    const normalizada = function(region, comuna){
      return original(region, aliasComuna(comuna));
    };
    normalizada.__normalizacionUISE = true;
    window.comunaCanon = normalizada;

    // Fuerza un nuevo cálculo con los nombres ya homologados.
    if (typeof window.render === 'function') {
      try { window.render(); } catch (error) { console.warn('No fue posible refrescar la normalización comunal.', error); }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', instalar, { once: true });
  } else {
    instalar();
  }
})();
