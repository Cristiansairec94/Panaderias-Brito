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

:: Abrir navegador automáticamente tras 3 segundos con impresión directa
start "" /b cmd /c "timeout /t 3 /nobreak >nul & if exist PanaderiaBrito.exe (start PanaderiaBrito.exe http://localhost:3000/pos) else (start http://localhost:3000/pos)"

:: Iniciar servidor Next.js
if exist ".next" (
    npm start
) else (
    npm run dev
)

pause
