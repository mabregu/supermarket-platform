@echo off
REM ============================================================
REM  Levanta TODO el entorno de desarrollo (PostgreSQL + backend + frontend).
REM
REM    scripts\dev.cmd            -> modo desarrollo con hot reload
REM    scripts\stop-dev.cmd       -> detiene backend, frontend y PostgreSQL
REM
REM  Abre dos ventanas nuevas: una para el backend (puerto 3000)
REM  y otra para el frontend (puerto 3001).
REM ============================================================
setlocal
REM  ROOT = carpeta del proyecto (supermarket-platform). El script vive en <ROOT>\scripts\,
REM  por lo que %~dp0.. ya resuelve a la raiz del proyecto.
set "ROOT=%~dp0.."
pushd "%ROOT%"

echo ============================================================
echo   PreciosSmart - Entorno de desarrollo
echo ============================================================
echo.

REM 1) Base de datos (idempotente)
call "scripts\start-postgres.cmd"
if %errorlevel% neq 0 (
  echo [ERROR] No se pudo iniciar PostgreSQL. Abortando.
  popd
  exit /b 1
)

REM 2) Dependencias (solo si falta node_modules)
if not exist "backend\node_modules" (
  echo Instalando dependencias del backend...
  pushd backend && call npm install && popd
)
if not exist "frontend\node_modules" (
  echo Instalando dependencias del frontend...
  pushd frontend && call npm install && popd
)

REM 3) Esquema + datos de prueba (idempotente)
echo Sembrando base de datos...
pushd backend && call npm run seed && popd

REM 3b) Precios oficiales de tu zona (idempotente, no bloqueante).
REM     Si falla (sin internet o API de SEPA caida) se sigue igual.
echo Actualizando precios oficiales (SEPA)...
call "scripts\refresh-prices.cmd"
if %errorlevel% neq 0 (
  echo [AVISO] No se pudieron actualizar los precios. Se sigue con el snapshot del seed.
  echo.
)

REM 4) Backend y frontend en ventanas separadas
echo Abriendo backend en otra ventana...
start "supermarket-backend" cmd /k "cd /d %ROOT%\backend && npm run start:dev"

echo Abriendo frontend en otra ventana...
start "supermarket-frontend" cmd /k "cd /d %ROOT%\frontend && npm run dev"

echo.
echo ============================================================
echo   Listo.
echo     Backend:  http://localhost:3000/api/v1
echo     Swagger:  http://localhost:3000/docs
echo     Frontend: http://localhost:3001
echo.
echo   Para detener todo:  scripts\stop-dev.cmd
echo ============================================================
popd
endlocal
