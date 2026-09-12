@echo off
title Fijar Panaderia Brito a la Barra de Tareas de Windows
chcp 65001 >nul
cd /d "%~dp0"

echo ======================================================================
echo           🥖 PANADERÍA BRITO - INSTALADOR DE ESCRITORIO
echo                  Don Antonio Brito ^& Hijos
echo ======================================================================
echo.
echo  [1/2] Generando acceso directo en el Escritorio de Windows...

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Panaderia Brito POS.lnk')); $s.TargetPath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'; if (-not (Test-Path $s.TargetPath)) { $s.TargetPath = 'C:\Program Files\Microsoft\Edge\Application\msedge.exe' }; $s.Arguments = '--app=https://panaderias-brito.vercel.app/pos --window-size=1400,900 --start-maximized'; if (Test-Path '%~dp0app.ico') { $s.IconLocation = '%~dp0app.ico' }; $s.Save();"

echo  [✓] ¡Acceso directo creado con éxito en tu Escritorio!
echo.
echo  [2/2] Abriendo Panadería Brito como programa de escritorio independiente...
start "" "https://panaderias-brito.vercel.app/pos"
timeout /t 2 /nobreak >nul

echo.
echo ======================================================================
echo     📌 ¿CÓMO ANCLARLO A LA BARRA DE TAREAS DE WINDOWS?
echo ======================================================================
echo   1. En la barra inferior de tu pantalla (Barra de Tareas de Windows),
echo      busca el icono de la Panadería Brito que se acaba de abrir.
echo   2. Haz CLIC DERECHO sobre el icono.
echo   3. Haz clic en la opción: "ANCLAR A LA BARRA DE TAREAS" 📌
echo.
echo   ¡Listo! Quedará fijado como cualquier programa (Word, Excel) y
echo   podrás abrir la caja de ventas con 1 solo clic todos los días.
echo ======================================================================
echo.
pause
exit
