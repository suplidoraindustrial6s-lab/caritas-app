# 🤖 Estado del Proyecto / AI Status
*Última actualización:* 2026-10-23

## 🎯 Objetivo General del Proyecto
Desarrollo y gestión integral del sistema para Cáritas Parroquial (Nuestra Señora de la Medalla Milagrosa - El Limón), incluyendo atención de beneficiarios, entrega de ayudas y programa nutricional SAMÁN con exportación fidedigna a las plantillas diocesanas oficiales de Cáritas Maracay.

## ✅ Hitos Logrados
- **Programa Nutricional SAMÁN:**
  - Registro de evaluaciones antropométricas en campo para Niños (0 a 59 meses) y Mujeres Embarazadas/Lactantes (MEL).
  - Cálculo automático de indicadores OMS (Z-Score P/T, IMC, Perímetro Braquial / CBI) y sugerencia de suplementos (Micronutrientes, Plumpy'Doz amarillo, Plumpy'Nut rojo, Plumpy'Mum).
  - Gestión de jornadas (apertura, cierre, eliminación de jornadas vacías y sincronización histórica oficial).
- **Lógica Evolutiva y de Seguimiento SAMÁN (Octubre 2026):**
  - Autocompletado inteligente de **Tipo de Ingreso** y **N° Control / Semana**:
    - Diagnóstico Inicial fijado en `0`.
    - Monitoreos correlativos sucesivos (`1`, `2`, ... hasta 12).
    - Salida de Vivero fijada en `0`.
    - Reingresos automáticos (`0` o contador previo de reingresos).
  - **Bloque 3 de Seguimiento y Vivero (Columnas AJ a AO):**
    - Interfaz condicional que se despliega exclusivamente al seleccionar *SALIDA DE VIVERO*.
    - Cálculo automático de semanas transcurridas en vivero, fecha de inicio (primera consulta), fecha de salida, Z-score de entrada y salida, y selector oficial de *Situación a la Salida* (`RECUPERADO`, `NO RECUPERADO`, `ABANDONO PROGRAMA`, `FALLECIDO`).
    - En diagnósticos y monitoreos, estas columnas se exportan completamente en blanco según las normas de Cáritas.
  - **Selector de Grupo Étnico Oficial:**
    - Incorporado en formularios de Niños y MEL con las opciones institucionales: `Mestizo`, `Indígena`, `Afrodescendiente`, `SD`.
- **Exportación Excel Oficial (`plantilla_saman_oficial.xlsx`):**
  - Implementación de motor de inyección binaria con `JSZip` en memoria (`app/lib/saman-excel-preserver.ts`).
  - Preservación íntegra de estilos: anchos de columnas, colores institucionales de encabezados y bandas celestes, tipos de letra, validaciones de datos (listas desplegables nativas de Excel) y fórmulas vivas (`AU&R&A`, cálculo de edad, clasificaciones PB, IMC, estado nutricional, `VLOOKUP` diocesano).
  - Conversión estandarizada de todo texto exportado a **MAYÚSCULAS**.
  - Descarga instantánea en streaming seguro sin bloqueos ni retrasos.

## 🚧 Estado Actual (¿Dónde nos quedamos?)
- Módulo SAMÁN completado y desplegado con éxito en el repositorio (`main`) y listo para producción en Easypanel.
- Exportación oficial validada preservando estructura binaria, fórmulas y desplegables.

## 📝 Próximos Pasos / Tareas Pendientes
- [ ] Incorporar el resto de columnas de la plantilla oficial a medida que se requieran (ej. complementos secundarios, referido médico / Proyecto TENGO si aplica).
- [ ] Revisión y mejoras en los módulos de Reportes Diocesanos y Atención Parroquial según nuevas indicaciones.

## 🔧 Rutas y Comandos Clave
- Servidor de desarrollo local: `npm run dev`
- Verificación de tipos y build: `npm run build`
- Endpoint de exportación SAMÁN: `/api/saman/export?jornadaId=[ID]`
- Inyector binario de plantilla: `app/lib/saman-excel-preserver.ts`
