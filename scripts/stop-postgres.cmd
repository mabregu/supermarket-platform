@echo off
REM ============================================================
REM  Detiene el PostgreSQL portatil.
REM ============================================================
setlocal
set "PGBIN=%LOCALAPPDATA%\Programs\PostgreSQL17\pgsql\bin"
set "PGDATA=%LOCALAPPDATA%\PostgreSQL17data"

"%PGBIN%\pg_isready.exe" -h localhost -p 5432 -q
if not %errorlevel%==0 (
  echo [OK] PostgreSQL no estaba corriendo.
  exit /b 0
)

echo Deteniendo PostgreSQL...
"%PGBIN%\pg_ctl.exe" -D "%PGDATA%" stop -m fast
echo [OK] PostgreSQL detenido.
endlocal
