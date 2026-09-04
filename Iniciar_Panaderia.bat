@echo off
title Panaderia Brito - Sistema POS
chcp 65001 >nul
cd /d "%~dp0"

echo ===================================================
echo        🥖 PANADERÍA BRITO - SISTEMA POS
echo ===================================================
echo Iniciando servidor...
echo.

:: Asegurar variables de entorno PATH actualizadas
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages;%LOCALAPPDATA%\Programs\nodejs;%ProgramFiles%\nodejs;%PATH%"

:: Verificar .env.local
if not exist ".env.local" (
    if exist ".env.example" (
        copy ".env.example" ".env.local" >nul
        echo Configuración .env.local generada.
    )
)

:: Abrir navegador automáticamente tras 2 segundos
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

:: Iniciar servidor Next.js
if exist ".next" (
    npm start
) else (
    npm run dev
)

pause
