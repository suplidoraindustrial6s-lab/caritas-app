---
name: iniciar-caritas-localhost
description: >-
  Inicia y verifica el servidor de desarrollo local (localhost) del sistema Cáritas Parroquial.
  Úsese cuando el usuario pida iniciar el localhost de Cáritas, levantar el servidor local de caritaspq,
  o abrir el sistema de Cáritas en modo desarrollo.
---

# Iniciar Servidor Local de Cáritas Parroquial

Sigue estos pasos para iniciar de forma limpia y segura el entorno local de **Cáritas Parroquial** (`c:\Users\alben\OneDrive\Documentos\caritaspq`):

## 1. Verificar Base de Datos Local (SQLite)
1. Revisa `c:\Users\alben\OneDrive\Documentos\caritaspq\prisma\schema.prisma`.
2. En el bloque `datasource db`, asegúrate de que el `provider` sea `"sqlite"` (ya que en despliegues a producción suele cambiarse a `"postgresql"`).
3. Si estaba en `"postgresql"`, cámbialo a `"sqlite"` y regenera el cliente de Prisma ejecutando:
   ```powershell
   cmd /c "cd /d c:\Users\alben\OneDrive\Documentos\caritaspq && npx prisma generate"
   ```

## 2. Liberar Bloqueos Previos (si aplica)
1. Si existe un bloqueo de compilación previo o procesos `node` colgados que impidan levantar el puerto `3000`, limpia el archivo `.next/dev/lock`:
   ```powershell
   Remove-Item "c:\Users\alben\OneDrive\Documentos\caritaspq\.next\dev\lock" -Force -ErrorAction SilentlyContinue
   ```

## 3. Levantar el Servidor de Desarrollo con Webpack
1. Inicia el servidor en segundo plano (`IsDaemon: true`) ubicándote explícitamente en la carpeta del proyecto y usando `--webpack` para evitar errores de resolución de `tailwindcss` fuera del directorio raíz:
   ```powershell
   Set-Location "c:\Users\alben\OneDrive\Documentos\caritaspq"; .\node_modules\.bin\next.cmd dev --webpack
   ```

## 4. Verificación Obligatoria
1. Verifica en el log de la tarea que Next.js indique `✓ Ready`.
2. Realiza una petición de prueba a `http://localhost:3000/login` para precompilar la ruta y confirmar que devuelve código `200`:
   ```powershell
   (Invoke-WebRequest -Uri "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 30).StatusCode
   ```
3. Confirma al usuario en español la URL activa (`http://localhost:3000`) y las credenciales de acceso (`admin@caritaspq.com` / `admin123`).
