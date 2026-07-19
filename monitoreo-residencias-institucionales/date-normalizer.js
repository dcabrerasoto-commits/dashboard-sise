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
    return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
  }

  function normalizeRecord(record) {
    if (!record || typeof record !== "object") return record;
    const normalized = normalizeDateTime(
      record.reportDate || record.createdAt || record.fechaHoraReporte,
      record.reportDay || record.fechaReporte,
      record.reportTime || record.horaReporte
    );
    if (normalized) {
      record.reportDate = normalized;
      if (!record.createdAt) record.createdAt = normalized;
    }
    return record;
  }

  window.addEventListener("residencias:shared-data", event => {
    const rows = event.detail && event.detail.records;
    if (Array.isArray(rows)) rows.forEach(normalizeRecord);
  });
})();
