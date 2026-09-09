@echo off
title Panaderias Brito - Selector de Impresora Predeterminada de Windows
chcp 65001 >nul
cd /d "%~dp0"

echo ======================================================================
echo           PANADERIAS BRITO - SELECTOR DE IMPRESORA DE TICKETS
echo                       Don Antonio Brito & Hijos
echo ======================================================================
echo.
echo  Detectando impresoras instaladas en este equipo...
echo.

powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_Printer | Select-Object Name, Default, PortName | Format-Table -AutoSize"

echo.
echo  ======================================================================
echo   Opciones disponibles para configurar como Impresora Predeterminada:
echo  ======================================================================
echo   [1] Seleccionar "POS-58" (Impresora Termica Principal USB002)
echo   [2] Seleccionar "POS-58(copy of 1)" (Copia Secundaria USB002)
echo   [3] Seleccionar "Microsoft Print to PDF" (Modo Digital de Prueba)
echo   [4] Escribir el nombre exacto de otra impresora
echo   [5] Salir sin cambios
echo  ======================================================================
echo.

set /p opcion="Elige una opcion [1-5]: "

if "%opcion%"=="1" (
    powershell -NoProfile -Command "(Get-CimInstance -ClassName Win32_Printer -Filter \"Name = 'POS-58'\").SetDefaultPrinter()"
    echo.
    echo  [OK] Impresora "POS-58" establecida como PREDETERMINADA en Windows.
    pause
    exit /b
)

if "%opcion%"=="2" (
    powershell -NoProfile -Command "(Get-CimInstance -ClassName Win32_Printer -Filter \"Name = 'POS-58(copy of 1)'\").SetDefaultPrinter()"
    echo.
    echo  [OK] Impresora "POS-58(copy of 1)" establecida como PREDETERMINADA en Windows.
    pause
    exit /b
)

if "%opcion%"=="3" (
    powershell -NoProfile -Command "(Get-CimInstance -ClassName Win32_Printer -Filter \"Name = 'Microsoft Print to PDF'\").SetDefaultPrinter()"
    echo.
    echo  [OK] Impresora "Microsoft Print to PDF" establecida como PREDETERMINADA.
    pause
    exit /b
)

if "%opcion%"=="4" (
    set /p customName="Escribe el nombre exacto de la impresora: "
    powershell -NoProfile -Command "(Get-CimInstance -ClassName Win32_Printer -Filter \"Name = '%customName%'\").SetDefaultPrinter()"
    echo.
    echo  [OK] Impresora "%customName%" establecida como PREDETERMINADA en Windows.
    pause
    exit /b
)

echo Saliendo...
exit /b
