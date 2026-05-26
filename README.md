# dashboard-sise

## Actualizar base privada

El dashboard público lee `dashboard-data.js`. Ese archivo contiene datos ya procesados y agregados para la web; no debe incluir RUN.

La base editable debe quedar en una Google Sheet privada. Para automatizar la publicación:

1. Crear una cuenta de servicio en Google Cloud y compartirle la Google Sheet privada como lectora.
2. En GitHub > Settings > Secrets and variables > Actions, agregar:
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: JSON completo de la cuenta de servicio.
   - `GOOGLE_SHEET_ID`: ID de la planilla privada.
   - `GOOGLE_SHEET_NAME`: nombre de la hoja, si no se quiere usar la primera hoja.
   - `GOOGLE_SHEET_RANGE`: rango opcional, por ejemplo `A:ZZ`.
3. El workflow `.github/workflows/update-dashboard-data.yml` genera `dashboard-data.js` y lo publica.

Para dispararlo automáticamente desde Google Sheets, usar Apps Script con un activador instalable `onChange`:

```js
function actualizarDashboardSISE() {
  const owner = "dcabrerasoto-commits";
  const repo = "dashboard-sise";
  const token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  UrlFetchApp.fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    },
    payload: JSON.stringify({ event_type: "update-sise-dashboard" })
  });
}
```

Guardar en Propiedades del script:

- `GITHUB_TOKEN`: token de GitHub con permiso para disparar Actions en este repo.

Archivos clave:

- Base privada: Google Sheet que solo tú editas.
- Generador: `scripts/generate-dashboard-data.js`.
- Datos públicos del sitio: `dashboard-data.js`.
- Automatización: `.github/workflows/update-dashboard-data.yml`.
