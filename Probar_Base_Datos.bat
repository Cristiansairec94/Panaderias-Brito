@echo off
title Diagnóstico de Base de Datos - Panaderias Brito
chcp 65001 > nul
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo ==============================================================
echo   Iniciando prueba de conexión con Supabase...
echo ==============================================================
echo.

node scripts/test-db.js

echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause > nul
