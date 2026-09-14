@echo off
title Panaderias Brito - Punto de Venta POS (Impresion Directa)
chcp 65001 >nul
cd /d "%~dp0"

echo ======================================================================
echo           PANADERIAS BRITO - SISTEMA DE PUNTO DE VENTA POS
echo                 Modo de Impresion Directa a Impresora
echo                    Don Antonio Brito & Hijos
echo ======================================================================
echo.

if exist "%~dp0PanaderiaBrito.exe" (
    echo  [+] Abriendo Panaderia Brito con Impresion Directa...
    start "" "%~dp0PanaderiaBrito.exe" https://panaderias-brito.vercel.app/pos
    exit
)

set "BROWSER_BIN="
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_BIN=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_BIN=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_BIN=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

set "USER_DATA=%LOCALAPPDATA%\PanaderiaBrito\POSProfile"
set "TARGET_URL=https://panaderias-brito.vercel.app/pos"

if not "%BROWSER_BIN%"=="" (
    echo  [+] Abriendo Punto de Venta con Impresion Silenciosa Directa...
    start "" "%BROWSER_BIN%" --user-data-dir="%USER_DATA%" --kiosk-printing --app="%TARGET_URL%" --disable-features=Translate --no-first-run --no-default-browser-check
) else (
    echo [!] Abriendo en navegador predeterminado...
    start %TARGET_URL%
)
exit
