@echo off
REM ============================================================
REM  Actualiza los precios de una zona desde la fuente oficial
REM  (SEPA / "Precios Claros" - Secretaria de Comercio).
REM
REM  Uso:
REM    scripts\refresh-prices.cmd
REM    scripts\refresh-prices.cmd -34.8207 -57.9675 10 8 600
REM        (latitud, longitud, radio km, max sucursales, max productos)
REM
REM  Los parametros por defecto se leen de backend\.env
REM  (SEPA_INGEST_LAT / SEPA_INGEST_LNG / SEPA_INGEST_RADIUS).
REM ============================================================
setlocal
set "ROOT=%~dp0.."

set "LAT=%~1"
set "LNG=%~2"
set "RADIUS=%~3"
set "MAXB=%~4"
set "MAXP=%~5"

REM Si no se pasaron argumentos, se leen del .env del backend.
if "%LAT%"=="" (
  for /f "tokens=1,* delims==" %%a in ('findstr /B "SEPA_INGEST_LAT=" "%ROOT%\backend\.env" 2^>nul') do set "LAT=%%b"
)
if "%LNG%"=="" (
  for /f "tokens=1,* delims==" %%a in ('findstr /B "SEPA_INGEST_LNG=" "%ROOT%\backend\.env" 2^>nul') do set "LNG=%%b"
)
if "%RADIUS%"=="" set "RADIUS=10"
if "%MAXB%"=="" set "MAXB=5"
if "%MAXP%"=="" set "MAXP=300"

if "%LAT%"=="" set "LAT=-34.8207"
if "%LNG%"=="" set "LNG=-57.9675"

echo ============================================================
echo   Actualizando precios oficiales desde SEPA
echo ============================================================
echo   Centro : %LAT%, %LNG%
echo   Radio  : %RADIUS% km
echo   Datos  : hasta %MAXB% sucursales, %MAXP% productos cada una
echo.

pushd "%ROOT%\backend"
call npm run ingest:prices -- --lat=%LAT% --lng=%LNG% --radius=%RADIUS% --max-branches=%MAXB% --max-products=%MAXP%
set "CODE=%errorlevel%"
popd

echo.
if %CODE% neq 0 (
  echo [ERROR] La ingesta fallo. Revisa la conexion a internet y que la API de SEPA responda.
  exit /b %CODE%
)

echo [OK] Precios actualizados.
endlocal
