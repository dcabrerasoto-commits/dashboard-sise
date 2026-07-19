(() => {
  "use strict";

  const STORAGE_KEY = "monitoreoResidenciasPendingSaveV1";
  let confirmedRecords = [];
  let pending = readPending();
  let restoringConfirmedView = false;

  const $ = id => document.getElementById(id);

  function readPending() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return value && value.record && value.record.id ? value : null;
    } catch (_) {
      return null;
    }
  }

  function writePending(value) {
    pending = value;
    try {
      if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      // El guardado principal continúa aunque el navegador bloquee almacenamiento local.
    }
  }

  function formSignature() {
    const form = $("reportForm");
    if (!form) return "";
    const values = [];
    form.querySelectorAll("input, select, textarea").forEach(control => {
      if (!control.name && !control.id) return;
      const name = control.name || control.id;
      const value = (control.type === "checkbox" || control.type === "radio")
        ? (control.checked ? control.value : "")
        : control.value;
      values.push(`${name}=${value}`);
    });
    return values.join("¦");
  }

  function setSavingUi(active) {
    const submit = document.querySelector('#reportForm button[type="submit"]');
    if (submit) {
      if (!submit.dataset.defaultText) submit.dataset.defaultText = submit.textContent;
      submit.disabled = active;
      submit.textContent = active ? "Guardando..." : submit.dataset.defaultText;
    }
    const reset = $("resetForm");
    if (reset) reset.disabled = active;
  }

  function showRetryMessage() {
    const message = $("formMessage");
    if (!message || !pending?.record) return;
    message.className = "form-message error";
    message.innerHTML = "No se pudo confirmar el guardado. La información quedó resguardada en este navegador. " +
      '<button type="button" class="btn btn-light" id="retryPendingSave">Reintentar guardado</button>';
    $("retryPendingSave")?.addEventListener("click", retryPendingSave, {once:true});
  }

  function retryPendingSave() {
    if (!pending?.record) return;
    setSavingUi(true);
    const message = $("formMessage");
    if (message) {
      message.textContent = "Reintentando el guardado del mismo reporte, sin crear un registro nuevo...";
      message.className = "form-message";
    }
    window.dispatchEvent(new CustomEvent("residencias:pending-record", {detail:{record:pending.record, retry:true}}));
  }

  function restoreConfirmedView() {
    if (restoringConfirmedView) return;
    restoringConfirmedView = true;
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("residencias:shared-data", {
        detail:{records:confirmedRecords.slice(), source:"confirmed-only"}
      }));
      restoringConfirmedView = false;
    }, 0);
  }

  function init() {
    const form = $("reportForm");
    if (form) {
      form.addEventListener("submit", event => {
        if (!pending?.record) return;
        const unchanged = pending.signature && pending.signature === formSignature();
        if (!unchanged) {
          writePending(null);
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        retryPendingSave();
      }, true);

      form.addEventListener("input", () => {
        if (pending && !document.querySelector('#reportForm button[type="submit"]')?.disabled && pending.signature !== formSignature()) {
          writePending(null);
        }
      });
    }

    window.addEventListener("residencias:shared-data", event => {
      if (event.detail?.source === "confirmed-only") return;
      const shared = Array.isArray(event.detail?.records) ? event.detail.records : [];
      confirmedRecords = shared.slice();
      if (pending?.record && shared.some(record => String(record?.id || "") === String(pending.record.id))) {
        writePending(null);
      } else if (pending?.record) {
        setTimeout(showRetryMessage, 100);
      }
    });

    window.addEventListener("residencias:pending-record", event => {
      const record = event.detail?.record;
      if (!record?.id) return;
      const existingSignature = pending?.record?.id === record.id ? pending.signature : formSignature();
      writePending({record, signature:existingSignature, savedAt:new Date().toISOString()});
      restoreConfirmedView();
    });

    window.addEventListener("residencias:shared-save", event => {
      const detail = event.detail || {};
      if (detail.ok) {
        writePending(null);
        return;
      }
      setTimeout(showRetryMessage, 50);
    });

    if (pending?.record) setTimeout(showRetryMessage, 800);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
