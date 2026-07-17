# Monitoreo de Residencias Institucionales

Plataforma pública para consolidar información sobre afectación, continuidad operativa y necesidades de residencias o establecimientos dependientes de distintos servicios.

## Enlace público

`https://dcabrerasoto-commits.github.io/dashboard-sise/monitoreo-residencias-institucionales/`

## Componentes

- Resumen nacional con indicadores.
- Mapa regional esquemático.
- Consolidado por región.
- Detalle filtrable por servicio, región y situación.
- Formulario de reporte por establecimiento.
- Exportación CSV e impresión.
- Modo local para pruebas.
- Backend opcional en Google Sheets para operación multiusuario.

## Estructura

- `index.html`: interfaz principal.
- `styles.css`: identidad visual propia, sin referencias a otros sistemas.
- `catalogos.js`: servicios, estados, situaciones, necesidades, regiones y 346 comunas.
- `config.js`: configuración del endpoint.
- `app.js`: carga, filtros, indicadores, formulario y exportación.
- `apps-script/Code.gs`: backend para Google Sheets.
- `ANALISIS_ARCHIVO.md`: revisión y uso del archivo de origen.

## Activación de la base compartida

1. Crear una Google Sheet privada.
2. Abrir `Extensiones > Apps Script`.
3. Reemplazar el contenido por `apps-script/Code.gs`.
4. En `Configuración del proyecto > Propiedades del script`, crear `ACCESS_KEYS_JSON`.
5. Usar un JSON con una clave por servicio. Ejemplo:

```json
{
  "Servicio Nacional del Adulto Mayor (SENAMA)": "clave-senama",
  "Servicio Nacional de Protección Especializada a la Niñez y Adolescencia": "clave-proteccion",
  "Servicio Nacional de la Discapacidad (SENADIS)": "clave-senadis",
  "*": "clave-otros"
}
```

6. Implementar como aplicación web:
   - Ejecutar como: la cuenta propietaria.
   - Acceso: cualquier persona.
7. Copiar la URL de la aplicación web.
8. Pegarla en `config.js`, en la propiedad `endpoint`.

El enlace público seguirá siendo visible para autoridades y consultas. La clave se solicita únicamente al guardar un reporte.

## Resguardo de información

No registrar nombres, RUN, diagnósticos ni antecedentes personales de residentes o personas atendidas. El campo responsable debe usarse para identificar a quien realiza el reporte institucional, no a las personas usuarias del establecimiento.
