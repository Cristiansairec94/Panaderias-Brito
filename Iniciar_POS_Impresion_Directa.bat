@echo off
title Panaderias Brito - Punto de Venta POS (Impresion Directa)
chcp 65001 >nul
cd /d "%~dp0"

echo ======================================================================
echo           PANADERIAS BRITO - SISTEMA DE PUNTO DE VENTA POS
echo                 Modo de Impresion Directa a POS-58
echo                    Don Antonio Brito & Hijos
echo ======================================================================
echo.
echo  [+] Configurando perfil dedicado de impresion termica...
echo  [+] Impresora de tickets configurada: POS-58 (USB002)
echo  [+] Modo: Kiosk Printing (Bypass de ventana de previsualizacion)
echo.

:: Detectar ruta de Google Chrome o Microsoft Edge
set "CHROME_BIN="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_BIN=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_BIN=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "CHROME_BIN=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)

if "%CHROME_BIN%"=="" (
    echo [!] No se encontro Google Chrome ni Edge. Abriendo en navegador predeterminado...
    start https://panaderias-brito.vercel.app/pos
    exit /b
)

:: Perfil aislado para garantizar que las banderas de impresion directa apliquen
set "USER_DATA=%LOCALAPPDATA%\PanaderiaBrito\ChromeProfilePOS"

:: URL objetivo: Sistema Web de Produccion en la nube
set "TARGET_URL=https://panaderias-brito.vercel.app/pos"

echo  [+] Abriendo Punto de Venta con Impresion Silenciosa Directa...
start "" "%CHROME_BIN%" --user-data-dir="%USER_DATA%" --kiosk-printing --app="%TARGET_URL%" --disable-features=Translate --no-first-run --no-default-browser-check

exit
