@echo off
REM ============================================================
REM  Inicia PostgreSQL 17 + PostGIS 3.6 portatil (sin admin).
REM  Es idempotente: si ya esta corriendo, no hace nada.
REM ============================================================
setlocal
set "PGBIN=%LOCALAPPDATA%\Programs\PostgreSQL17\pgsql\bin"
set "PGDATA=%LOCALAPPDATA%\PostgreSQL17data"
set "PGLOG=%PGDATA%\server.log"

if not exist "%PGBIN%\pg_ctl.exe" (
  echo [ERROR] No se encontro PostgreSQL portatil en:
  echo         %PGBIN%
  echo         Ver README.md seccion "Opcion A - Script local todo-en-uno".
  exit /b 1
)

REM 1) Hay algo escuchando en el puerto 5432?
netstat -ano | findstr /R /C:"LISTENING" | findstr ":5432 " >nul 2>&1
set "PORT_BUSY=%errorlevel%"

REM 2) Y ademas acepta conexiones de verdad?
"%PGBIN%\pg_isready.exe" -h localhost -p 5432 -q -t 3 >nul 2>&1
if %errorlevel%==0 (
  echo [OK] PostgreSQL ya esta corriendo en localhost:5432.
  exit /b 0
)

REM 3) Puerto ocupado pero sin conexiones: es el fallo clasico de Windows
REM    0xC0000142 (STATUS_DLL_INIT_FAILED) al crear el proceso hijo.
if %PORT_BUSY%==0 (
  echo [ERROR] PostgreSQL esta escuchando en el puerto 5432 pero NO acepta conexiones.
  echo.
  echo         Causa habitual: Windows 0xC0000142 al crear el proceso hijo del
  echo         servidor. Suele deberse al antivirus ESET o a recursos del sistema.
  echo.
  echo         Para resolverlo:
  echo           1. Agregar una excepcion en ESET para:
  echo                - %PGDATA%
  echo                - %PGBIN%
  echo           2. O reiniciar la maquina.
  echo.
  echo         Log del servidor: %PGLOG%
  exit /b 1
)

REM 4) No hay nada escuchando: arrancar.
echo Iniciando PostgreSQL...
"%PGBIN%\pg_ctl.exe" -D "%PGDATA%" -l "%PGLOG%" -o "-p 5432" -w -t 60 start
if %errorlevel% neq 0 (
  echo [ERROR] No se pudo iniciar PostgreSQL. Ver: %PGLOG%
  exit /b 1
)

REM 5) Verificar que de verdad acepta conexiones (no solo que el puerto este abierto).
"%PGBIN%\pg_isready.exe" -h localhost -p 5432 -q -t 3 >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] PostgreSQL arranco pero NO acepta conexiones. Ver: %PGLOG%
  exit /b 1
)

echo [OK] PostgreSQL listo en localhost:5432 ^(usuario: postgres^).
endlocal
