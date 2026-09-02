@echo off
title Servidor Local - Panaderia Brito
cd /d "c:\Users\HP\Desktop\ANTIGRAVITI"
set "PATH=C:\Program Files\nodejs;%PATH%"
echo =======================================================
echo   Iniciando Servidor Local - Panaderias Brito
echo   URL Local: http://localhost:3000
echo =======================================================
npm.cmd run dev
