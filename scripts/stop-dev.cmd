@echo off
REM ============================================================
REM  Detiene TODO el entorno de desarrollo.
REM  Cierra las ventanas de backend/frontend y apaga PostgreSQL.
REM
REM  Mata por PUERTO (3000 backend / 3001 frontend) y no solo por
REM  titulo de ventana: el filtro WINDOWTITLE falla si las ventanas
REM  se lanzo desde un shell no interactivo, dejando node.exe huerfano.
REM ============================================================
setlocal EnableDelayedExpansion
set "ROOT=%~dp0.."

echo Deteniendo backend y frontend...
REM Cierra las consolas abiertas por scripts\dev.cmd (y sus hijos node).
taskkill /FI "WINDOWTITLE eq supermarket-backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq supermarket-frontend*" /T /F >nul 2>&1

REM Cierre determinista por puerto: cubre los casos donde el titulo no coincide.
REM netstat lista IPv4 e IPv6, por eso se deduplican los PID ya cerrados.
set "CLOSED="
for %%P in (3000 3001) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:"LISTENING" ^| findstr ":%%P "') do (
    echo !CLOSED! | findstr /C:"%%a" >nul || (
      echo   Cerrando PID %%a en puerto %%P...
      taskkill /PID %%a /T /F >nul 2>&1
      set "CLOSED=!CLOSED! %%a;"
    )
  )
)

REM Cierre de los procesos node del proyecto que no escuchan en ningun puerto
REM (en especial el supervisor "nest start --watch", que puede resucitar el
REM  servidor si queda vivo). Se localiza por linea de comandos.
echo   Cerrando procesos node del proyecto...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*supermarket-platform*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

call "%ROOT%\scripts\stop-postgres.cmd"

echo [OK] Entorno de desarrollo detenido.
endlocal
