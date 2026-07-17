# Análisis del archivo Seguimiento_Servicios.xlsm

## Contenido identificado

El archivo funciona como una plantilla de catastro y contiene cinco hojas:

- `Catálogo`: listas de servicios, estados operativos, regiones, niveles de daño, disponibilidad de servicios básicos y necesidades.
- `Comunas`: relación región–comuna y listas auxiliares para selección dependiente.
- `Programas`: hoja disponible para incorporar líneas o programas de cada servicio.
- `Introducción`: hoja sin contenido operativo.
- `Catastro`: estructura principal para registrar establecimientos.

El catastro considera 23 campos: identificación, fecha y hora, servicio, programa, ubicación, establecimiento, responsable, capacidad, personas atendidas, ocupación, estado operativo, daño o riesgo, interrupciones de agua, electricidad y gas, necesidades, medidas implementadas y observaciones.

## Elementos reutilizados en la plataforma

- Servicio y programa.
- Región y comuna.
- Nombre del establecimiento.
- Responsable del reporte.
- Capacidad y personas atendidas.
- Estado general y nivel de daño.
- Interrupción de electricidad, agua y gas.
- Necesidades prioritarias.
- Medidas implementadas y observaciones.

La lista de comunas del archivo cubría 11 regiones y 305 comunas. La plataforma la completó a las 16 regiones y 346 comunas del país.

## Ajustes realizados

1. El estado general se simplificó a:
   - Sin afectación.
   - Con afectación.
   - En evaluación.
   - Sin información.

2. Las situaciones se separaron como categorías combinables:
   - Sin electricidad.
   - Inundación.
   - Evacuación.
   - Sin agua.
   - Sin gas.
   - Otra situación.

3. El porcentaje de ocupación no se solicita directamente. Puede calcularse posteriormente con capacidad y personas atendidas, evitando inconsistencias y divisiones por cero.

4. Cada nuevo envío mantiene el historial, pero el tablero utiliza el reporte más reciente de cada establecimiento.

5. Se incorporó un control de acceso por servicio para la carga multiusuario. El tablero puede permanecer público, mientras los envíos requieren una clave configurada en el backend.

## Uso propuesto

La primera versión funciona como formulario y tablero en el mismo sitio. En modo piloto almacena datos en el navegador. Para la operación institucional, el backend incluido permite guardar los registros en una Google Sheet privada mediante Google Apps Script.

La estructura queda preparada para una evolución posterior con mapa geográfico, autenticación institucional, alertas, historial temporal y perfiles diferenciados.
