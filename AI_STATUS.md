# 🤖 Estado del Proyecto / AI Status
*Última actualización:* 2026-11-09

## 🎯 Objetivo General del Proyecto
Desarrollo y gestión integral del sistema para Cáritas Parroquial (Nuestra Señora de la Medalla Milagrosa - El Limón), incluyendo atención de beneficiarios, entrega de ayudas y programa nutricional SAMÁN con exportación fidedigna a las plantillas diocesanas oficiales de Cáritas Maracay y sistema automatizado de notificaciones por Telegram.

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
  - **Bloque de Seguimiento y Vivero (Columnas AJ a AO):**
    - Interfaz condicional que se despliega exclusivamente al seleccionar *SALIDA DE VIVERO*.
    - Cálculo automático de semanas transcurridas en vivero, fecha de inicio (primera consulta), fecha de salida, Z-score de entrada y salida, y selector oficial de *Situación a la Salida* (`RECUPERADO`, `NO RECUPERADO`, `ABANDONO PROGRAMA`, `FALLECIDO`).
  - **Selector de Grupo Étnico Oficial:**
    - Incorporado en formularios de Niños y MEL con las opciones institucionales: `Mestizo`, `Indígena`, `Afrodescendiente`, `SD`.
- **Mejoras de UX en Campo, Edición y Protocolo SAMÁN (Noviembre 2026):**
  - **Edición completa de evaluaciones (`✏️`):** Botón de edición en tablas y tarjetas móviles de Niños y MEL (`actualizarSamanNino` y `actualizarSamanEmbarazada` en `app/actions/saman.ts`).
  - **Nuevo orden de Tamizaje Antropométrico (Bloque 2):** `1° C. Brazo / CBI (cm)` → `2° Talla (cm)` → `3° Peso (kg)`.
  - **Guía visual interactiva paso a paso:** Resaltado automático (`ring-4 animate-pulse`) en Cédula del representante, botón de autocompletar datos (cuando hay 1 niño en el historial) o selector desplegable (cuando el representante tiene varios niños registrados).
  - **Corrección de nomenclatura MEL:** Actualizado `"Plumpy Mom"` a `"Plumpy Mum"`.
  - **Selector Oficial de "Otros Complementos" (Columna AI del Excel):** Integrado en Bloque 3 con las 6 opciones oficiales (`Ninguno`, `Sales de rehidratación oral`, `Amoxicilina`, `Ambos insumos`, `Lactovisoy`, `Otro...incluir en las observaciones.`).
  - **Exportación de Edad y Rango de Edad:** Inyección garantizada de valores precalculados junto con las fórmulas dinámicas en las columnas `U`, `V` (Niños) y `G` (MEL) de `app/lib/saman-excel-preserver.ts`.
- **Sistema de Notificaciones por Telegram y Directorio Telefónico SAMÁN (Noviembre 2026):**
  - **Bot Oficial Conectado:** `@caritasPQLamilagrosa_bot` integrado mediante `app/actions/telegram-saman.ts` y `app/dashboard/saman/components/SamanTelegramModal.tsx`.
  - **Persistencia Protegida en Base de Datos (`prisma/schema.prisma`):** Declarados los modelos `TelefonoPacienteSaman` y `TelegramContactoSaman` en Prisma y eliminado el flag `--accept-data-loss` del `Dockerfile` para garantizar persistencia permanente en despliegues de Easypanel.
  - **Campo de Teléfono con Autocompletado por Cédula:** Agregado `Teléfono Representante` en SAMÁN Niños y `Teléfono de Contacto` en SAMÁN MEL, visible en tablas/tarjetas y autocompletado al ingresar la cédula.
  - **3 Modalidades de Envío en `SamanTelegramModal.tsx`:**
    1. **Por Grupos / Cohortes Activas (`1. Por Grupos`):** Detecta grupos donde está el bot (`SAMAN grupo Cristo Rey - Tejerías`, `SAMAN Grupo Niño Jesús`, `Grupo de Voluntarios Cáritas PQ La milagrosa`), muestra el conteo de miembros en vivo (`👥 X miembros`), permite copiar el link de invitación del grupo, proyectar un **Código QR de ingreso en pantalla (`📱 QR Jornada`)** para escanear en las jornadas sin agendar contactos, y marcar cohortes anteriores como `DADO_DE_ALTA` para bloquear envíos futuros.
    2. **Pacientes Activos en Monitoreo (`2. Activos Monitoreo`):** Filtra automáticamente a los representantes activos y excluye a quienes ya tienen `SALIDA DE VIVERO`.
    3. **Personal / Individual (`3. Personal / Individual`):** Filtra por sector/grupo real del paciente, ordena de primeros a quienes tienen teléfono registrado y ofrece botones directos (`✈️ Abrir su Telegram`, `📲 WhatsApp` y `📋 Copiar Link Bot`) que incluyen el recordatorio completo de la jornada + el link del grupo correspondiente + el link del bot.
  - **Plantillas de Recordatorio (1 Día Antes):** Plantillas preconfiguradas y editables para **Representantes y MEL** (de 6 meses a 4 años y 11 meses, sin línea de sobres vacíos) y para el **Equipo de Voluntarios**.

## 🚧 Estado Actual (¿Dónde nos quedamos?)
- Todo el módulo SAMÁN, el directorio telefónico por cédula y el centro de notificaciones de Telegram (`@caritasPQLamilagrosa_bot`) están **100% operativos y desplegados en producción (`origin main` — commit `6eefd3a`)**.
- Grupos de Telegram configurados:
  - `SAMAN grupo Cristo Rey - Tejerías` (`-1004451440606`) — 19 pacientes actuales asociados.
  - `SAMAN Grupo Niño Jesús` (`-1003500516882`) — Listo para recibir los nuevos ingresos en la jornada del sábado.
  - `Grupo de Voluntarios Cáritas PQ La milagrosa` (`-1003947280462`).

## 📝 Próximos Pasos / Tareas Pendientes
- [ ] En la jornada del sábado (Sector Niño Jesús), crear la nueva jornada en el sistema, registrar a los niños con sus números de teléfono y usar el QR o link directo para sumarlos a `SAMAN Grupo Niño Jesús`.
- [ ] Continuar con mejoras en los módulos de Reportes Diocesanos y Atención Parroquial según nuevas indicaciones.

## 🔧 Rutas y Comandos Clave
- Servidor de desarrollo local: `npm run dev`
- Verificación de tipos y build: `npm run build`
- Endpoint de exportación SAMÁN: `/api/saman/export?jornadaId=[ID]`
- Inyector binario de plantilla Excel: `app/lib/saman-excel-preserver.ts`
- Acciones de Telegram SAMÁN: `app/actions/telegram-saman.ts`
- Modal de Telegram SAMÁN: `app/dashboard/saman/components/SamanTelegramModal.tsx`
