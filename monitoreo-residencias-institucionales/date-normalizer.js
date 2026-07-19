(() => {
  "use strict";

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function normalizeDateTime(value, fallbackDate, fallbackTime) {
    const text = String(value ?? "").trim();
    if (!text && fallbackDate) return normalizeDateTime(`${fallbackDate} ${fallbackTime || "00:00:00"}`);
    if (!text) return "";

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return text;

    let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (match) {
      const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
      return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
    }

    match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ ,T]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*([ap])\.?\s*m\.?)?)?$/i);
    if (match) {
      let [, day, month, year, hour = "00", minute = "00", second = "00", meridiem = ""] = match;
      let hours = Number(hour);
      if (/p/i.test(meridiem) && hours < 12) hours += 12;
      if (/a/i.test(meridiem) && hours === 12) hours = 0;
      return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minute)}:${pad(second)}`;
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  }

  function normalizeRecord(record) {
    if (!record || typeof record !== "object") return record;

    const explicitDay = String(record.reportDay || record.fechaReporte || "").trim();
    const explicitTime = String(record.reportTime || record.horaReporte || "").trim();
    const explicitDateTime = explicitDay ? normalizeDateTime(`${explicitDay} ${explicitTime || "00:00:00"}`) : "";
    const sourceDateTime = normalizeDateTime(record.reportDate || record.createdAt || record.fechaHoraReporte);
    const normalized = explicitDateTime || sourceDateTime;

    if (normalized) {
      record.reportDate = normalized;
      record.createdAt = normalized;
    }
    return record;
  }

  function normalizeEvent(event) {
    if (event?.type !== "residencias:shared-data") return;
    const rows = event.detail?.records;
    if (Array.isArray(rows)) rows.forEach(normalizeRecord);
  }

  const originalDispatchEvent = window.dispatchEvent.bind(window);
  window.dispatchEvent = event => {
    normalizeEvent(event);
    return originalDispatchEvent(event);
  };

  window.addEventListener("residencias:shared-data", normalizeEvent);
})();
