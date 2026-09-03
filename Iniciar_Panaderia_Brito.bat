@echo off
title Panaderias Brito - Sistema ERP ^& POS
color 06

:: Configurar rutas de Node.js y MinGit
set "PATH=%LOCALAPPDATA%\Programs\NodeJS;%LOCALAPPDATA%\Programs\MinGit\cmd;C:\Program Files\nodejs;%PATH%"

:: Cambiar al directorio del script
cd /d "%~dp0"

cls
echo ======================================================================
echo           PANADERIAS BRITO - SISTEMA ERP ^& PUNTO DE VENTA
echo                    Don Antonio Brito ^& Hijos
echo ======================================================================
echo.
echo  [1/3] Verificando entorno de ejecucion...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo  [!] Instalando dependencias necesarias (solo primera vez)...
    call npm install
)

if not exist ".env.local" (
    if exist ".env.example" (
        copy /y ".env.example" ".env.local" >nul
    )
)

echo  [2/3] Iniciando servidor local en http://localhost:3000...
echo  [3/3] Abriendo el Punto de Venta en tu navegador...
echo.
echo ======================================================================
echo   ESTADO: Sistema Activo y Listo para cobrar.
echo   NOTA: Mantener esta ventana abierta mientras se use el sistema.
echo ======================================================================
echo.

:: Abrir navegador automaticamente tras 3 segundos
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:3000/pos'"

:: Ejecutar Next.js
call npm run dev

pause
