@echo off
title Panaderias Brito - Punto de Venta Web
echo ======================================================================
echo           PANADERIAS BRITO - SISTEMA DE PUNTO DE VENTA WEB
echo                    Don Antonio Brito ^& Hijos
echo ======================================================================
echo.
echo  [+] Abriendo Punto de Venta con Impresion Directa en tu navegador...
echo.

set "CHROME_BIN="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "CHROME_BIN=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)

if not "%CHROME_BIN%"=="" (
    start "" "%CHROME_BIN%" --user-data-dir="%LOCALAPPDATA%\PanaderiaBrito\ChromeProfilePOS" --kiosk-printing --app="https://panaderias-brito.vercel.app/pos" --disable-features=Translate
) else (
    start https://panaderias-brito.vercel.app/pos
)
exit
