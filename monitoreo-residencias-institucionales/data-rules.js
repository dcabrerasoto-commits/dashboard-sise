(() => {
  "use strict";

  const STORAGE_KEY = "mdsf-monitoreo-residencias-v2";
  const RESET_MARKER = "mdsf-monitoreo-residencias-reset-20260717-01";

  try {
    if (!localStorage.getItem(RESET_MARKER)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(RESET_MARKER, "1");
    }
  } catch (_) {}

  function containsTestWord(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .includes("PRUEBA");
  }

  function validateBeforeSave(event) {
    const form = event.target;
    if (!form || form.id !== "reportForm") return;

    const establishment = document.getElementById("establishment")?.value || "";
    const responsible = document.getElementById("responsible")?.value || "";

    if (!containsTestWord(establishment) && !containsTestWord(responsible)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const message = document.getElementById("formMessage");
    if (message) {
      message.textContent = "No es posible guardar registros que contengan la palabra “prueba” en el nombre de la residencia o en el responsable.";
      message.className = "form-message error";
    }
  }

  document.addEventListener("submit", validateBeforeSave, true);
})();
