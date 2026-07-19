(() => {
  "use strict";

  const NativeDateTimeFormat = Intl.DateTimeFormat;
  const CHILE_TIME_ZONE = "America/Santiago";

  function ChileDateTimeFormat(locales, options) {
    const settings = {...(options || {})};
    if (!settings.timeZone) settings.timeZone = CHILE_TIME_ZONE;
    return new NativeDateTimeFormat(locales, settings);
  }

  ChileDateTimeFormat.prototype = NativeDateTimeFormat.prototype;
  Object.setPrototypeOf(ChileDateTimeFormat, NativeDateTimeFormat);
  Intl.DateTimeFormat = ChileDateTimeFormat;

  window.MONITOREO_TIME_ZONE = CHILE_TIME_ZONE;
})();
